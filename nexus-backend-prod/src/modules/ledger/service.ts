import { pool } from '../../db/pool'
import { encodeCursor, decodeCursor } from '../../utils/cursor'
export async function listLedger(cursor?: string, limit = 20, type?: string, status?: string, q?: string) {
  const params: any[] = []
  let where = ''
  if (type) { params.push(type); where += ` WHERE type = $${params.length}` }
  if (status) { params.push(status); where += `${where ? ' AND' : ' WHERE'} status = $${params.length}` }
  if (q) { params.push(`%${q}%`); where += `${where ? ' AND' : ' WHERE'} meta::text ILIKE $${params.length}` }
  const cur = decodeCursor(cursor)
  if (cur) {
    params.push(cur.created_at, cur.id)
    where += `${where ? ' AND' : ' WHERE'} (created_at < $${params.length - 1} OR (created_at = $${params.length - 1} AND id < $${params.length}))`
  }
  params.push(limit)
  const qstr = `SELECT id, user_id, type, token, amount, status, meta, created_at FROM ledger ${where} ORDER BY created_at DESC, id DESC LIMIT $${params.length}`
  const res = await pool.query(qstr, params)
  const items = res.rows
  const nextCursor = items.length ? encodeCursor({ created_at: items[items.length - 1].created_at, id: items[items.length - 1].id }) : null
  return { items, nextCursor }
}
