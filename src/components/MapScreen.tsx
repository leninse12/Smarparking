import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  ScrollView,
  FlatList,
} from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import haversine from "haversine";

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

const MapScreen = ({ route, navigation }) => {
  const { userLocation, parkingLocation, parkingName, isPaid } = route.params;
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(true); // Puedes pasar esto como parámetro también
  const [routeInfo, setRouteInfo] = useState({
    distance: "",
    duration: "",
    steps: []
  });
  const [showDirections, setShowDirections] = useState(false);
  
  const mapRef = useRef(null);
  
  useEffect(() => {
    // Obtener la ruta real usando Google Directions API
    getRouteCoordinates(userLocation, parkingLocation)
      .then(route => {
        setRouteCoordinates(route);
        setLoading(false);
      })
      .catch(error => {
        console.error("Error al obtener la ruta:", error);
        // Si hay un error, usamos la simulación de ruta
        const simulatedRoute = fallbackRouteSimulation(userLocation, parkingLocation);
        setRouteCoordinates(simulatedRoute);
        setLoading(false);
      });
  }, []);
  
  // Función para obtener la ruta entre dos puntos usando Google Directions API
  const getRouteCoordinates = async (startLoc, destinationLoc) => {
    try {
      // Reemplaza con tu API Key de Google
      const apiKey = "TU_API_KEY_DE_GOOGLE";
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
      return fallbackRouteSimulation(startLoc, destinationLoc);
    }
  };
  
  const getDistance = () => {
    if (routeInfo.distance) {
      return routeInfo.distance;
    }
    return haversine(userLocation, parkingLocation, { unit: "km" }).toFixed(2) + " km";
  };
  
  const getDuration = () => {
    if (routeInfo.duration) {
      return routeInfo.duration;
    }
    // Estimación simple: 3 minutos por kilómetro
    const distanceInKm = haversine(userLocation, parkingLocation, { unit: "km" });
    return Math.ceil(distanceInKm * 3) + " min";
  };
  
  const themeColor = darkMode ? "#7BA05B" : "#6C63FF";
  
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: darkMode ? "#121212" : "#f5f5f5" }]}>
        <ActivityIndicator size="large" color={themeColor} />
        <Text style={{ color: darkMode ? "#FFFFFF" : "#333333", marginTop: 10 }}>
          Cargando ruta...
        </Text>
      </View>
    );
  }
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: darkMode ? "#121212" : "#f5f5f5" }]}>
      <View style={[styles.header, { backgroundColor: darkMode ? "#1E1E1E" : "#FFFFFF" }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color={darkMode ? "#FFFFFF" : "#333333"} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: darkMode ? "#FFFFFF" : "#333333" }]}>
          Ruta al parqueadero
        </Text>
        <View style={{ width: 24 }} />
      </View>
      
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
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
            <View style={styles.userMarker}>
              <MaterialCommunityIcons name="account" size={20} color="#FFFFFF" />
            </View>
          </Marker>

          {/* Marcador para la ubicación del parqueadero */}
          <Marker
            coordinate={parkingLocation}
            title={parkingName}
            description="Parqueadero"
          >
            <View style={[styles.parkingMarker, { backgroundColor: themeColor }]}>
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
      </View>
      
      {/* Panel de información */}
      <View style={[styles.infoPanel, { backgroundColor: darkMode ? "#1E1E1E" : "#FFFFFF" }]}>
        <ScrollView style={{ padding: 15 }}>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="map-marker-distance" size={20} color={themeColor} />
            <Text style={[styles.infoText, { color: darkMode ? "#FFFFFF" : "#333333" }]}>
              Distancia: {getDistance()}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="clock-outline" size={20} color={themeColor} />
            <Text style={[styles.infoText, { color: darkMode ? "#FFFFFF" : "#333333" }]}>
              Tiempo estimado: {getDuration()}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <MaterialCommunityIcons 
              name={isPaid ? "currency-usd" : "cash-remove"} 
              size={20} 
              color={isPaid ? themeColor : "#4CAF50"} 
            />
            <Text style={[styles.infoText, { color: darkMode ? "#FFFFFF" : "#333333" }]}>
              {isPaid ? "Parqueadero de pago" : "Parqueadero gratuito"}
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
                marginVertical: 15,
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
            onPress={() => navigation.goBack()}
            style={[styles.button, { backgroundColor: themeColor }]}
          >
            <Text style={styles.buttonText}>Volver</Text>
            <MaterialCommunityIcons name="arrow-left" size={20} color="#FFFFFF" style={{ marginLeft: 5 }} />
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  userMarker: {
    backgroundColor: "#4285F4",
    borderRadius: 50,
    padding: 5,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  parkingMarker: {
    borderRadius: 50,
    padding: 5,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  infoPanel: {
    maxHeight: height * 0.4,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  infoText: {
    marginLeft: 10,
    fontSize: 16,
  },
  button: {
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 16,
  },
});

export default MapScreen;