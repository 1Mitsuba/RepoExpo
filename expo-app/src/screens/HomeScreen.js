import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import StepCounter from '../components/StepCounter';
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
        <Text style={styles.cardTitle}>Juego (abre la pestaña &quot;Game&quot;)</Text>
        <Text>Para una experiencia completa, abre la pestaña &quot;Game&quot; en la parte inferior.</Text>
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
    backgroundColor: '#edf7ed', // Verde muy claro para fondo de toda la app
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
    color: '#1b5e20', // Verde oscuro para título principal
  },
  card: {
    backgroundColor: '#e8f5e9', // Verde muy claro para tarjetas
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#388e3c', // Sombra verde
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#c8e6c9', // Borde verde claro
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#2e7d32', // Verde oscuro para títulos de tarjetas
  },
});
