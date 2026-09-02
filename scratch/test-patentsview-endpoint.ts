async function testEndpoints() {
  const queryObj = { _text_any: { patent_title: "machine learning" } };
  const fieldsObj = ["patent_number", "patent_title", "patent_abstract", "patent_date"];
  const optionsObj = { per_page: 5 };

  console.log('Testing GET https://api.patentsview.org/patents/query...');
  try {
    const url = `https://api.patentsview.org/patents/query?q=${encodeURIComponent(JSON.stringify(queryObj))}&f=${encodeURIComponent(JSON.stringify(fieldsObj))}&o=${encodeURIComponent(JSON.stringify(optionsObj))}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
    console.log('GET status:', res.status, 'Content-Type:', res.headers.get('content-type'));
    const text = await res.text();
    console.log('Snippet:', text.substring(0, 300));
  } catch (err: any) {
    console.error('GET error:', err.message);
  }

  console.log('\nTesting POST https://api.patentsview.org/patents/query...');
  try {
    const res = await fetch('https://api.patentsview.org/patents/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      },
      body: JSON.stringify({
        q: queryObj,
        f: fieldsObj,
        o: optionsObj
      })
    });
    console.log('POST status:', res.status, 'Content-Type:', res.headers.get('content-type'));
    const text = await res.text();
    console.log('Snippet:', text.substring(0, 300));
  } catch (err: any) {
    console.error('POST error:', err.message);
  }
}

testEndpoints();
