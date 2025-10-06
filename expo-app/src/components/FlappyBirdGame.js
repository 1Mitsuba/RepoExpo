import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Button, StyleSheet, Animated, Dimensions } from 'react-native';
import { subscribeAccelerometer, isAccelerometerAvailable } from '../utils/sensors';
import { Audio } from 'expo-av';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export default function FlappyBirdGame() {
  const playerY = useRef(new Animated.Value(SCREEN_H / 2)).current;
  const [running, setRunning] = useState(false);
  const obstacles = useRef([]);
  const [tick, setTick] = useState(0);
  const gameLoopRef = useRef(null);
  const [score, setScore] = useState(0);
  const playerYNumeric = useRef(SCREEN_H / 2);

  useEffect(() => {
    let unsubscribe = null;
    (async () => {
      const available = await isAccelerometerAvailable();
      if (!available) return;
      unsubscribe = subscribeAccelerometer(({ x, y, z }) => {
        // eje Y: inclinar hacia arriba -> se considera salto
        if (!running) return;
        if (y < -0.8) {
          // salto
          Animated.timing(playerY, { toValue: Math.max(60, playerYNumeric.current - 80), duration: 120, useNativeDriver: false }).start();
        }
      }, 50);
    })();

    return () => unsubscribe && unsubscribe();
  }, [running]);

  // Simplified physics loop
  useEffect(() => {
    if (!running) {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
      return;
    }

    // gravity and obstacle spawner
    gameLoopRef.current = setInterval(() => {
      // apply gravity
      Animated.timing(playerY, { toValue: Math.min(SCREEN_H - 80, playerYNumeric.current + 4), duration: 100, useNativeDriver: false }).start();
      // spawn obstacles every 2s (approx)
      setTick(t => t + 1);
    }, 100);

    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [running]);

  // keep numeric playerY updated
  useEffect(() => {
    const listener = playerY.addListener(({ value }) => (playerYNumeric.current = value));
    return () => playerY.removeListener(listener);
  }, []);

  // manage obstacles based on tick
  useEffect(() => {
    if (!running) return;
    if (tick % 20 === 0) {
      const gap = 120;
      const topHeight = 50 + Math.random() * (SCREEN_H - gap - 200);
      const obs = {
        x: new Animated.Value(SCREEN_W),
        top: topHeight,
        id: Date.now(),
        xNumeric: SCREEN_W,
      };
      obstacles.current.push(obs);
      // keep numeric updated via listener
      const xListener = obs.x.addListener(({ value }) => (obs.xNumeric = value));
      Animated.timing(obs.x, { toValue: -100, duration: 4000, useNativeDriver: false }).start(() => {
        obs.x.removeListener(xListener);
        obstacles.current = obstacles.current.filter(o => o.id !== obs.id);
        setScore(s => s + 1);
      });
    }
  }, [tick]);

  // simple collision detection
  useEffect(() => {
    const collInterval = setInterval(() => {
      const py = playerYNumeric.current;
      for (const o of obstacles.current) {
        const ox = o.xNumeric;
        if (ox < 100 && ox > 10) {
          // check if in gap
          const gapTop = o.top;
          if (py < gapTop || py > gapTop + 120) {
            // collision
            stopGame();
            return;
          }
        }
      }
    }, 100);
    return () => clearInterval(collInterval);
  }, [running]);

  function startGame() {
    setScore(0);
    obstacles.current = [];
    playerY.setValue(SCREEN_H / 2);
    playerYNumeric.current = SCREEN_H / 2;
    setRunning(true);
  }

  async function stopGame() {
    setRunning(false);
    // play collision sound if available
    try {
      // usamos WAVs generados por el script (start.wav, collision.wav, victory.wav)
      const { sound } = await Audio.Sound.createAsync(require('../assets/sounds/collision.wav'));
      await sound.playAsync();
    } catch (e) {}
  }

  return (
    <View style={styles.container}>
      <View style={styles.gameArea}>
        <Animated.View style={[styles.player, { top: playerY }]} />
        {obstacles.current.map(o => (
          <Animated.View key={o.id} style={[styles.obstacleTop, { left: o.x, height: o.top }]} />
        ))}
        {obstacles.current.map(o => (
          <Animated.View key={o.id + '-b'} style={[styles.obstacleBottom, { left: o.x, top: o.top + 120 }]} />
        ))}
      </View>
      <View style={styles.controls}>
        {!running ? <Button title="Iniciar juego" onPress={startGame} /> : <Button title="Detener" onPress={stopGame} />}
        <Text>Puntuación: {score}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { height: 300 },
  gameArea: { flex: 1, backgroundColor: '#cfe9ff', overflow: 'hidden' },
  player: { position: 'absolute', left: 40, width: 30, height: 30, backgroundColor: '#ffcc00', borderRadius: 6 },
  obstacleTop: { position: 'absolute', width: 60, backgroundColor: '#2e7d32', top: 0 },
  obstacleBottom: { position: 'absolute', width: 60, backgroundColor: '#2e7d32' },
  controls: { marginTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
