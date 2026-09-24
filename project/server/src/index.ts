// 服务端入口：Express + socket.io + SQLite
import express from 'express';
import http from 'node:http';
import cors from 'cors';
import { Server } from 'socket.io';
import type { Server as IoServer } from 'socket.io';
import { PORT } from './config.js';
import { getDb } from './db/schema.js';
import { seedAll } from './db/bank.js';
import { RoomManager } from './rooms/manager.js';
import type { NewGameConfig } from './engine/types.js';

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = http.createServer(app);
// 允许跨域（客户端 3000 → 服务端 8082）；socket.io 独立于 Express 中间件，需单独设 CORS
const io: IoServer = new Server(httpServer, {
  cors: { origin: true, credentials: true },
});
const manager = new RoomManager(io);
getDb();
seedAll();
console.log('[reunion-land] DB 初始化完成，题目种子已导入');

// ---------- REST ----------
app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/rooms', (req, res) => {
  const data = req.body;
  const errors: string[] = [];
  const mode = data?.mode;
  const difficulty = data?.difficulty;
  const players = data?.players;
  if (!data) errors.push('no data');
  if (errors.length === 0 && (!mode || !['local', 'online', 'ai'].includes(mode))) errors.push('invalid mode');
  if (errors.length === 0 && (!difficulty || !['small', 'big'].includes(difficulty))) errors.push('invalid difficulty');
  if (errors.length === 0 && (!Array.isArray(players) || players.length < 2 || players.length > 4)) errors.push('need 2-4 players');
  if (errors.length > 0) {
    res.status(400).json({ error: errors.join('; ') });
    return;
  }
  try {
    const config: NewGameConfig = { mode, difficulty, players };
    const room = manager.createRoom(config);
    res.json({ roomId: room.id, mode: room.state.mode });
  } catch (e) {
    res.status(400).json({ error: String(e) });
  }
});

app.get('/api/rooms/:id/state', (req, res) => {
  const room = manager.getRoom(req.params.id);
  if (!room) {
    res.status(404).json({ error: 'room not found' });
    return;
  }
  res.json({ state: room.state });
});

// ---------- socket.io ----------
io.on('connection', (socket) => {
  socket.on('join', (data: { roomId: string; playerIdx: number }) => {
    try {
      const room = manager.joinSocket(socket, data);
      socket.emit('joined', { roomId: room.id, state: room.state });
    } catch (e) {
      socket.emit('join_error', { error: String(e) });
    }
  });
  socket.on('act', (data: any) => {
    try {
      manager.act(socket, data);
    } catch (e) {
      socket.emit('act_error', { error: String(e) });
    }
  });
  socket.on('ping', () => {
    socket.emit('pong');
  });
  socket.on('disconnect', () => {
    manager.leaveSocket(socket);
  });
});

httpServer.listen(PORT, () => {
  console.log(`[reunion-land] 服务端监听 http://localhost:${PORT}`);
});