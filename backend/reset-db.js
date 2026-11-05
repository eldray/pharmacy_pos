// backend/reset-complete.js
const { sequelize } = require('./config/database');
const { Client } = require('pg');
const seedDatabase = require('./seed');
const readline = require('readline');
require('dotenv').config();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function resetDatabase() {
    console.log('⚠️  WARNING: This will completely reset the database!');
    console.log('   All data will be lost!\n');

    return new Promise((resolve) => {
        rl.question('Are you sure you want to continue? (yes/no): ', async (answer) => {
            if (answer.toLowerCase() !== 'yes') {
                console.log('❌ Reset cancelled.');
                rl.close();
                process.exit(0);
            }
            resolve();
        });
    });
}

async function terminateConnections(client, databaseName) {
    console.log(`🔌 Terminating all connections to "${databaseName}"...`);
    await client.query(`
    SELECT pg_terminate_backend(pg_stat_activity.pid)
    FROM pg_stat_activity
    WHERE pg_stat_activity.datname = $1
    AND pid <> pg_backend_pid()
  `, [databaseName]);
    console.log(`✅ All connections terminated`);
}

async function main() {
    try {
        await resetDatabase();

        console.log('\n🔄 Starting database reset...\n');

        const config = {
            host: process.env.DB_HOST || '127.0.0.1',
            port: parseInt(process.env.DB_PORT || '5432'),
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || 'postgres',
            database: process.env.DB_NAME || 'pharmacy_pos'
        };

        // Step 1: Drop/recreate via the `postgres` admin DB
        const client = new Client({
            host: config.host,
            port: config.port,
            user: config.user,
            password: config.password,
            database: 'postgres'
        });

        await client.connect();
        console.log(`✅ Connected to PostgreSQL as ${config.user}`);

        await terminateConnections(client, config.database);

        console.log(`📦 Dropping database "${config.database}"...`);
        await client.query(`DROP DATABASE IF EXISTS "${config.database}"`);
        console.log(`✅ Database "${config.database}" dropped`);

        console.log(`📦 Creating database "${config.database}"...`);
        await client.query(`CREATE DATABASE "${config.database}"`);
        console.log(`✅ Database "${config.database}" created`);

        await client.end();

        // Step 2: reconnect the shared Sequelize singleton to the new DB
        //         (authenticate() forces a fresh pool, avoiding stale OIDs)
        await sequelize.authenticate();
        console.log(`✅ Sequelize reconnected to "${config.database}"\n`);

        // Step 3: run migrations to create the schema
        console.log('📦 Running database migrations...');
        const { migrate } = require('./migrate');
        const result = await migrate('up');
        console.log(
            result.applied > 0
                ? `✅ Applied ${result.applied} migration(s)\n`
                : '✅ Database schema is up to date\n'
        );

        // Step 4: seed data
        console.log('🌱 Seeding database...\n');
        await seedDatabase();

        console.log('\n🎉 Database reset complete!');
        rl.close();
        await sequelize.close();
        process.exit(0);
    } catch (err) {
        console.error('❌ Reset failed:', err);
        rl.close();
        process.exit(1);
    }
}

main();