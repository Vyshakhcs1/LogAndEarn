import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Image,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Calendar, CalendarProps } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../app/navigator/types';
import { CalendarDayEntry } from '../model/logAndEarnData';

type LogHistoryCalendarScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'CalendarHistory'
>;

type CalendarDayProps = React.ComponentProps<
  NonNullable<CalendarProps['dayComponent']>
>;

const calendarTheme: CalendarProps['theme'] = {
  backgroundColor: '#FFFFFF',
  calendarBackground: '#FFFFFF',
  dayTextColor: '#424242',
  textDayFontSize: 14,
  textDayHeaderFontSize: 13,
  textDisabledColor: '#A5A5A5',
  textMonthFontSize: 22,
  textMonthFontWeight: '600',
  monthTextColor: '#424242',
  arrowColor: '#424242',
  textSectionTitleColor: '#424242',
};

const entryByDate = (entries: CalendarDayEntry[]) =>
  new Map(entries.map(entry => [entry.date, entry]));

function LogHistoryCalendarScreen({
  navigation,
  route,
}: LogHistoryCalendarScreenProps) {
  const { entries, initialMonth, initialSelectedDate } = route.params;
  const { height: windowHeight } = useWindowDimensions();
  const [selectedDate, setSelectedDate] = useState(initialSelectedDate);
  const [visibleMonth, setVisibleMonth] = useState(initialMonth.slice(0, 7));
  const sheetTranslateY = useRef(new Animated.Value(windowHeight)).current;
  const isClosing = useRef(false);
  const entriesByDate = useMemo(() => entryByDate(entries), [entries]);
  const visibleSummary = useMemo(() => {
    const monthEntries = entries.filter(entry =>
      entry.date.startsWith(visibleMonth),
    );
    return monthEntries.reduce(
      (summary, entry) => ({
        daysLogged: summary.daysLogged + Number(entry.status === 'logged'),
        daysMissed: summary.daysMissed + Number(entry.status === 'missed'),
        coinsMissed: summary.coinsMissed + (entry.coinsMissed ?? 0),
        rewardsMissed: summary.rewardsMissed + (entry.rewardsMissed ?? 0),
      }),
      {
        daysLogged: 0,
        daysMissed: 0,
        coinsMissed: 0,
        rewardsMissed: 0,
      },
    );
  }, [entries, visibleMonth]);
  const markedDates = useMemo(
    () => ({ [selectedDate]: { selected: true } }),
    [selectedDate],
  );
  const backdropOpacity = sheetTranslateY.interpolate({
    inputRange: [0, windowHeight],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    Animated.spring(sheetTranslateY, {
      toValue: 0,
      damping: 24,
      stiffness: 220,
      mass: 0.8,
      useNativeDriver: true,
    }).start();
  }, [sheetTranslateY]);

  const closeScreen = useCallback(() => {
    if (isClosing.current) {
      return;
    }

    isClosing.current = true;
    Animated.timing(sheetTranslateY, {
      toValue: windowHeight,
      duration: 200,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && navigation.canGoBack()) {
        navigation.goBack();
      }
    });
  }, [navigation, sheetTranslateY, windowHeight]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          gestureState.dy > 4 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
        onPanResponderMove: (_, gestureState) => {
          sheetTranslateY.setValue(Math.max(0, gestureState.dy));
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy > 100 || gestureState.vy > 1.2) {
            closeScreen();
            return;
          }

          Animated.spring(sheetTranslateY, {
            toValue: 0,
            damping: 24,
            stiffness: 220,
            mass: 0.8,
            useNativeDriver: true,
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(sheetTranslateY, {
            toValue: 0,
            damping: 24,
            stiffness: 220,
            mass: 0.8,
            useNativeDriver: true,
          }).start();
        },
      }),
    [closeScreen, sheetTranslateY],
  );

  const renderDay = useCallback<NonNullable<CalendarProps['dayComponent']>>(
    props => (
      <CalendarDay
        {...props}
        entriesByDate={entriesByDate}
        selectedDate={selectedDate}
        onSelect={setSelectedDate}
      />
    ),
    [entriesByDate, selectedDate],
  );
  const handleDayPress = useCallback(
    (day: { dateString: string }) => {
      setSelectedDate(day.dateString);
      setVisibleMonth(day.dateString.slice(0, 7));
    },
    [],
  );

  return (
    <View style={styles.overlay}>
      <Animated.View
        pointerEvents="none"
        style={[styles.backdrop, { opacity: backdropOpacity }]}
      />
      <Pressable
        accessibilityLabel="Close calendar"
        accessibilityRole="button"
        onPress={closeScreen}
        style={styles.backdropPressable}
      />
      <Animated.View
        style={[styles.sheet, { transform: [{ translateY: sheetTranslateY }] }]}
      >
        <SafeAreaView edges={['bottom']} style={styles.sheetContent}>
          <View style={styles.sheetHeader} {...panResponder.panHandlers}>
            <View style={styles.handle} />
          </View>
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <Calendar
              current={`${visibleMonth}-01`}
              dayComponent={renderDay}
              enableSwipeMonths
              hideExtraDays={false}
              onDayPress={handleDayPress}
              onMonthChange={date =>
                setVisibleMonth(date.dateString.slice(0, 7))
              }
              markedDates={markedDates}
              style={styles.calendar}
              theme={calendarTheme}
            />

            <View style={styles.legend}>
              <LegendItem
                icon={require('../../../shared/assets/streak.png')}
                label="Logged"
              />
              <LegendItem
                icon={require('../../../shared/assets/lifeline.png')}
                label="Lifeline"
              />
              <View style={styles.legendItem}>
                <View style={styles.missedLegendDot} />
                <Text style={styles.legendLabel}>Missed</Text>
              </View>
              <LegendItem
                icon={require('../../../shared/assets/reward.png')}
                label="Reward day"
              />
            </View>

            <View style={styles.summaryGrid}>
              <SummaryCard
                icon={require('../../../shared/assets/streak.png')}
                value={visibleSummary.daysLogged}
                label="Days logged"
              />
              <SummaryCard
                icon={require('../../../shared/assets/streak-gray.png')}
                value={visibleSummary.daysMissed}
                label="Days missed"
              />
              <SummaryCard
                icon={require('../../../shared/assets/coin-gray.png')}
                value={visibleSummary.coinsMissed}
                label="Coins missed"
              />
              <SummaryCard
                icon={require('../../../shared/assets/reward-gray2.png')}
                value={visibleSummary.rewardsMissed}
                label="Rewards missed"
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
}

const CalendarDay = memo(function CalendarDayView({
  date,
  state,
  onPress,
  entriesByDate,
  selectedDate,
  onSelect,
}: CalendarDayProps & {
  entriesByDate: Map<string, CalendarDayEntry>;
  selectedDate: string;
  onSelect: (date: string) => void;
}) {
  if (!date) {
    return <View style={styles.emptyDay} />;
  }

  const entry = entriesByDate.get(date.dateString);
  const isSelected = selectedDate === date.dateString;
  const isCurrentMonth = state !== 'disabled' && state !== 'inactive';
  const isUpcoming = date.dateString > toDateKey(new Date());
  const isRangeDay = !isUpcoming && isCalendarActivity(entry);
  const dateValue = new Date(`${date.dateString}T12:00:00`);
  const previousDate = new Date(dateValue);
  previousDate.setDate(previousDate.getDate() - 1);
  const nextDate = new Date(dateValue);
  nextDate.setDate(nextDate.getDate() + 1);
  const previousEntry = entriesByDate.get(toDateKey(previousDate));
  const nextEntry = entriesByDate.get(toDateKey(nextDate));
  const isRangeStart = !isCalendarActivity(previousEntry);
  const isRangeEnd = !isCalendarActivity(nextEntry);
  const dateIcon = isUpcoming
    ? undefined
    : entry?.status === 'lifeline'
    ? require('../../../shared/assets/lifeline.png')
    : entry?.status === 'reward'
    ? require('../../../shared/assets/reward.png')
    : undefined;

  return (
    <Pressable
      accessibilityLabel={`${date.dateString}${
        entry ? `, ${entry.status}` : ''
      }`}
      accessibilityRole="button"
      onPress={() => {
        onSelect(date.dateString);
        onPress?.(date);
      }}
      style={[
        styles.dayCell,
        isRangeDay && styles.rangeDay,
        isRangeDay && isRangeStart && styles.rangeStart,
        isRangeDay && isRangeEnd && styles.rangeEnd,
      ]}
    >
      <View style={[styles.dayNumberWrap, isSelected && styles.selectedDay]}>
        {dateIcon ? (
          <Image
            accessible={false}
            source={dateIcon}
            style={[
              styles.dateStatusIcon,
              entry?.status === 'reward' && styles.rewardDayIcon,
            ]}
          />
        ) : null}
        {!dateIcon ? (
          <Text
            style={[
              styles.dayNumber,
              !isCurrentMonth && styles.outsideMonthNumber,
              entry?.status === 'logged' && styles.loggedNumber,
              entry?.status === 'missed' && styles.missedNumber,
            ]}
          >
            {date.day}
          </Text>
        ) : null}
      </View>
      {entry && entry.status !== 'pending' && !isUpcoming ? (
        <Image
          accessible={false}
          source={
            entry.status === 'missed'
              ? require('../../../shared/assets/coin-gray.png')
              : require('../../../shared/assets/coin.png')
          }
          style={styles.coinMarker}
        />
      ) : null}
    </Pressable>
  );
});

function isCalendarActivity(entry?: CalendarDayEntry) {
  return entry?.status === 'logged' || entry?.status === 'lifeline';
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function LegendItem({ icon, label }: { icon: number; label: string }) {
  return (
    <View style={styles.legendItem}>
      <Image accessible={false} source={icon} style={styles.legendIcon} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

function SummaryCard({
  icon,
  value,
  label,
  muted = false,
}: {
  icon: number;
  value: number;
  label: string;
  muted?: boolean;
}) {
  return (
    <View style={styles.summaryCard}>
      <Image
        accessible={false}
        source={icon}
        style={[styles.summaryIcon, muted && styles.mutedIcon]}
      />
      <View style={styles.summaryCopy}>
        <Text style={[styles.summaryValue, muted && styles.mutedText]}>
          {value}
        </Text>
        <Text style={styles.summaryLabel}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
  },
  backdropPressable: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: '94%',
    overflow: 'hidden',
  },
  sheetContent: {
    flex: 1,
  },
  sheetHeader: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: '#D9D9D9',
    borderRadius: 3,
    height: 6,
    width: 88,
  },
  content: {
    paddingBottom: 18,
    paddingHorizontal: 22,
  },
  calendar: {
    marginTop: 16,
  },
  emptyDay: {
    height: 76,
    width: '100%',
  },
  dayCell: {
    alignItems: 'center',
    height: 76,
    justifyContent: 'flex-start',
    paddingTop: 3,
    width: '100%',
  },
  rangeDay: {
    backgroundColor: '#E8F5F9',
  },
  rangeStart: {
    borderBottomLeftRadius: 24,
    borderTopLeftRadius: 24,
  },
  rangeEnd: {
    borderBottomRightRadius: 24,
    borderTopRightRadius: 24,
  },
  dayNumberWrap: {
    alignItems: 'center',
    borderColor: 'transparent',
    borderRadius: 22,
    borderWidth: 1.5,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  selectedDay: {
    borderColor: '#424242',
  },
  dateStatusIcon: {
    height: 22,
    width: 22,
  },
  rewardDayIcon: {
    height: 24,
    width: 24,
  },
  dayNumber: {
    color: '#555555',
    fontSize: 14,
    lineHeight: 17,
  },
  outsideMonthNumber: {
    color: '#A5A5A5',
  },
  loggedNumber: {
    color: '#1997F7',
  },
  missedNumber: {
    color: '#D9272E',
    fontWeight: '600',
  },
  coinMarker: {
    height: 13,
    marginTop: 1,
    width: 13,
  },
  legend: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    columnGap: 12,
    marginTop: 18,
    rowGap: 8,
  },
  legendItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  legendIcon: {
    height: 14,
    width: 14,
  },
  missedLegendDot: {
    backgroundColor: '#D9272E',
    borderRadius: 6,
    height: 12,
    width: 12,
  },
  legendLabel: {
    color: '#424242',
    fontSize: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 26,
  },
  summaryCard: {
    alignItems: 'center',
    backgroundColor: '#F6F6F6',
    borderRadius: 22,
    flexDirection: 'row',
    flexBasis: '47%',
    flexGrow: 1,
    gap: 12,
    minHeight: 82,
    paddingHorizontal: 16,
  },
  summaryIcon: {
    height: 32,
    width: 32,
  },
  mutedIcon: {
    tintColor: '#B7B7B7',
  },
  summaryCopy: {
    flex: 1,
    gap: 2,
  },
  summaryValue: {
    color: '#424242',
    fontSize: 25,
  },
  mutedText: {
    color: '#555555',
  },
  summaryLabel: {
    color: '#424242',
    fontSize: 14,
  },
});

export default LogHistoryCalendarScreen;
