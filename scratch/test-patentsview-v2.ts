async function testV2Endpoint() {
  const queryObj = { _text_any: { patent_title: "machine learning" } };

  const endpoints = [
    'https://search.patentsview.org/api/v1/patent/',
    'https://patentsview.org/api/v1/patent/',
    'https://api.patentsview.org/patents/query',
  ];

  for (const ep of endpoints) {
    console.log(`Checking ${ep}...`);
    try {
      const res = await fetch(`${ep}?q=${encodeURIComponent(JSON.stringify(queryObj))}`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'NovelCoreAI/1.0',
        },
      });
      console.log('Status:', res.status, 'Type:', res.headers.get('content-type'));
      const text = await res.text();
      console.log('Snippet:', text.substring(0, 200));
    } catch (e: any) {
      console.log('Error:', e.message);
    }
  }
}

testV2Endpoint();
