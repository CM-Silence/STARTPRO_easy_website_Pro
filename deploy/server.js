/**
 * Pailink 官方网站在线自动部署服务
 *
 * 作用：单独监听一个端口，接收来自 Gitee 的 Webhook push 事件；
 * 当推入的是「tag」（refs/tags/...）时，后台触发 deploy.sh 完成
 * 拉取 + 构建 + PM2 重载，实现"打 tag 即自动发布"。
 *
 * 独立于前端/后端 App 运行（由 PM2 以 pailink-deploy 托管），
 * 这样无论重启前后台都不影响它，它只负责"收 webhook -> 跑脚本"。
 *
 * 配置：deploy/.env（gitignore，见 deploy.env.example）
 */
const crypto = require('crypto');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// 加载 deploy/.env（process.cwd() 即 deploy 目录）
require('dotenv').config();

const express = require('express');

const PORT = parseInt(process.env.PORT || '3005', 10);
const GITEE_TOKEN = (process.env.GITEE_TOKEN || '').trim();
const ALLOWED_IPS = (process.env.ALLOWED_IPS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const DEPLOY_LOG =
  (process.env.DEPLOY_LOG || '').trim() ||
  path.join(__dirname, 'deploy.log');

// ---------------- 工具 ----------------
function log(line) {
  const msg = `[${new Date().toISOString()}] ${line}`;
  // 双保险：控制台 + 落盘
  try {
    console.log(msg);
    fs.appendFileSync(DEPLOY_LOG, msg + '\n');
  } catch (e) {
    console.error('write log failed:', e.message);
  }
}

function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

function ipAllowed(req) {
  if (ALLOWED_IPS.length === 0) return true;
  return ALLOWED_IPS.includes(req.ip);
}

function tokenOk(req, body) {
  // 未配置 token 视为不校验（生产务必配置）
  if (!GITEE_TOKEN) return true;
  // Gitee 可能在请求头或 payload 中携带令牌，多位置兼容
  const candidate =
    req.get('X-Gitee-Token') || body.password || body.token || '';
  return safeEqual(candidate, GITEE_TOKEN);
}

// 仅在部署脚本之后才需要这些（部署脚本从 env 读），此处取值用于日志
function configSummary() {
  return {
    PORT,
    DEPLOY_DIR: process.env.DEPLOY_DIR || '(not set!)',
    BACKEND_APP: process.env.BACKEND_APP || '(not set!)',
    FRONTEND_APP: process.env.FRONTEND_APP || '(not set!)',
    GITEE_TOKEN_SET: !!GITEE_TOKEN,
    ALLOWED_IPS,
    DEPLOY_LOG,
  };
}

// ---------------- webhook ----------------
const app = express();
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => res.json({ ok: true, deploy: configSummary() }));

app.post('/webhook/gitee', (req, res) => {
  const body = req.body || {};

  if (!ipAllowed(req)) {
    log(`[reject] ip not allowed: ${req.ip}`);
    return res.status(403).json({ ok: false, error: 'forbidden' });
  }
  if (!tokenOk(req, body)) {
    log(`[reject] bad token from ${req.ip}`);
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }

  const ref = body.ref || '';
  if (!ref.startsWith('refs/tags/')) {
    log(`[ignore] not a tag push, ref=${ref}`);
    return res.json({ ok: true, deployed: false, reason: 'not-a-tag-push' });
  }

  const tag = ref.replace(/^refs\/tags\//, '');
  log(`[trigger] tag push: ${tag}`);

  // 后台运行部署脚本，立即返回 202，不阻塞 webhook 回调
  const child = spawn('bash', [path.join(__dirname, 'deploy.sh'), tag], {
    cwd: __dirname,
    env: { ...process.env, TAG: tag },
    detached: true,
    stdio: 'ignore',
  });
  child.unref();

  return res.status(202).json({ ok: true, deployed: true, tag });
});

app.listen(PORT, () => {
  log(`pailink-deploy listening on :${PORT}`);
  log(`config: ${JSON.stringify(configSummary())}`);
});