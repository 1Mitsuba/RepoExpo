import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { subscribeAccelerometer, isAccelerometerAvailable } from '../utils/sensors';

export default function DirectionDetector() {
  const [dir, setDir] = useState('Estático');

  useEffect(() => {
    let unsubscribe = null;
    (async () => {
      const available = await isAccelerometerAvailable();
      if (!available) return;
      unsubscribe = subscribeAccelerometer(({ x }) => {
        const threshold = 0.15; // ajustar
        if (x > threshold) setDir('Derecha');
        else if (x < -threshold) setDir('Izquierda');
        else setDir('Estático');
      }, 100);
    })();

    return () => unsubscribe && unsubscribe();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Dirección: {dir}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 8 },
  text: { fontSize: 20, fontWeight: '600' },
});
