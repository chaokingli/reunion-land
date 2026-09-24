import { describe, it, expect } from 'vitest';
import { createGame, processAction } from '../src/engine/engine';
import type { GameState } from '../src/engine/types';
import { RULES } from '../src/board/constants';

let n = 0;
const bank = { nextQuestion: () => ({ qid: ++n, kind: 'riddle', text: 'x', options: ['a','b','c'], answerIndex: 1 }) };

const baseConfig = {
  mode: 'local' as const,
  difficulty: 'small' as const,
  players: [
    { name: '小明', lang: 'zh_CN' as never, avatar: 'a', kind: 'human' },
    { name: 'Amy', lang: 'en' as never, avatar: 'b', kind: 'human' },
    { name: 'Hui', lang: 'de' as never, avatar: 'c', kind: 'human' },
    { name: 'AI', lang: 'zh_CN' as never, avatar: 'd', kind: 'ai' },
  ],
};

function run(s: GameState, action: any) {
  return processAction(s, bank, action);
}

describe('chaos（随机对局验证状态一致性与不变式）', () => {
  it('随机对局能跑完，且满足所有不变式（coins≥0、lanterns≤3、winner 与分数一致）', () => {
    for (const seed of [31415, 555, 999, 123456, 7777]) {
      let s = createGame({ ...baseConfig, seed });
      const seenTypes = new Set<string>();
      let rentCount = 0, buyCount = 0, questionCount = 0, turnCount = 0;
      for (let i = 0; i < 500 && !s.finished; i++) {
        const r = run(s, { type: 'ROLL', player: s.turn });
        r.events.forEach((e) => {
          seenTypes.add(e.type);
          if (e.type === 'RENT') rentCount++;
          if (e.type === 'LANTERN_BOUGHT') buyCount++;
          if (e.type === 'QUESTION_REQUIRED') questionCount++;
        });
        s = r.state;
        turnCount++;
        // resolve 并收集内部事件
        while (!s.finished && s.pending.kind !== 'none') {
          const canBuy = s.pending.kind === 'buy' && s.players[s.turn].coins >= RULES.lanternCost;
          const a = canBuy
            ? { type: 'BUY' as const, player: s.turn }
            : s.pending.kind === 'buy'
              ? { type: 'SKIP_BUY' as const, player: s.turn }
              : { type: 'ANSWER' as const, player: s.turn, payload: { choice: s.pending.question.answerIndex } };
          const r2 = processAction(s, bank, a);
          r2.events.forEach((e) => {
            seenTypes.add(e.type);
            if (e.type === 'LANTERN_BOUGHT') buyCount++;
            if (e.type === 'QUESTION_ANSWERED') questionCount++;
          });
          s = r2.state;
        }
        // 不变式检查
        for (const p of s.players) {
          expect(p.coins).toBeGreaterThanOrEqual(0);
          expect(p.lanterns).toBeLessThanOrEqual(3);
          expect(Number.isFinite(p.coins)).toBe(true);
          expect(Number.isFinite(p.lanterns)).toBe(true);
        }
        expect(s.turn).toBeGreaterThanOrEqual(0);
        expect(s.turn).toBeLessThan(s.players.length);
      }
      expect(s.finished, `game did not finish for seed ${seed}`).toBe(true);
      // winnerId 一致性
      const winner = s.winnerId;
      if (winner !== -1) {
        expect(winner).toBeGreaterThanOrEqual(0);
        expect(winner).toBeLessThan(s.players.length);
        const winnerP = s.players[winner];
        const isBestLantern = winnerP.lanterns >= Math.max(...s.players.map((p) => p.lanterns));
        const bestCoins = Math.max(...s.players.map((p) => p.coins));
        // 若灯笼最多则直接赢；否则灯笼并列时比金币
        const bestScore = Math.max(...s.players.map((p) => p.lanterns * 1000 + p.coins));
        const isBestScore = winnerP.lanterns * 1000 + winnerP.coins === bestScore;
        expect(isBestLantern || isBestScore).toBe(true);
      } else {
        // 平局：所有人分数相同
        const scores = s.players.map((p) => p.lanterns * 1000 + p.coins);
        expect(scores.every((sc) => sc === scores[0])).toBe(true);
      }
      // 事件多样性
      expect(seenTypes.has('DICE_ROLLED')).toBe(true);
      expect(questionCount).toBeGreaterThanOrEqual(1);
      expect(buyCount + rentCount + questionCount + turnCount).toBeGreaterThanOrEqual(1);
    }
  });
});