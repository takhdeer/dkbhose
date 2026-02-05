// Backend API using Express to receive form data from frontend
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer');
// We'll require courseGetter.js as a module and call a function from it
const { runCourseGetter, stopMonitoring } = require('./courseGetter');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(bodyParser.json());

// Endpoint to extract cookies using puppeteer
app.post('/api/extract-cookies', async (req, res) => {
    try {
        console.log('🤖 Starting Puppeteer to extract cookies...');
        
        const browser = await puppeteer.launch({ headless: false });
        const page = await browser.newPage();
        
        // Navigate to MRU login
        const loginUrl = "https://auth.mtroyal.ca/authenticationendpoint/login.do?Name=PreLoginRequestProcessor&commonAuthCallerPath=%252Fcas%252Flogin&forceAuth=true&passiveAuth=false&service=https%3A%2F%2Fwww.mymru.ca%2F&tenantDomain=carbon.super&sessionDataKey=6ab1811f-f753-4656-a3e5-d21652ce23c0&relyingParty=Luminis5-prod-www-mymru-CAS&type=cas&sp=Luminis5-prod-www-mymru-CAS&isSaaSApp=false&authenticators=BasicAuthenticator%3ALOCAL";
        
        console.log('📍 Navigating to MRU login page...');
        await page.goto(loginUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        
        // Wait for user to complete login
        console.log('⏳ Waiting for user to complete login (close the browser when done)...');
        
        // Wait for navigation to indicate login success
        try {
            await page.waitForNavigation({ timeout: 600000 }); // 10 minutes timeout
        } catch (e) {
            // Navigation might not happen, user might close window
        }
        
        // Navigate to registration page
        console.log('📍 Navigating to Banner registration page...');
        await page.goto('https://ban9ssb-prod.mtroyal.ca/StudentRegistrationSsb/ssb/registration', { waitUntil: 'networkidle2', timeout: 60000 });
        
        // Get cookies
        console.log('🍪 Extracting cookies...');
        const cookies = await page.cookies();
        
        // Find the specific cookies we need
        const jsessionid = cookies.find(c => c.name === 'JSESSIONID')?.value || '';
        const mrub9 = cookies.find(c => c.name === 'MRUB9SSBPRODREGHA')?.value || '';
        
        console.log('✅ Cookies extracted:');
        console.log('   JSESSIONID:', jsessionid);
        console.log('   MRUB9SSBPRODREGHA:', mrub9);
        
        await browser.close();
        
        res.json({ 
            success: true, 
            jsessionid, 
            mrub9,
            message: 'Cookies extracted successfully' 
        });
    } catch (err) {
        console.error('❌ Puppeteer error:', err.message);
        res.status(500).json({ success: false, message: err.message });
    }
});

// Endpoint to receive form data

app.post('/api/submit', async (req, res) => {
    const { name, crn, email, JSESSIONIDCookie, MRUB9SSBPRODREGHACookie } = req.body;
    console.log('Received:', { name, crn, email, JSESSIONIDCookie, MRUB9SSBPRODREGHACookie });
    try {
        await runCourseGetter({ name, crn, email, cookies: { JSESSIONID: JSESSIONIDCookie, MRUB9SSBPRODREGHA: MRUB9SSBPRODREGHACookie } });
        res.json({ success: true, message: 'Course monitoring started successfully. Checking every 30 seconds.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Endpoint to stop monitoring
app.post('/api/stop', (req, res) => {
    stopMonitoring();
    res.json({ success: true, message: 'Course monitoring stopped.' });
});

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT. Stopping course monitoring...');
    stopMonitoring();
    console.log('✅ Monitoring stopped. Exiting server...');
    process.exit(0);
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    
    // Start the frontend automatically
    console.log('Starting frontend...');
    const frontend = spawn('npx', ['vite'], { 
        cwd: './my-app', 
        stdio: 'inherit', 
        shell: true 
    });
    
    frontend.on('error', (err) => {
        console.error('Failed to start frontend:', err);
    });
    
    // Handle server shutdown to also stop frontend
    process.on('exit', () => {
        frontend.kill();
    });
});