export type AmbientType = "rain" | "ocean" | "cafe";

class AudioEngine {
  private ctx: AudioContext | null = null;
  private source: AudioBufferSourceNode | null = null;
  private gain: GainNode | null = null;
  private lfo: OscillatorNode | null = null;
  private currentType: AmbientType | null = null;

  private getCtx(): AudioContext {
    if (!this.ctx || this.ctx.state === "closed") this.ctx = new AudioContext();
    return this.ctx;
  }

  async resume(): Promise<void> {
    const ctx = this.getCtx();
    if (ctx.state === "suspended") await ctx.resume();
  }

  playChime(): void {
    try {
      const ctx = this.getCtx();
      if (ctx.state === "suspended") ctx.resume();
      const notes = [528, 660, 784];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.connect(g); g.connect(ctx.destination);
        osc.type = "sine"; osc.frequency.value = freq;
        const t = ctx.currentTime + i * 0.18;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.28, t + 0.04);
        g.gain.exponentialRampToValueAtTime(0.001, t + 1.3);
        osc.start(t); osc.stop(t + 1.3);
      });
    } catch { /* AudioContext blocked */ }
  }

  startAmbient(type: AmbientType, volume: number): void {
    if (this.currentType === type) return;
    this.stopAmbient();
    this.currentType = type;
    try {
      const ctx = this.getCtx();
      if (ctx.state === "suspended") ctx.resume();
      const bufSize = 4 * ctx.sampleRate;
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = buf.getChannelData(0);

      if (type === "rain") {
        let last = 0;
        for (let i = 0; i < bufSize; i++) {
          const w = Math.random() * 2 - 1;
          data[i] = (last + 0.02 * w) / 1.02; last = data[i]; data[i] *= 3.5;
        }
      } else if (type === "ocean") {
        let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
        for (let i = 0; i < bufSize; i++) {
          const w = Math.random() * 2 - 1;
          b0=0.99886*b0+w*0.0555179; b1=0.99332*b1+w*0.0750759;
          b2=0.96900*b2+w*0.1538520; b3=0.86650*b3+w*0.3104856;
          b4=0.55000*b4+w*0.5329522; b5=-0.7616*b5-w*0.0168980;
          data[i]=(b0+b1+b2+b3+b4+b5+b6+w*0.5362)*0.11; b6=w*0.115926;
        }
      } else {
        for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * 0.1;
      }

      const src = ctx.createBufferSource();
      src.buffer = buf; src.loop = true;
      const filt = ctx.createBiquadFilter();
      filt.type = "lowpass";
      filt.frequency.value = type === "rain" ? 500 : type === "ocean" ? 700 : 1400;
      const gainNode = ctx.createGain(); gainNode.gain.value = volume;
      src.connect(filt); filt.connect(gainNode); gainNode.connect(ctx.destination);
      src.start();
      this.source = src; this.gain = gainNode;

      if (type === "ocean") {
        const lfo = ctx.createOscillator();
        const lg = ctx.createGain();
        lfo.frequency.value = 0.13; lg.gain.value = volume * 0.35;
        lfo.connect(lg); lg.connect(gainNode.gain);
        lfo.start(); this.lfo = lfo;
      }
    } catch { /* blocked */ }
  }

  setVolume(vol: number): void {
    if (this.gain) this.gain.gain.value = vol;
  }

  stopAmbient(): void {
    try { this.source?.stop(); } catch { /* noop */ }
    try { this.lfo?.stop(); } catch { /* noop */ }
    this.source = null; this.gain = null; this.lfo = null; this.currentType = null;
  }

  get isPlaying(): boolean { return this.source !== null; }
  get playing(): AmbientType | null { return this.currentType; }
}

export const audioEngine = new AudioEngine();
