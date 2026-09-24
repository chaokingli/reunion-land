import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toObservable } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Gateway } from '../../core/gateway';
import { I18nService } from '../../i18n/i18n.service';
import { BOARD, cellAt, GRID_SIZE, type TileDef } from '../../shared/board';
import type { GameState, GameEvent } from '../../shared/types';

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

  protected state = signal<GameState | null>(null);

  protected diceValue = signal<number | null>(null);
  protected animMsg = signal<string>('');
  protected animKind = signal<'bonus' | 'info' | 'win' | 'lose'>('info');

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
      name: p ? (p[0]?.name ?? '') : '',
      option: ev.option ?? '',
    };
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
    this.gw.act('ROLL', { player: this.state()?.turn ?? 0 });
  }
  buy() {
    const p = this.currentPlayer();
    if (p && p.coins >= 50) this.gw.act('BUY', { player: this.state()?.turn ?? 0 });
  }
  skip() { this.gw.act('SKIP_BUY', { player: this.state()?.turn ?? 0 }); }
  answer(choice: number) {
    this.gw.act('ANSWER', { player: this.state()?.turn ?? 0, choice: choice as 0 | 1 | 2 });
  }
  hint() {
    if (!this.currentPlayer()?.hintUsed) this.gw.act('HINT', { player: this.state()?.turn ?? 0 });
  }
  playAgain() {
    this.gw.disconnect();
    this.router.navigate(['/lobby']);
  }
  backLobby() {
    this.gw.disconnect();
    this.router.navigate(['/lobby']);
  }

  constructor() {
    toObservable(this.gw.state).subscribe((s) => { this.state.set(s); });
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
        this.showMsg('events.' + ev.type, this.eventVars(ev), this.eventKind(ev));
      }
    });
  }
}