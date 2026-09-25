import { Component, inject, signal, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { toObservable } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Gateway } from '../../core/gateway';
import { I18nService } from '../../i18n/i18n.service';
import { SoundService } from '../../core/sound.service';
import { BOARD, TILE_COUNT, cellAt, GRID_SIZE, type TileDef } from '../../shared/board';
import type { GameState, GameEvent, Player } from '../../shared/types';
import { CELL_SVGS } from './game-icons';

type Confetti = { id: number; left: string; size: number; color: string; delay: number; duration: number };
const CONFETTI_COLORS = ['#ffd34d', '#ff5c5c', '#7c4dff', '#2979ff', '#00e07a', '#ffab00', '#ff7043', '#388e3c', '#433b93', '#d6262f', '#1565c0', '#2e7d32'];

const PIECE_SVGS = [
  // 0 玉兔
  `<svg viewBox="0 0 32 40" width="100%" height="100%" aria-hidden="true"><ellipse cx="16" cy="37" rx="8" ry="2" fill="#000" opacity=".25"/><ellipse cx="10" cy="9" rx="3.1" ry="7" fill="currentColor"/><ellipse cx="22" cy="9" rx="3.1" ry="7" fill="currentColor"/><ellipse cx="10" cy="9.5" rx="1.5" ry="4.2" fill="#fff" opacity=".9"/><ellipse cx="22" cy="9.5" rx="1.5" ry="4.2" fill="#fff" opacity=".9"/><circle cx="16" cy="22" r="9" fill="currentColor"/><circle cx="12.6" cy="20.5" r="1.3" fill="#2b2118"/><circle cx="19.4" cy="20.5" r="1.3" fill="#2b2118"/><ellipse cx="16" cy="24.2" rx="1.8" ry="1.2" fill="#fff"/><path d="M8 28c2 3 12 3 16 0" stroke="#fff" stroke-width="1.2" fill="none" opacity=".7"/></svg>`,
  // 1 灯笼
  `<svg viewBox="0 0 32 40" width="100%" height="100%" aria-hidden="true"><ellipse cx="16" cy="37" rx="8" ry="2" fill="#000" opacity=".25"/><rect x="14" y="2" width="4" height="4" rx="1" fill="#5d4037"/><path d="M16 6v3" stroke="#5d4037" stroke-width="1.4"/><path d="M7 12h18l-2.2 16H9.2L7 12z" fill="currentColor"/><rect x="9" y="17" width="14" height="1.6" fill="#fff" opacity=".65"/><rect x="9.4" y="21.5" width="13.2" height="1.6" fill="#fff" opacity=".4"/><path d="M11 28h10l-1.2 4h-7.6z" fill="#5d4037"/><circle cx="16" cy="15" r="1.6" fill="#fff" opacity=".8"/></svg>`,
  // 2 月亮
  `<svg viewBox="0 0 32 40" width="100%" height="100%" aria-hidden="true"><ellipse cx="16" cy="37" rx="8" ry="2" fill="#000" opacity=".25"/><path d="M20 7a11 11 0 1 0 .2 22A8.5 8.5 0 1 1 20 7z" fill="currentColor"/><circle cx="12.5" cy="16" r="1.15" fill="#fff"/><circle cx="15.2" cy="20.5" r=".8" fill="#fff" opacity=".8"/><path d="M23 8l.7 2.1h2.2l-1.8 1.3.7 2.1-1.8-1.3-1.8 1.3.7-2.1-1.8-1.3h2.2z" fill="#FFD32A"/></svg>`,
  // 3 桂花
  `<svg viewBox="0 0 32 40" width="100%" height="100%" aria-hidden="true"><ellipse cx="16" cy="37" rx="8" ry="2" fill="#000" opacity=".25"/><circle cx="16" cy="14" r="4.2" fill="currentColor"/><circle cx="16" cy="8" r="3.2" fill="currentColor"/><circle cx="10.5" cy="12" r="3.2" fill="currentColor"/><circle cx="21.5" cy="12" r="3.2" fill="currentColor"/><circle cx="12" cy="18.5" r="3.2" fill="currentColor"/><circle cx="20" cy="18.5" r="3.2" fill="currentColor"/><circle cx="16" cy="14" r="1.5" fill="#fff" opacity=".85"/><rect x="14.6" y="22" width="2.8" height="10" rx="1.2" fill="#6d4c41"/><ellipse cx="16" cy="33" rx="5" ry="2" fill="currentColor"/></svg>`,
];

@Component({
  selector: 'app-game',
  imports: [CommonModule],
  templateUrl: './game.html',
  styleUrl: './game.scss',
})
export class GameComponent implements OnDestroy {
  protected router = inject(Router);
  protected gw = inject(Gateway);
  protected i18n = inject(I18nService);
  protected sound = inject(SoundService);
  protected sanitizer = inject(DomSanitizer);

  protected state = signal<GameState | null>(null);

  protected diceValue = signal<number | null>(null);
  protected animMsg = signal<string>('');
  protected animKind = signal<'bonus' | 'info' | 'win' | 'lose'>('info');

  // 动画：落子高亮（走完最后一格时触发）
  protected landedIds = signal<number[]>([]);
  // 棋子当前显示格（与服务器位置分开，便于逐步走动）
  protected viewPos = signal<Record<number, number>>({});
  protected hopPhase = signal<Record<number, 'a' | 'b' | ''>>({});
  protected animating = signal(false);
  // 胜利彩带
  protected confetti = signal<Confetti[]>([]);
  protected confettiTimer: number | undefined = undefined;
  private walkTimer: number | undefined = undefined;
  private walkQueue: { id: number; steps: number[] }[] = [];
  private resyncAfter = false;
  private pieceHtml: SafeHtml[] | null = null;

  // 每格显示的格子 + 玩家棋子（按走动中的显示位置）
  protected cells = computed(() => {
    const s = this.state();
    if (!s) return [];
    const view = this.viewPos();
    const out: { id: string; row: number; col: number; tiles: TileDef[]; pcs: Player[] }[] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const cell = cellAt(r, c);
        const tiles = cell.tiles.map((t) => BOARD[t] as TileDef);
        const pcs = cell.tiles.length
          ? s.players.filter((p) => cell.tiles.includes(view[p.id] ?? p.position))
          : [];
        out.push({ id: r + ':' + c, row: r + 1, col: c + 1, tiles, pcs });
      }
    }
    return out;
  });

  protected currentTurn() {
    const s = this.state();
    return s?.players[s?.turn ?? 0]?.name ?? '';
  }
  protected isMyTurn() {
    const s = this.state();
    if (!s || s.finished) return false;
    if (this.animating()) return false;
    if (s.pending.kind !== 'none') return false;
    // 轮到 AI（兔姐）时，人类不能操作（服务端自驱）
    const p = s.players[s.turn];
    if (p && p.kind === 'ai') return false;
    return true;
  }
  protected currentPending() {
    if (this.animating()) return { kind: 'none' as const };
    return this.state()?.pending;
  }
  protected pendingQuestion() {
    if (this.animating()) return null;
    const p = this.state()?.pending;
    return p?.kind === 'question' ? p.question : null;
  }
  protected currentPlayer() { return this.state()?.players[this.state()?.turn ?? 0]; }
  protected isFinished() { return this.state()?.finished ?? false; }
  protected players(): any[] { return this.state()?.players ?? []; }
  protected curTurn(): number { return this.state()?.turn ?? 0; }
  protected winner() {
    const s = this.state();
    if (!s?.finished) return null;
    const w = s.winnerId;
    return (w === undefined || w === -1 || w < 0 || w >= s.players.length) ? null : s.players[w];
  }

  protected getResultTitle(): string {
    const w = this.winner();
    if (w) return this.i18n.getT('result.winner', { name: w.name ?? '' });
    return this.i18n.getT('result.draw');
  }

  protected getKindClass(kind: string | undefined): string {
    if (!kind) return '';
    return 'kind-' + kind;
  }

  // 棋盘格子文案：优先取 i18n 的 tiles.<kind> 译文，缺失时回退到中文 label
  protected tileLabel(t: TileDef): string {
    const key = 'tiles.' + t.kind;
    const tr = this.i18n.get(key);
    return tr === key ? t.label : tr;
  }

  // 棋盘格子 SVG 矢量图
  protected tileSvg(kind: string | undefined): SafeHtml {
    if (!kind || !CELL_SVGS[kind]) return '';
    return this.sanitizer.bypassSecurityTrustHtml(CELL_SVGS[kind]);
  }
  protected pieceColor(i: number): string {
    const map = ['var(--pc0)', 'var(--pc1)', 'var(--pc2)', 'var(--pc3)'];
    return map[i % 4] ?? 'var(--pc0)';
  }
  protected pieceSvg(i: number): SafeHtml {
    if (!this.pieceHtml) this.pieceHtml = PIECE_SVGS.map((svg) => this.sanitizer.bypassSecurityTrustHtml(svg));
    return this.pieceHtml[i % 4] ?? this.pieceHtml[0];
  }
  protected getDiceDisplay(): string {
    const d = this.diceValue();
    return d === null ? '?' : String(d);
  }
  protected getPendingOptions(): string[] {
    const p = this.state()?.pending;
    return p?.kind === 'question' ? p.question.options : [];
  }

  private showMsg(key: string, vars: Record<string, string>, kind: 'bonus' | 'info' | 'win' | 'lose') {
    this.animMsg.set(this.i18n.getT(key, vars));
    this.animKind.set(kind);
  }

  private eventVars(ev: GameEvent): Record<string, string> {
    const p = this.state()?.players;
    return {
      dice: ev.dice?.toString() ?? '',
      amount: (ev.amount ?? 0).toString(),
      // 按事件所属玩家取名字（WIN 是赢家、TURN_END 是本轮玩家），而非固定的 p[0]
      name: p && ev.player >= 0 ? p[ev.player].name : '',
      option: ev.option ?? '',
    };
  }
  // 事件类型(大写蛇形) -> i18n 文案 key(camelCase)，替代原来 'events.' + ev.type 的硬拼
  private eventKey(ev: GameEvent): string {
    if (ev.type === 'QUESTION_ANSWERED') return ev.correct ? 'events.answerYes' : 'events.answerNo';
    // 投壶中奖也是 BONUS_COINS 但 tag='toss'，用专属文案
    if (ev.type === 'BONUS_COINS') return ev.tag === 'toss' ? 'events.tossWin' : 'events.bonus';
    if (ev.type === 'MOVED' && ev.via) return 'events.' + ev.via; // rabbit / moonwell / wind
    const table: Record<string, string> = {
      DICE_ROLLED: 'events.roll',
      PASS_START: 'events.passStart',
      RENT: 'events.rent',
      LANTERN_BOUGHT: 'events.buy',
      LANTERN_SKIPPED: 'events.skip',
      QUESTION_REQUIRED: 'events.question',
      HINT: 'events.hint',
      TURN_END: 'events.turnEnd',
      WIN: 'events.win',
      TIME_UP: 'events.timeUp',
    };
    return table[ev.type] ?? '';
  }
  private eventKind(ev: GameEvent): 'bonus' | 'info' | 'win' | 'lose' {
    if (ev.type === 'DICE_ROLLED') return 'info';
    if (ev.type === 'WIN') return 'win';
    if (ev.type === 'TIME_UP') return ev.win ? 'win' : 'info';
    if (ev.type === 'QUESTION_ANSWERED') return ev.correct ? 'bonus' : 'lose';
    if (ev.type === 'RENT' || ev.type === 'LANTERN_BOUGHT') return 'lose';
    return 'info';
  }

  rollDice() {
    if (!this.isMyTurn()) return;
    this.sound.unlock();
    this.sound.roll();
    this.gw.act('ROLL', { player: this.state()?.turn ?? 0 });
  }
  buy() {
    const p = this.currentPlayer();
    if (p && p.coins >= 50) {
      this.sound.unlock();
      this.sound.buy();
      this.gw.act('BUY', { player: this.state()?.turn ?? 0 });
    }
  }
  skip() {
    this.sound.unlock();
    this.gw.act('SKIP_BUY', { player: this.state()?.turn ?? 0 });
  }
  answer(choice: number) {
    this.sound.unlock();
    this.gw.act('ANSWER', { player: this.state()?.turn ?? 0, choice: choice as 0 | 1 | 2 });
  }
  hint() {
    if (!this.currentPlayer()?.hintUsed) {
      this.sound.unlock();
      this.sound.hint();
      this.gw.act('HINT', { player: this.state()?.turn ?? 0 });
    }
  }
  playAgain() {
    this.stopConfetti();
    this.gw.disconnect();
    this.router.navigate(['/lobby']);
  }
  backLobby() {
    this.stopConfetti();
    this.gw.disconnect();
    this.router.navigate(['/lobby']);
  }

  // 棋子从当前显示格走到服务器位置。掷骰按 +1 逐格；兔子洞 / 月亮井 / 秋风按该格的 move 方向逐格。
  private consumeMove(s: GameState, evs: GameEvent[]) {
    if (this.animating() || this.walkQueue.length || this.walkTimer !== undefined) {
      this.resyncAfter = true;
      return;
    }
    const view = this.viewPos();
    const known = Object.keys(view).length > 0;
    for (const p of s.players) {
      const from = view[p.id];
      if (from === undefined) {
        this.viewPos.update((v) => ({ ...v, [p.id]: p.position }));
        continue;
      }
      if (from === p.position) continue;
      const steps = known ? this.stepsFor(evs, p.id, from, p.position) : [];
      if (steps.length) this.walkQueue.push({ id: p.id, steps });
      else this.viewPos.update((v) => ({ ...v, [p.id]: p.position }));
    }
    this.pumpWalk();
  }

  private stepsFor(evs: GameEvent[], player: number, from: number, to: number): number[] {
    const steps: number[] = [];
    let cursor = from;
    for (const ev of evs) {
      if (ev.player !== player) continue;
      if (ev.type === 'DICE_ROLLED' && ev.dice && ev.from === cursor) {
        for (let i = 1; i <= ev.dice; i++) {
          cursor = (ev.from + i) % TILE_COUNT;
          steps.push(cursor);
        }
      } else if (ev.type === 'MOVED' && ev.from === cursor && ev.to !== undefined) {
        const delta = BOARD[ev.from]?.move ?? 0;
        if (!delta) continue;
        const sign = Math.sign(delta);
        for (let i = 0; i < Math.abs(delta); i++) {
          cursor = (cursor + sign + TILE_COUNT) % TILE_COUNT;
          steps.push(cursor);
        }
      }
    }
    return steps.length && steps[steps.length - 1] === to ? steps : [];
  }

  private pumpWalk() {
    if (this.walkTimer !== undefined) return;
    const job = this.walkQueue.shift();
    if (!job) {
      this.animating.set(false);
      if (this.resyncAfter) {
        this.resyncAfter = false;
        const s = this.state();
        if (s) this.consumeMove(s, this.gw.events() ?? []);
      }
      return;
    }
    this.animating.set(true);
    let i = 0;
    const tick = () => {
      if (i >= job.steps.length) {
        this.walkTimer = undefined;
        this.hopPhase.update((h) => ({ ...h, [job.id]: '' }));
        this.landedIds.set([job.id]);
        this.walkTimer = window.setTimeout(() => {
          this.landedIds.set([]);
          this.walkTimer = undefined;
          this.pumpWalk();
        }, 420);
        return;
      }
      const pos = job.steps[i++];
      this.viewPos.update((v) => ({ ...v, [job.id]: pos }));
      this.hopPhase.update((h) => ({ ...h, [job.id]: h[job.id] === 'a' ? 'b' : 'a' }));
      this.walkTimer = window.setTimeout(tick, 280);
    };
    tick();
  }

  ngOnDestroy() {
    if (this.walkTimer !== undefined) clearTimeout(this.walkTimer);
    this.stopConfetti();
  }

  constructor() {
    toObservable(this.gw.state).subscribe((s) => {
      this.state.set(s);
      if (!s) return;
      this.consumeMove(s, this.gw.events() ?? []);
      if (s.finished) this.onWin();
    });
    toObservable(this.gw.events).subscribe((evs) => {
      if (!evs || evs.length === 0) return;
      // 找 DICE_ROLLED 更新骰子显示
      const dieEv = evs.find((e) => e.type === 'DICE_ROLLED');
      if (dieEv) {
        this.diceValue.set(dieEv.dice ?? null);
        this.showMsg('events.roll', { dice: String(dieEv.dice ?? ''), name: this.currentTurn() }, 'info');
      }
      // 展示最后一件事件给动画/提示（问题/收益/胜利等）
      const ev = evs.at(-1) as GameEvent;
      if (ev.type !== 'DICE_ROLLED') {
        this.playEventSound(ev);
        // 查不到对应文案（如无 via 的 MOVED）时不显示，避免回显 raw key
        const key = this.eventKey(ev);
        if (key) this.showMsg(key, this.eventVars(ev), this.eventKind(ev));
      }
    });
  }

  // 根据事件播放对应音效
  private playEventSound(ev: GameEvent): void {
    const s = this.state();
    const p = s?.players[ev.player];
    switch (ev.type) {
      case 'MOVED':
        this.sound.unlock();
        break;
      case 'PASS_START':
      case 'BONUS_COINS':
        if (p) this.sound.bonus();
        break;
      case 'LANTERN_BOUGHT':
        this.sound.unlock();
        this.sound.buy();
        break;
      case 'LANTERN_SKIPPED':
        this.sound.unlock();
        this.sound.buy();
        break;
      case 'RENT':
        this.sound.unlock();
        this.sound.wrong();
        break;
      case 'QUESTION_ANSWERED':
        this.sound.unlock();
        this.sound.correct(); // 简化：答对答错都用正确音，儿童友好（无惩罚）
        break;
      case 'HINT':
        this.sound.unlock();
        this.sound.hint();
        break;
      case 'TURN_END':
        this.sound.turn();
        break;
      case 'WIN':
        this.sound.unlock();
        this.sound.win();
        break;
      case 'TIME_UP':
        if (ev.win) this.sound.win();
        else this.sound.lose();
        break;
      default:
        break;
    }
  }

  // 胜利：播放彩带 + 结束音效
  private onWin(): void {
    const s = this.state();
    if (!s?.finished) return;
    this.sound.unlock();
    this.sound.win();
    // 生成彩带
    const pieces: Confetti[] = Array.from({ length: 70 }, (_, i) => ({
      id: i,
      left: Math.random() * 100 + '%',
      size: 8 + Math.random() * 8,
      color: CONFETTI_COLORS[(i * 5) % CONFETTI_COLORS.length],
      delay: Math.random() * 2,
      duration: 3 + Math.random() * 2,
    }));
    this.confetti.set(pieces);
    this.stopConfetti();
  }
  private stopConfetti(): void {
    if (this.confettiTimer !== undefined) { clearTimeout(this.confettiTimer); this.confettiTimer = undefined; }
    if (this.confetti().length) {
      this.confettiTimer = setTimeout(() => this.confetti.set([]), 6000);
    }
  }
}