// ============================================================
//  firebase.js  —  shared Firebase initialization (ES module)
// ============================================================
//
//  Loaded as <script type="module"> from both login.html and index.html.
//  Exposes Auth + Firestore so the rest of the app can guard routes and
//  (later) persist user data.
//
//  ┌─────────────────────────────────────────────────────────┐
//  │  SETUP — replace the firebaseConfig values below with     │
//  │  your own project's keys:                                 │
//  │    1. Go to https://console.firebase.google.com           │
//  │    2. Create a project → add a Web app (</>)              │
//  │    3. Copy the config object it gives you here             │
//  │    4. In "Authentication" → Sign-in method, enable         │
//  │       "Email/Password"                                     │
//  │    5. In "Firestore Database" → create database            │
//  └─────────────────────────────────────────────────────────┘
//
//  These keys are NOT secrets — Firebase web config is meant to be public.
//  Real protection comes from Firebase Auth + Firestore Security Rules.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getAuth,
    setPersistence,
    browserLocalPersistence,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ---- YOUR CONFIG HERE -------------------------------------------------
const firebaseConfig = {
    apiKey: "AIzaSyBV-4_jCPh-4R-lyH-UwsOTkrL0vikQIjc",
    authDomain: "nutrigpt-535e7.firebaseapp.com",
    projectId: "nutrigpt-535e7",
    storageBucket: "nutrigpt-535e7.firebasestorage.app",
    messagingSenderId: "358778164911",
    appId: "1:358778164911:web:d5d9dbe291e7f38464a65a",
    measurementId: "G-GZBT1GY4HW",
};
// ----------------------------------------------------------------------

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

// Keep the session in localStorage so a logged-in user stays signed in
// across reloads and tabs (this is what "token in localStorage" maps to
// with the Firebase SDK — it manages the token for us).
await setPersistence(auth, browserLocalPersistence);

// True once the *real* Firebase keys have been filled in. Lets the UI show
// a friendly "configure Firebase" hint instead of throwing during setup.
export const isFirebaseConfigured = !firebaseConfig.apiKey.startsWith("YOUR_");

// ============================================================
//  FIRESTORE DATA MODEL  (for later — nothing writes here yet)
// ============================================================
//
//  Everything is namespaced under the signed-in user's uid so each
//  user only ever reads/writes their own documents:
//
//    users/{uid}                         → profile
//        { displayName, email, goalCalories, weightGoal,
//          heightCm, sex, activityLevel, createdAt, updatedAt }
//
//    users/{uid}/meals/{mealId}          → a saved meal / food entry
//        { name, grams, calories, protein, carbs, fat, loggedAt }
//
//    users/{uid}/dailyLogs/{yyyy-mm-dd}  → per-day calorie roll-up
//        { date, totalCalories, protein, carbs, fat,
//          foods: [...], completed }
//
//    users/{uid}/weightHistory/{entryId} → weight over time
//        { weightKg, recordedAt }
//
//    users/{uid}/waterIntake/{yyyy-mm-dd} → water for the day
//        { date, glasses, ml }
//
//    users/{uid}/chatHistory/{msgId}     → AI chat transcript
//        { role, content, createdAt }
//
//  Collection-name constants so app code never hard-codes strings:
export const COLLECTIONS = {
    users: "users",
    meals: "meals",
    dailyLogs: "dailyLogs",
    weightHistory: "weightHistory",
    waterIntake: "waterIntake",
    chatHistory: "chatHistory",
};
