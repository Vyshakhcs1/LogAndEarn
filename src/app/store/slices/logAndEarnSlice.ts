import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { logAndEarnService } from '../../service/logAndEarnService';
import {
  DoseSlot,
  isLogAndEarnDateLogged,
  LogAndEarnApiData,
} from '../../../features/logAndEarn/model/logAndEarnData';
import { RewardCardData } from '../../../features/rewards/model/rewardCards';

type LogAndEarnState = {
  data: LogAndEarnApiData | null;
  fetchStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  fetchError: string | null;
  dailyLogs: Record<string, Record<DoseSlot, boolean>>;
  weeklyLogs: Record<string, boolean>;
  selectedProductIds: string[];
  revealedRewardIds: string[];
  logged: boolean;
  isLogging: boolean;
  weeklyRewardCoinsEarned: number;
};

type LogTodayResult = {
  data: LogAndEarnApiData;
  coinsEarned: number;
  weeklyRewardCoins: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isApiResponse(
  value: unknown,
): value is { success: true; data: LogAndEarnApiData } {
  if (!isRecord(value) || value.success !== true || !isRecord(value.data)) {
    return false;
  }
  const data = value.data;
  return (
    isRecord(data.kitGoal) &&
    isRecord(data.stats) &&
    isRecord(data.rewardPause) &&
    isRecord(data.today) &&
    isRecord(data.weeklyProgress) &&
    Array.isArray(data.weeklyProgress.days) &&
    isRecord(data.supplementRoutine) &&
    Array.isArray(data.supplementRoutine.daily) &&
    Array.isArray(data.supplementRoutine.weekly) &&
    isRecord(data.calendarHistory) &&
    Array.isArray(data.calendarHistory.days) &&
    isRecord(data.calendarHistory.summary) &&
    isRecord(data.rewards) &&
    Array.isArray(data.rewards.cards)
  );
}

function toApiData(response: unknown): LogAndEarnApiData {
  if (!isApiResponse(response)) {
    throw new Error('The Log & Earn response has an invalid format.');
  }
  return response.data;
}

function createDailyLogs(
  data: LogAndEarnApiData,
): Record<string, Record<DoseSlot, boolean>> {
  return Object.fromEntries(
    data.supplementRoutine.daily.map(supplement => [
      supplement.id,
      {
        morning:
          supplement.doses.find(dose => dose.slot === 'morning')?.checked ??
          false,
        evening:
          supplement.doses.find(dose => dose.slot === 'evening')?.checked ??
          false,
      },
    ]),
  );
}

const initialState: LogAndEarnState = {
  data: null,
  fetchStatus: 'idle',
  fetchError: null,
  dailyLogs: {},
  weeklyLogs: {},
  selectedProductIds: [],
  revealedRewardIds: [],
  logged: false,
  isLogging: false,
  weeklyRewardCoinsEarned: 0,
};

function applyServerData(state: LogAndEarnState, data: LogAndEarnApiData) {
  state.data = data;
  state.dailyLogs = createDailyLogs(data);
  state.weeklyLogs = Object.fromEntries(
    data.supplementRoutine.weekly.map(supplement => [
      supplement.id,
      supplement.checked,
    ]),
  );
  state.revealedRewardIds = data.rewards.claimedScratchCardIds ?? [];
  state.logged = isLogAndEarnDateLogged(data, data.today.date);
  state.fetchStatus = 'succeeded';
  state.fetchError = null;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export const fetchLogAndEarnData = createAsyncThunk<
  LogAndEarnApiData,
  void,
  { rejectValue: string }
>('logAndEarn/fetchData', async (_, { rejectWithValue }) => {
  try {
    return toApiData(await logAndEarnService.fetchData());
  } catch (error) {
    return rejectWithValue(
      getErrorMessage(error, 'Unable to load Log & Earn data.'),
    );
  }
});

export const syncToday = fetchLogAndEarnData;

export const toggleDose = createAsyncThunk<
  LogAndEarnApiData,
  { id: string; slot: DoseSlot },
  { rejectValue: string; state: { logAndEarn: LogAndEarnState } }
>('logAndEarn/toggleDose', async ({ id, slot }, { getState, rejectWithValue }) => {
  try {
    const checked = !getState().logAndEarn.dailyLogs[id]?.[slot];
    return toApiData(await logAndEarnService.setCheckin(id, slot, checked));
  } catch (error) {
    return rejectWithValue(
      getErrorMessage(error, 'Unable to update this dose.'),
    );
  }
});

export const setAllDailyDoses = createAsyncThunk<
  LogAndEarnApiData,
  boolean,
  { rejectValue: string }
>('logAndEarn/setAllDailyDoses', async (checked, { rejectWithValue }) => {
  try {
    return toApiData(
      await logAndEarnService.setAllDailyCheckins(checked),
    );
  } catch (error) {
    return rejectWithValue(
      getErrorMessage(error, 'Unable to update daily doses.'),
    );
  }
});

export const toggleWeeklyDose = createAsyncThunk<
  LogAndEarnApiData,
  string,
  { rejectValue: string; state: { logAndEarn: LogAndEarnState } }
>('logAndEarn/toggleWeeklyDose', async (id, { getState, rejectWithValue }) => {
  try {
    const checked = !getState().logAndEarn.weeklyLogs[id];
    return toApiData(
      await logAndEarnService.setCheckin(id, 'weekly', checked),
    );
  } catch (error) {
    return rejectWithValue(
      getErrorMessage(error, 'Unable to update the weekly routine.'),
    );
  }
});

export const removeSelectedProducts = createAsyncThunk<
  LogAndEarnApiData,
  void,
  { rejectValue: string; state: { logAndEarn: LogAndEarnState } }
>(
  'logAndEarn/removeSelectedProducts',
  async (_, { getState, rejectWithValue }) => {
    try {
      const ids = getState().logAndEarn.selectedProductIds;
      if (ids.length === 0) {
        throw new Error('Select at least one product to remove.');
      }
      return toApiData(await logAndEarnService.removeRoutineItems(ids));
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, 'Unable to remove the selected products.'),
      );
    }
  },
);

export const logToday = createAsyncThunk<
  LogTodayResult,
  void,
  { rejectValue: string; state: { logAndEarn: LogAndEarnState } }
>('logAndEarn/logToday', async (_, { getState, rejectWithValue }) => {
  try {
    if (!getState().logAndEarn.data) {
      throw new Error('Log & Earn data has not loaded yet.');
    }
    const result = await logAndEarnService.logToday();
    if (
      !isRecord(result.result) ||
      typeof result.result.coinsEarned !== 'number' ||
      typeof result.result.weeklyRewardCoins !== 'number'
    ) {
      throw new Error('The Log & Earn action response has an invalid format.');
    }
    return {
      data: toApiData(result.data),
      coinsEarned: result.result.coinsEarned,
      weeklyRewardCoins: result.result.weeklyRewardCoins,
    };
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'Unable to log today.'));
  }
});

export const claimScratchReward = createAsyncThunk<
  LogAndEarnApiData,
  string,
  { rejectValue: string }
>('logAndEarn/claimScratchReward', async (id, { rejectWithValue }) => {
  try {
    return toApiData(await logAndEarnService.claimScratchCard(id));
  } catch (error) {
    return rejectWithValue(
      getErrorMessage(error, 'Unable to claim this scratch card.'),
    );
  }
});

const logAndEarnSlice = createSlice({
  name: 'logAndEarn',
  initialState,
  reducers: {
    toggleProductSelection(state, action: PayloadAction<string>) {
      const id = action.payload;
      state.selectedProductIds = state.selectedProductIds.includes(id)
        ? state.selectedProductIds.filter(selectedId => selectedId !== id)
        : [...state.selectedProductIds, id];
    },
    clearProductSelection(state) {
      state.selectedProductIds = [];
    },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchLogAndEarnData.pending, state => {
        state.fetchStatus = 'loading';
        state.fetchError = null;
      })
      .addCase(fetchLogAndEarnData.fulfilled, (state, action) => {
        applyServerData(state, action.payload);
        state.weeklyRewardCoinsEarned = 0;
        state.selectedProductIds = [];
      })
      .addCase(fetchLogAndEarnData.rejected, (state, action) => {
        state.fetchStatus = 'failed';
        state.fetchError =
          action.payload ??
          action.error.message ??
          'Unable to load Log & Earn data.';
      })
      .addCase(toggleDose.fulfilled, (state, action) => {
        applyServerData(state, action.payload);
      })
      .addCase(setAllDailyDoses.fulfilled, (state, action) => {
        applyServerData(state, action.payload);
      })
      .addCase(toggleWeeklyDose.fulfilled, (state, action) => {
        applyServerData(state, action.payload);
      })
      .addCase(removeSelectedProducts.fulfilled, (state, action) => {
        applyServerData(state, action.payload);
        state.selectedProductIds = [];
      })
      .addCase(logToday.pending, state => {
        state.isLogging = true;
      })
      .addCase(logToday.fulfilled, (state, action) => {
        applyServerData(state, action.payload.data);
        state.isLogging = false;
        state.weeklyRewardCoinsEarned = action.payload.weeklyRewardCoins;
      })
      .addCase(logToday.rejected, state => {
        state.isLogging = false;
      })
      .addCase(claimScratchReward.fulfilled, (state, action) => {
        applyServerData(state, action.payload);
      });
  },
});

export const { clearProductSelection, toggleProductSelection } =
  logAndEarnSlice.actions;

export default logAndEarnSlice.reducer;
export type { LogAndEarnState };

function formatRewardDate(date: string) {
  const parsedDate = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsedDate.getTime())) {
    return date;
  }
  return parsedDate.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export const selectRewardCards = (state: {
  logAndEarn: LogAndEarnState;
}): RewardCardData[] => {
  const data = state.logAndEarn.data;
  if (!data) {
    return [];
  }

  return data.rewards.cards.map((card): RewardCardData => {
    if (
      card.type === 'scratch' &&
      'expiryDate' in card &&
      typeof card.expiryDate === 'string' &&
      'title' in card &&
      typeof card.title === 'string' &&
      'reward' in card &&
      card.reward &&
      typeof card.reward.amount === 'number' &&
      typeof card.reward.label === 'string'
    ) {
      const isExpired = card.status === 'expired';
      return {
        id: card.id,
        type: 'scratch',
        status: isExpired ? 'expired' : 'available',
        title: card.title,
        expiry: `${isExpired ? 'Expired' : 'Expires'} on ${formatRewardDate(
          card.expiryDate,
        )}`,
        rewardAmount: card.reward.amount,
        rewardLabel: card.reward.label,
      };
    }

    if (
      card.type === 'product' &&
      'name' in card &&
      typeof card.name === 'string' &&
      'description' in card &&
      typeof card.description === 'string' &&
      'imageAssetKey' in card &&
      typeof card.imageAssetKey === 'string' &&
      'earnedDate' in card &&
      typeof card.earnedDate === 'string'
    ) {
      return {
        id: card.id,
        type: 'product',
        status: 'earned',
        name: card.name,
        description: card.description,
        date: formatRewardDate(card.earnedDate),
        imageAssetKey: card.imageAssetKey,
      };
    }

    if (
      card.type === 'coins' &&
      'amount' in card &&
      typeof card.amount === 'number'
    ) {
      const isExpired = card.status === 'expired';
      const date =
        isExpired &&
        'expiredDate' in card &&
        typeof card.expiredDate === 'string'
          ? card.expiredDate
          : 'earnedDate' in card && typeof card.earnedDate === 'string'
          ? card.earnedDate
          : null;
      if (date) {
        return {
          id: card.id,
          type: 'coins',
          status: isExpired ? 'expired' : 'earned',
          amount: card.amount,
          date: formatRewardDate(date),
        };
      }
    }
    throw new Error(`Unsupported reward card data for "${card.id}".`);
  });
};
