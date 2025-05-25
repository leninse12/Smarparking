"use client";

import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
  Animated,
  FlatList,
  TextInput,
  Modal,
  Alert,
  Dimensions,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { signOut } from "firebase/auth";
import { useNavigation } from "@react-navigation/native";
import { auth, firestore, realtimeDB } from "../../firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
// Importamos las dependencias para la ubicación
import * as Location from "expo-location";
import * as Linking from "expo-linking";
import haversine from "haversine";
// Importamos MapView para mostrar el mapa dentro de la app
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import styles from "../../styles/HomeStyles";

const { width, height } = Dimensions.get("window");

// Función para decodificar la polyline de Google Maps
const decodePolyline = (encoded) => {
  let points = [];
  let index = 0, len = encoded.length;
  let lat = 0, lng = 0;

  while (index < len) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    points.push({ latitude: lat / 1E5, longitude: lng / 1E5 });
  }
  return points;
};

const Home = () => {
  const [darkMode, setDarkMode] = useState(true);
  const [nombreUsuario, setNombreUsuario] = useState("");
  const [loading, setLoading] = useState(true);
  const [parkingData, setParkingData] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [placa, setPlaca] = useState("");
  const [userLocation, setUserLocation] = useState(null);
  // Estado para el modal del mapa
  const [mapModalVisible, setMapModalVisible] = useState(false);
  // Estado para almacenar la ruta entre el usuario y el parqueadero
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  // Estado para almacenar información de la ruta
  const [routeInfo, setRouteInfo] = useState({
    distance: "",
    duration: "",
    steps: []
  });
  // Estado para mostrar/ocultar las instrucciones de navegación
  const [showDirections, setShowDirections] = useState(false);
  // Estado para indicar si estamos cargando la ruta
  const [loadingRoute, setLoadingRoute] = useState(false);
  // Add this new state for the custom confirmation modal
  const [confirmationModalVisible, setConfirmationModalVisible] = useState(false);

  const navigation = useNavigation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  // Referencia al mapa para poder hacer zoom automáticamente
  const mapRef = useRef(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          const docRef = doc(firestore, "usuarios", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setNombreUsuario(data.nombre);
          } else {
            console.log("No se encontró el documento!");
          }
        }
      } catch (error) {
        console.log("Error al obtener el usuario:", error);
      }
    };

    const getLocation = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.log("Permiso de ubicación denegado");
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    };

    fetchUserData();
    getLocation();

    const parkingRef = realtimeDB.ref("parqueadero/universidad");
    parkingRef.on("value", (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setParkingData(data);
      }
      setLoading(false);

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    });

    return () => parkingRef.off();
  }, []);

  useEffect(() => {
    const fetchRouteInfo = async () => {
      if (userLocation && parkingData) {
        const parkingLocation = {
          latitude: parseFloat(parkingData.latitud),
          longitude: parseFloat(parkingData.longitud),
        };

        if (!isNaN(parkingLocation.latitude) && !isNaN(parkingLocation.longitude)) {
          try {
            const route = await getRouteCoordinates(userLocation, parkingLocation);
            setRouteCoordinates(route); // Actualizas la ruta para el mapa
          } catch (error) {
            console.error("Error al precargar ruta:", error);
          }
        }
      }
    };

    fetchRouteInfo();
  }, [userLocation, parkingData]);



  // Función para obtener la ruta entre dos puntos usando Google Directions API
  const getRouteCoordinates = async (startLoc, destinationLoc) => {
    try {
      // Reemplaza con tu API Key de Google
      const apiKey = "AIzaSyBbD4IRdx5K7nVY4lU57u1mdgYpoJucOro";
      const mode = "driving";
      const origin = `${startLoc.latitude},${startLoc.longitude}`;
      const destination = `${destinationLoc.latitude},${destinationLoc.longitude}`;
      
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&key=${apiKey}&mode=${mode}&language=es`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status !== "OK") {
        throw new Error(`Error en la respuesta de la API: ${data.status}`);
      }
      
      // Extraer información de la ruta
      const route = data.routes[0];
      const leg = route.legs[0];
      
      // Guardar información de distancia y duración
      setRouteInfo({
        distance: leg.distance.text,
        duration: leg.duration.text,
        steps: leg.steps.map(step => ({
          instruction: step.html_instructions.replace(/<[^>]*>/g, ''), // Eliminar etiquetas HTML
          distance: step.distance.text,
          duration: step.duration.text
        }))
      });
      
      // Decodificar la polyline para obtener los puntos de la ruta
      const points = route.overview_polyline.points;
      const decodedPoints = decodePolyline(points);
      
      return decodedPoints;
    } catch (error) {
      console.error("Error obteniendo ruta:", error);
      // Si hay un error, volvemos a la simulación de ruta
      return fallbackRouteSimulation(startLoc, destinationLoc);
    }
  };

  // Función de simulación de ruta en caso de error
  const fallbackRouteSimulation = (startLoc, destinationLoc) => {
    // Implementa aquí la lógica para simular una ruta entre startLoc y destinationLoc
    // Esto podría ser simplemente retornar una línea recta entre los dos puntos
    const steps = 10; // Número de puntos en la simulación
    const latDiff = (destinationLoc.latitude - startLoc.latitude) / steps;
    const lngDiff = (destinationLoc.longitude - startLoc.longitude) / steps;

    const simulatedRoute = [];
    for (let i = 0; i <= steps; i++) {
      simulatedRoute.push({
        latitude: startLoc.latitude + latDiff * i,
        longitude: startLoc.longitude + lngDiff * i,
      });
    }

    return simulatedRoute;
  };

  // Función para mostrar el mapa con la ruta
  const showRouteMap = async () => {
    if (!userLocation || !parkingData) {
      Alert.alert("Error", "No se puede mostrar la ruta en este momento");
      return;
    }
    
    const parkingLocation = {
      latitude: parseFloat(parkingData.latitud),
      longitude: parseFloat(parkingData.longitud),
    };
    
    if (isNaN(parkingLocation.latitude) || isNaN(parkingLocation.longitude)) {
      Alert.alert("Error", "Coordenadas del parqueadero no válidas");
      return;
    }
    
    // Mostramos un indicador de carga
    setLoadingRoute(true);
    
    try {
      // Obtenemos la ruta y la información
      const route = await getRouteCoordinates(userLocation, parkingLocation);
      setRouteCoordinates(route);
      
      // Mostramos el modal con el mapa
      setMapModalVisible(true);
    } catch (error) {
      console.error("Error al obtener la ruta:", error);
      Alert.alert("Error", "No se pudo obtener la ruta en este momento");
    } finally {
      setLoadingRoute(false);
    }
  };

  // Función para navegar a la pantalla del mapa
  const navigateToMapScreen = () => {
    if (!userLocation || !parkingData) {
      Alert.alert("Error", "No se puede mostrar la ruta en este momento");
      return;
    }
    
    const parkingLocation = {
      latitude: parseFloat(parkingData.latitud),
      longitude: parseFloat(parkingData.longitud),
    };
    
    if (isNaN(parkingLocation.latitude) || isNaN(parkingLocation.longitude)) {
      Alert.alert("Error", "Coordenadas del parqueadero no válidas");
      return;
    }
    
    // Navegamos a la pantalla del mapa pasando los datos necesarios
    navigation.navigate("MapScreen", {
      userLocation,
      parkingLocation,
      parkingName: parkingData.nombre,
    });
  };

  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      console.log("Usuario deslogueado");
      navigation.replace("Main");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  const handleConfirmPlaca = async () => {
    const user = auth.currentUser;
    if (!placa.trim()) {
      Alert.alert("⚠️ Error", "Por favor ingresa la placa.");
      return;
    }
    try {
      await realtimeDB.ref(`usuarios/${user.uid}`).update({ placa: placa });
      const userDocRef = doc(firestore, "usuarios", user.uid);
      await updateDoc(userDocRef, { placa: placa });

      Alert.alert("✅ Éxito", "Placa añadida correctamente.");
      setModalVisible(false);
      setPlaca("");
      
      navigation.replace("ParkReserva");
    } catch (error) {
      console.error("Error al guardar la placa:", error);
      Alert.alert("❌ Error", "No se pudo guardar la placa.");
    }
  };

  const getDistance = () => {
    if (routeInfo.distance) {
      return routeInfo.distance;
    };
    return "--";
  };

  const openGoogleMaps = () => {
    if (!parkingData) return;
    const safeLat = parseFloat(parkingData.latitud);
    const safeLng = parseFloat(parkingData.longitud);
    
    if (isNaN(safeLat) || isNaN(safeLng)) {
      Alert.alert("Error", "Coordenadas del parqueadero no válidas");
      return;
    }
    
    const url = `https://www.google.com/maps/dir/?api=1&destination=${safeLat},${safeLng}&travelmode=driving`;
    Linking.openURL(url);
  };

  // Replace the handleReservePress function with this improved version
  const handleReservePress = () => {
    setConfirmationModalVisible(true);
  };

  // Add this new function to handle the confirmation
  const handleConfirmation = (confirmed) => {
    setConfirmationModalVisible(false);
    if (confirmed) {
      setModalVisible(true);
    }
  };

  const themeStyles = darkMode ? styles.darkTheme : styles.lightTheme;
  const themeColor = darkMode ? "#7BA05B" : "#6C63FF";

  if (loading) {
    return (
      <View style={[styles.loadingContainer, themeStyles.background]}>
        <ActivityIndicator size="large" color={themeColor} />
        <Text style={[styles.loadingText, themeStyles.text]}>Cargando...</Text>
      </View>
    );
  }

  const filteredParking = parkingData
    ? [
        {
          id: 1,
          name: parkingData.nombre,
          estacionamientos: parkingData.estacionamiento,
          pago: parkingData.pago,
          privado: parkingData.privado,
        },
      ]
    : [];

  const renderParkingItem = ({ item }) => {
    const espaciosLibres = Object.values(item.estacionamientos || {}).filter(
      (espacio) => espacio.ocupado === false
    ).length;

    const badgeColor =
      item.privado
        ? darkMode
          ? "#4CAF5020"
          : "#6C63FF20"
        : darkMode
        ? "#8BC34A20"
        : "#3F51B520";

    const badgeTextColor = item.privado
      ? darkMode
        ? "#4CAF50"
        : "#6C63FF"
      : darkMode
      ? "#8BC34A"
      : "#3F51B5";

    const isFull = espaciosLibres === 0;
    const distancia = routeInfo.distance ? routeInfo.distance : getDistance();


    return (
      <View style={[styles.parkingCard, themeStyles.card]}>
        <View style={styles.parkingCardContent}>
          <View style={styles.parkingCardHeader}>
            <Text style={[styles.parkingName, themeStyles.text]} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={[styles.parkingBadge, { backgroundColor: badgeColor }]}>
              <Text style={[styles.parkingBadgeText, { color: badgeTextColor }]}>
                {item.privado ? "Privado" : "Público"}
              </Text>
            </View>
          </View>

          {/* Fila de detalles rediseñada */}
          <View style={styles.parkingDetailsRow}>
            {/* Espacios disponibles */}
            <View style={[styles.parkingDetail]}>
              <MaterialCommunityIcons
                name="car-multiple"
                size={16}
                color={themeColor}
              />
              <Text style={[styles.parkingDetailText, themeStyles.subText]}>
                {espaciosLibres} espacios
              </Text>
            </View>
            
            {/* Tipo de pago */}
            <View style={[styles.parkingDetail]}>
              <MaterialCommunityIcons
                name={item.pago ? "currency-usd" : "cash-remove"}
                size={16}
                color={item.pago ? themeColor : darkMode ? "#8BC34A" : "#4CAF50"}
              />
              <Text
                style={[
                  styles.parkingDetailText,
                  item.pago
                    ? themeStyles.subText
                    : { color: darkMode ? "#8BC34A" : "#4CAF50", fontWeight: "500" },
                ]}
              >
                {item.pago ? "Pago" : "Gratis"}
              </Text>
            </View>
            
            {/* Distancia - Ahora separada con su propio icono */}
            <View style={[styles.parkingDetail]}>
              <MaterialCommunityIcons
                name="map-marker-distance"
                size={16}
                color="#FF6B6B"
              />
              <Text
                style={[
                  styles.parkingDetailText,
                  { color: "#FF6B6B", fontWeight: "500" },
                ]}
              >
                {distancia}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            disabled={isFull}
            onPress={handleReservePress}
            style={[
              styles.reserveButton,
              {
                backgroundColor: isFull ? "#888" : themeColor,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
              },
            ]}
          >
            <Text style={styles.reserveButtonText}>
              {isFull ? "Sin espacio" : "Reservar"}
            </Text>
            <MaterialCommunityIcons
              name={isFull ? "lock" : "arrow-right"}
              size={16}
              color="#FFFFFF"
              style={styles.buttonIcon}
            />
          </TouchableOpacity>

          {/* Botón Ver recorrido */}
          <TouchableOpacity
            onPress={showRouteMap}
            disabled={loadingRoute}
            style={[
              styles.reserveButton,
              {
                backgroundColor: "#9C821A",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                marginTop: 10,
                opacity: loadingRoute ? 0.7 : 1,
              },
            ]}
          >
            {loadingRoute ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.reserveButtonText}>Cargando ruta...</Text>
              </>
            ) : (
              <>
                <Text style={styles.reserveButtonText}>Ver recorrido</Text>
                <MaterialCommunityIcons
                  name="map"
                  size={16}
                  color="#FFFFFF"
                  style={styles.buttonIcon}
                />
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, themeStyles.background]}>
      <StatusBar barStyle={darkMode ? "light-content" : "dark-content"} />

      <View style={styles.header}>
        <Text style={[styles.headerTitle, themeStyles.text]}>Smart Parking</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity onPress={toggleTheme} style={[styles.iconButton, themeStyles.iconButton]}>
            {darkMode ? (
              <Feather name="sun" size={22} color="#FFD700" />
            ) : (
              <Feather name="moon" size={22} color="#333333" />
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={[styles.iconButton, themeStyles.iconButton]}>
            <Feather name="log-out" size={22} color="#e74c3c" />
          </TouchableOpacity>
        </View>
      </View>

      <Animated.View style={[styles.welcomeContainer, { opacity: fadeAnim }]}>
        <Text style={[styles.welcomeText, themeStyles.text]}>
          Bienvenido{" "}
          <Text style={[styles.userName, { color: themeColor }]}>{nombreUsuario}</Text>{" "}
        </Text>
      </Animated.View>

      <Animated.View style={[styles.sectionContainer, { opacity: fadeAnim }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, themeStyles.text]}>Parqueaderos</Text>
          <Text style={[styles.parkingCount, themeStyles.subText]}>
            {filteredParking.length} disponible
          </Text>
        </View>

        <FlatList
          data={filteredParking}
          renderItem={renderParkingItem}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.parkingListContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons
                name="car-off"
                size={50}
                color={darkMode ? "#FFFFFF40" : "#00000040"}
              />
              <Text style={[styles.emptyText, themeStyles.text]}>
                No hay parqueaderos disponibles
              </Text>
            </View>
          }
        />
      </Animated.View>

      {/* Modal para añadir placa */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: darkMode ? "#1E1E1E" : "#FFF",
              borderRadius: 12,
              padding: 20,
              width: "100%",
            }}
          >
            <Text
              style={{
                color: darkMode ? "#FFF" : "#333",
                fontSize: 18,
                fontWeight: "bold",
                marginBottom: 15,
              }}
            >
              Ingresa la placa del vehículo
            </Text>
            <TextInput
              value={placa}
              onChangeText={setPlaca}
              placeholder="Ej: AAA 123"
              placeholderTextColor="#999"
              style={{
                borderWidth: 1,
                borderColor: "#ccc",
                borderRadius: 8,
                padding: 10,
                color: darkMode ? "#FFF" : "#333",
              }}
            />
            <TouchableOpacity
              onPress={handleConfirmPlaca}
              style={[
                styles.reserveButton,
                { marginTop: 20, backgroundColor: themeColor },
              ]}
            >
              <Text style={styles.reserveButtonText}>Añadir</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal para mostrar el mapa con la ruta */}
      <Modal
        visible={mapModalVisible}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setMapModalVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: darkMode ? "#121212" : "#f5f5f5" }}>
          <View style={{ 
            flexDirection: "row", 
            justifyContent: "space-between", 
            alignItems: "center", 
            padding: 15,
            backgroundColor: darkMode ? "#1E1E1E" : "#FFFFFF",
            borderBottomWidth: 1,
            borderBottomColor: darkMode ? "#333" : "#e0e0e0"
          }}>
            <TouchableOpacity onPress={() => setMapModalVisible(false)}>
              <Feather name="arrow-left" size={24} color={darkMode ? "#FFFFFF" : "#333333"} />
            </TouchableOpacity>
            <Text style={{ 
              fontSize: 18, 
              fontWeight: "bold", 
              color: darkMode ? "#FFFFFF" : "#333333" 
            }}>
              Ruta al parqueadero
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={{ flex: 1 }}>
            {userLocation && parkingData && (
              <MapView
                ref={mapRef}
                style={{ flex: 1 }}
                provider={PROVIDER_GOOGLE}
                initialRegion={{
                  latitude: userLocation.latitude,
                  longitude: userLocation.longitude,
                  latitudeDelta: 0.02,
                  longitudeDelta: 0.02,
                }}
                onMapReady={() => {
                  // Ajustar el zoom para mostrar tanto el origen como el destino
                  if (mapRef.current && routeCoordinates.length > 0) {
                    mapRef.current.fitToCoordinates(
                      routeCoordinates,
                      {
                        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
                        animated: true,
                      }
                    );
                  }
                }}
              >
                {/* Marcador para la ubicación del usuario */}
                <Marker
                  coordinate={userLocation}
                  title="Tu ubicación"
                  description="Estás aquí"
                >
                  <View style={{
                    backgroundColor: "#4285F4",
                    borderRadius: 50,
                    padding: 5,
                    borderWidth: 2,
                    borderColor: "#FFFFFF"
                  }}>
                    <MaterialCommunityIcons name="account" size={20} color="#FFFFFF" />
                  </View>
                </Marker>

                {/* Marcador para la ubicación del parqueadero */}
                <Marker
                  coordinate={{
                    latitude: parseFloat(parkingData.latitud),
                    longitude: parseFloat(parkingData.longitud),
                  }}
                  title={parkingData.nombre}
                  description={`Espacios disponibles: ${
                    Object.values(parkingData.estacionamiento || {}).filter(
                      (espacio) => espacio.ocupado === false
                    ).length
                  }`}
                >
                  <View style={{
                    backgroundColor: themeColor,
                    borderRadius: 50,
                    padding: 5,
                    borderWidth: 2,
                    borderColor: "#FFFFFF"
                  }}>
                    <MaterialCommunityIcons name="parking" size={20} color="#FFFFFF" />
                  </View>
                </Marker>

                {/* Línea de la ruta */}
                {routeCoordinates.length > 0 && (
                  <Polyline
                    coordinates={routeCoordinates}
                    strokeWidth={4}
                    strokeColor="#4285F4"
                  />
                )}
              </MapView>
            )}
          </View>

          {/* Panel de información */}
          <View style={{
            backgroundColor: darkMode ? "#1E1E1E" : "#FFFFFF",
            borderTopWidth: 1,
            borderTopColor: darkMode ? "#333" : "#e0e0e0",
            maxHeight: height * 0.4,
          }}>
            <ScrollView style={{ padding: 15 }}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
                <MaterialCommunityIcons name="map-marker-distance" size={20} color={themeColor} />
                <Text style={{ 
                  marginLeft: 10, 
                  fontSize: 16, 
                  color: darkMode ? "#FFFFFF" : "#333333" 
                }}>
                  Distancia: {routeInfo.distance || getDistance() + " km"}
                </Text>
              </View>
              
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
                <MaterialCommunityIcons name="clock-outline" size={20} color={themeColor} />
                <Text style={{ 
                  marginLeft: 10, 
                  fontSize: 16, 
                  color: darkMode ? "#FFFFFF" : "#333333" 
                }}>
                  Tiempo estimado: {routeInfo.duration || Math.ceil(getDistance() * 3) + " min"}
                </Text>
              </View>
              
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 15 }}>
                <MaterialCommunityIcons 
                  name={parkingData?.pago ? "currency-usd" : "cash-remove"} 
                  size={20} 
                  color={parkingData?.pago ? themeColor : "#4CAF50"} 
                />
                <Text style={{ 
                  marginLeft: 10, 
                  fontSize: 16, 
                  color: darkMode ? "#FFFFFF" : "#333333" 
                }}>
                  {parkingData?.pago ? "Parqueadero de pago" : "Parqueadero gratuito"}
                </Text>
              </View>

              {/* Botón para ver instrucciones detalladas */}
              {routeInfo.steps && routeInfo.steps.length > 0 && (
                <TouchableOpacity
                  onPress={() => setShowDirections(!showDirections)}
                  style={{
                    backgroundColor: darkMode ? "#333" : "#f0f0f0",
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 10,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between"
                  }}
                >
                  <Text style={{ color: darkMode ? "#FFFFFF" : "#333333", fontWeight: "500" }}>
                    {showDirections ? "Ocultar indicaciones" : "Ver indicaciones"}
                  </Text>
                  <MaterialCommunityIcons 
                    name={showDirections ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color={darkMode ? "#FFFFFF" : "#333333"} 
                  />
                </TouchableOpacity>
              )}

              {/* Instrucciones de navegación */}
              {showDirections && routeInfo.steps && routeInfo.steps.length > 0 && (
                <View style={{ marginBottom: 15 }}>
                  {routeInfo.steps.map((step, index) => (
                    <View key={index} style={{ 
                      flexDirection: "row", 
                      padding: 10, 
                      borderBottomWidth: index < routeInfo.steps.length - 1 ? 1 : 0, 
                      borderBottomColor: darkMode ? "#333" : "#eee" 
                    }}>
                      <MaterialCommunityIcons 
                        name="arrow-right" 
                        size={16} 
                        color={themeColor} 
                        style={{ marginRight: 5, marginTop: 2 }} 
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: darkMode ? "#FFFFFF" : "#333333" }}>
                          {step.instruction}
                        </Text>
                        <Text style={{ 
                          color: darkMode ? "#AAAAAA" : "#666666", 
                          fontSize: 12, 
                          marginTop: 2 
                        }}>
                          {step.distance} · {step.duration}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              <TouchableOpacity
                onPress={() => {
                  setMapModalVisible(false);
                  handleReservePress();
                }}
                style={{
                  backgroundColor: themeColor,
                  borderRadius: 8,
                  padding: 12,
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "center",
                  marginTop: 5,
                  marginBottom: 10,
                }}
              >
                <Text style={{ color: "#FFFFFF", fontWeight: "bold", fontSize: 16 }}>
                  Reservar ahora
                </Text>
                <MaterialCommunityIcons name="arrow-right" size={20} color="#FFFFFF" style={{ marginLeft: 5 }} />
              </TouchableOpacity>
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Custom confirmation modal */}
      <Modal
        visible={confirmationModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmationModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.6)",
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: darkMode ? "#1E1E1E" : "#FFF",
              borderRadius: 16,
              padding: 24,
              width: "100%",
              maxWidth: 400,
              alignItems: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
              elevation: 5,
            }}
          >
            <View style={{ 
              width: 60, 
              height: 60, 
              borderRadius: 30, 
              backgroundColor: darkMode ? "#2A2A2A" : "#F0F0F0",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 16
            }}>
              <MaterialCommunityIcons
                name="shield-alert"
                size={30}
                color={themeColor}
              />
            </View>
            
            <Text
              style={{
                color: darkMode ? "#FFF" : "#333",
                fontSize: 20,
                fontWeight: "bold",
                marginBottom: 12,
                textAlign: "center",
              }}
            >
              Información Importante
            </Text>
            
            <Text
              style={{
                color: darkMode ? "#DDD" : "#555",
                fontSize: 16,
                textAlign: "center",
                marginBottom: 24,
                lineHeight: 22,
              }}
            >
              Este es un parqueadero privado que pertenece a la{" "}
              <Text style={{ fontWeight: "bold", color: themeColor }}>
                UNIVERSIDAD COOPERATIVA DE COLOMBIA
              </Text>{" "}
              y se requiere un carnet de acceso para poder ingresar al parqueadero.
            </Text>
            
            <Text
              style={{
                color: darkMode ? "#FFF" : "#333",
                fontSize: 17,
                fontWeight: "600",
                marginBottom: 20,
                textAlign: "center",
              }}
            >
              ¿Cuentas con ese carnet?
            </Text>
            
            <View style={{ 
              flexDirection: "row", 
              width: "100%", 
              justifyContent: "space-between" 
            }}>
              <TouchableOpacity
                onPress={() => handleConfirmation(false)}
                style={{
                  flex: 1,
                  backgroundColor: darkMode ? "#333" : "#E0E0E0",
                  borderRadius: 8,
                  padding: 12,
                  marginRight: 8,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: darkMode ? "#FFF" : "#555",
                    fontWeight: "600",
                    fontSize: 16,
                  }}
                >
                  No
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => handleConfirmation(true)}
                style={{
                  flex: 1,
                  backgroundColor: themeColor,
                  borderRadius: 8,
                  padding: 12,
                  marginLeft: 8,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: "#FFF",
                    fontWeight: "600",
                    fontSize: 16,
                  }}
                >
                  Sí
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default Home;