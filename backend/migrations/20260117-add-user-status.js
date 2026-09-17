// backend/migrations/20260117-add-user-status.js
'use strict';

module.exports = {
    up: async (queryInterface) => {
        // Add status column if it doesn't exist
        const [cols] = await queryInterface.sequelize.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'status'
    `);
        if (cols.length === 0) {
            await queryInterface.sequelize.query(`
        ALTER TABLE "users"
        ADD COLUMN "status" VARCHAR(20) NOT NULL DEFAULT 'active'
      `);
            await queryInterface.sequelize.query(`
        ALTER TABLE "users"
        ADD CONSTRAINT "users_status_check"
        CHECK ("status" IN ('active', 'blocked'))
      `);
            console.log('   ↳ Added users.status column');
        } else {
            console.log('   ↳ users.status already exists');
        }

        // Add timestamps if missing
        const [tsCols] = await queryInterface.sequelize.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'users' AND column_name IN ('createdAt', 'updatedAt')
    `);
        if (tsCols.length < 2) {
            await queryInterface.sequelize.query(`
        ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      `);
            console.log('   ↳ Added users timestamps');
        }
    },

    down: async (queryInterface) => {
        await queryInterface.sequelize.query(`
      ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_status_check"
    `);
        await queryInterface.sequelize.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "status"
    `);
    },
};