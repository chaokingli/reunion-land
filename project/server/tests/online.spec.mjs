import { io } from 'socket.io-client';
const PORT = process.env.PORT || '8082';
const BASE = `http://localhost:${PORT}`;
const assert = (c, m) => { if (!c) throw new Error('FAIL: ' + m); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function makeSocket() {
  const st = { state: null };
  const socket = io(BASE, { transports: ['polling'] });
  socket.on('state', (s) => st.state = s.state);
  return { socket, state: st };
}
async function createRoom() {
  const r = await fetch(`${BASE}/api/rooms`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ mode: 'online', difficulty: 'small', players: [
      { name: 'A', lang: 'zh_CN', avatar: 'a', kind: 'human' },
      { name: 'B', lang: 'en', avatar: 'b', kind: 'human' },
    ] }),
  });
  return (await r.json()).roomId;
}
// 等待满足条件的状态 (stateHolder = { socket, state }，读 .state.state)
async function waitFor(stateHolder, pred, maxMs = 6000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const st = stateHolder.state?.state;
    if (pred(st)) return st;
    await sleep(70);
  }
  return null;
}
// 玩家 p 掷骰 + 解析其回合产生的 pending。返回回合结束后的状态。
async function rollAndReturnNext(stateHolder, player) {
  stateHolder.socket.emit('act', { type: 'ROLL', player, payload: {} });
  // 等本回合产生 pending（question/buy），或回合直接结束（无 pending 时 turn 变）
  let st = await waitFor(stateHolder, (t) => t && (t.pending?.kind === 'question' || t.pending?.kind === 'buy' || t.turn !== player), 6000);
  if (!st) return null;
  // 若有 pending，循环解析（作答/跳过），直到 pending 消失
  let guard = 0;
  while (st && (st.pending?.kind === 'question' || st.pending?.kind === 'buy') && guard < 3) {
    guard++;
    if (st.pending.kind === 'question') {
      const q = st.pending.question;
      stateHolder.socket.emit('act', { type: 'ANSWER', player, payload: { choice: q.answerIndex } });
    } else {
      stateHolder.socket.emit('act', { type: 'SKIP_BUY', player, payload: {} });
    }
    st = await waitFor(stateHolder, (t) => t, 3000);
    if (!st) return null;
  }
  // 回合结束：turn 指向下一位（!= 本玩家），且 pending=none
  return st && st.turn !== player && st.pending?.kind === 'none' ? st : null;
}
async function main() {
  const s1 = makeSocket();
  const s2 = makeSocket();
  await sleep(150);
  const roomId = await createRoom();
  s1.socket.emit('join', { roomId, playerIdx: 0 });
  s2.socket.emit('join', { roomId }); // auto → seat 1
  const joined = await waitFor(s1, (st) => st && st.finished === false && st.players.length === 2);
  assert(joined, 'room should be playing with 2 players');

  // A 掷骰 → 回合结束 (turn=1, te=1)
  await rollAndReturnNext(s1, 0);
  const afterA = await waitFor(s1, (st) => st && st.turnsElapsed >= 1 && st.turn === 1);
  assert(afterA, 'turn should advance to player B');
  assert(s1.state.state.players[0].position !== 0, 'player A should have moved');

  // B 掷骰 → 回合结束 (turn=0, te=2)
  await rollAndReturnNext(s2, 1);
  const afterB = await waitFor(s1, (st) => st && st.turnsElapsed >= 2 && st.turn === 0);
  assert(afterB, 'player B should also advance a turn');
  assert(s1.state.state.players[1].position !== 0, 'player B should have moved');

  console.log('ONLINE 2P: turns=', s1.state.state.turnsElapsed, 'turn=', s1.state.state.turn,
    'p0pos=' + s1.state.state.players[0].position, 'p1pos=' + s1.state.state.players[1].position, 'OK');
  s1.socket.disconnect();
  s2.socket.disconnect();
}
main().catch((e) => { console.error('FAIL', e); process.exit(1); });
