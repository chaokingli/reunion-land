import path from 'node:path';
import fs from 'node:fs';
import { DB_PATH } from '../config.js';
import * as bsl from 'better-sqlite3';

// better-sqlite3 的实例类型：通过构造函数推导
type DbInstance = typeof bsl.default extends new (filename?: string | Buffer, options?: object) => infer T ? T : never;

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL CHECK(kind IN ('riddle','knowledge','math')),
  lang TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK(difficulty IN ('small','medium','big')),
  title TEXT NOT NULL,
  options TEXT NOT NULL,
  answer INTEGER NOT NULL,
  tag TEXT,
  reward INTEGER NOT NULL DEFAULT 10,
  penalty INTEGER NOT NULL DEFAULT 5,
  UNIQUE(lang, difficulty, title)
);
CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  title TEXT,
  mode TEXT,
  created_at TEXT,
  status TEXT,
  payload TEXT
);
CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  room_id TEXT,
  played_at TEXT,
  winner_name TEXT,
  result TEXT,
  payload TEXT
);
CREATE INDEX IF NOT EXISTS idx_questions_lookup
  ON questions (lang, kind, difficulty, id);
`;

let db: DbInstance | null = null;

export function getDb(): DbInstance {
  if (db === null) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    db = new bsl.default(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.exec(SCHEMA);
    migrateQuestions(db);
  }
  return db;
}

// 旧库只有谜语/知识、没有奖惩列。补列后重建，使 kind 能写入 math。
function migrateQuestions(db: DbInstance): void {
  const cols = db.prepare('PRAGMA table_info(questions)').all() as Array<{ name: string }>;
  const names = new Set(cols.map((c) => c.name));
  if (!names.has('reward')) {
    db.exec('ALTER TABLE questions ADD COLUMN reward INTEGER NOT NULL DEFAULT 10');
    db.exec("UPDATE questions SET reward = 20 WHERE kind = 'riddle'");
  }
  if (!names.has('penalty')) {
    db.exec('ALTER TABLE questions ADD COLUMN penalty INTEGER NOT NULL DEFAULT 5');
  }
  const meta = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'questions'").get() as { sql: string } | undefined;
  const needsRebuild = !!meta && (!meta.sql.includes("'math'") || !meta.sql.includes("'medium'"));
  if (needsRebuild) {
    db.exec(`
      CREATE TABLE questions_v2 (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        kind TEXT NOT NULL CHECK(kind IN ('riddle','knowledge','math')),
        lang TEXT NOT NULL,
        difficulty TEXT NOT NULL CHECK(difficulty IN ('small','medium','big')),
        title TEXT NOT NULL,
        options TEXT NOT NULL,
        answer INTEGER NOT NULL,
        tag TEXT,
        reward INTEGER NOT NULL DEFAULT 10,
        penalty INTEGER NOT NULL DEFAULT 5,
        UNIQUE(lang, difficulty, title)
      );
      INSERT INTO questions_v2 (id, kind, lang, difficulty, title, options, answer, tag, reward, penalty)
        SELECT id, kind, lang, difficulty, title, options, answer, tag, reward, penalty FROM questions;
      DROP TABLE questions;
      ALTER TABLE questions_v2 RENAME TO questions;
      CREATE INDEX IF NOT EXISTS idx_questions_lookup ON questions (lang, kind, difficulty, id);
    `);
  }
}