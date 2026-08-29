#!/usr/bin/env bash
# Pailink 在线自动部署脚本（Gitee tag -> 拉取/构建/重载）
# 依宝塔「Node 项目」环境：前台/后台/部署服务都用 systemctl 重启，不依赖 pm2。
# 用法:  deploy.sh <tag>
set -euo pipefail

TAG="${1:?usage: deploy.sh <tag>}"

# ---- 必填配置（来自 server.js 的环境变量 / deploy/.env）----
DEPLOY_DIR="${DEPLOY_DIR:?DEPLOY_DIR not set}"
BACKEND_APP="${BACKEND_APP:?BACKEND_APP not set}"    # 宝塔 systemd 单元名（后端）
FRONTEND_APP="${FRONTEND_APP:?FRONTEND_APP not set}" # 宝塔 systemd 单元名（前端）
DEPLOY_SVC="${DEPLOY_SVC:-pailink-deploy}"           # 部署服务自己的 systemd 单元名
DEPLOY_LOG="${DEPLOY_LOG:-$(cd "$(dirname "$0")" && pwd)/deploy.log}"

# ---- 找到宝塔的 node / npm ----
# 宝塔的 node 默认不在系统 PATH（尤其 systemctl 环境下）；可显式用 NODE_BIN，
# 否则自动探测 /www/server/nodejs 下最新的一个版本。
if [ -n "${NODE_BIN:-}" ]; then
  export PATH="$NODE_BIN:$PATH"
else
  _nb="$(ls -d /www/server/nodejs/*/bin 2>/dev/null | sort -V | tail -1)"
  [ -n "$_nb" ] && export PATH="$_nb:$PATH"
fi

# ---- 全程输出追加进日志 ----
mkdir -p "$(dirname "$DEPLOY_LOG")"
exec >> "$DEPLOY_LOG" 2>&1

now() { date '+%F %T'; }
say() { echo "[$(now)] $*"; }

say "========== deploy start  tag=$TAG =========="

# 非 root 时 systemctl 重启需要 sudo
if [ "$(id -u)" -eq 0 ]; then
  SCTL="systemctl"
else
  SCTL="sudo systemctl"
fi

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

# ---- 依宝塔 Node 项目方式重启：后端 -> 前端 -> 部署服务（最后换新 webhook 代码）----
say "-- [$SCTL] restart $BACKEND_APP"
$SCTL restart "$BACKEND_APP"
say "-- [$SCTL] restart $FRONTEND_APP"
$SCTL restart "$FRONTEND_APP"
say "-- [$SCTL] restart $DEPLOY_SVC (best-effort)"
$SCTL restart "$DEPLOY_SVC" || say "!! 无法重启 $DEPLOY_SVC（忽略）"

say "---------- deploy OK  tag=$TAG ----------"