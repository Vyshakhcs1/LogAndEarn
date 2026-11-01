import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

type CircularProgressProps = {
  current: number;
  total: number;
  label: string;
};

const size = 64;
const strokeWidth = 8;
const center = size / 2;
const radius = (size - strokeWidth) / 2;
const circumference = 2 * Math.PI * radius;

function CircularProgress({ current, total, label }: CircularProgressProps) {
  const progress = total > 0 ? Math.min(Math.max(current / total, 0), 1) : 0;
  const progressLength = circumference * progress;

  return (
    <View
      accessibilityLabel={`${current} of ${total} logged`}
      accessibilityRole="progressbar"
      style={styles.container}
    >
      <Svg height={size} width={size}>
        <Defs>
          <LinearGradient
            gradientUnits="userSpaceOnUse"
            id="progressGradient"
            x1="16"
            x2="54"
            y1="8"
            y2="57"
          >
            <Stop offset="0" stopColor="#68AE8B" />
            <Stop offset="0.48" stopColor="#218257" />
            <Stop offset="0.78" stopColor="#25895D" />
            <Stop offset="1" stopColor="#6CB28F" />
          </LinearGradient>
        </Defs>
        <Circle
          cx={center}
          cy={center}
          fill="none"
          r={radius}
          stroke="#DEDEDE"
          strokeWidth={strokeWidth}
        />
        {progress > 0 ? (
          <Circle
            cx={center}
            cy={center}
            fill="none"
            r={radius}
            rotation={-90}
            origin={`${center}, ${center}`}
            stroke="url(#progressGradient)"
            strokeDasharray={`${progressLength} ${
              circumference - progressLength
            }`}
            strokeLinecap="round"
            strokeWidth={strokeWidth}
          />
        ) : null}
      </Svg>
      <View pointerEvents="none" style={styles.copy}>
        <Text style={styles.value}>
          {current}/{total}
        </Text>
        <Text style={styles.label}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    height: size,
    justifyContent: 'center',
    width: size,
  },
  copy: {
    alignItems: 'center',
    position: 'absolute',
  },
  value: {
    color: '#174D37',
    fontSize: 13,
    fontWeight: '500',
  },
  label: {
    color: '#686868',
    fontSize: 9,
    marginTop: 1,
  },
});

export default CircularProgress;
