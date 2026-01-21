
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');

try {
    const envPath = path.resolve(__dirname, '../.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/GEMINI_API_KEY=(.*)/);

    if (!match) throw new Error("No API Key found");

    const apiKey = match[1].trim();
    const genAI = new GoogleGenerativeAI(apiKey);

    async function test() {
        console.log("Testing gemini-pro availability...");
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-pro" });
            const result = await model.generateContent("Hello, are you there?");
            console.log("SUCCESS! gemini-pro is available.");
            console.log("Response:", result.response.text());
        } catch (e) {
            console.error("FAILED to use gemini-pro");
            console.error(e.message);
        }
    }

    test();

} catch (e) {
    console.error(e);
}
