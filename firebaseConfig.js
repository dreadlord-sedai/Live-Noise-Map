import admin from "firebase-admin";
import fs from "fs";
import path from "path";


const keyPath = path.resolve("./serviceAccountKey.json");
if (!fs.existsSync(keyPath)) {
console.error("Missing serviceAccountKey.json in backend/ — create from Firebase console and place here.");
process.exit(1);
}


const serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf8"));


admin.initializeApp({
credential: admin.credential.cert(serviceAccount)
});


const db = admin.firestore();


export { db };