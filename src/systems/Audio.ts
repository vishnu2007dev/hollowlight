/**
 * Procedural sound effects synthesised with the Web Audio API.
 * No audio files, so nothing to license, and it adds nothing to the bundle.
 */
type Sfx = 'shoot' | 'hit' | 'kill' | 'pickup' | 'levelUp' | 'hurt' | 'nova' | 'select' | 'boss' | 'win' | 'lose' | 'wisp';

const MIN_GAP_MS: Partial<Record<Sfx, number>> = { shoot: 45, hit: 35, kill: 30, pickup: 25 };

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private last = new Map<Sfx, number>();
  enabled = true;

  /** Must be called from a user gesture (browsers block audio until then). */
  unlock(): void {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
      this.noise = this.makeNoise();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  play(name: Sfx): void {
    if (!this.enabled || !this.ctx || !this.master) return;
    const now = performance.now();
    const gap = MIN_GAP_MS[name];
    if (gap && now - (this.last.get(name) ?? 0) < gap) return;
    this.last.set(name, now);

    const t = this.ctx.currentTime;
    switch (name) {
      case 'shoot':
        this.tone('square', 880, 1320, 0.05, 0.05, t);
        break;
      case 'hit':
        this.burst(0.03, 0.12, 2400, t);
        break;
      case 'kill':
        this.tone('triangle', 420, 140, 0.09, 0.1, t);
        this.burst(0.05, 0.08, 1200, t);
        break;
      case 'pickup':
        this.tone('sine', 1100 + Math.random() * 300, 1800, 0.06, 0.06, t);
        break;
      case 'levelUp':
        [523, 659, 784, 1047].forEach((f, i) => this.tone('triangle', f, f, 0.12, 0.14, t + i * 0.07));
        break;
      case 'hurt':
        this.tone('sawtooth', 180, 60, 0.18, 0.2, t);
        break;
      case 'nova':
        this.burst(0.25, 0.2, 600, t);
        this.tone('sine', 220, 80, 0.25, 0.15, t);
        break;
      case 'select':
        this.tone('triangle', 660, 990, 0.08, 0.12, t);
        break;
      case 'boss':
        this.tone('sawtooth', 70, 50, 1.2, 0.25, t);
        this.tone('sawtooth', 105, 75, 1.2, 0.15, t);
        break;
      case 'win':
        [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone('triangle', f, f, 0.25, 0.15, t + i * 0.12));
        break;
      case 'wisp':
        [988, 1319, 1760].forEach((f, i) => this.tone('sine', f, f * 1.02, 0.14, 0.12, t + i * 0.05));
        break;
      case 'lose':
        [392, 330, 262, 196].forEach((f, i) => this.tone('triangle', f, f * 0.98, 0.3, 0.15, t + i * 0.18));
        break;
    }
  }

  private tone(type: OscillatorType, from: number, to: number, dur: number, vol: number, at: number): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, at);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), at + dur);
    gain.gain.setValueAtTime(vol, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(gain).connect(this.master!);
    osc.start(at);
    osc.stop(at + dur + 0.02);
  }

  private burst(dur: number, vol: number, cutoff: number, at: number): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.connect(filter).connect(gain).connect(this.master!);
    src.start(at);
    src.stop(at + dur + 0.02);
  }

  private makeNoise(): AudioBuffer {
    const ctx = this.ctx!;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }
}

export const Sound = new AudioEngine();
