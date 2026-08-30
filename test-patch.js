const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
const apiKey = process.env.VITE_FIREBASE_API_KEY;

const id = "v0PsfIL44ckaQxZJ65wD"; // Chair ID
const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/products/${id}?key=${apiKey}`;

const fields = {
  name: { stringValue: "Test Chair" },
  price: {
    mapValue: {
      fields: {
        amount: { doubleValue: 7999 },
        currency: { stringValue: "INR" }
      }
    }
  }
};

fetch(url, {
  method: "PATCH",
  headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.ADMIN_TOKEN}` },
  body: JSON.stringify({ fields })
}).then(async res => {
  console.log(res.status, await res.text());
}).catch(console.error);
