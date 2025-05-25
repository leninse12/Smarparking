import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: '#0A1520',
  },
  fondo: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  tecladoEvitable: {
    flex: 1,
  },
  encabezado: {
    paddingHorizontal: 20,
    paddingTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  botonAtras: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contenido: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  contenedorLogo: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: width * 0.4,
    height: width * 0.4,
    resizeMode: 'contain',
    marginBottom: 20,
  },
  titulo: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  subtitulo: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    maxWidth: '80%',
  },
  formulario: {
    marginBottom: 30,
  },
  campoContenedor: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    marginBottom: 15,
    paddingHorizontal: 15,
    height: 55,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  campoTexto: {
    flex: 1,
    height: 55,
    color: 'white',
    marginLeft: 10,
    fontSize: 16,
  },
  botonIniciar: {
    height: 55,
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#F44336',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  botonGradiente: {
    height: '100%',
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textoBoton: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  registroTexto: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textoRegistro: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  enlaceRegistro: {
    color: '#F44336',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 5,
  },
});

export default estilos;
