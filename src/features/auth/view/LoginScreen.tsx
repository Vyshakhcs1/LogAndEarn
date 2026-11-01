import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../app/navigator/types';
import { isValidIndianMobileNumber } from '../model/authCredentials';
import { sendOTP } from '../../../shared/components/config/authService';

type LoginScreenProps = NativeStackScreenProps<RootStackParamList, 'Login'>;

function LoginScreen({ navigation }: LoginScreenProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { height } = useWindowDimensions();
  const heroHeight = Math.min(Math.max(height * 0.52, 390), 760);
  const canContinue = isValidIndianMobileNumber(phoneNumber);

  const handleGetOtp = async () => {
    Keyboard.dismiss();
    if (!canContinue || isSendingOtp) {
      return;
    }

    setIsSendingOtp(true);
    setErrorMessage('');
    try {
      const result = await sendOTP(phoneNumber);
      if (!result.success) {
        setErrorMessage(result.message);
        return;
      }
      navigation.navigate('VerifyOtp', { phoneNumber });
    } finally {
      setIsSendingOtp(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.hero, { height: heroHeight }]}>
            <Text accessibilityRole="header" style={styles.wordmark}>
              Traya.
            </Text>
            <View style={styles.heroArtwork}>
              <View style={styles.artHalo} />
              <View style={styles.artLine} />
              <Image
                accessible={false}
                resizeMode="contain"
                source={require('../../../shared/assets/product.png')}
                style={styles.productImage}
              />
            </View>
          </View>

          <View style={styles.content}>
            <Text style={styles.tagline}>
              Hair Loss Solution Backed by Science
            </Text>

            <View style={styles.sectionDivider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Log in or Sign up</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.phoneInput}>
              <Text style={styles.countryCode}>+91</Text>
              <TextInput
                accessibilityLabel="Mobile number"
                autoComplete="tel-national"
                keyboardType="number-pad"
                maxLength={10}
                onChangeText={value => {
                  setPhoneNumber(value.replace(/\D/g, '').slice(0, 10));
                  setErrorMessage('');
                }}
                placeholder="Mobile number"
                placeholderTextColor="#A6A6A6"
                returnKeyType="done"
                style={styles.phoneTextInput}
                value={phoneNumber}
              />
            </View>

            {errorMessage ? (
              <Text accessibilityRole="alert" style={styles.errorText}>
                {errorMessage}
              </Text>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityState={{
                busy: isSendingOtp,
                disabled: !canContinue || isSendingOtp,
              }}
              disabled={!canContinue || isSendingOtp}
              onPress={handleGetOtp}
              style={[
                styles.primaryButton,
                !canContinue && styles.primaryButtonDisabled,
              ]}
            >
              {isSendingOtp ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Get OTP</Text>
              )}
            </Pressable>

            <Text style={styles.consent}>
              By proceeding, you consent to share your information with Traya
              and agree to Traya’s{' '}
              <Text style={styles.consentLink}>Privacy Policy</Text>
              {' and '}
              <Text style={styles.consentLink}>Terms of Service</Text>.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#FFFFFF',
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  hero: {
    alignItems: 'center',
    backgroundColor: '#E8E2E2',
    justifyContent: 'space-between',
    overflow: 'hidden',
    paddingTop: 44,
  },
  wordmark: {
    color: '#555454',
    fontSize: 64,
    fontWeight: '900',
    letterSpacing: -4,
    lineHeight: 76,
  },
  heroArtwork: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
    width: '100%',
  },
  artHalo: {
    backgroundColor: '#F3EEEE',
    borderRadius: 260,
    height: 410,
    position: 'absolute',
    top: 24,
    width: 410,
  },
  artLine: {
    borderColor: '#FFFFFF',
    borderRadius: 90,
    borderRightWidth: 3,
    height: 240,
    left: '25%',
    position: 'absolute',
    top: 72,
    transform: [{ rotate: '22deg' }],
    width: 160,
  },
  productImage: {
    height: '82%',
    maxHeight: 440,
    width: '58%',
  },
  content: {
    paddingHorizontal: 28,
    paddingTop: 26,
  },
  tagline: {
    color: '#101010',
    fontSize: 21,
    fontWeight: '600',
    lineHeight: 28,
    textAlign: 'center',
  },
  sectionDivider: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 18,
    marginTop: 42,
  },
  dividerLine: {
    backgroundColor: '#D5D5D5',
    flex: 1,
    height: 1,
  },
  dividerText: {
    color: '#777777',
    fontSize: 15,
    fontWeight: '600',
  },
  phoneInput: {
    alignItems: 'center',
    borderColor: '#D8D8D8',
    borderRadius: 14,
    borderWidth: 1.5,
    flexDirection: 'row',
    height: 66,
    marginTop: 40,
    paddingHorizontal: 24,
  },
  countryCode: {
    color: '#111111',
    fontSize: 19,
    fontWeight: '500',
    marginRight: 24,
  },
  phoneTextInput: {
    color: '#111111',
    flex: 1,
    fontSize: 19,
    height: '100%',
    padding: 0,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#414141',
    borderRadius: 14,
    height: 68,
    justifyContent: 'center',
    marginTop: 30,
  },
  primaryButtonDisabled: {
    backgroundColor: '#C8C8C8',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '600',
  },
  consent: {
    color: '#858585',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 34,
    textAlign: 'center',
  },
  consentLink: {
    color: '#555555',
    fontWeight: '700',
  },
  errorText: {
    color: '#B42318',
    fontSize: 13,
    marginTop: 12,
    textAlign: 'center',
  },
});

export default LoginScreen;
