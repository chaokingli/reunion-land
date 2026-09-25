// 音效服务（Web Audio API 程序化生成，无需外部音频文件）
// 处理浏览器自动播放策略：首交互后 resume AudioContext
import { Injectable } from '@angular/core';

type OscillatorType = 'sine' | 'triangle' | 'square';

const C = 261.63; // C4 基准

// 音名（C 大调）频率
const NOTE: Record<string, number> = {
  C: 261.63, D: 293.66, E: 329.63, F: 349.23, G: 392.0, A: 440.0, B: 493.88,
  c: 523.25, d: 587.33, e: 659.25, f: 698.46, g: 783.99, a: 880.0, b: 987.77,
};

@Injectable({ providedIn: 'root' })
export class SoundService {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private unlocked = false;
  // 音量（0~1），可在 i18n 或全局设置里调
  private volume = 0.55;

  unlock(): void {
    if (this.unlocked) return;
    this.ctx = this.ctx || new (window.AudioContext || (window as any).webkitAudioContext)();
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.volume;
    this.unlocked = true;
  }

  setVolume(v: number): void {
    this.volume = Math.min(1, Math.max(0, v));
    if (this.master) this.master.gain.value = this.volume;
  }

  // 通用音符（带包络）
  private note(freq: number, t: number, dur = 0.18, vol = 1, type: OscillatorType = 'sine'): void {
    if (!this.ctx || !this.master) return;
    const now = t < 0 ? 0 : t;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(Math.max(0.001, vol), now + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(g);
    g.connect(this.master!);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  // 白噪声（骰子晃动 / 风）
  private noise(t: number, dur = 0.08, vol = 1): void {
    if (!this.ctx || !this.master) return;
    const len = Math.max(1, this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1800;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t < 0 ? 0 : t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.001, vol), (t < 0 ? 0 : t) + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t < 0 ? 0 : t + dur);
    src.connect(hp); hp.connect(g); g.connect(this.master!);
    src.start(t < 0 ? 0 : t);
  }

  // 骰子：快速多次敲击 + 收尾
  roll(): void {
    this.unlock();
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.001;
    for (let i = 0; i < 6; i++) this.noise(t + i * 0.04, 0.05, 0.5);
    this.noise(t + 0.24, 0.12, 0.3);
    // 落定音
    this.note(C * 1.0, t + 0.28, 0.12, 0.5, 'triangle');
  }

  // 买入/跳过灯笼：钱币声
  buy(): void {
    this.unlock();
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.001;
    this.note(C * 2, t, 0.1, 0.5, 'triangle');
    this.note(C * 2 * 1.267, t + 0.06, 0.1, 0.4, 'triangle');
    this.note(C * 2 * 1.5, t + 0.12, 0.14, 0.4, 'triangle');
  }

  // 回答正确：欢快上行
  correct(): void {
    this.unlock();
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.001;
    const seq = ['C', 'D', 'E', 'c'];
    seq.forEach((n, i) => this.note(NOTE[n], t + i * 0.07, 0.16, 0.5, 'triangle'));
    this.note(NOTE['c'], t + 0.27, 0.3, 0.4, 'triangle');
  }

  // 回答错误：柔和下行（不惩罚儿童，轻一点）
  wrong(): void {
    this.unlock();
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.001;
    this.note(C * 2, t, 0.14, 0.3, 'triangle');
    this.note(C * 2 * 0.75, t + 0.12, 0.18, 0.28, 'triangle');
  }

  // 提示：铃声
  hint(): void {
    this.unlock();
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.001;
    this.note(NOTE['e'], t, 0.12, 0.4, 'sine');
    this.note(NOTE['g'], t + 0.08, 0.16, 0.4, 'sine');
    this.note(NOTE['c'], t + 0.16, 0.2, 0.4, 'sine');
  }

  // 收益（过起点/中奖）：硬币
  bonus(): void {
    this.unlock();
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.001;
    const seq = ['C', 'e', 'g', 'c'];
    seq.forEach((n, i) => this.note(NOTE[n], t + i * 0.05, 0.1, 0.4, 'triangle'));
  }

  // 胜负
  win(): void {
    this.unlock();
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.001;
    const seq = ['C', 'e', 'g', 'c', 'e', 'g', 'c'];
    seq.forEach((n, i) => this.note(NOTE[n], t + i * 0.13, i === seq.length - 1 ? 0.6 : 0.16, 0.5, 'triangle'));
  }
  lose(): void {
    this.unlock();
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.001;
    this.note(NOTE['B'], t, 0.12, 0.35, 'triangle');
    this.note(NOTE['G'], t + 0.1, 0.2, 0.3, 'triangle');
  }

  // 回合切换：轻"叮"
  turn(): void {
    this.unlock();
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.001;
    this.note(NOTE['e'], t, 0.1, 0.3, 'sine');
  }
}
