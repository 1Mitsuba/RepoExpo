# Estructura sugerida para la versión en Kotlin (puntos extra)

Esta sección describe la arquitectura y los componentes principales si se implementa la práctica en Android nativo con Kotlin.

1. Módulos y actividades
   - MainActivity: Activity principal que contiene un NavHost o Tabs para acceder a las pantallas: Contador de Pasos, Juego, Medidor de Decibeles y Detector de Dirección.
   - Cada pantalla puede ser un Fragment.

2. Servicios y gestores de sensores
   - StepDetectorService / SensorManager:
     - Usar SensorManager y Sensor.TYPE_ACCELEROMETER (o Sensor.TYPE_STEP_DETECTOR si disponible) para detectar pasos.
     - Implementar algoritmo de detección de picos (RMS, filtrado pasa-altos) o suscribirse al Step Detector.
     - Mantener un contador en SharedPreferences o en Room DB para persistencia.

   - AudioRecordingService:
     - Usar AudioRecord para leer PCM en tiempo real.
     - Calcular RMS de cada frame (por ejemplo, 2048 muestras) y convertir a dB: dB = 20 * log10(rms).
     - Publicar los valores mediante LocalBroadcastManager o LiveData para la UI.

3. GameView (Flappy)
   - Implementar una custom View (SurfaceView o View con un hilo) que dibuje el jugador, obstáculos y gestione la física.
   - Usar SensorManager para leer acelerómetro; mapear inclinación en Y a salto.
   - Detectar colisiones por bounding boxes.

4. Reproducción de sonidos
   - Usar SoundPool o MediaPlayer para efectos cortos (start, collision, victory).

5. Permisos
   - En AndroidManifest.xml declarar `android.permission.RECORD_AUDIO`.
   - Solicitar permisos en runtime con `ActivityCompat.requestPermissions`.

6. Persistencia
   - SharedPreferences para puntuaciones y configuración.
   - Room si se requiere historial.

7. Arquitectura
   - Usar MVVM con ViewModel y LiveData/Flow para separar lógica y UI.
   - Repository para acceso a sensores y datos locales.

8. Pruebas y depuración
   - Probar en dispositivos reales (especialmente micrófono y acelerómetro).
   - Ajustar thresholds de detección de pasos y dirección según sensor noise.

Esta hoja describe la arquitectura y los pasos principales; no contiene código fuente completo como se pidió.
