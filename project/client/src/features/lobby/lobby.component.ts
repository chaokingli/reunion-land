import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Gateway } from '../../core/gateway';
import { I18nService } from '../../i18n/i18n.service';

export interface PlayerDraft { name: string; lang: 'zh_CN' | 'en' | 'de'; kind: 'human' | 'ai'; avatar: string; }

@Component({
  selector: 'app-lobby',
  imports: [CommonModule, FormsModule],
  templateUrl: './lobby.html',
  styleUrl: './lobby.scss',
})
export class LobbyComponent {
  protected router = inject(Router);
  protected gw = inject(Gateway);
  protected i18n = inject(I18nService);

  protected mode = signal<'local' | 'online'>('local');
  protected count = signal<2 | 3 | 4>(2);
  protected difficulty = signal<'small' | 'big'>('small');
  protected players = signal<PlayerDraft[]>([
    { name: 'Player 1', lang: 'zh_CN', kind: 'human', avatar: '🐰' },
    { name: 'Player 2', lang: 'zh_CN', kind: 'human', avatar: '🌟' },
  ]);

  protected creating = signal(false);
  protected errMsg = signal('');
  protected roomCode = signal('');
  protected joinedRoom = signal(false);
  protected onlineReady = signal(false); // 在线：玩家1 建好房并等待玩家2
  protected locale = signal<'zh_CN' | 'en' | 'de'>('zh_CN');
  protected joinCode = signal('');

  constructor() {
    // 构造器占位（字段用 inject）
  }


  protected start() {
    const mode = this.mode();
    const players = this.players();
    const mySeat = players.findIndex((p) => p.kind === 'human');
    this.errMsg.set('');
    if (mySeat < 0) {
      this.errMsg.set(this.i18n.getT('lobby.needHuman'));
      return;
    }
    this.creating.set(true);
    this.gw
      .createRoom(mode, this.difficulty(), players.map((p) => ({ ...p, avatar: p.avatar })))
      .then((r) => {
        this.roomCode.set(r.roomId);
        if (mode === 'local') {
          this.gw.join(r.roomId, 0);
          this.router.navigate(['/game']);
        } else {
          this.joinedRoom.set(true);
          this.gw.join(r.roomId, mySeat);
          this.onlineReady.set(true);
        }
        this.creating.set(false);
      })
      .catch((e) => { this.errMsg.set(e.message); this.creating.set(false); });
  }

  // 玩家1 把房间码发给对手后，进入房间
  protected enterOnlineGame() {
    if (!this.onlineReady()) return;
    this.router.navigate(['/game']);
  }

  // 玩家 2：输入对方提供的房间码加入
  protected joinRoom() {
    const code = this.joinCode().trim();
    if (!code) return;
    this.errMsg.set('');
    this.gw.join(code, -1); // -1 表示让服务端自动分配空闲座次
    this.router.navigate(['/game']);
  }

  protected setCount(n: number) {
    const size = (n === 3 || n === 4 ? n : 2) as 2 | 3 | 4;
    this.count.set(size);
    const lang = (this.players()[0]?.lang ?? this.locale()) as PlayerDraft['lang'];
    const avatars = ['🐰', '🌟', '🌙', '🍁'];
    this.players.update((cur) => {
      const next = cur.slice(0, size);
      while (next.length < size) {
        const i = next.length;
        next.push({ name: 'Player ' + (i + 1), lang, kind: 'human', avatar: avatars[i] });
      }
      return next;
    });
  }

  protected setKind(i: number, kind: 'human' | 'ai') {
    this.players.update((p) => p.map((q, idx) => (idx === i ? { ...q, kind } : q)));
  }

  protected humanCount(): number {
    return this.players().filter((p) => p.kind === 'human').length;
  }

  protected seatedCount(): number {
    return this.gw.roster()?.seated.length ?? (this.onlineReady() ? 1 : 0);
  }

  protected allSeated(): boolean {
    const r = this.gw.roster();
    return !!r && r.seated.length >= r.need && r.need > 0;
  }

  protected setLang(i: number, lang: any) {
    this.players.update((p) => p.map((q, idx) => (idx === i ? { ...q, lang } : q)));
  }
  protected setName(i: number, name: string) {
    this.players.update((p) => p.map((q, idx) => (idx === i ? { ...q, name } : q)));
  }
  protected changeLocale(l: 'zh_CN' | 'en' | 'de') {
    this.locale.set(l);
    this.i18n.locale.set(l);
    // 跟随全局语言切换，把所有玩家的答题语言一并同步，保证题目/选项与界面文案同语言（三语）
    this.players.update((p) => p.map((q) => ({ ...q, lang: l }))); 
  }
}