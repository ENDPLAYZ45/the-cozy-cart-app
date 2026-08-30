const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
const apiKey = process.env.VITE_FIREBASE_API_KEY;

async function run() {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/products?pageSize=1000&key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();
  
  const docs = data.documents || [];
  const chair = docs.find(d => {
    const title = d.fields?.title?.stringValue || d.fields?.name?.stringValue || "";
    return title.includes("ASTRIDE");
  });
  
  if (chair) {
    console.log(JSON.stringify(chair.fields, null, 2));
  } else {
    console.log("Chair not found");
  }
}

run();
