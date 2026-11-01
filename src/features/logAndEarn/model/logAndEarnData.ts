export type DoseSlot = 'morning' | 'evening';

export type Supplement = {
  id: string;
  name: string;
};

export type CalendarDayStatus =
  | 'logged'
  | 'lifeline'
  | 'missed'
  | 'reward'
  | 'pending';

export type CalendarDayEntry = {
  date: string;
  status: CalendarDayStatus;
  coinsEarned: number;
  coinsMissed?: number;
  rewardsMissed?: number;
};

export type CalendarHistorySummary = {
  daysLogged: number;
  daysMissed: number;
  coinsMissed: number;
  rewardsMissed: number;
};

export type DailyDose = {
  slot: string;
  label: string;
  checked: boolean;
};

export type DailySupplement = Supplement & {
  imageAssetKey: string;
  doses: DailyDose[];
};

export type WeeklySupplement = Supplement & {
  imageAssetKey: string;
  scheduleLabel: string;
  checked: boolean;
};

export type WeekProgressDay = CalendarDayEntry;

export type LogAndEarnApiData = {
  kitGoal: {
    id: string;
    title: string;
    loggedDays: number;
    targetDays: number;
  };
  stats: {
    totalCoins: number;
    currentStreakDays: number;
    lifelines: {
      monthlyLimit: number;
      usedThisMonth: number;
      availableThisMonth: number;
      usedThisGoal?: number;
      availableThisGoal?: number;
    };
  };
  rewardPause: {
    daysUntilPause: number;
    message: string;
    actionLabel: string;
  };
  today: {
    date: string;
    coinsAvailableForLogging: number;
  };
  weeklyProgress: {
    weekStartsOn: string;
    weekEndsOn: string;
    daysToReward: number;
    rewardDay: string;
    days: WeekProgressDay[];
  };
  supplementRoutine: {
    daily: DailySupplement[];
    weekly: WeeklySupplement[];
  };
  calendarHistory: {
    month: string;
    selectedDate: string;
    coinsPerLoggedDay: number;
    statuses: Record<CalendarDayStatus, string>;
    days: CalendarDayEntry[];
    summary: CalendarHistorySummary;
  };
  rewards: {
    availableScratchCardCount: number;
    claimedScratchCardIds?: string[];
    cards: Array<
      | {
          id: string;
          type: 'scratch';
          status: 'available' | 'expired';
          title: string;
          expiryDate: string;
          reward: {
            type: 'coins';
            amount: number;
            label: string;
          };
        }
      | {
          id: string;
          type: 'product';
          status: 'earned';
          name: string;
          description: string;
          earnedDate: string;
          imageAssetKey: string;
        }
      | {
          id: string;
          type: 'coins';
          status: 'earned';
          amount: number;
          earnedDate: string;
        }
      | {
          id: string;
          type: 'coins';
          status: 'expired';
          amount: number;
          earnedDate: string;
          expiredDate: string;
        }
    >;
  };
};

export type LogAndEarnApiResponse = {
  success: true;
  data: LogAndEarnApiData;
};

export const dailyCoinTiers = [
  { firstStreakDay: 1, lastStreakDay: 7, coinsPerDay: 30 },
  { firstStreakDay: 8, lastStreakDay: 14, coinsPerDay: 40 },
  { firstStreakDay: 15, lastStreakDay: 21, coinsPerDay: 50 },
  { firstStreakDay: 22, lastStreakDay: 28, coinsPerDay: 60 },
  { firstStreakDay: 29, lastStreakDay: 35, coinsPerDay: 70 },
] as const;

export function getDailyCoinsForStreakDay(streakDay: number) {
  const tier = dailyCoinTiers.find(
    ({ firstStreakDay, lastStreakDay }) =>
      streakDay >= firstStreakDay && streakDay <= lastStreakDay,
  );

  return tier?.coinsPerDay ?? 0;
}

export const weeklyStreakRewards = [
  { streakDay: 7, coins: 100 },
  { streakDay: 14, coins: 150 },
  { streakDay: 21, coins: 200 },
  { streakDay: 28, coins: 250 },
  { streakDay: 35, coins: 300 },
] as const;

export function getWeeklyStreakReward(streakDay: number) {
  return (
    weeklyStreakRewards.find(reward => reward.streakDay === streakDay)?.coins ??
    0
  );
}

export function isLogAndEarnDateLogged(data: LogAndEarnApiData, date: string) {
  return [...data.weeklyProgress.days, ...data.calendarHistory.days].some(
    day => day.date === date && day.status === 'logged',
  );
}

export function getStreakDayForDate(data: LogAndEarnApiData, date: string) {
  const dateToCheck = new Date(`${date}T12:00:00`);
  if (Number.isNaN(dateToCheck.getTime())) {
    return 1;
  }
  dateToCheck.setDate(dateToCheck.getDate() - 1);
  const previousDateKey = getLocalDateKey(dateToCheck);
  const days = [...data.weeklyProgress.days, ...data.calendarHistory.days];
  const activeDates = new Set(
    days
      .filter(
        day =>
          day.status === 'logged' ||
          day.status === 'lifeline' ||
          day.coinsEarned > 0,
      )
      .map(day => day.date),
  );
  const earliestKnownDate = days
    .map(day => day.date)
    .filter(dayDate => dayDate <= previousDateKey)
    .sort()[0];

  if (!activeDates.has(previousDateKey)) {
    return 1;
  }

  let consecutiveDays = 0;
  const currentDate = new Date(`${previousDateKey}T12:00:00`);
  while (
    earliestKnownDate &&
    getLocalDateKey(currentDate) >= earliestKnownDate
  ) {
    if (!activeDates.has(getLocalDateKey(currentDate))) {
      return consecutiveDays + 1;
    }
    consecutiveDays += 1;
    currentDate.setDate(currentDate.getDate() - 1);
  }

  return Math.max(consecutiveDays, data.stats.currentStreakDays) + 1;
}

export function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}
