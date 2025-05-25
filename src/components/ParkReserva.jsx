"use client"

import { useEffect, useRef, useState } from "react"
import { __DEV__ } from "react-native"

import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  StatusBar,
} from "react-native"
import { Image } from "expo-image"

import { auth, firestore, realtimeDB } from "../../firebaseConfig"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { ref, get, update, onValue } from "firebase/database"
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons"
import * as Notifications from "expo-notifications"
import { LinearGradient } from "expo-linear-gradient"

const { width } = Dimensions.get("window")
const SPOT_SIZE = width / 3 - 20

const ParkReserva = () => {
  const [nombre, setNombre] = useState("")
  const [placa, setPlaca] = useState("")
  const [loading, setLoading] = useState(true)
  const [parkingSpots, setParkingSpots] = useState({})
  const [yaReservado, setYaReservado] = useState(false)
  const [puestoReservado, setPuestoReservado] = useState("")
  const [cronometro, setCronometro] = useState(600)
  const [ticketSalida, setTicketSalida] = useState(null)
  const [mostrarAlerta, setMostrarAlerta] = useState(false)
  const [respondioAlerta, setRespondioAlerta] = useState(false)
  const [spotScales, setSpotScales] = useState({})
  const [puestoOcupado, setPuestoOcupado] = useState(false)
  const [ocupadoAnterior, setOcupadoAnterior] = useState(false)
  const [horaOcupadoInicio, setHoraOcupadoInicio] = useState(null)
  const [mostrarMensajeParqueo, setMostrarMensajeParqueo] = useState(false)
  const [gifParqueo, setGifParqueo] = useState(null)

  // Use refs for animations instead of state
  const fadeAnim = useRef(new Animated.Value(0)).current
  const scaleAnim = useRef(new Animated.Value(0.9)).current
  // Nuevas animaciones para alerta y ticket
  const alertAnim = useRef(new Animated.Value(0)).current
  const ticketAnim = useRef(new Animated.Value(0)).current

  // Referencia para el timeout de cancelación
  const cancelTimeoutRef = useRef(null)

  // NUEVO: Almacenar el estado anterior de ocupación
  const [estadoAnterior, setEstadoAnterior] = useState(false)

  // NUEVO: Referencia para el último estado conocido de Firebase
  const ultimoEstadoRef = useRef({
    ocupado: false,
    reservado: false,
    placa: "",
    puesto: "",
  })

  // Animación de entrada al cargar el componente
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start()
  }, []) // Empty dependency array - only run once when component mounts

  // Animación para la alerta
  useEffect(() => {
    if (mostrarAlerta) {
      Animated.timing(alertAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start()
    } else {
      alertAnim.setValue(0)
    }
  }, [mostrarAlerta])

  // Animación para el ticket
  useEffect(() => {
    if (ticketSalida) {
      console.log("🎫 Mostrando ticket de salida:", ticketSalida)
      Animated.timing(ticketAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start()
    } else {
      ticketAnim.setValue(0)
    }
  }, [ticketSalida])

  // Request notifications permissions
  useEffect(() => {
    const requestPermissions = async () => {
      const settings = await Notifications.getPermissionsAsync()
      if (!settings.granted) {
        await Notifications.requestPermissionsAsync()
      }
    }

    requestPermissions()
  }, [])

  // Cleanup effect para evitar memory leaks
  useEffect(() => {
    return () => {
      // Limpiar cualquier timeout pendiente al desmontar el componente
      if (cancelTimeoutRef.current) {
        clearTimeout(cancelTimeoutRef.current)
      }
    }
  }, [])

  // NUEVO: Efecto para detectar cambios en el estado de ocupación
  useEffect(() => {
    console.log("🔄 Estado de ocupación cambió:", {
      anterior: estadoAnterior,
      actual: puestoOcupado,
      horaInicio: horaOcupadoInicio ? new Date(horaOcupadoInicio).toLocaleTimeString() : "no registrada",
    })

    // Si cambia de ocupado a desocupado y tenemos hora de inicio
    if (estadoAnterior === true && puestoOcupado === false && horaOcupadoInicio) {
      console.log("🚗 Detectado cambio de ocupado a desocupado")
      generarTicketSalida()
    }

    // Actualizar el estado anterior
    setEstadoAnterior(puestoOcupado)
  }, [puestoOcupado])

  // Main data fetching effect
  useEffect(() => {
    let unsubscribe = null

    const fetchUserDataYSpots = async () => {
      try {
        const user = auth.currentUser
        if (user) {
          const userRef = doc(firestore, "usuarios", user.uid)
          const userSnap = await getDoc(userRef)
          if (userSnap.exists()) {
            const data = userSnap.data()
            const placaUsuario = data.placa || "N/A"
            setNombre(data.nombre || "Usuario")
            setPlaca(placaUsuario)

            const dbRef = ref(realtimeDB, "parqueadero/universidad/estacionamiento")

            // Set up listener for real-time updates
            unsubscribe = onValue(dbRef, (snapshot) => {
              const spots = snapshot.val() || {}
              setParkingSpots(spots)

              const encontrado = Object.entries(spots).find(
                ([key, v]) => v.placa === placaUsuario && (v.reservado || v.ocupado),
              )

              if (encontrado) {
                const spotKey = encontrado[0]
                const spotData = encontrado[1]

                console.log("📍 Spot encontrado:", spotKey, spotData)

                setYaReservado(true)
                setPuestoReservado(spotKey)

                const nuevoEstado = spotData.ocupado

                // NUEVO: Guardar el último estado conocido
                ultimoEstadoRef.current = {
                  ocupado: nuevoEstado,
                  reservado: spotData.reservado,
                  placa: spotData.placa,
                  puesto: spotKey,
                }

                // Si acaba de ocupar el puesto
                if (nuevoEstado === true && !puestoOcupado) {
                  console.log("🚗 Usuario acaba de ocupar el puesto, registrando hora:", Date.now())
                  setHoraOcupadoInicio(Date.now())
                }

                // Actualizar estado de ocupación
                setPuestoOcupado(nuevoEstado)

                // Check timer for reservation expiration
                if (!nuevoEstado && spotData.horainicio) {
                  const tiempoTranscurrido = Math.floor((Date.now() - spotData.horainicio) / 1000)
                  const tiempoRestante = Math.max(0, 600 - tiempoTranscurrido)
                  setCronometro(tiempoRestante)

                  if (tiempoRestante <= 0) {
                    verificarOcupado()
                  }
                }
              } else {
                // Reset all reservation states
                setYaReservado(false)
                setPuestoReservado("")
                setPuestoOcupado(false)
                setOcupadoAnterior(false)
                setHoraOcupadoInicio(null)
              }

              // Initialize scale animations for all spots
              const escalas = {}
              Object.keys(spots).forEach((key) => {
                escalas[key] = new Animated.Value(1)
              })
              setSpotScales(escalas)
              setLoading(false)
            })
          } else {
            setLoading(false)
            Alert.alert("Error", "No se encontró información del usuario")
          }
        } else {
          setLoading(false)
          Alert.alert("Error", "Usuario no autenticado")
        }
      } catch (error) {
        console.error("Error al cargar datos:", error)
        setLoading(false)
        Alert.alert("Error", "No se pudieron cargar los datos. Intentalo de nuevo.")
      }
    }

    fetchUserDataYSpots()

    // Cleanup function to prevent memory leaks
    return () => {
      if (unsubscribe) {
        // proper way to unsubscribe from firebase listeners
        unsubscribe()
      }
    }
  }, []) // Only run once on component mount - state updates handle the rest

  // Efecto para cargar el GIF según el puesto reservado, pero no mostrarlo automáticamente
  useEffect(() => {
    if (yaReservado && !puestoOcupado) {
      try {
        if (puestoReservado === "A1") {
          // Usar require para cargar los GIFs locales
          setGifParqueo(require("../../assets/gif1.gif"))
        } else if (puestoReservado === "A2") {
          setGifParqueo(require("../../assets/gif2.gif"))
        } else {
          setGifParqueo(require("../../assets/gif3.gif"))
        }
      } catch (error) {
        console.error(" Error al cargar GIF:", error)
        // Intentar cargar un GIF de respaldo en caso de error
        try {
          setGifParqueo(require("../assets/fallback.gif"))
        } catch (fallbackError) {
          console.error(" Error al cargar GIF de respaldo:", fallbackError)
          setGifParqueo(null)
        }
      }
    }
  }, [yaReservado, puestoOcupado, puestoReservado])

  // Timer effect for reservation countdown
  useEffect(() => {
    let timer
    // Only start timer if reserved but not occupied
    if (yaReservado && puestoReservado && !puestoOcupado) {
      timer = setInterval(() => {
        setCronometro((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            verificarOcupado()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [yaReservado, puestoReservado, puestoOcupado, respondioAlerta])

  // Alert auto-cancellation timer
  useEffect(() => {
    let cancelTimer
    if (mostrarAlerta && !puestoOcupado) {
      cancelTimer = setTimeout(() => {
        cancelarReserva()
      }, 60000)
    }
    return () => {
      if (cancelTimer) clearTimeout(cancelTimer)
    }
  }, [mostrarAlerta, puestoOcupado])

  // NUEVO: Función para generar el ticket de salida
  const generarTicketSalida = () => {
    if (!horaOcupadoInicio) {
      console.log("⚠️ No se puede generar ticket: no hay hora de inicio registrada")
      return
    }

    console.log("🎫 Generando ticket de salida con hora de inicio:", new Date(horaOcupadoInicio).toLocaleTimeString())

    const tiempoTotal = Math.floor((Date.now() - horaOcupadoInicio) / 1000)
    const minutos = Math.floor(tiempoTotal / 60)
    const segundos = tiempoTotal % 60

    // Create ticket
    const ticket = {
      nombre,
      estacionamiento: puestoReservado,
      tiempo: `${minutos} minutos y ${segundos} segundos`,
      fecha: new Date().toLocaleString(),
    }

    console.log("🎫 Ticket generado:", ticket)

    // Mostrar ticket
    setTicketSalida(ticket)

    // Limpiar cualquier timeout anterior
    if (cancelTimeoutRef.current) {
      clearTimeout(cancelTimeoutRef.current)
    }

    // Configurar nuevo timeout para cancelar la reserva
    cancelTimeoutRef.current = setTimeout(() => {
      console.log("⏱️ Ejecutando timeout para cancelar reserva")
      setTicketSalida(null)
      cancelarReserva()
        .then(() => {
          console.log("✅ Reserva cancelada automáticamente después de la salida")
        })
        .catch((e) => {
          console.error("❌ Error al cancelar reserva automática:", e)
        })
    }, 10000) // Mostrar ticket por 10 segundos

    // Limpiar hora de inicio
    setHoraOcupadoInicio(null)
  }

  // Function to verify if spot is occupied
  const verificarOcupado = async () => {
    try {
      // Only verify if not occupied
      if (!puestoOcupado && puestoReservado) {
        const snapshot = await get(ref(realtimeDB, `parqueadero/universidad/estacionamiento/${puestoReservado}`))
        const data = snapshot.val()
        if (data && !data.ocupado) {
          setMostrarAlerta(true)
          setRespondioAlerta(false)
          enviarNotificacion()
        }
      }
    } catch (error) {
      console.error("Error al verificar estado:", error)
    }
  }

  // Function to cancel reservation
  const cancelarReserva = async () => {
    try {
      console.log("Ejecutando cancelarReserva para puesto:", puestoReservado)

      if (!puestoReservado) {
        console.log("No hay puesto reservado para cancelar")
        return false
      }

      const updates = {}
      updates[`parqueadero/universidad/estacionamiento/${puestoReservado}/reservado`] = false
      updates[`parqueadero/universidad/estacionamiento/${puestoReservado}/placa`] = ""
      updates[`parqueadero/universidad/estacionamiento/${puestoReservado}/horainicio`] = 0

      console.log("Actualizando Firebase con:", updates)
      await update(ref(realtimeDB), updates)

      // Update Firestore as well
      const user = auth.currentUser
      if (user) {
        console.log("Actualizando Firestore para usuario:", user.uid)
        await updateDoc(doc(firestore, "usuarios", user.uid), {
          parqueadero: "",
          estacionamiento: "",
        })
      }

      setYaReservado(false)
      setPuestoReservado("")
      setPuestoOcupado(false)
      setOcupadoAnterior(false)
      setEstadoAnterior(false)
      setHoraOcupadoInicio(null)
      setMostrarAlerta(false)
      Alert.alert("Reserva cancelada", "Tu reserva fue cancelada.")
      return true
    } catch (error) {
      console.error("Error al cancelar reserva:", error)
      Alert.alert("Error", "No se pudo cancelar la reserva. Intentalo de nuevo.")
      return false
    }
  }

  // Función para mostrar instrucciones de parqueo
  const mostrarComoParquear = () => {
    if (puestoReservado === "A1" || puestoReservado === "A2" || puestoReservado === "A3") {
      setMostrarMensajeParqueo(true)
    } else {
      Alert.alert("Cómo parquear", "Sigue las indicaciones para estacionar correctamente en tu espacio reservado.")
    }
  }

  // Implementar correctamente la función para cerrar ticket y cancelar reserva
  const closeTicketAndCancelReservation = () => {
    console.log("Cerrando ticket y cancelando reserva")
    setTicketSalida(null)

    // Limpiar el timeout automático si existe
    if (cancelTimeoutRef.current) {
      clearTimeout(cancelTimeoutRef.current)
      cancelTimeoutRef.current = null
    }

    // Ahora cancelar la reserva
    cancelarReserva()
      .then(() => {
        console.log("✅ Reserva cancelada manualmente después de cerrar ticket")
      })
      .catch((e) => {
        console.error("❌ Error al cancelar reserva manual:", e)
      })
  }

  // Function to extend reservation
  const mantenerReserva = async () => {
    try {
      setRespondioAlerta(true)
      setMostrarAlerta(false)
      setCronometro(600) // Extend reservation time

      // Update start time in database
      const updates = {}
      updates[`parqueadero/universidad/estacionamiento/${puestoReservado}/horainicio`] = Date.now()
      await update(ref(realtimeDB), updates)

      Alert.alert("Reserva extendida", "Tu reserva ha sido extendida por 3 minutos más")
    } catch (error) {
      console.error("Error al extender reserva:", error)
      Alert.alert("Error", "No se pudo extender la reserva. Inténtalo de nuevo.")
    }
  }

  // Function to confirm reservation
  const confirmReserve = async (spotKey) => {
    try {
      const user = auth.currentUser
      if (!user) {
        Alert.alert("Error", "Usuario no autenticado")
        return
      }

      // Verify spot is still available before reserving
      const spotRef = ref(realtimeDB, `parqueadero/universidad/estacionamiento/${spotKey}`)
      const snapshot = await get(spotRef)
      const spotData = snapshot.val()

      if (spotData && (spotData.ocupado || spotData.reservado)) {
        Alert.alert("Lo sentimos", "Este espacio ya no está disponible")
        return
      }

      const updates = {}
      updates[`parqueadero/universidad/estacionamiento/${spotKey}/reservado`] = true
      updates[`parqueadero/universidad/estacionamiento/${spotKey}/placa`] = placa
      updates[`parqueadero/universidad/estacionamiento/${spotKey}/horainicio`] = Date.now()
      await update(ref(realtimeDB), updates)

      await updateDoc(doc(firestore, "usuarios", user.uid), {
        parqueadero: "universidad",
        puesto: spotKey,
      })

      setPuestoReservado(spotKey)
      setYaReservado(true)
      setPuestoOcupado(false)
      setOcupadoAnterior(false)
      setEstadoAnterior(false)
      setCronometro(600)

      Alert.alert("Reserva exitosa", `Has reservado el espacio ${spotKey} por 10 minutos`)
    } catch (error) {
      console.error("Error al reservar:", error)
      Alert.alert("Error", "No se pudo completar la reserva. Intentalo de nuevo.")
    }
  }

  // Animation helper function
  const animatePress = (ref) => {
    if (!ref) return

    Animated.sequence([
      Animated.timing(ref, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(ref, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start()
  }

  // Format time helper
  const formatTime = (s) => {
    const m = Math.floor(s / 60)
      .toString()
      .padStart(2, "0")
    const sec = (s % 60).toString().padStart(2, "0")
    return `${m}:${sec}`
  }

  // Show exit message helper
  const mostrarMensajeSalida = () => {
    Alert.alert("Salida registrada", "Ya has salido del parqueadero.")
  }

  // Function to send notification
  const enviarNotificacion = async () => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "⏳ Reserva a punto de vencer",
        body: `Tu puesto ${puestoReservado} está reservado pero no ocupado. ¿Deseas mantener la reserva?`,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null, // Immediate
    })
  }

  // Function to release reservation
  const liberarReserva = async () => {
    try {
      if (!yaReservado || !puestoReservado) return

      await cancelarReserva()
      Alert.alert("Reserva liberada", "Has liberado tu espacio de estacionamiento")
    } catch (error) {
      console.error("Error al liberar reserva:", error)
      Alert.alert("Error", "No se pudo liberar la reserva")
    }
  }

  // NUEVO: Función para simular cambio de ocupado a desocupado (para pruebas)
  const simularSalida = async () => {
    try {
      if (!puestoReservado || !puestoOcupado) {
        Alert.alert("No hay puesto ocupado", "Debes tener un puesto ocupado para simular la salida")
        return
      }

      console.log("🚗 Simulando salida del parqueadero")

      // Registrar hora de inicio si no existe
      if (!horaOcupadoInicio) {
        console.log("⏱️ Estableciendo hora de inicio simulada (5 minutos atrás)")
        setHoraOcupadoInicio(Date.now() - 300000) // 5 minutos atrás
      }

      // Simular cambio en Firebase
      const updates = {}
      updates[`parqueadero/universidad/estacionamiento/${puestoReservado}/ocupado`] = false
      console.log("🔄 Actualizando Firebase para simular salida:", updates)
      await update(ref(realtimeDB), updates)

      Alert.alert("Simulación", "Simulando salida del parqueadero")
    } catch (error) {
      console.error("Error al simular salida:", error)
      Alert.alert("Error", "No se pudo simular la salida")
    }
  }

  // NUEVO: Función para forzar la generación del ticket (para pruebas)
  const forzarTicket = () => {
    console.log("🎫 Forzando generación de ticket")

    // Si no hay hora de inicio, establecer una simulada
    if (!horaOcupadoInicio) {
      console.log("⏱️ Estableciendo hora de inicio simulada (10 minutos atrás)")
      setHoraOcupadoInicio(Date.now() - 600000) // 10 minutos atrás
    }

    // Generar ticket
    generarTicketSalida()
  }

  // Loading state
  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#7BA05B" />
        <Text style={styles.loaderText}>Cargando información...</Text>
      </View>
    )
  }

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#121520" />

      {/* Header mejorado */}
      <LinearGradient colors={["#1A1E2E", "#121520"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Smart Parking</Text>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.iconButton}>
              <Feather name="arrow-left" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.contentContainer, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          {/* Tarjeta de usuario mejorada */}
          <LinearGradient
            colors={["#1E2235", "#262A40"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.userInfoCard}
          >
            <View style={styles.userInfoContent}>
              <View style={styles.userAvatar}>
                <Ionicons name="person" size={24} color="#FFFFFF" />
              </View>
              <View style={styles.userDetails}>
                <Text style={styles.welcomeText}>Hola, {nombre}</Text>
                <View style={styles.placaContainer}>
                  <MaterialCommunityIcons name="car" size={16} color="#7BA05B" />
                  <Text style={styles.placaText}>Vehículo: {placa}</Text>
                </View>
              </View>
            </View>
          </LinearGradient>

          {yaReservado ? (
            <Animated.View style={[styles.reservationCard, puestoOcupado ? styles.occupiedCard : styles.reservedCard]}>
              <View style={styles.reservationHeader}>
                <MaterialCommunityIcons
                  name={puestoOcupado ? "car-connected" : "timer-sand"}
                  size={24}
                  color={puestoOcupado ? "#4CAF50" : "#FFC107"}
                />
                <Text style={styles.reservationTitle}>
                  {puestoOcupado ? "Estacionamiento Activo" : "Reserva Activa"}
                </Text>
              </View>

              <View style={styles.reservationDetails}>
                <View style={styles.spotBadge}>
                  <Text style={styles.spotBadgeText}>{puestoReservado}</Text>
                </View>

                <View style={styles.reservationInfo}>
                  {puestoOcupado ? (
                    <Text style={styles.infoText}>Estás utilizando el puesto {puestoReservado}</Text>
                  ) : (
                    <>
                      <Text style={styles.infoText}>Tienes reservado el puesto {puestoReservado}</Text>
                      <View style={styles.timerContainer}>
                        <Ionicons name="time-outline" size={18} color="#FFC107" />
                        <Text style={styles.timerText}>{formatTime(cronometro)}</Text>
                      </View>
                    </>
                  )}
                </View>
              </View>

              <View style={styles.actionButtonsContainer}>
                {!puestoOcupado ? (
                  <>
                    <TouchableOpacity style={styles.actionButton} onPress={liberarReserva}>
                      <MaterialCommunityIcons name="close-circle-outline" size={18} color="#FFFFFF" />
                      <Text style={styles.actionButtonText}>Liberar Reserva</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: "#7BA05B", marginTop: 10 }]}
                      onPress={mostrarComoParquear}
                    >
                      <MaterialCommunityIcons name="help-circle-outline" size={18} color="#FFFFFF" />
                      <Text style={styles.actionButtonText}>Cómo parquear</Text>
                    </TouchableOpacity>
                  </>
                ) : null}
              </View>

              {/* NUEVO: Panel de depuración */}
              <View style={styles.debugPanel}>
                <Text style={styles.debugTitle}>Estado Del puesto</Text>
                <Text style={styles.debugText}>Estado ocupado: {puestoOcupado ? "Sí" : "No"}</Text>

                <Text style={styles.debugText}>
                  Hora inicio: {horaOcupadoInicio ? new Date(horaOcupadoInicio).toLocaleTimeString() : "No registrada"}
                </Text>
              </View>
            </Animated.View>
          ) : (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Espacios Disponibles</Text>
                <View style={styles.legendContainer}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, styles.availableDot]} />
                    <Text style={styles.legendText}>Libre</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, styles.reservedDot]} />
                    <Text style={styles.legendText}>Reservado</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, styles.occupiedDot]} />
                    <Text style={styles.legendText}>Ocupado</Text>
                  </View>
                </View>
              </View>

              <View style={styles.grid}>
                {Object.entries(parkingSpots).map(([spotKey, data]) => {
                  const spotScale = spotScales[spotKey]
                  return (
                    <TouchableOpacity
                      key={spotKey}
                      activeOpacity={0.8}
                      onPress={() => {
                        if (!data.ocupado && !data.reservado && spotScale) {
                          animatePress(spotScale)
                          confirmReserve(spotKey)
                        }
                      }}
                      disabled={data.ocupado || data.reservado}
                    >
                      {spotScale && (
                        <Animated.View style={[styles.spot, { transform: [{ scale: spotScale }] }]} key={spotKey}>
                          <LinearGradient
                            colors={
                              data.ocupado
                                ? ["#F44336", "#D32F2F"]
                                : data.reservado
                                  ? ["#FFC107", "#FFA000"]
                                  : ["#4CAF50", "#388E3C"]
                            }
                            style={styles.spotGradient}
                          >
                            <MaterialCommunityIcons
                              name={data.ocupado ? "car-connected" : data.reservado ? "car-clock" : "car-outline"}
                              size={36}
                              color="#FFFFFF"
                            />
                          </LinearGradient>
                          <Text style={styles.spotText}>{spotKey}</Text>
                          <Text
                            style={[
                              styles.statusText,
                              data.ocupado
                                ? styles.occupiedText
                                : data.reservado
                                  ? styles.reservedText
                                  : styles.freeText,
                            ]}
                          >
                            {data.ocupado ? "Ocupado" : data.reservado ? "Reservado" : "Libre"}
                          </Text>
                        </Animated.View>
                      )}
                    </TouchableOpacity>
                  )
                })}
              </View>
            </>
          )}
        </Animated.View>
      </ScrollView>

      {/* Alerta mejorada - Usando animación estándar */}
      {mostrarAlerta && !puestoOcupado && (
        <View style={styles.alertOverlay}>
          <Animated.View
            style={[
              styles.alertContainer,
              {
                opacity: alertAnim,
                transform: [{ translateY: alertAnim.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) }],
              },
            ]}
          >
            <View style={styles.alertIconContainer}>
              <MaterialCommunityIcons name="alert-circle-outline" size={40} color="#FFC107" />
            </View>
            <Text style={styles.alertTitle}>Reserva a punto de vencer</Text>
            <Text style={styles.alertText}>
              Tienes el puesto {puestoReservado} reservado pero no ocupado. ¿Deseas mantener la reserva?
            </Text>
            <View style={styles.alertButtons}>
              <TouchableOpacity style={[styles.alertButton, styles.alertButtonNo]} onPress={cancelarReserva}>
                <Text style={styles.alertButtonText}>No</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.alertButton, styles.alertButtonYes]} onPress={mantenerReserva}>
                <Text style={styles.alertButtonText}>Sí</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      )}

      {/* Ticket de salida mejorado - Usando animación estándar */}
      {ticketSalida && (
        <View style={styles.ticketOverlay}>
          <Animated.View
            style={[
              styles.ticketContainer,
              {
                opacity: ticketAnim,
                transform: [{ translateY: ticketAnim.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) }],
              },
            ]}
          >
            <LinearGradient colors={["#2A2E3A", "#1E2235"]} style={styles.ticketContent}>
              <View style={styles.ticketHeader}>
                <MaterialCommunityIcons name="ticket-confirmation" size={32} color="#7BA05B" />
                <Text style={styles.ticketTitle}>Ticket de Salida</Text>
              </View>

              <View style={styles.ticketDivider} />

              <View style={styles.ticketDetails}>
                <View style={styles.ticketRow}>
                  <MaterialCommunityIcons name="account" size={20} color="#7BA05B" />
                  <Text style={styles.ticketLabel}>Nombre:</Text>
                  <Text style={styles.ticketValue}>{ticketSalida.nombre}</Text>
                </View>

                <View style={styles.ticketRow}>
                  <MaterialCommunityIcons name="car-side" size={20} color="#7BA05B" />
                  <Text style={styles.ticketLabel}>Puesto:</Text>
                  <Text style={styles.ticketValue}>{ticketSalida.estacionamiento}</Text>
                </View>

                <View style={styles.ticketRow}>
                  <MaterialCommunityIcons name="clock-outline" size={20} color="#7BA05B" />
                  <Text style={styles.ticketLabel}>Tiempo:</Text>
                  <Text style={styles.ticketValue}>{ticketSalida.tiempo}</Text>
                </View>

                <View style={styles.ticketRow}>
                  <MaterialCommunityIcons name="calendar" size={20} color="#7BA05B" />
                  <Text style={styles.ticketLabel}>Fecha:</Text>
                  <Text style={styles.ticketValue}>{ticketSalida.fecha}</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.ticketButton} onPress={closeTicketAndCancelReservation}>
                <Text style={styles.ticketButtonText}>Cerrar</Text>
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>
        </View>
      )}

      {/* Mensaje flotante con GIF de parqueo */}
      {mostrarMensajeParqueo && (
        <View style={styles.gifOverlay}>
          <Animated.View
            style={[
              styles.gifContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) }],
              },
            ]}
          >
            <View style={styles.gifHeader}>
              <Text style={styles.gifTitle}>Cómo parquear</Text>
              <TouchableOpacity onPress={() => setMostrarMensajeParqueo(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <View style={styles.gifContent}>
              {/* Usar el componente Image con la fuente correcta para el GIF */}
              {gifParqueo && <Image source={gifParqueo} style={styles.gifImage} resizeMode="contain" />}
              <Text style={styles.gifText}>
                Sigue estas instrucciones para estacionar correctamente en tu espacio reservado.
              </Text>
            </View>
          </Animated.View>
        </View>
      )}

      {/* Botones de depuración (solo para desarrollo) */}
      {__DEV__ && (
        <View style={styles.debugButtons}>
          <TouchableOpacity style={styles.debugButton} onPress={simularSalida}>
            <Text style={styles.debugButtonText}>Simular Salida</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.debugButton} onPress={forzarTicket}>
            <Text style={styles.debugButtonText}>Forzar Ticket</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#121520",
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#121520",
  },
  loaderText: {
    color: "#FFFFFF",
    marginTop: 12,
    fontSize: 16,
  },
  header: {
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  headerIcons: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
  container: {
    flexGrow: 1,
    alignItems: "center",
    paddingVertical: 20,
  },
  contentContainer: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  userInfoCard: {
    width: "100%",
    borderRadius: 16,
    marginBottom: 24,
    elevation: 4,
    overflow: "hidden",
  },
  userInfoContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(123, 160, 91, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  userDetails: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  placaContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  placaText: {
    fontSize: 14,
    color: "#CCCCCC",
    marginLeft: 6,
  },
  sectionHeader: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  legendContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 12,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 4,
  },
  availableDot: {
    backgroundColor: "#4CAF50",
  },
  reservedDot: {
    backgroundColor: "#FFC107",
  },
  occupiedDot: {
    backgroundColor: "#F44336",
  },
  legendText: {
    fontSize: 12,
    color: "#CCCCCC",
  },
  reservationCard: {
    width: "100%",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    elevation: 4,
  },
  reservedCard: {
    backgroundColor: "rgba(255, 193, 7, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(255, 193, 7, 0.3)",
  },
  occupiedCard: {
    backgroundColor: "rgba(76, 175, 80, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(76, 175, 80, 0.3)",
  },
  reservationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  reservationTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    marginLeft: 10,
  },
  reservationDetails: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  spotBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  spotBadgeText: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  reservationInfo: {
    flex: 1,
  },
  infoText: {
    fontSize: 16,
    color: "#FFFFFF",
    marginBottom: 4,
  },
  timerContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  timerText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFC107",
    marginLeft: 6,
  },
  actionButtonsContainer: {
    width: "100%",
  },
  actionButton: {
    backgroundColor: "#F44336",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  // NUEVO: Estilos para el panel de depuración
  debugPanel: {
    marginTop: 0,
    padding: 12,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: 8,
    width: "100%",
  },
  debugTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 8,
  },
  debugText: {
    color: "#CCCCCC",
    fontSize: 12,
    marginBottom: 4,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    width: "100%",
  },
  spot: {
    width: SPOT_SIZE,
    alignItems: "center",
    marginBottom: 20,
  },
  spotGradient: {
    width: SPOT_SIZE,
    height: SPOT_SIZE,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  spotText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginTop: 8,
  },
  statusText: {
    fontSize: 14,
    marginTop: 2,
    fontWeight: "500",
  },
  freeText: {
    color: "#4CAF50",
  },
  reservedText: {
    color: "#FFC107",
  },
  occupiedText: {
    color: "#F44336",
  },
  alertOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  alertContainer: {
    width: "85%",
    backgroundColor: "#1E2235",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 10,
  },
  alertIconContainer: {
    marginBottom: 16,
  },
  alertTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
  alertText: {
    color: "#CCCCCC",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  alertButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
  },
  alertButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    minWidth: 120,
    alignItems: "center",
  },
  alertButtonYes: {
    backgroundColor: "#4CAF50",
  },
  alertButtonNo: {
    backgroundColor: "#F44336",
  },
  alertButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  ticketOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  ticketContainer: {
    width: "85%",
    borderRadius: 16,
    overflow: "hidden",
    elevation: 10,
  },
  ticketContent: {
    padding: 20,
    alignItems: "center",
  },
  ticketHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  ticketTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "bold",
    marginLeft: 10,
  },
  ticketDivider: {
    width: "100%",
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginBottom: 16,
  },
  ticketDetails: {
    width: "100%",
    marginBottom: 20,
  },
  ticketRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  ticketLabel: {
    color: "#CCCCCC",
    fontSize: 16,
    marginLeft: 10,
    width: 80,
  },
  ticketValue: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "500",
    flex: 1,
  },
  ticketButton: {
    backgroundColor: "#7BA05B",
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  ticketButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  gifOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  gifContainer: {
    width: "90%",
    backgroundColor: "#1E2235",
    borderRadius: 16,
    overflow: "hidden",
    elevation: 10,
  },
  gifHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  gifTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  gifContent: {
    padding: 16,
    alignItems: "center",
  },
  gifImage: {
    width: "100%",
    height: 150,
    marginBottom: 16,
  },
  gifText: {
    color: "#CCCCCC",
    fontSize: 16,
    textAlign: "center",
  },
  // Botones de depuración
  debugButtons: {
    position: "absolute",
    bottom: 20,
    right: 20,
    flexDirection: "column",
  },
  debugButton: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  debugButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
  },
})

export default ParkReserva

