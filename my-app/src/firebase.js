import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCor0-b_xMXBXlSjnUo0dd_NQ5DQb0TKEE",
  authDomain: "mru-course-tracker.firebaseapp.com",
  projectId: "mru-course-tracker",
  storageBucket: "mru-course-tracker.firebasestorage.app",
  messagingSenderId: "970407649609",
  appId: "1:970407649609:web:ae9929180eb6f19045fa98"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);