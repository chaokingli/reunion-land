# ============================================================
# 团圆大富翁 (Reunion Land) — 单容器部署
# 服务端 Express + socket.io + SQLite；同时同域服务前端构建产物
# ============================================================
FROM node:24-bullseye AS build
WORKDIR /app

# 复制项目（.dockerignore 排除 node_modules 等）
COPY . .

# 安装 server + client 依赖（build 阶段保留 devDeps：tsc / ng / typescript）
RUN cd project/server && npm ci \
    && cd ../client && npm ci

# 编译服务端 → dist/
RUN cd project/server && npx tsc

# 构建前端（Angular production；prod 环境 API_BASE='' → 同域）
RUN cd project/client && npx ng build --configuration=production

# ============================================================
# Runtime stage：精简镜像
# ============================================================
FROM node:24-bullseye
WORKDIR /app
ENV PORT=3000
COPY --from=build /app/project/server/dist ./project/server/dist
COPY --from=build /app/project/server/node_modules ./project/server/node_modules
COPY --from=build /app/project/client/dist/client/browser ./project/client/dist/client/browser
COPY --from=build /app/project/server/package.json ./project/server/package.json
EXPOSE 3000
CMD ["node","project/server/dist/index.js"]
