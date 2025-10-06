```javascript
import React from 'react';
import { View, ScrollView, Text, StyleSheet } from 'react-native';
import StepCounter from '../components/StepCounter';
import DecibelMeter from '../components/DecibelMeter';
import DirectionDetector from '../components/DirectionDetector';

export default function HomeScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Home</Text>
      <StepCounter />
      <DecibelMeter />
      <DirectionDetector />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 12 },
  title: { fontSize: 20, marginBottom: 12 },
});

```
