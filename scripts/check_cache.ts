
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { db } from "@/db";
import { valuations } from "@/db/schema";
import { desc } from "drizzle-orm";

async function checkCache() {
    console.log("🔍 Checking Valuations Cache...");

    const latest = await db
        .select()
        .from(valuations)
        .orderBy(desc(valuations.createdAt))
        .limit(1);

    if (latest.length === 0) {
        console.log("❌ No cached valuations found.");
    } else {
        const entry = latest[0];
        const data = entry.data as any; // Cast to access JSON fields

        console.log("\n✅ Latest Cache Entry Found:");
        console.log("--------------------------------");
        console.log(`🏢 Company Number: ${entry.companyNumber}`);
        console.log(`📅 Accounts Date:  ${entry.accountingPeriodEnd}`);
        console.log(`🕒 Cached At:      ${entry.createdAt}`);
        console.log("--------------------------------");
        console.log("📊 Cached Data Snippet:");
        console.log(`   - Valuation:    £${data.valuationEstimate?.toLocaleString()}`);
        console.log(`   - Sector:       ${data.sector}`);
        console.log(`   - Summary:      "${data.executiveSummary?.substring(0, 100)}..."`);
    }
    process.exit(0);
}

checkCache().catch(console.error);
