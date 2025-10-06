import React from 'react';
import { View, Text, StyleSheet, ScrollView, Button } from 'react-native';
import StepCounter from '../components/StepCounter';
import FlappyBirdGame from '../components/FlappyBirdGame';
import DecibelMeter from '../components/DecibelMeter';
import DirectionDetector from '../components/DirectionDetector';

export default function HomeScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Práctica 3.1 - Sensores y Juegos (Expo)</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Contador de Pasos</Text>
        <StepCounter />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Juego (Flappy Bird simple)</Text>
        <FlappyBirdGame />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Medidor de Decibeles</Text>
        <DecibelMeter />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Detector de Dirección</Text>
        <DirectionDetector />
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    alignItems: 'stretch',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
});
