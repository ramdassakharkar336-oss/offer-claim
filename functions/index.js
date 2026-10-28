const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

// ⚠️ यहाँ अपना ईमेल डालें
const ADMIN_EMAIL = "yashramdassakharkar@gmail.com"; 

exports.createCustomer = functions.https.onCall(async (data, context) => {
  if (!context.auth || context.auth.token.email !== ADMIN_EMAIL) {
    throw new functions.https.HttpsError("permission-denied", "Not authorized");
  }
  const { name, phone, email, password } = data;
  if (!name || !email || !password) {
    throw new functions.https.HttpsError("invalid-argument", "Missing fields");
  }
  if (password.length < 6) {
    throw new functions.https.HttpsError("invalid-argument", "Password too short");
  }
  try {
    const userRecord = await admin.auth().createUser({ email, password });
    await admin.firestore().collection("customers").doc(userRecord.uid).set({
      name, phone, email, entries: [], createdAt: Date.now()
    });
    return { success: true, uid: userRecord.uid };
  } catch (err) {
    if (err.code === "auth/email-already-exists") {
      throw new functions.https.HttpsError("already-exists", "This email is already registered");
    }
    throw new functions.https.HttpsError("internal", err.message);
  }
});

exports.deleteCustomer = functions.https.onCall(async (data, context) => {
  if (!context.auth || context.auth.token.email !== ADMIN_EMAIL) {
    throw new functions.https.HttpsError("permission-denied", "Not authorized");
  }
  const { customerId, email } = data;
  if (!customerId) throw new functions.https.HttpsError("invalid-argument", "Missing customerId");
  try {
    if (email) {
      try {
        const user = await admin.auth().getUserByEmail(email);
        await admin.auth().deleteUser(user.uid);
      } catch (e) { /* auth user not found */ }
    }
    await admin.firestore().collection("customers").doc(customerId).delete();
    return { success: true };
  } catch (err) {
    throw new functions.https.HttpsError("internal", err.message);
  }
});