// 兔姐 AI：本地规则（默认、无网可玩）
// 参数设计：正确率 ~70%、买灯笼保守、延迟 0.4–1.2s —— 保证小朋友能赢
import type { GameStateAction, GameState } from '../engine/types.js';
import { LLM_BASE_URL, LLM_TIMEOUT_MS } from '../config.js';

export const AI_PARAMS = {
  answerAccuracy: 0.7,
  buyThresholdCoins: 55,
  delayMinMs: 400,
  delayMaxMs: 1200,
} as const;

export interface RabbitAi {
  nextAction(state: GameState): GameStateAction | null;
  hintText(lang: 'zh_CN' | 'en' | 'de'): string;
}

export function createRabbitAi(): RabbitAi {
  const hintLines: Record<string, string[]> = {
    zh_CN: ['兔姐给你提示啦～', '再想想，月亮里藏着一个答案！', '你离团圆很近啦！'],
    en: ["Rabbit's hint: think about the moon!", 'You are close! Try again!', 'Good job, keep going!'],
    de: ['Der Hase hat einen Tipp: Denke an den Mond!', 'Nah dran! Versuch es nochmal!', 'Gut gemacht, weiter so!'],
  };
  return {
    nextAction(state: GameState): GameStateAction | null {
      const p = state.players[state.turn];
      if (p.kind !== 'ai') return null;
      if (state.pending.kind === 'none') return { type: 'ROLL', player: p.id };
      if (state.pending.kind === 'buy') {
        const shouldBuy = p.coins >= AI_PARAMS.buyThresholdCoins && p.lanterns < 3;
        return { type: shouldBuy ? 'BUY' : 'SKIP_BUY', player: p.id };
      }
      const q = state.pending.question;
      const correct = Math.random() < AI_PARAMS.answerAccuracy;
      let choice: 0 | 1 | 2;
      if (correct) {
        choice = q.answerIndex as 0 | 1 | 2;
      } else if (q.options.length > 1) {
        const wrongs = (q.options.length === 3 ? [0, 1, 2] : [0, 1]).filter((i) => i !== q.answerIndex);
        choice = wrongs[Math.floor(Math.random() * wrongs.length)] as 0 | 1 | 2;
      } else {
        choice = 0;
      }
      return { type: 'ANSWER', player: p.id, payload: { choice } };
    },
    hintText(lang: 'zh_CN' | 'en' | 'de'): string {
      const lines = hintLines[lang] ?? hintLines.zh_CN;
      return lines[Math.floor(Math.random() * lines.length)];
    },
  };
}

// ---------- 可选 LLM（未配置环境变量则全部走本地，无网络也能玩） ----------
export function llmAvailable(): boolean {
  return LLM_BASE_URL !== undefined && LLM_BASE_URL !== '';
}

export async function llmHint(question: { text: string }, lang: string): Promise<string | null> {
  if (!llmAvailable()) return null;
  const timeout = Math.min(5000, LLM_TIMEOUT_MS);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(`${LLM_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.LLM_API_KEY ? { Authorization: `Bearer ${process.env.LLM_API_KEY}` } : {}),
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: process.env.LLM_MODEL ?? 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              "You are a friendly rabbit mascot for a children's Mid-Autumn Festival board game. " +
              "Reply in " +
              lang +
              ". Keep it very short (1 sentence) and encouraging. Do NOT give away the answer.",
          },
          { role: 'user', content: `Give a short hint for this question without revealing the answer: "${question.text}"` },
        ],
      }),
    });
    const json: unknown = await res.json();
    const content = (json as { choices?: { message?: { content?: string } }[] })?.choices?.[0]?.message?.content;
    return typeof content === 'string' ? content : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}