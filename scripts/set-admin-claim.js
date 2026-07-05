#!/usr/bin/env node

/**
 * Grants the `admin` custom claim to a Firebase Auth user so they can sign
 * in to facility-web's admin dashboard and manage facility approvals.
 *
 * Usage:
 *   node scripts/set-admin-claim.js <email>
 *
 * Requires a service account key for the Firebase project. Download one
 * from Project Settings > Service Accounts > Generate new private key,
 * save it as serviceAccountKey.json in the repo root (gitignored), or
 * point GOOGLE_APPLICATION_CREDENTIALS at it instead.
 *
 * The affected user must sign out/in (or call getIdToken(true)) before the
 * new claim shows up in their ID token.
 */

const path = require("path");
const admin = require("firebase-admin");

const email = process.argv[2];
if (!email) {
  console.error("Usage: node scripts/set-admin-claim.js <email>");
  process.exit(1);
}

const serviceAccountPath = path.join(__dirname, "..", "serviceAccountKey.json");
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  admin.initializeApp({ credential: admin.credential.cert(require(serviceAccountPath)) });
} else {
  admin.initializeApp({ credential: admin.credential.applicationDefault() });
}

async function main() {
  const user = await admin.auth().getUserByEmail(email);
  await admin.auth().setCustomUserClaims(user.uid, { admin: true });
  console.log(`Granted admin claim to ${email} (uid: ${user.uid}).`);
  console.log("They must sign out and back in for the claim to take effect.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
