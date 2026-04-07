const puppeteer = require('puppeteer');

const BASE_URL = 'https://ban9ssb-prod.mtroyal.ca/StudentRegistrationSsb/ssb';
const COOKIE_TTL_MS = 30 * 60 * 1000;    // 30 minutes

// In-process cache so we don't hit Firestore on every poll cycle
let memCache = null;
let memExpiry = null;

/**
 * Returns valid MRU session cookies.
 * Order of preference:
 *   1. In-process memory cache
 *   2. Fresh puppeteer extraction
 */
async function getMRUCookies() {
    // 1. Memory cache
    if (memCache && memExpiry && Date.now() < memExpiry) {
        console.log('🍪 Using in-memory cookie cache');
        return memCache;
    }

    // 2. Fresh extraction
    console.log('🔄 Extracting fresh MRU cookies via Puppeteer...');
    const cookies = await extractCookiesViaPuppeteer();
    const expiresAt = Date.now() + COOKIE_TTL_MS;

    memCache  = cookies;
    memExpiry = expiresAt;
    return cookies;
}

/**
 * Force a fresh extraction regardless of cache state.
 * Call this on the 30-minute refresh timer.
 */
async function refreshMRUCookies() {
    console.log('🔄 Force-refreshing MRU cookies...');
    memCache  = null;
    memExpiry = null;

    return getMRUCookies();
}

/**
 * Core Puppeteer flow:
 *   term selection page → Select2 dropdown → Continue → Search → grab cookies
 *
 * Does NOT require a username/password — the SSB registration search page
 * is publicly accessible. We just need a live session with the right cookies.
 */
async function extractCookiesViaPuppeteer() {
    const browser = await puppeteer.launch({ headless: true });
    const page    = await browser.newPage();
    const TIMEOUT = 20000;
    page.setDefaultTimeout(TIMEOUT);
    await page.setViewport({ width: 1024, height: 768 });

    try {
        // ── Step 1: Load term selection ──────────────────────────────────────
        console.log('🌐 Loading term selection page...');
        await page.goto(`${BASE_URL}/term/termSelection?mode=search`, { waitUntil: 'networkidle2' });

        // ── Step 2: Open Select2 dropdown and wait for options ───────────────
        console.log('⏳ Opening term dropdown...');
        await page.waitForSelector('.select2-container', { timeout: TIMEOUT });
        await page.click('.select2-container');

        await page.waitForFunction(
            () => {
                const items = [...document.querySelectorAll('.select2-results li')];
                return items.length > 0 && !items.some(li => li.innerText.includes('Searching'));
            },
            { timeout: TIMEOUT }
        );

        // ── Step 3: Pick the first available term (topmost = most current) ───
        const selectedTerm = await page.evaluate(() => {
            const items = [...document.querySelectorAll('.select2-results li')];
            const first = items[0];
            if (!first) return null;
            ['mouseenter', 'mousemove', 'mousedown', 'mouseup', 'click'].forEach(type =>
                first.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true }))
            );
            return first.innerText.trim();
        });

        console.log(`✅ Selected term: "${selectedTerm}"`);

        // Wait for Select2 to reflect the selection
        await page.waitForFunction(
            () => {
                const el = document.querySelector('.select2-chosen');
                return el && el.innerText.trim() !== 'Select a term...' && el.innerText.trim() !== '';
            },
            { timeout: TIMEOUT }
        );

        // ── Step 4: Click Continue ───────────────────────────────────────────
        console.log('▶️  Clicking Continue...');
        const navPromise = page.waitForNavigation({ waitUntil: 'networkidle2', timeout: TIMEOUT });

        await puppeteer.Locator.race([
            page.locator('::-p-aria(Continue)'),
            page.locator('#term-go'),
            page.locator('::-p-xpath(//*[@id="term-go"])'),
            page.locator(':scope >>> #term-go'),
        ])
            .setTimeout(TIMEOUT)
            .click({ offset: { x: 55, y: 15 } });

        await navPromise;
        console.log('✅ Reached search page:', page.url());

        // ── Step 5: Click Search to fully initialise the session ─────────────
        console.log('🔍 Clicking Search to initialise session...');
        await puppeteer.Locator.race([
            page.locator('::-p-aria(Search)'),
            page.locator('#search-go'),
            page.locator('::-p-xpath(//*[@id="search-go"])'),
            page.locator(':scope >>> #search-go'),
        ])
            .setTimeout(TIMEOUT)
            .click({ offset: { x: 58, y: 10 } });

        // Wait for results table (best signal that the session is valid).
        // Failure here is non-fatal — cookies are usually set before results load.
        await page.waitForFunction(
            () => { const el = document.querySelector('.dataTables_info'); return el && /\d/.test(el.innerText); },
            { timeout: 25000 }
        ).catch(() => console.warn('⚠️  Results table timeout — continuing with cookies anyway'));

        // ── Step 6: Extract cookies ───────────────────────────────────────────
        const allCookies  = await page.cookies();
        const JSESSIONID  = allCookies.find(c => c.name === 'JSESSIONID')?.value;
        const MRUB9SSBPRODREGHA = allCookies.find(c => c.name === 'MRUB9SSBPRODREGHA')?.value;

        console.log(`🍪 JSESSIONID:        ${JSESSIONID        ? '✅' : '❌ MISSING'}`);
        console.log(`🍪 MRUB9SSBPRODREGHA: ${MRUB9SSBPRODREGHA ? '✅' : '❌ MISSING'}`);

        if (!JSESSIONID || !MRUB9SSBPRODREGHA) {
            throw new Error('Required cookies not found after session initialisation');
        }

        console.log('✅ Cookies extracted successfully');
        return { JSESSIONID, MRUB9SSBPRODREGHA };

    } catch (error) {
        console.error('❌ Cookie extraction failed:', error.message);
        throw error;
    } finally {
        await browser.close();
    }
}

/**
 * Wipe in-memory cache. Useful if a downstream API call gets a 401/403.
 */
function clearCookies() {
    memCache  = null;
    memExpiry = null;
    console.log('🗑️  In-memory cookie cache cleared');
}

module.exports = { getMRUCookies, refreshMRUCookies, clearCookies };
