import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/database';

const firebaseConfig = {
  apiKey: "apikey",
  authDomain: "prueba",
  projectId: "prueba",
  storageBucket: "firebase",
  messagingSenderId: "id",
  appId: "id",
  measurementId: "id",
  databaseURL: "https:"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Exportar las instancias
export const auth = firebase.auth();
export const firestore = firebase.firestore();
export const realtimeDB = firebase.database();
