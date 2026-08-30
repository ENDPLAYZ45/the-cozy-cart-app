const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
const apiKey = process.env.VITE_FIREBASE_API_KEY;

if (!projectId || !apiKey) {
  console.error('Missing Firebase credentials');
  process.exit(1);
}

const endpoint = new URL(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/products`);
endpoint.searchParams.set("key", apiKey);
endpoint.searchParams.set("pageSize", "48");

console.log('Fetching from Firebase...');
const startTime = Date.now();

fetch(endpoint)
  .then(res => res.json())
  .then(data => {
    const duration = Date.now() - startTime;
    console.log(`Fetched in ${duration}ms`);
    console.log(`Documents count: ${data.documents ? data.documents.length : 0}`);
    if (data.error) {
      console.error('Firebase Error:', data.error);
    }
  })
  .catch(err => {
    console.error('Fetch error:', err);
  });
