// 一键启动：后端(8082) + 前端(3000) 同时跑
// 用法：npm start
import { spawn, exec } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

function run(cmd, cwd) {
  return new Promise((res, rej) => {
    exec(cmd, { cwd, maxBuffer: 10 * 1024 * 1024 }, (err, std, errStd) => {
      if (errStd) process.stderr.write(errStd);
      if (err) { process.stderr.write(`[run] ${cmd}\n${err.message}\n`); return rej(err); }
      process.stdout.write(std);
      res();
    });
  });
}

function spawnProc(label, cmd, cwd) {
  const p = spawn(cmd, { cwd, shell: true, stdio: 'inherit' });
  p.on('error', (e) => console.error(`[${label}] spawn error: ${e.message}`));
  return p;
}

(async () => {
  const serverDir = path.join(ROOT, 'project/server');
  const clientDir = path.join(ROOT, 'project/client');

  // 1. 确保服务端已编译（dist/index.js）
  if (!existsSync(path.join(serverDir, 'dist/index.js'))) {
    console.log('→ 编译服务端…');
    await run('tsc', serverDir);
  }
  console.log(`→ 前端开发端口 http://localhost:3000\n→ 服务端 http://localhost:8082（socket 同端口）`);
  console.log('  浏览器打开 http://localhost:3000\n');

  // 2. 启动两个长进程
  // 服务端：用固定端口 8082（配置默认），避免外部 PORT 干扰
  // 前端：unsetting PORT，否则 ng serve 会忽略 --port 而读 PORT env var
  const serverProc = spawnProc('server', `env PORT=8082 node dist/index.js`, serverDir);
  const clientProc = spawnProc('client', `env -u PORT npx ng serve --port 3000 --configuration=development`, clientDir);
  const server = serverProc;
  const client = clientProc;

  // 3. 一个退出则整体退出
  const done = (label) => () => { console.log(`\n[${label}] 退出，关闭其余进程`); shutdown(); };
  server.on('close', done('server'));
  client.on('close', done('client'));

  function shutdown() {
    server.kill('SIGINT');
    client.kill('SIGINT');
  }
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
