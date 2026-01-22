import Link from 'next/link'
import UserMenu from './UserMenu'

export default function Header({ user }: { user: any }) {
    return (
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-100">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                <div className="flex items-center gap-8">
                    <Link href="/" className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                        Company Valuation
                    </Link>
                    <nav className="hidden md:flex gap-6">
                        {user && (
                            <Link href="/dashboard" className="text-sm font-semibold text-gray-700 hover:text-blue-600 transition-colors">Dashboard</Link>
                        )}
                        {user?.role === 'admin' && (
                            <Link href="/admin" className="text-sm font-semibold text-gray-700 hover:text-blue-600 transition-colors">Admin</Link>
                        )}
                    </nav>
                </div>
                <UserMenu user={user} />
            </div>
        </header>
    )
}
