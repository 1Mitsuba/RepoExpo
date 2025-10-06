import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import * as Permissions from 'expo-permissions';
import { subscribeAccelerometer, isAccelerometerAvailable } from '../utils/sensors';

// Contador de pasos simple: detecta picos en el eje Z
export default function StepCounter() {
  const [steps, setSteps] = useState(0);
  const [available, setAvailable] = useState(true);
  const lastZ = useRef(0);
  const lastStepTime = useRef(0);

  useEffect(() => {
    let unsubscribe = null;

    (async () => {
      const accAvailable = await isAccelerometerAvailable();
      setAvailable(accAvailable);
      if (!accAvailable) return;

      unsubscribe = subscribeAccelerometer(({ x, y, z }) => {
        const now = Date.now();
        const dz = Math.abs(z - lastZ.current);
        // umbral simple: ajuste según pruebas
        if (dz > 1.2 && now - lastStepTime.current > 300) {
          setSteps(s => s + 1);
          lastStepTime.current = now;
        }
        lastZ.current = z;
      }, 100);
    })();

    return () => unsubscribe && unsubscribe();
  }, []);

  return (
    <View>
      <Text style={styles.stepsText}>Pasos: {steps}</Text>
      {!available && (
        <Button title="Contar paso (manual)" onPress={() => setSteps(s => s + 1)} />
      )}
      <View style={{height:8}} />
      <Button title="Reiniciar" onPress={() => setSteps(0)} />
    </View>
  );
}

const styles = StyleSheet.create({
  stepsText: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
});
