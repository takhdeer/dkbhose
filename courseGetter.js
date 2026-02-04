/**
 * courseGetter.js
 *
 * Purpose: Fetches course registration data from the MRU registration system using provided cookies and CRN.
 * - Sends keep-alive requests to maintain session.
 * - Fetches course data for a given CRN and writes it to classInfo.json.
 *
 *
 * Used as a backend utility, triggered by API requests from the front end.
 */
// Import required modules
const https = require('https');
const fs = require('fs');

// --- CONFIGURATION ---
// Hostname for the MRU registration system
const HOSTNAME = "ban9ssb-prod.mtroyal.ca";

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

// Cookies are accepted as a parameter from the API


// --- SYSTEM SETUP ---
// API paths for keep-alive and search
const KEEP_ALIVE_PATH = "/StudentRegistrationSsb/ssb/keepAlive/data";


// Build HTTP headers for requests, including cookies
function buildHeaders(cookies) {
    const cookieString = Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
    return {
        'Cookie': cookieString,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*'
    };
}

// --- FUNCTION 1: KEEP ALIVE ---
// Sends a keep-alive request to maintain session
function sendKeepAlive(headers) {
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
            } else {
                console.log(`[${timestamp}] ⚠️ Keep Alive Warning: ${res.statusCode}`);
            }
        });
    });
    req.on('error', (e) => console.error("Keep Alive Error:", e.message));
    req.end();
}

// --- FUNCTION 2: FETCH AND WRITE JSON ---
// Fetches course data and writes to classInfo.json, removing ztcEncodedImage and adding student info
function fetchAndWrite(headers, crn, name, email) {
    return new Promise((resolve, reject) => {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] 📥 Fetching data for CRN: ${crn}...`);
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
                try {
                    parsed = JSON.parse(rawData);
                    // Check if data is null, which means course not found
                    if (parsed && parsed.data === null) {
                        reject(new Error('Course registration failed: No course data found for the provided CRN. Please check the CRN and try again.'));
                        return;
                    }
                    // Remove ztcEncodedImage from all results if present
                    if (parsed && Array.isArray(parsed.data)) {
                        // Filter to only the course with matching CRN
                        parsed.data = parsed.data.filter(course => course.courseReferenceNumber === crn);
                        // If no matching course, set data to null
                        if (parsed.data.length === 0) {
                            parsed.data = null;
                        } else {
                            // Remove ztcEncodedImage from the matching course
                            parsed.data = parsed.data.map(item => {
                                const { ztcEncodedImage, ...rest } = item;
                                return rest;
                            });
                        }
                    }
                    // Add student info section
                    parsed.studentInfo = { name, email };
                    parsed.lastUpdated = new Date().toISOString();
                    output = JSON.stringify(parsed, null, 2);
                } catch (e) {
                    // Not JSON, leave as is
                }
                fs.writeFileSync('classInfo.json', output);
                console.log(`[${timestamp}] 📄 File written. Data length: ${output.length} characters`);
                if (parsed && parsed.data && Array.isArray(parsed.data) && parsed.data.length > 0) {
                    console.log(`[${timestamp}] 📊 Course data: ${parsed.data.length} sections found`);
                } else if (parsed && parsed.data === null) {
                    console.log(`[${timestamp}] 📊 No course data available (data is null)`);
                } else {
                    console.log(`[${timestamp}] 📊 Course data status unknown`);
                }
                if (rawData.trim().startsWith('<')) {
                    reject(new Error('Session expired. Please update your cookies.'));
                } else {
                    console.log(`[${timestamp}] ✅ Success: Data written to classInfo.json`);
                    resolve();
                }
            });
        });
        req.on('error', (e) => reject(new Error(`Request Error: ${e.message}`)));
        req.end();
    });
}


// Global variable to store interval ID for stopping
let monitoringInterval = null;

// Function to stop monitoring
function stopMonitoring() {
    if (monitoringInterval) {
        clearInterval(monitoringInterval);
        monitoringInterval = null;
        console.log(`[${new Date().toLocaleTimeString()}] 🛑 Course monitoring stopped.`);
    }
}

// Exported function for API use
// This is called by the backend with user parameters
async function runCourseGetter({ name, crn, email, cookies }) {
    // If already monitoring, stop first
    stopMonitoring();
    
    const headers = buildHeaders(cookies);
    
    // Function to perform the fetch
    const performFetch = async () => {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] 🔄 Starting scheduled fetch for CRN: ${crn}`);
        try {
            sendKeepAlive(headers);
            // Wait 2 seconds after keep-alive to run the fetch
            await new Promise((resolve) => setTimeout(resolve, 2000));
            await fetchAndWrite(headers, crn, name, email);
            console.log(`[${timestamp}] ✅ Course data updated.`);
        } catch (error) {
            console.log(`[${timestamp}] ❌ Error during monitoring: ${error.message}`);
        }
    };
    
    // Start monitoring every 30 seconds
    monitoringInterval = setInterval(performFetch, 30000);
    
    // Perform initial fetch immediately
    await performFetch();
    
    console.log(`[${new Date().toLocaleTimeString()}] 🔄 Course monitoring started. Will check every 30 seconds.`);
}

// Export the stop function too
module.exports = { runCourseGetter, stopMonitoring };