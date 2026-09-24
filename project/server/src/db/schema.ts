import path from 'node:path';
import fs from 'node:fs';
import { DB_PATH } from '../config.js';
import * as bsl from 'better-sqlite3';

// better-sqlite3 的实例类型：通过构造函数推导
type DbInstance = typeof bsl.default extends new (filename?: string | Buffer, options?: object) => infer T ? T : never;

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL CHECK(kind IN ('riddle','knowledge')),
  lang TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK(difficulty IN ('small','big')),
  title TEXT NOT NULL,
  options TEXT NOT NULL,
  answer INTEGER NOT NULL,
  tag TEXT,
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
  }
  return db;
}