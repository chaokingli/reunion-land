import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toObservable } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Gateway } from '../../core/gateway';
import { I18nService } from '../../i18n/i18n.service';
import { SoundService } from '../../core/sound.service';
import { BOARD, cellAt, GRID_SIZE, type TileDef } from '../../shared/board';
import type { GameState, GameEvent } from '../../shared/types';

type Confetti = { id: number; left: string; size: number; color: string; delay: number; duration: number };
const CONFETTI_COLORS = ['#ffd34d', '#ff5c5c', '#7c4dff', '#2979ff', '#00e07a', '#ffab00', '#ff7043', '#388e3c', '#433b93', '#d6262f', '#1565c0', '#2e7d32'];

@Component({
  selector: 'app-game',
  imports: [CommonModule],
  templateUrl: './game.html',
  styleUrl: './game.scss',
})
export class GameComponent {
  protected router = inject(Router);
  protected gw = inject(Gateway);
  protected i18n = inject(I18nService);
  protected sound = inject(SoundService);

  protected state = signal<GameState | null>(null);

  protected diceValue = signal<number | null>(null);
  protected animMsg = signal<string>('');
  protected animKind = signal<'bonus' | 'info' | 'win' | 'lose'>('info');

  // 动画：落子高亮（每次玩家移动时触发）
  protected landedIds = signal<number[]>([]);
  // 胜利彩带
  protected confetti = signal<Confetti[]>([]);
  protected confettiTimer: number | undefined = undefined;

  // 每格显示的格子 + 玩家棋子
  protected cells = computed(() => {
    const s = this.state();
    if (!s) return [];
    const out: { id: string; tiles: TileDef[]; pcs: any[] }[] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const cell = cellAt(r, c);
        const tiles = cell.tiles.map((t) => BOARD[t] as TileDef);
        const pcs = cell.tiles.length ? s.players.filter((p) => cell.tiles.includes(p.position)) : [];
        out.push({ id: r + ':' + c, tiles, pcs });
      }
    }
    return out;
  });

  protected currentTurn() {
    const s = this.state();
    return s?.players[s?.turn ?? 0]?.name ?? '';
  }
  // 上一轮每个玩家位置，用于判断「谁移动了」从而播放落子动画
  private prevPos: Record<number, number> = {};
  protected isMyTurn() {
    const s = this.state();
    if (!s || s.finished) return false;
    if (s.pending.kind !== 'none') return false;
    // 轮到 AI（兔姐）时，人类不能操作（服务端自驱）
    const p = s.players[s.turn];
    if (p && p.kind === 'ai') return false;
    return true;
  }
  protected currentPending() { return this.state()?.pending; }
  protected pendingQuestion() {
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
  protected pieceColor(i: number): string {
    const map = ['var(--pc0)', 'var(--pc1)', 'var(--pc2)', 'var(--pc3)'];
    return map[i % 4] ?? 'var(--pc0)';
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
    if (ev.type === 'QUESTION_ANSWERED' && (ev.correct ?? false)) return 'bonus';
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

  // 当游戏状态变化时判断谁移动了，触发落子动画 + 音效
  private onStatePositionsChange() {
    const s = this.state();
    if (!s) return;
    const landed: number[] = [];
    for (const p of s.players) {
      if (this.prevPos[p.id] !== undefined && this.prevPos[p.id] !== p.position) landed.push(p.id);
      this.prevPos[p.id] = p.position;
    }
    if (landed.length) {
      this.landedIds.set(landed);
      if (this.landedTimer !== undefined) { clearTimeout(this.landedTimer); this.landedTimer = undefined; }
      this.landedTimer = setTimeout(() => this.landedIds.set([]), 700);
    }
  }
  private landedTimer: number | undefined = undefined;

  constructor() {
    toObservable(this.gw.state).subscribe((s) => {
      this.state.set(s);
      if (!s) return;
      this.onStatePositionsChange();
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