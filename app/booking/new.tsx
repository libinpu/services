import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useLanguage } from '@/lib/language-context';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { colors, spacing, radius, typography, shadows } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';
import { Header, LoadingState, ErrorState, Button } from '@/components/ui';
import type { ServiceSubcategory, Address, Profile } from '@/lib/types';
import { Calendar, Clock, MapPin } from 'lucide-react-native';

export default function BookingConfirmationScreen() {
  const { subId, mode, providerId } = useLocalSearchParams<{ subId: string; mode: string; providerId?: string }>();
  const { t, lang } = useLanguage();
  const { session } = useAuth();
  const router = useRouter();
  const { isDark } = useTheme();

  const [subcategory, setSubcategory] = useState<ServiceSubcategory | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [provider, setProvider] = useState<Profile | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [scheduleMode, setScheduleMode] = useState<'now' | 'later'>('now');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState('10:00');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.neutral[50] },
    section: { paddingHorizontal: spacing.md, marginTop: spacing.lg },
    sectionTitle: {
      fontSize: typography.sizes.lg, fontWeight: '700', color: colors.neutral[900],
      marginBottom: spacing.sm, fontFamily: typography.fontFamilyBold,
    },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    changeText: {
      fontSize: typography.sizes.sm, color: colors.primary[600], fontWeight: '600',
      fontFamily: typography.fontFamilyMedium,
    },
    summaryCard: {
      backgroundColor: colors.neutral[100], borderRadius: radius.lg,
      padding: spacing.md,
    },
    serviceName: {
      fontSize: typography.sizes.xl, fontWeight: '700', color: colors.neutral[900],
      marginBottom: spacing.xs, fontFamily: typography.fontFamilyBold,
    },
    providerName: {
      fontSize: typography.sizes.sm, color: colors.neutral[500],
      marginBottom: spacing.sm, fontFamily: typography.fontFamilyRegular,
    },
    timeRow: { flexDirection: 'row', alignItems: 'center' },
    timeText: {
      fontSize: typography.sizes.sm, color: colors.neutral[600],
      marginLeft: 6, fontFamily: typography.fontFamilyMedium,
    },
    scheduleToggle: {
      flexDirection: 'row', backgroundColor: colors.neutral[100],
      borderRadius: radius.md, padding: 4,
    },
    scheduleTab: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center', borderRadius: radius.sm },
    scheduleTabActive: { backgroundColor: colors.neutral[200] },
    scheduleTabText: {
      fontSize: typography.sizes.sm, fontWeight: '600', color: colors.neutral[500],
      fontFamily: typography.fontFamilyMedium,
    },
    scheduleTabTextActive: { color: colors.primary[700] },
    dateTimePicker: { marginTop: spacing.md },
    dateRow: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: colors.neutral[100],
      borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md,
      marginBottom: spacing.sm,
    },
    dateText: {
      fontSize: typography.sizes.md, color: colors.neutral[700],
      marginLeft: spacing.sm, fontFamily: typography.fontFamilyMedium,
    },
    timeSlots: { flexDirection: 'row', flexWrap: 'wrap' },
    timeSlot: {
      paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
      backgroundColor: colors.neutral[100], borderRadius: radius.md,
      borderWidth: 1.5, borderColor: colors.neutral[200],
      marginRight: spacing.sm, marginBottom: spacing.sm,
    },
    timeSlotActive: { borderColor: colors.primary[600], backgroundColor: colors.primary[50] },
    timeSlotText: {
      fontSize: typography.sizes.sm, color: colors.neutral[600], fontFamily: typography.fontFamilyMedium,
    },
    timeSlotTextActive: { color: colors.primary[700], fontWeight: '700' },
    addressCard: {
      flexDirection: 'row', backgroundColor: colors.neutral[100], borderRadius: radius.lg,
      padding: spacing.md,
    },
    addressIcon: {
      width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.primary[50],
      alignItems: 'center', justifyContent: 'center', marginRight: spacing.md,
    },
    addressInfo: { flex: 1 },
    addressLabel: {
      fontSize: typography.sizes.sm, fontWeight: '700', color: colors.neutral[900],
      marginBottom: 2, fontFamily: typography.fontFamilyBold,
    },
    addressText: {
      fontSize: typography.sizes.sm, color: colors.neutral[500],
      lineHeight: 18, fontFamily: typography.fontFamilyRegular,
    },
    addAddressBtn: {
      backgroundColor: colors.neutral[100], borderRadius: radius.lg, padding: spacing.md,
      alignItems: 'center', borderWidth: 1.5, borderColor: colors.neutral[300], borderStyle: 'dashed',
    },
    addAddressText: {
      fontSize: typography.sizes.md, color: colors.primary[600], fontWeight: '600',
      fontFamily: typography.fontFamilyMedium,
    },
    errorText: {
      fontSize: typography.sizes.sm, color: colors.error[600], textAlign: 'center',
      paddingHorizontal: spacing.md, marginTop: spacing.md, fontFamily: typography.fontFamilyRegular,
    },
    bottomBar: {
      position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.neutral[100],
      paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
      borderTopWidth: 1, borderTopColor: colors.neutral[200],
    },
    confirmBtn: { width: '100%', borderRadius: radius.full },
  });

  const fetchData = useCallback(async () => {
    if (!subId) {
      setError(t('selectServiceFirst'));
      setLoading(false);
      return;
    }
    try {
      setError(null);

      // Run all independent fetches in parallel — 3 sequential awaits → 1 round-trip
      const [subRes, addrRes, provRes] = await Promise.all([
        supabase
          .from('service_subcategories')
          .select('*')
          .eq('id', subId)
          .maybeSingle(),

        session?.user?.id
          ? supabase
              .from('addresses')
              .select('*')
              .eq('user_id', session.user.id)
              .order('created_at', { ascending: false })
          : Promise.resolve({ data: null, error: null }),

        providerId
          ? supabase
              .from('profiles')
              .select('*')
              .eq('id', providerId)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (subRes.error) throw subRes.error;
      setSubcategory(subRes.data as ServiceSubcategory);

      if (addrRes.data && Array.isArray(addrRes.data) && addrRes.data.length > 0) {
        setAddresses(addrRes.data as Address[]);
        setSelectedAddress(addrRes.data[0] as Address);
      }

      if (!provRes.error && provRes.data && !Array.isArray(provRes.data)) {
        setProvider(provRes.data as Profile);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [subId, session?.user?.id, providerId, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  const handleConfirmBooking = async () => {
    if (!session?.user?.id || !subcategory || !selectedAddress) {
      setError(t('selectAddressFirst') || 'Please select an address before confirming.');
      setSubmitting(false);
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      let finalProviderId = providerId || null;
      let finalStatus = 'pending';
      let bestDistance: number | null = null;
      let etaMins: number | null = null;

      if (mode === 'auto') {
        // Only fetch online providers — limit to 50 to avoid full-table scans
        const { data: providers, error: provErr } = await supabase
          .from('profiles')
          .select(`id, full_name, provider_profile:provider_profiles!inner(is_online, rating_avg, jobs_completed, latitude, longitude)`)
          .eq('role', 'provider')
          .eq('provider_profile.is_online', true)
          .filter('provider_profile.category_ids', 'cs', `{${subcategory.category_id}}`)
          .limit(50);

        if (provErr) throw provErr;

        if (selectedAddress.latitude && selectedAddress.longitude && providers && providers.length > 0) {
          const withDistance = providers.map((p: any) => {
            const pp = p.provider_profile;
            if (pp?.latitude != null && pp?.longitude != null) {
              return { ...p, _dist: haversineKm(selectedAddress.latitude!, selectedAddress.longitude!, pp.latitude, pp.longitude) };
            }
            return { ...p, _dist: Infinity };
          });

          const nearby = withDistance.filter((p: any) => p._dist <= 10);

          if (nearby.length > 0) {
            nearby.sort((a: any, b: any) => a._dist - b._dist);
            finalProviderId = nearby[0].id;
            bestDistance = nearby[0]._dist;
            etaMins = Math.max(5, Math.round(((bestDistance || 0) / 25) * 60));
            finalStatus = 'accepted';
          } else {
            finalStatus = 'cancelled';
          }
        } else {
          finalStatus = 'cancelled';
        }
      }

      const otp = Math.floor(1000 + Math.random() * 9000).toString();
      const { hashOtp } = require('@/lib/hash');
      const hashedOtp = await hashOtp(otp);

      const scheduledAt = scheduleMode === 'now'
        ? new Date().toISOString()
        : new Date(selectedDate.toDateString() + ' ' + selectedTime).toISOString();

      const { data, error: insertError } = await supabase
        .from('bookings')
        .insert({
          customer_id: session.user.id,
          provider_id: finalProviderId,
          subcategory_id: subcategory.id,
          address_id: selectedAddress.id,
          zone_id: null,
          status: finalStatus,
          scheduled_at: scheduledAt,
          booking_mode: mode as 'auto' | 'manual',
          estimated_cost: 0,
          distance_km: bestDistance,
          estimated_eta_mins: etaMins,
          payment_method: 'cash',
          payment_status: 'pending',
          otp: hashedOtp,
          otp_verified: false,
        })
        .select('*')
        .maybeSingle();

      if (insertError) throw insertError;

      if (data) {
        router.replace(`/booking/${data.id}?plainOtp=${otp}`);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to create booking');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState label={t('loading')} />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title={t('bookingConfirmation')}
        onBack={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(tabs)');
          }
        }}
      />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Service Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('serviceSummary')}</Text>
          <View style={styles.summaryCard}>
            <Text style={styles.serviceName}>
              {lang === 'ml' ? subcategory?.name_ml : subcategory?.name_en}
            </Text>
            {provider && (
              <Text style={styles.providerName}>{t('provider')}: {provider.full_name}</Text>
            )}
            {mode === 'auto' && (
              <Text style={styles.providerName}>{t('autoAssign')}</Text>
            )}
            <View style={styles.timeRow}>
              <Clock size={16} color={colors.primary[600]} strokeWidth={2} />
              <Text style={styles.timeText}>
                {subcategory && subcategory.estimated_time_mins >= 60
                  ? `${Math.floor(subcategory.estimated_time_mins / 60)} ${t('hours')} ${subcategory.estimated_time_mins % 60} ${t('mins')}`
                  : `${subcategory?.estimated_time_mins ?? 0} ${t('mins')}`}
              </Text>
            </View>
          </View>
        </View>

        {/* Schedule */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('scheduleFor')}</Text>
          <View style={styles.scheduleToggle}>
            <TouchableOpacity
              style={[styles.scheduleTab, scheduleMode === 'now' && styles.scheduleTabActive]}
              onPress={() => setScheduleMode('now')}
            >
              <Text style={[styles.scheduleTabText, scheduleMode === 'now' && styles.scheduleTabTextActive]}>
                {t('now')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.scheduleTab, scheduleMode === 'later' && styles.scheduleTabActive]}
              onPress={() => setScheduleMode('later')}
            >
              <Text style={[styles.scheduleTabText, scheduleMode === 'later' && styles.scheduleTabTextActive]}>
                {t('scheduleLater')}
              </Text>
            </TouchableOpacity>
          </View>

          {scheduleMode === 'later' && (
            <View style={styles.dateTimePicker}>
              <View style={styles.dateRow}>
                <Calendar size={20} color={colors.primary[600]} strokeWidth={2} />
                <Text style={styles.dateText}>
                  {selectedDate.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                </Text>
              </View>
              <View style={styles.timeSlots}>
                {['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'].map((time) => (
                  <TouchableOpacity
                    key={time}
                    style={[styles.timeSlot, selectedTime === time && styles.timeSlotActive]}
                    onPress={() => setSelectedTime(time)}
                  >
                    <Text style={[styles.timeSlotText, selectedTime === time && styles.timeSlotTextActive]}>
                      {time}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Address */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('address')}</Text>
            <TouchableOpacity onPress={() => router.push('/location-setup')}>
              <Text style={styles.changeText}>{t('changeAddress')}</Text>
            </TouchableOpacity>
          </View>
          {selectedAddress ? (
            <View style={styles.addressCard}>
              <View style={styles.addressIcon}>
                <MapPin size={20} color={colors.primary[600]} strokeWidth={2} />
              </View>
              <View style={styles.addressInfo}>
                <Text style={styles.addressLabel}>{selectedAddress.label}</Text>
                <Text style={styles.addressText} numberOfLines={2}>
                  {selectedAddress.address_line}, {selectedAddress.area}, {selectedAddress.district}
                </Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.addAddressBtn} onPress={() => router.push('/location-setup')}>
              <Text style={styles.addAddressText}>+ Add address</Text>
            </TouchableOpacity>
          )}
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}
      </ScrollView>

      <View style={styles.bottomBar}>
        <Button
          label={t('confirmBooking')}
          onPress={handleConfirmBooking}
          loading={submitting}
          style={styles.confirmBtn}
        />
      </View>
    </SafeAreaView>
  );
}
