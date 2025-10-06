import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, TouchableWithoutFeedback } from 'react-native';
import { subscribeAccelerometer, isAccelerometerAvailable } from '../utils/sensors';
import { Audio } from 'expo-av';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export default function FlappyBirdGame() {
  const GAME_HEIGHT = Math.round(SCREEN_H * 0.6);
  const PLAYER_SIZE = 36;
  const PIPE_WIDTH = 64;
  const GAP = 140; // gap between pipes

  const playerY = useRef(new Animated.Value(GAME_HEIGHT / 2)).current;
  const playerYNumeric = useRef(GAME_HEIGHT / 2);
  const velocity = useRef(0);
  const gravity = 0.45; // pixels per tick^2
  const jumpImpulse = -9.5;

  const [running, setRunning] = useState(false);
  const obstacles = useRef([]);
  const [score, setScore] = useState(0);
  const spawnTimer = useRef(null);
  const loopTimer = useRef(null);
  const accelCooldown = useRef(0);

  // accelerometer for optional jump
  useEffect(() => {
    let unsubscribe = null;
    (async () => {
      const avail = await isAccelerometerAvailable();
      if (!avail) return;
      unsubscribe = subscribeAccelerometer(({ x, y, z }) => {
        // tilt upward (y negative) triggers a jump if running
        if (!running) return;
        const now = Date.now();
        if (y < -0.9 && now - accelCooldown.current > 400) {
          doJump();
          accelCooldown.current = now;
        }
      }, 60);
    })();

    return () => unsubscribe && unsubscribe();
  }, [running]);

  // keep numeric player position updated
  useEffect(() => {
    const id = playerY.addListener(({ value }) => (playerYNumeric.current = value));
    return () => playerY.removeListener(id);
  }, []);

  function resetGame() {
    // clear obstacles
    obstacles.current.forEach(o => {
      try { if (o.x && o.unsubscribe) o.unsubscribe(); } catch (e) {}
    });
    obstacles.current = [];
    setScore(0);
    velocity.current = 0;
    playerY.setValue(GAME_HEIGHT / 2);
    playerYNumeric.current = GAME_HEIGHT / 2;
  }

  function startGame() {
    resetGame();
    setRunning(true);

    // main physics loop ~60fps
    loopTimer.current = setInterval(() => {
      // integrate
      velocity.current += gravity;
      let newY = playerYNumeric.current + velocity.current;
      if (newY > GAME_HEIGHT - PLAYER_SIZE) {
        newY = GAME_HEIGHT - PLAYER_SIZE;
        velocity.current = 0;
      }
      if (newY < 0) {
        newY = 0;
        velocity.current = 0;
      }
      playerY.setValue(newY);

      // move obstacles and collision
      for (let i = obstacles.current.length - 1; i >= 0; i--) {
        const o = obstacles.current[i];
        o.xNumeric -= 3.2; // speed
        o.x.setValue(o.xNumeric);

        // check for scoring when passed player
        if (!o.passed && o.xNumeric + PIPE_WIDTH < 40) {
          o.passed = true;
          setScore(s => s + 1);
        }

        // collision check: player's box
        const px = 40;
        const py = playerYNumeric.current;
        const pw = PLAYER_SIZE;
        const ph = PLAYER_SIZE;

        const ox = o.xNumeric;
        const gapTop = o.top;
        // top pipe rect
        const tRect = { x: ox, y: 0, w: PIPE_WIDTH, h: gapTop };
        const bRect = { x: ox, y: gapTop + GAP, w: PIPE_WIDTH, h: GAME_HEIGHT - (gapTop + GAP) };

        if (rectsIntersect({ x: px, y: py, w: pw, h: ph }, tRect) || rectsIntersect({ x: px, y: py, w: pw, h: ph }, bRect)) {
          // collision
          stopGame();
        }

        // remove off-screen obstacles
        if (o.xNumeric < -PIPE_WIDTH) {
          obstacles.current.splice(i, 1);
        }
      }
    }, 16);

    // spawn pipes every 1600ms
    spawnTimer.current = setInterval(() => {
      const top = 40 + Math.random() * (GAME_HEIGHT - GAP - 80);
      const obs = { x: new Animated.Value(SCREEN_W), xNumeric: SCREEN_W, top, id: Date.now(), passed: false };
      obs.unsubscribe = obs.x.addListener(({ value }) => (obs.xNumeric = value));
      obstacles.current.push(obs);
    }, 1600);
  }

  function stopGame() {
    setRunning(false);
    if (loopTimer.current) { clearInterval(loopTimer.current); loopTimer.current = null; }
    if (spawnTimer.current) { clearInterval(spawnTimer.current); spawnTimer.current = null; }
    // play collision sound
    (async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(require('../assets/sounds/collision.wav'));
        await sound.playAsync();
      } catch (e) {}
    })();
  }

  function doJump() {
    velocity.current = jumpImpulse;
  }

  function rectsIntersect(a, b) {
    return !(a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y);
  }

  // teardown
  useEffect(() => {
    return () => {
      if (loopTimer.current) clearInterval(loopTimer.current);
      if (spawnTimer.current) clearInterval(spawnTimer.current);
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.score}>Puntuación: {score}</Text>
      <TouchableWithoutFeedback onPress={() => (running ? doJump() : startGame())}>
        <View style={[styles.gameArea, { height: GAME_HEIGHT }]}>
          {/* player */}
          <Animated.View
            style={[styles.player, { top: playerY, left: 40, width: PLAYER_SIZE, height: PLAYER_SIZE, borderRadius: PLAYER_SIZE / 2 }]}
          />

          {/* pipes */}
          {obstacles.current.map(o => (
            <React.Fragment key={o.id}>
              <Animated.View style={[styles.pipeTop, { left: o.x, height: o.top, width: PIPE_WIDTH }]} />
              <Animated.View style={[styles.pipeBottom, { left: o.x, top: o.top + GAP, width: PIPE_WIDTH }]} />
            </React.Fragment>
          ))}
        </View>
      </TouchableWithoutFeedback>

      <View style={styles.controls}>
        {!running ? (
          <Text style={styles.hint}>Toca la pantalla para iniciar y saltar</Text>
        ) : (
          <Text style={styles.hint}>Toca para saltar</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gameArea: { backgroundColor: '#d9f0ff', margin: 12, borderRadius: 6, overflow: 'hidden' },
  player: { position: 'absolute', backgroundColor: '#ffcc00', borderWidth: 2, borderColor: '#c98f00' },
  pipeTop: { position: 'absolute', backgroundColor: '#2e7d32', top: 0 },
  pipeBottom: { position: 'absolute', backgroundColor: '#2e7d32' },
  controls: { paddingHorizontal: 12, paddingTop: 8 },
  score: { position: 'absolute', right: 24, top: 8, zIndex: 10, fontSize: 16, fontWeight: '700' },
  hint: { fontSize: 16, color: '#333' },
});
