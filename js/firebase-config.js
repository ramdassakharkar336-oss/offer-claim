// ============================================================
// FIREBASE CONFIGURATION
// ============================================================
// नीचे अपनी फायरबेस कॉन्फ़िगरेशन डालें
// Firebase Console → Project Settings → Your Apps → Config

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getDatabase, ref, onValue, push, set, update, remove, get }
  from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

export { db, auth, ref, onValue, push, set, update, remove, get,
         signInWithEmailAndPassword, signOut, onAuthStateChanged };