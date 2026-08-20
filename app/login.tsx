import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useLanguage } from '@/lib/language-context';
import { useAuth } from '@/lib/auth-context';
import { colors, spacing, radius, typography, shadows } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';
import { Button, Input } from '@/components/ui';
import { Wrench } from 'lucide-react-native';
import * as Location from 'expo-location';
import { supabase } from '@/lib/supabase';
import { getPhoneValidationError } from '@/lib/booking-rules';

export default function LoginScreen() {
  const { t } = useLanguage();
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const router = useRouter();
  const { isDark } = useTheme();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.neutral[50], // light theme background per guideline
    },
    // Large rounded colored top section with soft decorative background shapes
    topSection: {
      backgroundColor: colors.neutral[100],
      borderBottomLeftRadius: 36,
      borderBottomRightRadius: 36,
      paddingTop: Platform.OS === 'ios' ? 70 : 50,
      paddingBottom: 60,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      ...shadows.lg,
    },
    topCircle1: {
      position: 'absolute',
      top: -30,
      left: -30,
      width: 140,
      height: 140,
      borderRadius: radius.full,
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    topCircle2: {
      position: 'absolute',
      bottom: -40,
      right: -20,
      width: 120,
      height: 120,
      borderRadius: radius.full,
      backgroundColor: 'rgba(255, 255, 255, 0.04)',
    },
    logoCircle: {
      width: 84,
      height: 84,
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
      ...shadows.md,
      marginBottom: spacing.md,
    },
    appName: {
      fontSize: 26,
      fontWeight: '700',
      color: colors.neutral[900],
      fontFamily: typography.fontFamilyBold,
    },
    tagline: {
      fontSize: typography.sizes.sm,
      color: colors.neutral[500],
      marginTop: 4,
      fontFamily: typography.fontFamilyRegular,
    },
    scrollContent: {
      flexGrow: 1,
      paddingBottom: spacing.xxl,
    },
    formCard: {
      backgroundColor: colors.neutral[100],
      borderRadius: radius.xl, // 22-28px rounded corners
      padding: spacing.xl,
      marginHorizontal: spacing.lg,
      marginTop: -30, // overlapping the header per guidelines
      ...shadows.lg,
      borderWidth: 1,
      borderColor: colors.neutral[200],
    },
    welcomeText: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.neutral[900], // primary text color
      marginBottom: spacing.xs,
      fontFamily: typography.fontFamilyBold,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: typography.sizes.sm,
      color: colors.neutral[500], // secondary text
      marginBottom: spacing.lg,
      fontFamily: typography.fontFamilyRegular,
      textAlign: 'center',
    },
    socialBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 52,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: colors.neutral[200],
      backgroundColor: colors.neutral[100],
      paddingHorizontal: spacing.md,
      marginBottom: spacing.md,
      ...shadows.sm,
    },
    socialIcon: {
      width: 24,
      height: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    googleIcon: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.primary[500], // teal accent
      fontFamily: typography.fontFamilyBold,
    },
    socialBtnText: {
      flex: 1,
      textAlign: 'center',
      fontSize: typography.sizes.md,
      fontWeight: '600',
      color: colors.neutral[900],
      fontFamily: typography.fontFamilyMedium,
      marginRight: spacing.md,
    },
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: spacing.md,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: colors.neutral[200],
    },
    dividerText: {
      paddingHorizontal: spacing.md,
      fontSize: typography.sizes.sm,
      color: colors.neutral[500],
      fontFamily: typography.fontFamilyRegular,
    },
    modeToggle: {
      flexDirection: 'row',
      backgroundColor: colors.neutral[50],
      borderRadius: radius.full,
      padding: 4,
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: colors.neutral[200],
    },
    modeTab: {
      flex: 1,
      paddingVertical: spacing.sm,
      alignItems: 'center',
      borderRadius: radius.full,
    },
    modeTabActive: {
      backgroundColor: colors.neutral[100],
      ...shadows.sm,
    },
    modeTabText: {
      fontSize: typography.sizes.sm,
      fontWeight: '600',
      color: colors.neutral[500],
      fontFamily: typography.fontFamilyMedium,
    },
    modeTabTextActive: {
      color: colors.primary[500], // teal state
    },
    input: {
      backgroundColor: colors.neutral[100],
      borderColor: colors.neutral[200],
      marginBottom: spacing.md,
      borderRadius: radius.md,
    },
    errorText: {
      fontSize: typography.sizes.sm,
      color: '#F44336',
      marginBottom: spacing.sm,
      fontFamily: typography.fontFamilyRegular,
      textAlign: 'center',
    },
    submitBtn: {
      width: '100%',
      marginTop: spacing.sm,
    },
  });

  const handleLocationPermission = async (userId: string) => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      // Check if user is a provider
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();

      if (profile?.role === 'provider') {
        await supabase
          .from('provider_profiles')
          .update({
            latitude,
            longitude,
            last_location_at: new Date().toISOString(),
          })
          .eq('id', userId);
      }
    } catch (err) {
      console.log('Location permission error on login:', err);
    }
  };

  const handleSubmit = async () => {
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password');
      return;
    }

    if (mode === 'signup' && (!fullName.trim() || !phone.trim())) {
      setError('Please fill all required fields');
      return;
    }

    if (mode === 'signup') {
      const phoneError = getPhoneValidationError(phone);
      if (phoneError) {
        setError(phoneError);
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'signin') {
        const { error } = await signIn(email.trim(), password);
        if (error) {
          setError(error);
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          void handleLocationPermission(session.user.id);
        }
        router.replace('/(tabs)');
      } else {
        const { error } = await signUp(email.trim(), password, fullName.trim(), phone.trim());
        if (error) {
          setError(error);
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          void handleLocationPermission(session.user.id);
        }
        router.replace('/(tabs)');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    const { error: googleError } = await signInWithGoogle();
    setLoading(false);
    if (googleError) {
      setError(googleError);
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      void handleLocationPermission(session.user.id);
    }
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.topSection}>
          <View style={styles.topCircle1} />
          <View style={styles.topCircle2} />
          <View style={styles.logoCircle}>
            <Wrench size={34} color={colors.primary[500]} strokeWidth={2} />
          </View>
          <Text style={styles.appName}>{t('appName')}</Text>
          <Text style={styles.tagline}>{t('tagline')}</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.welcomeText}>{t('welcomeBack')}</Text>
          <Text style={styles.subtitle}>{t('loginSubtitle')}</Text>

          <TouchableOpacity style={styles.socialBtn} onPress={handleGoogleSignIn} activeOpacity={0.8}>
            <View style={styles.socialIcon}>
              <Text style={styles.googleIcon}>G</Text>
            </View>
            <Text style={styles.socialBtnText}>{t('continueWithGoogle')}</Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t('or')}</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.modeToggle}>
            <TouchableOpacity
              style={[styles.modeTab, mode === 'signin' && styles.modeTabActive]}
              onPress={() => setMode('signin')}
            >
              <Text style={[styles.modeTabText, mode === 'signin' && styles.modeTabTextActive]}>
                {t('signIn')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeTab, mode === 'signup' && styles.modeTabActive]}
              onPress={() => setMode('signup')}
            >
              <Text style={[styles.modeTabText, mode === 'signup' && styles.modeTabTextActive]}>
                {t('signUp')}
              </Text>
            </TouchableOpacity>
          </View>

          {mode === 'signup' && (
            <>
              <Input
                value={fullName}
                onChangeText={setFullName}
                placeholder={t('fullName')}
                autoCapitalize="words"
                style={styles.input}
              />
              <Input
                value={phone}
                onChangeText={setPhone}
                placeholder={t('phoneNumber')}
                keyboardType="phone-pad"
                style={styles.input}
              />
            </>
          )}

          <Input
            value={email}
            onChangeText={setEmail}
            placeholder={t('email')}
            keyboardType="email-address"
            style={styles.input}
          />
          <Input
            value={password}
            onChangeText={setPassword}
            placeholder={t('password')}
            secureTextEntry
            style={styles.input}
          />

          {error && <Text style={styles.errorText}>{error}</Text>}

          <Button
            label={mode === 'signin' ? t('signIn') : t('createAccount')}
            onPress={handleSubmit}
            loading={loading}
            style={styles.submitBtn}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
