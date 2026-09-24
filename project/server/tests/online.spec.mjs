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
    body: JSON.stringify({ mode: 'online', difficulty: 'small', players: [{ name: 'A', lang: 'zh_CN', avatar: 'a', kind: 'human' }, { name: 'B', lang: 'en', avatar: 'b', kind: 'human' }] }),
  });
  return (await r.json()).roomId;
}
async function main() {
  const roomId = await createRoom();
  const s1 = makeSocket(); const s2 = makeSocket();
  await sleep(100);
  s1.socket.emit('join', { roomId, playerIdx: 0 });
  s2.socket.emit('join', { roomId });
  await sleep(300);
  const st = s1.state.state;
  assert(st && st.finished === false, 'room should be playing');
  assert(st.players.length === 2, '2 players');
  // roll as player A (seat 0)
  s1.socket.emit('act', { type: 'ROLL', player: 0 });
  await sleep(300);
  assert(s1.state.state.players[0].position !== 0, 'piece should move');
  // if a question tile, answer (find the right choice)
  if (s1.state.state.pending?.kind === 'question') {
    const q = s1.state.state.pending.question;
    s1.socket.emit('act', { type: 'ANSWER', player: 0, payload: { choice: q.answerIndex } });
    await sleep(300);
  }
  assert(s1.state.state.turnsElapsed >= 1, 'turn should advance after answer');
  assert(s1.state.state.turn !== 0, 'turn should switch to player B');
  // player B also should have the same turns
  assert(s2.state.state.turnsElapsed >= 1, 'player2 socket should have received state');
  console.log('ONLINE 2P: turns=', s1.state.state.turnsElapsed, 'turn=', s1.state.state.turn, 'OK');
  s1.socket.disconnect(); s2.socket.disconnect();
}
main().catch((e) => { console.error('FAIL', e); process.exit(1); });
