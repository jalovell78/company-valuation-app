"use client"

import Link from "next/link"
import { signOut } from "next-auth/react"

export default function UserMenu({ user }: { user: any }) {
    if (!user) {
        return (
            <Link href="/login" className="text-sm font-semibold leading-6 text-gray-900">
                Log in <span aria-hidden="true">&rarr;</span>
            </Link>
        )
    }

    return (
        <div className="flex items-center gap-4">
            {user.image && (
                <img
                    src={user.image}
                    alt="User Avatar"
                    className="h-8 w-8 rounded-full bg-gray-50"
                />
            )}
            <div className="hidden flex-col text-right sm:flex">
                <span className="text-sm font-medium text-gray-900">{user.name}</span>
                <span className="text-xs text-gray-500">{user.email}</span>
            </div>
            <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
                Log out
            </button>
        </div>
    )
}
