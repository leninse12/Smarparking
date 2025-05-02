import React, { useRef, useEffect } from 'react';
import { 
  View, 
  Image, 
  TouchableOpacity, 
  Text, 
  SafeAreaView,
  Animated,
  Easing,
  Dimensions,
  StatusBar
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import styles from '../../styles/MainStyle';  

const { width, height } = Dimensions.get('window');

const Main = () => {
  const navigation = useNavigation();
  
  const registerScaleAnim = useRef(new Animated.Value(1)).current;
  const loginScaleAnim = useRef(new Animated.Value(1)).current;
  
  const logoAnim = useRef(new Animated.Value(0)).current;
  const buttonsContainerAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.stagger(300, [
      Animated.timing(logoAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(buttonsContainerAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
    ]).start();
  }, []);

  const animateButtonAndNavigate = (animatedValue, screenName) => {
    Animated.sequence([
      Animated.timing(animatedValue, {
        toValue: 0.92,
        duration: 100,
        useNativeDriver: true,
        easing: Easing.inOut(Easing.ease),
      }),
      Animated.spring(animatedValue, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setTimeout(() => {
        navigation.navigate(screenName);
      }, 50);
    });
  };

  const handleRegisterPress = () => {
    animateButtonAndNavigate(registerScaleAnim, 'Register');
  };

  const handleLoginPress = () => {
    animateButtonAndNavigate(loginScaleAnim, 'Login');
  };

  return (
    <>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#1A2930', '#0A1520']}
          style={styles.background}
        />
        
        {/* Logo con animación */}
        <Animated.View 
          style={[styles.logoContainer, {
            opacity: logoAnim,
            transform: [{ translateY: logoAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [-20, 0]
            }) }]
          }]}
        >
          <Image source={require('../../assets/Logo.png')} style={styles.logo} />
          <Text style={styles.appName}>ParkSmart</Text>
          <Text style={styles.tagline}>Estacionamiento inteligente</Text>
        </Animated.View>

        <Animated.View 
          style={[styles.buttonsContainer, {
            opacity: buttonsContainerAnim,
            transform: [{ translateY: buttonsContainerAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [50, 0]
            }) }]
          }]}
        >
          {/* Botón de Registrarse */}
          <Animated.View style={[styles.buttonWrapper, { transform: [{ scale: registerScaleAnim }] }]}>
            <TouchableOpacity 
              style={styles.buttonTouchable} 
              onPress={handleRegisterPress} 
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#5ADB5A', '#4CAF50', '#3B8C3B']}
                style={styles.trafficButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.buttonInner}>
                  <Text style={styles.buttonText}>Registrarse</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
            <Text style={styles.buttonSubtext}>Nuevo conductor</Text>
          </Animated.View>

          <Animated.View style={[styles.buttonWrapper, { transform: [{ scale: loginScaleAnim }] }]}>
            <TouchableOpacity 
              style={styles.buttonTouchable} 
              onPress={handleLoginPress} 
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#FF5252', '#F44336', '#C62828']}
                style={styles.trafficButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.buttonInner}>
                  <Text style={styles.buttonText}>Iniciar Sesión</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
            <Text style={styles.buttonSubtext}>Conductor registrado</Text>
          </Animated.View>
        </Animated.View>
        
   
        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2024 ParkSmart • Soluciones de estacionamiento</Text>
        </View>
      </SafeAreaView>
    </>
  );
};

export default Main;
