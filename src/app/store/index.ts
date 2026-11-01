import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import logAndEarnReducer from './slices/logAndEarnSlice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    logAndEarn: logAndEarnReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
