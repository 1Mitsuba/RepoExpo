import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Audio } from 'expo-av';

// Convierte meteringLevel (dB, rango -inf..0) a valor entre -60 y 0
function clampDb(db) {
  if (db === -Infinity || isNaN(db)) return -60;
  return Math.max(-60, Math.min(0, db));
}

export default function DecibelMeter() {
  const [permission, setPermission] = useState(false);
  const recordingRef = useRef(null);
  const [dB, setDB] = useState(-60);
  const animated = useRef(new Animated.Value(0)).current;
  const pollRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { status } = await Audio.requestPermissionsAsync();
      setPermission(status === 'granted');
      if (status !== 'granted') return;

      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        const recording = new Audio.Recording();
        await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
        await recording.startAsync();
        recordingRef.current = recording;

        // Poll meteringLevel cada 100ms
        pollRef.current = setInterval(async () => {
          try {
            const status = await recording.getStatusAsync();
            // meterLevelAvailable on some platforms
            const meter = status.metering && typeof status.metering === 'number' ? status.metering : status.meteringLevel;
            const level = clampDb(typeof meter === 'number' ? meter : -60);
            if (mounted) {
              setDB(level);
              const ratio = (level + 60) / 60; // 0..1
              Animated.timing(animated, { toValue: ratio, duration: 80, useNativeDriver: false }).start();
            }
          } catch (_e) {
            // ignore
          }
        }, 100);
      } catch (_e) {
        console.warn('DecibelMeter init failed', _e);
      }
    })();

    return () => {
      mounted = false;
      if (pollRef.current) clearInterval(pollRef.current);
      (async () => {
        try {
          if (recordingRef.current) {
            await recordingRef.current.stopAndUnloadAsync();
            recordingRef.current = null;
          }
        } catch (_e) {}
      })();
    };
  }, [animated]);

  const width = animated.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  // map internal level (-60..0) -> display 0..60 where 0 = silence, 60 = 0 dB (loud)
  const displayDb = Math.round(dB + 60);

  return (
    <View>
      <Text style={styles.dbText}>Nivel: {displayDb} dB</Text>
      <View style={styles.barBg}>
        <Animated.View style={[styles.barFill, { width }]} />
      </View>
      {!permission && <Text>Permiso de micrófono no otorgado.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  dbText: { fontSize: 18, fontWeight: '600', marginBottom: 6 },
  barBg: { height: 18, backgroundColor: '#eee', borderRadius: 9, overflow: 'hidden' },
  barFill: { height: 18, backgroundColor: '#4caf50' },
});
