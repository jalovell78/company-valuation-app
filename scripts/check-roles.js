const { sql } = require('@vercel/postgres');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkRoles() {
    try {
        const { rows } = await sql`SELECT name, email, role FROM "user"`; // Note: "user" in quotes because it's a reserved keyword in PG

        console.log('--- User Roles ---');
        if (rows.length === 0) {
            console.log('No users found in database.');
        } else {
            rows.forEach(user => {
                console.log(`Name: ${user.name} | Email: ${user.email} | Role: '${user.role}'`);
            });
        }
        console.log('------------------');
    } catch (error) {
        console.error('Error querying database:', error);
    }
}

checkRoles();
