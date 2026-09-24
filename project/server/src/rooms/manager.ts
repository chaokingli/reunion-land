// 房间管理器：内存维护房间状态，socket 事件 → 引擎动作，AI 回合自驱
import { genRoomCode } from '../utils/id.js';
import type { Server, Socket } from 'socket.io';
import { createGame, processAction } from '../engine/engine.js';
import type { GameStateAction, GameState, NewGameConfig } from '../engine/types.js';
import type { QuestionBank } from '../engine/types.js';
import { getQuestionBank } from '../db/bank.js';
import { createRabbitAi } from '../ai/local.js';
import { AI_PARAMS } from '../ai/local.js';

interface RoomInfo {
  id: string;
  state: GameState;
  bank: QuestionBank;
  status: 'lobby' | 'playing' | 'finished';
  sockets: Map<string, { playerIdx: number }>;
  aiTimer: NodeJS.Timeout | null;
}

export class RoomManager {
  private rooms = new Map<string, RoomInfo>();
  private rabbit = createRabbitAi();

  constructor(private readonly server: Server) {}

  createRoom(config: NewGameConfig): RoomInfo {
    const id = genRoomCode();
    const room: RoomInfo = {
      id,
      state: createGame(config),
      bank: getQuestionBank(),
      status: 'lobby',
      sockets: new Map(),
      aiTimer: null,
    };
    // 本地热座模式：立即可玩（同一浏览器操作多人）
    // AI 模式：仅 1 个 human socket（AI 在服务端自驱），也立即可玩
    if (config.mode === 'local' || config.mode === 'ai') room.status = 'playing';
    this.rooms.set(id, room);
    return room;
  }

  getRoom(id: string): RoomInfo | null {
    return this.rooms.get(id) ?? null;
  }

  joinSocket(socket: Socket, data: { roomId: string; playerIdx?: number }): RoomInfo {
    const room = this.getRoom(data.roomId);
    if (!room) throw new Error('room not found');
    if (room.status === 'finished') throw new Error('game finished');
    // 未指定座次：自动分配第一个空闲席（在线双人用）
    let idx = data.playerIdx;
    if (idx === undefined) {
      const taken = new Set([...room.sockets.values()].map((e) => e.playerIdx));
      for (let i = 0; i < room.state.players.length; i++) if (!taken.has(i)) { idx = i; break; }
      if (idx === undefined) throw new Error('room full');
    }
    if (idx < 0 || idx >= 4) throw new Error('invalid player index');
    room.sockets.set(socket.id, { playerIdx: idx });
    // 加入 socket.io 房间，只接收本房间的 state
    socket.join(`room:${room.id}`);
    // 在线模式：所有 human 玩家都加入后开始（AI 玩家不算 socket）
    if (room.status === 'lobby' && room.state.mode === 'online') {
      const humanCount = room.state.players.filter((p) => p.kind === 'human').length;
      if (room.sockets.size >= humanCount) {
        room.status = 'playing';
      }
    }
    this.emitState(room);
    return room;
  }

  leaveSocket(socket: Socket): void {
    for (const room of this.rooms.values()) {
      if (room.sockets.delete(socket.id)) {
        // 玩家离开：转为 AI（避免卡住）
        const p = this.findPlayerBySocket(socket.id, room);
        if (p && p.kind === 'human') {
          p.kind = 'ai';
          this.emitState(room);
          this.maybeAiAct(room);
        }
        break;
      }
    }
  }

  act(socket: Socket, action: GameStateAction): void {
    const room = this.findRoomBySocket(socket);
    if (!room) throw new Error('not joined');
    if (room.status !== 'playing') throw new Error('game not playing');
    if (room.state.finished) throw new Error('game finished');
    // 人类玩家只能操作自己的座位
    const entry = room.sockets.get(socket.id);
    if (entry && room.state.mode !== 'local' && action.player !== entry.playerIdx) {
      throw new Error('not your turn');
    }
    const r = processAction(room.state, room.bank, action);
    room.state = r.state;
    this.emitStateWithEvents(room, r.events);
    if (room.state.finished) {
      room.status = 'finished';
      this.emitStateWithEvents(room, []);
    } else {
      this.maybeAiAct(room);
    }
  }

  private findPlayerBySocket(socketId: string, room: RoomInfo): RoomInfo['state']['players'][number] | undefined {
    const entry = room.sockets.get(socketId);
    if (!entry) return undefined;
    return room.state.players[entry.playerIdx];
  }

  private findRoomBySocket(socket: Socket): RoomInfo | null {
    for (const room of this.rooms.values()) {
      if (room.sockets.has(socket.id)) return room;
    }
    return null;
  }

  private emitState(room: RoomInfo): void {
    this.server.to(`room:${room.id}`).emit('state', { state: room.state });
  }

  private emitStateWithEvents(room: RoomInfo, events: any[]): void {
    this.server.to(`room:${room.id}`).emit('state', { state: room.state, events });
  }

  private maybeAiAct(room: RoomInfo): void {
    if (room.aiTimer || room.status !== 'playing' || room.state.finished) return;
    const player = room.state.players[room.state.turn];
    if (player.kind !== 'ai') return;
    const delay = AI_PARAMS.delayMinMs + Math.floor(Math.random() * (AI_PARAMS.delayMaxMs - AI_PARAMS.delayMinMs));
    room.aiTimer = setTimeout(() => {
      room.aiTimer = null;
      const next = this.rabbit.nextAction(room.state);
      if (!next || room.state.finished || room.status !== 'playing') return;
      const r = processAction(room.state, room.bank, next);
      room.state = r.state;
      this.emitStateWithEvents(room, r.events);
      if (room.state.finished) {
        room.status = 'finished';
        this.emitStateWithEvents(room, []);
      } else {
        this.maybeAiAct(room);
      }
    }, delay);
  }
}
