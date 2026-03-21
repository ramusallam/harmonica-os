// YIN pitch detection algorithm
// Reference: de Cheveigné & Kawahara (2002)
// Returns detected frequency in Hz, or null if no clear pitch found.

const YIN_THRESHOLD = 0.15;

export function yin(
  buffer: Float32Array,
  sampleRate: number,
  threshold: number = YIN_THRESHOLD,
): { frequency: number; confidence: number } | null {
  const halfLen = Math.floor(buffer.length / 2);
  const difference = new Float32Array(halfLen);
  const cumulativeMeanNormalized = new Float32Array(halfLen);

  // Step 1: Difference function
  for (let tau = 0; tau < halfLen; tau++) {
    let sum = 0;
    for (let i = 0; i < halfLen; i++) {
      const delta = buffer[i] - buffer[i + tau];
      sum += delta * delta;
    }
    difference[tau] = sum;
  }

  // Step 2: Cumulative mean normalized difference
  cumulativeMeanNormalized[0] = 1;
  let runningSum = 0;
  for (let tau = 1; tau < halfLen; tau++) {
    runningSum += difference[tau];
    cumulativeMeanNormalized[tau] = (difference[tau] * tau) / runningSum;
  }

  // Step 3: Absolute threshold — find first dip below threshold
  let tauEstimate = -1;
  for (let tau = 2; tau < halfLen; tau++) {
    if (cumulativeMeanNormalized[tau] < threshold) {
      // Walk to the local minimum
      while (
        tau + 1 < halfLen &&
        cumulativeMeanNormalized[tau + 1] < cumulativeMeanNormalized[tau]
      ) {
        tau++;
      }
      tauEstimate = tau;
      break;
    }
  }

  if (tauEstimate === -1) return null;

  // Step 4: Parabolic interpolation for sub-sample accuracy
  // Guard bounds: tauEstimate is always >= 2 (loop starts at tau=2) but check +1
  const s0 = tauEstimate > 0 ? cumulativeMeanNormalized[tauEstimate - 1] : cumulativeMeanNormalized[tauEstimate];
  const s1 = cumulativeMeanNormalized[tauEstimate];
  const s2 = tauEstimate + 1 < halfLen ? cumulativeMeanNormalized[tauEstimate + 1] : cumulativeMeanNormalized[tauEstimate];

  let betterTau = tauEstimate;
  const denom = 2 * s1 - s2 - s0;
  if (denom !== 0) {
    betterTau = tauEstimate + (s0 - s2) / (2 * denom);
  }

  const frequency = sampleRate / betterTau;
  const confidence = 1 - cumulativeMeanNormalized[tauEstimate];

  // Reject unreasonable frequencies for harmonica (below 100Hz or above 2500Hz)
  if (frequency < 100 || frequency > 2500) return null;

  return { frequency, confidence };
}
