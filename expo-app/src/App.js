import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import * as Permissions from 'expo-permissions';
import { Audio } from 'expo-av';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from './screens/HomeScreen';
import GameScreen from './screens/GameScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  const [permissionsOk, setPermissionsOk] = useState({ mic: false, motion: false });

  useEffect(() => {
    (async () => {
      try {
        const audioRes = await Audio.requestPermissionsAsync();
        let motionRes = { status: 'undetermined' };
        try {
          const motion = await Permissions.askAsync(Permissions.MOTION);
          motionRes = motion;
        } catch (_e) {}
        setPermissionsOk({ mic: audioRes.status === 'granted', motion: motionRes.status === 'granted' });
      } catch (e) {
        console.warn('Error solicitando permisos', e);
      }
    })();
  }, []);

  return (
    <NavigationContainer>
      {!permissionsOk.mic && (
        <View style={{ backgroundColor: '#c8e6c9', padding: 8 }}>
          <Text style={{ color: '#1b5e20' }}>Permiso de micrófono no otorgado. Algunas funciones pueden no funcionar.</Text>
        </View>
      )}
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: '#2e7d32',
          tabBarInactiveTintColor: '#66bb6a',
          tabBarStyle: { backgroundColor: '#e8f5e9' },
          headerStyle: { backgroundColor: '#c8e6c9' },
          headerTintColor: '#1b5e20',
          headerTitleStyle: { fontWeight: 'bold' },
        }}>
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Game" component={GameScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

// Nota: Estilo global definido pero no usado actualmente - se mantiene para referencias futuras
// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: '#edf7ed' },
// });
