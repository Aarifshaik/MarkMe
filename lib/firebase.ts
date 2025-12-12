import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBtOfiXfSKZEYOD9rcSBD3IlpsJhto-0kc",
  authDomain: "employee-event-attendance.firebaseapp.com",
  projectId: "employee-event-attendance",
  storageBucket: "employee-event-attendance.firebasestorage.app",
  messagingSenderId: "418641083904",
  appId: "1:418641083904:web:2c35e0b1c1e73c5c9122e5",
  measurementId: "G-VMJY3L9ZM1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with the new persistence API (no deprecation warning)
// This caches Firestore data locally in IndexedDB with multi-tab support
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

export default app;