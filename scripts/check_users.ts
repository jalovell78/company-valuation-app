
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { db } from "@/db";
import { users } from "@/db/schema";
import { desc } from "drizzle-orm";

async function checkUsers() {
    console.log("🔍 Checking Users in Database...");

    // Explicitly select all columns to be sure
    const allUsers = await db.select().from(users).orderBy(desc(users.emailVerified));

    if (allUsers.length === 0) {
        console.log("❌ No users found!");
    } else {
        console.table(allUsers.map(u => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role
        })));
    }
    process.exit(0);
}

checkUsers().catch(console.error);
