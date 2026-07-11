import type { SoundId } from "@/tinnitus/domain/types";

export class SafeAudioEngine {
  private context: AudioContext | null = null;
  private source: AudioBufferSourceNode | null = null;
  private master: GainNode | null = null;

  private getContext() {
    const AudioContextClass = window.AudioContext;
    this.context ??= new AudioContextClass();
    return this.context;
  }

  private createNoiseBuffer(context: AudioContext, sound: SoundId) {
    const length = context.sampleRate * 8;
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    let brown = 0; let b0 = 0; let b1 = 0; let b2 = 0; let b3 = 0; let b4 = 0; let b5 = 0; let b6 = 0;
    for (let i = 0; i < length; i += 1) {
      const white = Math.random() * 2 - 1;
      brown = (brown + 0.02 * white) / 1.02;
      b0 = 0.99886 * b0 + white * 0.0555179; b1 = 0.99332 * b1 + white * 0.0750759; b2 = 0.969 * b2 + white * 0.153852; b3 = 0.8665 * b3 + white * 0.3104856; b4 = 0.55 * b4 + white * 0.5329522; b5 = -0.7616 * b5 - white * 0.016898;
      const pink = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11; b6 = white * 0.115926;
      const t = i / context.sampleRate;
      data[i] = sound === "brown_noise" ? brown * 2.7 : sound === "white_noise" ? white * 0.42 : sound === "ocean" ? (brown * 1.6 + pink * 0.15) * (0.2 + Math.pow((Math.sin(t * 0.65) + 1) / 2, 1.8) * 0.7) : sound === "rain" ? (white * 0.28 + pink * 0.3) * (0.8 + Math.sin(t * 0.45) * 0.06) : pink * 0.7;
    }
    return buffer;
  }

  async play(sound: SoundId) {
    this.stop(false);
    const context = this.getContext();
    if (context.state === "suspended") await context.resume();
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const master = context.createGain();
    const limiter = context.createDynamicsCompressor();
    source.buffer = this.createNoiseBuffer(context, sound); source.loop = true;
    filter.type = sound === "narrowband_noise" ? "bandpass" : "lowpass";
    filter.frequency.value = sound === "narrowband_noise" ? 1800 : sound === "rain" ? 3000 : 4500;
    filter.Q.value = sound === "narrowband_noise" ? 1.2 : 0.5;
    master.gain.value = 0;
    limiter.threshold.value = -32; limiter.knee.value = 4; limiter.ratio.value = 20; limiter.attack.value = 0.003; limiter.release.value = 0.25;
    source.connect(filter); filter.connect(master); master.connect(limiter); limiter.connect(context.destination);
    source.start();
    master.gain.linearRampToValueAtTime(0.035, context.currentTime + 0.8);
    this.source = source; this.master = master;
  }

  stop(fade = true) {
    if (!this.context || !this.source) return;
    const source = this.source; const master = this.master; const delay = fade ? 0.35 : 0.02;
    master?.gain.cancelScheduledValues(this.context.currentTime);
    master?.gain.linearRampToValueAtTime(0, this.context.currentTime + delay);
    window.setTimeout(() => { try { source.stop(); } catch { /* already stopped */ } }, delay * 1000 + 20);
    this.source = null; this.master = null;
  }

  dispose() { this.stop(false); void this.context?.close(); this.context = null; }
}
