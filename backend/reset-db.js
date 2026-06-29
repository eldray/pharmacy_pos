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

    // Terminate all connections to the database
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

        // Get database config
        const config = {
            host: process.env.DB_HOST || '127.0.0.1',
            port: parseInt(process.env.DB_PORT || '5432'),
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || 'postgres',
            database: process.env.DB_NAME || 'pharmacy_pos'
        };

        // Connect to postgres database
        const client = new Client({
            host: config.host,
            port: config.port,
            user: config.user,
            password: config.password,
            database: 'postgres'
        });

        await client.connect();
        console.log(`✅ Connected to PostgreSQL as ${config.user}`);

        // First, terminate all connections to the target database
        await terminateConnections(client, config.database);

        // Drop database if exists
        console.log(`📦 Dropping database "${config.database}"...`);
        await client.query(`DROP DATABASE IF EXISTS "${config.database}"`);
        console.log(`✅ Database "${config.database}" dropped`);

        // Create database
        console.log(`📦 Creating database "${config.database}"...`);
        await client.query(`CREATE DATABASE "${config.database}"`);
        console.log(`✅ Database "${config.database}" created`);

        await client.end();

        // Run seed
        console.log('\n🌱 Seeding database...\n');
        await seedDatabase();

        console.log('\n🎉 Database reset complete!');
        rl.close();
        process.exit(0);
    } catch (err) {
        console.error('❌ Reset failed:', err);
        rl.close();
        process.exit(1);
    }
}

main();