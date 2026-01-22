'use server';

import { logAction } from "@/lib/audit";

export async function logOfficerAppointView(officerId: string, officerName: string) {
    await logAction("VIEW_OFFICER", { officerId, officerName });
}
