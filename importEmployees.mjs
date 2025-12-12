import fs from "fs";
import csvParser from "csv-parser";
import admin from "firebase-admin";


const serviceAccount = JSON.parse(
  fs.readFileSync("./serviceAccountKey.json", "utf8")
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

async function uploadMasterCSV() {
  return new Promise((resolve, reject) => {
    const results = [];

    // FIX: Use createReadStream — NOT readFileSync
    fs.createReadStream("./employees.csv")
      .pipe(csvParser())
      .on("data", (row) => {
        // FIX BOM issues
        const normalized = {};
        for (const key in row) {
          const cleanKey = key.replace(/^\uFEFF/, "");  // remove BOM
          normalized[cleanKey] = row[key];
        }
        results.push(normalized);
      })

      .on("end", async () => {
      console.log("CSV Keys:", Object.keys(results[0]));  // <-- ADD THIS
      console.log(`Parsed ${results.length} employees`);
      // console.log("RAW HEADERS:", Object.keys(firstRow));
      // console.log("RAW HEADERS:", Object.keys(results[0]));




        for (const emp of results) {
          // const empId = emp["Emp-ID"];
          let empId = (emp["Emp-ID"] || "").trim();

          // Skip invalid rows
          if (!empId || empId.length === 0) {
            console.warn("⚠️ Skipping row with empty Emp-ID:", emp);
            continue;
          }


          // Firestore document structure
          const docData = {
            empId: emp["Emp-ID"],
            name: emp["Employee-Name"],
            cluster: emp["Cluster(Location)"],
            eligibility: emp["Eligibility (Yes/No)"],
            eligibleChildrenCount: Number(emp["Eligible-Children-Count"] || 0),

            kids: [
              {
                name: emp["Kid-1-Name"] || "",
                ageBracket: emp["Kid-1-Age-bracket"] || "",
              },
              {
                name: emp["Kid-2-Name"] || "",
                ageBracket: emp["Kid-2-Age-bracket"] || "",
              },
              {
                name: emp["Kid-3-Name"] || "",
                ageBracket: emp["Kid-3-Age-bracket"] || "",
              },
            ],

            // Initial attendance state
            attendance: {
              employee: false,
              spouse: false,
              kid1: false,
              kid2: false,
              kid3: false,
            },
          };

          await db.collection("employees").doc(empId).set(docData);
          console.log(`Uploaded ${empId}`);
        }

        resolve();
      })
      .on("error", reject);
  });
}

uploadMasterCSV()
  .then(() => console.log("CSV upload completed"))
  .catch((err) => console.error("Upload failed:", err));
