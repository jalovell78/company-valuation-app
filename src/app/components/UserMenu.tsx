"use client"

import Link from "next/link"
import { signOut } from "next-auth/react"
import { useState, useRef, useEffect } from "react"

export default function UserMenu({ user }: { user: any }) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (!user) {
        return (
            <Link href="/login" className="text-sm font-semibold leading-6 text-gray-900">
                Log in <span aria-hidden="true">&rarr;</span>
            </Link>
        )
    }

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 focus:outline-none"
            >
                <div className="hidden flex-col text-right sm:flex">
                    <span className="text-sm font-medium text-gray-900">{user.name}</span>
                </div>
                {user.image ? (
                    <img
                        src={user.image}
                        alt="User Avatar"
                        className="h-9 w-9 rounded-full bg-gray-50 border border-gray-200"
                    />
                ) : (
                    <div className="h-9 w-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold border border-blue-700">
                        {user.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                )}
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none animate-in fade-in zoom-in-95 duration-100">
                    <div className="py-1">
                        {/* Mobile User Info */}
                        <div className="px-4 py-3 border-b border-gray-100 sm:hidden">
                            <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                            <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        </div>

                        <div className="py-1">
                            <Link
                                href="/dashboard"
                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600"
                                onClick={() => setIsOpen(false)}
                            >
                                Dashboard
                            </Link>

                            {user.role === 'admin' && (
                                <Link
                                    href="/admin"
                                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600"
                                    onClick={() => setIsOpen(false)}
                                >
                                    Admin Panel
                                </Link>
                            )}
                        </div>

                        <div className="border-t border-gray-100 py-1">
                            <button
                                onClick={() => signOut({ callbackUrl: "/" })}
                                className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                            >
                                Log out
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
