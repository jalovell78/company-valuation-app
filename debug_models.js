
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config({ path: '.env.local' });

const candidates = [
    "gemini-1.5-flash",
    "gemini-1.5-flash-001",
    "gemini-1.5-flash-latest",
    "gemini-pro",
    "gemini-1.0-pro",
    "models/gemini-1.5-flash"
];

async function testModels() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    console.log("Testing models with key ending in: ..." + process.env.GEMINI_API_KEY.slice(-4));

    for (const modelName of candidates) {
        console.log(`\nTesting: ${modelName} ...`);
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Test");
            console.log(`✅ SUCCESS: ${modelName}`);
            console.log(`Response: ${result.response.text()}`);
            return; // Stop after first success
        } catch (error) {
            console.log(`❌ FAILED: ${modelName}`);
            console.log(`Error: ${error.message.split('[')[0]}`); // Print first part of error
        }
    }
}

testModels();
