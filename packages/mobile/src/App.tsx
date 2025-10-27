import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { setupPushNotifications } from './services/notifications';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';
import AddBirthdayScreen from './screens/AddBirthdayScreen';
import EditBirthdayScreen from './screens/EditBirthdayScreen';
import ImportPreviewScreen from './screens/ImportPreviewScreen';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Home: undefined;
  AddBirthday: undefined;
  EditBirthday: { birthdayId: string };
  ImportPreview: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function AppNavigator() {
  const { user } = useAuth();
  const navigationRef = React.useRef<any>(null);

  useEffect(() => {
    if (user) {
      setupPushNotifications();

      // Check for pending imports when user is logged in
      checkForPendingImport();
    }
  }, [user]);

  const checkForPendingImport = async () => {
    const { getPendingImport } = await import('./utils/sharedStorage');
    const pendingImport = await getPendingImport();

    if (pendingImport && navigationRef.current) {
      // Small delay to ensure navigation is ready
      setTimeout(() => {
        navigationRef.current?.navigate('ImportPreview');
      }, 500);
    }
  };

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator>
        {!user ? (
          <>
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ title: 'Login' }}
            />
            <Stack.Screen
              name="Register"
              component={RegisterScreen}
              options={{ title: 'Create Account' }}
            />
          </>
        ) : (
          <>
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={{ title: 'Birthdays' }}
            />
            <Stack.Screen
              name="AddBirthday"
              component={AddBirthdayScreen}
              options={{ title: 'Add Birthday' }}
            />
            <Stack.Screen
              name="EditBirthday"
              component={EditBirthdayScreen}
              options={{ title: 'Edit Birthday' }}
            />
            <Stack.Screen
              name="ImportPreview"
              component={ImportPreviewScreen}
              options={{ title: 'Import Birthdays' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}
