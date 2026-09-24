import { io } from 'socket.io-client';
const PORT = process.env.PORT || '8082';
const BASE = `http://localhost:${PORT}`;
const assert = (c, m) => { if (!c) throw new Error('FAIL: ' + m); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function makeSocket() {
  const st = { state: null };
  const socket = io(BASE, { transports: ['polling'] });
  socket.on('state', (s) => { st.state = s.state; });
  return { socket, state: st };
}
async function createAiRoom() {
  const r = await fetch(`${BASE}/api/rooms`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ mode: 'ai', difficulty: 'small', aiCount: 1, players: [
      { name: 'Me', lang: 'zh_CN', avatar: 'M', kind: 'human' },
      { name: '兔姐', lang: 'zh_CN', avatar: 'R', kind: 'ai' },
    ] }),
  });
  return (await r.json()).roomId;
}
function isHumanTurn(st) { return st && st.turn === 0 && st.pending?.kind === 'none' && !st.finished; }
// 等待直到不是等待状态：人类轮到（可以掷骰）
function waitForHumanRoll(stateHolder, maxMs = 3000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    if (isHumanTurn(stateHolder.state)) return true;
    sleep(150);
  }
  return false;
}
async function main() {
  const { socket, state } = makeSocket();
  const roomId = await createAiRoom();
  socket.emit('join', { roomId, playerIdx: 0 });
  await sleep(300);
  assert(state.state && state.state.players[1].kind === 'ai', 'player1 should be AI');
  const aiPos0 = state.state.players[1].position;
  let totalTurns = 0;
  for (let i = 0; i < 30; i++) {
    const st = state.state;
    if (st?.finished) break;
    if (!st) continue;
    const pkind = st.pending?.kind;
    // 处理人类该做的事
    if (pkind === 'question') {
      const q = st.pending.question;
      socket.emit('act', { type: 'ANSWER', player: 0, payload: { choice: q.answerIndex } });
    } else if (pkind === 'buy') {
      socket.emit('act', { type: st.players[0].coins >= 50 ? 'BUY' : 'SKIP_BUY', player: 0, payload: {} });
    } else if (isHumanTurn(st)) {
      socket.emit('act', { type: 'ROLL', player: 0, payload: {} });
    }
    await sleep(3500); // 等 AI 回合
  }
  const s = state.state;
  assert(s && s.turnsElapsed >= 3, 'turnsElapsed >= 3, got ' + s?.turnsElapsed);
  assert(s.players[1].position !== aiPos0, 'AI should have moved: ' + aiPos0 + ' -> ' + s.players[1].position);
  console.log('AI MODE OK: humanPos=' + s.players[0].position, 'aiPos=' + s.players[1].position, 'turns=' + s.turnsElapsed, 'humanCoins=' + s.players[0].coins, 'finished=' + s.finished);
  socket.disconnect();
}
main().catch((e) => { console.error('FAIL', e); process.exit(1); });
