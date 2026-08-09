const wait = require('wait');
require('dotenv').config();
require('module-alias/register');
const path = require('path');
const Leviathan = require('./structures/Leviathan.js');

const client = new Leviathan();
const config = require(`${process.cwd()}/config.json`);

// Check Groq API on startup
async function checkGroqAPI() {
    try {
        const apiKey = process.env.GROQ_API_KEY || process.env.AI_INTEGRATIONS_GROQ_API_KEY;
        
        if (!apiKey) {
            console.warn('[GROQ CHECK] WARNING: No GROQ_API_KEY found in environment variables!');
            console.warn('[GROQ CHECK] AI Moderation will be DISABLED');
            return false;
        }
        
        console.log('[GROQ CHECK] GROQ_API_KEY found in environment');
        
        const { Groq } = require('groq-sdk');
        const groq = new Groq({ apiKey });
        
        console.log('[GROQ CHECK] Groq client initialized successfully');
        console.log('[GROQ CHECK] API Key Status: ACTIVE');
        return true;
    } catch (error) {
        console.error('[GROQ CHECK] ERROR: Failed to initialize Groq:', error.message);
        return false;
    }
}
// startup
(async () => {
    try {
        console.log('Initializing Mongoose...');
        await client.initializeMongoose();
        console.log('Mongoose initialized successfully.');

        console.log('Initializing data...');
        await client.initializedata();
        console.log('Data initialized successfully.');

        console.log('Checking Groq AI API...');
        const groqReady = await checkGroqAPI();
        console.log(`Groq Status: ${groqReady ? 'READY' : 'NOT CONFIGURED'}`);

        console.log('Waiting for 3 seconds...');
        await wait(3000);
        console.log('Wait complete.');

        console.log('Loading events...');
        const events = await client.loadEvents();
        console.log(`Loaded events: ${events}`);

        console.log('Loading logs...');
        const logs = await client.loadlogs();
        console.log(`Loaded logs: ${logs}`);

        console.log('Loading main functionality...');
        await client.loadMain();
        console.log('Main functionality loaded.');

        console.log('Logging in the client...');
        await client.login(process.env.TOKEN);
        console.log('Client logged in successfully.');
    } catch (error) {
        console.error('An error occurred during initialization:', error);
    }
})();
