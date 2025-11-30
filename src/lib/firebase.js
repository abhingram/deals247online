import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAJicwveM21dbM42FDYFiP8xzqstp2kGVE",
  authDomain: "deals247.firebaseapp.com",
  projectId: "deals247",
  storageBucket: "deals247.firebasestorage.app",
  messagingSenderId: "156098144480",
  appId: "1:156098144480:web:01c0592318a404d1034885",
  measurementId: "G-7HK38RC56W"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
export default app;