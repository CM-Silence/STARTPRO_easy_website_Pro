const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

/**
 * 轻量数据库迁移器：后端启动时调用，按版本应用 backend/src/migrations/*.sql
 * - 依赖连接池 multipleStatements 支持单文件多语句（用 db.query，而非 prepared 的 db.execute）
 * - 已应用的版本记录在 schema_migrations 表，每个版本只执行一次
 * - 迁移文件命名规范：<序号>_<描述>.sql（如 001_docs_content_format_pdf.sql），按序号升序应用
 */
module.exports = async function runMigrations(db) {
  // 确保记账表存在
  await db.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    version VARCHAR(255) NOT NULL,
    checksum VARCHAR(64) DEFAULT NULL,
    applied_at DATETIME NOT NULL,
    UNIQUE KEY uq_schema_migrations_version (version)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`)

  const dir = __dirname
  const files = fs
    .readdirSync(dir)
    .filter((f) => /^\d+_.+\.sql$/.test(f))
    .sort()

  if (!files.length) return 0

  const [rows] = await db.query('SELECT version, checksum FROM schema_migrations')
  const applied = new Set(rows.map((r) => r.version))
  const checksums = new Map(rows.map((r) => [r.version, r.checksum]))

  let appliedCount = 0
  for (const file of files) {
    const version = file.replace(/\.sql$/, '')
    const sql = fs.readFileSync(path.join(dir, file), 'utf8').trim()
    if (!sql) continue
    const checksum = crypto.createHash('sha256').update(sql).digest('hex')

    if (applied.has(version)) {
      // 已应用但内容被改动 —— 发出告警，不阻塞（便于发现意外修改）
      if (checksums.get(version) && checksums.get(version) !== checksum) {
        console.warn(`[MIGRATE] ⚠ ${version} 已应用但 checksum 不匹配，请注意核对迁移内容是否被改动`)
      }
      continue
    }

    console.log(`[MIGRATE] Applying ${version}`)
    await db.query(sql)
    await db.execute(
      'INSERT INTO schema_migrations (version, checksum, applied_at) VALUES (?, ?, NOW())',
      [version, checksum]
    )
    applied.add(version)
    appliedCount += 1
  }

  if (appliedCount > 0) {
    console.log(`[MIGRATE] ✅ 已应用 ${appliedCount} 个迁移`)
  }
  return appliedCount
}