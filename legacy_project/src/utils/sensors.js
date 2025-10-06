```javascript
import { Accelerometer } from 'expo-sensors';

export function subscribeAccelerometer(cb, interval = 100) {
  Accelerometer.setUpdateInterval(interval);
  const sub = Accelerometer.addListener((data) => cb(data));
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

```
