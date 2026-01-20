
const API_KEY = process.env.COMPANIES_HOUSE_API_KEY;

export async function fetchPdfBuffer(documentUrl: string): Promise<Buffer> {
    if (!API_KEY) throw new Error("Missing Companies House API Key");

    const encodedKey = btoa(`${API_KEY}:`);

    // Note: documentUrl usually comes from the API links, e.g. "https://document-api.company-information.service.gov.uk/document/{id}/content"
    // If the link provided is the metadata link, we need to append /content or check the resources.
    // For simplicity in this prototype, we assume we want the content.
    // The 'document_metadata' link often looks like .../document/{id}
    // To get content, we usually fetch .../document/{id}/content

    let fetchUrl = documentUrl;
    if (!fetchUrl.endsWith('/content')) {
        fetchUrl = `${fetchUrl}/content`;
    }

    const res = await fetch(fetchUrl, {
        headers: {
            'Authorization': `Basic ${encodedKey}`,
            'Accept': 'application/pdf'
        }
    });

    if (!res.ok) {
        // If 404/403, might be due to URL format or permissions
        console.error(`PDF Fetch Failed: ${res.status} on ${fetchUrl}`);

        // Fallback: If we blindly appended /content but it was already a content link or different structure
        // But usually Companies House simplified API works this way.
        throw new Error(`Failed to fetch PDF: ${res.statusText}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
}
