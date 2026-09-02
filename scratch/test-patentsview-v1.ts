async function testV1Endpoint() {
  const queryObj = { _text_any: { patent_title: "machine learning" } };
  const fieldsObj = ["patent_number", "patent_title", "patent_abstract", "patent_date"];
  const optionsObj = { size: 5 };

  console.log('Testing GET https://search.patentsview.org/api/v1/patent/...');
  try {
    const apiKey = process.env.PATENTSVIEW_API_KEY || '';
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    };
    if (apiKey) headers['X-Api-Key'] = apiKey;

    const url = `https://search.patentsview.org/api/v1/patent/?q=${encodeURIComponent(JSON.stringify(queryObj))}&f=${encodeURIComponent(JSON.stringify(fieldsObj))}&s=${encodeURIComponent(JSON.stringify(optionsObj))}`;
    const res = await fetch(url, { headers });
    console.log('GET status:', res.status, 'Content-Type:', res.headers.get('content-type'));
    const text = await res.text();
    console.log('Snippet:', text.substring(0, 500));
  } catch (err: any) {
    console.error('GET error:', err.message);
  }
}

testV1Endpoint();
