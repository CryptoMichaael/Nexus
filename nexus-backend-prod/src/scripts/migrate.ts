import { Pool } from 'pg'
import { envMigrate } from '../config/envMigrate'
import fs from 'fs'
import path from 'path'

function maskConnectionString(url: string): string {
  try {
    const parsed = new URL(url)
    if (parsed.password) {
      parsed.password = '****'
    }
    return parsed.toString()
  } catch {
    return url
  }
}

function printHelpForMacOS() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📋 FIX FOR MACOS (HOMEBREW)')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('1) Add PostgreSQL to your PATH:')
  console.log('   export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"')
  console.log('')
  console.log('2) Start the PostgreSQL service:')
  console.log('   brew services start postgresql@15')
  console.log('')
  console.log('3) Create the database (if not exists):')
  console.log('   createdb nexus')
  console.log('')
  console.log('Then run migrations again:')
  console.log('   npm run migrate')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
}

const pool = new Pool({ connectionString: envMigrate.DATABASE_URL })

export async function runMigrations() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `)
    const dir = path.join(__dirname, '../db/migrations')
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort()
    for (const file of files) {
      const res = await client.query('SELECT 1 FROM schema_migrations WHERE filename=$1', [file])
      if (res.rowCount === 0) {
        const sql = fs.readFileSync(path.join(dir, file), 'utf8')
        await client.query(sql)
        await client.query('INSERT INTO schema_migrations(filename) VALUES($1)', [file])
        console.log(`✅ applied ${file}`)
      }
    }
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

async function showStatus() {
  const client = await pool.connect()
  try {
    const res = await client.query('SELECT filename, applied_at from schema_migrations ORDER BY applied_at')
    console.log('Applied migrations:')
    res.rows.forEach((r: any) => {
      const date = new Date(r.applied_at).toISOString()
      console.log(`  ✓ ${r.filename} (${date})`)
    })
  } catch (err) {
    if (err instanceof Error) {
      console.error('could not fetch status:', err.message)
    } else {
      console.error('could not fetch status:', err)
    }
  } finally {
    client.release()
  }
}

if (require.main === module) {
  const cmd = process.argv[2]
  
  console.log('\n📍 Database:', maskConnectionString(envMigrate.DATABASE_URL))
  
  if (cmd === 'status') {
    showStatus()
      .then(() => process.exit(0))
      .catch(() => process.exit(1))
  } else {
    runMigrations()
      .then(() => {
        console.log('\n✨ Migrations complete!\n')
        process.exit(0)
      })
      .catch((err) => {
        const error = err as any

        if (error.code === 'ECONNREFUSED') {
          console.error('\n❌ Connection refused: PostgreSQL is not listening on localhost:5432\n')
          printHelpForMacOS()
          process.exit(1)
        }

        if (error.code === '3D000') {
          console.error('\n❌ Database "nexus" does not exist.\n')
          console.log('Create it with:')
          console.log('   createdb nexus\n')
          process.exit(1)
        }

        console.error('\n❌ Migration failed:')
        if (error instanceof Error) {
          console.error(`   ${error.message}`)
          if (error.stack) {
            console.error(error.stack)
          }
        } else {
          console.error(`   ${error}`)
        }
        console.log('')
        process.exit(1)
      })
  }
}
