// 实时网关：socket.io 客户端 + REST 建房；状态订阅
import { Injectable, signal } from '@angular/core';
import { io, type Socket } from 'socket.io-client';
import { API_BASE } from './config';
import type { GameState, NewGameConfig, GameEvent } from '../shared/types';

export interface GatewayEmit {
  state?: GameState;
  events?: GameEvent[];
  connected?: boolean;
  error?: string;
  joined?: GameState;
}

interface StateMsg { state: GameState; events?: GameEvent[]; }

@Injectable({ providedIn: 'root' })
export class Gateway {
  private socket: Socket | null = null;
  readonly state = signal<GameState | null>(null);
  readonly events = signal<GameEvent[] | null>(null);
  readonly connected = signal(false);
  readonly error = signal<string>('');
  readonly joined = signal<GameState | null>(null);
  /** 在线房间：已入座的人类座位、需要的人类人数、房间状态 */
  readonly roster = signal<{ seated: number[]; need: number; status: string } | null>(null);

  #roomId = '';
  #myIndex = -1;

  connect(roomId: string): void {
    if (this.socket) { this.socket.disconnect(); this.socket = null; }
    const base = API_BASE || '';
    const url = base ? base : window.location.origin;
    const ws = io(url, { transports: ['polling'] });
    this.socket = ws;
    ws.on('connect', () => this.connected.set(true));
    ws.on('state', (m: StateMsg) => {
      if (m?.state) {
        this.state.set(m.state);
        this.events.set(m.events ?? null);
      }
    });
    ws.on('joined', (d: { roomId: string; state: GameState; playerIdx?: number; seated?: number[]; need?: number; status?: string }) => {
      this.state.set(d.state);
      this.joined.set(d.state);
      this.#roomId = d.roomId;
      if (typeof d.playerIdx === 'number' && d.playerIdx >= 0) this.#myIndex = d.playerIdx;
      if (d.seated && typeof d.need === 'number' && d.status) {
        this.roster.set({ seated: d.seated, need: d.need, status: d.status });
      }
      this.connected.set(true);
    });
    ws.on('roster', (d: { seated: number[]; need: number; status: string }) => {
      if (d && Array.isArray(d.seated)) this.roster.set(d);
    });
    ws.on('act_error', (e: { error: string }) => this.error.set(e.error));
    ws.on('join_error', (e: { error: string }) => this.error.set(e.error));
  }

  disconnect(): void {
    if (this.socket) { this.socket.disconnect(); this.socket = null; this.connected.set(false); }
  }

  join(roomId: string, playerIdx?: number): void {
    this.connect(roomId);
    this.#roomId = roomId;
    this.#myIndex = playerIdx ?? -1;
    this.socket?.emit('join', { roomId, playerIdx });
  }

  act(type: 'ROLL' | 'BUY' | 'SKIP_BUY' | 'ANSWER' | 'HINT', payload: { player: number; choice?: number }) {
    this.socket?.emit('act', { type, player: payload.player, payload: { choice: payload.choice } });
  }

  async createRoom(mode: string, difficulty: string, players: any[]): Promise<{ roomId: string }> {
    const res = await fetch(`${API_BASE}/api/rooms`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mode, difficulty, players }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error ?? 'create failed');
    return { roomId: data.roomId };
  }

  get roomId(): string { return this.#roomId; }
  get myIndex(): number { return this.#myIndex; }
}