const puppeteer = require('puppeteer');

let cachedcookies = null; 
let cookieExpiry = null;

async function getMRUCookies(username, password) {
    if (cachedcookies && cookieExpiry && Date.now() < cookieExpiry) {
        console.log("Using Cached MRU cookies");
        return cachedcookies;
    }
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    try {
        console.log('Navigating to login page...');
        await page.goto(
            'https://auth.mtroyal.ca/authenticationendpoint/login.do?Name=PreLoginRequestProcessor&commonAuthCallerPath=%252Fcas%252Flogin&forceAuth=true&passiveAuth=false&service=https%3A%2F%2Fwww.mymru.ca%2F&tenantDomain=carbon.super&sessionDataKey=beaecbc6-ecd5-4e75-abb3-27f6dc149a02&relyingParty=Luminis5-prod-www-mymru-CAS&type=cas&sp=Luminis5-prod-www-mymru-CAS&isSaaSApp=false&authenticators=BasicAuthenticator%3ALOCAL',
            { waitUntil: 'networkidle2' }
        );

        console.log('Entering credentials...');
        await page.type('#username', username);
        await page.type('#password', password);

        console.log('Submitting login...');
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}),
            page.click('[type="submit"]')
        ]);

        const registrationUrl = 'https://ban9ssb-prod.mtroyal.ca/StudentRegistrationSsb/ssb/classSearch/classSearch';
        console.log('Navigating to target portal...');
        await page.goto(registrationUrl, { waitUntil: 'networkidle2' });

      
        console.log('--- EXTRACTING REGISTRATION COOKIES ---');
        const allCookies = await page.cookies();
        console.log(JSON.stringify(allCookies, null, 2));
        console.log('--- EXTRACTION COMPLETE ---');

        const JSESSIONID = allCookies.find((c) => c.name === 'JSESSIONID')?.value;
        const MRUB9SSBPRODREGHA = allCookies.find((c) => c.name === 'MRUB9SSBPRODREGHA')?.value;

        if (!JSESSIONID || !MRUB9SSBPRODREGHA) {
            console.warn(`Warning: One or more required cookies were not found. Found names: ${allCookies.map((c) => c.name).join(', ')}`);
            throw new Error('Login failed or cookies not found (check login credentials or portal flow)');
        }

        cachedcookies = { JSESSIONID, MRUB9SSBPRODREGHA };
        cookieExpiry = Date.now() + 30 * 60 * 100;

        console.log('Successfully extracted cookies');
        return cachedcookies;
    } catch (error) {
        console.error('An error occurred during execution:', error);
        throw error;
    } finally {
        await browser.close();
    }

}

function clearCookies() {
    cachedcookies = null; 
    cookieExpiry = null; 
}

module.exports = {getMRUCookies, clearCookies};
