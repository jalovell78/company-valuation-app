
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

const targetEmail = process.argv[2];

if (!targetEmail) {
    console.error("❌ Please provide an email address as an argument.");
    process.exit(1);
}

async function makeAdmin() {
    console.log(`🔍 Promoting user ${targetEmail} to ADMIN...`);

    const result = await db.update(users)
        .set({ role: 'admin' })
        .where(eq(users.email, targetEmail))
        .returning({ updatedId: users.id, newRole: users.role });

    if (result.length === 0) {
        console.log(`❌ User with email ${targetEmail} not found.`);
    } else {
        console.log(`✅ Success! User ${targetEmail} is now an ADMIN.`);
        console.log(result[0]);
    }
    process.exit(0);
}

makeAdmin().catch(console.error);
