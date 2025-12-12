import fs from "fs";
import admin from "firebase-admin";

const serviceAccount = JSON.parse(
  fs.readFileSync("./serviceAccountKey.json", "utf8")
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function initAttendance() {
  const employeesSnap = await db.collection("employees").get();

  for (const empDoc of employeesSnap.docs) {
    const empId = empDoc.id;

    await db
      .collection("attendance")
      .doc("event")
      .collection("records")
      .doc(empId)
      .set({
        employee: false,
        spouse: false,
        kid1: false,
        kid2: false,
        kid3: false,
        markedBy: "",
        markedAt: null,
      });

    console.log("Initialized attendance for", empId);
  }

  console.log("All attendance records initialized");
}

initAttendance();
