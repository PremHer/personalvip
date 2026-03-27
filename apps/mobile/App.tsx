import React from 'react';
import { StatusBar, Platform, View, ActivityIndicator, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import ScannerScreen from './src/screens/ScannerScreen';
import GymFloorScreen from './src/screens/GymFloorScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import DailyPassScreen from './src/screens/DailyPassScreen';

const Tab = createMaterialTopTabNavigator();

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    'Escáner': '📷',
    'Pase Diario': '⚡',
    'En Gym': '🏠',
    'Historial': '📋',
    'Perfil': '👤',
  };
  return <Text style={{ fontSize: focused ? 18 : 16, opacity: focused ? 1 : 0.5 }}>{icons[label] || '📱'}</Text>;
}

/** Roles that can access scanner / check-in */
const SCANNER_ROLES = ['SUPERADMIN', 'ADMIN', 'OWNER', 'RECEPTIONIST'];
/** Roles that can access history */
const HISTORY_ROLES = ['SUPERADMIN', 'ADMIN', 'OWNER', 'RECEPTIONIST'];

function AppContent() {
  const { user, loading } = useAuth();
  const insets = useSafeAreaInsets();

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
    <View style={{ flex: 1, paddingTop: Math.max(insets.top, 20), backgroundColor: '#0f0a1a' }}>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarStyle: {
              backgroundColor: '#0f0a1a',
              borderBottomColor: 'rgba(124,58,237,0.15)',
              borderBottomWidth: 1,
              elevation: 0,
              shadowOpacity: 0,
            },
            tabBarIndicatorStyle: {
              backgroundColor: '#7c3aed',
              height: 3,
            },
            tabBarActiveTintColor: '#7c3aed',
            tabBarInactiveTintColor: '#64748b',
            tabBarLabelStyle: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
            tabBarItemStyle: { padding: 4 },
            tabBarIcon: ({ focused }) => <TabIcon label={route.name} focused={focused} />,
            tabBarIconStyle: { width: 24, height: 24 },
          })}
        >
          {canScan && (
            <Tab.Screen
              name="Escáner"
              component={ScannerScreen}
            />
          )}
          {canScan && (
            <Tab.Screen
              name="Pase Diario"
              component={DailyPassScreen}
            />
          )}
          <Tab.Screen
            name="En Gym"
            component={GymFloorScreen}
          />
          {canHistory && (
            <Tab.Screen
              name="Historial"
              component={HistoryScreen}
            />
          )}
          <Tab.Screen
            name="Perfil"
            component={ProfileScreen}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </View>
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
