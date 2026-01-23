import { auth } from "@/auth";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function MemberDashboard() {
    const session = await auth();

    if (!session?.user) {
        redirect("/login");
    }

    // Fetch only THIS user's logs
    const userLogs = await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.userId, session.user.id!))
        .orderBy(desc(auditLogs.createdAt))
        .limit(20);

    return (
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="md:flex md:items-center md:justify-between">
                <div className="min-w-0 flex-1">
                    <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
                        Member Dashboard
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                        Welcome back, {session.user.name}.
                    </p>
                </div>
                <div className="mt-4 flex md:ml-4 md:mt-0">
                    <Link
                        href="/"
                        className="ml-3 inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                    >
                        Start New Valuation
                    </Link>
                </div>
            </div>

            <div className="mt-8">
                <h3 className="text-base font-semibold leading-6 text-gray-900">Your Recent Activity</h3>
                <div className="mt-4 flow-root">
                    <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                        <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                                <table className="min-w-full divide-y divide-gray-300">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                                                Activity
                                            </th>
                                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                                Details
                                            </th>
                                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                                Date
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 bg-white">
                                        {userLogs.length === 0 ? (
                                            <tr>
                                                <td colSpan={3} className="py-4 text-center text-sm text-gray-500">
                                                    No activity yet. Go search for a company!
                                                </td>
                                            </tr>
                                        ) : (
                                            userLogs.map((log) => {
                                                const d = log.details as any;
                                                let detailsContent: React.ReactNode = JSON.stringify(d);

                                                // Log Formatting Logic (Matches Admin Dashboard)
                                                if (log.action === 'LOGIN') {
                                                    detailsContent = (
                                                        <span className="font-mono text-gray-600">
                                                            via {d?.method === 'google' ? 'Google' : d?.method || 'Email'}
                                                        </span>
                                                    );
                                                } else if (log.action === 'VALUATION_GENERATED') {
                                                    detailsContent = (
                                                        <Link href={`/company/${d?.companyNumber}`} className="text-blue-600 hover:underline">
                                                            Generated Report for {d?.companyStatus || 'Active'} Company ({d?.companyNumber})
                                                            {d?.valuation && ` ~£${(Number(d.valuation) / 1000000).toFixed(2)}m`}
                                                        </Link>
                                                    );
                                                } else if (log.action === 'VIEW_COMPANY') {
                                                    detailsContent = (
                                                        <Link href={`/company/${d?.companyNumber}`} className="text-blue-600 hover:underline flex items-center gap-1">
                                                            <span>Viewed:</span>
                                                            <span className="font-medium">{d?.companyName || d?.companyNumber}</span>
                                                        </Link>
                                                    );
                                                } else if (log.action === 'VIEW_OFFICER') {
                                                    detailsContent = (
                                                        <Link href={`/officer/${d?.officerId}`} className="text-purple-600 hover:underline flex items-center gap-1">
                                                            <span>Viewed Officer:</span>
                                                            <span className="font-medium">{d?.officerName || d?.officerId}</span>
                                                        </Link>
                                                    );
                                                }

                                                return (
                                                    <tr key={log.id}>
                                                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                                                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${log.action === 'LOGIN' ? 'bg-green-50 text-green-700 ring-green-600/20' :
                                                                log.action === 'VALUATION_GENERATED' ? 'bg-indigo-50 text-indigo-700 ring-indigo-600/20' :
                                                                    log.action === 'VIEW_COMPANY' ? 'bg-blue-50 text-blue-700 ring-blue-600/20' :
                                                                        'bg-gray-50 text-gray-700 ring-gray-500/10'
                                                                }`}>
                                                                {log.action === 'VALUATION_GENERATED' ? 'Valuation Report' :
                                                                    log.action === 'VIEW_COMPANY' ? 'Company View' :
                                                                        log.action === 'VIEW_OFFICER' ? 'Officer View' :
                                                                            log.action === 'LOGIN' ? 'Login' : log.action}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-4 text-sm text-gray-500 truncate max-w-md">
                                                            {detailsContent}
                                                        </td>
                                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500" suppressHydrationWarning>
                                                            {log.createdAt ? new Date(log.createdAt).toLocaleString() : ''}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
