import React from 'react';
import { Image, ImageSourcePropType, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ComingSoonScreen from './ComingSoonScreen';
import LogAndEarnScreen from '../../features/logAndEarn/view/LogAndEarnScreen';
import { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

const tabIcons = {
  Home: require('../../shared/assets/home.png'),
  'Hair Test': require('../../shared/assets/hair-test.png'),
  'Log & Earn': require('../../shared/assets/log&earn.png'),
  Videos: require('../../shared/assets/videos.png'),
  You: require('../../shared/assets/you.png'),
};

const renderTabIcon = (source: ImageSourcePropType) => () =>
  <Image resizeMode="contain" source={source} style={styles.tabIcon} />;

const tabBarIcons = {
  Home: renderTabIcon(tabIcons.Home),
  'Hair Test': renderTabIcon(tabIcons['Hair Test']),
  'Log & Earn': renderTabIcon(tabIcons['Log & Earn']),
  Videos: renderTabIcon(tabIcons.Videos),
  You: renderTabIcon(tabIcons.You),
};

function HomeScreen() {
  return <ComingSoonScreen title="Home" />;
}

function HairTestScreen() {
  return <ComingSoonScreen title="Hair Test" />;
}

function VideosScreen() {
  return <ComingSoonScreen title="Videos" />;
}

function ProfileScreen() {
  return <ComingSoonScreen title="You" />;
}

function MainTabNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#363636',
        tabBarInactiveTintColor: '#363636',
        tabBarLabelStyle: {
          fontSize: 10,
          marginTop: 1,
        },
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E5E5E5',
          height: 58 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 4),
          paddingTop: 4,
        },
        tabBarIcon: tabBarIcons[route.name],
      })}
    >
      <Tab.Screen component={HomeScreen} name="Home" />
      <Tab.Screen component={HairTestScreen} name="Hair Test" />
      <Tab.Screen component={LogAndEarnScreen} name="Log & Earn" />
      <Tab.Screen component={VideosScreen} name="Videos" />
      <Tab.Screen component={ProfileScreen} name="You" />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabIcon: {
    height: 24,
    width: 24,
  },
});

export default MainTabNavigator;
