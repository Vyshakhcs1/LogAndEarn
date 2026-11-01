
import { supabase } from './supabase';

type AuthServiceResult<T> =
  | { success: true; message: string; data: T }
  | { success: false; message: string };

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

const formatMobileNumber = (mobileNumber: string) => {
  const cleanedNumber = mobileNumber.replace(/\D/g, '');

  if (cleanedNumber.length === 10) {
    return `+91${cleanedNumber}`;
  }

  if (cleanedNumber.length === 12 && cleanedNumber.startsWith('91')) {
    return `+${cleanedNumber}`;
  }

  throw new Error('Please enter a valid 10-digit mobile number');
};

export const sendOTP = async (
  mobileNumber: string,
): Promise<AuthServiceResult<null>> => {
  try {
    const phone = formatMobileNumber(mobileNumber);

    const { error } = await supabase.auth.signInWithOtp({
      phone,
    });

    if (error) {
      throw error;
    }

    return {
      success: true,
      message: 'OTP sent successfully',
      data: null,
    };
  } catch (error) {
    return {
      success: false,
      message: getErrorMessage(error, 'Failed to send OTP'),
    };
  }
};

export const verifyOTP = async (
  mobileNumber: string,
  otp: string,
): Promise<AuthServiceResult<{ phoneNumber: string }>> => {
  try {
    const phone = formatMobileNumber(mobileNumber);

    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token: otp,
      type: 'sms',
    });

    if (error) {
      throw error;
    }

    return {
      success: true,
      message: 'Login successful',
      data: { phoneNumber: data.user?.phone ?? phone },
    };
  } catch (error) {
    return {
      success: false,
      message: getErrorMessage(error, 'OTP verification failed'),
    };
  }
};
