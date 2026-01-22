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
        session({ session, user }) {
            // Pass the role from the database user to the session user
            if (session.user) {
                session.user.role = user.role || "user"
                session.user.id = user.id
            }
            return session
        }
    }
})
