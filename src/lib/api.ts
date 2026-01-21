
const API_KEY = process.env.COMPANIES_HOUSE_API_KEY;
const BASE_URL = 'https://api.company-information.service.gov.uk';

if (!API_KEY) {
  console.error("COMPANIES_HOUSE_API_KEY is not set in environment variables.");
} else {
  console.log("API_KEY loaded:", API_KEY.substring(0, 4) + "...");
}

// Helper to handle Basic Auth
const getHeaders = () => {
  const encodedKey = btoa(`${API_KEY}:`);
  return {
    'Authorization': `Basic ${encodedKey}`,
    'Content-Type': 'application/json',
  };
};

export interface CompanySearchResult {
  title: string; // API returns 'title' for search results, not 'company_name'
  company_number: string;
  company_status: string;
  date_of_creation: string;
  address: {
    locality: string;
    postal_code: string;
    address_line_1: string;
    premises?: string;
  };
  kind: string;
}

export interface CompanySearchResponse {
  items: CompanySearchResult[];
  total_results: number;
}

export interface CompanyProfile {
  company_name: string;
  company_number: string;
  date_of_creation: string;
  date_of_cessation?: string;
  registered_office_address: {
    address_line_1: string;
    postal_code: string;
    locality: string;
  };
  company_status: string;
  type: string;
  accounts: {
    last_accounts: {
      made_up_to: string;
      type: string;
    }
  };
  sic_codes: string[];
}

export interface Officer {
  name: string;
  officer_role: string;
  appointed_on: string;
  resigned_on?: string;
  links?: {
    officer?: {
      appointments: string;
    };
  };
}

export interface OfficerListResponse {
  items: Officer[];
  active_count: number;
}

export interface FilingHistoryItem {
  category: string;
  description: string;
  date: string;
  type: string;
  links: {
    document_metadata: string;
    self?: string;
  };
}

export interface FilingHistoryResponse {
  items: FilingHistoryItem[];
  filing_history_status: string;
}

// Officer Search Interfaces
export interface OfficerSearchResult {
  title: string;
  kind: string;
  links: {
    self: string;
  };
  appointment_count: number;
  date_of_birth?: {
    month: number;
    year: number;
  };
  address: {
    premises?: string;
    address_line_1: string;
    locality: string;
    postal_code: string;
  };
}

export interface OfficerSearchResponse {
  items: OfficerSearchResult[];
  total_results: number;
}

// Officer Appointments
export interface AppointmentItem {
  name: string; // Company Name
  appointed_to: {
    company_name: string;
    company_number: string;
    company_status: string;
  };
  officer_role: string;
  appointed_on: string;
  resigned_on?: string;
}

export interface OfficerAppointmentsResponse {
  items: AppointmentItem[];
  name: string;
  total_results: number;
  date_of_birth?: {
    month: number;
    year: number;
  };
}

export async function searchCompanies(query: string): Promise<CompanySearchResponse> {
  if (!query) return { items: [], total_results: 0 };

  const res = await fetch(`${BASE_URL}/search/companies?q=${encodeURIComponent(query)}&items_per_page=10`, {
    headers: getHeaders(),
  });

  if (!res.ok) {
    console.error(`Search failed: ${res.status} ${res.statusText}`);
    throw new Error(`Error searching companies: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

export async function getCompanyProfile(companyNumber: string): Promise<CompanyProfile> {
  const res = await fetch(`${BASE_URL}/company/${companyNumber}`, {
    headers: getHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Error fetching company profile: ${res.statusText}`);
  }

  return res.json();
}

export async function getCompanyOfficers(companyNumber: string): Promise<OfficerListResponse> {
  const res = await fetch(`${BASE_URL}/company/${companyNumber}/officers`, {
    headers: getHeaders(),
  });

  if (!res.ok) {
    // Some companies might not have officers public or other errors
    console.warn(`Could not fetch officers for ${companyNumber}: ${res.statusText}`);
    return { items: [], active_count: 0 };
  }

  return res.json();
}

export async function getFilingHistory(companyNumber: string): Promise<FilingHistoryResponse> {
  const res = await fetch(`${BASE_URL}/company/${companyNumber}/filing-history`, {
    headers: getHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Error fetching filing history: ${res.statusText}`);
  }

  return res.json();
}

export async function searchOfficers(query: string): Promise<OfficerSearchResponse> {
  if (!query) return { items: [], total_results: 0 };

  const res = await fetch(`${BASE_URL}/search/officers?q=${encodeURIComponent(query)}&items_per_page=20`, {
    headers: getHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Error searching officers: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

export async function getOfficerAppointments(officerId: string): Promise<OfficerAppointmentsResponse> {
  if (!officerId) throw new Error("Officer ID is required");

  // Log the URL for debugging
  const url = `${BASE_URL}/officers/${officerId}/appointments?items_per_page=50`;
  console.log(`Fetching Officer Appointments: ${url}`);

  const res = await fetch(url, {
    headers: getHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Error fetching officer appointments: ${res.status} ${res.statusText}`);
  }

  return res.json();
}
