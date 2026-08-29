#!/usr/bin/env node
/**
 * 前端（Next.js 生产）启动文件
 *
 * 用途：宝塔 PM2 / Node 管理器"添加项目"需要一个【启动文件】，
 *      而 Next.js 没有单一 .js 入口（它的运行方式是 `next start`）。
 *      本文件就是在 start.js 里调起 Next 的服务端，等价于：
 *          next start -p 3001
 *
 * 依赖：须先 `npm run build` 生成 .next 产物，否则 next start 会报缺失构建。
 * 运行：node start.js   （在 frontend/ 目录下执行；端口可用环境变量 PORT 覆盖）
 */
const { spawn } = require('child_process');

const PORT = process.env.PORT || '3001';

// 定位 Next.js CLI 的真实 JS 入口（跨 npm 安装方式都能解析，不依赖 npx）
let nextBin;
try {
  nextBin = require.resolve('next/dist/bin/next');
} catch (e) {
  console.error('[start.js] 找不到 next 命令行入口，请确认已执行 npm install');
  process.exit(1);
}

const child = spawn(process.execPath, [nextBin, 'start', '-p', PORT], {
  stdio: 'inherit',
});

// 把终止信号转发给 next 子进程，避免 pm2/管理器重启时残留孤儿进程占用 3001
['SIGINT', 'SIGTERM', 'SIGHUP'].forEach((sig) => {
  process.on(sig, () => {
    if (!child.killed) child.kill(sig);
  });
});

child.on('exit', (code) => process.exit(code === null ? 0 : code));
child.on('error', (err) => {
  console.error('[start.js] 启动失败:', err.message);
  process.exit(1);
});