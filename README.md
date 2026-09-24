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

## 状态
📄 文档阶段（规则已定 v1.0，计划已定）→ 待确认后进入 P1 开发。
