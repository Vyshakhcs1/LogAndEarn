import React, { useEffect, useState } from 'react';
import {
  AppState,
  Alert,
  ActivityIndicator,
  Image,
  ImageSourcePropType,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  fetchLogAndEarnData,
  syncToday,
} from '../../../app/store/slices/logAndEarnSlice';
import { useAppDispatch } from '../../../app/store/hooks';
import AppScreenHeader from '../../../shared/components/AppScreenHeader';
import CircularProgress from '../../../shared/components/CircularProgress';
import LogCoinEarnedModal from '../../../shared/components/LogCoinEarnedModal';
import SupplementBottle from '../../../shared/components/SupplementBottle';
import {
  CalendarDayStatus,
  DoseSlot,
  isLogAndEarnDateLogged,
} from '../model/logAndEarnData';
import useLogAndEarnViewModel from '../viewmodel/useLogAndEarnViewModel';
import Lucide from '@react-native-vector-icons/lucide';
import {
  MainTabParamList,
  RootStackParamList,
} from '../../../app/navigator/types';

const ink = '#424242';
const muted = '#707070';
const green = '#24855A';
const paleBlue = '#DDEEF2';
const border = '#DDDDDD';

function isDoseSlot(slot: string): slot is DoseSlot {
  return slot === 'morning' || slot === 'evening';
}

function isCalendarDayStatus(status: string): status is CalendarDayStatus {
  return (
    status === 'logged' ||
    status === 'lifeline' ||
    status === 'missed' ||
    status === 'reward' ||
    status === 'pending'
  );
}

function formatTodayDisplayDate() {
  const formattedDate = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
  return `${formattedDate}, Today`;
}

function LogAndEarnScreen() {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const stackNavigation =
    navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
  const [isRemovalMode, setIsRemovalMode] = useState(false);
  const [isLogSuccessVisible, setIsLogSuccessVisible] = useState(false);
  const [modalCoinsEarned, setModalCoinsEarned] = useState(0);
  const {
    data,
    fetchStatus,
    fetchError,
    dailyLogs,
    weeklyLogs,
    allDailySelected,
    logged,
    isLogging,
    weeklyRewardCoinsEarned,
    loggedDoseCount,
    dailyProducts,
    weeklyProducts,
    selectedProductIds,
    toggleDose,
    toggleAllDaily,
    toggleWeekly,
    toggleProductSelection,
    clearProductSelection,
    removeSelectedProducts,
    logNow,
  } = useLogAndEarnViewModel();

  useEffect(() => {
    dispatch(fetchLogAndEarnData());
  }, [dispatch]);

  useEffect(() => {
    const appStateSubscription = AppState.addEventListener(
      'change',
      nextAppState => {
        if (nextAppState === 'active') {
          dispatch(syncToday());
        }
      },
    );

    let midnightTimeout: ReturnType<typeof setTimeout>;
    const scheduleMidnightSync = () => {
      const now = new Date();
      const nextMidnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        0,
        0,
        1,
      );
      midnightTimeout = setTimeout(() => {
        dispatch(syncToday());
        scheduleMidnightSync();
      }, nextMidnight.getTime() - now.getTime());
    };

    scheduleMidnightSync();

    return () => {
      clearTimeout(midnightTimeout);
      appStateSubscription.remove();
    };
  }, [dispatch]);

  if (fetchStatus === 'idle' || fetchStatus === 'loading') {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <AppScreenHeader
          horizontalPadding={20}
          onMenuPress={() => stackNavigation?.navigate('AppDrawer')}
          title="Kit Tracker"
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={green} size="large" />
          <Text style={styles.loadingText}>
            Loading your Log &amp; Earn data...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (fetchStatus === 'failed' || !data) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <AppScreenHeader
          horizontalPadding={20}
          onMenuPress={() => stackNavigation?.navigate('AppDrawer')}
          title="Kit Tracker"
        />
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>
            {fetchError ?? 'Unable to load Log & Earn data.'}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => dispatch(fetchLogAndEarnData())}
            style={styles.retryButton}
          >
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const hasSelectedProducts = selectedProductIds.length > 0;
  const isTodayLogged = isLogAndEarnDateLogged(data, data.today.date);

  const openCalendarHistory = () => {
    const entriesByDate = new Map(
      data.calendarHistory.days.map(day => [day.date, day]),
    );
    data.weeklyProgress.days.forEach(day => {
      entriesByDate.set(day.date, day);
    });

    stackNavigation?.navigate('CalendarHistory', {
      entries: Array.from(entriesByDate.values()),
      initialMonth: data.calendarHistory.month,
      initialSelectedDate: data.today.date,
      summary: data.calendarHistory.summary,
    });
  };

  const startRemovalMode = () => {
    clearProductSelection();
    setIsRemovalMode(true);
  };

  const cancelRemovalMode = () => {
    clearProductSelection();
    setIsRemovalMode(false);
  };

  const confirmProductRemoval = async () => {
    if (await removeSelectedProducts()) {
      setIsRemovalMode(false);
    }
  };

  const handleLogNow = async () => {
    try {
      const result = await logNow();
      if (result.coinsEarned > 0) {
        setModalCoinsEarned(result.coinsEarned);
        setIsLogSuccessVisible(true);
      }
    } catch (error) {
      Alert.alert(
        'Unable to log today',
        typeof error === 'string'
          ? error
          : 'Please check your connection and try again.',
      );
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <AppScreenHeader
            horizontalPadding={4}
            onMenuPress={() => stackNavigation?.navigate('AppDrawer')}
            rightAccessory={
              <Pressable
                accessibilityLabel="View rewards and scratch cards"
                accessibilityRole="button"
                onPress={() => stackNavigation?.navigate('ScratchCards')}
              >
                <HeaderPill
                  icon={require('../../../shared/assets/reward.png')}
                  value={String(data.rewards.availableScratchCardCount)}
                />
              </Pressable>
            }
            title="Kit Tracker"
          />

          <View style={styles.goalCard}>
            <CircularProgress
              current={data.kitGoal.loggedDays}
              total={data.kitGoal.targetDays}
              label="Logged"
            />
            <View style={styles.goalCopy}>
              <Text style={styles.goalEyebrow}>KIT 1 GOAL</Text>
              <Text style={styles.goalTitle}>{data.kitGoal.title}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </View>

          <View style={styles.statsRow}>
            <StatCard
              icon={require('../../../shared/assets/coin.png')}
              value={String(data.stats.totalCoins)}
              label="Total Coins"
            />
            <StatCard
              icon={require('../../../shared/assets/streak.png')}
              value={`${data.stats.currentStreakDays} Days`}
              label="Current Streak"
            />
            <View style={styles.statCard}>
              <View style={styles.lifelineIcons}>
                {Array.from(
                  { length: data.stats.lifelines.monthlyLimit },
                  (_, index) => (
                    <Image
                      key={`lifeline-${index}`}
                      accessible={false}
                      source={require('../../../shared/assets/lifeline.png')}
                      style={styles.lifelineIcon}
                    />
                  ),
                )}
              </View>
              <Text style={styles.statLabel}>Lifelines</Text>
            </View>
          </View>

          <View style={styles.pauseNotice}>
            <Text style={styles.pauseText}>{data.rewardPause.message}</Text>
            <Pressable accessibilityRole="button" style={styles.orderButton}>
              <Text style={styles.orderText}>
                {data.rewardPause.actionLabel}
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.calendarCard}>
          <Pressable
            accessibilityLabel="Open calendar history"
            accessibilityRole="button"
            onPress={openCalendarHistory}
            style={styles.calendarBanner}
          >
            <View style={styles.calendarBannerItem}>
              <Lucide color={ink} name="calendar" size={15} />
              <Text style={styles.calendarDate}>
                {formatTodayDisplayDate()}
              </Text>
            </View>
            <View style={styles.calendarBannerItem}>
              {!isTodayLogged && data.today.coinsAvailableForLogging > 0 ? (
                <Image
                  accessible={false}
                  source={require('../../../shared/assets/coin.png')}
                  style={styles.calendarCoin}
                />
              ) : null}
              <Text style={styles.calendarReward}>
                {isTodayLogged
                  ? 'Logged today'
                  : data.today.coinsAvailableForLogging > 0
                  ? `Earn ${data.today.coinsAvailableForLogging} coins`
                  : 'Daily coins paused'}
              </Text>
            </View>
          </Pressable>
          <View style={styles.calendarDays}>
            {data.weeklyProgress.days.map(day => (
              <View
                key={day.date}
                accessibilityLabel={`${day.date}: ${day.status}${
                  day.coinsEarned ? `, ${day.coinsEarned} coins earned` : ''
                }`}
                accessible
                style={styles.calendarDay}
              >
                <View style={styles.dateCircle}>
                  {day.status === 'logged' ? (
                    <Image
                      accessible={false}
                      source={require('../../../shared/assets/streak.png')}
                      style={styles.dayStatusIcon}
                    />
                  ) : null}
                  {day.status === 'lifeline' ? (
                    <Image
                      accessible={false}
                      source={require('../../../shared/assets/lifeline.png')}
                      style={styles.dayStatusIcon}
                    />
                  ) : null}
                  {day.status === 'reward' ? (
                    <Image
                      accessible={false}
                      source={require('../../../shared/assets/reward.png')}
                      style={styles.rewardStatusIcon}
                    />
                  ) : null}
                </View>
                <View style={styles.calendarDateLabel}>
                  {day.status === 'logged' || day.status === 'lifeline' ? (
                    <>
                      <Image
                        accessible={false}
                        source={require('../../../shared/assets/coin.png')}
                        style={styles.dayCoin}
                      />
                      {day.coinsEarned > 0 ? (
                        <Text style={styles.dayCoinAmount}>
                          {day.coinsEarned}
                        </Text>
                      ) : null}
                    </>
                  ) : null}
                  {day.status === 'pending' ? (
                    <Image
                      accessible={false}
                      source={require('../../../shared/assets/coin-gray.png')}
                      style={styles.dayCoin}
                    />
                  ) : null}
                </View>
              </View>
            ))}
          </View>
          <Text style={styles.calendarHint}>
            Log {data.weeklyProgress.daysToReward} more days to unlock reward
          </Text>
        </View>

        <View style={styles.content}>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>Daily Dosage</Text>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{
                checked: allDailySelected,
                disabled: isTodayLogged,
              }}
              disabled={isTodayLogged}
              onPress={toggleAllDaily}
              style={[
                styles.selectAll,
                isTodayLogged && styles.doseRowDisabled,
              ]}
            >
              <Text style={styles.selectAllText}>Select all</Text>
              <CheckBox checked={allDailySelected} />
            </Pressable>
          </View>

          <View style={styles.productList}>
            {dailyProducts.length === 0 ? (
              <Text style={styles.emptyProducts}>No daily products left.</Text>
            ) : null}
            {dailyProducts.map(supplement => (
              <View key={supplement.id} style={styles.product}>
                <View style={styles.productHeading}>
                  <Text style={styles.productName}>{supplement.name}</Text>
                  {isRemovalMode ? (
                    <ProductSelection
                      accessibilityLabel={`Select daily ${supplement.name} for removal`}
                      selected={selectedProductIds.includes(supplement.id)}
                      onPress={() => toggleProductSelection(supplement.id)}
                    />
                  ) : null}
                </View>
                <View style={styles.productUsage}>
                  <SupplementBottle imageAssetKey={supplement.imageAssetKey} />
                  <View style={styles.doseRows}>
                    {supplement.doses.map(dose => {
                      const slot = dose.slot;
                      return isDoseSlot(slot) ? (
                        <DoseRow
                          key={`${supplement.id}-${slot}`}
                          label={dose.label}
                          checked={Boolean(dailyLogs[supplement.id]?.[slot])}
                          disabled={isTodayLogged}
                          onPress={() => toggleDose(supplement.id, slot)}
                        />
                      ) : null;
                    })}
                  </View>
                </View>
              </View>
            ))}
          </View>

          <Text style={[styles.sectionTitle, styles.weeklyHeading]}>
            Weekly Routine
          </Text>
          <View style={styles.weeklyList}>
            {weeklyProducts.length === 0 ? (
              <Text style={styles.emptyProducts}>No weekly products left.</Text>
            ) : null}
            {weeklyProducts.map(supplement => (
              <View key={supplement.id} style={styles.product}>
                <View style={styles.productHeading}>
                  <Text style={styles.productName}>{supplement.name}</Text>
                  {isRemovalMode ? (
                    <ProductSelection
                      accessibilityLabel={`Select weekly ${supplement.name} for removal`}
                      selected={selectedProductIds.includes(supplement.id)}
                      onPress={() => toggleProductSelection(supplement.id)}
                    />
                  ) : null}
                </View>
                <View style={styles.productUsage}>
                  <SupplementBottle imageAssetKey={supplement.imageAssetKey} />
                  <View style={styles.doseRows}>
                    <DoseRow
                      label={supplement.scheduleLabel}
                      checked={Boolean(weeklyLogs[supplement.id])}
                      disabled={isTodayLogged}
                      onPress={() => toggleWeekly(supplement.id)}
                    />
                  </View>
                </View>
              </View>
            ))}
          </View>

          {isRemovalMode ? (
            <View style={styles.removalActions}>
              <Pressable
                accessibilityLabel="Cancel product removal"
                accessibilityRole="button"
                onPress={cancelRemovalMode}
                style={[styles.removeButton, styles.cancelRemovalButton]}
              >
                <Text style={styles.removeText}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityLabel="Remove selected products"
                accessibilityRole="button"
                accessibilityState={{ disabled: !hasSelectedProducts }}
                disabled={!hasSelectedProducts}
                onPress={confirmProductRemoval}
                style={[
                  styles.removeButton,
                  styles.confirmRemovalButton,
                  !hasSelectedProducts && styles.removeButtonDisabled,
                ]}
              >
                <Text
                  style={[
                    styles.removeText,
                    !hasSelectedProducts && styles.removeTextDisabled,
                  ]}
                >
                  Remove selected
                  {hasSelectedProducts ? ` (${selectedProductIds.length})` : ''}
                </Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              accessibilityLabel="Remove products from list"
              accessibilityRole="button"
              onPress={startRemovalMode}
              style={styles.removeButton}
            >
              <Lucide name="pencil-line" size={17} color="black" />
              <Text style={styles.removeText}>Remove Products From List</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>

      <View style={styles.bottomArea}>
        <Pressable
          accessibilityState={{ disabled: isTodayLogged || isLogging }}
          accessibilityRole="button"
          disabled={isTodayLogged || isLogging}
          onPress={handleLogNow}
          style={[
            styles.logButton,
            (isTodayLogged || isLogging) && styles.doseRowDisabled,
          ]}
        >
          <Text style={styles.logButtonText}>
            {isLogging
              ? 'Logging...'
              : logged
              ? `Logged ${loggedDoseCount} doses`
              : 'Log Now'}
          </Text>
        </Pressable>
      </View>
      <LogCoinEarnedModal
        coinsEarned={modalCoinsEarned}
        onClose={() => setIsLogSuccessVisible(false)}
        today={data.today.date}
        visible={isLogSuccessVisible}
        weeklyRewardCoins={weeklyRewardCoinsEarned}
        weekDays={data.weeklyProgress.days.flatMap(day =>
          isCalendarDayStatus(day.status)
            ? [{ date: day.date, status: day.status }]
            : [],
        )}
      />
    </SafeAreaView>
  );
}

function HeaderPill({
  icon,
  value,
  active = false,
}: {
  icon: string | ImageSourcePropType;
  value: string;
  active?: boolean;
}) {
  return (
    <View style={[styles.headerPill, active && styles.headerPillActive]}>
      {typeof icon === 'string' ? (
        <Text style={[styles.pillIcon, active && styles.activePillText]}>
          {icon}
        </Text>
      ) : (
        <Image accessible={false} source={icon} style={styles.pillImage} />
      )}
      <Text style={[styles.pillValue, active && styles.activePillText]}>
        {value}
      </Text>
    </View>
  );
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: ImageSourcePropType;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statValueRow}>
        <Image accessible={false} source={icon} style={styles.statIcon} />
        <Text style={styles.statValue}>{value}</Text>
      </View>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function CheckBox({ checked }: { checked: boolean }) {
  return (
    <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
      {checked ? <Text style={styles.checkboxTick}>✓</Text> : null}
    </View>
  );
}

function ProductSelection({
  accessibilityLabel,
  selected,
  onPress,
}: {
  accessibilityLabel: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={styles.productSelection}
    >
      <CheckBox checked={selected} />
    </Pressable>
  );
}

function DoseRow({
  label,
  checked,
  onPress,
  disabled = false,
}: {
  label: string;
  checked: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.doseRow, disabled && styles.doseRowDisabled]}
    >
      <Text style={[styles.doseLabel, disabled && styles.doseLabelDisabled]}>
        {label}
      </Text>
      <CheckBox checked={checked} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#FFFFFF',
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  loadingText: {
    color: muted,
    fontSize: 15,
    marginTop: 14,
  },
  errorText: {
    color: '#B42318',
    fontSize: 15,
    textAlign: 'center',
  },
  retryButton: {
    alignItems: 'center',
    backgroundColor: green,
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
  scrollContent: {
    paddingBottom: 18,
  },
  hero: {
    backgroundColor: paleBlue,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    paddingBottom: 76,
    paddingHorizontal: 16,
  },
  headerPill: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 3,
    height: 24,
    justifyContent: 'center',
    minWidth: 38,
    paddingHorizontal: 5,
  },
  headerPillActive: {
    minWidth: 43,
  },
  pillIcon: {
    color: '#6B6B6B',
    fontSize: 12,
    fontWeight: '600',
  },
  pillImage: {
    height: 15,
    resizeMode: 'contain',
    width: 15,
  },
  pillValue: {
    color: '#686868',
    fontSize: 11,
  },
  activePillText: {
    color: green,
  },
  goalCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#B9D5DE',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    height: 79,
    marginTop: 7,
    paddingHorizontal: 10,
  },
  goalCopy: {
    flex: 1,
    gap: 4,
    marginLeft: 8,
  },
  goalEyebrow: {
    color: green,
    fontSize: 10,
    letterSpacing: 0.2,
  },
  goalTitle: {
    color: ink,
    fontSize: 15,
    fontWeight: '500',
  },
  chevron: {
    color: '#858585',
    fontSize: 25,
    marginHorizontal: 5,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
  },
  statCard: {
    alignItems: 'center',
    backgroundColor: '#F6FAFB',
    borderColor: '#E1E9EB',
    borderRadius: 14,
    borderWidth: 1,
    elevation: 2,
    flex: 1,
    height: 49,
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  statValueRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  statIcon: {
    height: 16,
    width: 16,
  },
  statValue: {
    color: ink,
    fontSize: 13,
  },
  statLabel: {
    color: muted,
    fontSize: 10,
    marginTop: 2,
  },
  lifelineIcons: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 2,
  },
  lifelineIcon: {
    height: 15,
    resizeMode: 'contain',
    width: 15,
  },
  pauseNotice: {
    alignItems: 'center',
    backgroundColor: '#F3F8DD',
    borderColor: '#B5D830',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    minHeight: 60,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pauseText: {
    color: '#424242',
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  orderButton: {
    alignItems: 'center',
    backgroundColor: '#B9D737',
    borderRadius: 9,
    justifyContent: 'center',
    minHeight: 30,
    paddingHorizontal: 10,
  },
  orderText: {
    color: '#303030',
    fontSize: 11,
    fontWeight: '500',
  },
  calendarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    elevation: 3,
    marginHorizontal: 16,
    marginTop: -62,
    padding: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.13,
    shadowRadius: 5,
  },
  calendarBanner: {
    alignItems: 'center',
    backgroundColor: '#DDEEF2',
    borderRadius: 11,
    flexDirection: 'row',
    height: 28,
    justifyContent: 'center',
    gap: 10,
  },
  calendarBannerItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  calendarDate: {
    color: '#505050',
    fontSize: 12,
  },
  calendarReward: {
    color: '#414141',
    fontSize: 12,
  },
  calendarCoin: {
    height: 15,
    width: 15,
  },
  calendarDays: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 4,
    paddingTop: 9,
  },
  calendarDay: {
    alignItems: 'center',
    gap: 3,
  },
  dateCircle: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E0E0E0',
    borderRadius: 12,
    borderWidth: 1,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  dayStatusIcon: {
    height: 20,
    width: 20,
  },
  rewardStatusIcon: {
    height: 30,
    width: 30,
  },
  calendarDateLabel: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 1,
  },
  dayCoin: {
    height: 15,
    width: 15,
  },
  dayCoinAmount: {
    color: '#858585',
    fontSize: 8,
  },
  dateLabel: {
    color: '#858585',
    fontSize: 10,
  },
  calendarHint: {
    color: '#2485C3',
    fontSize: 10,
    marginTop: 8,
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  sectionHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 21,
  },
  sectionTitle: {
    color: ink,
    fontSize: 15,
    fontWeight: '600',
  },
  selectAll: {
    alignItems: 'center',
    borderColor: '#777777',
    borderRadius: 7,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    height: 28,
    paddingHorizontal: 10,
  },
  selectAllText: {
    color: '#454545',
    fontSize: 11,
  },
  checkbox: {
    alignItems: 'center',
    borderColor: '#D2D2D2',
    borderRadius: 4,
    borderWidth: 1,
    height: 14,
    justifyContent: 'center',
    width: 14,
  },
  checkboxChecked: {
    backgroundColor: '#484848',
    borderColor: '#484848',
  },
  checkboxTick: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },
  productList: {
    gap: 16,
  },
  product: {
    gap: 8,
  },
  productHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 20,
  },
  productName: {
    color: '#3E3E3E',
    fontSize: 12,
    fontWeight: '500',
  },
  productSelection: {
    alignItems: 'center',
    height: 28,
    justifyContent: 'center',
    width: 32,
  },
  emptyProducts: {
    color: muted,
    fontSize: 12,
    paddingVertical: 8,
  },
  productUsage: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  doseRows: {
    flex: 1,
    gap: 6,
  },
  doseRow: {
    alignItems: 'center',
    borderColor: border,
    borderRadius: 11,
    borderWidth: 1,
    flexDirection: 'row',
    height: 37,
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  doseRowDisabled: {
    opacity: 0.55,
  },
  doseLabel: {
    color: '#464646',
    fontSize: 12,
  },
  doseLabelDisabled: {
    color: '#777777',
  },
  weeklyHeading: {
    marginBottom: 17,
    marginTop: 24,
  },
  weeklyList: {
    gap: 16,
  },
  removeButton: {
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 11,
    flexDirection: 'row',
    height: 40,
    justifyContent: 'center',
    marginTop: 14,
    gap: 8,
  },
  removalActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  cancelRemovalButton: {
    flex: 1,
  },
  confirmRemovalButton: {
    backgroundColor: '#F0DADA',
    flex: 2,
  },
  removeButtonDisabled: {
    opacity: 0.55,
  },
  removeIcon: {
    color: '#4B4B4B',
    fontSize: 17,
  },
  removeText: {
    color: '#464646',
    fontSize: 13,
  },
  removeTextDisabled: {
    color: '#777777',
  },
  bottomArea: {
    backgroundColor: '#FFFFFF',
    borderTopColor: '#E5E5E5',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingBottom: 10,
    paddingTop: 12,
  },
  logButton: {
    alignItems: 'center',
    backgroundColor: '#414141',
    borderRadius: 10,
    height: 40,
    justifyContent: 'center',
    marginHorizontal: 16,
  },
  logButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
  },
});

export default LogAndEarnScreen;
