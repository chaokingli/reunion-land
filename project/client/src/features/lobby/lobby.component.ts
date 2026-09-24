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

  protected mode = signal<'local' | 'online' | 'ai'>('local');
  protected difficulty = signal<'small' | 'big'>('small');
  protected players = signal<PlayerDraft[]>([
    { name: 'Player 1', lang: 'zh_CN', kind: 'human', avatar: '🙂' },
    { name: 'Player 2', lang: 'zh_CN', kind: 'human', avatar: '🌟' },
  ]);

  protected creating = signal(false);
  protected errMsg = signal('');
  protected roomCode = signal('');
  protected joinedRoom = signal(false);
  protected locale = signal<'zh_CN' | 'en' | 'de'>('zh_CN');

  constructor() {}
  // constructor unused for DI (fields use inject)


  protected start() {
    const mode = this.mode();
    const players = this.players();
    this.errMsg.set('');
    this.creating.set(true);
    this.gw
      .createRoom(mode, this.difficulty(), players.map((p) => ({ ...p, avatar: p.avatar })))
      .then((r) => {
        this.roomCode.set(r.roomId);
        if (mode === 'local') {
          this.gw.join(r.roomId, 0);
          this.router.navigate(['/game']);
        } else if (mode === 'online') {
          this.joinedRoom.set(true);
          // 房间已建，等玩家 1 join（本地热座同设备）→ 此处直接 join 玩家 0
          this.gw.join(r.roomId, 0);
          this.router.navigate(['/game']);
        } else {
          // ai 模式：客户端作为 human 玩家 0，AI 是 1
          this.gw.join(r.roomId, 0);
          this.router.navigate(['/game']);
        }
      })
      .catch((e) => { this.errMsg.set(e.message); this.creating.set(false); });
  }

  protected addPlayer() {
    if (this.players().length < 4) {
      const lang = this.players()[0]?.lang ?? this.locale();
      this.players.update((p) => [...p, { name: 'Player ' + (p.length + 1), lang: lang as any, kind: 'human', avatar: p.length % 4 === 0 ? '🍁' : '🌙' }]);
    }
  }
  protected rmPlayer(i: number) {
    if (this.players().length > 2) this.players.update((p) => p.filter((_, idx) => idx !== i));
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
  }
}