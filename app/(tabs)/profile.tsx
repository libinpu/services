import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useLanguage } from '@/lib/language-context';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { colors, spacing, radius, typography, shadows, getLangTextStyle } from '@/lib/theme';
import { LoadingState } from '@/components/ui';
import type { Address } from '@/lib/types';
import { User, MapPin, CreditCard, Bell, Gift, Circle as HelpCircle, LogOut, ChevronRight, Calendar, Phone, Mail, Pencil, Briefcase, ShieldCheck } from 'lucide-react-native';

export default function ProfileScreen() {
  const { t, lang, setLang } = useLanguage();
  const { session, profile, signOut } = useAuth();
  const router = useRouter();

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

  const handleLogout = () => {
    Alert.alert(t('logout'), 'Are you sure?', [
      { text: t('cancel'), style: 'cancel' },
      { text: t('logout'), style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const handleLanguageToggle = (newLang: 'ml' | 'en') => {
    setLang(newLang);
  };

  const menuItems = [
    ...(profile?.role === 'admin'
      ? [{ icon: ShieldCheck, label: 'Admin Portal & Database', sublabel: 'Verifications, Tables & Requests', onPress: () => router.push('/admin' as any) }]
      : []),
    { icon: MapPin, label: t('manageAddresses'), sublabel: `${addresses.length} saved`, onPress: () => router.push('/location-setup') },
    { icon: CreditCard, label: t('savedPayments'), sublabel: '', onPress: () => {} },
    { icon: Gift, label: t('referFriend'), sublabel: '', onPress: () => {} },
    { icon: HelpCircle, label: t('helpSupport'), sublabel: '', onPress: () => {} },
  ];

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
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        {/* Profile header card */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarWrap}>
            <User size={36} color={colors.neutral[0]} strokeWidth={2} />
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
            <Pencil size={14} color={colors.primary[700]} strokeWidth={2.5} />
            <Text style={[styles.editBtnText, mlStyle]}>{t('editProfile')}</Text>
          </TouchableOpacity>
        </View>

        {/* Info cards */}
        <View style={styles.infoCardsRow}>
          <View style={styles.infoCard}>
            <View style={styles.infoCardIcon}>
              <Calendar size={18} color={colors.primary[600]} strokeWidth={2} />
            </View>
            <Text style={styles.infoCardValue}>0</Text>
            <Text style={[styles.infoCardLabel, mlStyle]}>Bookings</Text>
          </View>
          <View style={styles.infoCard}>
            <View style={styles.infoCardIcon}>
              <MapPin size={18} color={colors.secondary[600]} strokeWidth={2} />
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

        {/* Contact info */}
        {profile && (profile.phone || profile.email) && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, mlStyle]}>Contact</Text>
            <View style={styles.contactCard}>
              {profile.phone && (
                <View style={styles.contactRow}>
                  <View style={styles.contactIcon}>
                    <Phone size={16} color={colors.neutral[500]} strokeWidth={2} />
                  </View>
                  <Text style={styles.contactText}>{profile.phone}</Text>
                </View>
              )}
              {profile.email && (
                <View style={styles.contactRow}>
                  <View style={styles.contactIcon}>
                    <Mail size={16} color={colors.neutral[500]} strokeWidth={2} />
                  </View>
                  <Text style={styles.contactText}>{profile.email}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Language toggle */}
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

        {/* Customer / Professional switch */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.providerSwitchCard} onPress={handleSwitchToProvider} activeOpacity={0.8}>
            <View style={styles.providerSwitchIcon}>
              <Briefcase size={24} color={colors.neutral[0]} strokeWidth={2} />
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
            <ChevronRight size={20} color={colors.neutral[0]} strokeWidth={2.5} />
          </TouchableOpacity>

          {profile?.role === 'provider' && (
            <TouchableOpacity style={styles.customerSwitchBtn} onPress={handleSwitchToCustomer} activeOpacity={0.8}>
              <Text style={[styles.customerSwitchText, mlStyle]}>Switch to Customer</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Menu items */}
        <View style={styles.section}>
          {menuItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <TouchableOpacity key={idx} style={styles.menuItem} onPress={item.onPress} activeOpacity={0.7}>
                <View style={styles.menuIcon}>
                  <Icon size={20} color={colors.neutral[600]} strokeWidth={2} />
                </View>
                <View style={styles.menuInfo}>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  {item.sublabel ? <Text style={styles.menuSublabel}>{item.sublabel}</Text> : null}
                </View>
                <ChevronRight size={18} color={colors.neutral[300]} strokeWidth={2} />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Notifications toggle */}
        <View style={styles.section}>
          <View style={styles.menuItem}>
            <View style={styles.menuIcon}>
              <Bell size={20} color={colors.neutral[600]} strokeWidth={2} />
            </View>
            <View style={styles.menuInfo}>
              <Text style={styles.menuLabel}>{t('notifications')}</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: colors.neutral[300], true: colors.primary[500] }}
              thumbColor={notifications ? colors.primary[600] : colors.neutral[0]}
            />
          </View>
        </View>

        {/* Logout */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
            <LogOut size={20} color={colors.error[600]} strokeWidth={2} />
            <Text style={styles.logoutText}>{t('logout')}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.versionText}>Seva v1.0.0 · Thrissur</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral[50] },
  profileHeader: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.neutral[0],
    padding: spacing.lg, ...shadows.sm,
  },
  avatarWrap: {
    width: 64, height: 64, borderRadius: radius.full, backgroundColor: colors.primary[700],
    alignItems: 'center', justifyContent: 'center', marginRight: spacing.md,
  },
  profileInfo: { flex: 1 },
  profileName: {
    fontSize: typography.sizes.xl, fontWeight: '700', color: colors.neutral[900],
    fontFamily: typography.fontFamilyBold,
  },
  profilePhone: {
    fontSize: typography.sizes.sm, color: colors.neutral[500], marginTop: 2,
    fontFamily: typography.fontFamilyRegular,
  },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.primary[50], borderRadius: radius.md,
  },
  editBtnText: {
    fontSize: typography.sizes.sm, color: colors.primary[700], fontWeight: '600',
    fontFamily: typography.fontFamilyMedium,
  },
  infoCardsRow: {
    flexDirection: 'row', paddingHorizontal: spacing.md, marginTop: spacing.md, gap: spacing.sm,
  },
  infoCard: {
    flex: 1, backgroundColor: colors.neutral[0], borderRadius: radius.lg,
    padding: spacing.md, alignItems: 'center', ...shadows.sm,
  },
  infoCardIcon: {
    width: 36, height: 36, borderRadius: radius.full, backgroundColor: colors.neutral[100],
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs,
  },
  infoCardValue: {
    fontSize: typography.sizes.md, fontWeight: '700', color: colors.neutral[900],
    fontFamily: typography.fontFamilyBold,
  },
  infoCardLabel: {
    fontSize: typography.sizes.xs, color: colors.neutral[400], marginTop: 2,
    fontFamily: typography.fontFamilyRegular,
  },
  section: { paddingHorizontal: spacing.md, marginTop: spacing.lg },
  providerSwitchCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary[700],
    borderRadius: radius.lg, padding: spacing.lg, ...shadows.md,
  },
  providerSwitchIcon: {
    width: 48, height: 48, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center', marginRight: spacing.md,
  },
  providerSwitchInfo: { flex: 1 },
  providerSwitchTitle: {
    fontSize: typography.sizes.lg, fontWeight: '700', color: colors.neutral[0],
    fontFamily: typography.fontFamilyBold,
  },
  providerSwitchDesc: {
    fontSize: typography.sizes.sm, color: 'rgba(255,255,255,0.8)', marginTop: 2,
    fontFamily: typography.fontFamilyRegular,
  },
  customerSwitchBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.neutral[0],
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  customerSwitchText: {
    textAlign: 'center',
    color: colors.primary[700],
    fontWeight: '700',
    fontFamily: typography.fontFamilyBold,
  },
  sectionTitle: {
    fontSize: typography.sizes.md, fontWeight: '700', color: colors.neutral[700],
    marginBottom: spacing.sm, fontFamily: typography.fontFamilyBold,
  },
  contactCard: {
    backgroundColor: colors.neutral[0], borderRadius: radius.lg, padding: spacing.md, ...shadows.sm,
  },
  contactRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs },
  contactIcon: {
    width: 32, height: 32, borderRadius: radius.sm, backgroundColor: colors.neutral[100],
    alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm,
  },
  contactText: {
    fontSize: typography.sizes.sm, color: colors.neutral[700],
    fontFamily: typography.fontFamilyMedium,
  },
  langToggle: {
    flexDirection: 'row', backgroundColor: colors.neutral[100], borderRadius: radius.md, padding: 4,
  },
  langBtn: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center', borderRadius: radius.sm },
  langBtnActive: { backgroundColor: colors.neutral[0], ...shadows.sm },
  langBtnText: {
    fontSize: typography.sizes.md, color: colors.neutral[500], fontWeight: '600',
    fontFamily: typography.fontFamilyMedium,
  },
  langBtnTextActive: { color: colors.primary[700] },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.neutral[0],
    borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, ...shadows.sm,
  },
  menuIcon: {
    width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.neutral[100],
    alignItems: 'center', justifyContent: 'center', marginRight: spacing.md,
  },
  menuInfo: { flex: 1 },
  menuLabel: {
    fontSize: typography.sizes.md, fontWeight: '600', color: colors.neutral[800],
    fontFamily: typography.fontFamilyMedium,
  },
  menuSublabel: {
    fontSize: typography.sizes.xs, color: colors.neutral[400], marginTop: 2,
    fontFamily: typography.fontFamilyRegular,
  },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.error[50], borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm,
  },
  logoutText: {
    fontSize: typography.sizes.md, fontWeight: '600', color: colors.error[600],
    fontFamily: typography.fontFamilyMedium,
  },
  versionText: {
    fontSize: typography.sizes.xs, color: colors.neutral[400], textAlign: 'center',
    marginTop: spacing.xl, fontFamily: typography.fontFamilyRegular,
  },
});
