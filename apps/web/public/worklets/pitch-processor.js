// AudioWorklet processor — runs on the audio rendering thread.
// Loaded via: audioContext.audioWorklet.addModule('/worklets/pitch-processor.js')
//
// Responsibilities:
// 1. Collect incoming samples into a fixed-size ring buffer
// 2. Compute RMS level per-frame for the UI level meter
// 3. Post completed buffers + levels to the main thread

const BUFFER_SIZE = 2048;
const LEVEL_SMOOTHING = 0.8; // Exponential smoothing factor for RMS

class PitchProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Float32Array(BUFFER_SIZE);
    this.writeIndex = 0;
    this.smoothedRMS = 0;
    this.peakLevel = 0;
    this.frameCount = 0;
    this.isActive = true;

    this.port.onmessage = (event) => {
      if (event.data.type === "stop") {
        this.isActive = false;
      }
    };
  }

  process(inputs) {
    if (!this.isActive) return false; // Returning false stops the processor

    const input = inputs[0]?.[0];
    if (!input || input.length === 0) {
      // No input — mic might have disconnected
      this.frameCount++;
      if (this.frameCount % 50 === 0) {
        this.port.postMessage({ type: "silence", timestamp: currentTime });
      }
      return true;
    }

    // Compute per-quantum RMS (128 samples at a time from Web Audio spec)
    let sum = 0;
    let peak = 0;
    for (let i = 0; i < input.length; i++) {
      const s = input[i];
      sum += s * s;
      const abs = Math.abs(s);
      if (abs > peak) peak = abs;
    }
    const rms = Math.sqrt(sum / input.length);
    this.smoothedRMS = LEVEL_SMOOTHING * this.smoothedRMS + (1 - LEVEL_SMOOTHING) * rms;
    if (peak > this.peakLevel) this.peakLevel = peak;

    // Accumulate into buffer
    for (let i = 0; i < input.length; i++) {
      this.buffer[this.writeIndex] = input[i];
      this.writeIndex++;

      if (this.writeIndex >= BUFFER_SIZE) {
        // Buffer full — send it with level data
        this.port.postMessage({
          type: "audio-buffer",
          samples: this.buffer.slice(),
          rms: this.smoothedRMS,
          peak: this.peakLevel,
          timestamp: currentTime,
          sampleRate: sampleRate,
        });
        this.writeIndex = 0;
        this.peakLevel = 0;
      }
    }

    // Send level updates more frequently than full buffers (every ~5ms)
    this.frameCount++;
    if (this.frameCount % 4 === 0) {
      this.port.postMessage({
        type: "level",
        rms: this.smoothedRMS,
        peak: this.peakLevel,
        timestamp: currentTime,
      });
    }

    return true;
  }
}

registerProcessor("pitch-processor", PitchProcessor);
