import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '@/lib/language-context';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { colors, spacing, radius, typography, shadows } from '@/lib/theme';
import { Header, Button, ErrorState } from '@/components/ui';
import { ServiceIcon3D } from '@/components/ServiceIcon3D';
import type { ServiceCategory, ServiceSubcategory, Address } from '@/lib/types';
import { fetchCurrentLocation } from '@/lib/location-service';
import { Siren, Zap, Clock } from 'lucide-react-native';

/** Flat surcharge shown upfront for a priority, slot-free dispatch. */
const PRIORITY_FEE = 149;

export default function EmergencyScreen() {
  const { t, lang } = useLanguage();
  const { session } = useAuth();
  const router = useRouter();

  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [selected, setSelected] = useState<ServiceCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const styles = makeStyles();

  const fetchCategories = useCallback(async () => {
    try {
      setError(null);
      const { data, error: catError } = await supabase
        .from('service_categories')
        .select('*')
        .eq('is_active', true)
        .order('name_en');
      if (catError) throw catError;
      setCategories((data || []) as ServiceCategory[]);
    } catch (e: any) {
      setError(e.message || 'Failed to load services');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const handleDispatch = async () => {
    if (!session?.user?.id || !selected) return;
    setSubmitting(true);
    setError(null);
    try {
      // Cheapest active subcategory of the chosen category acts as the
      // emergency call-out; the final price is settled after diagnosis.
      const { data: subs, error: subError } = await supabase
        .from('service_subcategories')
        .select('*')
        .eq('category_id', selected.id)
        .eq('is_active', true)
        .order('base_price')
        .limit(1);
      if (subError) throw subError;
      const sub = (subs || [])[0] as ServiceSubcategory | undefined;
      if (!sub) throw new Error('This service is not available right now.');

      const location = await fetchCurrentLocation();
      if (!location.success || location.latitude == null || location.longitude == null) {
        throw new Error(location.errorMessage || 'Location is required for an emergency booking.');
      }

      let addressId: string | null = null;
      const savedId = await AsyncStorage.getItem(`selected_address_${session.user.id}`);
      if (savedId) {
        const { data: addr } = await supabase
          .from('addresses')
          .select('id')
          .eq('id', savedId)
          .maybeSingle();
        addressId = (addr as Pick<Address, 'id'> | null)?.id ?? null;
      }

      const { data, error: insertError } = await supabase
        .from('bookings')
        .insert({
          customer_id: session.user.id,
          provider_id: null,
          subcategory_id: sub.id,
          address_id: addressId,
          status: 'pending',
          scheduled_at: new Date().toISOString(),
          booking_mode: 'auto',
          estimated_cost: Number(sub.base_price) + PRIORITY_FEE,
          payment_method: 'cash',
          payment_status: 'pending',
          otp_verified: false,
          is_emergency: true,
          priority_fee: PRIORITY_FEE,
          customer_latitude: location.latitude,
          customer_longitude: location.longitude,
          customer_location_accuracy: location.accuracy,
          customer_location_at: new Date().toISOString(),
        })
        .select('id')
        .maybeSingle();
      if (insertError) throw insertError;
      if (data) router.replace(`/booking/${data.id}`);
    } catch (e: any) {
      setError(e.message || 'Could not start the emergency booking');
    } finally {
      setSubmitting(false);
    }
  };

  if (error && categories.length === 0) {
    return <ErrorState message={error} onRetry={fetchCategories} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title={t('emergencyBooking')}
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
      />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
        <View style={styles.banner}>
          <View style={styles.bannerIcon}>
            <Siren size={26} color="#FFFFFF" strokeWidth={2.4} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>{t('emergencyBooking')}</Text>
            <Text style={styles.bannerDesc}>{t('emergencyBookingDesc')}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoPill}>
            <Zap size={14} color={colors.error[600]} strokeWidth={2.4} />
            <Text style={styles.infoPillText}>{t('emergencyPriority')}: ₹{PRIORITY_FEE}</Text>
          </View>
          <View style={styles.infoPill}>
            <Clock size={14} color={colors.error[600]} strokeWidth={2.4} />
            <Text style={styles.infoPillText}>No slot selection</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>{t('exploreServices')}</Text>
        {loading ? (
          <ActivityIndicator color={colors.primary[600]} style={{ marginTop: spacing.xl }} />
        ) : (
          <View style={styles.grid}>
            {categories.map((cat) => {
              const active = selected?.id === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => setSelected(cat)}
                  style={[styles.optionCard, active && styles.optionCardActive]}
                >
                  <ServiceIcon3D name={cat.icon_name} size={46} tone={active ? 'coral' : undefined} />
                  <Text style={[styles.optionLabel, active && { color: colors.error[600] }]} numberOfLines={2}>
                    {lang === 'ml' ? cat.name_ml : cat.name_en}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>

      <View style={styles.bottomBar}>
        <Button
          label={submitting ? t('emergencyMatching') : t('emergencyFindPro')}
          onPress={handleDispatch}
          loading={submitting}
          disabled={!selected}
          style={{ width: '100%' }}
        />
      </View>
    </SafeAreaView>
  );
}

function makeStyles() {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.neutral[50] },
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      margin: spacing.lg,
      backgroundColor: colors.error[500],
      borderRadius: radius.xl,
      padding: spacing.lg,
      ...shadows.lg,
    },
    bannerIcon: {
      width: 52, height: 52, borderRadius: radius.full,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center', justifyContent: 'center',
    },
    bannerTitle: {
      fontSize: typography.sizes.lg,
      fontWeight: '800',
      color: '#FFFFFF',
      fontFamily: typography.fontFamilyDisplay,
    },
    bannerDesc: {
      fontSize: typography.sizes.xs,
      color: 'rgba(255,255,255,0.85)',
      marginTop: 3,
      fontFamily: typography.fontFamilyRegular,
    },
    infoRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg },
    infoPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.error[50],
      borderRadius: radius.full,
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
    },
    infoPillText: {
      fontSize: typography.sizes.xs,
      fontWeight: '700',
      color: colors.error[600],
      fontFamily: typography.fontFamilyBold,
    },
    sectionTitle: {
      fontSize: typography.sizes.xl,
      fontWeight: '800',
      color: colors.neutral[900],
      fontFamily: typography.fontFamilyDisplay,
      paddingHorizontal: spacing.lg,
      marginTop: spacing.xl,
      marginBottom: spacing.md,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
    },
    optionCard: {
      width: '31%',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.neutral[100],
      borderRadius: radius.lg,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xs,
      borderWidth: 2,
      borderColor: 'transparent',
      ...shadows.sm,
    },
    optionCardActive: {
      borderColor: colors.error[500],
      backgroundColor: colors.error[50],
    },
    optionLabel: {
      fontSize: 11,
      lineHeight: 14,
      fontWeight: '700',
      textAlign: 'center',
      color: colors.neutral[900],
      fontFamily: typography.fontFamilyBold,
    },
    errorText: {
      fontSize: typography.sizes.sm,
      color: colors.error[600],
      textAlign: 'center',
      marginTop: spacing.lg,
      paddingHorizontal: spacing.lg,
      fontFamily: typography.fontFamilyRegular,
    },
    bottomBar: {
      position: 'absolute',
      left: 0, right: 0, bottom: 0,
      backgroundColor: colors.neutral[50],
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.xl,
    },
  });
}
