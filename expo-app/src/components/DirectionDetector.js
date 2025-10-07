import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DeviceMotion } from 'expo-sensors';

export default function DirectionDetector() {
  const [dir, setDir] = useState('Estático');
  const baseline = useRef(null);

  useEffect(() => {
    let sub = null;
    const interval = 80;
    DeviceMotion.setUpdateInterval(interval);
    try {
      sub = DeviceMotion.addListener((data) => {
        if (!data || !data.rotation) return;
        const alpha = typeof data.rotation.alpha === 'number' ? data.rotation.alpha : 0;
        const alphaDeg = alpha * (180 / Math.PI);
        if (baseline.current === null) {
          baseline.current = alphaDeg;
        }
        let delta = alphaDeg - baseline.current;
        if (delta > 180) delta -= 360;
        if (delta < -180) delta += 360;
        const thresh = 8; // degrees
        if (delta > thresh) setDir('Derecha');
        else if (delta < -thresh) setDir('Izquierda');
        else setDir('Estático');
      });
    } catch (_e) {}

    return () => {
      if (sub) sub.remove();
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Dirección: {dir}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    paddingVertical: 8,
    backgroundColor: '#e8f5e9', // Verde muy claro consistente con tema
    borderRadius: 8,
    padding: 10
  },
  text: { 
    fontSize: 20, 
    fontWeight: '600', 
    color: '#2e7d32' // Verde oscuro para texto
  },
});
