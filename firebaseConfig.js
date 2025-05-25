import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/database';

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

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Exportar las instancias
export const auth = firebase.auth();
export const firestore = firebase.firestore();
export const realtimeDB = firebase.database();
