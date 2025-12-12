// Temporary script to check Firestore data availability
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBtOfiXfSKZEYOD9rcSBD3IlpsJhto-0kc",
  authDomain: "employee-event-attendance.firebaseapp.com",
  projectId: "employee-event-attendance",
  storageBucket: "employee-event-attendance.firebasestorage.app",
  messagingSenderId: "418641083904",
  appId: "1:418641083904:web:2c35e0b1c1e73c5c9122e5",
  measurementId: "G-VMJY3L9ZM1"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkFirestore() {
  console.log('='.repeat(60));
  console.log('FIRESTORE DATA CHECK');
  console.log('='.repeat(60));

  // 1. Check all collections
  console.log('\n📁 Checking employees collection...');
  try {
    const employeesRef = collection(db, 'employees');
    const employeesSnapshot = await getDocs(employeesRef);
    console.log(`✅ Found ${employeesSnapshot.size} employees`);
    
    if (employeesSnapshot.size > 0) {
      // Get unique clusters
      const clusters = new Set();
      employeesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.cluster) clusters.add(data.cluster);
      });
      console.log(`   Clusters found: ${[...clusters].join(', ')}`);
      
      // Show first 3 employees
      console.log('\n   Sample employees:');
      employeesSnapshot.docs.slice(0, 3).forEach(doc => {
        const data = doc.data();
        console.log(`   - ID: ${doc.id}, Name: ${data.name}, Cluster: ${data.cluster}`);
      });
    }
  } catch (error) {
    console.log(`❌ Error reading employees: ${error.message}`);
  }

  // 2. Check attendance collection
  console.log('\n📁 Checking attendance collection...');
  try {
    const attendanceRef = collection(db, 'attendance');
    const attendanceSnapshot = await getDocs(attendanceRef);
    console.log(`✅ Found ${attendanceSnapshot.size} attendance records`);
    
    if (attendanceSnapshot.size > 0) {
      console.log('\n   Sample attendance records:');
      attendanceSnapshot.docs.slice(0, 3).forEach(doc => {
        const data = doc.data();
        console.log(`   - ID: ${doc.id}, Status: ${data.status || 'N/A'}`);
      });
    }
  } catch (error) {
    console.log(`❌ Error reading attendance: ${error.message}`);
  }

  // 3. Check specific cluster query (Vijayawada)
  console.log('\n📁 Checking query for cluster "Vijayawada"...');
  try {
    const employeesRef = collection(db, 'employees');
    const q = query(employeesRef, where('cluster', '==', 'Vijayawada'));
    const snapshot = await getDocs(q);
    console.log(`✅ Found ${snapshot.size} employees in Vijayawada cluster`);
    
    if (snapshot.size > 0) {
      snapshot.docs.slice(0, 3).forEach(doc => {
        const data = doc.data();
        console.log(`   - ID: ${doc.id}, Name: ${data.name}`);
      });
    }
  } catch (error) {
    console.log(`❌ Error querying Vijayawada cluster: ${error.message}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('CHECK COMPLETE');
  console.log('='.repeat(60));
  
  process.exit(0);
}

checkFirestore();
