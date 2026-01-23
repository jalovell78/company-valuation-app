import NextAuth, { type DefaultSession } from "next-auth"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { db } from "@/db"
import authConfig from "./auth.config"

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
    ...authConfig,
    adapter: DrizzleAdapter(db),
    session: { strategy: "jwt" }, // Force JWT to allow middleware to work smoothly
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
        async jwt({ token, user, trigger, session }) {
            // Initial sign in
            if (user) {
                token.id = user.id

                // FORCE fetch role from DB to ensure we get the latest 'admin' status
                // ignoring potentially stale 'user.role' from the adapter
                try {
                    const { db } = await import("@/db");
                    const { users } = await import("@/db/schema");
                    const { eq } = await import("drizzle-orm");
                    const dbUser = await db.select({ role: users.role }).from(users).where(eq(users.id, user.id!)).limit(1);
                    token.role = dbUser[0]?.role || "user";
                } catch (e) {
                    console.error("Auth Role Fetch Error:", e);
                    token.role = "user";
                }
            }
            return token
        },
        async session({ session, token }) {
            // Pass the role and id from the token to the session user
            if (session.user && token) {
                session.user.id = token.id as string
                session.user.role = (token.role as string) || "user"
            }
            return session
        }
    }
})
