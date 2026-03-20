// AudioWorklet processor — runs on the audio rendering thread.
// Loaded via: audioContext.audioWorklet.addModule('/worklets/pitch-processor.js')
// Collects samples into a fixed-size buffer and posts them to the main thread.

const BUFFER_SIZE = 2048;

class PitchProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Float32Array(BUFFER_SIZE);
    this.writeIndex = 0;
  }

  process(inputs) {
    const input = inputs[0]?.[0];
    if (!input) return true;

    for (let i = 0; i < input.length; i++) {
      this.buffer[this.writeIndex] = input[i];
      this.writeIndex++;

      if (this.writeIndex >= BUFFER_SIZE) {
        this.port.postMessage({
          type: "audio-buffer",
          samples: this.buffer.slice(),
          timestamp: currentTime,
        });
        this.writeIndex = 0;
      }
    }

    return true;
  }
}

registerProcessor("pitch-processor", PitchProcessor);
