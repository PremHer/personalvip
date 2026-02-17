import React from 'react';
import { StatusBar, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import ScannerScreen from './src/screens/ScannerScreen';
import GymFloorScreen from './src/screens/GymFloorScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import { Text } from 'react-native';

const Tab = createBottomTabNavigator();

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    'Escáner': '📷',
    'En Gym': '🏠',
    'Historial': '📋',
    'Perfil': '👤',
  };
  return <Text style={{ fontSize: focused ? 22 : 20, opacity: focused ? 1 : 0.5 }}>{icons[label] || '📱'}</Text>;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar barStyle="light-content" backgroundColor="#0f0a1a" />
        <NavigationContainer>
          <Tab.Navigator
            screenOptions={({ route }) => ({
              headerShown: true,
              headerStyle: { backgroundColor: '#0f0a1a', elevation: 0, shadowOpacity: 0 },
              headerTitleStyle: { color: '#e2e8f0', fontWeight: '700', fontSize: 16 },
              headerTitleAlign: 'center',
              tabBarStyle: {
                backgroundColor: '#0f0a1a',
                borderTopColor: 'rgba(124,58,237,0.15)',
                borderTopWidth: 1,
                height: Platform.OS === 'ios' ? 85 : 60,
                paddingBottom: Platform.OS === 'ios' ? 25 : 8,
                paddingTop: 6,
              },
              tabBarActiveTintColor: '#7c3aed',
              tabBarInactiveTintColor: '#64748b',
              tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
              tabBarIcon: ({ focused }) => <TabIcon label={route.name} focused={focused} />,
            })}
          >
            <Tab.Screen
              name="Escáner"
              component={ScannerScreen}
              options={{ headerTitle: '🏋️ GymCore Scanner' }}
            />
            <Tab.Screen
              name="En Gym"
              component={GymFloorScreen}
              options={{ headerTitle: '🏠 En el Gimnasio' }}
            />
            <Tab.Screen
              name="Historial"
              component={HistoryScreen}
              options={{ headerTitle: '📋 Historial de Hoy' }}
            />
            <Tab.Screen
              name="Perfil"
              component={ProfileScreen}
              options={{ headerTitle: '👤 Mi Perfil' }}
            />
          </Tab.Navigator>
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
