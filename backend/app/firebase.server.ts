///home/alex/ref-restore/mf-backend-restore/app/firebase.server.ts

import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';

// The Firebase Admin SDK automatically finds the default credentials
// in the Cloud Run environment. No config is needed.
if (getApps().length === 0) {
  initializeApp();
}

export const db = getFirestore();
export { FieldValue, Timestamp }; // Export these for use in other files
