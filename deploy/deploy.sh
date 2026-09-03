#!/usr/bin/env bash
# Pailink 在线自动部署脚本（Gitee tag -> 拉取/构建/重载）
# 宝塔「PM2 管理器」底层即 pm2：前台/后台/部署服务都用 pm2 reload 平滑重载（零停机）。
# 用法:  deploy.sh <tag>
set -euo pipefail

TAG="${1:?usage: deploy.sh <tag>}"

# ---- 必填配置（来自 server.js 的环境变量 / deploy/.env）----
DEPLOY_DIR="${DEPLOY_DIR:?DEPLOY_DIR not set}"
BACKEND_APP="${BACKEND_APP:?BACKEND_APP not set}"    # pm2 进程名（后端）
FRONTEND_APP="${FRONTEND_APP:?FRONTEND_APP not set}" # pm2 进程名（前端）
DEPLOY_SVC="${DEPLOY_SVC:-pailink-deploy}"           # 部署服务自己的 pm2 进程名
DEPLOY_LOG="${DEPLOY_LOG:-$(cd "$(dirname "$0")" && pwd)/deploy.log}"

# ---- 让 node / npm / pm2 在部署服务环境里可用（宝塔多为 root pm2，PATH 一般已含；留兜底）----
if [ -n "${NODE_BIN:-}" ]; then
  export PATH="$NODE_BIN:$PATH"
else
  _nb="$(ls -d /www/server/nodejs/*/bin 2>/dev/null | sort -V | tail -1)"
  [ -n "$_nb" ] && export PATH="$_nb:$PATH"
fi
if ! command -v pm2 >/dev/null 2>&1; then
  for _d in /usr/local/bin /usr/bin /www/server/pm2/bin; do
    if [ -x "$_d/pm2" ]; then export PATH="$_d:$PATH"; break; fi
  done
fi

# ---- 全程输出追加进日志 ----
mkdir -p "$(dirname "$DEPLOY_LOG")"
exec >> "$DEPLOY_LOG" 2>&1

now() { date '+%F %T'; }
say() { echo "[$(now)] $*"; }

say "========== deploy start  tag=$TAG =========="

# ---- 并发保护：同一时间只允许一次部署 ----
exec 9>/tmp/pailink-deploy.lock
if ! flock -n 9; then
  say "!! 另一部署进行中，放弃本次"
  exit 1
fi
trap 'say "========== deploy end (rc=$?) tag=$TAG =========="' EXIT

# ---- 进入部署目录 ----
say "-- cd $DEPLOY_DIR"
cd "$DEPLOY_DIR"

# ---- 拉取 + 切到目标 tag（绝不用 git clean，避免误删 .env / uploads）----
say "-- git fetch --tags origin"
git fetch --tags origin
say "-- git checkout -f $TAG"
git checkout -f "$TAG"

# ---- 安装后端依赖（有 lockfile 用 npm ci，否则 npm install）----
say "-- backend deps"
if cd backend && npm ci; then
  :
else
  say "   npm ci 失败，退回 npm install"
  cd backend && npm install
fi
cd ..

# ---- 安装 + 构建前端（Next.js）----
say "-- frontend deps + build"
if cd frontend && npm ci; then
  :
else
  say "   npm ci 失败，退回 npm install"
  cd frontend && npm install
fi
npm run build
cd ..

# ---- 按顺序平滑重载：后端 -> 前端 -> 部署服务（最后换新 webhook 代码）----
say "-- pm2 reload $BACKEND_APP"
pm2 reload "$BACKEND_APP"
say "-- pm2 reload $FRONTEND_APP"
pm2 reload "$FRONTEND_APP"
say "-- pm2 reload $DEPLOY_SVC (best-effort)"
pm2 reload "$DEPLOY_SVC" || say "!! 无法 reload $DEPLOY_SVC（忽略）"

say "---------- deploy OK  tag=$TAG ----------"