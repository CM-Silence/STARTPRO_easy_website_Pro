#!/usr/bin/env bash
# Pailink 在线自动部署脚本（Gitee tag -> 拉取/构建/重载）
# 用法:  deploy.sh <tag>
# 被 deploy/server.js 在收两侧 tag webhook 后后台调用。
set -euo pipefail

TAG="${1:?usage: deploy.sh <tag>}"

# ---- 必须的配置（来自 server.js 的环境变量 / deploy/.env） ----
DEPLOY_DIR="${DEPLOY_DIR:?DEPLOY_DIR not set}"
BACKEND_APP="${BACKEND_APP:?BACKEND_APP not set}"
FRONTEND_APP="${FRONTEND_APP:?FRONTEND_APP not set}"
DEPLOY_SVC="${DEPLOY_SVC:-pailink-deploy}"   # 本部署服务自身的 PM2 进程名
DEPLOY_LOG="${DEPLOY_LOG:-$(cd "$(dirname "$0")" && pwd)/deploy.log}"

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

# ---- 拉取 + 切到目标 tag ----
# 注意：绝不使用 git clean，以免删除 .env / uploads 等未跟踪文件。
say "-- git fetch --tags origin"
git fetch --tags origin
say "-- git checkout -f $TAG"
git checkout -f "$TAG"

# ---- 安装后端依赖（lockfile 存在用 npm ci，否则 npm install） ----
say "-- backend deps"
if cd backend && npm ci; then
  :
else
  say "   npm ci 失败，退回 npm install"
  cd backend && npm install
fi
cd ..

# ---- 安装 + 构建前端（Next.js） ----
say "-- frontend deps + build"
if cd frontend && npm ci; then
  :
else
  say "   npm ci 失败，退回 npm install"
  cd frontend && npm install
fi
npm run build
cd ..

# ---- 重载前台 / 后端 / 部署服务（按顺序，部署服务放最后） ----
say "-- pm2 reload $BACKEND_APP"
pm2 reload "$BACKEND_APP"
say "-- pm2 reload $FRONTEND_APP"
pm2 reload "$FRONTEND_APP"
say "-- pm2 reload $DEPLOY_SVC (best-effort)"
pm2 reload "$DEPLOY_SVC" || say "!! 无法重载 $DEPLOY_SVC（忽略）"

say "---------- deploy OK  tag=$TAG ----------"