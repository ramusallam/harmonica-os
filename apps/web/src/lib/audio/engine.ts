import type {
  AudioEngineState,
  AudioEngineStatus,
  MicrophoneStatus,
  AudioLevels,
  AudioDeviceInfo,
  WorkletMessage,
  AudioBufferMessage,
} from "@/types/audio";
import {
  requestMicrophoneStream,
  enumerateAudioInputs,
  classifyMicError,
  getErrorMessage,
  rmsToDbFS,
} from "./microphone";
import { AUDIO_CONFIG } from "@harmonica-os/core";

const SILENCE_THRESHOLD = AUDIO_CONFIG.minAmplitude;

type AudioEngineCallbacks = {
  onStateChange: (state: AudioEngineState) => void;
  onAudioBuffer?: (msg: AudioBufferMessage) => void;
};

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private callbacks: AudioEngineCallbacks;

  private engineStatus: AudioEngineStatus = "idle";
  private micStatus: MicrophoneStatus = "idle";
  private levels: AudioLevels = { rms: 0, peak: 0, dbFS: -Infinity, isSilent: true };
  private sampleRate = 0;
  private selectedDeviceId: string | null = null;
  private availableDevices: AudioDeviceInfo[] = [];
  private errorMessage: string | null = null;
  private buffersReceived = 0;
  private lastBufferTimestamp = 0;

  // Track ended handler ref for cleanup
  private trackEndedHandler: (() => void) | null = null;

  constructor(callbacks: AudioEngineCallbacks) {
    this.callbacks = callbacks;
  }

  getState(): AudioEngineState {
    return {
      engineStatus: this.engineStatus,
      micStatus: this.micStatus,
      levels: { ...this.levels },
      sampleRate: this.sampleRate,
      bufferSize: AUDIO_CONFIG.bufferSize,
      selectedDeviceId: this.selectedDeviceId,
      availableDevices: this.availableDevices,
      errorMessage: this.errorMessage,
      buffersReceived: this.buffersReceived,
      lastBufferTimestamp: this.lastBufferTimestamp,
    };
  }

  async refreshDevices(): Promise<AudioDeviceInfo[]> {
    this.availableDevices = await enumerateAudioInputs();
    this.emit();
    return this.availableDevices;
  }

  async start(deviceId?: string): Promise<boolean> {
    if (this.engineStatus === "running") return true;
    if (this.engineStatus === "starting") return false;

    this.engineStatus = "starting";
    this.micStatus = "requesting";
    this.errorMessage = null;
    this.buffersReceived = 0;
    this.emit();

    try {
      // 1. Get microphone stream
      this.selectedDeviceId = deviceId ?? null;
      this.stream = await requestMicrophoneStream(deviceId);
      this.micStatus = "active";
      this.emit();

      // Watch for track ending (user revokes permission, device disconnects)
      const track = this.stream.getAudioTracks()[0];
      if (track) {
        this.trackEndedHandler = () => this.handleTrackEnded();
        track.addEventListener("ended", this.trackEndedHandler);
      }

      // 2. Create AudioContext
      this.audioContext = new AudioContext();
      this.sampleRate = this.audioContext.sampleRate;

      // Handle suspended context (Chrome autoplay policy)
      if (this.audioContext.state === "suspended") {
        this.engineStatus = "suspended";
        this.emit();
        await this.audioContext.resume();
      }

      // Watch for context state changes
      this.audioContext.onstatechange = () => this.handleContextStateChange();

      // 3. Load AudioWorklet
      await this.audioContext.audioWorklet.addModule("/worklets/pitch-processor.js");

      // 4. Build audio graph: source → worklet
      this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);
      this.workletNode = new AudioWorkletNode(this.audioContext, "pitch-processor");

      this.workletNode.port.onmessage = (event: MessageEvent<WorkletMessage>) => {
        this.handleWorkletMessage(event.data);
      };

      this.sourceNode.connect(this.workletNode);
      // Don't connect worklet to destination — we don't want to play back the mic

      // 5. Refresh device list (labels are only available after permission grant)
      await this.refreshDevices();

      this.engineStatus = "running";
      this.emit();
      return true;
    } catch (err) {
      this.micStatus = classifyMicError(err);
      this.errorMessage = getErrorMessage(err);
      this.engineStatus = "error";
      this.emit();
      this.cleanup();
      return false;
    }
  }

  async stop(): Promise<void> {
    if (this.engineStatus === "idle") return;

    this.engineStatus = "stopping";
    this.emit();

    // Tell the worklet to stop processing
    this.workletNode?.port.postMessage({ type: "stop" });

    this.cleanup();

    this.engineStatus = "idle";
    this.micStatus = "idle";
    this.levels = { rms: 0, peak: 0, dbFS: -Infinity, isSilent: true };
    this.sampleRate = 0;
    this.errorMessage = null;
    this.emit();
  }

  async switchDevice(deviceId: string): Promise<boolean> {
    await this.stop();
    return this.start(deviceId);
  }

  async resumeContext(): Promise<void> {
    if (this.audioContext?.state === "suspended") {
      await this.audioContext.resume();
    }
  }

  private handleWorkletMessage(msg: WorkletMessage): void {
    switch (msg.type) {
      case "audio-buffer": {
        this.buffersReceived++;
        this.lastBufferTimestamp = msg.timestamp;
        this.updateLevels(msg.rms, msg.peak);
        this.callbacks.onAudioBuffer?.(msg);
        break;
      }
      case "level": {
        this.updateLevels(msg.rms, msg.peak);
        break;
      }
      case "silence": {
        this.levels = { rms: 0, peak: 0, dbFS: -Infinity, isSilent: true };
        this.emit();
        break;
      }
    }
  }

  private updateLevels(rms: number, peak: number): void {
    const dbFS = rmsToDbFS(rms);
    this.levels = {
      rms,
      peak,
      dbFS,
      isSilent: rms < SILENCE_THRESHOLD,
    };
    this.emit();
  }

  private handleTrackEnded(): void {
    this.micStatus = "ended";
    this.engineStatus = "error";
    this.errorMessage = "Microphone disconnected or permission revoked.";
    this.emit();
    this.cleanup();
  }

  private handleContextStateChange(): void {
    if (!this.audioContext) return;

    switch (this.audioContext.state) {
      case "suspended":
        this.engineStatus = "suspended";
        this.emit();
        break;
      case "running":
        if (this.engineStatus === "suspended") {
          this.engineStatus = "running";
          this.emit();
        }
        break;
      case "closed":
        this.engineStatus = "idle";
        this.emit();
        break;
    }
  }

  private cleanup(): void {
    // Remove track ended listener
    if (this.stream && this.trackEndedHandler) {
      const track = this.stream.getAudioTracks()[0];
      track?.removeEventListener("ended", this.trackEndedHandler);
      this.trackEndedHandler = null;
    }

    // Disconnect audio nodes
    try {
      this.sourceNode?.disconnect();
    } catch { /* already disconnected */ }

    try {
      this.workletNode?.disconnect();
    } catch { /* already disconnected */ }

    // Stop all tracks
    this.stream?.getTracks().forEach((track) => track.stop());

    // Close audio context
    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close().catch(() => {});
    }

    this.audioContext = null;
    this.stream = null;
    this.sourceNode = null;
    this.workletNode = null;
  }

  private emit(): void {
    this.callbacks.onStateChange(this.getState());
  }

  destroy(): void {
    this.stop();
  }
}
