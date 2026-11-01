import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Lucide from '@react-native-vector-icons/lucide';
import { useAppDispatch } from '../../../app/store/hooks';
import { setAuthenticatedUser } from '../../../app/store/slices/authSlice';
import { RootStackParamList } from '../../../app/navigator/types';
import {
  sendOTP,
  verifyOTP,
} from '../../../shared/components/config/authService';

type VerifyOtpScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'VerifyOtp'
>;

const otpLength = 6;
const initialCountdown = 52;

function VerifyOtpScreen({ navigation, route }: VerifyOtpScreenProps) {
  const dispatch = useAppDispatch();
  const { phoneNumber } = route.params;
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(initialCountdown);
  const [errorMessage, setErrorMessage] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const inputRef = useRef<React.ElementRef<typeof TextInput>>(null);

  useEffect(() => {
    if (countdown === 0) {
      return;
    }

    const timer = setTimeout(() => setCountdown(value => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const verifyOtp = async () => {
    Keyboard.dismiss();
    if (!canVerify || isVerifying) {
      return;
    }

    setIsVerifying(true);
    setErrorMessage('');
    try {
      const result = await verifyOTP(phoneNumber, otp);
      if (!result.success) {
        setErrorMessage(result.message);
        return;
      }
      dispatch(setAuthenticatedUser(result.data.phoneNumber));
    } finally {
      setIsVerifying(false);
    }
  };

  const resendOtp = async () => {
    if (countdown > 0 || isResending) {
      return;
    }
    setIsResending(true);
    setErrorMessage('');
    try {
      const result = await sendOTP(phoneNumber);
      if (!result.success) {
        setErrorMessage(result.message);
        return;
      }
      setOtp('');
      setCountdown(initialCountdown);
      inputRef.current?.focus();
    } finally {
      setIsResending(false);
    }
  };

  const canVerify = otp.length === otpLength;
  const formattedPhoneNumber = `+91${phoneNumber}`;
  const minutes = Math.floor(countdown / 60);
  const seconds = `${countdown % 60}`.padStart(2, '0');

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Back to mobile number"
          accessibilityRole="button"
          hitSlop={12}
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Lucide color="#424242" name="arrow-left" size={30} />
        </Pressable>
        <Text style={styles.headerTitle}>Verify OTP</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            Alert.alert(
              'Need help?',
              'Please check the mobile number and try again.',
            )
          }
        >
          <Text style={styles.helpText}>Need Help?</Text>
        </Pressable>
      </View>

      <View style={styles.content}>
        <Text style={styles.instruction}>Enter the OTP we’ve sent to</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={styles.phoneNumberRow}
        >
          <Text style={styles.phoneNumber}>{formattedPhoneNumber}</Text>
          <Lucide color="#555555" name="pencil" size={17} />
        </Pressable>

        <Pressable
          accessibilityLabel="Enter six digit OTP"
          onPress={() => inputRef.current?.focus()}
          style={styles.otpRow}
        >
          {Array.from({ length: otpLength }, (_, index) => (
            <View
              key={`otp-digit-${index}`}
              style={[
                styles.otpBox,
                otp.length === index && styles.otpBoxActive,
              ]}
            >
              <Text style={styles.otpDigit}>{otp[index] ?? ''}</Text>
              {otp.length === index && otp.length < otpLength ? (
                <View style={styles.cursor} />
              ) : null}
            </View>
          ))}
          <TextInput
            ref={inputRef}
            accessibilityLabel="One-time password"
            autoComplete="sms-otp"
            caretHidden
            keyboardType="number-pad"
            maxLength={otpLength}
            onChangeText={value => {
              setOtp(value.replace(/\D/g, '').slice(0, otpLength));
              setErrorMessage('');
            }}
            style={styles.hiddenInput}
            textContentType="oneTimeCode"
            value={otp}
          />
        </Pressable>
        {errorMessage ? (
          <Text accessibilityRole="alert" style={styles.errorText}>
            {errorMessage}
          </Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityState={{
            busy: isVerifying,
            disabled: !canVerify || isVerifying,
          }}
          disabled={!canVerify || isVerifying}
          onPress={verifyOtp}
          style={[
            styles.verifyButton,
            (!canVerify || isVerifying) && styles.verifyButtonDisabled,
          ]}
        >
          {isVerifying ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.verifyButtonText}>Verify OTP</Text>
          )}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{
            busy: isResending,
            disabled: countdown > 0 || isResending,
          }}
          disabled={countdown > 0 || isResending}
          onPress={resendOtp}
          style={styles.resendButton}
        >
          <Text
            style={[
              styles.resendText,
              countdown === 0 && styles.resendTextActive,
            ]}
          >
            {countdown > 0
              ? `Didn't receive OTP? Get it via SMS in ${minutes}:${seconds}`
              : isResending
                ? 'Sending OTP...'
                : 'Resend OTP via SMS'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#FFFFFF',
    flex: 1,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 58,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  backButton: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    width: 50,
  },
  headerTitle: {
    color: '#424242',
    flex: 1,
    fontSize: 22,
    fontWeight: '600',
    marginLeft: 10,
  },
  helpText: {
    color: '#747474',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 50,
  },
  instruction: {
    color: '#111111',
    fontSize: 19,
    fontWeight: '600',
    textAlign: 'center',
  },
  phoneNumberRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginTop: 15,
  },
  phoneNumber: {
    color: '#777777',
    fontSize: 18,
    textDecorationLine: 'underline',
  },
  otpRow: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 56,
    position: 'relative',
  },
  otpBox: {
    alignItems: 'center',
    borderColor: '#D8D8D8',
    borderRadius: 15,
    borderWidth: 1.5,
    height: 68,
    justifyContent: 'center',
    width: 54,
  },
  otpBoxActive: {
    borderColor: '#D8D8D8',
  },
  otpDigit: {
    color: '#424242',
    fontSize: 28,
  },
  cursor: {
    backgroundColor: '#777777',
    height: 42,
    position: 'absolute',
    width: 2,
  },
  hiddenInput: {
    color: 'transparent',
    opacity: 0.01,
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  errorText: {
    color: '#B42318',
    fontSize: 13,
    marginTop: 14,
    textAlign: 'center',
  },
  verifyButton: {
    alignItems: 'center',
    backgroundColor: '#414141',
    borderRadius: 14,
    height: 68,
    justifyContent: 'center',
    marginTop: 88,
    width: '100%',
  },
  verifyButtonDisabled: {
    backgroundColor: '#C8C8C8',
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '600',
  },
  resendButton: {
    marginTop: 38,
    minHeight: 36,
  },
  resendText: {
    color: '#A8ADAD',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  resendTextActive: {
    color: '#555555',
  },
});

export default VerifyOtpScreen;
