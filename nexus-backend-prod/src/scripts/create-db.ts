import { Pool } from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://localhost:5432/nexus'

async function createDatabase() {
  let parsedUrl: URL
  let dbName: string
  let adminUrl: string

  try {
    parsedUrl = new URL(DATABASE_URL)
    dbName = parsedUrl.pathname.slice(1) // Remove leading /
    if (!dbName) {
      dbName = 'nexus'
    }

    // Build admin connection string (connect to 'postgres' database instead)
    const adminUrlObj = new URL(DATABASE_URL)
    adminUrlObj.pathname = '/postgres'
    adminUrl = adminUrlObj.toString()
  } catch (err) {
    console.error('❌ Invalid DATABASE_URL format:', DATABASE_URL)
    process.exit(1)
  }

  console.log(`\n📍 Target database: ${dbName}`)
  console.log(`📍 Connecting to postgres database for setup...\n`)

  const pool = new Pool({ connectionString: adminUrl })

  try {
    const client = await pool.connect()
    console.log('✅ Connected to PostgreSQL')

    // Check if database already exists
    const res = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName])

    if (res.rowCount && res.rowCount > 0) {
      console.log(`✅ Database '${dbName}' already exists\n`)
      client.release()
      await pool.end()
      process.exit(0)
    }

    // Create the database
    console.log(`📝 Creating database '${dbName}'...`)
    await client.query(`CREATE DATABASE "${dbName}"`)
    console.log(`✅ Database '${dbName}' created successfully\n`)

    client.release()
    await pool.end()
    process.exit(0)
  } catch (err: any) {
    if (err.code === 'ECONNREFUSED') {
      console.error('❌ Connection refused: PostgreSQL is not running\n')
      console.log('Fix: brew services start postgresql@15\n')
      process.exit(1)
    }

    if (err.code === '28P01' || err.message.includes('password authentication failed')) {
      console.error('❌ Authentication failed\n')
      console.log('Hint: Check your DATABASE_URL credentials.')
      console.log('Example for local dev:')
      console.log('  DATABASE_URL=postgresql://localhost:5432/nexus\n')
      process.exit(1)
    }

    if (err.message.includes('already exists')) {
      console.log(`✅ Database '${dbName}' already exists\n`)
      process.exit(0)
    }

    console.error('❌ Error creating database:', err.message, '\n')
    process.exit(1)
  }
}

createDatabase()
