const { getMRUCookies, refreshMRUCookies } = require('./cookieExtractor');

const useRefresh = process.argv.includes('--refresh');

async function run() {
  const cookies = useRefresh ? await refreshMRUCookies() : await getMRUCookies();

  console.log('\n--- COOKIE EXTRACTOR TEST RESULT ---');
  console.log('Keys:', Object.keys(cookies).join(', '));
  console.log('JSESSIONID length:', cookies.JSESSIONID?.length ?? 0);
  console.log('MRUB9SSBPRODREGHA length:', cookies.MRUB9SSBPRODREGHA?.length ?? 0);
  console.log('------------------------------------\n');
}

run().catch((error) => {
  console.error('CookieExtractor test failed:', error.message);
  process.exit(1);
});
