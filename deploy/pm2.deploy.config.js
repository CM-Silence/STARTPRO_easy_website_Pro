// Pailink 自动部署服务的 PM2 托管配置
// 启动：  cd deploy && pm2 start pm2.deploy.config.js
module.exports = {
  apps: [
    {
      name: 'pailink-deploy',
      script: './server.js',
      cwd: __dirname,
      interpreter: 'node',
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      // 输出写到部署目录，便于排障（已被 *.log 忽略）
      out_file: './deploy-service.log',
      error_file: './deploy-service-error.log',
      merge_logs: true,
    },
  ],
};