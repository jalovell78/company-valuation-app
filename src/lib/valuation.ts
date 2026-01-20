
import { CompanyProfile, FilingHistoryItem } from './api';

export interface AccountsMetadata {
    lastAccountsDate: string;
    accountsType: string;
    sourceLink?: string;
}

export function extractAccountsMetadata(
    profile: CompanyProfile,
    filingHistory: FilingHistoryItem[]
): AccountsMetadata {
    // 1. Identify "Last Published Accounts"
    const accountsFilings = filingHistory.filter(f =>
        f.category === 'accounts' && (f.type === 'AA' || f.description.toLowerCase().includes('account'))
    );

    const latestAccounts = accountsFilings[0];
    const lastMadeUpTo = profile.accounts?.last_accounts?.made_up_to || latestAccounts?.date || 'Unknown';
    const accountsType = profile.accounts?.last_accounts?.type || latestAccounts?.description || 'Unknown';

    // Construct Link to Web Viewer
    const sourceLink = `https://find-and-update.company-information.service.gov.uk/company/${profile.company_number}/filing-history`;

    return {
        lastAccountsDate: lastMadeUpTo,
        accountsType: accountsType,
        sourceLink: sourceLink,
    };
}
