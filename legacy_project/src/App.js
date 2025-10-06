```javascript
import React, { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, View, Text, Platform } from 'react-native';
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
        } catch (e) {}
        setPermissionsOk({ mic: audioRes.status === 'granted', motion: motionRes.status === 'granted' });
      } catch (e) {
        console.warn('Error solicitando permisos', e);
      }
    })();
  }, []);

  return (
    <NavigationContainer>
      {!permissionsOk.mic && (
        <View style={{ backgroundColor: '#fff3cd', padding: 8 }}>
          <Text>Permiso de micrófono no otorgado. Algunas funciones pueden no funcionar.</Text>
        </View>
      )}
      <Tab.Navigator>
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Game" component={GameScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f7' },
});

```
