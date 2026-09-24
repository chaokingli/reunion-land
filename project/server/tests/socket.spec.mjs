import { io } from 'socket.io-client';

const PORT = process.env.PROCESS_PORT || '8082';
const BASE = `http://localhost:${PORT}`;
const assert = (cond, msg) => { if (!cond) { throw new Error('ASSERT FAIL: ' + msg); } };

async function createRoom() {
  const res = await fetch(BASE + '/api/rooms', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      title: 'sock',
      mode: 'local',
      difficulty: 'small',
      players: [
        { name: 'P1', lang: 'zh_CN', avatar: 'a', kind: 'human' },
        { name: 'P2', lang: 'en', avatar: 'b', kind: 'human' },
      ],
    }),
  });
  return (await res.json()).roomId;
}

async function connectAndJoin(roomId) {
  const socket = io(BASE, { transports: ['polling'] });
  const state = {};
  socket.on('state', (d) => { state.state = d.state; });
  socket.on('act_error', (d) => { console.error('act_error', JSON.stringify(d)); });
  socket.on('join_error', (d) => { console.error('join_error', JSON.stringify(d)); });
  await new Promise((res) => {
    socket.on('connect', res);
  });
  await new Promise((res) => {
    socket.emit('join', { roomId, playerIdx: 0 });
    socket.on('joined', res);
  });
  return { socket, state };
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function waitFor(socketState, pred, timeout = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (pred(socketState.state)) return socketState.state;
    await sleep(50);
  }
  return null;
}

async function runOneGame(rounds, label) {
  const roomId = await createRoom();
  const { socket, state } = await connectAndJoin(roomId);
  await sleep(300);
  let s = state.state;
  assert(s, label + ': no initial state');

  // 掷骰几轮
  const totalTurns = rounds;
  for (let i = 0; i < totalTurns; i++) {
    // 如果有 pending，先处理
    while (s && s.pending && s.pending.kind !== 'none') {
      if (s.pending.kind === 'buy') {
        socket.emit('act', { type: s.players[s.turn].coins >= 50 ? 'BUY' : 'SKIP_BUY', player: s.turn });
      } else if (s.pending.kind === 'question') {
        socket.emit('act', { type: 'ANSWER', player: s.turn, payload: { choice: s.pending.question.answerIndex } });
      }
      const before = JSON.stringify(s);
      s = await waitFor(state, (x) => JSON.stringify(x) !== before, 3000);
      assert(s, label + ': no state change after handling pending');
    }
    if (!s || s.finished) break;
    // 掷骰
    const before = JSON.stringify(s);
    socket.emit('act', { type: 'ROLL', player: s.turn });
    s = await waitFor(state, (x) => JSON.stringify(x) !== before, 3000);
    assert(s, label + ': no state change after ROLL');
  }

  socket.disconnect();
  const final = state.state;
  return { finished: final.finished, turns: final.turnsElapsed, winner: final.winnerId };
}

async function main() {
  const r1 = await runOneGame(10, 'g1');
  console.log('GAME1 (10 rolls):', JSON.stringify(r1));
  assert(r1.turns >= 5, 'game should progress (turnsElapsed >= 5)');
  assert(r1.turns <= 10, 'turnsElapsed should be <= number of iterations');
  console.log('---');
  const r2 = await runOneGame(45, 'g2');
  console.log('GAME2 (45 rolls):', JSON.stringify(r2));
  assert(r2.finished, 'game should finish by 45 turns (win or maxTurns=40)');
  assert(r2.turns <= 40, 'turnsElapsed should be <= 40');
  // winner should be a valid index or -1 (draw)
  if (r2.winner !== undefined && r2.winner !== -1) {
    assert(r2.winner >= 0 && r2.winner < 2, 'winnerId must be a valid player index or -1');
  }
  console.log('SOCKET GAME OK');
}

main().catch((e) => { console.error('FAIL', e); process.exit(1); });