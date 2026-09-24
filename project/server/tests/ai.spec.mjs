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
// 等待：轮数推进 或 人类轮到
async function waitForProgress(stateHolder, maxMs = 5000) {
  const start = Date.now();
  const baseTurns = stateHolder.state?.turnsElapsed ?? -1;
  const baseRpos = stateHolder.state?.players?.[1]?.position ?? -1;
  while (Date.now() - start < maxMs) {
    const st = stateHolder.state;
    if (st && (st.turnsElapsed > baseTurns || st.players[1].position !== baseRpos)) return true;
    await sleep(60);
  }
  return false;
}
async function main() {
  const { socket, state } = makeSocket();
  const roomId = await createAiRoom();
  socket.emit('join', { roomId, playerIdx: 0 });
  await sleep(400);
  assert(state.state && state.state.players[1].kind === 'ai', 'player1 should be AI');
  const aiPos0 = state.state.players[1].position;
  let turnsAdvanced = 0;
  for (let i = 0; i < 25; i++) {
    const st = state.state;
    if (!st) continue;
    if (st.finished) { assert(true, 'finished'); break; }
    const pkind = st.pending?.kind;
    if (pkind === 'question') {
      const q = st.pending.question;
      socket.emit('act', { type: 'ANSWER', player: 0, payload: { choice: q.answerIndex } });
    } else if (pkind === 'buy') {
      socket.emit('act', { type: st.players[0].coins >= 50 ? 'BUY' : 'SKIP_BUY', player: 0, payload: {} });
    } else if (isHumanTurn(st)) {
      socket.emit('act', { type: 'ROLL', player: 0, payload: {} });
    }
    // 等 AI 回合完成（轮数推进 / AI 移动）
    if (await waitForProgress(state, 5000)) { turnsAdvanced++; }
  }
  const s = state.state;
  assert(s && s.turnsElapsed >= 6, 'turnsElapsed >= 6, got ' + s?.turnsElapsed);
  assert(turnsAdvanced >= 5, 'AI should have acted at least 5 times, advanced=' + turnsAdvanced);
  console.log('AI MODE OK: humanPos=' + s.players[0].position, 'aiPos=' + s.players[1].position,
    'turns=' + s.turnsElapsed, 'advanced=' + turnsAdvanced, 'finished=' + s.finished, 'hLanterns=' + s.players[0].lanterns);
  socket.disconnect();
}
main().catch((e) => { console.error('FAIL', e); process.exit(1); });
