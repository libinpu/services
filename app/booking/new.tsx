import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useLanguage } from '@/lib/language-context';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { colors, spacing, radius, typography, shadows } from '@/lib/theme';
import { Header, LoadingState, ErrorState, Button } from '@/components/ui';
import type { ServiceSubcategory, Address, Profile } from '@/lib/types';
import { Calendar, Clock, MapPin } from 'lucide-react-native';

export default function BookingConfirmationScreen() {
  const { subId, mode, providerId } = useLocalSearchParams<{ subId: string; mode: string; providerId?: string }>();
  const { t, lang } = useLanguage();
  const { session } = useAuth();
  const router = useRouter();

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

  const fetchData = useCallback(async () => {
    if (!subId) {
      setError(t('selectServiceFirst'));
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const subRes = await supabase
        .from('service_subcategories')
        .select('*')
        .eq('id', subId)
        .maybeSingle();
      if (subRes.error) throw subRes.error;
      setSubcategory(subRes.data as ServiceSubcategory);

      if (session?.user?.id) {
        const addrRes = await supabase
          .from('addresses')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });
        if (addrRes.data && addrRes.data.length > 0) {
          setAddresses(addrRes.data as Address[]);
          setSelectedAddress(addrRes.data[0] as Address);
        }
      }

      if (providerId) {
        const provRes = await supabase
          .from('profiles')
          .select('*')
          .eq('id', providerId)
          .maybeSingle();
        if (!provRes.error && provRes.data) {
          setProvider(provRes.data as Profile);
        }
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

  const handleConfirmBooking = async () => {
    if (!session?.user?.id || !subcategory || !selectedAddress) return;
    setSubmitting(true);
    setError(null);

    try {
      const otp = Math.floor(1000 + Math.random() * 9000).toString();

      const scheduledAt = scheduleMode === 'now'
        ? new Date().toISOString()
        : new Date(selectedDate.toDateString() + ' ' + selectedTime).toISOString();

      const { data, error: insertError } = await supabase
        .from('bookings')
        .insert({
          customer_id: session.user.id,
          provider_id: providerId || null,
          subcategory_id: subcategory.id,
          address_id: selectedAddress.id,
          zone_id: null,
          status: 'pending',
          scheduled_at: scheduledAt,
          booking_mode: mode as 'auto' | 'manual',
          estimated_cost: 0,
          payment_method: 'cash',
          payment_status: 'pending',
          otp,
          otp_verified: false,
        })
        .select('*')
        .maybeSingle();

      if (insertError) throw insertError;

      if (data) {
        if (mode === 'auto') {
          try {
            const fnRes = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/auto-assign-provider`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
              },
              body: JSON.stringify({ bookingId: data.id }),
            });
            if (!fnRes.ok) {
              console.warn('Auto-assign function returned non-OK status');
            }
          } catch (fnErr) {
            console.warn('Auto-assign function call failed:', fnErr);
          }
        }
        router.replace(`/booking/${data.id}`);
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
      <Header title={t('bookingConfirmation')} onBack={() => router.back()} />
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
