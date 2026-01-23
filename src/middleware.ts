import NextAuth from "next-auth"
import authConfig from "./auth.config"

const { auth } = NextAuth(authConfig)

export default auth((req) => {
    const isLoggedIn = !!req.auth
    const isOnDashboard = req.nextUrl.pathname.startsWith('/dashboard')
    const isOnAdmin = req.nextUrl.pathname.startsWith('/admin')

    if (isOnDashboard) {
        if (isLoggedIn) return
        return Response.redirect(new URL('/login', req.nextUrl.origin))
    }

    if (isOnAdmin) {
        // We will refine this later to check for role === 'admin'
        if (isLoggedIn) return
        return Response.redirect(new URL('/login', req.nextUrl.origin))
    }
})

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
