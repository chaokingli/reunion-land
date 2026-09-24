import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const PORT = Number(process.env.PORT ?? '8082');
export const SOCKET_PORT = process.env.SOCKET_PORT ?? PORT;
export const DB_PATH = process.env.DB_PATH ?? path.resolve(__dirname, '../../database/reunion.db');
// AI（可选）：未配置时走本地规则，游戏仍可完整运行
export const LLM_BASE_URL = process.env.LLM_BASE_URL;
export const LLM_API_KEY = process.env.LLM_API_KEY;
export const LLM_MODEL = process.env.LLM_MODEL ?? 'gpt-4o-mini';
export const LLM_TIMEOUT_MS = 8000;