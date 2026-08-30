import * as dotenv from 'dotenv';
dotenv.config();

async function deleteAll() {
  const apiKey = process.env.VITE_FIREBASE_API_KEY?.trim();
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID?.trim();
  const email = process.env.VITE_FIREBASE_ADMIN_EMAIL?.trim();
  const password = process.env.VITE_ADMIN_PASSCODE?.trim();

  // 1. Get ID Token
  console.log("Signing in to get ID token...", email);
  const authRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true })
  });
  const authData = await authRes.json();
  if (!authData.idToken) throw new Error("Failed to authenticate: " + JSON.stringify(authData));
  const token = authData.idToken;

  // 2. Fetch all products
  console.log("Fetching products...");
  const queryUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery?key=${apiKey}`;
  const queryRes = await fetch(queryUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "products" }],
        select: { fields: [{ fieldPath: "name" }, { fieldPath: "title" }] }
      }
    })
  });
  const queryData = await queryRes.json();
  const products = (queryData || [])
    .filter((doc: any) => doc.document)
    .map((doc: any) => {
      const d = doc.document;
      const id = d.name.split("/").pop();
      const fields = d.fields || {};
      const name = fields.name?.stringValue || fields.title?.stringValue || "Unknown";
      return { id, name };
    });

  console.log(`Found ${products.length} products.`);

  // 3. Delete all products
  for (const p of products) {
    console.log(`Deleting product: ${p.id} (${p.name})`);
    const delUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/products/${p.id}?key=${apiKey}`;
    const delRes = await fetch(delUrl, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!delRes.ok) {
      console.error(`Failed to delete ${p.id}: ${delRes.status} ${await delRes.text()}`);
    } else {
      console.log(`Deleted ${p.id}`);
    }
  }

  console.log("All products deleted!");
}

deleteAll().catch(console.error);
