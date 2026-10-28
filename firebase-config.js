// firebase-config.js
// यहां अपना Firebase Web config भरें (Firebase Console → Project settings → Your apps से)
// यह config सार्वजनिक होने के लिए डिज़ाइन किया गया है, इसे HTML/JS में रखना सुरक्षित है
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Firebase initialize करें (v10 modular SDK)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where }
  from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export { signInWithEmailAndPassword, signOut, onAuthStateChanged,
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where };

// सहायक फ़ंक्शन: बैलेंस की गणना
export function getBalance(customer) {
  let bal = 0;
  (customer.entries || []).forEach(e => {
    bal += (e.type === 'credit' ? Number(e.amount) : -Number(e.amount));
  });
  return bal;
}

// सहायक फ़ंक्शन: दैनिक रिपोर्ट टेक्स्ट उत्पन्न करें
export function buildReportText(customer, date) {
  const dayEntries = (customer.entries || []).filter(e => e.date === date);
  let totalCredit = 0, totalPayment = 0;
  const lines = [];
  dayEntries.forEach(e => {
    if (e.type === 'credit') {
      totalCredit += Number(e.amount);
      let d = e.itemName || 'सामान';
      if (e.qty) d += ` ${e.qty}`;
      if (e.rate) d += ` × ₹${e.rate}`;
      lines.push(`• ${d} = ₹${Number(e.amount).toFixed(0)}`);
    } else {
      totalPayment += Number(e.amount);
      lines.push(`• जमा = ₹${Number(e.amount).toFixed(0)}`);
    }
  });
  const balance = getBalance(customer);
  let msg = `नमस्ते ${customer.name} जी,\n\n📅 दिनांक: ${date}\n\n`;
  msg += lines.length ? `आज का हिसाब:\n${lines.join('\n')}\n` : `आज कोई लेन-देन नहीं।\n`;
  msg += `\nआज कुल उधारी: ₹${totalCredit.toFixed(0)}\n`;
  msg += `आज कुल जमा: ₹${totalPayment.toFixed(0)}\n`;
  msg += `--------------------------\nकुल बकाया: ₹${balance.toFixed(0)}\n\nधन्यवाद 🙏`;
  return { text: msg, totalCredit, totalPayment, balance };
}