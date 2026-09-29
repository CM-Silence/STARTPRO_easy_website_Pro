const mysql = require('mysql2/promise')

// 连接池基于环境变量，.env 已在 server.js 顶部加载
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'tech_website',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  // 供迁移文件(backend/src/migrations/*.sql)用 db.query 执行多语句；
  // 应用代码现有查询均为单语句 prepared（db.execute），不受影响
  multipleStatements: true
})

module.exports = pool
