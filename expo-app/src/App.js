import React, { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, Platform, Text, View } from 'react-native';
import * as Permissions from 'expo-permissions';
import { Audio } from 'expo-av';
import HomeScreen from './screens/HomeScreen';

export default function App() {
  const [permissionsOk, setPermissionsOk] = useState({ mic: false, motion: false });

  useEffect(() => {
    (async () => {
      try {
        // Solicita permiso de micrófono
        const audioRes = await Audio.requestPermissionsAsync();
        // También intentamos pedir permiso de motion (iOS) mediante expo-permissions si está disponible
        let motionRes = { status: 'undetermined' };
        try {
          // expo-permissions todavía expone PERMISSIONS constants
          const motion = await Permissions.askAsync(Permissions.MOTION);
          motionRes = motion;
        } catch (e) {
          // ignore si no está disponible
        }
        setPermissionsOk({ mic: audioRes.status === 'granted', motion: motionRes.status === 'granted' });
      } catch (e) {
        console.warn('Error solicitando permisos', e);
      }
    })();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {!permissionsOk.mic && (
        <View style={{ backgroundColor: '#fff3cd', padding: 8 }}>
          <Text>Permiso de micrófono no otorgado. Algunas funciones pueden no funcionar.</Text>
        </View>
      )}
      <HomeScreen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7f7',
  },
});
