
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');

// Read .env.local manually since we aren't in Next.js context
try {
    const envPath = path.resolve(__dirname, '../.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/GEMINI_API_KEY=(.*)/);

    if (!match) {
        console.error("Could not find GEMINI_API_KEY in .env.local");
        process.exit(1);
    }

    const apiKey = match[1].trim();
    const genAI = new GoogleGenerativeAI(apiKey); // Fix: Remove extra quotes if present

    // Clean key just in case
    const cleanKey = apiKey.replace(/"/g, '').replace(/'/g, '');
    const genAI_Clean = new GoogleGenerativeAI(cleanKey);

    async function list() {
        console.log("Fetching available models...");
        // Hack: The Node SDK might not expose listModels easily on the main client in older versions, 
        // but let's try via the model manager if accessible, or just try a standard fetch if SDK fails.
        // Actually, for SDK v0.1+, genAI.getGenerativeModel remains, but management API is different.
        // Let's rely on standard fetch to the API directly to be sure, avoiding SDK version overrides.

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}`);
            const data = await response.json();

            if (data.models) {
                console.log("\n--- AVAILABLE MODELS ---");
                data.models.forEach(m => {
                    if (m.name.includes('gemini')) {
                        console.log(`Name: ${m.name}`);
                        console.log(`Supported Methods: ${m.supportedGenerationMethods.join(', ')}`);
                        console.log("-------------------");
                    }
                });
            } else {
                console.log("No models found or error:", JSON.stringify(data, null, 2));
            }
        } catch (e) {
            console.error("Error fetching models:", e);
        }
    }

    list();

} catch (e) {
    console.error("Error reading .env.local:", e);
}
