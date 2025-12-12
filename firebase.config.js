// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
const analytics = getAnalytics(app);