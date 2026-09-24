# 《团圆大富翁》开发计划与技术架构

> 依据 `rules.md` v1.0 制定。开发顺序：骨架 → 规则引擎（纯 TS）→ 本地双人 → 题库 → 在线双人 → AI → i18n/打磨 → 部署。

---

## 1. 技术栈（已确认）

| 层 | 技术 | 版本建议 |
|---|---|---|
| 前端 | Angular (standalone components) + TypeScript | Angular 17+ / TS 5.x |
| 状态 | RxJS、`@angular/forms`、`provideHttpClient`、socket.io-client | — |
| 样式 | SCSS，响应式（重点适配 9–13 英寸平板/手机，横向） | — |
| 后端 | Node.js + Express | Node 20+/24, Express 4 |
| 实时 | socket.io (v4)，服务端房间管理 + 服务端掷骰 | — |
| 数据库 | SQLite（单文件，无外部服务），`better-sqlite3` | — |
| 校验 | zod（API/Socket 入参校验） | — |
| 测试 | Vitest（规则引擎 100% 纯 TS 可测）+ ESLint/Prettier | — |
| 打包/部署 | `angular-cli build --base-href`、express 直接跑；后期可选 Docker | — |

## 2. 目录结构（已创建）

> 命名规则：游戏中文名「团圆大富翁」用于运行时（界面标题）；目录/英文名用 **Reunion Land** → `reunion-land`；德语工作名 `Zuhause-Spiel`（待人工审读定稿）。

```
reunion-land/
├── README.md                    # 项目简介（本阶段已写）
├── .gitignore / .eslintrc / .prettierrc
└── project/
    ├── docs/
    │   ├── rules.md             # 游戏规则（已写）
    │   ├── plan.md              # 本文件
    │   ├── seed-questions/      # 题库种子（阶段 3）
    │   └── ai-translation-runbook.md  # AI 翻译操作说明（阶段 6）
    ├── server/
    │   ├── src/
    │   │   ├── index.ts                 # Express + socket.io 入口
    │   │   ├── config.ts                # 端口、路径、LLM env（可选）
    │   │   ├── board/
    │   │   │   └── constants.ts         # 40 格布局（与 rules.md 表一致）
    │   │   ├── engine/                  # ★ 纯 TS 规则引擎（无 IO）
    │   │   │   ├── types.ts             # Player / Room / GameState / Action / Event
    │   │   │   ├── engine.ts            # reduce(state, action) → { state, events[] }
    │   │   │   ├── dice.ts              # 服务端随机数（2–6）
    │   │   │   └── rules.ts             # 收益/租金/胜负判定
    │   │   ├── db/
    │   │   │   ├── schema.sql           # 建表
    │   │   │   ├── questions.seed.ts    # 种子数据导入脚本
    │   │   │   └── repo.ts
    │   │   ├── routes/
    │   │   │   ├── rooms.ts             # REST：建房/查房
    │   │   │   └── questions.ts         # REST：取题（去重随机）
    │   │   ├── rooms/
    │   │   │   └── manager.ts           # 房间状态机：lobby → playing → finished
    │   │   ├── sockets.ts               # socket 事件映射 → engine action
    │   │   └── ai/
    │   │       ├── local.ts             # 兔姐规则引擎策略
    │   │       ├── hints.ts             # 提示（排除一个错误选项）
    │   │       └── llm.ts               # 可选 LLM 适配层（env 配置，fail-soft）
    │   ├── tests/
    │   │   └── engine.spec.ts           # 引擎单测
    │   └── package.json / tsconfig.json
    ├── client/
    │   ├── src/
    │   │   ├── i18n/
    │   │   │   ├── zh_CN.json / en.json / de.json
    │   │   │   └── i18n.service.ts      # 运行时语言切换
    │   │   ├── core/
    │   │   │   ├── gateway.ts           # socket.io 客户端封装 + 状态订阅
    │   │   │   └── math.ts
    │   │   ├── features/
    │   │   │   ├── lobby/               # 建房：人数、模式（本地/在线/AI）、姓名、语言、难度
    │   │   │   ├── board/               # 10×10 棋盘 + 棋子 + 骰子 + 金币
    │   │   │   ├── question/            # 问答弹窗（图+3选项+提示按钮）
    │   │   │   ├── ai-panel/            # 兔姐头像 + 提示按钮
    │   │   │   └── result/              # 胜利结算 + 再来一局
    │   │   ├── app.routes.ts / app.config.ts
    │   │   └── index.html
    │   └── package.json / angular.json / tsconfig.json
    ├── shared/                      # (阶段 1.5) 类型与棋盘常量，前后端共用
    │   ├── engine-types.ts
    │   └── board-constants.ts
    ├── database/
    │   └── reunion.db               # 生成后的 sqlite 文件（.gitignore 忽略）
    └── docker-compose.yml           # (阶段 7，可选)
```

## 3. 核心设计：纯 TS 规则引擎

**原则：所有规则只实现一次，写在 `server/src/engine`，零 IO；前端只做展示与交互。**

```
state: GameState { players[], turn, dice?, lanternOwner[], coins[], questionsAsked[], turnsElapsed, finished, winner }
action: Roll | Buy | PayRent | Answer { player, choice } | Hint | EndTurn
reduce(state, action) → { next, events[] }
events 类型：DICE_ROLLED / MOVED / BOUGHT / RENT / QUESTION_ASKED / WIN / ...
```

- 服务端掷骰（防作弊），前端只展示动画。
- 胜负判定：`lanternOwner` 中同一玩家 ≥3。
- 40 回合上限：回合计数 → 结算。
- 单测覆盖：掷骰、边界移动（回卷、退到起点）、买/租金、收益、胜负、提示排除逻辑。

## 4. API 设计

**REST（服务端 8080，客户端 3000）：**
| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/health` | 健康检查 |
| POST | `/api/rooms` | 建房间 `{mode: local\|online\|ai, aiCount, langs[], difficulty, seed}` → 返回 roomId |
| GET | `/api/rooms/:id` | 房间状态快照 |
| POST | `/api/rooms/:id/actions` | 客户端提交动作（本地模式/双人热座用；线上以 socket 为主，REST 为兼容入口） |
| GET | `/api/questions?kind=riddle&lang=zh_CN&difficulty=small&exclude=[id]` | 从 SQLite 取题（不含答案） |

**Socket（socket.io v4，命名室 `room:{roomId}`）：**
| 事件（client→server） | 事件（server→client） |
|---|---|
| `join` | `state`（每次 action 后广播全状态） |
| `action` | `state`（附带 `events[]` 驱动动画/语音提示） |
| `answer` | `state` |
| `hint` | `state` |

状态全量广播（2–4 人，状态 <5KB），简单、易恢复（断线重连发一次 `state`）。

## 5. 数据库 Schema（SQLite）

```sql
CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL CHECK(kind IN ('riddle','knowledge')),
  lang TEXT NOT NULL,          -- zh_CN | en | de
  difficulty TEXT NOT NULL CHECK(difficulty IN ('small','big')),
  title TEXT NOT NULL,
  options TEXT NOT NULL,       -- JSON: ["A","B","C"]
  answer INTEGER NOT NULL,     -- 0/1/2
  tag TEXT,                    -- moon, chang'e, lantern ...
  UNIQUE(lang, difficulty, title)
);
CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,         -- uuid
  title TEXT, mode TEXT, created_at TEXT,
  status TEXT,                 -- lobby|playing|finished
  payload TEXT                 -- JSON: 房间配置 + 终态快照
);
CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  room_id TEXT, played_at TEXT,
  winner_name TEXT, result TEXT, payload TEXT
);
```
- 数学题**不入库**（运行时生成，按难度种子排除已答）。
- 题库种子：`docs/seed-questions/zh.csv` + en/de；导入脚本 `questions.seed.ts`。

## 6. 多语言 i18n 方案

- 客户端字符串：`client/src/i18n/*.json`，`i18n.service` 运行时切换（Angular `useLocaleData` + 运行时字典双保险）。
- 题目：DB 按 `lang` 存，取题时传玩家语言。
- 未翻译字面量 → 中文兜底（`i18n.fallback = 'zh_CN'`）。
- **德语/英语质量**：AI 辅助翻译（`llm.ts` 开发工具 + 人工校对清单）；上线前人工审读全部 de 字符串。

## 7. AI 设计

| 组件 | 默认（离线） | 可选（LLM，`LLM_*` env） |
|---|---|---|
| 兔姐对手 | 本地策略（买/答/延迟 0.5–1.5s） | 无变化（保持离线，节奏可控） |
| 提示 | 排除一个错误选项 | 提示话术更生动（三语） |
| 出题/翻译 | 种子库 | LLM 生成新谜语 + 翻译，写入 DB（需人工审核标记） |

- LLM 只被**服务器**调用；客户端不接触 key；超时 8s → 回退本地。
- 正确率调参：70%（可被儿童稳定胜过），配置在 `server/src/config.ts`。

## 8. 里程碑与验收（MVP）

| 阶段 | 内容 | 验收标准 |
|---|---|---|
| P0 | 仓库骨架 + lint + docs | 本阶段完成 |
| P1 | 规则引擎 + Vitest（含边界） | `npm test` 全绿；100 次随机局无异常退出 |
| P2 | 本地双人棋盘 UI（10×10、骰子动画、金币、结算） | 一台设备双人完整一局，10–15 min 内结束 |
| P3 | 题库（zh 种子 + 数学生成）+ 问答弹窗 | 三种格子类型均可玩；答错不惩罚；答对得分正确 |
| P4 | 在线双人（socket + 建房 + 断线重连） | 两台设备（或同设备双浏览器）一局可完成 |
| P5 | AI 兔姐（对手 + 提示） | AI 单局胜率约 40–50%（可被儿童赢）；提示可用 |
| P6 | i18n（zh/en/de 全量）+ 配色/音效/动画 | 三种语言 UI 可切；平板横屏可用 |
| P7 | 部署：`npm start` 一键、可选 Docker、README 启动指南 | 全新机器 10 min 内可跑起并开一局 |

**MVP 定义**：P0–P6 全部完成。P7 紧随其后。

## 9. 风险与应对

| 风险 | 应对 |
|---|---|
| socket 断线（家庭 Wi-Fi 差） | 全量 state 广播 + 心跳 15s + 重连 `state` 同步 |
| 德语翻译质量 | AI 翻译 + 人工校对清单；de 字符串单独 checklist |
| AI 太强/太弱 | 70% 正确率参数可调 + 自动对局测试（1000 局统计胜率） |
| 数学题太难 | 两档难度 + 上限（小月 ≤15 / 满月 ≤40） |
| 目录名含中文导致某些工具异常 | 已采用英文名 `reunion-land` 规避；中文名仅出现在运行时与文档中 |

## 10. 待办（MVP 后）

- 4 人在线房、排行榜（DB）、成就（"团圆达人"徽章）
- 背景音乐（中秋小调，本地资源，静音默认）
- 3 个角色皮肤、胜利烟花动画
- 家长模式（出题难度锁定、无提示锁定）
