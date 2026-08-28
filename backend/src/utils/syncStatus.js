// 同步状态：计算一组中文源记录缺失或「落后于中文」的目标语言。
// 语义：某目标语言仅当「目标行存在 且 目标更新时间 >= 中文源更新时间」才算已同步；
//       否则（无翻译，或中文编辑后旧翻译未重新同步）视为未同步。
const db = require('../config/database')

// 启用且非中文的目标语言代码（非空 suffix 即其 code）
async function getTargetLangs() {
  const [rows] = await db.execute(
    "SELECT suffix AS code FROM languages WHERE is_enabled = 1 AND suffix <> ''"
  )
  return rows.map((r) => r.code)
}

/** 目标是否新鲜：目标更新时间不早于中文源更新时间。源无更新时间则已有目标即视为同步。 */
const isFresh = (targetTs, sourceTs) => {
  if (!sourceTs) return true
  if (!targetTs) return false
  return new Date(targetTs).getTime() >= new Date(sourceTs).getTime()
}

/**
 * 计算一组源(zh)记录缺失/过期的目标语言。
 * @param {{ table: 'pages'|'news'|'navigation'|'docs', by: 'source'|'slug', ids: number[] }} opts
 *   news/navigation 用 source(source_id)；pages/docs 用 slug
 * @returns {Promise<Map<string, string[]>>} id -> 缺失/过期的目标语言数组（空 = 全同步且未过期）
 */
async function computeMissing({ table, by, ids }) {
  const map = new Map()
  const clean = ids.map(Number).filter((n) => Number.isInteger(n) && n > 0)
  clean.forEach((id) => map.set(String(id), undefined))
  const targets = await getTargetLangs()
  if (!clean.length) return map
  if (!targets.length) {
    clean.forEach((id) => map.set(String(id), []))
    return map
  }

  if (by === 'source') {
    const ph = clean.map(() => '?').join(',')
    const [zhRows] = await db.execute(
      `SELECT id, updated_at FROM \`${table}\` WHERE lang = 'zh' AND id IN (${ph})`,
      clean
    )
    const srcTs = new Map(zhRows.map((r) => [String(r.id), r.updated_at]))
    const [rows] = await db.execute(
      `SELECT lang, source_id AS sid, updated_at FROM \`${table}\` WHERE source_id IN (${ph}) AND lang IN (${targets
        .map(() => '?')
        .join(',')})`,
      [...clean, ...targets]
    )
    const bySid = new Map()
    rows.forEach((r) => {
      if (!bySid.has(String(r.sid))) bySid.set(String(r.sid), new Map())
      bySid.get(String(r.sid)).set(r.lang, r.updated_at)
    })
    clean.forEach((id) => {
      const ts = srcTs.get(String(id))
      const perLang = bySid.get(String(id)) || new Map()
      map.set(String(id), targets.filter((t) => !isFresh(perLang.get(t), ts)))
    })
  } else {
    const ph = clean.map(() => '?').join(',')
    const [zhRows] = await db.execute(
      `SELECT id, slug, updated_at FROM \`${table}\` WHERE lang = 'zh' AND id IN (${ph})`,
      clean
    )
    const src = new Map() // slug -> updated_at
    const slugOfId = new Map()
    zhRows.forEach((r) => {
      src.set(r.slug, r.updated_at)
      slugOfId.set(String(r.id), r.slug)
    })
    const slugs = [...new Set(zhRows.map((r) => r.slug).filter(Boolean))]
    if (!slugs.length) {
      clean.forEach((id) => map.set(String(id), []))
      return map
    }
    const sp = slugs.map(() => '?').join(',')
    const [rows] = await db.execute(
      `SELECT lang, slug, updated_at FROM \`${table}\` WHERE lang IN (${targets
        .map(() => '?')
        .join(',')}) AND slug IN (${sp})`,
      [...targets, ...slugs]
    )
    const bySlug = new Map()
    rows.forEach((r) => {
      if (!bySlug.has(r.slug)) bySlug.set(r.slug, new Map())
      bySlug.get(r.slug).set(r.lang, r.updated_at)
    })
    clean.forEach((id) => {
      const slug = slugOfId.get(String(id))
      const perLang = slug ? bySlug.get(slug) : undefined
      map.set(
        String(id),
        slug ? targets.filter((t) => !isFresh(perLang ? perLang.get(t) : undefined, src.get(slug))) : [...targets]
      )
    })
  }
  return map
}

module.exports = { computeMissing, getTargetLangs }