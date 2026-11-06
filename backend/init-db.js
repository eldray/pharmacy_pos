// backend/init-db.js
require('dotenv').config();
const { Client } = require('pg');
const { sequelize } = require('./config/database');

// Function to create database if it doesn't exist
async function createDatabaseIfNotExists() {
    const config = {
        host: process.env.DB_HOST || '127.0.0.1',
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'pharmacy_pos'
    };

    // Connect to default 'postgres' database first
    const client = new Client({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        database: 'postgres'
    });

    try {
        await client.connect();
        console.log(`✅ Connected to PostgreSQL as ${config.user}`);

        // Check if database exists
        const result = await client.query(
            'SELECT 1 FROM pg_database WHERE datname = $1',
            [config.database]
        );

        if (result.rows.length === 0) {
            console.log(`📦 Creating database "${config.database}"...`);
            await client.query(`CREATE DATABASE "${config.database}"`);
            console.log(`✅ Database "${config.database}" created successfully`);
        } else {
            console.log(`✅ Database "${config.database}" already exists`);
        }

        await client.end();
        return true;
    } catch (error) {
        console.error('❌ Error creating database:', error.message);
        throw error;
    }
}

// Main function to initialize everything
async function initDatabase() {
    try {
        console.log('🚀 Starting database initialization...\n');

        // Step 1: Create database if it doesn't exist
        await createDatabaseIfNotExists();
        console.log('');

        // Step 2: Connect to the database
        await sequelize.authenticate();
        console.log('✅ Connected to database successfully');

        // Step 3: Migrations own the schema.
        //
        // This used to be `sequelize.sync({ alter: true })`, which rewrote live tables
        // on every run — adding missing columns, changing types and dropping anything no
        // model declared, while holding an ACCESS EXCLUSIVE lock on a table the till may
        // be selling out of. Nothing here may alter data silently, so drift is reported
        // and the operator has to write a migration for it.
        const { migrate } = require('./migrate');
        const migrationResult = await migrate('up');
        console.log(migrationResult.applied > 0
            ? `✅ Applied ${migrationResult.applied} migration(s)`
            : '✅ Database schema is up to date');

        const { reportSchemaDrift } = require('./utils/checkSchema');
        const drift = await reportSchemaDrift();
        if (drift.missing.length || drift.missingTables.length) {
            throw new Error('Schema does not match the models — add a migration for the columns listed above.');
        }

        // Optional: Show all tables that were created
        const tables = await sequelize.query(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
        );
        console.log('\n📊 Tables in database:');
        tables[0].forEach(table => {
            console.log(`   - ${table.table_name}`);
        });

        console.log('\n🎉 Database initialization complete!');
        console.log('💡 You can now run your application.');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Database initialization failed:', error.message);
        console.error('\n💡 Troubleshooting tips:');
        console.error('1. Make sure PostgreSQL is running');
        console.error('2. Check your .env file credentials');
        console.error('3. Verify PostgreSQL host and port');
        console.error('4. Check if PostgreSQL is accessible');
        process.exit(1);
    }
}

// Run the initialization
initDatabase();