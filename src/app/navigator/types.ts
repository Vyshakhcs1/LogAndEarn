import { NavigatorScreenParams } from '@react-navigation/native';
import {
  CalendarDayEntry,
  CalendarHistorySummary,
} from '../../features/logAndEarn/model/logAndEarnData';

export type RootStackParamList = {
  AppDrawer: undefined;
  Login: undefined;
  VerifyOtp: {
    phoneNumber: string;
  };
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  ScratchCards: undefined;
  CalendarHistory: {
    entries: CalendarDayEntry[];
    initialMonth: string;
    initialSelectedDate: string;
    summary: CalendarHistorySummary;
  };
};

export type MainTabParamList = {
  Home: undefined;
  'Hair Test': undefined;
  'Log & Earn': undefined;
  Videos: undefined;
  You: undefined;
};
