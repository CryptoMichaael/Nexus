import { pool } from '../../db/pool'
import { encodeCursor, decodeCursor } from '../../utils/cursor'
export async function getLevelsSummaryForUser(userId: string) {
  const res = await pool.query(
    `WITH RECURSIVE t AS (
      SELECT id, sponsor_id, 1 as level FROM users WHERE id = $1
      UNION ALL
      SELECT u.id, u.sponsor_id, t.level+1 FROM users u JOIN t ON u.sponsor_id = t.id
    )
    SELECT level, count(*) - 1 as members FROM t GROUP BY level ORDER BY level;`,
    [userId]
  )
  return res.rows
}

export async function getTeamMembers(level?: number, cursor?: string, limit = 20, query?: string) {
  const params: any[] = []
  let where = ''
  if (query) {
    params.push(`%${query}%`)
    where = `WHERE wallet_address ILIKE $${params.length}`
  }
  const cur = decodeCursor(cursor)
  if (cur) {
    params.push(cur.created_at, cur.id)
    where += `${where ? ' AND' : 'WHERE'} (created_at < $${params.length - 1} OR (created_at = $${params.length - 1} AND id < $${params.length}))`
  }
  params.push(limit)
  const q = `SELECT id, wallet_address, sponsor_id, created_at FROM users ${where} ORDER BY created_at DESC, id DESC LIMIT $${params.length}`
  const res = await pool.query(q, params)
  const items = res.rows
  const nextCursor = items.length ? encodeCursor({ created_at: items[items.length - 1].created_at, id: items[items.length - 1].id }) : null
  return { items, nextCursor }
}

export async function getChildren(parentId: string, cursor?: string, limit = 20) {
  const params: any[] = [parentId]
  let where = 'WHERE sponsor_id = $1'
  const cur = decodeCursor(cursor)
  if (cur) {
    params.push(cur.created_at, cur.id)
    where += ` AND (created_at < $${params.length - 1} OR (created_at = $${params.length - 1} AND id < $${params.length}))`
  }
  params.push(limit)
  const q = `SELECT id, wallet_address, sponsor_id, created_at FROM users ${where} ORDER BY created_at DESC, id DESC LIMIT $${params.length}`
  const res = await pool.query(q, params)
  const items = res.rows
  const nextCursor = items.length ? encodeCursor({ created_at: items[items.length - 1].created_at, id: items[items.length - 1].id }) : null
  return { items, nextCursor }
}
