/**
 * Integration test: cookieExtractor (Puppeteer) -> courseGetter (MRU search API).
 * Requires ./serviceAccountKey.json because courseGetter loads Firebase (unused for fetch only).
 *
 * Run: npm run test:cookie-course
 *      node testCookieAndCourseGetter.js
 *      node testCookieAndCourseGetter.js --refresh   (bypass in-memory cookie cache)
 */

const { getMRUCookies, refreshMRUCookies } = require('./cookieExtractor');
const { fetchCourseData } = require('./courseGetter');

const TEST = {
  crn: '10653',
  term: '202701',
};

const useRefresh = process.argv.includes('--refresh');

async function run() {
  console.log('Step 1: MRU cookies via cookieExtractor...');
  const cookies = useRefresh ? await refreshMRUCookies() : await getMRUCookies();

  const { JSESSIONID, MRUB9SSBPRODREGHA } = cookies;
  if (!JSESSIONID || !MRUB9SSBPRODREGHA) {
    throw new Error('Expected JSESSIONID and MRUB9SSBPRODREGHA from cookie extractor');
  }
  console.log(`  JSESSIONID present (${JSESSIONID.length} chars), MRUB9SSBPRODREGHA present (${MRUB9SSBPRODREGHA.length} chars)`);

  console.log(`Step 2: courseGetter.fetchCourseData CRN=${TEST.crn} term=${TEST.term}...`);
  const courseData = await fetchCourseData(
    TEST.crn,
    JSESSIONID,
    MRUB9SSBPRODREGHA,
    TEST.term
  );

  console.log('\n--- INTEGRATION TEST OK ---');
  console.log(JSON.stringify(courseData, null, 2));
}

run().catch((err) => {
  console.error('Integration test failed:', err.message);
  process.exit(1);
});
