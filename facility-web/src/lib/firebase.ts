import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Same project/config as the mobile app's firebaseConfig.js. The web API
// key is not a secret — authorization is enforced by firestore.rules and
// Firebase Auth custom claims, not by hiding this object.
const firebaseConfig = {
  apiKey: "AIzaSyDHLf9Duani_jfLpntXPO6LbrdmV6QzTg4",
  authDomain: "playbuddy-64a38.firebaseapp.com",
  projectId: "playbuddy-64a38",
  storageBucket: "playbuddy-64a38.firebasestorage.app",
  messagingSenderId: "663943080081",
  appId: "1:663943080081:web:1dad79042c2942c16df730",
  measurementId: "G-3KJWPGTL4B",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
