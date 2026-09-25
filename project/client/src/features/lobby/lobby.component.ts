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
  protected onlineReady = signal(false); // 在线：玩家1 建好房并等待玩家2
  protected locale = signal<'zh_CN' | 'en' | 'de'>('zh_CN');
  protected joinCode = signal('');

  constructor() {
    // 构造器占位（字段用 inject）
  }


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
          this.gw.join(r.roomId, 0); // 玩家 1 作为 seat 0 入局，等待玩家 2
          this.onlineReady.set(true);
          // 不跳转，留在大厅展示房间码（让玩家1 把码发给玩家2）
        } else {
          // ai 模式：客户端作为 human 玩家 0，AI 是 1
          this.gw.join(r.roomId, 0);
          this.router.navigate(['/game']);
        }
        this.creating.set(false);
        // 创建成功后重置
      })
      .catch((e) => { this.errMsg.set(e.message); this.creating.set(false); });
    return;
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

  protected addPlayer() {
    if (this.players().length < 4) {
      const lang = this.players()[0]?.lang ?? this.locale();
      this.players.update((p) => [...p, { name: 'Player ' + (p.length + 1), lang: lang as any, kind: 'human', avatar: p.length % 4 === 0 ? '🍁' : '🌙' }]);
    }
  }
  // 切换玩家类型为 AI（兔姐）/ 人类
  protected toggleKind(i: number) {
    this.players.update((p) => p.map((q, idx) => (idx === i ? { ...q, kind: q.kind === 'ai' ? 'human' : 'ai' } : q)));
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