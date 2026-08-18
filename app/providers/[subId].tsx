import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useLanguage } from '@/lib/language-context';
import { useTheme } from '@/lib/theme-context';
import { supabase } from '@/lib/supabase';
import { colors, spacing, radius, typography, shadows } from '@/lib/theme';
import { Header, LoadingState, ErrorState, Button } from '@/components/ui';
import type { ServiceSubcategory } from '@/lib/types';
import { Star, ShieldCheck, MapPin, Zap, ChevronRight, User } from 'lucide-react-native';
import { cache } from '@/lib/cache';
import { SkeletonList } from '@/components/ui';
import { formatDistance } from '@/lib/distance';
import { fetchCurrentLocation } from '@/lib/location-service';

const NEARBY_RADIUS_KM = 10;

type NearbyProvider = {
  provider_id: string;
  display_name: string | null;
  avatar_url: string | null;
  rating_avg: number;
  rating_count: number;
  jobs_completed: number;
  experience_years: number;
  is_verified: boolean;
  distance_km: number;
};

export default function ProvidersScreen() {
  const { subId } = useLocalSearchParams<{ subId: string }>();
  const { t, lang } = useLanguage();
  const router = useRouter();
  const { isDark } = useTheme();

  const [subcategory, setSubcategory] = useState<ServiceSubcategory | null>(null);
  const [providers, setProviders] = useState<NearbyProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');
  const [customerCoords, setCustomerCoords] = useState<{ lat: number; lng: number } | null>(null);

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.neutral[50] },
    modeContainer: { flexDirection: 'row', paddingHorizontal: spacing.md, paddingVertical: spacing.md, gap: spacing.sm },
    modeCard: {
      flex: 1, backgroundColor: colors.neutral[100], borderRadius: radius.lg,
      padding: spacing.md, borderWidth: 2, borderColor: 'transparent',
    },
    modeCardActive: { borderColor: colors.primary[600], backgroundColor: colors.primary[50] },
    modeIcon: {
      width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.primary[50],
      alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm,
    },
    modeIconActive: { backgroundColor: colors.primary[600] },
    modeTitle: {
      fontSize: typography.sizes.md, fontWeight: '700', color: colors.neutral[700],
      marginBottom: spacing.xs, fontFamily: typography.fontFamilyBold,
    },
    modeTitleActive: { color: colors.primary[700] },
    modeDesc: {
      fontSize: typography.sizes.xs, color: colors.neutral[500],
      lineHeight: 16, fontFamily: typography.fontFamilyRegular,
    },
    modeDescActive: { color: colors.primary[600] },
    autoContent: { paddingHorizontal: spacing.md },
    autoInfoCard: {
      backgroundColor: colors.neutral[100], borderRadius: radius.lg,
      padding: spacing.xl, alignItems: 'center',
    },
    autoInfoIcon: {
      width: 64, height: 64, borderRadius: radius.xl, backgroundColor: colors.primary[50],
      alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md,
    },
    autoInfoTitle: {
      fontSize: typography.sizes.xl, fontWeight: '700', color: colors.neutral[900],
      marginBottom: spacing.xs, fontFamily: typography.fontFamilyBold,
    },
    autoInfoDesc: {
      fontSize: typography.sizes.sm, color: colors.neutral[500],
      textAlign: 'center', marginBottom: spacing.md, fontFamily: typography.fontFamilyRegular,
    },
    autoBtn: { width: '100%', marginTop: spacing.lg, borderRadius: radius.full },
    providersList: { paddingHorizontal: spacing.md },
    noProviders: { padding: spacing.xl, alignItems: 'center' },
    noProvidersText: {
      fontSize: typography.sizes.md, color: colors.neutral[500],
      textAlign: 'center', fontFamily: typography.fontFamilyRegular,
    },
    providerCard: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: colors.neutral[100],
      borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm,
    },
    providerAvatar: {
      width: 56, height: 56, borderRadius: radius.full, backgroundColor: colors.neutral[200],
      alignItems: 'center', justifyContent: 'center', marginRight: spacing.md,
    },
    providerAvatarPlaceholder: { width: 56, height: 56, borderRadius: radius.full, backgroundColor: colors.neutral[200] },
    providerInfo: { flex: 1 },
    providerNameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
    providerName: {
      fontSize: typography.sizes.md, fontWeight: '700', color: colors.neutral[900],
      marginRight: spacing.sm, fontFamily: typography.fontFamilyBold,
    },
    verifiedBadge: {
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xs, paddingVertical: 2,
      backgroundColor: colors.success[50], borderRadius: radius.full,
    },
    verifiedText: {
      fontSize: typography.sizes.xs, color: colors.success[700], fontWeight: '600',
      marginLeft: 2, fontFamily: typography.fontFamilyMedium,
    },
    providerMeta: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
    ratingRow: { flexDirection: 'row', alignItems: 'center', marginRight: spacing.md },
    ratingText: {
      fontSize: typography.sizes.sm, fontWeight: '600', color: colors.neutral[700],
      marginLeft: 2, fontFamily: typography.fontFamilyMedium,
    },
    jobsText: {
      fontSize: typography.sizes.xs, color: colors.neutral[400],
      marginLeft: 4, fontFamily: typography.fontFamilyRegular,
    },
    expText: {
      fontSize: typography.sizes.sm, color: colors.neutral[500],
      fontFamily: typography.fontFamilyRegular,
    },
    distanceRow: { flexDirection: 'row', alignItems: 'center' },
    distanceTag: { flexDirection: 'row', alignItems: 'center' },
    distanceText: {
      fontSize: typography.sizes.xs, color: colors.neutral[500],
      marginLeft: 2, fontFamily: typography.fontFamilyRegular,
    },
  });

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      setLocationError(null);

      // 1. Get customer location first — needed to filter by distance
      let coords = customerCoords;
      if (!coords) {
        const locRes = await fetchCurrentLocation();
        if (locRes.success && locRes.latitude != null && locRes.longitude != null) {
          coords = { lat: locRes.latitude, lng: locRes.longitude };
          setCustomerCoords(coords);
        } else {
          setLocationError('Location is required to show nearby professionals.');
        }
      }

      // 2. Subcategory: cache for 10 minutes
      const cacheSubKey = `subcategory_${subId}`;
      let subData = cache.get<ServiceSubcategory>(cacheSubKey);
      if (!subData) {
        const subRes = await supabase
          .from('service_subcategories')
          .select('id, category_id, name_en, name_ml, base_price, estimated_time_mins, is_active')
          .eq('id', subId)
          .maybeSingle();
        if (subRes.error) throw subRes.error;
        subData = subRes.data as ServiceSubcategory;
        cache.set(cacheSubKey, subData, 10 * 60 * 1000);
      }
      setSubcategory(subData);

      // 3. Database-only geographic search. It returns public fields for at
      // most 20 eligible providers within the fixed 10 km radius.
      const catId = subData?.category_id;
      if (catId && coords) {
        const { data: nearby, error: nearbyError } = await supabase.rpc('find_nearby_providers', {
          p_subcategory_id: subId,
          p_customer_latitude: coords.lat,
          p_customer_longitude: coords.lng,
          p_limit: 20,
        });
        if (nearbyError) throw nearbyError;
        setProviders((nearby || []) as NearbyProvider[]);
      } else {
        setProviders([]);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [subId, customerCoords]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAutoAssign = () => {
    if (subcategory) {
      router.push(`/booking/new?subId=${subcategory.id}&mode=auto`);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header
          title={t('chooseProvider')}
          onBack={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)');
            }
          }}
        />
        <SkeletonList rows={4} />
      </SafeAreaView>
    );
  }
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title={t('chooseProvider')}
        onBack={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(tabs)');
          }
        }}
      />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        {/* Location warning banner */}
        {locationError && (
          <View style={{ marginHorizontal: spacing.md, marginTop: spacing.sm,
            backgroundColor: colors.warning[50], borderRadius: radius.md,
            padding: spacing.sm, borderWidth: 1, borderColor: colors.warning[200],
            flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <MapPin size={14} color={colors.warning[700]} strokeWidth={2} />
            <Text style={{ fontSize: typography.sizes.xs, color: colors.warning[700],
              flex: 1, fontFamily: typography.fontFamilyRegular }}>
              {locationError}
            </Text>
          </View>
        )}

        {/* Mode toggle */}
        <View style={styles.modeContainer}>
          <TouchableOpacity
            style={[styles.modeCard, mode === 'auto' && styles.modeCardActive]}
            onPress={() => setMode('auto')}
            activeOpacity={0.8}
          >
            <View style={[styles.modeIcon, mode === 'auto' && styles.modeIconActive]}>
              <Zap size={24} color={mode === 'auto' ? colors.neutral[0] : colors.primary[600]} strokeWidth={2} />
            </View>
            <Text style={[styles.modeTitle, mode === 'auto' && styles.modeTitleActive]}>
              {t('autoAssign')}
            </Text>
            <Text style={[styles.modeDesc, mode === 'auto' && styles.modeDescActive]}>
              {t('autoAssignDesc')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeCard, mode === 'manual' && styles.modeCardActive]}
            onPress={() => setMode('manual')}
            activeOpacity={0.8}
          >
            <View style={[styles.modeIcon, mode === 'manual' && styles.modeIconActive]}>
              <User size={24} color={mode === 'manual' ? colors.neutral[0] : colors.primary[600]} strokeWidth={2} />
            </View>
            <Text style={[styles.modeTitle, mode === 'manual' && styles.modeTitleActive]}>
              {t('browseProviders')}
            </Text>
            <Text style={[styles.modeDesc, mode === 'manual' && styles.modeDescActive]}>
              {t('browseProvidersDesc')}
            </Text>
          </TouchableOpacity>
        </View>

        {mode === 'auto' ? (
          <View style={styles.autoContent}>
            <View style={styles.autoInfoCard}>
              <View style={styles.autoInfoIcon}>
                <Zap size={32} color={colors.primary[600]} strokeWidth={2} />
              </View>
              <Text style={styles.autoInfoTitle}>{t('autoAssign')}</Text>
              <Text style={styles.autoInfoDesc}>{t('autoAssignDesc')}</Text>
            </View>
            <Button label={t('confirmBooking')} onPress={handleAutoAssign} style={styles.autoBtn} />
          </View>
        ) : (
          <View style={styles.providersList}>
            {providers.length === 0 ? (
              <View style={styles.noProviders}>
                <MapPin size={40} color={colors.neutral[300]} strokeWidth={1.5} />
                <Text style={[styles.noProvidersText, { marginTop: spacing.md, fontWeight: '700',
                  color: colors.neutral[700], fontSize: typography.sizes.md }]}>
                  No providers nearby
                </Text>
                <Text style={[styles.noProvidersText, { marginTop: spacing.xs }]}>
                  {customerCoords
                    ? `No online providers found within ${NEARBY_RADIUS_KM} km of your location.`
                    : 'No online providers available in this category right now.'}
                </Text>
              </View>
            ) : (
              providers.map((provider) => {
                return (
                  <TouchableOpacity
                    key={provider.provider_id}
                    style={styles.providerCard}
                    onPress={() => router.push(`/provider/${provider.provider_id}?subId=${subcategory?.id}`)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.providerAvatar}>
                      {provider.avatar_url ? (
                        <View style={styles.providerAvatarPlaceholder} />
                      ) : (
                        <User size={28} color={colors.neutral[400]} strokeWidth={2} />
                      )}
                      {/* Online indicator dot */}
                      <View style={{ position: 'absolute', bottom: 2, right: 2,
                        width: 12, height: 12, borderRadius: 6,
                        backgroundColor: colors.success[500],
                        borderWidth: 2, borderColor: colors.neutral[100] }} />
                    </View>
                    <View style={styles.providerInfo}>
                      <View style={styles.providerNameRow}>
                        <Text style={styles.providerName}>{provider.display_name || 'Provider'}</Text>
                        {provider.is_verified && (
                          <View style={styles.verifiedBadge}>
                            <ShieldCheck size={14} color={colors.success[600]} strokeWidth={2} />
                            <Text style={styles.verifiedText}>{t('verified')}</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.providerMeta}>
                        <View style={styles.ratingRow}>
                          <Star size={14} color={colors.warning[500]} fill={colors.warning[500]} strokeWidth={0} />
                          <Text style={styles.ratingText}>{Number(provider.rating_avg).toFixed(1)}</Text>
                          <Text style={styles.jobsText}>({provider.jobs_completed} {t('jobsCompleted')})</Text>
                        </View>
                        <Text style={styles.expText}>{provider.experience_years} {t('yearsExp')}</Text>
                      </View>
                      <View style={styles.distanceRow}>
                        <View style={styles.distanceTag}>
                          <MapPin size={12} color={colors.neutral[400]} strokeWidth={2} />
                          <Text style={styles.distanceText}>
                            {`${formatDistance(Number(provider.distance_km))} away`}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <ChevronRight size={20} color={colors.neutral[300]} strokeWidth={2} />
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
