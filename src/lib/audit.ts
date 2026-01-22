import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { auth } from "@/auth";

export async function logAction(action: string, details: object) {
    try {
        const session = await auth();
        if (!session?.user?.id) return; // Only log logged-in users

        await db.insert(auditLogs).values({
            userId: session.user.id,
            action,
            details,
        });
    } catch (error) {
        console.error("Failed to log action:", error);
        // We catch errors silently so logging failures don't break the main app flow
    }
}
