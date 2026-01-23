import type { NextAuthConfig } from "next-auth"
import Google from "next-auth/providers/google"
import LinkedIn from "next-auth/providers/linkedin"

export default {
    providers: [Google, LinkedIn],
} satisfies NextAuthConfig
