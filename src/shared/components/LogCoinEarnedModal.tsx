import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Lucide from '@react-native-vector-icons/lucide';

type WeeklyProgressDay = {
  date: string;
  status: 'logged' | 'lifeline' | 'missed' | 'pending' | 'reward';
};

type LogCoinEarnedModalProps = {
  visible: boolean;
  onClose: () => void;
  coinsEarned: number;
  weeklyRewardCoins?: number;
  today: string;
  weekDays: WeeklyProgressDay[];
};

const weekdays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function LogCoinEarnedModal({
  visible,
  onClose,
  coinsEarned,
  weeklyRewardCoins = 0,
  today,
  weekDays,
}: LogCoinEarnedModalProps) {
  const badgeRotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      return;
    }

    badgeRotation.setValue(0);
    const rotationAnimation = Animated.timing(badgeRotation, {
      toValue: 1,
      duration: 1700,
      easing: Easing.out(Easing.back(1.5)),
      useNativeDriver: true,
    });
    rotationAnimation.start();

    return () => {
      rotationAnimation.stop();
    };
  }, [badgeRotation, visible]);

  const todayIndex = weekDays.findIndex(day => day.date === today);
  const streakDays =
    todayIndex < 0 ? 1 : countCurrentStreak(weekDays, todayIndex);
  const remainingDays = Math.max(0, 7 - streakDays);

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent={false}
      visible={visible}
    >
      <SafeAreaView edges={['top', 'bottom']} style={styles.modal}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Close coin reward"
            accessibilityRole="button"
            hitSlop={12}
            onPress={onClose}
            style={styles.closeButton}
          >
            <Lucide color="#303030" name="x" size={24} />
          </Pressable>
        </View>

        <View style={styles.content}>
          <Text style={styles.heading}>{streakDays}-Day Streak!</Text>
          <View style={styles.rewardCard}>
            <Animated.View
              style={[
                styles.coinBadge,
                {
                  transform: [
                    {
                      rotate: badgeRotation.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg'],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Lucide color="#FFFFFF" name="sparkles" size={55} />
            </Animated.View>
            <Text style={styles.coinAmount}>{coinsEarned} Coins Earned</Text>
            {weeklyRewardCoins > 0 ? (
              <Text style={styles.weeklyRewardText}>
                Includes {weeklyRewardCoins} weekly streak reward coins
              </Text>
            ) : null}

            <View style={styles.weekRow}>
              {weekdays.map((weekday, index) => {
                const day = weekDays[index];
                return (
                  <View key={`${weekday}-${index}`} style={styles.weekDay}>
                    <Text style={styles.weekdayLabel}>{weekday}</Text>
                    <WeekdayStatus status={day?.status ?? 'pending'} />
                  </View>
                );
              })}
            </View>

            <View style={styles.rewardProgress}>
              <Text style={styles.rewardProgressText}>
                {remainingDays === 0
                  ? 'Mystery reward unlocked!'
                  : `Log ${remainingDays} more ${
                      remainingDays === 1 ? 'day' : 'days'
                    } to unlock mystery reward`}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={styles.doneButton}
          >
            <Text style={styles.doneText}>Done</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function countCurrentStreak(days: WeeklyProgressDay[], todayIndex: number) {
  let count = 0;

  for (let index = todayIndex; index >= 0; index -= 1) {
    const status = days[index].status;
    if (status !== 'logged' && status !== 'lifeline') {
      break;
    }
    count += 1;
  }

  return count || 1;
}

function WeekdayStatus({ status }: { status: WeeklyProgressDay['status'] }) {
  if (status === 'logged') {
    return (
      <Image
        accessible={false}
        source={require('../assets/streak.png')}
        style={styles.statusIcon}
      />
    );
  }

  if (status === 'lifeline') {
    return (
      <Image
        accessible={false}
        source={require('../assets/lifeline.png')}
        style={styles.statusIcon}
      />
    );
  }

  if (status === 'reward') {
    return (
      <Image
        accessible={false}
        source={require('../assets/reward.png')}
        style={styles.rewardIcon}
      />
    );
  }

  if (status === 'missed') {
    return <View style={styles.missedDay} />;
  }

  return <View style={styles.pendingDay} />;
}

const styles = StyleSheet.create({
  modal: {
    backgroundColor: '#FFFFFF',
    flex: 1,
  },
  header: {
    alignItems: 'center',
    height: 52,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  closeButton: {
    alignItems: 'center',
    height: 42,
    justifyContent: 'center',
    position: 'absolute',
    right: 18,
    width: 42,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  heading: {
    color: '#424242',
    fontSize: 28,
    fontWeight: '500',
    marginBottom: 22,
    textAlign: 'center',
  },
  rewardCard: {
    backgroundColor: '#F7F7F7',
    borderRadius: 34,
    overflow: 'hidden',
    paddingTop: 34,
  },
  coinBadge: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#FFB534',
    borderRadius: 34,
    height: 112,
    justifyContent: 'center',
    width: 112,
  },
  coinAmount: {
    color: '#424242',
    fontSize: 25,
    marginTop: 17,
    textAlign: 'center',
  },
  weeklyRewardText: {
    color: '#24855A',
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingHorizontal: 8,
    paddingBottom: 10,
  },
  weekDay: {
    alignItems: 'center',
    gap: 6,
  },
  weekdayLabel: {
    color: '#424242',
    fontSize: 11,
  },
  statusIcon: {
    height: 27,
    width: 27,
  },
  rewardIcon: {
    height: 27,
    width: 27,
  },
  pendingDay: {
    borderColor: '#C9C9C9',
    borderRadius: 14,
    borderWidth: 1,
    height: 27,
    width: 27,
  },
  missedDay: {
    backgroundColor: '#D9272E',
    borderRadius: 14,
    height: 15,
    margin: 6,
    width: 15,
  },
  rewardProgress: {
    alignItems: 'center',
    backgroundColor: '#58A9C4',
    justifyContent: 'center',
    minHeight: 62,
    paddingHorizontal: 14,
  },
  rewardProgressText: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
  },
  footer: {
    borderTopColor: '#E5E5E5',
    borderTopWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 8,
  },
  doneButton: {
    alignItems: 'center',
    backgroundColor: '#424242',
    borderRadius: 14,
    height: 58,
    justifyContent: 'center',
  },
  doneText: {
    color: '#FFFFFF',
    fontSize: 17,
  },
});

export default LogCoinEarnedModal;
