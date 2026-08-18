import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { supabase } from '@/lib/supabase';
import { colors, spacing, radius, typography, shadows } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';
import { Header } from '@/components/ui';
import { getPhoneValidationError } from '@/lib/booking-rules';
import { User, Phone, Mail, MapPin, Save, CircleCheck as CheckCircle, CircleAlert as AlertCircle } from 'lucide-react-native';

export default function EditProfileScreen() {
  const { t } = useLanguage();
  const { session, profile, refreshProfile } = useAuth();
  const router = useRouter();
  const { isDark } = useTheme();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.neutral[50] },
    flex1: { flex: 1 },
    scroll: { flex: 1, paddingHorizontal: spacing.lg },
    avatarSection: {
      alignItems: 'center', paddingVertical: spacing.xl,
    },
    avatarCircle: {
      width: 96, height: 96, borderRadius: radius.full, backgroundColor: colors.primary[700],
      alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm, ...shadows.md,
    },
    avatarHint: {
      fontSize: typography.sizes.sm, color: colors.neutral[400],
      fontFamily: typography.fontFamilyRegular,
    },
    formSection: { marginTop: spacing.sm },
    fieldLabel: {
      fontSize: typography.sizes.sm, fontWeight: '600', color: colors.neutral[700],
      marginBottom: spacing.xs, marginTop: spacing.md, fontFamily: typography.fontFamilyMedium,
    },
    inputWrap: {
      flexDirection: 'row', alignItems: 'center', height: 52,
      backgroundColor: colors.neutral[100], borderRadius: radius.md,
      paddingHorizontal: spacing.md, borderWidth: 1.5, borderColor: colors.neutral[200],
    },
    input: {
      flex: 1, marginLeft: spacing.sm, fontSize: typography.sizes.md,
      color: colors.neutral[900], fontFamily: typography.fontFamilyRegular,
    },
    locationCard: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: colors.neutral[100],
      borderRadius: radius.lg, padding: spacing.md, marginTop: spacing.xl,
    },
    locationIcon: {
      width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.primary[50],
      alignItems: 'center', justifyContent: 'center', marginRight: spacing.md,
    },
    locationInfo: { flex: 1 },
    locationTitle: {
      fontSize: typography.sizes.md, fontWeight: '600', color: colors.neutral[800],
      fontFamily: typography.fontFamilyMedium,
    },
    locationDesc: {
      fontSize: typography.sizes.xs, color: colors.neutral[400], marginTop: 2,
      fontFamily: typography.fontFamilyRegular,
    },
    locationCta: {
      fontSize: typography.sizes.sm, color: colors.primary[700], fontWeight: '600',
      fontFamily: typography.fontFamilyMedium,
    },
    messageCardError: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
      backgroundColor: colors.error[50], borderRadius: radius.md,
      paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginTop: spacing.lg,
    },
    messageErrorText: {
      flex: 1, fontSize: typography.sizes.sm, color: colors.error[700],
      fontFamily: typography.fontFamilyRegular,
    },
    messageCardSuccess: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
      backgroundColor: colors.success[50], borderRadius: radius.md,
      paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginTop: spacing.lg,
    },
    messageSuccessText: {
      fontSize: typography.sizes.sm, color: colors.success[700], fontWeight: '600',
      fontFamily: typography.fontFamilyMedium,
    },
    saveBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
      backgroundColor: colors.primary[700], borderRadius: radius.full,
      paddingVertical: spacing.md, marginTop: spacing.xl, ...shadows.md,
    },
    saveBtnDisabled: { opacity: 0.6 },
    saveBtnText: {
      fontSize: typography.sizes.lg, fontWeight: '700', color: colors.neutral[0],
      fontFamily: typography.fontFamilyBold,
    },
  });

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
      setEmail(profile.email || '');
    }
  }, [profile]);

  const handleSave = async () => {
    if (!session?.user?.id) {
      setError('You must be signed in to save your profile.');
      return;
    }
    if (!fullName.trim()) {
      setError('Please enter your name.');
      return;
    }
    const phoneError = getPhoneValidationError(phone);
    if (phoneError) {
      setError(phoneError);
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          phone: phone.trim(),
          email: email.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', session.user.id);

      if (updateError) throw updateError;

      await refreshProfile();
      setSuccess(true);
      setTimeout(() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/(tabs)');
        }
      }, 800);
    } catch (e: any) {
      setError(e.message || 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title={t('editProfile')}
        onBack={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(tabs)');
          }
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex1}
      >
        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: spacing.xxl }}
        >
          {/* Avatar section */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarCircle}>
              <User size={40} color={colors.neutral[0]} strokeWidth={1.8} />
            </View>
            <Text style={styles.avatarHint}>Tap to add photo</Text>
          </View>

          {/* Form fields */}
          <View style={styles.formSection}>
            <Text style={styles.fieldLabel}>Full Name</Text>
            <View style={styles.inputWrap}>
              <User size={18} color={colors.neutral[400]} strokeWidth={2} />
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter your full name"
                placeholderTextColor={colors.neutral[400]}
                autoCapitalize="words"
              />
            </View>

            <Text style={styles.fieldLabel}>Phone Number</Text>
            <View style={styles.inputWrap}>
              <Phone size={18} color={colors.neutral[400]} strokeWidth={2} />
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter your phone number"
                placeholderTextColor={colors.neutral[400]}
                keyboardType="phone-pad"
              />
            </View>

            <Text style={styles.fieldLabel}>Email (optional)</Text>
            <View style={styles.inputWrap}>
              <Mail size={18} color={colors.neutral[400]} strokeWidth={2} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor={colors.neutral[400]}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Location shortcut */}
          <TouchableOpacity
            style={styles.locationCard}
            activeOpacity={0.7}
            onPress={() => router.push('/location-setup')}
          >
            <View style={styles.locationIcon}>
              <MapPin size={20} color={colors.primary[700]} strokeWidth={2} />
            </View>
            <View style={styles.locationInfo}>
              <Text style={styles.locationTitle}>Manage Addresses</Text>
              <Text style={styles.locationDesc}>Add or update your saved locations</Text>
            </View>
            <Text style={styles.locationCta}>Open</Text>
          </TouchableOpacity>

          {/* Error / Success messages */}
          {error && (
            <View style={styles.messageCardError}>
              <AlertCircle size={18} color={colors.error[600]} strokeWidth={2} />
              <Text style={styles.messageErrorText}>{error}</Text>
            </View>
          )}
          {success && (
            <View style={styles.messageCardSuccess}>
              <CheckCircle size={18} color={colors.success[600]} strokeWidth={2} />
              <Text style={styles.messageSuccessText}>Profile saved successfully!</Text>
            </View>
          )}

          {/* Save button */}
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color={colors.neutral[0]} />
            ) : (
              <>
                <Save size={18} color={colors.neutral[0]} strokeWidth={2.2} />
                <Text style={styles.saveBtnText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

