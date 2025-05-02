import React, { useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Mail, Lock, User, Eye, EyeOff } from 'react-native-feather';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, firestore } from '../../firebaseConfig';
import Toast from 'react-native-toast-message';
import { doc, setDoc } from 'firebase/firestore';
import { getDatabase, ref, set } from 'firebase/database'; // ✅ Importa Realtime Database

import estilos from '../../styles/Registerstyles.js';

const { width } = Dimensions.get('window');

const RegisterScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const navigation = useNavigation();

  const handleBackPress = () => {
    navigation.goBack();
  };

  const handleRegister = async () => {
    try {
      // ✅ Crear el usuario en Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // ✅ Guardar en Firestore
      await setDoc(doc(firestore, 'usuarios', user.uid), {
        nombre: name,
        correo: email,
        creadoEn: new Date(),
      });

      // ✅ Guardar en Realtime Database
      const database = getDatabase();
      await set(ref(database, 'usuarios/' + user.uid), {
        nombre: name,
        correo: email,
        creadoEn: new Date().toISOString(),
      });

      Toast.show({
        type: 'success',
        position: 'bottom',
        text1: 'Registro exitoso',
        text2: '¡Bienvenido a la app!',
      });

      navigation.navigate('Login');
    } catch (error) {
      let errorMessage = 'Hubo un error al registrarte.';

      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'El correo electrónico ya está en uso.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'El correo electrónico no es válido.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'La contraseña debe tener al menos 6 caracteres.';
      }

      Toast.show({
        type: 'error',
        position: 'bottom',
        text1: 'Error de registro',
        text2: errorMessage,
      });
    }
  };

  return (
    <>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={estilos.contenedor}>
        <LinearGradient colors={['#1A2930', '#0A1520']} style={estilos.fondo} />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={estilos.tecladoEvitable}
        >
          <View style={estilos.encabezado}>
            <TouchableOpacity style={estilos.botonAtras} onPress={handleBackPress}>
              <ArrowLeft stroke="#5ADB5A" width={24} height={24} />
            </TouchableOpacity>
          </View>

          <View style={estilos.contenido}>
            <View style={estilos.contenedorLogo}>
              <Image
                source={require('../../assets/Logo.png')}
                style={estilos.logo}
              />
              <Text style={estilos.titulo}>Crear Cuenta</Text>
              <Text style={estilos.subtitulo}>Regístrate para comenzar a usar la app</Text>
            </View>

            <View style={estilos.formulario}>
              <View style={estilos.campoContenedor}>
                <User stroke="#4CAF50" width={20} height={20} />
                <TextInput
                  style={estilos.campoTexto}
                  placeholder="Nombre completo"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  value={name}
                  onChangeText={setName}
                />
              </View>

              <View style={estilos.campoContenedor}>
                <Mail stroke="#4CAF50" width={20} height={20} />
                <TextInput
                  style={estilos.campoTexto}
                  placeholder="Correo electrónico"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

              <View style={estilos.campoContenedor}>
                <Lock stroke="#4CAF50" width={20} height={20} />
                <TextInput
                  style={estilos.campoTexto}
                  placeholder="Contraseña"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  secureTextEntry={!passwordVisible}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity 
                  style={{ position: 'absolute', right: 10, top: '35%' }} 
                  onPress={() => setPasswordVisible(!passwordVisible)}
                >
                  {passwordVisible ? (
                    <EyeOff stroke="#4CAF50" width={20} height={20} />
                  ) : (
                    <Eye stroke="#4CAF50" width={20} height={20} />
                  )}
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={estilos.botonRegistro} onPress={handleRegister}>
                <LinearGradient
                  colors={['#5ADB5A', '#4CAF50', '#3B8C3B']}
                  style={estilos.botonGradiente}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={estilos.textoBoton}>REGISTRARSE</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <View style={estilos.registroTexto}>
              <Text style={estilos.textoRegistro}>¿Ya tienes una cuenta?</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={estilos.enlaceRegistro}>Inicia sesión</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
};

export default RegisterScreen;
