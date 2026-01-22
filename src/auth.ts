import NextAuth, { type DefaultSession } from "next-auth"
import Google from "next-auth/providers/google"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { db } from "@/db"

declare module "next-auth" {
    interface Session {
        user: {
            role: string
        } & DefaultSession["user"]
    }
    interface User {
        role?: string
    }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
    adapter: DrizzleAdapter(db),
    providers: [Google],
    events: {
        async signIn({ user }) {
            // We need to import logAction dynamically or use db directly to avoid circular deps if any
            // Safer to just use db directly here
            const { db } = await import("@/db");
            const { auditLogs } = await import("@/db/schema");
            if (user.id) {
                await db.insert(auditLogs).values({
                    userId: user.id,
                    action: "LOGIN",
                    details: { method: "google" },
                });
            }
        }
    },
    callbacks: {
        async session({ session, user }) {
            // Pass the role from the database user to the session user
            if (session.user) {
                session.user.id = user.id

                // Robust Role Check:
                // If the adapter doesn't pass 'role' (sometimes happens with custom fields), fetch it.
                if (user.role) {
                    session.user.role = user.role
                } else {
                    // Fallback query
                    try {
                        const { db } = await import("@/db");
                        const { users } = await import("@/db/schema");
                        const { eq } = await import("drizzle-orm");

                        // Note: We need to use findFirst or select
                        // Using lower-level select to be safe with imports
                        const dbUser = await db.select({ role: users.role }).from(users).where(eq(users.id, user.id)).limit(1);

                        session.user.role = dbUser[0]?.role || "user";
                    } catch (e) {
                        console.error("Failed to fetch role fallback", e);
                        session.user.role = "user";
                    }
                }
            }
            return session
        }
    }
})
