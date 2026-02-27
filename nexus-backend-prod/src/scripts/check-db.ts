import { Pool } from 'pg'
import { envMigrate } from '../config/envMigrate'

/**
 * Diagnostic helper: Verifies PostgreSQL connectivity and database existence.
 * Provides actionable error messages for common local dev issues.
 */

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
  console.log('3) Create the database:')
  console.log('   createdb nexus')
  console.log('')
  console.log('Then run:')
  console.log('   npm run check:db  (to verify connection)')
  console.log('   npm run migrate   (to apply migrations)')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
}

async function checkDatabase() {
  console.log('\n🔍 Checking PostgreSQL connection...\n')
  console.log(`📍 DATABASE_URL: ${maskConnectionString(envMigrate.DATABASE_URL)}`)

  const pool = new Pool({ connectionString: envMigrate.DATABASE_URL })

  try {
    const client = await pool.connect()
    console.log('✅ Connected to PostgreSQL successfully!')

    // Check if migrations table exists
    const tableRes = await client.query(
      `SELECT EXISTS(
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'schema_migrations'
      ) as exists;`
    )
    const migrationsTableExists = tableRes.rows[0].exists

    if (migrationsTableExists) {
      const migrRes = await client.query(
        'SELECT COUNT(*) as count FROM schema_migrations'
      )
      console.log(
        `✅ Migrations table exists with ${migrRes.rows[0].count} applied migrations`
      )
    } else {
      console.log('⚠️  Migrations table does not exist yet (will be created on migration)')
    }

    client.release()
    console.log(
      '\n✨ All checks passed! Ready to run migrations.\n'
    )
    return 0
  } catch (err: unknown) {
    const error = err as any

    if (error.code === 'ECONNREFUSED') {
      console.error(
        '❌ Connection refused: PostgreSQL is not listening on localhost:5432'
      )
      printHelpForMacOS()
      return 1
    }

    if (error.code === '3D000') {
      console.error('❌ Database "nexus" does not exist.')
      console.log('\nRun this command to create it:')
      console.log('   npm run create:db\n')
      return 1
    }

    console.error('❌ Database check failed:')
    if (error instanceof Error) {
      console.error(`   Error: ${error.message}`)
    } else {
      console.error(`   Error: ${error}`)
    }
    console.log('')
    return 1
  } finally {
    await pool.end()
  }
}

// Run if invoked directly
if (require.main === module) {
  checkDatabase()
    .then((code) => process.exit(code))
    .catch((err) => {
      console.error('Unexpected error:', err)
      process.exit(1)
    })
}
