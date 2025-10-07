import React from 'react';
import { View, StyleSheet } from 'react-native';
import FlappyBirdGame from '../components/FlappyBirdGame';

export default function GameScreen() {
  return (
    <View style={styles.container}>
      <FlappyBirdGame />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, backgroundColor: '#edf7ed' }, // Verde muy claro como el resto del tema
});
