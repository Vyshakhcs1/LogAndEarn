import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AppScreenHeader from '../../shared/components/AppScreenHeader';
import { MainTabParamList, RootStackParamList } from './types';

type ComingSoonScreenProps = {
  title: string;
};

function ComingSoonScreen({ title }: ComingSoonScreenProps) {
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const stackNavigation =
    navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppScreenHeader
        onMenuPress={() => stackNavigation?.navigate('AppDrawer')}
        title={title}
      />
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>Coming soon</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#FFFFFF',
    flex: 1,
  },
  content: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: '#424242',
    fontSize: 21,
    fontWeight: '600',
  },
  message: {
    color: '#707070',
    fontSize: 15,
    marginTop: 8,
  },
});

export default ComingSoonScreen;
