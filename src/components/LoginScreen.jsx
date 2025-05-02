import React, { useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Mail, Lock, Eye, EyeOff } from 'react-native-feather';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebaseConfig';
import Toast from 'react-native-toast-message';
import estilos from '../../styles/LoginStyles';

const LoginScreen = () => {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);

  const handleBackPress = () => {
    navigation.goBack();
  };

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);

      Toast.show({
        type: 'success',
        position: 'bottom',
        text1: 'Inicio de sesión exitoso',
        text2: 'Bienvenido de nuevo',
      });

      // Redirigir después del login (puedes cambiar a tu Home o Dashboard)
      navigation.navigate('Home');
    } catch (error) {
      let errorMessage = 'Ocurrió un error al iniciar sesión.';

      if (error.code === 'auth/user-not-found') {
        errorMessage = 'El usuario no existe.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'La contraseña es incorrecta.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Correo electrónico inválido.';
      }

      Toast.show({
        type: 'error',
        position: 'bottom',
        text1: 'Error de inicio de sesión',
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
              <ArrowLeft stroke="#F44336" width={24} height={24} />
            </TouchableOpacity>
          </View>

          <View style={estilos.contenido}>
            <View style={estilos.contenedorLogo}>
              <Image
                source={require('../../assets/Logo.png')}
                style={estilos.logo}
              />
              <Text style={estilos.titulo}>Iniciar Sesión</Text>
              <Text style={estilos.subtitulo}>
                Accede a tu cuenta para gestionar tu estacionamiento
              </Text>
            </View>

            <View style={estilos.formulario}>
              <View style={estilos.campoContenedor}>
                <Mail stroke="#F44336" width={20} height={20} />
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
                <Lock stroke="#F44336" width={20} height={20} />
                <TextInput
                  style={estilos.campoTexto}
                  placeholder="Contraseña"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  secureTextEntry={!passwordVisible}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity 
                  style={{ position: 'absolute', right: 10, top: '25%' }}
                  onPress={() => setPasswordVisible(!passwordVisible)}
                >
                  {passwordVisible ? (
                    <EyeOff stroke="#F44336" width={20} height={20} />
                  ) : (
                    <Eye stroke="#F44336" width={20} height={20} />
                  )}
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={estilos.botonIniciar} onPress={handleLogin}>
                <LinearGradient
                  colors={['#FF5252', '#F44336', '#C62828']}
                  style={estilos.botonGradiente}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={estilos.textoBoton}>INICIAR SESIÓN</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <View style={estilos.registroTexto}>
              <Text style={estilos.textoRegistro}>¿No tienes una cuenta?</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={estilos.enlaceRegistro}>Regístrate</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
};

export default LoginScreen;
