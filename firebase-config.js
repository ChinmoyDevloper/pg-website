import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCNQV7dnYxD7zQrfca0g9dYA5e6DhpOwEY",
  authDomain: "my-business-website-82b7b.firebaseapp.com",
  projectId: "my-business-website-82b7b",
  storageBucket: "my-business-website-82b7b.firebasestorage.app",
  messagingSenderId: "485276294307",
  appId: "1:485276294307:web:ac438a98309689415e3316",
};

// False until you paste real values, so the site keeps working with placeholders
export const isConfigured = !firebaseConfig.apiKey.startsWith("PASTE") && !firebaseConfig.appId.startsWith("PASTE");
export const app = isConfigured ? initializeApp(firebaseConfig) : null;
export const db = app ? getFirestore(app) : null;
export const auth = app ? getAuth(app) : null;