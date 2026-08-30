const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
const apiKey = process.env.VITE_FIREBASE_API_KEY;

if (!projectId || !apiKey) {
  console.error('Missing Firebase credentials');
  process.exit(1);
}

const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/analytics_events?key=${apiKey}`;

const fields = {
  visitorId: { stringValue: "test_visitor" },
  sessionId: { stringValue: "test_session" },
  eventType: { stringValue: "page_view" },
  route: { stringValue: "/test" },
  timestamp: { integerValue: String(Date.now()) },
};

console.log('Posting to Firebase...');
fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ fields }),
})
.then(async res => {
  if (!res.ok) {
    console.error('Failed!', res.status, await res.text());
  } else {
    console.log('Success!', await res.json());
  }
})
.catch(err => console.error(err));
