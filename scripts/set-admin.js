const { sql } = require('@vercel/postgres');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function setAdmin() {
    // Get email from command line argument
    const email = process.argv[2];

    if (!email) {
        console.error('❌ Error: Please provide an email address.');
        console.log('Usage: node scripts/set-admin.js <email>');
        process.exit(1);
    }

    try {
        console.log(`🔍 Searching for user with email: ${email}...`);

        // 1. Check if user exists
        const check = await sql`SELECT * FROM "user" WHERE email = ${email}`;

        if (check.rows.length === 0) {
            console.error(`❌ User not found! Have they logged in yet?`);
            process.exit(1);
        }

        const user = check.rows[0];
        console.log(`✅ User found: ${user.name} (Current Role: ${user.role})`);

        // 2. Update role
        await sql`UPDATE "user" SET role = 'admin' WHERE email = ${email}`;

        console.log(`🎉 Success! Updated role to 'admin' for ${email}`);
        console.log(`👉 They may need to log out and log back in for changes to take effect.`);

    } catch (error) {
        console.error('❌ Database Error:', error);
    }
}

setAdmin();
