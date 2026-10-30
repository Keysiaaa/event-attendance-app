import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import { getActiveFirebaseConfig } from './firebaseConfig';

let app = null;
let db = null;
let currentConfigKey = '';

export function getDb() {
  const config = getActiveFirebaseConfig();
  if (!config || !config.projectId || !config.apiKey) {
    return null;
  }

  const configKey = `${config.projectId}_${config.apiKey}`;
  if (db && currentConfigKey === configKey) {
    return db;
  }

  try {
    if (!getApps().length) {
      app = initializeApp(config);
    } else {
      app = getApp();
    }
    db = getFirestore(app);
    currentConfigKey = configKey;
    return db;
  } catch (error) {
    console.error('Error saat inisialisasi Firebase:', error);
    return null;
  }
}

export {
  collection,
  doc,
  setDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  writeBatch
};
