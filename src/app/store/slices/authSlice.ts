import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { supabase } from '../../../shared/components/config/supabase';

type AuthState = {
  phoneNumber: string | null;
  initialized: boolean;
  persistenceError: string | null;
};

const initialState: AuthState = {
  phoneNumber: null,
  initialized: false,
  persistenceError: null,
};

export const restoreAuthenticatedUser = createAsyncThunk<
  string | null,
  void,
  { rejectValue: string }
>('auth/restore', async (_, { rejectWithValue }) => {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      return rejectWithValue(error.message);
    }
    return data.session?.user.phone ?? null;
  } catch (error) {
    return rejectWithValue(
      error instanceof Error
        ? error.message
        : 'Unable to restore your Supabase session.',
    );
  }
});

export const clearAuthenticatedUser = createAsyncThunk<
  void,
  void,
  { rejectValue: string }
>('auth/signOut', async (_, { rejectWithValue }) => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      return rejectWithValue(error.message);
    }
  } catch (error) {
    return rejectWithValue(
      error instanceof Error
        ? error.message
        : 'Unable to sign out of your Supabase session.',
    );
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setPersistenceError(state, action: PayloadAction<string | null>) {
      state.persistenceError = action.payload;
    },
    setAuthenticatedUser(state, action: PayloadAction<string>) {
      state.phoneNumber = action.payload;
      state.persistenceError = null;
    },
    authenticationChanged(state, action: PayloadAction<string | null>) {
      state.phoneNumber = action.payload;
      state.initialized = true;
      state.persistenceError = null;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(restoreAuthenticatedUser.fulfilled, (state, action) => {
        state.phoneNumber = action.payload;
        state.initialized = true;
        state.persistenceError = null;
      })
      .addCase(restoreAuthenticatedUser.rejected, (state, action) => {
        state.initialized = true;
        state.persistenceError =
          action.payload ??
          action.error.message ??
          'Unable to restore your sign-in session.';
      })
      .addCase(clearAuthenticatedUser.fulfilled, state => {
        state.phoneNumber = null;
        state.persistenceError = null;
      })
      .addCase(clearAuthenticatedUser.rejected, (state, action) => {
        state.persistenceError =
          action.payload ??
          action.error.message ??
          'Unable to sign out of your Supabase session.';
      });
  },
});

export const {
  authenticationChanged,
  setAuthenticatedUser,
  setPersistenceError,
} = authSlice.actions;

export default authSlice.reducer;
