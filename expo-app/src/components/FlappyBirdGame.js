import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, TouchableWithoutFeedback } from 'react-native';
import { DeviceMotion, Accelerometer } from 'expo-sensors';
import { Audio } from 'expo-av';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export default function FlappyBirdGame() {
  const GAME_HEIGHT = Math.round(SCREEN_H * 0.6);
  const PLAYER_SIZE = 36;
  const PIPE_WIDTH = PLAYER_SIZE; // make pipes roughly the same width as the player for better fairness
  const GAP = 140; // gap between pipes
  const SPAWN_INTERVAL = 1600; // ms
  const PIPE_SPEED = 180; // px per second

  const playerY = useRef(new Animated.Value(GAME_HEIGHT / 2)).current;
  const playerYNumeric = useRef(GAME_HEIGHT / 2);
  const velocity = useRef(0);
  const gravity = 0.45; // pixels per tick^2
  const jumpImpulse = -9.5;
  const orientationRef = useRef(0); // degrees
  const orientationBaseline = useRef(null);
  const ORIENT_ACCEL = 900; // px/s^2 applied from device rotation (higher default for snappier control)

  // live-tunable settings (made stateful so user can adjust in UI)
  const [sensitivity, setSensitivity] = useState(18); // degrees for full effect (lower = more sensitive)
  const [orientAccelScale, setOrientAccelScale] = useState(ORIENT_ACCEL);
  const [invertControl, setInvertControl] = useState(false);
  const [baselineAvg, setBaselineAvg] = useState(true);
  const [shakeToJump, setShakeToJump] = useState(false);
  const shakeCooldownRef = useRef(false);
  const accelSubRef = useRef(null);
  const [flickToJump, setFlickToJump] = useState(false);
  const flickCooldownRef = useRef(false);
  const lastAlphaRef = useRef(null);
  const lastAlphaTimeRef = useRef(null);

  const [running, setRunning] = useState(false);
  const [pipes, setPipes] = useState([]);
  const pipesRef = useRef(pipes);
  const [score, setScore] = useState(0);
  const spawnTimer = useRef(null);
  const loopTimer = useRef(null); // will store RAF id

  // keep pipesRef in sync with pipes state
  useEffect(() => {
    pipesRef.current = pipes;
  }, [pipes]);

  // NOTE: prefer DeviceMotion (orientation) for controls.

  // DeviceMotion-based orientation control (use device rotation/giro)
  useEffect(() => {
    let sub = null;
    const interval = 60;

    const startDeviceMotion = async () => {
      try {
        DeviceMotion.setUpdateInterval(interval);
        sub = DeviceMotion.addListener((data) => {
          if (!running) return;
          if (!data || !data.rotation) return;
          // Use rotation.alpha (yaw) for true "giro"/rotación alrededor del eje Z
          // alpha is in radians; convert to degrees
          const alpha = typeof data.rotation.alpha === 'number' ? data.rotation.alpha : 0;
          const alphaDeg = alpha * (180 / Math.PI);
          // On some devices alpha wraps 0..360 (rad), normalize by baseline captured at game start
          // If baselineAvg is enabled, baseline will be filled by startGame's averaging logic
          if (orientationBaseline.current === null) {
            // fallback: if baseline not captured yet, use this reading as baseline
            orientationBaseline.current = alphaDeg;
          }
          // positive delta means rotated to the right (clockwise looking from top)
          let delta = alphaDeg - orientationBaseline.current;
          // normalize to -180..180
          if (delta > 180) delta -= 360;
          if (delta < -180) delta += 360;
          orientationRef.current = delta;

          // compute angular velocity (deg/s) for quick-rotation detection
          try {
            const now = Date.now();
            if (lastAlphaRef.current !== null && lastAlphaTimeRef.current) {
              const dt = (now - lastAlphaTimeRef.current) / 1000; // seconds
              if (dt > 0) {
                // raw delta between consecutive alpha readings
                let rawDelta = alphaDeg - lastAlphaRef.current;
                if (rawDelta > 180) rawDelta -= 360;
                if (rawDelta < -180) rawDelta += 360;
                const angVel = rawDelta / dt; // deg/s
                const angThreshold = 220; // deg/s to trigger flick
                if (flickToJump && !flickCooldownRef.current && Math.abs(angVel) > angThreshold) {
                  doJump();
                  flickCooldownRef.current = true;
                  setTimeout(() => (flickCooldownRef.current = false), 600);
                }
              }
            }
            lastAlphaRef.current = alphaDeg;
            lastAlphaTimeRef.current = now;
          } catch (_e) {}
        });
      } catch (_e) {
        // ignore if not available
      }
    };

    if (running) {
      // reset baseline when starting the game so neutral orientation is the current phone pose
      orientationBaseline.current = null;
      startDeviceMotion();
    }

    return () => {
      if (sub) sub.remove();
      lastAlphaRef.current = null;
      lastAlphaTimeRef.current = null;
    };
  }, [running, doJump, flickToJump]);

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
    // clear orientation so next run starts neutral
    orientationRef.current = 0;
    orientationBaseline.current = null;
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
      // apply gravity
      velocity.current += gravity * dt;
  // orientation control: orientationRef.current in degrees; positive = rotated right
  const orient = orientationRef.current || 0;
  // map orientation to vertical acceleration: positive orient => upward acceleration
  // Note: y increases downward in screen coords, so upward acceleration is negative velocity change
  const sens = sensitivity; // degrees that produce full effect
  const baseAccel = orientAccelScale;
  const sign = invertControl ? 1 : -1;
  const orientAccel = sign * (orient / sens) * baseAccel; // tuned mapping
      velocity.current += orientAccel * dt;
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
    // optionally compute baseline average for N readings to stabilize control
    if (baselineAvg) {
      // collect readings for ~600ms at 60ms interval
      const samples = [];
      let subAvg = null;
      const avgInterval = 60;
      DeviceMotion.setUpdateInterval(avgInterval);
      try {
        subAvg = DeviceMotion.addListener((data) => {
          if (!data || !data.rotation) return;
          const alpha = typeof data.rotation.alpha === 'number' ? data.rotation.alpha : 0;
          samples.push(alpha * (180 / Math.PI));
        });
      } catch (_e) {}
      // after 600ms compute baseline and continue
      setTimeout(() => {
        if (samples.length > 0) {
          const sum = samples.reduce((a, b) => a + b, 0);
          orientationBaseline.current = sum / samples.length;
        } else {
          orientationBaseline.current = null;
        }
        if (subAvg) subAvg.remove();
        last = Date.now();
        loopTimer.current = requestAnimationFrame(loop);
        spawnTimer.current = setInterval(spawnPipe, SPAWN_INTERVAL);
      }, 600);
    } else {
      last = Date.now();
      loopTimer.current = requestAnimationFrame(loop);
      spawnTimer.current = setInterval(spawnPipe, SPAWN_INTERVAL);
    }

    // start accelerometer shake listener if enabled
    if (shakeToJump) {
      try {
        Accelerometer.setUpdateInterval(100);
        accelSubRef.current = Accelerometer.addListener(({ x, y, z }) => {
          const magnitude = Math.sqrt(x * x + y * y + z * z);
          // typical gravity ~1, detect spikes above threshold
          if (magnitude > 1.9 && !shakeCooldownRef.current) {
            // trigger jump
            doJump();
            shakeCooldownRef.current = true;
            setTimeout(() => (shakeCooldownRef.current = false), 600);
          }
        });
      } catch (_e) {}
    }
  }

  function stopGame() {
    setRunning(false);
    if (loopTimer.current) { cancelAnimationFrame(loopTimer.current); loopTimer.current = null; }
    if (spawnTimer.current) { clearInterval(spawnTimer.current); spawnTimer.current = null; }
    // play collision sound
    // clear orientation when game stops to avoid jumpy state
    orientationRef.current = 0;
    orientationBaseline.current = null;
    (async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(require('../assets/sounds/collision.wav'));
        await sound.playAsync();
      } catch (_e) {}
    })();
    // stop accel listener
    try { if (accelSubRef.current) { accelSubRef.current.remove(); accelSubRef.current = null; } } catch (_e) {}
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
          {/* rotation indicator */}
          <View style={styles.rotationIndicator} pointerEvents="none">
            <Text style={styles.rotationText}>Giro: {Math.round(orientationRef.current)}°</Text>
            <View style={styles.rotBarBg}>
              <View style={[styles.rotBarFill, { width: `${Math.min(100, Math.abs(Math.round(orientationRef.current))) * 1}%` }]} />
            </View>
          </View>
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

      {/* live tuning controls */}
      <View style={styles.tuning}>
        <Text style={styles.tuneLabel}>Sensibilidad: {sensitivity}°</Text>
        <View style={styles.tuneRow}>
          <Text onPress={() => setSensitivity(s => Math.max(5, s - 5))} style={styles.tuneBtn}>-</Text>
          <Text onPress={() => setSensitivity(s => s + 5)} style={styles.tuneBtn}>+</Text>
        </View>

        <Text style={styles.tuneLabel}>Fuerza: {orientAccelScale}</Text>
        <View style={styles.tuneRow}>
          <Text onPress={() => setOrientAccelScale(v => Math.max(50, v - 50))} style={styles.tuneBtn}>-</Text>
          <Text onPress={() => setOrientAccelScale(v => v + 50)} style={styles.tuneBtn}>+</Text>
        </View>

        <View style={styles.tuneRow}> 
          <Text style={styles.tuneLabel}>Invertir control:</Text>
          <Text onPress={() => setInvertControl(ic => !ic)} style={[styles.tuneBtn, invertControl ? styles.btnActive : null]}>{invertControl ? 'ON' : 'OFF'}</Text>
        </View>

        <View style={styles.tuneRow}> 
          <Text style={styles.tuneLabel}>Baseline Avg:</Text>
          <Text onPress={() => setBaselineAvg(b => !b)} style={[styles.tuneBtn, baselineAvg ? styles.btnActive : null]}>{baselineAvg ? 'ON' : 'OFF'}</Text>
        </View>
        <View style={styles.tuneRow}> 
          <Text style={styles.tuneLabel}>Shake to Jump:</Text>
          <Text onPress={() => setShakeToJump(s => !s)} style={[styles.tuneBtn, shakeToJump ? styles.btnActive : null]}>{shakeToJump ? 'ON' : 'OFF'}</Text>
        </View>
        <View style={styles.tuneRow}> 
          <Text style={styles.tuneLabel}>Flick to Jump:</Text>
          <Text onPress={() => setFlickToJump(f => !f)} style={[styles.tuneBtn, flickToJump ? styles.btnActive : null]}>{flickToJump ? 'ON' : 'OFF'}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gameArea: { backgroundColor: '#d9f0ff', margin: 12, borderRadius: 6, overflow: 'hidden' },
  rotationIndicator: { position: 'absolute', left: 8, top: 8, zIndex: 20, backgroundColor: 'rgba(255,255,255,0.8)', padding: 6, borderRadius: 6 },
  rotationText: { fontSize: 12, fontWeight: '700' },
  rotBarBg: { height: 6, backgroundColor: '#eee', borderRadius: 4, marginTop: 4, overflow: 'hidden' },
  rotBarFill: { height: 6, backgroundColor: '#1976d2' },
  tuning: { paddingHorizontal: 12, paddingVertical: 8 },
  tuneLabel: { fontSize: 14, fontWeight: '700', marginBottom: 6 },
  tuneRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  tuneBtn: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#eee', borderRadius: 6, marginHorizontal: 6 },
  btnActive: { backgroundColor: '#1976d2', color: '#fff' },
  player: { position: 'absolute', backgroundColor: '#ffcc00', borderWidth: 2, borderColor: '#c98f00' },
  pipeTop: { position: 'absolute', backgroundColor: '#2e7d32', top: 0 },
  pipeBottom: { position: 'absolute', backgroundColor: '#2e7d32' },
  controls: { paddingHorizontal: 12, paddingTop: 8 },
  score: { position: 'absolute', right: 24, top: 8, zIndex: 10, fontSize: 16, fontWeight: '700' },
  hint: { fontSize: 16, color: '#333' },
});
