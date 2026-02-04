// Backend API using Express to receive form data from frontend
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { spawn } = require('child_process');
// We'll require courseGetter.js as a module and call a function from it
const { runCourseGetter, stopMonitoring } = require('./courseGetter');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(bodyParser.json());

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