/**
 * courseGetter.js
 *
 * Purpose: Continuously fetches course registration data from the MRU registration system.
 * - Runs in a loop, checking every X seconds
 * - Maintains session with keep-alive requests
 * - Writes updates to classInfo.json whenever data is retrieved
 *
 * Used as a backend utility, triggered by API requests from the front end.
 */
// Import required modules
const https = require('https');
const fs = require('fs');

// --- CONFIGURATION ---
// Hostname for the MRU registration system
const HOSTNAME = "ban9ssb-prod.mtroyal.ca";

// How often to check for course data (in milliseconds)
const CHECK_INTERVAL = 10000; // 10 seconds - adjust as needed

// 1. PARAMETERS SECTION
// Default search parameters for the course search
const searchParams = {    
    txt_term: "202601", // Academic term
    startDatepicker: "",
    endDatepicker: "",
    uniqueSessionId: "tgioo1770167967506", // Session ID (can be dynamic)
    pageOffset: "0",
    pageMaxSize: "10",
    sortColumn: "subjectDescription",
    sortDirection: "asc"
};

// Global variables to track the monitoring loop
let isRunning = false;
let monitoringInterval = null;

// --- SYSTEM SETUP ---
// API paths for keep-alive and search
const KEEP_ALIVE_PATH = "/StudentRegistrationSsb/ssb/keepAlive/data";


// Build HTTP headers for requests, including cookies
function buildHeaders(cookies) {
    const cookieString = Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
    return {
        'Cookie': cookieString,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': `https://${HOSTNAME}/StudentRegistrationSsb/ssb/registration`,
        'X-Requested-With': 'XMLHttpRequest'
    };
}

// --- FUNCTION 1: KEEP ALIVE ---
// Sends a keep-alive request to maintain session
function sendKeepAlive(headers) {
    return new Promise((resolve) => {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] ❤️  Sending Keep Alive...`);
        const options = {
            hostname: HOSTNAME,
            path: KEEP_ALIVE_PATH,
            method: 'GET',
            headers
        };
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode === 200 && data.includes("Alive")) {
                    console.log(`[${timestamp}] ✅ Keep Alive Successful`);
                    resolve(true);
                } else {
                    console.log(`[${timestamp}] ⚠️  Keep Alive Warning: ${res.statusCode}`);
                    resolve(false);
                }
            });
        });
        req.on('error', (e) => {
            console.error(`[${timestamp}] ❌ Keep Alive Error:`, e.message);
            resolve(false);
        });
        req.end();
    });
}

// --- FUNCTION 2: FETCH AND WRITE JSON ---
// Fetches course data and writes to classInfo.json
function fetchAndWrite(headers, crn, name, email, attemptNumber) {
    return new Promise((resolve) => {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] 📥 Fetching data for CRN: ${crn}... (Check #${attemptNumber})`);
        const params = { ...searchParams, txt_keywordlike: crn };
        const queryString = new URLSearchParams(params).toString();
        const SEARCH_PATH = `/StudentRegistrationSsb/ssb/searchResults/searchResults?${queryString}`;
        const options = {
            hostname: HOSTNAME,
            path: SEARCH_PATH,
            method: 'GET',
            headers
        };
        const req = https.request(options, (res) => {
            let rawData = '';
            res.on('data', (chunk) => { rawData += chunk; });
            res.on('end', () => {
                let output = rawData;
                let parsed = null;
                let success = false;
                
                try {
                    // Check if session expired (HTML response)
                    if (rawData.trim().startsWith('<')) {
                        console.log(`[${timestamp}] ❌ ERROR: Session expired. Please update cookies and restart.`);
                        fs.writeFileSync('classInfo.json', JSON.stringify({
                            error: "Session expired - cookies are invalid",
                            message: "Please get fresh cookies from Banner and restart the application",
                            lastUpdated: new Date().toISOString()
                        }, null, 2));
                        resolve(false);
                        return;
                    }
                    
                    parsed = JSON.parse(rawData);
                    
                    // Check if data is null or empty
                    if (!parsed.data || parsed.data === null || (Array.isArray(parsed.data) && parsed.data.length === 0)) {
                        console.log(`[${timestamp}] ⚠️  No course data found - will keep checking...`);
                    } else {
                        success = true;
                    }
                    
                    // Remove ztcEncodedImage from all results if present
                    if (parsed && Array.isArray(parsed.data)) {
                        parsed.data = parsed.data.map(item => {
                            const { ztcEncodedImage, ...rest } = item;
                            return rest;
                        });
                    }
                    
                    // Add student info section and timestamp
                    parsed.studentInfo = { name, email };
                    parsed.lastUpdated = new Date().toISOString();
                    parsed.checkNumber = attemptNumber;
                    output = JSON.stringify(parsed, null, 2);
                    
                } catch (e) {
                    console.log(`[${timestamp}] ❌ ERROR: Failed to parse response - ${e.message}`);
                    resolve(false);
                    return;
                }
                
                // Write to file
                fs.writeFileSync('classInfo.json', output);
                
                if (success) {
                    console.log(`[${timestamp}] ✅ SUCCESS: Found ${parsed.data.length} course(s)! Data written to classInfo.json`);
                    console.log(`[${timestamp}] 🔄 Continuing to monitor for updates...`);
                } else {
                    console.log(`[${timestamp}] 📝 Status saved to classInfo.json (no course data yet)`);
                }
                
                resolve(success);
            });
        });
        req.on('error', (e) => {
            const timestamp = new Date().toLocaleTimeString();
            console.error(`[${timestamp}] ❌ Request Error:`, e.message);
            resolve(false);
        });
        req.end();
    });
}

// --- FUNCTION 3: CONTINUOUS MONITORING ---
// Continuously checks for course data at regular intervals
async function startContinuousMonitoring({ name, crn, email, cookies }) {
    if (isRunning) {
        console.log("⚠️  Monitoring is already running!");
        return;
    }

    isRunning = true;
    const headers = buildHeaders(cookies);
    let attemptNumber = 0;
    let keepAliveCounter = 0;
    
    console.log("\n" + "=".repeat(60));
    console.log("🚀 STARTING CONTINUOUS COURSE MONITORING");
    console.log("=".repeat(60));
    console.log(`Student: ${name}`);
    console.log(`Email: ${email}`);
    console.log(`CRN: ${crn}`);
    console.log(`Check Interval: ${CHECK_INTERVAL/1000} seconds`);
    console.log(`Term: 202601 (Winter 2026)`);
    console.log("=".repeat(60) + "\n");

    // Initial keep-alive and fetch
    await sendKeepAlive(headers);
    await new Promise(r => setTimeout(r, 1000));
    attemptNumber++;
    await fetchAndWrite(headers, crn, name, email, attemptNumber);

    // Set up continuous monitoring
    monitoringInterval = setInterval(async () => {
        keepAliveCounter++;
        
        // Send keep-alive every 3 checks (every 30 seconds if interval is 10s)
        if (keepAliveCounter >= 3) {
            await sendKeepAlive(headers);
            await new Promise(r => setTimeout(r, 1000));
            keepAliveCounter = 0;
        }
        
        attemptNumber++;
        await fetchAndWrite(headers, crn, name, email, attemptNumber);
        
    }, CHECK_INTERVAL);

    console.log(`✅ Monitoring started! Checking every ${CHECK_INTERVAL/1000} seconds.`);
    console.log("💡 Press Ctrl+C to stop monitoring\n");
}

// --- FUNCTION 4: STOP MONITORING ---
function stopMonitoring() {
    if (monitoringInterval) {
        clearInterval(monitoringInterval);
        monitoringInterval = null;
    }
    isRunning = false;
    console.log("\n" + "=".repeat(60));
    console.log("⏹️  MONITORING STOPPED");
    console.log("=".repeat(60) + "\n");
}

// Exported function for API use (runs once, then starts continuous monitoring)
async function runCourseGetter({ name, crn, email, cookies }) {
    // Start continuous monitoring instead of single run
    await startContinuousMonitoring({ name, crn, email, cookies });
    return true;
}

// Handle cleanup on exit
process.on('SIGINT', () => {
    console.log("\n\n⏹️  Received stop signal...");
    stopMonitoring();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log("\n\n⏹️  Received termination signal...");
    stopMonitoring();
    process.exit(0);
});

module.exports = { runCourseGetter, stopMonitoring };