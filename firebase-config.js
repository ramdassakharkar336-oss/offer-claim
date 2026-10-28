const firebaseConfig = {
  apiKey: "AIzaSyCItgOWN7yJa6RNUJDgGPxeoldH52hpkdE",
  authDomain: "khata-fbb76.firebaseapp.com",
  projectId: "khata-fbb76",
  storageBucket: "khata-fbb76.firebasestorage.app",
  messagingSenderId: "451836275438",
  appId: "1:451836275438:web:7c8f125b27c7e31905e1ff"
};

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import {
  getFirestore, collection, doc, getDoc, getDocs, addDoc,
  updateDoc, deleteDoc, query, where
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import {
  getFunctions, httpsCallable
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-functions.js";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

export {
  signInWithEmailAndPassword, signOut, onAuthStateChanged,
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, httpsCallable
};

export function getBalance(customer) {
  let bal = 0;
  (customer.entries || []).forEach(e => {
    bal += (e.type === 'credit' ? Number(e.amount) : -Number(e.amount));
  });
  return bal;
}

export function buildReportText(customer, date) {
  const dayEntries = (customer.entries || []).filter(e => e.date === date);
  let totalCredit = 0, totalPayment = 0;
  const lines = [];
  dayEntries.forEach(e => {
    if (e.type === 'credit') {
      totalCredit += Number(e.amount);
      let d = e.itemName || 'Goods';
      if (e.qty) d += ` — ${e.qty}`;
      if (e.rate) d += ` × ₹${e.rate}`;
      lines.push(`• ${d} = ₹${Number(e.amount).toFixed(0)}`);
    } else {
      totalPayment += Number(e.amount);
      lines.push(`• Payment received = ₹${Number(e.amount).toFixed(0)}`);
    }
  });
  const balance = getBalance(customer);
  let msg = `Namaste ${customer.name},\n\nDate: ${date}\n\n`;
  msg += lines.length ? `Today's transactions:\n${lines.join('\n')}\n` : `No transactions on this date.\n`;
  msg += `\nToday's total credit: ₹${totalCredit.toFixed(0)}\n`;
  msg += `Today's total payment: ₹${totalPayment.toFixed(0)}\n`;
  msg += `--------------------------------\n`;
  msg += `Outstanding balance: ₹${balance.toFixed(0)}\n\nThank you.`;
  return { text: msg, totalCredit, totalPayment, balance };
}