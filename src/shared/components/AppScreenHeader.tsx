import React, { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Lucide from '@react-native-vector-icons/lucide';

type AppScreenHeaderProps = {
  title: string;
  onMenuPress: () => void;
  rightAccessory?: ReactNode;
  style?: ViewStyle;
  horizontalPadding?: number;
};

function AppScreenHeader({
  title,
  onMenuPress,
  rightAccessory,
  style,
  horizontalPadding = 20,
}: AppScreenHeaderProps) {
  return (
    <View
      style={[styles.header, { paddingHorizontal: horizontalPadding }, style]}
    >
      <Pressable
        accessibilityLabel="Open navigation menu"
        accessibilityRole="button"
        hitSlop={10}
        onPress={onMenuPress}
        style={styles.menuButton}
      >
        <Lucide color="#424242" name="menu" size={25} />
      </Pressable>
      <Text style={styles.title}>{title}</Text>
      {rightAccessory ? (
        <View style={styles.rightAccessory}>{rightAccessory}</View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 48,
  },
  menuButton: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginRight: 22,
    width: 25,
  },
  title: {
    color: '#424242',
    flex: 1,
    fontSize: 17,
    fontWeight: '500',
  },
  rightAccessory: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
});

export default AppScreenHeader;
