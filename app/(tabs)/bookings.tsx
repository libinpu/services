import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useLanguage } from '@/lib/language-context';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { colors, spacing, radius, typography, shadows } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';
import { LoadingState, ErrorState, EmptyState, SkeletonList } from '@/components/ui';
import type { BookingWithDetails } from '@/lib/types';
import { Calendar, Clock, IndianRupee, ChevronRight, RotateCw, Download } from 'lucide-react-native';

type TabKey = 'upcoming' | 'ongoing' | 'completed' | 'cancelled';

const STATUS_MAP: Record<TabKey, string[]> = {
  upcoming: ['pending', 'accepted'],
  ongoing: ['on_the_way', 'arrived', 'in_progress', 'awaiting_confirmation'],
  completed: ['completed'],
  cancelled: ['cancelled', 'rejected'],
};


export default function BookingsScreen() {
  const { t, lang } = useLanguage();
  const { session } = useAuth();
  const router = useRouter();
  const { isDark } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.neutral[50],
    },
    // Rounded header style
    header: {
      backgroundColor: colors.primary[600],
      borderBottomLeftRadius: 36,
      borderBottomRightRadius: 36,
      paddingHorizontal: spacing.lg,
      paddingTop: Platform.OS === 'ios' ? 50 : spacing.lg,
      paddingBottom: 40,
      ...shadows.lg,
      position: 'relative',
      overflow: 'hidden',
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
    headerTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.neutral[100],
      fontFamily: typography.fontFamilyBold,
      textAlign: 'center',
    },
    // Pill shaped tabs section
    tabBar: {
      paddingHorizontal: spacing.lg,
      marginTop: -24, // Overlapping card style
      marginBottom: spacing.md,
      zIndex: 10,
    },
    tabBarScroll: {
      backgroundColor: colors.neutral[100],
      borderRadius: radius.full,
      padding: 4,
      borderWidth: 1,
      borderColor: colors.neutral[200],
      ...shadows.md,
    },
    tab: {
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
      marginRight: spacing.xs,
      borderRadius: radius.full,
    },
    tabActive: {
      backgroundColor: colors.accent[500], // Coral Orange for active state
      ...shadows.sm,
    },
    tabText: {
      fontSize: typography.sizes.xs,
      fontWeight: '600',
      color: colors.neutral[500],
      fontFamily: typography.fontFamilyMedium,
    },
    tabTextActive: {
      color: colors.neutral[100],
    },
    // Rounded Card Style
    bookingCard: {
      backgroundColor: colors.neutral[100],
      borderRadius: radius.xl, // rounded corners 22-28px
      padding: spacing.lg,
      marginHorizontal: spacing.lg,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.neutral[200],
      ...shadows.md,
      position: 'relative',
    },
    bookingHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    bookingService: {
      fontSize: typography.sizes.md,
      fontWeight: '700',
      color: colors.neutral[900],
      flex: 1,
      fontFamily: typography.fontFamilyBold,
    },
    statusBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: radius.full,
    },
    statusBadgeActive: {
      backgroundColor: colors.accent[500],
    },
    statusTextActive: {
      color: colors.neutral[100],
    },
    statusText: {
      fontSize: 10,
      fontWeight: '700',
      fontFamily: typography.fontFamilyBold,
      textTransform: 'uppercase',
    },
    bookingProvider: {
      fontSize: typography.sizes.sm,
      color: colors.neutral[500],
      marginBottom: spacing.md,
      fontFamily: typography.fontFamilyRegular,
    },
    bookingMeta: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    metaText: {
      fontSize: typography.sizes.xs,
      color: colors.neutral[500],
      fontFamily: typography.fontFamilyRegular,
    },
    metaPrice: {
      fontSize: typography.sizes.xs,
      color: colors.accent[500],
      fontWeight: '700',
      fontFamily: typography.fontFamilyBold,
    },
    bookingActions: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.md,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.neutral[200],
    },
    actionChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
      backgroundColor: colors.neutral[50],
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: colors.neutral[200],
      gap: 4,
    },
    actionChipText: {
      fontSize: 11,
      color: colors.neutral[900],
      fontWeight: '700',
      fontFamily: typography.fontFamilyMedium,
    },
    chevronRow: {
      position: 'absolute',
      right: spacing.lg,
      top: '50%',
      transform: [{ translateY: -9 }],
    },
  });

  const params = useLocalSearchParams<{ tab?: string }>();
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>((params.tab as TabKey) || 'upcoming');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (params.tab && ['upcoming', 'ongoing', 'completed', 'cancelled'].includes(params.tab)) {
      setActiveTab(params.tab as TabKey);
    }
  }, [params.tab]);

  // Fetch only the statuses for the current tab — server-side filter + limit
  // Re-runs whenever activeTab changes so switching tabs loads the right data
  const fetchBookings = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      setError(null);
      const { data, error: fetchErr } = await supabase
        .from('bookings')
        .select(`
          *,
          subcategory:service_subcategories(id, name_en, name_ml, base_price, estimated_time_mins),
          provider:profiles!bookings_provider_id_fkey(id, full_name, avatar_url)
        `)
        .eq('customer_id', session.user.id)
        .in('status', STATUS_MAP[activeTab])
        .order('created_at', { ascending: false })
        .limit(30);

      if (fetchErr) throw fetchErr;
      setBookings((data || []) as BookingWithDetails[]);
    } catch (e: any) {
      setError(e.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session?.user?.id, activeTab]);

  // Refetch whenever the tab changes
  useEffect(() => {
    setLoading(true);
    fetchBookings();
  }, [fetchBookings]);

  // Also refresh when user navigates back to this screen
  useFocusEffect(
    useCallback(() => {
      fetchBookings();
    }, [fetchBookings])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  // No client-side filter needed — data is already filtered by the DB
  const filteredBookings = bookings;

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'upcoming', label: t('upcoming') },
    { key: 'ongoing', label: t('ongoing') },
    { key: 'completed', label: t('completed') },
    { key: 'cancelled', label: t('cancelled') },
  ];



  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
        <View style={styles.header}>
          <View style={styles.topCircle1} />
          <View style={styles.topCircle2} />
          <Text style={styles.headerTitle}>{t('myBookings')}</Text>
        </View>
        <SkeletonList rows={4} />
      </SafeAreaView>
    );
  }
  if (error) return <ErrorState message={error} onRetry={fetchBookings} />;

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <View style={styles.header}>
        <View style={styles.topCircle1} />
        <View style={styles.topCircle2} />
        <Text style={styles.headerTitle}>{t('myBookings')}</Text>
      </View>

      {/* Pill tabs list */}
      <View style={styles.tabBar}>
        <View style={styles.tabBarScroll}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent[500]} />}
      >
        {filteredBookings.length === 0 ? (
          <EmptyState title={t('noBookings')} description={t('noBookingsDesc')} />
        ) : (
          filteredBookings.map((booking) => {
            const sub = booking.subcategory;
            const provider = booking.provider;
            return (
              <TouchableOpacity
                key={booking.id}
                style={styles.bookingCard}
                onPress={() => router.push(`/booking/${booking.id}`)}
                activeOpacity={0.8}
              >
                <View style={styles.bookingHeader}>
                  <Text style={styles.bookingService}>
                    {lang === 'ml' ? sub?.name_ml : sub?.name_en}
                  </Text>
                  <View style={[styles.statusBadge, isActiveStatus(booking.status) && styles.statusBadgeActive, !isActiveStatus(booking.status) && { backgroundColor: getStatusColor(booking.status) + '15' }]}>
                    <Text style={[styles.statusText, isActiveStatus(booking.status) && styles.statusTextActive, { color: isActiveStatus(booking.status) ? colors.neutral[100] : getStatusColor(booking.status) }]}>
                      {t(booking.status as any) || booking.status}
                    </Text>
                  </View>
                </View>

                {provider && (
                  <Text style={styles.bookingProvider}>
                    {t('provider')}: {provider.full_name}
                  </Text>
                )}

                <View style={styles.bookingMeta}>
                  <View style={styles.metaItem}>
                    <Calendar size={14} color={colors.neutral[500]} strokeWidth={2} />
                    <Text style={styles.metaText}>
                      {booking.scheduled_at
                        ? new Date(booking.scheduled_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                        : '-'}
                    </Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Clock size={14} color={colors.neutral[500]} strokeWidth={2} />
                    <Text style={styles.metaText}>
                      {booking.scheduled_at
                        ? new Date(booking.scheduled_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                        : '-'}
                    </Text>
                  </View>
                  <View style={styles.metaItem}>
                    <IndianRupee size={14} color={colors.accent[500]} strokeWidth={2.5} />
                    <Text style={styles.metaPrice}>
                      {booking.final_cost || booking.estimated_cost}
                    </Text>
                  </View>
                </View>

                {booking.status === 'completed' && (
                  <View style={styles.bookingActions}>
                    <TouchableOpacity style={styles.actionChip} onPress={() => router.push(`/booking/new?subId=${sub?.id}&mode=manual&providerId=${provider?.id}`)}>
                      <RotateCw size={14} color={colors.accent[500]} strokeWidth={2} />
                      <Text style={styles.actionChipText}>{t('rebook')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionChip}>
                      <Download size={14} color={colors.neutral[500]} strokeWidth={2} />
                      <Text style={styles.actionChipText}>{t('downloadInvoice')}</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.chevronRow}>
                  <ChevronRight size={18} color={colors.neutral[500]} strokeWidth={2} />
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function isActiveStatus(status: string): boolean {
  return ['pending', 'accepted', 'on_the_way', 'arrived', 'in_progress', 'awaiting_confirmation'].includes(status);
}

function getStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    pending: colors.accent[500],
    accepted: colors.accent[500],
    on_the_way: colors.accent[500],
    arrived: colors.accent[500],
    in_progress: colors.accent[500],
    awaiting_confirmation: colors.accent[500],
    completed: '#4CAF50',
    cancelled: '#F44336',
    rejected: '#F44336',
  };
  return colorMap[status] || colors.neutral[500];
}
