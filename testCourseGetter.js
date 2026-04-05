const { fetchCourseData } = require('./courseGetter');

// Fill these values manually before running.
const TEST_CONFIG = {
  crn: '10653',
  jsessionid:'CC2F681A26D2A226B35A398679CE66E2',
  mruCookie: 's2|adLyj',
  term: '202701',
  saveToFirebase: true
};

async function run() {
  const { crn, jsessionid, mruCookie, term, saveToFirebase } = TEST_CONFIG;

  if (!crn || !jsessionid || !mruCookie) {
    throw new Error('Set crn, jsessionid, and mruCookie in testCourseGetter.js before running');
  }

  const result = await fetchCourseData(crn, jsessionid, mruCookie, term, { saveToFirebase });

  console.log('--- COURSE GETTER TEST RESULT ---');
  console.log(JSON.stringify(result, null, 2));
}

run().catch((error) => {
  console.error('CourseGetter test failed:', error.message);
  process.exit(1);
});
