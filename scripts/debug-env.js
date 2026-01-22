const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(process.cwd(), '.env.local');

console.log('Checking .env.local at:', envPath);

if (fs.existsSync(envPath)) {
    console.log('.env.local exists.');
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    if (envConfig.POSTGRES_URL) {
        console.log('POSTGRES_URL found in file (starts with):', envConfig.POSTGRES_URL.substring(0, 15) + '...');
    } else {
        console.log('POSTGRES_URL NOT found in .env.local');
    }
} else {
    console.log('.env.local DOES NOT exist.');
}
