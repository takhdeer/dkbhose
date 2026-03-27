const puppeteer = require('puppeteer');

async function getMRUCookies(username, password) {
    const browser = await puppeteer.launch({headless: true}); 
    const page = await browser.newpage();

    await page.goto("https://auth.mtroyal.ca/authenticationendpoint/login.do?Name=PreLoginRequestProcessor&commonAuthCallerPath=%252Fcas%252Flogin&forceAuth=true&passiveAuth=false&service=https%3A%2F%2Fwww.mymru.ca%2F&tenantDomain=carbon.super&sessionDataKey=beaecbc6-ecd5-4e75-abb3-27f6dc149a02&relyingParty=Luminis5-prod-www-mymru-CAS&type=cas&sp=Luminis5-prod-www-mymru-CAS&isSaaSApp=false&authenticators=BasicAuthenticator%3ALOCAL"); 
    await page.type ("#username", username);
    await page.type ("#password", password);
    await page.click('[type="submit"]');
    await page.waitForNavigation();

    await page.cookies();
    await browser.close();

}  
