import admin from "firebase-admin";
import fs from "fs";

const serviceAccount = JSON.parse(
  fs.readFileSync("./serviceAccountKey.json", "utf8")
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function scanDocument(docRef, indent = 0) {
  const prefix = " ".repeat(indent);
  const subcollections = await docRef.listCollections();

  for (const sub of subcollections) {
    console.log(`${prefix}📁 SUBCOLLECTION: ${sub.id}`);
    const docs = await sub.get();

    for (const d of docs.docs) {
      console.log(`${prefix}   📄 Document: ${d.id}`);
      await scanDocument(d.ref, indent + 4);
    }
  }
}

async function run() {
  console.log("\n🔎 FULL FIRESTORE DEEP SCAN\n");

  const collections = await db.listCollections();

  for (const col of collections) {
    console.log(`📁 ROOT COLLECTION: ${col.id}`);
    const docs = await col.get();

    for (const doc of docs.docs) {
      console.log(`  📄 Document: ${doc.id}`);
      await scanDocument(doc.ref, 6);
    }
  }

  console.log("\n✅ Scan complete");
}

run();
