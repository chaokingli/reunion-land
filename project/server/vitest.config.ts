// vitest 配置：复用 tsconfig，测试目录 tests/
import { defineConfig } from 'vitest/config';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    include: ['tests/**/*.spec.ts'],
    extendToConfigModule: false,
    globals: false,
    environment: 'node',
  },
});