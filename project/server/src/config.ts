import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const PORT = Number(process.env.PORT ?? '8082');
export const SOCKET_PORT = process.env.SOCKET_PORT ?? PORT;
export const DB_PATH = process.env.DB_PATH ?? path.resolve(__dirname, '../../database/reunion.db');
// 前端静态构建目录（可选，存在则同域服务）
export const CLIENT_DIST = process.env.CLIENT_DIST
  ? path.resolve(process.cwd(), process.env.CLIENT_DIST)
  : path.resolve(__dirname, '../../client/dist/client/browser');
export const HAS_CLIENT_DIST = existsSync(CLIENT_DIST);
// AI（可选）：未配置时走本地规则，游戏仍可完整运行
export const LLM_BASE_URL = process.env.LLM_BASE_URL;
export const LLM_API_KEY = process.env.LLM_API_KEY;
export const LLM_MODEL = process.env.LLM_MODEL ?? 'gpt-4o-mini';
export const LLM_TIMEOUT_MS = 8000;