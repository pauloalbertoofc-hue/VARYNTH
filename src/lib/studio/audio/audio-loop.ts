export interface CrossfadedLoopBuffer {
  channels: Float32Array[];
  loopStartFrame: number;
  loopEndFrame: number;
  crossfadeFrames: number;
}

/** Creates a non-destructive, equal-power tail-to-head seam for a loopable PCM buffer. */
export function crossfadeLoopChannels(
  sourceChannels: readonly Float32Array[],
  sampleRate: number,
  loopStartMs: number,
  loopEndMs: number,
  crossfadeMs: number,
): CrossfadedLoopBuffer {
  if (!sourceChannels.length || !Number.isFinite(sampleRate) || sampleRate <= 0 || sourceChannels.some((channel) => channel.length !== sourceChannels[0].length)) {
    throw new Error("[AUDIO_LOOP_BUFFER_INVALID] O buffer PCM do loop está vazio ou inconsistente.");
  }
  const frameCount = sourceChannels[0].length;
  const loopStartFrame = Math.round(loopStartMs * sampleRate / 1000);
  const loopEndFrame = Math.round(loopEndMs * sampleRate / 1000);
  const crossfadeFrames = Math.round(crossfadeMs * sampleRate / 1000);
  if (!Number.isFinite(loopStartMs) || !Number.isFinite(loopEndMs) || !Number.isFinite(crossfadeMs) || loopStartFrame < 0 || loopEndFrame > frameCount || loopEndFrame <= loopStartFrame || crossfadeFrames < 0 || crossfadeFrames * 2 > loopEndFrame - loopStartFrame) {
    throw new Error("[AUDIO_LOOP_CROSSFADE_INVALID] Região ou crossfade do loop excede o buffer decodificado.");
  }
  const channels = crossfadeFrames > 0 ? sourceChannels.map((channel) => channel.slice()) : [...sourceChannels];
  if (crossfadeFrames > 0) {
    const denominator = Math.max(1, crossfadeFrames - 1);
    for (let channelIndex = 0; channelIndex < channels.length; channelIndex++) {
      const source = sourceChannels[channelIndex];
      const target = channels[channelIndex];
      for (let index = 0; index < crossfadeFrames; index++) {
        const progress = crossfadeFrames === 1 ? 1 : index / denominator;
        const tailGain = Math.cos(progress * Math.PI / 2);
        const headGain = Math.sin(progress * Math.PI / 2);
        const tailIndex = loopEndFrame - crossfadeFrames + index;
        const headIndex = loopStartFrame + index;
        target[tailIndex] = source[tailIndex] * tailGain + source[headIndex] * headGain;
      }
    }
  }
  return { channels, loopStartFrame: loopStartFrame + crossfadeFrames, loopEndFrame, crossfadeFrames };
}
