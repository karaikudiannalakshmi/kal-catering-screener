// The Firestore rules require a signed-in, approved staff account for
// writes (see README -> "Set up Firebase" for the rules themselves). These
// admin scripts run from a terminal, not the browser, so they need to sign
// in the same way the app does before they can write anything.
//
// This prompts for the email/password of an already-approved staff account
// (the same login you use on the app itself) right in the terminal. The
// password is typed visibly — there's no hidden-input support in Node's
// built-in readline — so only run this somewhere private, same as you
// would for any other password prompt.

import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

export async function signInAsStaff(app) {
  const auth = getAuth(app);
  const rl = readline.createInterface({ input, output });
  console.log("This script writes to Firestore, which requires an approved staff login.");
  const email = await rl.question("Staff email: ");
  const password = await rl.question("Password: ");
  rl.close();
  await signInWithEmailAndPassword(auth, email.trim(), password);
  console.log(`Signed in as ${email.trim()}.\n`);
}
