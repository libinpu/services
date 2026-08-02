import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useLanguage } from '@/lib/language-context';
import { useAuth } from '@/lib/auth-context';
import { colors, spacing, radius, typography, shadows } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';
import { Button, Input } from '@/components/ui';
import { LinearGradient } from 'expo-linear-gradient';
import { Wrench } from 'lucide-react-native';

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
      backgroundColor: colors.primary[50],
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.xl,
    },
    logoWrap: {
      alignItems: 'center',
      marginBottom: spacing.xl,
    },
    logoCircle: {
      width: 80,
      height: 80,
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadows.lg,
    },
    appName: {
      fontSize: typography.sizes.xxxl,
      fontWeight: '700',
      color: colors.primary[700],
      marginTop: spacing.md,
      fontFamily: typography.fontFamilyBold,
    },
    tagline: {
      fontSize: typography.sizes.sm,
      color: colors.neutral[500],
      marginTop: spacing.xs,
      fontFamily: typography.fontFamilyRegular,
    },
    formCard: {
      backgroundColor: colors.neutral[100],
      borderRadius: radius.xl,
      padding: spacing.lg,
      ...shadows.lg,
    },
    welcomeText: {
      fontSize: typography.sizes.xxl,
      fontWeight: '700',
      color: colors.neutral[900],
      marginBottom: spacing.xs,
      fontFamily: typography.fontFamilyBold,
    },
    subtitle: {
      fontSize: typography.sizes.sm,
      color: colors.neutral[500],
      marginBottom: spacing.lg,
      fontFamily: typography.fontFamilyRegular,
    },
    socialBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 52,
      borderRadius: radius.full,
      borderWidth: 1.5,
      borderColor: colors.primary[600],
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm,
    },
    socialIcon: {
      width: 24,
      height: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    googleIcon: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.accent[600],
      fontFamily: typography.fontFamilyBold,
    },
    socialBtnText: {
      flex: 1,
      textAlign: 'center',
      fontSize: typography.sizes.md,
      fontWeight: '600',
      color: colors.primary[600],
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
      color: colors.neutral[400],
      fontFamily: typography.fontFamilyRegular,
    },
    modeToggle: {
      flexDirection: 'row',
      backgroundColor: colors.neutral[100],
      borderRadius: radius.md,
      padding: 4,
      marginBottom: spacing.md,
    },
    modeTab: {
      flex: 1,
      paddingVertical: spacing.sm,
      alignItems: 'center',
      borderRadius: radius.sm,
    },
    modeTabActive: {
      backgroundColor: colors.neutral[100],
    },
    modeTabText: {
      fontSize: typography.sizes.sm,
      fontWeight: '600',
      color: colors.neutral[500],
      fontFamily: typography.fontFamilyMedium,
    },
    modeTabTextActive: {
      color: colors.primary[700],
    },
    input: {
      backgroundColor: colors.neutral[100],
      borderColor: colors.neutral[200],
      marginBottom: spacing.sm,
    },
    errorText: {
      fontSize: typography.sizes.sm,
      color: colors.error[600],
      marginBottom: spacing.sm,
      fontFamily: typography.fontFamilyRegular,
    },
    submitBtn: {
      width: '100%',
      marginTop: spacing.sm,
    },
  });

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

    setLoading(true);
    try {
      if (mode === 'signin') {
        const { error } = await signIn(email.trim(), password);
        if (error) setError(error);
        else router.replace('/(tabs)');
      } else {
        const { error } = await signUp(email.trim(), password, fullName.trim(), phone.trim());
        if (error) setError(error);
        else router.replace('/(tabs)');
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
    } else {
      router.replace('/(tabs)');
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.logoWrap}>
          <LinearGradient
            colors={[colors.primary[500], colors.primary[700]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoCircle}
          >
            <Wrench size={36} color={colors.neutral[0]} strokeWidth={2} />
          </LinearGradient>
          <Text style={styles.appName}>{t('appName')}</Text>
          <Text style={styles.tagline}>{t('tagline')}</Text>
        </View>

        <View style={styles.formCard}>
          <>
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
          </>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
