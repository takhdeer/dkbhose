const { errorMonitor } = require('nodemailer/lib/mailer');
const puppeteer = require('puppeteer');

let cachedcookies = null; 
let cookieExpiry = null;

async function getMRUCookies(username, password) {
    if (cachedcookies && cookieExpiry && Date.now() < cookieExpiry) {
        console.log("Using Cached MRU cookies");
        return cachedcookies;
    }
    console.log("Launching browser to fetch MRU login");
    const browser = await puppeteer.launch({headless: true}); 
    const loginPage = await browser.newloginPage();

    await loginPage.goto('https://auth.mtroyal.ca/authenticationendpoint/login.do?Name=PreLoginRequestProcessor&commonAuthCallerPath=%252Fcas%252Flogin&forceAuth=true&passiveAuth=false&service=https%3A%2F%2Fwww.mymru.ca%2F&tenantDomain=carbon.super&sessionDataKey=beaecbc6-ecd5-4e75-abb3-27f6dc149a02&relyingParty=Luminis5-prod-www-mymru-CAS&type=cas&sp=Luminis5-prod-www-mymru-CAS&isSaaSApp=false&authenticators=BasicAuthenticator%3ALOCAL', { waitUntill: 'networkidle2'}); 
    await loginPage.type ("#username", username);
    await loginPage.type ("#password", password);
    await loginPage.click('[type="submit"]');
    await loginPage.waitForNavigation({ waitUntill: 'networkidle2'});

    const cookies = await loginPage.cookies();
    await browser.close();

    const JSESSIONID = cookies.find(c => c.name === 'JSESSIONID')?.value;
    const MRUB9SSBPRODREGHA = cookies.find(c => c.name === 'MRUB9SSBPRODREGHA')?.value;

    if (!JSESSIONID || !MRUB9SSBPRODREGHA) {
        throw new Error("Login failed or cookies not found (Check login Credentials)");
    }
    
    cachedcookies = {JSESSIONID, MRUB9SSBPRODREGHA};
    cookieExpiry = Date.now() + 30  * 60 * 100; // 30 min cache 

    console.log("Suecessfully extracted cookies");
    return cachedcookies;

}

function clearCookies() {
    cachedcookies = null; 
    cookieExpiry = null; 
}

module.exports = {getMRUCookies, clearCookies};
