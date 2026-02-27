export function encodeCursor(obj: { created_at: string; id: string }): string {
  return Buffer.from(JSON.stringify(obj)).toString('base64')
}
export function decodeCursor(cursor?: string): { created_at: string; id: string } | null {
  if (!cursor) return null
  try {
    return JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'))
  } catch {
    return null
  }
}
