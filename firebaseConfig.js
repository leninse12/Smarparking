import { initializeApp, getApps } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBbD4IRdx5K7nVY4lU57u1mdgYpoJucOro",
  authDomain: "prueba-c7272.firebaseapp.com",
  projectId: "prueba-c7272",
  storageBucket: "prueba-c7272.firebasestorage.app",
  messagingSenderId: "532736619114",
  appId: "1:532736619114:web:6b3c56071c4d41e7325013",
  measurementId: "G-9F18F3PVH7",
  databaseURL: "https://prueba-c7272-default-rtdb.firebaseio.com"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});
export const firestore = getFirestore(app);
export const realtimeDB = getDatabase(app);
