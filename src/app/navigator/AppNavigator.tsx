import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  authenticationChanged,
  restoreAuthenticatedUser,
} from '../store/slices/authSlice';
import { supabase } from '../../shared/components/config/supabase';
import MainTabNavigator from './MainTabNavigator';
import { RootStackParamList } from './types';
import ScratchCardsScreen from '../../features/rewards/view/ScratchCardsScreen';
import LogHistoryCalendarScreen from '../../features/logAndEarn/view/LogHistoryCalendarScreen';
import LoginScreen from '../../features/auth/view/LoginScreen';
import VerifyOtpScreen from '../../features/auth/view/VerifyOtpScreen';
import AppDrawerScreen from './AppDrawerScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#FFFFFF',
  },
};

function AppNavigator() {
  const dispatch = useAppDispatch();
  const { initialized, phoneNumber, persistenceError } = useAppSelector(
    state => state.auth,
  );

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') {
        return;
      }
      dispatch(authenticationChanged(session?.user.phone ?? null));
    });

    if (!initialized) {
      dispatch(restoreAuthenticatedUser());
    }

    return () => subscription.unsubscribe();
  }, [dispatch, initialized]);

  if (!initialized) {
    return (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator color="#24855A" size="large" />
      </SafeAreaView>
    );
  }

  if (persistenceError && !phoneNumber) {
    return (
      <SafeAreaView style={styles.loading}>
        <Text style={styles.errorText}>{persistenceError}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => dispatch(restoreAuthenticatedUser())}
          style={styles.retryButton}
        >
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <NavigationContainer
      key={phoneNumber ? 'authenticated' : 'unauthenticated'}
      theme={navigationTheme}
    >
      <Stack.Navigator
        initialRouteName={phoneNumber ? 'MainTabs' : 'Login'}
        screenOptions={{ headerShown: false }}
      >
        {phoneNumber ? (
          <>
            <Stack.Screen component={MainTabNavigator} name="MainTabs" />
            <Stack.Screen component={ScratchCardsScreen} name="ScratchCards" />
            <Stack.Screen
              component={AppDrawerScreen}
              name="AppDrawer"
              options={{
                animation: 'fade',
                contentStyle: { backgroundColor: 'transparent' },
                gestureEnabled: false,
                presentation: 'transparentModal',
              }}
            />
            <Stack.Screen
              component={LogHistoryCalendarScreen}
              name="CalendarHistory"
              options={{
                animation: 'none',
                contentStyle: { backgroundColor: 'transparent' },
                gestureEnabled: false,
                presentation: 'transparentModal',
              }}
            />
          </>
        ) : (
          <>
            <Stack.Screen component={LoginScreen} name="Login" />
            <Stack.Screen component={VerifyOtpScreen} name="VerifyOtp" />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    color: '#B42318',
    fontSize: 15,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#24855A',
    borderRadius: 10,
    marginTop: 18,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default AppNavigator;
