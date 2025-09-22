//extensions/moodclip-upoader-v3/src/firebase.ts
import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

// Your web app's Firebase configuration from the Firebase console
const firebaseConfig = {
  apiKey: "AIzaSyDhCMMHPEaOLzQY2go0XyHy4yjUkJ78Wpw",
  authDomain: "moodflow-464810.firebaseapp.com",
  projectId: "moodflow-464810",
  storageBucket: "moodflow-464810.firebasestorage.app",
  messagingSenderId: "270455452709",
  appId: "1:270455452709:web:8582c7f90062d43b487bcc",
  measurementId: "G-FY3B3N3JWZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with long-polling to ensure compatibility inside Shopify's iframe
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});
