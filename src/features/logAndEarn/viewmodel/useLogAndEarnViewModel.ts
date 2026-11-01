import { Alert } from 'react-native';
import {
  clearProductSelection as clearSelection,
  logToday,
  removeSelectedProducts as removeProducts,
  setAllDailyDoses,
  toggleDose as toggleDoseAction,
  toggleProductSelection as toggleProductAction,
  toggleWeeklyDose,
} from '../../../app/store/slices/logAndEarnSlice';
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks';
import { DoseSlot } from '../model/logAndEarnData';

function useLogAndEarnViewModel() {
  const dispatch = useAppDispatch();
  const {
    data,
    dailyLogs,
    weeklyLogs,
    selectedProductIds,
    logged,
    isLogging,
    weeklyRewardCoinsEarned,
    fetchStatus,
    fetchError,
  } = useAppSelector(state => state.logAndEarn);

  const allDailySelected = Boolean(
    data &&
      data.supplementRoutine.daily.length > 0 &&
      data.supplementRoutine.daily.every(({ id }) =>
        Object.values(dailyLogs[id] ?? {}).every(Boolean),
      ),
  );

  const loggedDoseCount = Object.values(dailyLogs).reduce(
    (count, doses) => count + Number(doses.morning) + Number(doses.evening),
    0,
  );

  const showMutationError = (error: unknown) => {
    Alert.alert(
      'Unable to save changes',
      typeof error === 'string'
        ? error
        : 'Please check your connection and try again.',
    );
  };

  return {
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
    dailyProducts: data?.supplementRoutine.daily ?? [],
    weeklyProducts: data?.supplementRoutine.weekly ?? [],
    selectedProductIds,
    toggleDose: async (id: string, slot: DoseSlot) => {
      try {
        await dispatch(toggleDoseAction({ id, slot })).unwrap();
      } catch (error) {
        showMutationError(error);
      }
    },
    toggleAllDaily: async () => {
      try {
        await dispatch(setAllDailyDoses(!allDailySelected)).unwrap();
      } catch (error) {
        showMutationError(error);
      }
    },
    toggleWeekly: async (id: string) => {
      try {
        await dispatch(toggleWeeklyDose(id)).unwrap();
      } catch (error) {
        showMutationError(error);
      }
    },
    toggleProductSelection: (id: string) => dispatch(toggleProductAction(id)),
    clearProductSelection: () => dispatch(clearSelection()),
    removeSelectedProducts: async () => {
      try {
        await dispatch(removeProducts()).unwrap();
        return true;
      } catch (error) {
        showMutationError(error);
        return false;
      }
    },
    logNow: () => dispatch(logToday()).unwrap(),
  };
}

export default useLogAndEarnViewModel;
