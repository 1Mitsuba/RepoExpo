import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, TouchableWithoutFeedback } from 'react-native';
import { DeviceMotion } from 'expo-sensors';
import { Audio } from 'expo-av';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export default function FlappyBirdGame() {
  const GAME_HEIGHT = Math.round(SCREEN_H * 0.6);
  const PLAYER_SIZE = 36;
  const PIPE_WIDTH = 64;
  const GAP = 140; // gap between pipes
  const SPAWN_INTERVAL = 1600; // ms
  const PIPE_SPEED = 180; // px per second

  const playerY = useRef(new Animated.Value(GAME_HEIGHT / 2)).current;
  const playerYNumeric = useRef(GAME_HEIGHT / 2);
  const velocity = useRef(0);
  const gravity = 0.45; // pixels per tick^2
  const jumpImpulse = -9.5;

  const [running, setRunning] = useState(false);
  const [pipes, setPipes] = useState([]);
  const pipesRef = useRef(pipes);
  const [score, setScore] = useState(0);
  const spawnTimer = useRef(null);
  const loopTimer = useRef(null); // will store RAF id
  const accelCooldown = useRef(0);

  // keep pipesRef in sync with pipes state
  useEffect(() => {
    pipesRef.current = pipes;
  }, [pipes]);

  // NOTE: prefer DeviceMotion (orientation) for controls.

  // DeviceMotion-based orientation control (use device rotation/giro)
  useEffect(() => {
    let sub = null;
    const thresholdDeg = 12; // degrees to trigger
    const interval = 60;

    const startDeviceMotion = async () => {
      try {
        DeviceMotion.setUpdateInterval(interval);
        sub = DeviceMotion.addListener((data) => {
          if (!running) return;
          if (!data || !data.rotation) return;
          const now = Date.now();
          const gamma = data.rotation.gamma || 0; // roll (radians)
          const beta = data.rotation.beta || 0; // pitch (radians)
          const gammaDeg = gamma * (180 / Math.PI);
          const betaDeg = beta * (180 / Math.PI);

          // Prefer roll (gamma) for right/left device rotation control.
          // Right rotation -> positive gammaDeg -> jump
          if (gammaDeg > thresholdDeg && now - accelCooldown.current > 300) {
            doJump();
            accelCooldown.current = now;
            return;
          }

          // Left rotation -> negative gammaDeg -> quick drop
          if (gammaDeg < -thresholdDeg && now - accelCooldown.current > 300) {
            velocity.current += 6;
            accelCooldown.current = now;
            return;
          }

          // As fallback, if device is pitched strongly forward/back (beta), apply small adjustments
          if (betaDeg > 20 && now - accelCooldown.current > 400) {
            // pitched forward -> go down
            velocity.current += 4;
            accelCooldown.current = now;
          } else if (betaDeg < -20 && now - accelCooldown.current > 400) {
            // pitched back -> small jump
            doJump();
            accelCooldown.current = now;
          }
        });
      } catch (_e) {
        // ignore if not available
      }
    };

    if (running) startDeviceMotion();

    return () => {
      if (sub) sub.remove();
    };
  }, [running, doJump]);

  // keep numeric player position updated
  useEffect(() => {
    const id = playerY.addListener(({ value }) => (playerYNumeric.current = value));
    return () => playerY.removeListener(id);
  }, [playerY]);

  function resetGame() {
    // clear pipes
    pipesRef.current.forEach(o => {
      try { if (o.x && o.unsubscribe) o.unsubscribe(); } catch (_e) {}
    });
    setPipes([]);
    setScore(0);
    velocity.current = 0;
    playerY.setValue(GAME_HEIGHT / 2);
    playerYNumeric.current = GAME_HEIGHT / 2;
  }

  function startGame() {
    resetGame();
    setRunning(true);

    // physics + rendering loop using requestAnimationFrame for smooth movement
    let last = Date.now();
    const loop = () => {
      const now = Date.now();
      const dt = (now - last) / 1000; // seconds
      last = now;

      // integrate physics (velocity in px/sec)
      velocity.current += gravity * dt;
      let newY = playerYNumeric.current + velocity.current * dt;
      if (newY > GAME_HEIGHT - PLAYER_SIZE) {
        newY = GAME_HEIGHT - PLAYER_SIZE;
        velocity.current = 0;
      }
      if (newY < 0) {
        newY = 0;
        velocity.current = 0;
      }
      playerY.setValue(newY);

      // move pipes
      const toRemoveIds = [];
      const pipesNow = pipesRef.current.slice();
      for (let i = 0; i < pipesNow.length; i++) {
        const o = pipesNow[i];
        o.xNumeric -= PIPE_SPEED * dt;
        o.x.setValue(o.xNumeric);

        // scoring
        if (!o.passed && o.xNumeric + PIPE_WIDTH < 40) {
          o.passed = true;
          setScore(s => s + 1);
        }

        // collision
        const px = 40;
        const py = playerYNumeric.current;
        const pw = PLAYER_SIZE;
        const ph = PLAYER_SIZE;
        const ox = o.xNumeric;
        const gapTop = o.top;
        const tRect = { x: ox, y: 0, w: PIPE_WIDTH, h: gapTop };
        const bRect = { x: ox, y: gapTop + GAP, w: PIPE_WIDTH, h: GAME_HEIGHT - (gapTop + GAP) };
        if (rectsIntersect({ x: px, y: py, w: pw, h: ph }, tRect) || rectsIntersect({ x: px, y: py, w: pw, h: ph }, bRect)) {
          stopGame();
          return; // stop loop early
        }

        if (o.xNumeric < -PIPE_WIDTH - 20) {
          toRemoveIds.push(o.id);
        }
      }

      if (toRemoveIds.length > 0) {
        setPipes(prev => prev.filter(p => !toRemoveIds.includes(p.id)));
      }

      loopTimer.current = requestAnimationFrame(loop);
    };

    // spawn function: create pipe off-screen to the right
    const spawnPipe = () => {
      const top = 40 + Math.random() * (GAME_HEIGHT - GAP - 80);
      const startX = SCREEN_W + PIPE_WIDTH + 20;
      const obs = { x: new Animated.Value(startX), xNumeric: startX, top, id: Date.now() + Math.random(), passed: false };
      obs.unsubscribe = obs.x.addListener(({ value }) => (obs.xNumeric = value));
      setPipes(prev => [...prev, obs]);
    };

    // start the loop and spawn regardless (we just set running state above)
    last = Date.now();
    loopTimer.current = requestAnimationFrame(loop);
    spawnTimer.current = setInterval(spawnPipe, SPAWN_INTERVAL);
  }

  function stopGame() {
    setRunning(false);
    if (loopTimer.current) { cancelAnimationFrame(loopTimer.current); loopTimer.current = null; }
    if (spawnTimer.current) { clearInterval(spawnTimer.current); spawnTimer.current = null; }
    // play collision sound
    (async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(require('../assets/sounds/collision.wav'));
        await sound.playAsync();
      } catch (_e) {}
    })();
  }

  const doJump = useCallback(() => {
    velocity.current = jumpImpulse;
  }, [jumpImpulse]);

  function rectsIntersect(a, b) {
    return !(a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y);
  }

  // teardown
  useEffect(() => {
    return () => {
      if (loopTimer.current) cancelAnimationFrame(loopTimer.current);
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
          {pipes.map(o => (
            <React.Fragment key={o.id}>
              <Animated.View style={[styles.pipeTop, { left: o.x, height: o.top, width: PIPE_WIDTH }]} />
              <Animated.View style={[styles.pipeBottom, { left: o.x, top: o.top + GAP, width: PIPE_WIDTH, height: GAME_HEIGHT - (o.top + GAP) }]} />
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
