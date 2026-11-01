import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Lucide from '@react-native-vector-icons/lucide';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { clearAuthenticatedUser } from '../store/slices/authSlice';
import { MainTabParamList, RootStackParamList } from './types';

type AppDrawerScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'AppDrawer'
>;

const menuItems: Array<{
  label: string;
  icon: 'house' | 'scan' | 'coins' | 'play' | 'user-round';
  route: keyof MainTabParamList;
}> = [
  { label: 'Home', icon: 'house', route: 'Home' },
  { label: 'Hair Test', icon: 'scan', route: 'Hair Test' },
  { label: 'Log & Earn', icon: 'coins', route: 'Log & Earn' },
  { label: 'Videos', icon: 'play', route: 'Videos' },
  { label: 'You', icon: 'user-round', route: 'You' },
];

function AppDrawerScreen({ navigation }: AppDrawerScreenProps) {
  const dispatch = useAppDispatch();
  const phoneNumber = useAppSelector(state => state.auth.phoneNumber);

  const navigateToTab = (screen: keyof MainTabParamList) => {
    navigation.navigate('MainTabs', { screen });
  };

  const openRewards = () => {
    navigation.navigate('ScratchCards');
  };

  const logout = async () => {
    try {
      await dispatch(clearAuthenticatedUser()).unwrap();
    } catch (error) {
      Alert.alert(
        'Could not log out',
        typeof error === 'string'
          ? error
          : 'Your sign-in session could not be cleared. Please try again.',
      );
    }
  };

  const confirmLogout = () => {
    Alert.alert('Log out?', 'You will need to sign in again to continue.', [
      { style: 'cancel', text: 'Cancel' },
      {
        onPress: logout,
        style: 'destructive',
        text: 'Log out',
      },
    ]);
  };

  return (
    <View style={styles.overlay}>
      <Pressable
        accessibilityLabel="Close menu"
        accessibilityRole="button"
        onPress={() => navigation.goBack()}
        style={styles.backdrop}
      />
      <SafeAreaView edges={['top', 'bottom']} style={styles.drawer}>
        <View style={styles.drawerHeader}>
          <View style={styles.profileIcon}>
            <Lucide color="#FFFFFF" name="user-round" size={25} />
          </View>
          <View style={styles.profileCopy}>
            <Text style={styles.profileTitle}>Welcome to Traya</Text>
            <Text style={styles.profileSubtitle}>
              {phoneNumber ? `+91 ${phoneNumber}` : 'Your hair care journey'}
            </Text>
          </View>
          <Pressable
            accessibilityLabel="Close menu"
            accessibilityRole="button"
            hitSlop={12}
            onPress={() => navigation.goBack()}
          >
            <Lucide color="#555555" name="x" size={23} />
          </Pressable>
        </View>

        <View style={styles.menuItems}>
          {menuItems.map(item => (
            <Pressable
              key={item.route}
              accessibilityRole="button"
              onPress={() => navigateToTab(item.route)}
              style={styles.menuItem}
            >
              <Lucide color="#505050" name={item.icon} size={21} />
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Lucide color="#A1A1A1" name="chevron-right" size={18} />
            </Pressable>
          ))}
          <Pressable
            accessibilityRole="button"
            onPress={openRewards}
            style={styles.menuItem}
          >
            <Lucide color="#505050" name="gift" size={21} />
            <Text style={styles.menuLabel}>Rewards</Text>
            <Lucide color="#A1A1A1" name="chevron-right" size={18} />
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            onPress={confirmLogout}
            style={styles.logoutButton}
          >
            <Lucide color="#A3332A" name="log-out" size={20} />
            <Text style={styles.logoutLabel}>Log out</Text>
          </Pressable>
          <Text style={styles.version}>Traya</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: 'transparent',
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.48)',
  },
  drawer: {
    backgroundColor: '#FFFFFF',
    elevation: 18,
    flex: 1,
    maxWidth: 360,
    paddingHorizontal: 22,
    shadowColor: '#000000',
    shadowOffset: { width: 5, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
  },
  drawerHeader: {
    alignItems: 'center',
    borderBottomColor: '#EEEEEE',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 24,
    paddingTop: 16,
  },
  profileIcon: {
    alignItems: 'center',
    backgroundColor: '#424242',
    borderRadius: 25,
    height: 50,
    justifyContent: 'center',
    width: 50,
  },
  profileCopy: {
    flex: 1,
    gap: 4,
  },
  profileTitle: {
    color: '#303030',
    fontSize: 17,
    fontWeight: '600',
  },
  profileSubtitle: {
    color: '#777777',
    fontSize: 13,
  },
  menuItems: {
    paddingTop: 18,
  },
  menuItem: {
    alignItems: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 14,
    minHeight: 54,
    paddingHorizontal: 12,
  },
  menuLabel: {
    color: '#424242',
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  footer: {
    borderTopColor: '#EEEEEE',
    borderTopWidth: StyleSheet.hairlineWidth,
    flex: 1,
    justifyContent: 'space-between',
    marginTop: 20,
    paddingTop: 20,
  },
  logoutButton: {
    alignItems: 'center',
    backgroundColor: '#FFF5F4',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 14,
    minHeight: 52,
    paddingHorizontal: 12,
  },
  logoutLabel: {
    color: '#A3332A',
    fontSize: 15,
    fontWeight: '600',
  },
  version: {
    color: '#A0A0A0',
    fontSize: 12,
    paddingBottom: 8,
    textAlign: 'center',
  },
});

export default AppDrawerScreen;
