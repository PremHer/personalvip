import React from 'react';
import { StatusBar, Platform, View, ActivityIndicator, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import ScannerScreen from './src/screens/ScannerScreen';
import GymFloorScreen from './src/screens/GymFloorScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import DailyPassScreen from './src/screens/DailyPassScreen';

const Tab = createBottomTabNavigator();

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    'Escáner': '📷',
    'Pase Diario': '⚡',
    'En Gym': '🏠',
    'Historial': '📋',
    'Perfil': '👤',
  };
  return <Text style={{ fontSize: focused ? 22 : 20, opacity: focused ? 1 : 0.5 }}>{icons[label] || '📱'}</Text>;
}

/** Roles that can access scanner / check-in */
const SCANNER_ROLES = ['SUPERADMIN', 'ADMIN', 'OWNER', 'RECEPTIONIST'];
/** Roles that can access history */
const HISTORY_ROLES = ['SUPERADMIN', 'ADMIN', 'OWNER', 'RECEPTIONIST'];

function AppContent() {
  const { user, loading } = useAuth();

  // Splash loading
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0f0a1a', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 48 }}>💪</Text>
        <ActivityIndicator size="large" color="#7c3aed" style={{ marginTop: 16 }} />
        <Text style={{ color: '#94a3b8', marginTop: 12, fontSize: 13 }}>Personal VIP</Text>
      </View>
    );
  }

  // Not logged in → Login screen
  if (!user) {
    return <LoginScreen />;
  }

  const role = user.role;
  const canScan = SCANNER_ROLES.includes(role);
  const canHistory = HISTORY_ROLES.includes(role);

  return (
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
        {canScan && (
          <Tab.Screen
            name="Escáner"
            component={ScannerScreen}
            options={{ headerTitle: '📷 Escáner QR' }}
          />
        )}
        {canScan && (
          <Tab.Screen
            name="Pase Diario"
            component={DailyPassScreen}
            options={{ headerTitle: '⚡ Pase Diario' }}
          />
        )}
        <Tab.Screen
          name="En Gym"
          component={GymFloorScreen}
          options={{ headerTitle: '🏠 En el Gimnasio' }}
        />
        {canHistory && (
          <Tab.Screen
            name="Historial"
            component={HistoryScreen}
            options={{ headerTitle: '📋 Historial de Hoy' }}
          />
        )}
        <Tab.Screen
          name="Perfil"
          component={ProfileScreen}
          options={{ headerTitle: '👤 Mi Perfil' }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar barStyle="light-content" backgroundColor="#0f0a1a" />
        <AppContent />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
