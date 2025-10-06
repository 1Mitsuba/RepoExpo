import { Accelerometer } from 'expo-sensors';

// Simple wrapper to subscribe/unsubscribe accelerometer with a given interval
export function subscribeAccelerometer(callback, interval = 100) {
  Accelerometer.setUpdateInterval(interval);
  const sub = Accelerometer.addListener(callback);
  return () => sub && sub.remove();
}

export async function isAccelerometerAvailable() {
  try {
    const res = await Accelerometer.isAvailableAsync();
    return res;
  } catch (e) {
    return false;
  }
}
