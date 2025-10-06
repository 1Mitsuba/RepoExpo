# Práctica 3.1 - Expo React Native

Proyecto preparado para Expo. Copia los archivos en un proyecto creado con `expo init` o `npx create-react-native-app`.

Dependencias recomendadas:

- expo
- expo-sensors
- expo-av
- expo-permissions

Instalación (desde la raíz del proyecto Expo):

```powershell
npx expo install expo-sensors expo-av expo-permissions
```

Archivos creados en esta plantilla:

- `src/App.js` - Punto de entrada de la app
- `src/screens/HomeScreen.js` - Pantalla con los componentes
- `src/components/StepCounter.js` - Contador de pasos
- `src/components/FlappyBirdGame.js` - Juego tipo Flappy
- `src/components/DecibelMeter.js` - Medidor de decibeles usando expo-av
- `src/components/DirectionDetector.js` - Detecta dirección izquierda/derecha
- `src/utils/sensors.js` - Helpers para sensores
- `src/assets/sounds/` - Carpeta para sonidos (.mp3)

Permisos nativos (agregar en caso de 'expo build' o 'eas build'):

Android (AndroidManifest.xml):

```xml
<!-- Permiso de micrófono para grabación -->
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<!-- Para sensores no se requieren permisos explícitos en Android -->
```

iOS (Info.plist):

```xml
<key>NSMicrophoneUsageDescription</key>
<string>La app necesita acceso al micrófono para medir el nivel de sonido en tiempo real.</string>
```

Notas importantes sobre el medidor de decibeles:

- El componente `DecibelMeter` usa `Audio.Recording` y consulta `recording.getStatusAsync()` para leer `meteringLevel` o `metering`. Esto funciona en Expo Go en plataformas donde `meteringLevel` está implementado. Algunos dispositivos o versiones pueden comportarse diferente.
- Se recomienda probar en dispositivo físico (no siempre funciona en emulador para audio de micrófono).

Sonidos:

Coloca `start.mp3`, `collision.mp3`, `victory.mp3` en `src/assets/sounds/` y referéncialos con `require('../assets/sounds/collision.mp3')`.

Kotlin (puntos extra) - Estructura y lógica (sin código completo):

- Actividades / Fragments:
  - MainActivity: contenedor principal con navegación entre pestañas: contador de pasos, juego, medidor de decibeles, detector de dirección.

- Servicios y componentes:
  - StepDetectorService: servicio en primer plano que usa SensorManager y Sensor.TYPE_ACCELEROMETER para procesar picos y contar pasos (usando un algoritmo de peak detection o Google Sensor.TYPE_STEP_DETECTOR si está disponible).
  - AudioRecorderService: usa AudioRecord con buffer PCM para calcular RMS y convertir a dB en tiempo real.
  - GameView: SurfaceView o custom View para renderizar el juego (player, obstáculos) con su propio hilo de actualización y canvas.

- Permisos:
  - AndroidManifest: `<uses-permission android:name="android.permission.RECORD_AUDIO"/>` y manejo en runtime con `ActivityCompat.requestPermissions`.

- Librerías útiles:
  - Android Sensor APIs, AudioRecord, ExoPlayer/Media APIs para reproducir sonidos.

Esta plantilla está pensada para copiar/pegar en un proyecto Expo. Ajustes finos y pulido del juego y thresholds de sensores requieren pruebas en dispositivos reales.
