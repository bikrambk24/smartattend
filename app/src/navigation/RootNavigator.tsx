import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import AdminFingerprintScreen from '../screens/AdminFingerprintScreen';
import StudentTabNavigator from './StudentTabNavigator';

export type RootStackParamList = {
  Login: undefined;
  StudentTabs: undefined;
  AdminFingerprint: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { token, role, loading } = useAuth();

  if (loading) {
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!token ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : role === 'admin' ? (
          <Stack.Screen
            name="AdminFingerprint"
            component={AdminFingerprintScreen}
            options={{ headerShown: true, title: 'Capture Fingerprint' }}
          />
        ) : (
          <Stack.Screen name="StudentTabs" component={StudentTabNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}