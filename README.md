# 团圆大富翁（Reunion Land / Zuhause-Spiel）

🌕 中秋主题儿童棋盘游戏 —— 大富翁简化版，2–4 人，6–12 岁友好，**无淘汰、答错不惩罚**。

## 玩法一句话
掷骰绕月行，买灯笼答灯谜，答对拿月亮币，**最先买齐 3 个灯笼就团圆成功**！
支持**本地双人**（热座）、**在线双人**（Socket）与 **AI 伙伴「兔姐」**；界面与题库支持 **简体中文 / 英语 / 德语**。

## 技术栈
- **前端**：Angular + TypeScript（standalone 组件，Vite）
- **后端**：Node.js + Express + socket.io
- **数据库**：SQLite（better-sqlite3）
- **AI（可选）**：本地规则引擎为主（无网络也能玩）；可选接入 LLM（环境变量配置）

## 快速开始（一键）

需要 Node.js 20+（推荐 22/24）。

```bash
# 1. 安装（根目录，自动装 server + client 依赖）
cd reunion-land
npm install

# 2. 一键启动（同时起后端 8082 + 前端 3000）
npm start

# 3. 浏览器打开
http://localhost:3000
```

> 首次启动会自动编译后端并拉起前端开发服务器。Ctrl+C 停止。

### 手动启动（分别两个终端）
```bash
# 后端（8082）
cd project/server && npm run build:server && node dist/index.js

# 前端（3000）
cd project/client && npm run start:client
```
> 若 8080/8082 被占用：`PORT=9000 cd project/server && node dist/index.js`
> 客户端连的端口在 `client/src/core/config.ts` 的 `SERVER_URL`（dev 8082，prod 同域 ''）。

### Docker 部署（单容器，同端口同域）
```bash
# 构建并启动，访问 http://localhost:3000
docker compose up --build
# 或
docker build -t reunion-land . 
 docker run -d --rm -p 3000:3000 reunion-land:latest
```
> 容器内：Express 服务 同域 → 既出 API/socket，又出构建后的前端；数据库可加 volume 持久化（见 `docker-compose.yml`）。

## 玩法模式
| 模式 | 说明 |
|---|---|
| **本地双人** | 一台设备热座，两人轮流点「掷骰子」 |
| **在线双人** | A 点「开始」得房间码 → 在另一设备输入房间码加入 |
| **AI 兔姐** | 一个人打 AI（70% 正确率，可被孩子赢）。玩家行可切换 🤖/👤 |

## 游戏核心
- 40 格圆环月行；骰子 2–6；起点 +50；灯笼 50 元买；答对 +10~15
- 谜/知/数学三类题，**答错不惩罚**；兔子洞/春风会位移，投掷格可能 + 奖
- 胜：买齐 3 灯笼，或 40 回合后「灯笼+金币」最多者；平局判平
- 提示：每题 1 次，排除一个错误选项

## 目录（均位于 `project/` 下）
```
project/
├── docs/          # rules.md（规则）· plan.md（架构与里程碑）
├── server/        # Express + socket.io + 纯 TS 引擎（src/engine）+ 兔姐 AI
├── client/        # Angular 前端（lobby / game）
└── database/      # SQLite（reunion.db，36 题种子）
```

## 测试
```bash
npm test           # 服务端 Vitest（21 项：引擎 + 混沌）
npm test:online    # 在线双人端到端（2 socket）
npm test:ai        # 1 人 vs 兔姐
npm test:all       # 全部
```
浏览器端到端（CDP/Chrome）已验证：建房→入局、掷骰/移格/回卷加分、买/跳过灯笼、三类题答题（答错不惩罚）、回合轮换、AI 自驱、跨域 CORS。

## AI（可选 LLM）
未配置即完全离线（本地规则）。可配 LLM 让提示更生动：
```bash
# 环境变量（server/.env）
LLM_BASE_URL=https://...
LLM_API_KEY=sk-...
LLM_MODEL=gpt-4o-mini
```
> 本地策略（兔姐）始终作为默认对手，LLM 仅增强提示话术。

## 状态
✅ **P7 部署完成**：`npm start` 一键起全栈；Docker 单容器同域部署（已验证构建+运行）。
⏳ 待做：en/de **人工审读**（AI 翻译，重点德语）；音效/动画、平板横屏。
详见 `project/docs/plan.md`。

## 命名
- 运行时中文名：**团圆大富翁**（界面标题）
- 英文名 / 目录：**Reunion Land** → `reunion-land`
- 德语工作名：Zuhause-Spiel（阶段 6 人工审读定稿）
