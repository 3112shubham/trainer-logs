import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBEiORqNEEgdGDGbbXtV3V3M2EeOv4WUVs",
  authDomain: "trainer-management-system.firebaseapp.com",
  projectId: "trainer-management-system",
  storageBucket: "trainer-management-system.firebasestorage.app",
  messagingSenderId: "652433620936",
  appId: "1:652433620936:web:d72aaf435980774d5fcafd",
  measurementId: "G-2K1CD79ZKJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;