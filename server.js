// Backend API using Express to receive form data from frontend
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
// We'll require courseGetter.js as a module and call a function from it
const { runCourseGetter } = require('./courseGetter');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(bodyParser.json());


// Store last submitted parameters
let lastParams = null;

// Endpoint to receive form data
app.post('/api/submit', async (req, res) => {
    const { name, crn, email, JSESSIONIDCookie, MRUB9SSBPRODREGHACookie } = req.body;
    console.log('Received:', { name, crn, email, JSESSIONIDCookie, MRUB9SSBPRODREGHACookie });
    lastParams = { name, crn, email, cookies: { JSESSIONID: JSESSIONIDCookie, MRUB9SSBPRODREGHA: MRUB9SSBPRODREGHACookie } };
    try {
        await runCourseGetter(lastParams);
        res.json({ success: true, message: 'Course getter ran successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Interval to rerun with last parameters every 30 seconds
setInterval(async () => {
    console.log('[Interval] Timer fired. lastParams:', lastParams ? 'SET' : 'NOT SET');
    if (lastParams) {
        console.log('[Interval] Running courseGetter with last submitted parameters...');
        try {
            await runCourseGetter(lastParams);
        } catch (err) {
            console.error('[Interval] runCourseGetter error:', err.message);
        }
    }
}, 30000);

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
