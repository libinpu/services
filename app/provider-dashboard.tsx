import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Pressable, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useLanguage } from '@/lib/language-context';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { cache } from '@/lib/cache';
import { dedupeRequest } from '@/lib/query';
import { withRequestTimeout } from '@/lib/query';
import { createRealtimeChannel } from '@/lib/realtime';
import { colors, spacing, radius, typography, shadows } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';
import { LoadingState, ErrorState, Button } from '@/components/ui';
import type { BookingWithDetails, ProviderApplication, ProviderWithProfile } from '@/lib/types';
import {
  ZapOff, Clock, MapPin, Star, Check, X, ChevronRight,
  TrendingUp, Briefcase, Award, Bell, User, Navigation, Ruler, MapPinned,
} from 'lucide-react-native';

export default function ProviderDashboardScreen() {
  const { t, lang } = useLanguage();
  const { session, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { isDark } = useTheme();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [application, setApplication] = useState<ProviderApplication | null>(null);
  const [providerProfile, setProviderProfile] = useState<ProviderWithProfile | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [pendingJobs, setPendingJobs] = useState<BookingWithDetails[]>([]);
  const [activeJobs, setActiveJobs] = useState<BookingWithDetails[]>([]);
  const [pastJobs, setPastJobs] = useState<BookingWithDetails[]>([]);
  const [tab, setTab] = useState<'incoming' | 'active' | 'history'>('incoming');
  const [showJobModal, setShowJobModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<BookingWithDetails | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);
  const jobsFetchingRef = useRef(false);

  const hasProviderProfile = !!providerProfile?.provider_profile;
  const isProviderRole = profile?.role === 'provider';
  const isProviderUser =
    isProviderRole ||
    hasProviderProfile ||
    application?.status === 'approved';
  const canAccessProviderDashboard = isProviderUser;

  const fetchData = useCallback(async () => {
    if (!session?.user?.id) { setLoading(false); return; }
    try {
      setError(null);
      const cacheKey = `provider-dashboard:${session.user.id}`;
      const cached = cache.get<{ application: ProviderApplication | null; profile: ProviderWithProfile | null }>(cacheKey);
      if (cached) {
        setApplication(cached.application);
        setProviderProfile(cached.profile);
        setIsOnline(cached.profile?.provider_profile?.is_online ?? false);
        setLoading(false);
        return;
      }
      const [appRes, provRes] = await withRequestTimeout(dedupeRequest(cacheKey, () => Promise.all([
        supabase
          .from('provider_applications')
          .select('id, user_id, category_ids, specializations, experience_years, bio_en, bio_ml, id_proof_url, certificate_url, address_proof_url, status, admin_notes, submitted_at, reviewed_at, created_at, updated_at')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('profiles')
          .select('id, role, full_name, phone, email, avatar_url, preferred_language, zone_id, is_active, created_at, updated_at, provider_profile:provider_profiles(id, category_ids, specializations, experience_years, is_verified, background_check_status, rating_avg, rating_count, jobs_completed, is_online, price_per_hour, zone_id, bio_en, bio_ml, latitude, longitude, last_location_at, created_at, updated_at)')
          .eq('id', session.user.id)
          .maybeSingle(),
      ])));
      const nextApplication = appRes.data ? (appRes.data as ProviderApplication) : null;
      const nextProfile = provRes.data ? (provRes.data as unknown as ProviderWithProfile) : null;
      cache.set(cacheKey, { application: nextApplication, profile: nextProfile }, 5 * 60 * 1000);
      setApplication(nextApplication);
      if (provRes.data) {
        setProviderProfile(nextProfile);
        const pp = (provRes.data as any).provider_profile;
        setIsOnline(pp?.is_online ?? false);
      } else {
        setProviderProfile(null);
        setIsOnline(false);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  // Load jobs once when the dashboard opens. Job actions explicitly refresh this
  // data; background polling of these RLS-protected joins overwhelmed Postgres.
  const fetchJobs = useCallback(async () => {
    if (!session?.user?.id) return;
    if (jobsFetchingRef.current) return;
    jobsFetchingRef.current = true;
    try {
      const { data, error: jobsError } = await supabase
        .from('bookings')
        .select('id, customer_id, provider_id, subcategory_id, address_id, status, scheduled_at, booking_mode, estimated_cost, final_cost, payment_method, payment_status, created_at, updated_at, estimated_eta_mins, distance_km, subcategory:service_subcategories(id, name_en, name_ml), address:addresses(id, address_line, area, district)')
        .eq('provider_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (jobsError) throw jobsError;
      const jobs = (data || []) as unknown as BookingWithDetails[];
      setPendingJobs(jobs.filter((job) => job.status === 'pending'));
      setActiveJobs(jobs.filter((job) => ['accepted', 'on_the_way', 'arrived', 'in_progress', 'awaiting_confirmation'].includes(job.status)));
      setPastJobs(jobs.filter((job) => ['completed', 'cancelled', 'rejected'].includes(job.status)).slice(0, 20));
    } catch (e: any) {
      // non-blocking
    } finally {
      jobsFetchingRef.current = false;
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (authLoading) return;
    if (!session?.user?.id) {
      setLoading(false);
      setError('Your session expired. Please sign in again.');
      return;
    }

    void Promise.all([fetchData(), fetchJobs()]);
  }, [authLoading, session?.user?.id, fetchData, fetchJobs]);

  useEffect(() => {
    if (!session?.user?.id) return;
    const channel = createRealtimeChannel(`provider-dashboard-bookings:${session.user.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'bookings', filter: `provider_id=eq.${session.user.id}`,
      }, ({ new: row }) => {
        const update = row as Partial<BookingWithDetails>;
        const isActive = ['accepted', 'on_the_way', 'arrived', 'in_progress', 'awaiting_confirmation'].includes(update.status || '');
        const isHistory = ['completed', 'cancelled', 'rejected'].includes(update.status || '');
        setPendingJobs((items) => update.status === 'pending'
          ? items.map((item) => item.id === update.id ? { ...item, ...update } : item)
          : items.filter((item) => item.id !== update.id));
        setActiveJobs((items) => isActive
          ? items.map((item) => item.id === update.id ? { ...item, ...update } : item)
          : items.filter((item) => item.id !== update.id));
        setPastJobs((items) => isHistory
          ? items.map((item) => item.id === update.id ? { ...item, ...update } : item)
          : items.filter((item) => item.id !== update.id));
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [session?.user?.id]);

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.neutral[50] },
    dashHeader: { backgroundColor: colors.primary[700], paddingHorizontal: spacing.lg, paddingVertical: spacing.lg },
    dashHeaderTop: { flexDirection: 'row', alignItems: 'center' },
    dashAvatar: { width: 52, height: 52, borderRadius: radius.full, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
    dashAvatarText: { fontSize: typography.sizes.xxl, fontWeight: '700', color: colors.neutral[0], fontFamily: typography.fontFamilyBold },
    dashHeaderInfo: { flex: 1 },
    dashName: { fontSize: typography.sizes.xl, fontWeight: '700', color: colors.neutral[0], fontFamily: typography.fontFamilyBold },
    dashVerifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    dashVerifiedText: { fontSize: typography.sizes.xs, color: 'rgba(255,255,255,0.8)', fontWeight: '600', fontFamily: typography.fontFamilyMedium },
    onlineToggleWrap: { alignItems: 'center' },
    onlineToggleLabel: { fontSize: typography.sizes.xs, fontWeight: '600', marginTop: 4, fontFamily: typography.fontFamilyMedium },
    modeRow: { marginTop: spacing.md },
    modeButton: {
      backgroundColor: 'rgba(255,255,255,0.12)',
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      alignItems: 'center',
    },
    modeButtonText: {
      color: colors.neutral[0],
      fontSize: typography.sizes.sm,
      fontWeight: '700',
      fontFamily: typography.fontFamilyBold,
    },
    statsRow: { flexDirection: 'row', paddingHorizontal: spacing.md, marginTop: spacing.md, gap: spacing.sm },
    statCard: { flex: 1, backgroundColor: colors.neutral[100], borderRadius: radius.lg, padding: spacing.md, alignItems: 'center' },
    statIcon: { width: 36, height: 36, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
    statValue: { fontSize: typography.sizes.xl, fontWeight: '700', color: colors.neutral[900], fontFamily: typography.fontFamilyBold },
    statLabel: { fontSize: typography.sizes.xs, color: colors.neutral[400], marginTop: 2, fontFamily: typography.fontFamilyRegular },
    tabsRow: { flexDirection: 'row', paddingHorizontal: spacing.md, marginTop: spacing.lg, gap: spacing.sm },
    tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: spacing.sm, borderRadius: radius.md, backgroundColor: colors.neutral[100] },
    tabActive: { backgroundColor: colors.primary[600] },
    tabText: { fontSize: typography.sizes.sm, fontWeight: '600', color: colors.neutral[500], fontFamily: typography.fontFamilyMedium },
    tabTextActive: { color: colors.neutral[0] },
    tabBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: radius.full, backgroundColor: colors.neutral[200] },
    tabBadgeActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
    tabBadgeText: { fontSize: 10, fontWeight: '700', color: colors.neutral[600], fontFamily: typography.fontFamilyBold },
    tabBadgeTextActive: { color: colors.neutral[0] },
    jobsList: { paddingHorizontal: spacing.md, marginTop: spacing.md },
    offlineBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.warning[50], borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.sm },
    offlineBannerText: { fontSize: typography.sizes.sm, color: colors.warning[700], fontWeight: '600', fontFamily: typography.fontFamilyMedium },
    emptyState: { alignItems: 'center', padding: spacing.xl },
    emptyTitle: { fontSize: typography.sizes.md, fontWeight: '600', color: colors.neutral[500], marginTop: spacing.sm, fontFamily: typography.fontFamilyMedium },
    emptyDesc: { fontSize: typography.sizes.sm, color: colors.neutral[400], marginTop: spacing.xs, fontFamily: typography.fontFamilyRegular, textAlign: 'center' },
    jobCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.neutral[100], borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm },
    jobCardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center' },
    jobIcon: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.primary[50], alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
    jobInfo: { flex: 1 },
    jobService: { fontSize: typography.sizes.md, fontWeight: '700', color: colors.neutral[900], marginBottom: 2, fontFamily: typography.fontFamilyBold },
    jobAddress: { fontSize: typography.sizes.sm, color: colors.neutral[500], lineHeight: 18, fontFamily: typography.fontFamilyRegular },
    jobTime: { fontSize: typography.sizes.xs, color: colors.neutral[400], marginTop: 2, fontFamily: typography.fontFamilyRegular },
    jobStatusRow: { flexDirection: 'row', marginTop: spacing.xs },
    jobStatusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full },
    jobStatusText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize', fontFamily: typography.fontFamilyBold },
    jobActions: { flexDirection: 'row', gap: spacing.xs },
    jobAcceptBtn: { width: 40, height: 40, borderRadius: radius.full, backgroundColor: colors.primary[600], alignItems: 'center', justifyContent: 'center' },
    jobRejectBtn: { width: 40, height: 40, borderRadius: radius.full, backgroundColor: colors.neutral[200], alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.neutral[300] },
    switchSection: { paddingHorizontal: spacing.md, marginTop: spacing.xl },
    switchBtn: { width: '100%' },
    pendingCard: { alignItems: 'center', padding: spacing.xl, margin: spacing.md, backgroundColor: colors.neutral[100], borderRadius: radius.lg },
    pendingIcon: { width: 80, height: 80, borderRadius: radius.xl, backgroundColor: colors.warning[50], alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
    pendingTitle: { fontSize: typography.sizes.xl, fontWeight: '700', color: colors.neutral[900], marginBottom: spacing.xs, fontFamily: typography.fontFamilyBold },
    pendingDesc: { fontSize: typography.sizes.sm, color: colors.neutral[500], textAlign: 'center', marginBottom: spacing.lg, fontFamily: typography.fontFamilyRegular },
    pendingInfoCard: { backgroundColor: colors.neutral[200], borderRadius: radius.lg, padding: spacing.md, width: '100%', marginBottom: spacing.lg },
    pendingInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: spacing.xs },
    pendingInfoText: { fontSize: typography.sizes.sm, color: colors.neutral[700], fontFamily: typography.fontFamilyMedium },
    pendingBtn: { width: '100%' },
    welcomeCard: { alignItems: 'center', padding: spacing.xl, margin: spacing.md, backgroundColor: colors.neutral[100], borderRadius: radius.lg },
    welcomeIcon: { width: 80, height: 80, borderRadius: radius.xl, backgroundColor: colors.primary[50], alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
    welcomeTitle: { fontSize: typography.sizes.xxl, fontWeight: '700', color: colors.neutral[900], marginBottom: spacing.xs, fontFamily: typography.fontFamilyBold },
    welcomeDesc: { fontSize: typography.sizes.sm, color: colors.neutral[500], textAlign: 'center', marginBottom: spacing.lg, fontFamily: typography.fontFamilyRegular },
    welcomeBtn: { width: '100%' },
    welcomeBtn2: { width: '100%', marginTop: spacing.sm },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalCard: { backgroundColor: colors.neutral[100], borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingBottom: spacing.xl },
    modalHandle: { width: 40, height: 4, borderRadius: radius.full, backgroundColor: colors.neutral[200], alignSelf: 'center', marginTop: spacing.sm, marginBottom: spacing.sm },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg },
    modalTitle: { fontSize: typography.sizes.xxl, fontWeight: '700', color: colors.neutral[900], fontFamily: typography.fontFamilyBold },
    modalCloseBtn: { width: 36, height: 36, borderRadius: radius.full, backgroundColor: colors.neutral[100], alignItems: 'center', justifyContent: 'center' },
    modalDesc: { fontSize: typography.sizes.sm, color: colors.neutral[500], paddingHorizontal: spacing.lg, marginTop: spacing.xs, fontFamily: typography.fontFamilyRegular },
    modalJobInfo: { backgroundColor: colors.neutral[200], borderRadius: radius.lg, padding: spacing.md, marginHorizontal: spacing.lg, marginTop: spacing.md },
    modalJobRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
    modalJobText: { flex: 1, fontSize: typography.sizes.sm, color: colors.neutral[700], fontFamily: typography.fontFamilyMedium },
    modalActions: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, marginTop: spacing.lg },
    modalRejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 52, borderRadius: radius.full, backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.error[600] },
    modalRejectText: { fontSize: typography.sizes.md, fontWeight: '700', color: colors.error[600], fontFamily: typography.fontFamilyBold },
    modalAcceptBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 52, borderRadius: radius.full, backgroundColor: colors.primary[600] },
    modalAcceptText: { fontSize: typography.sizes.md, fontWeight: '700', color: colors.neutral[0], fontFamily: typography.fontFamilyBold },
  });


  const toggleOnline = async () => {
    if (!session?.user?.id) return;
    const newOnline = !isOnline;
    setIsOnline(newOnline);
    const updateData: any = { is_online: newOnline, updated_at: new Date().toISOString() };
    if (newOnline) {
      try {
        const expoLocation = await import('expo-location');
        const { status } = await expoLocation.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const pos = await expoLocation.getCurrentPositionAsync({ accuracy: 3 });
          updateData.latitude = pos.coords.latitude;
          updateData.longitude = pos.coords.longitude;
          updateData.last_location_at = new Date().toISOString();
        }
      } catch {
        // Location permission denied or unavailable — proceed without location
      }
    }
    await supabase.from('provider_profiles').update(updateData).eq('id', session.user.id);
    cache.invalidate(`provider-dashboard:${session.user.id}`);
    void fetchData();
  };

  const handleAcceptJob = async (jobId: string) => {
    setActionLoading(true);
    const updatedAt = new Date().toISOString();
    await supabase.from('bookings').update({ status: 'accepted', updated_at: updatedAt }).eq('id', jobId);
    setPendingJobs((current) => {
      const job = current.find((entry) => entry.id === jobId);
      if (job) setActiveJobs((active) => [{ ...job, status: 'accepted' as const, updated_at: updatedAt }, ...active]);
      return current.filter((entry) => entry.id !== jobId);
    });
    setActionLoading(false);
    setShowJobModal(false);
  };

  const handleRejectJob = async (jobId: string) => {
    setActionLoading(true);
    const updatedAt = new Date().toISOString();
    await supabase.from('bookings').update({ status: 'rejected', updated_at: updatedAt }).eq('id', jobId);
    setPendingJobs((current) => {
      const job = current.find((entry) => entry.id === jobId);
      if (job) setPastJobs((past) => [{ ...job, status: 'rejected' as const, updated_at: updatedAt }, ...past].slice(0, 20));
      return current.filter((entry) => entry.id !== jobId);
    });
    setActionLoading(false);
    setShowJobModal(false);
  };

  if (loading) return <LoadingState label={t('loading')} />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  if (application?.status === 'pending') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
          <View style={styles.pendingCard}>
            <View style={styles.pendingIcon}>
              <Clock size={48} color={colors.warning[500]} strokeWidth={1.5} />
            </View>
            <Text style={styles.pendingTitle}>{t('pendingApproval')}</Text>
            <Text style={styles.pendingDesc}>{t('pendingApprovalDesc')}</Text>
            <View style={styles.pendingInfoCard}>
              <View style={styles.pendingInfoRow}>
                <Briefcase size={16} color={colors.primary[600]} strokeWidth={2} />
                <Text style={styles.pendingInfoText}>{application.experience_years} {t('years')}</Text>
              </View>
              <View style={styles.pendingInfoRow}>
                <Award size={16} color={colors.primary[600]} strokeWidth={2} />
                <Text style={styles.pendingInfoText}>{application.specializations.join(', ') || 'N/A'}</Text>
              </View>
            </View>
            <Button label={t('switchToCustomer')} onPress={() => router.replace('/(tabs)/index' as any)} variant="outline" style={styles.pendingBtn} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!application) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
          <View style={styles.welcomeCard}>
            <View style={styles.welcomeIcon}>
              <Briefcase size={48} color={colors.primary[600]} strokeWidth={1.5} />
            </View>
            <Text style={styles.welcomeTitle}>{t('becomeProvider')}</Text>
            <Text style={styles.welcomeDesc}>{t('becomeProviderDesc')}</Text>
            <Button label={t('becomeProvider')} onPress={() => router.push('/provider-onboarding')} style={styles.welcomeBtn} />
            <Button label={t('switchToCustomer')} onPress={() => router.replace('/(tabs)/index' as any)} variant="ghost" style={styles.welcomeBtn2} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const pp = providerProfile?.provider_profile;

  // New Professional Welcome Screen
  if (application?.status === 'approved' && pp?.is_verified && !welcomeDismissed && pp?.jobs_completed === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
          <View style={styles.welcomeCard}>
            <View style={[styles.welcomeIcon, { backgroundColor: colors.success[50] }]}>
              <Award size={48} color={colors.success[600]} strokeWidth={1.5} />
            </View>
            <Text style={styles.welcomeTitle}>{lang === 'ml' ? 'പ്രൊഫഷണലിലേക്ക് സ്വാഗതം!' : 'Welcome to Professional!'}</Text>
            <Text style={styles.welcomeDesc}>{lang === 'ml' ? 'നിങ്ങളുടെ അപേക്ഷ അംഗീകരിച്ചു. നിങ്ങൾക്ക് ഇപ്പോൾ ജോലി ആരംഭിക്കാം.' : 'Your application has been approved. You can now go online and start working!'}</Text>
            <Button label={lang === 'ml' ? 'ജോലി ആരംഭിക്കുക' : 'Start Working'} onPress={() => setWelcomeDismissed(true)} style={styles.welcomeBtn} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <View style={styles.dashHeader}>
          <View style={styles.dashHeaderTop}>
            <View style={styles.dashAvatar}>
              <Text style={styles.dashAvatarText}>{(profile?.full_name || '?')[0].toUpperCase()}</Text>
            </View>
            <View style={styles.dashHeaderInfo}>
              <Text style={styles.dashName}>{profile?.full_name || 'Provider'}</Text>
              {pp?.is_verified && (
                <View style={styles.dashVerifiedRow}>
                  <Check size={12} color={colors.success[600]} strokeWidth={3} />
                  <Text style={styles.dashVerifiedText}>{t('approvedProvider')}</Text>
                </View>
              )}
            </View>
            <View style={styles.onlineToggleWrap}>
              <Switch value={isOnline} onValueChange={toggleOnline} trackColor={{ false: colors.neutral[300], true: colors.primary[600] }} thumbColor={isOnline ? colors.neutral[0] : colors.neutral[0]} />
              <Text style={[styles.onlineToggleLabel, { color: isOnline ? colors.success[600] : colors.neutral[400] }]}>
                {isOnline ? t('providerOnline') : t('providerOffline')}
              </Text>
            </View>
          </View>

          <View style={styles.modeRow}>
            <TouchableOpacity style={[styles.modeButton, { flex: 1, marginRight: spacing.xs }]} onPress={() => router.push('/nearby-requests' as any)}>
              <MapPinned size={16} color={colors.neutral[0]} strokeWidth={2.5} />
              <Text style={styles.modeButtonText}>  {lang === 'ml' ? 'അടുത്തുള്ള അഭ്യർത്ഥനകൾ' : 'Nearby Requests'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modeButton, { flex: 1, marginLeft: spacing.xs }]} onPress={() => router.replace('/(tabs)/index' as any)}>
              <Text style={styles.modeButtonText}>{lang === 'ml' ? 'ഉപഭോക്താവ്' : 'Customer'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: colors.primary[50] }]}>
              <TrendingUp size={18} color={colors.primary[600]} strokeWidth={2} />
            </View>
            <Text style={styles.statValue}>{pp?.jobs_completed || 0}</Text>
            <Text style={styles.statLabel}>{t('jobsDone')}</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: colors.accent[50] }]}>
              <Star size={18} color={colors.accent[500]} fill={colors.accent[500]} strokeWidth={0} />
            </View>
            <Text style={styles.statValue}>{pp?.rating_avg?.toFixed(1) || '0.0'}</Text>
            <Text style={styles.statLabel}>{t('ratingCount')}</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: colors.secondary[50] }]}>
              <Briefcase size={18} color={colors.secondary[600]} strokeWidth={2} />
            </View>
            <Text style={styles.statValue}>{pp?.experience_years || 0}</Text>
            <Text style={styles.statLabel}>{t('years')}</Text>
          </View>
        </View>

        <View style={styles.tabsRow}>
          {[
            { key: 'incoming', label: t('incomingJobs'), count: pendingJobs.length },
            { key: 'active', label: t('activeJobs'), count: activeJobs.length },
            { key: 'history', label: t('jobHistory'), count: pastJobs.length },
          ].map((tabItem) => (
            <TouchableOpacity key={tabItem.key} style={[styles.tab, tab === tabItem.key && styles.tabActive]} onPress={() => setTab(tabItem.key as any)}>
              <Text style={[styles.tabText, tab === tabItem.key && styles.tabTextActive]}>{tabItem.label}</Text>
              {tabItem.count > 0 && (
                <View style={[styles.tabBadge, tab === tabItem.key && styles.tabBadgeActive]}>
                  <Text style={[styles.tabBadgeText, tab === tabItem.key && styles.tabBadgeTextActive]}>{tabItem.count}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {tab === 'incoming' && (
          <View style={styles.jobsList}>
            {!isOnline && (
              <View style={styles.offlineBanner}>
                <ZapOff size={16} color={colors.warning[600]} strokeWidth={2} />
                <Text style={styles.offlineBannerText}>{lang === 'ml' ? 'ജോലികൾ സ്വീകരിക്കാൻ ഓൺലൈൻ ആകുക' : 'Go online to receive job requests'}</Text>
              </View>
            )}
            {pendingJobs.length === 0 ? (
              <View style={styles.emptyState}>
                <Bell size={40} color={colors.neutral[200]} strokeWidth={1.5} />
                <Text style={styles.emptyTitle}>{t('noIncomingJobs')}</Text>
                <Text style={styles.emptyDesc}>{t('noIncomingJobsDesc')}</Text>
              </View>
            ) : (
              pendingJobs.map((job) => (
                <TouchableOpacity key={job.id} style={styles.jobCard} onPress={() => { setSelectedJob(job); setShowJobModal(true); }} activeOpacity={0.8}>
                  <View style={styles.jobCardLeft}>
                    <View style={styles.jobIcon}><Briefcase size={20} color={colors.primary[600]} strokeWidth={2} /></View>
                    <View style={styles.jobInfo}>
                      <Text style={styles.jobService}>{lang === 'ml' ? job.subcategory?.name_ml : job.subcategory?.name_en}</Text>
                      <Text style={styles.jobAddress}>{job.address?.address_line}, {job.address?.area}</Text>
                      <Text style={styles.jobTime}>{new Date(job.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</Text>
                    </View>
                  </View>
                  <View style={styles.jobActions}>
                    <TouchableOpacity style={styles.jobAcceptBtn} onPress={() => handleAcceptJob(job.id)}>
                      <Check size={18} color={colors.neutral[0]} strokeWidth={3} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.jobRejectBtn} onPress={() => handleRejectJob(job.id)}>
                      <X size={18} color={colors.error[600]} strokeWidth={3} />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {tab === 'active' && (
          <View style={styles.jobsList}>
            {activeJobs.length === 0 ? (
              <View style={styles.emptyState}>
                <Briefcase size={40} color={colors.neutral[200]} strokeWidth={1.5} />
                <Text style={styles.emptyTitle}>{t('noIncomingJobs')}</Text>
              </View>
            ) : (
              activeJobs.map((job) => (
                <TouchableOpacity key={job.id} style={styles.jobCard} onPress={() => router.push(`/provider-job/${job.id}`)} activeOpacity={0.8}>
                  <View style={styles.jobCardLeft}>
                    <View style={styles.jobIcon}><Navigation size={20} color={colors.primary[600]} strokeWidth={2} /></View>
                    <View style={styles.jobInfo}>
                      <Text style={styles.jobService}>{lang === 'ml' ? job.subcategory?.name_ml : job.subcategory?.name_en}</Text>
                      <Text style={styles.jobAddress}>{job.address?.address_line}, {job.address?.area}</Text>
                      <View style={styles.jobStatusRow}>
                        <View style={[styles.jobStatusBadge, { backgroundColor: colors.primary[50] }]}>
                          <Text style={[styles.jobStatusText, { color: colors.primary[700] }]}>{job.status.replace(/_/g, ' ')}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                  <ChevronRight size={20} color={colors.neutral[300]} strokeWidth={2} />
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {tab === 'history' && (
          <View style={styles.jobsList}>
            {pastJobs.length === 0 ? (
              <View style={styles.emptyState}><Text style={styles.emptyTitle}>{t('noIncomingJobs')}</Text></View>
            ) : (
              pastJobs.map((job) => (
                <View key={job.id} style={styles.jobCard}>
                  <View style={styles.jobCardLeft}>
                    <View style={styles.jobIcon}><Briefcase size={20} color={colors.neutral[400]} strokeWidth={2} /></View>
                    <View style={styles.jobInfo}>
                      <Text style={styles.jobService}>{lang === 'ml' ? job.subcategory?.name_ml : job.subcategory?.name_en}</Text>
                      <Text style={styles.jobAddress}>{job.address?.address_line}, {job.address?.area}</Text>
                      <Text style={styles.jobTime}>{new Date(job.created_at).toLocaleDateString('en-IN')}</Text>
                    </View>
                  </View>
                  <View style={[styles.jobStatusBadge, { backgroundColor: job.status === 'completed' ? colors.success[50] : colors.neutral[100] }]}>
                    <Text style={[styles.jobStatusText, { color: job.status === 'completed' ? colors.success[700] : colors.neutral[500] }]}>{job.status}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        <View style={styles.switchSection}>
          <Button label={t('switchToCustomer')} onPress={() => router.replace('/(tabs)/index' as any)} variant="outline" style={styles.switchBtn} />
        </View>
      </ScrollView>

      <Modal visible={showJobModal} animationType="slide" transparent onRequestClose={() => setShowJobModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowJobModal(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            {selectedJob && (
              <>
                <View style={styles.modalHandle} />
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{t('jobRequest')}</Text>
                  <TouchableOpacity onPress={() => setShowJobModal(false)} style={styles.modalCloseBtn}>
                    <X size={20} color={colors.neutral[500]} strokeWidth={2} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.modalDesc}>{t('jobRequestDesc')}</Text>
                <View style={styles.modalJobInfo}>
                  <View style={styles.modalJobRow}>
                    <Briefcase size={18} color={colors.primary[600]} strokeWidth={2} />
                    <Text style={styles.modalJobText}>{lang === 'ml' ? selectedJob.subcategory?.name_ml : selectedJob.subcategory?.name_en}</Text>
                  </View>
                  <View style={styles.modalJobRow}>
                    <MapPin size={18} color={colors.primary[600]} strokeWidth={2} />
                    <Text style={styles.modalJobText} numberOfLines={2}>{selectedJob.address?.address_line}, {selectedJob.address?.area}</Text>
                  </View>
                  <View style={styles.modalJobRow}>
                    <Clock size={18} color={colors.primary[600]} strokeWidth={2} />
                    <Text style={styles.modalJobText}>{new Date(selectedJob.scheduled_at || selectedJob.created_at).toLocaleString('en-IN')}</Text>
                  </View>
                </View>
                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.modalRejectBtn} onPress={() => handleRejectJob(selectedJob.id)} disabled={actionLoading}>
                    <X size={20} color={colors.error[600]} strokeWidth={2.5} />
                    <Text style={styles.modalRejectText}>{t('rejectJob')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalAcceptBtn} onPress={() => handleAcceptJob(selectedJob.id)} disabled={actionLoading}>
                    <Check size={20} color={colors.neutral[0]} strokeWidth={3} />
                    <Text style={styles.modalAcceptText}>{t('acceptJob')}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
