import { getDb } from './schema.js';
import { midAutumnQuestions } from './midautumn.js';
import type { QuestionBank } from '../engine/types.js';

export type BankQuestion = {
  kind: 'riddle' | 'knowledge' | 'math';
  lang: 'zh_CN' | 'en' | 'de';
  difficulty: 'small' | 'medium' | 'big';
  title: string;
  options: string[];
  answer: number;
  tag?: string;
  reward?: number;
  penalty?: number;
};

function defaultPay(kind: BankQuestion['kind']): { reward: number; penalty: number } {
  if (kind === 'riddle') return { reward: 20, penalty: 5 };
  return { reward: 10, penalty: 5 };
}

export function insertQuestions(rows: BankQuestion[]) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO questions (kind, lang, difficulty, title, options, answer, tag, reward, penalty)
    VALUES (:kind, :lang, :difficulty, :title, :options, :answer, :tag, :reward, :penalty)
  `);
  let n = 0;
  for (const r of rows) {
    const pay = defaultPay(r.kind);
    const info = stmt.run({
      kind: r.kind,
      lang: r.lang,
      difficulty: r.difficulty,
      title: r.title,
      options: JSON.stringify(r.options),
      answer: r.answer,
      tag: r.tag ?? null,
      reward: r.reward ?? pay.reward,
      penalty: r.penalty ?? pay.penalty,
    });
    if (info.changes) n++;
  }
  return n;
}

export interface StoredQuestion {
  id: number;
  kind: 'riddle' | 'knowledge' | 'math';
  lang: string;
  difficulty: string;
  title: string;
  options: string[];
  answer: number;
  tag: string | null;
  reward: number;
  penalty: number;
}

export function listQuestions(filter: { lang?: string; kind?: string } = {}): StoredQuestion[] {
  const db = getDb();
  const where: string[] = [];
  const args: string[] = [];
  if (filter.lang) { where.push('lang = ?'); args.push(filter.lang); }
  if (filter.kind) { where.push('kind = ?'); args.push(filter.kind); }
  const sql = `SELECT id, kind, lang, difficulty, title, options, answer, tag, reward, penalty FROM questions ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY id DESC`;
  const rows = db.prepare(sql).all(...args) as Array<Omit<StoredQuestion, 'options'> & { options: string }>;
  return rows.map((r) => ({ ...r, options: JSON.parse(r.options) }));
}

export function addQuestion(row: BankQuestion): StoredQuestion {
  const db = getDb();
  const pay = defaultPay(row.kind);
  const info = db.prepare(`
    INSERT INTO questions (kind, lang, difficulty, title, options, answer, tag, reward, penalty)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    row.kind, row.lang, row.difficulty, row.title.trim(), JSON.stringify(row.options.map((o) => o.trim())),
    row.answer, row.tag ?? null, row.reward ?? pay.reward, row.penalty ?? pay.penalty,
  );
  return listQuestions().find((q) => q.id === Number(info.lastInsertRowid))!;
}

export function seedAll(): number {
  const math: BankQuestion[] = [
    { kind: 'math', lang: 'zh_CN', difficulty: 'small', title: '3 + 4 = ?', options: ['6', '7', '8'], answer: 1, reward: 10, penalty: 5, tag: 'add' },
    { kind: 'math', lang: 'zh_CN', difficulty: 'small', title: '9 - 2 = ?', options: ['7', '6', '11'], answer: 0, reward: 10, penalty: 5, tag: 'sub' },
    { kind: 'math', lang: 'zh_CN', difficulty: 'big', title: '12 + 15 = ?', options: ['26', '27', '28'], answer: 1, reward: 15, penalty: 8, tag: 'add' },
    { kind: 'math', lang: 'en', difficulty: 'small', title: '3 + 4 = ?', options: ['6', '7', '8'], answer: 1, reward: 10, penalty: 5, tag: 'add' },
    { kind: 'math', lang: 'en', difficulty: 'small', title: '9 - 2 = ?', options: ['7', '6', '11'], answer: 0, reward: 10, penalty: 5, tag: 'sub' },
    { kind: 'math', lang: 'en', difficulty: 'big', title: '12 + 15 = ?', options: ['26', '27', '28'], answer: 1, reward: 15, penalty: 8, tag: 'add' },
    { kind: 'math', lang: 'de', difficulty: 'small', title: '3 + 4 = ?', options: ['6', '7', '8'], answer: 1, reward: 10, penalty: 5, tag: 'add' },
    { kind: 'math', lang: 'de', difficulty: 'small', title: '9 - 2 = ?', options: ['7', '6', '11'], answer: 0, reward: 10, penalty: 5, tag: 'sub' },
    { kind: 'math', lang: 'de', difficulty: 'big', title: '12 + 15 = ?', options: ['26', '27', '28'], answer: 1, reward: 15, penalty: 8, tag: 'add' },
  ];
  const zh: BankQuestion[] = [
    { kind: 'riddle', lang: 'zh_CN', difficulty: 'small', title: '圆圆的月亮', options: ['太阳', '月亮', '星星'], answer: 1, tag: 'moon' },
    { kind: 'riddle', lang: 'zh_CN', difficulty: 'small', title: '夜空中最亮的灯笼', options: ['灯笼', '月亮', '太阳'], answer: 1, tag: 'moon' },
    { kind: 'riddle', lang: 'zh_CN', difficulty: 'small', title: '嫦娥抱着小玉兔', options: ['月亮上的兔子', '地球上的兔子', '天上飞的兔子'], answer: 0, tag: 'rabbit' },
    { kind: 'riddle', lang: 'zh_CN', difficulty: 'big', title: '中秋节吃什么传统食物？', options: ['饺子', '月饼', '馒头'], answer: 1, tag: 'mooncake' },
    { kind: 'riddle', lang: 'zh_CN', difficulty: 'big', title: '嫦娥住在哪？', options: ['地球上', '海里', '月亮上'], answer: 2, tag: 'chang-e' },
    { kind: 'riddle', lang: 'zh_CN', difficulty: 'big', title: '中秋夜最常见的灯叫什么？', options: ['灯笼', '蜡烛', '灯泡'], answer: 0, tag: 'lantern' },
    { kind: 'knowledge', lang: 'zh_CN', difficulty: 'small', title: '中秋节是农历几月几号？', options: ['八月十五', '一月十五', '十月十五'], answer: 0, tag: 'date' },
    { kind: 'knowledge', lang: 'zh_CN', difficulty: 'small', title: '中秋节最传统的活动之一是什么？', options: ['吃饺子', '吃月饼', '吃汤圆'], answer: 1, tag: 'custom' },
    { kind: 'knowledge', lang: 'zh_CN', difficulty: 'small', title: '玉兔住在哪里？', options: ['地球上海里', '月亮上', '森林里'], answer: 1, tag: 'rabbit' },
    { kind: 'knowledge', lang: 'zh_CN', difficulty: 'big', title: '嫦娥在中秋的故事中是什么人物？', options: ['月宫的仙女', '地下的神仙', '海里的仙女'], answer: 0, tag: 'chang-e' },
    { kind: 'knowledge', lang: 'zh_CN', difficulty: 'big', title: '灯谜一般写在哪里？', options: ['桌子上', '地上', '灯笼上'], answer: 2, tag: 'riddle' },
    { kind: 'knowledge', lang: 'zh_CN', difficulty: 'big', title: '中秋节的"团圆"是什么意思？', options: ['家人聚在一起', '一个人玩', '去学校'], answer: 0, tag: 'reunion' },
  ];
  const en: BankQuestion[] = [
    { kind: 'riddle', lang: 'en', difficulty: 'small', title: 'Round and bright in the night sky', options: ['The sun', 'The moon', 'A star'], answer: 1, tag: 'moon' },
    { kind: 'riddle', lang: 'en', difficulty: 'small', title: 'Who is often said to fly to the moon?', options: ['Chang-e', 'A dog', 'A cat'], answer: 0, tag: 'chang-e' },
    { kind: 'riddle', lang: 'en', difficulty: 'small', title: 'What do families eat together on Mid-Autumn Festival?', options: ['Mooncakes', 'Burgers', 'Sandwiches'], answer: 0, tag: 'mooncake' },
    { kind: 'riddle', lang: 'en', difficulty: 'big', title: 'Which festival is on the 15th of the 8th lunar month?', options: ['New Year Festival', 'Mid-Autumn Festival', 'Lantern Festival'], answer: 1, tag: 'date' },
    { kind: 'riddle', lang: 'en', difficulty: 'big', title: 'What small animal lives with Chang-e on the moon?', options: ['A lion', 'A jade rabbit', 'A horse'], answer: 1, tag: 'rabbit' },
    { kind: 'riddle', lang: 'en', difficulty: 'big', title: 'Which is a traditional Mid-Autumn game?', options: ['Playing chess', 'Jump rope', 'Guessing riddles on lanterns'], answer: 2, tag: 'riddle' },
    { kind: 'knowledge', lang: 'en', difficulty: 'small', title: 'What festival celebrates watching the full moon?', options: ['Easter', 'Halloween', 'Mid-Autumn Festival'], answer: 2, tag: 'date' },
    { kind: 'knowledge', lang: 'en', difficulty: 'small', title: 'What sweet pastry is eaten during the festival?', options: ['Mooncake', 'Donut', 'Cake'], answer: 0, tag: 'mooncake' },
    { kind: 'knowledge', lang: 'en', difficulty: 'big', title: 'What does "Mid-Autumn Festival" symbolize?', options: ['Family reunion', 'Winter snow', 'Rainy season'], answer: 0, tag: 'reunion' },
    { kind: 'knowledge', lang: 'en', difficulty: 'big', title: 'Where is Chang-e traditionally said to live?', options: ['In the ocean', 'On the moon', 'In a cave'], answer: 1, tag: 'chang-e' },
    { kind: 'knowledge', lang: 'en', difficulty: 'big', title: 'What do children write on lanterns?', options: ['Riddles', 'Math homework', 'Letters'], answer: 0, tag: 'riddle' },
    { kind: 'knowledge', lang: 'en', difficulty: 'big', title: 'How many mooncakes did this family traditionally eat?', options: ['Ten', 'One per person', 'One hundred'], answer: 1, tag: 'mooncake' },
  ];
  const de: BankQuestion[] = [
    { kind: 'riddle', lang: 'de', difficulty: 'small', title: 'Rund und hell am nächtlichen Himmel', options: ['Die Sonne', 'Der Mond', 'Ein Stern'], answer: 1, tag: 'mond' },
    { kind: 'riddle', lang: 'de', difficulty: 'small', title: 'Wer fliegt laut der Sage zum Mond?', options: ['Chang-e', 'Ein Hund', 'Eine Katze'], answer: 0, tag: 'chang-e' },
    { kind: 'riddle', lang: 'de', difficulty: 'small', title: 'Was essen die Familien beim Mondfest?', options: ['Burger', 'Mondkuchen', 'Sandwiches'], answer: 1, tag: 'mondkuchen' },
    { kind: 'riddle', lang: 'de', difficulty: 'big', title: 'Welches Fest wird am 15. des 8. Mondmonats gefeiert?', options: ['Neujahrsfest', 'Mondfest', 'Lampenfest'], answer: 1, tag: 'datum' },
    { kind: 'riddle', lang: 'de', difficulty: 'big', title: 'Welches kleine Tier lebt mit Chang-e auf dem Mond?', options: ['Ein Jadehase', 'Ein Löwe', 'Ein Pferd'], answer: 0, tag: 'hase' },
    { kind: 'riddle', lang: 'de', difficulty: 'big', title: 'Welches traditionelle Spiel wird beim Mondfest gespielt?', options: ['Schach', 'Seilspringen', 'Rätsel an Laternen'], answer: 2, tag: 'raetsel' },
    { kind: 'knowledge', lang: 'de', difficulty: 'small', title: 'Was wird beim Vollmond gefeiert?', options: ['Das Mondfest', 'Ostern', 'Halloween'], answer: 0, tag: 'datum' },
    { kind: 'knowledge', lang: 'de', difficulty: 'small', title: 'Welche Süßigkeit ist typisch für das Mondfest?', options: ['Donut', 'Kuchen', 'Mondkuchen'], answer: 2, tag: 'mondkuchen' },
    { kind: 'knowledge', lang: 'de', difficulty: 'big', title: 'Was symbolisiert das Mondfest?', options: ['Winter', 'Regensaison', 'Familienwiederbegegnung'], answer: 2, tag: 'wiederbegegnung' },
    { kind: 'knowledge', lang: 'de', difficulty: 'big', title: 'Wo lebt Chang-e laut Sage?', options: ['Im Ozean', 'In einer Höhle', 'Auf dem Mond'], answer: 2, tag: 'chang-e' },
    { kind: 'knowledge', lang: 'de', difficulty: 'big', title: 'Was schreiben Kinder während des Festes?', options: ['Rätsel', 'Matheaufgaben', 'Briefe'], answer: 0, tag: 'raetsel' },
    { kind: 'knowledge', lang: 'de', difficulty: 'big', title: 'Wie heißt "Mid-Autumn Festival" auf Deutsch?', options: ['Mitternacht', 'Mondfest', 'Laternenfest'], answer: 1, tag: 'datum' },
  ];
  return insertQuestions([...zh, ...en, ...de, ...math, ...midAutumnQuestions()]);
}

// DB 支持的题库；空库时返回 fallback（种子未导入时也能玩）
export function getQuestionBank(): QuestionBank {
  const db = getDb();
  return {
    nextQuestion(lang, kind, difficulty, usedIds) {
      const rows: any[] = db
        .prepare(
          'SELECT id, title, options, answer, reward, penalty FROM questions WHERE kind = ? AND lang = ? AND difficulty = ? ORDER BY id',
        )
        .all(kind, lang, difficulty);
      const unused = rows.filter((r) => !usedIds.includes(r.id));
      if (unused.length === 0) return null;
      const pick = unused[Math.floor(Math.random() * unused.length)];
      return {
        qid: pick.id,
        kind,
        text: pick.title,
        options: JSON.parse(pick.options),
        answerIndex: pick.answer,
        reward: pick.reward,
        penalty: pick.penalty,
      };
    },
  };
}
