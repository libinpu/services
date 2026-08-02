import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Switch, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useLanguage } from '@/lib/language-context';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import { supabase } from '@/lib/supabase';
import { colors, spacing, radius, typography, shadows, getLangTextStyle } from '@/lib/theme';
import { LoadingState } from '@/components/ui';
import type { Address } from '@/lib/types';
import {
  User, MapPin, CreditCard, Bell, Gift, Circle as HelpCircle,
  LogOut, ChevronRight, Calendar, Phone, Mail, Pencil, Briefcase,
  ShieldCheck, Moon, Sun, Settings, Heart
} from 'lucide-react-native';

export default function ProfileScreen() {
  const { t, lang, setLang } = useLanguage();
  const { session, profile, signOut } = useAuth();
  const router = useRouter();
  const { isDark, toggle, mode } = useTheme();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState(true);

  const fetchData = useCallback(async () => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }
    try {
      const addrRes = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      if (!addrRes.error && addrRes.data) {
        setAddresses(addrRes.data as Address[]);
      }
    } catch (e) {
      // silent
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.neutral[50] },
    // Premium round colored top section header with slate blue background
    profileHeader: {
      backgroundColor: colors.primary[600],
      borderBottomLeftRadius: 36,
      borderBottomRightRadius: 36,
      paddingHorizontal: spacing.lg,
      paddingTop: Platform.OS === 'ios' ? 50 : spacing.lg,
      paddingBottom: 50,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      ...shadows.lg,
    },
    topCircle1: {
      position: 'absolute',
      top: -30,
      right: -30,
      width: 140,
      height: 140,
      borderRadius: radius.full,
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    topCircle2: {
      position: 'absolute',
      bottom: -40,
      left: -20,
      width: 100,
      height: 100,
      borderRadius: radius.full,
      backgroundColor: 'rgba(255, 255, 255, 0.04)',
    },
    avatarWrap: {
      width: 80, height: 80, borderRadius: radius.full, backgroundColor: 'rgba(255, 255, 255, 0.15)',
      alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md,
      borderWidth: 2, borderColor: colors.neutral[100], ...shadows.md,
    },
    profileInfo: { alignItems: 'center' },
    profileName: {
      fontSize: 22, fontWeight: '700', color: colors.neutral[100],
      fontFamily: typography.fontFamilyBold,
    },
    profilePhone: {
      fontSize: typography.sizes.sm, color: 'rgba(255, 255, 255, 0.75)', marginTop: 4,
      fontFamily: typography.fontFamilyRegular,
    },
    editBtn: {
      position: 'absolute',
      top: Platform.OS === 'ios' ? 50 : spacing.md,
      right: spacing.lg,
      width: 36, height: 36, borderRadius: radius.full,
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
      alignItems: 'center', justifyContent: 'center',
    },

    // Statistics Info Row inside overlapping container
    infoCardsRow: {
      flexDirection: 'row', paddingHorizontal: spacing.md, marginTop: -24, gap: spacing.sm,
      marginHorizontal: spacing.lg,
    },
    infoCard: {
      flex: 1, backgroundColor: colors.neutral[100], borderRadius: radius.xl,
      paddingVertical: spacing.md, paddingHorizontal: spacing.sm, alignItems: 'center',
      borderWidth: 1, borderColor: colors.neutral[200],
      ...shadows.md,
    },
    infoCardIcon: {
      width: 36, height: 36, borderRadius: radius.full, backgroundColor: 'rgba(255, 140, 90, 0.12)',
      alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs,
    },
    infoCardValue: {
      fontSize: typography.sizes.md, fontWeight: '800', color: colors.neutral[900],
      fontFamily: typography.fontFamilyBold,
    },
    infoCardLabel: {
      fontSize: 10, color: colors.neutral[500], marginTop: 2,
      fontFamily: typography.fontFamilyRegular, textTransform: 'uppercase', letterSpacing: 0.5,
    },

    section: { paddingHorizontal: spacing.lg, marginTop: spacing.xl },
    sectionTitle: {
      fontSize: typography.sizes.md, fontWeight: '800', color: colors.neutral[900],
      marginBottom: spacing.sm, fontFamily: typography.fontFamilyBold,
    },

    // Switched to Group Cards Layout
    groupCard: {
      backgroundColor: colors.neutral[100],
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.neutral[200],
      overflow: 'hidden',
      ...shadows.md,
      marginBottom: spacing.md,
    },
    menuItem: {
      flexDirection: 'row', alignItems: 'center',
      padding: spacing.md,
    },
    menuItemBorder: {
      borderBottomWidth: 1,
      borderBottomColor: colors.neutral[200],
    },
    menuIcon: {
      width: 36, height: 36, borderRadius: radius.md, backgroundColor: 'rgba(51, 78, 104, 0.08)',
      alignItems: 'center', justifyContent: 'center', marginRight: spacing.md,
    },
    menuInfo: { flex: 1 },
    menuLabel: {
      fontSize: typography.sizes.md, fontWeight: '700', color: colors.neutral[900],
      fontFamily: typography.fontFamilyMedium,
    },
    menuSublabel: {
      fontSize: 11, color: colors.neutral[500], marginTop: 2,
      fontFamily: typography.fontFamilyRegular,
    },

    // Switch card
    providerSwitchCard: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary[600],
      borderRadius: radius.xl, padding: spacing.lg, ...shadows.md,
    },
    providerSwitchIcon: {
      width: 44, height: 44, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.15)',
      alignItems: 'center', justifyContent: 'center', marginRight: spacing.md,
    },
    providerSwitchInfo: { flex: 1 },
    providerSwitchTitle: {
      fontSize: typography.sizes.md, fontWeight: '700', color: colors.neutral[100],
      fontFamily: typography.fontFamilyBold,
    },
    providerSwitchDesc: {
      fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2,
      fontFamily: typography.fontFamilyRegular,
    },
    customerSwitchBtn: {
      marginTop: spacing.sm,
      backgroundColor: 'transparent',
      borderRadius: radius.full,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderWidth: 1.5,
      borderColor: colors.primary[600],
    },
    customerSwitchText: {
      textAlign: 'center',
      color: colors.primary[600],
      fontWeight: '700',
      fontFamily: typography.fontFamilyBold,
    },

    // Appearance Toggle
    themeCard: {
      backgroundColor: colors.neutral[100],
      borderRadius: radius.xl,
      padding: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      borderWidth: 1,
      borderColor: colors.neutral[200],
      ...shadows.md,
    },
    themeIconWrap: {
      width: 40, height: 40, borderRadius: radius.md,
      backgroundColor: 'rgba(255, 140, 90, 0.12)',
      alignItems: 'center', justifyContent: 'center',
    },
    themeInfo: { flex: 1 },
    themeLabel: {
      fontSize: typography.sizes.md, fontWeight: '700', color: colors.neutral[900],
      fontFamily: typography.fontFamilyBold,
    },
    themeSubLabel: {
      fontSize: 11, color: colors.neutral[500], marginTop: 2,
      fontFamily: typography.fontFamilyRegular,
    },
    themePillRow: {
      flexDirection: 'row',
      backgroundColor: colors.neutral[50],
      borderRadius: radius.full,
      padding: 3,
      gap: 2,
      borderWidth: 1,
      borderColor: colors.neutral[200],
    },
    themePill: {
      paddingHorizontal: 12, paddingVertical: 6,
      borderRadius: radius.full,
      alignItems: 'center', justifyContent: 'center',
      flexDirection: 'row', gap: 4,
    },
    themePillActive: {
      backgroundColor: colors.accent[500],
    },
    themePillText: {
      fontSize: 10, fontWeight: '600',
      color: colors.neutral[500], fontFamily: typography.fontFamilyMedium,
    },
    themePillTextActive: { color: colors.neutral[100] },

    // Lang toggle
    langToggle: {
      flexDirection: 'row', backgroundColor: colors.neutral[100], borderRadius: radius.full, padding: 4,
      borderWidth: 1, borderColor: colors.neutral[200], ...shadows.sm,
    },
    langBtn: { flex: 1, paddingVertical: spacing.md, alignItems: 'center', borderRadius: radius.full },
    langBtnActive: { backgroundColor: colors.accent[500], ...shadows.sm },
    langBtnText: {
      fontSize: typography.sizes.md, color: colors.neutral[500], fontWeight: '600',
      fontFamily: typography.fontFamilyMedium,
    },
    langBtnTextActive: { color: colors.neutral[100] },

    logoutBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.neutral[100],
      borderRadius: radius.full,
      padding: spacing.md,
      gap: spacing.sm,
      borderWidth: 1.5,
      borderColor: '#F44336',
      ...shadows.sm,
    },
    logoutText: {
      fontSize: typography.sizes.md, fontWeight: '700', color: '#F44336',
      fontFamily: typography.fontFamilyBold,
    },
    versionText: {
      fontSize: typography.sizes.xs, color: colors.neutral[500], textAlign: 'center',
      marginTop: spacing.xl, fontFamily: typography.fontFamilyRegular,
    },
  });

  const handleLogout = () => {
    Alert.alert(t('logout'), 'Are you sure?', [
      { text: t('cancel'), style: 'cancel' },
      { text: t('logout'), style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const handleLanguageToggle = (newLang: 'ml' | 'en') => {
    setLang(newLang);
  };

  const handleSwitchToProvider = () => {
    if (profile?.role === 'provider') {
      router.push('/provider-dashboard');
      return;
    }
    router.push('/provider-onboarding');
  };

  const handleSwitchToCustomer = () => {
    router.replace('/(tabs)/index' as any);
  };

  const mlStyle = getLangTextStyle(lang);

  if (loading) return <LoadingState label={t('loading')} />;

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>

        {/* Profile top section */}
        <View style={styles.profileHeader}>
          <View style={styles.topCircle1} />
          <View style={styles.topCircle2} />
          <View style={styles.avatarWrap}>
            <User size={38} color={colors.neutral[100]} strokeWidth={2} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, mlStyle]}>{profile?.full_name || 'User'}</Text>
            <Text style={styles.profilePhone}>{profile?.phone || profile?.email || ''}</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/edit-profile')}
            style={styles.editBtn}
            activeOpacity={0.7}
          >
            <Pencil size={16} color={colors.neutral[100]} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        {/* Info stats cards row */}
        <View style={styles.infoCardsRow}>
          <View style={styles.infoCard}>
            <View style={styles.infoCardIcon}>
              <Calendar size={18} color={colors.accent[500]} strokeWidth={2} />
            </View>
            <Text style={styles.infoCardValue}>0</Text>
            <Text style={[styles.infoCardLabel, mlStyle]}>Bookings</Text>
          </View>
          <View style={styles.infoCard}>
            <View style={styles.infoCardIcon}>
              <MapPin size={18} color="#FF8C5A" strokeWidth={2} />
            </View>
            <Text style={styles.infoCardValue}>{addresses.length}</Text>
            <Text style={[styles.infoCardLabel, mlStyle]}>Addresses</Text>
          </View>
          <View style={styles.infoCard}>
            <View style={styles.infoCardIcon}>
              <Gift size={18} color={colors.accent[500]} strokeWidth={2} />
            </View>
            <Text style={styles.infoCardValue}>₹100</Text>
            <Text style={[styles.infoCardLabel, mlStyle]}>Referral</Text>
          </View>
        </View>

        {/* Group 1: Account & Address Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, mlStyle]}>Account Details</Text>
          <View style={styles.groupCard}>
            <TouchableOpacity style={[styles.menuItem, styles.menuItemBorder]} onPress={() => router.push('/location-setup')} activeOpacity={0.7}>
              <View style={styles.menuIcon}>
                <MapPin size={18} color={colors.primary[600]} strokeWidth={2} />
              </View>
              <View style={styles.menuInfo}>
                <Text style={styles.menuLabel}>{t('manageAddresses')}</Text>
                <Text style={styles.menuSublabel}>{addresses.length} saved</Text>
              </View>
              <ChevronRight size={18} color={colors.neutral[500]} strokeWidth={2} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.menuItem, styles.menuItemBorder]} onPress={() => { }} activeOpacity={0.7}>
              <View style={styles.menuIcon}>
                <CreditCard size={18} color={colors.primary[600]} strokeWidth={2} />
              </View>
              <View style={styles.menuInfo}>
                <Text style={styles.menuLabel}>{t('savedPayments')}</Text>
                <Text style={styles.menuSublabel}>Cards & UPI</Text>
              </View>
              <ChevronRight size={18} color={colors.neutral[500]} strokeWidth={2} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => { }} activeOpacity={0.7}>
              <View style={styles.menuIcon}>
                <Heart size={18} color={colors.primary[600]} strokeWidth={2} />
              </View>
              <View style={styles.menuInfo}>
                <Text style={styles.menuLabel}>{t('referFriend')}</Text>
                <Text style={styles.menuSublabel}>Get ₹100 cash back</Text>
              </View>
              <ChevronRight size={18} color={colors.neutral[500]} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Appearance & Settings Toggle */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, mlStyle]}>Appearance</Text>
          <View style={styles.themeCard}>
            <View style={styles.themeIconWrap}>
              {isDark
                ? <Moon size={22} color={colors.accent[500]} strokeWidth={1.8} />
                : <Sun size={22} color={colors.accent[500]} strokeWidth={1.8} />
              }
            </View>
            <View style={styles.themeInfo}>
              <Text style={styles.themeLabel}>{isDark ? 'Dark Theme' : 'Light Theme'}</Text>
              <Text style={styles.themeSubLabel}>
                {isDark ? 'Deep slate and dark styling' : 'Clean white and soft orange'}
              </Text>
            </View>
            <View style={styles.themePillRow}>
              <TouchableOpacity
                style={[styles.themePill, !isDark && styles.themePillActive]}
                onPress={() => !isDark ? null : toggle()}
                activeOpacity={0.75}
              >
                <Sun size={12} color={!isDark ? colors.neutral[100] : colors.neutral[500]} strokeWidth={2} />
                <Text style={[styles.themePillText, !isDark && styles.themePillTextActive]}>Light</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.themePill, isDark && styles.themePillActive]}
                onPress={() => isDark ? null : toggle()}
                activeOpacity={0.75}
              >
                <Moon size={12} color={isDark ? colors.neutral[100] : colors.neutral[500]} strokeWidth={2} />
                <Text style={[styles.themePillText, isDark && styles.themePillTextActive]}>Dark</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Language setting toggle */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, mlStyle]}>{t('language')}</Text>
          <View style={styles.langToggle}>
            <TouchableOpacity
              style={[styles.langBtn, lang === 'ml' && styles.langBtnActive]}
              onPress={() => handleLanguageToggle('ml')}
            >
              <Text style={[styles.langBtnText, lang === 'ml' && styles.langBtnTextActive, mlStyle]}>
                {t('malayalam')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.langBtn, lang === 'en' && styles.langBtnActive]}
              onPress={() => handleLanguageToggle('en')}
            >
              <Text style={[styles.langBtnText, lang === 'en' && styles.langBtnTextActive, mlStyle]}>
                {t('english')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Customer / Professional switch card */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.providerSwitchCard} onPress={handleSwitchToProvider} activeOpacity={0.8}>
            <View style={styles.providerSwitchIcon}>
              <Briefcase size={22} color={colors.neutral[100]} strokeWidth={2} />
            </View>
            <View style={styles.providerSwitchInfo}>
              <Text style={[styles.providerSwitchTitle, mlStyle]}>
                {profile?.role === 'provider' ? t('providerDashboard') : t('switchToProvider')}
              </Text>
              <Text style={[styles.providerSwitchDesc, mlStyle]}>
                {profile?.role === 'provider'
                  ? 'Manage jobs, earnings and professional status'
                  : t('becomeProviderDesc')}
              </Text>
            </View>
            <ChevronRight size={20} color={colors.neutral[100]} strokeWidth={2.5} />
          </TouchableOpacity>

          {profile?.role === 'provider' && (
            <TouchableOpacity style={styles.customerSwitchBtn} onPress={handleSwitchToCustomer} activeOpacity={0.8}>
              <Text style={[styles.customerSwitchText, mlStyle]}>Switch to Customer</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Group 2: Support & General Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, mlStyle]}>Support & Info</Text>
          <View style={styles.groupCard}>
            <TouchableOpacity style={[styles.menuItem, styles.menuItemBorder]} onPress={() => { }} activeOpacity={0.7}>
              <View style={styles.menuIcon}>
                <HelpCircle size={18} color={colors.primary[600]} strokeWidth={2} />
              </View>
              <View style={styles.menuInfo}>
                <Text style={styles.menuLabel}>{t('helpSupport')}</Text>
                <Text style={styles.menuSublabel}>FAQ, Live Chat Support</Text>
              </View>
              <ChevronRight size={18} color={colors.neutral[500]} strokeWidth={2} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => { }} activeOpacity={0.7}>
              <View style={styles.menuIcon}>
                <Settings size={18} color={colors.primary[600]} strokeWidth={2} />
              </View>
              <View style={styles.menuInfo}>
                <Text style={styles.menuLabel}>App Settings</Text>
                <Text style={styles.menuSublabel}>Privacy, permissions, etc</Text>
              </View>
              <ChevronRight size={18} color={colors.neutral[500]} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Notifications Switch Card */}
        <View style={styles.section}>
          <View style={styles.groupCard}>
            <View style={styles.menuItem}>
              <View style={styles.menuIcon}>
                <Bell size={18} color={colors.primary[600]} strokeWidth={2} />
              </View>
              <View style={styles.menuInfo}>
                <Text style={styles.menuLabel}>{t('notifications')}</Text>
                <Text style={styles.menuSublabel}>Booking status updates & offers</Text>
              </View>
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: colors.neutral[200], true: colors.accent[500] }}
                thumbColor={notifications ? colors.neutral[100] : colors.neutral[500]}
              />
            </View>
          </View>
        </View>

        {/* Logout action */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
            <LogOut size={18} color="#F44336" strokeWidth={2} />
            <Text style={styles.logoutText}>{t('logout')}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.versionText}>Seva v1.0.0 · Thrissur</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
