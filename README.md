# 团圆大富翁（Reunion Land / Zuhause-Spiel）

🌕 中秋主题儿童棋盘游戏 —— 大富翁简化版，2–4 人，6–12 岁友好，无淘汰、答错不惩罚。

## 玩法一句话
掷骰绕月行，买灯笼答灯谜，答对拿月亮币，**最先买齐 3 个灯笼就团圆成功**！
支持本地双人、在线双人（WebSocket）与 AI 伙伴"兔姐"；界面与题库支持 **简体中文 / 英语 / 德语**。

## 技术栈
- **前端**：Angular + TypeScript（standalone 组件）
- **后端**：Node.js + Express + socket.io
- **数据库**：SQLite（better-sqlite3）
- **AI（可选）**：本地规则引擎为主；可选接入 LLM（环境变量配置，无网络也能玩）

## 目录（均位于 project/ 下）
- `project/docs/rules.md` —— 游戏规则（开发依据，v1.0）
- `project/docs/plan.md` —— 架构与开发计划
- `project/server/` —— Express 服务（含纯 TS 规则引擎 + 兔姐 AI）
- `project/client/` —— Angular 前端
- `project/database/` —— SQLite 数据文件

## 命名
- **运行时中文名**：团圆大富翁（界面标题使用）
- **英文名 / 目录名**：Reunion Land → `reunion-land`
- **德语工作名**：Zuhause-Spiel（阶段 6 人工审读定稿）

## 快速开始

需要 Node.js 20+（推荐 24）。

### 1. 安装依赖
```bash
cd project/server && npm install
cd ../client && npm install
```

### 2. 启动后端（服务端：8082）
```bash
cd project/server
npm run build        # 编译为 dist/
PORT=8082 npm start  # 默认 8082（8080 被其他服务占时改端口）
```

### 3. 启动前端（客户端：3000）
```bash
cd project/client
npm run build        # 生产构建 → dist/client/browser（可选）
npm run serve        # 开发服务器（http://localhost:3000）
```

### 4. 开始玩
浏览器打开 `http://localhost:3000`：
1. 大厅选「本地双人」→ 填两人姓名/语言 → 开局
2. 两人轮流点「掷骰子」（热座，谁该轮到谁点）
3. 落到灯笼位可买/跳过；落到谜/知/数学格答题；答对拿分
4. 最先集齐 **3 个灯笼** 者胜（或 40 回合内灯笼+金币最多者胜）

> 测试（服务端）：`cd project/server && npm test`

## 状态
🔨 开发中 — P0–P3 ✅ 已完成并端到端验证；P4（在线双人）⏳ / P5（AI 兔姐）⏳ / P6（i18n 全量 + 德语审读）⏳ / P7（部署）☐
