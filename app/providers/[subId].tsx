import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useLanguage } from '@/lib/language-context';
import { supabase } from '@/lib/supabase';
import { colors, spacing, radius, typography, shadows } from '@/lib/theme';
import { Header, LoadingState, ErrorState, Button } from '@/components/ui';
import type { ServiceSubcategory, ProviderWithProfile } from '@/lib/types';
import { Star, ShieldCheck, MapPin, Zap, ChevronRight, User } from 'lucide-react-native';

export default function ProvidersScreen() {
  const { subId } = useLocalSearchParams<{ subId: string }>();
  const { t, lang } = useLanguage();
  const router = useRouter();

  const [subcategory, setSubcategory] = useState<ServiceSubcategory | null>(null);
  const [providers, setProviders] = useState<ProviderWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const subRes = await supabase
        .from('service_subcategories')
        .select('*')
        .eq('id', subId)
        .maybeSingle();
      if (subRes.error) throw subRes.error;
      setSubcategory(subRes.data as ServiceSubcategory);

      const catId = subRes.data?.category_id;
      if (catId) {
        const provRes = await supabase
          .from('profiles')
          .select('*, provider_profile:provider_profiles(*)')
          .eq('role', 'provider')
          .filter('provider_profile.category_ids', 'cs', `{${catId}}`)
          .order('created_at', { ascending: false })
          .limit(10);

        if (provRes.error) throw provRes.error;
        setProviders((provRes.data || []) as ProviderWithProfile[]);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [subId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAutoAssign = () => {
    if (subcategory) {
      router.push(`/booking/new?subId=${subcategory.id}&mode=auto`);
    }
  };

  if (loading) return <LoadingState label={t('loading')} />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <SafeAreaView style={styles.container}>
      <Header title={t('chooseProvider')} onBack={() => router.back()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
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
                <Text style={styles.noProvidersText}>No providers available yet in this category.</Text>
              </View>
            ) : (
              providers.map((provider) => {
                const pp = provider.provider_profile;
                if (!pp) return null;
                return (
                  <TouchableOpacity
                    key={provider.id}
                    style={styles.providerCard}
                    onPress={() => router.push(`/provider/${provider.id}?subId=${subcategory?.id}`)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.providerAvatar}>
                      {provider.avatar_url ? (
                        <View style={styles.providerAvatarPlaceholder} />
                      ) : (
                        <User size={28} color={colors.neutral[400]} strokeWidth={2} />
                      )}
                    </View>
                    <View style={styles.providerInfo}>
                      <View style={styles.providerNameRow}>
                        <Text style={styles.providerName}>{provider.full_name || 'Provider'}</Text>
                        {pp.is_verified && (
                          <View style={styles.verifiedBadge}>
                            <ShieldCheck size={14} color={colors.success[600]} strokeWidth={2} />
                            <Text style={styles.verifiedText}>{t('verified')}</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.providerMeta}>
                        <View style={styles.ratingRow}>
                          <Star size={14} color={colors.warning[500]} fill={colors.warning[500]} strokeWidth={0} />
                          <Text style={styles.ratingText}>{pp.rating_avg.toFixed(1)}</Text>
                          <Text style={styles.jobsText}>({pp.jobs_completed} {t('jobsCompleted')})</Text>
                        </View>
                        <Text style={styles.expText}>{pp.experience_years} {t('yearsExp')}</Text>
                      </View>
                      <View style={styles.distanceRow}>
                        <View style={styles.distanceTag}>
                          <MapPin size={12} color={colors.neutral[400]} strokeWidth={2} />
                          <Text style={styles.distanceText}>2.5 km away</Text>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral[50] },
  modeContainer: { flexDirection: 'row', paddingHorizontal: spacing.md, paddingVertical: spacing.md, gap: spacing.sm },
  modeCard: {
    flex: 1, backgroundColor: colors.neutral[0], borderRadius: radius.lg,
    padding: spacing.md, borderWidth: 2, borderColor: 'transparent', ...shadows.sm,
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
    backgroundColor: colors.neutral[0], borderRadius: radius.lg,
    padding: spacing.xl, alignItems: 'center', ...shadows.sm,
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
  autoBtn: { width: '100%', marginTop: spacing.lg },
  providersList: { paddingHorizontal: spacing.md },
  noProviders: { padding: spacing.xl, alignItems: 'center' },
  noProvidersText: {
    fontSize: typography.sizes.md, color: colors.neutral[500],
    textAlign: 'center', fontFamily: typography.fontFamilyRegular,
  },
  providerCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.neutral[0],
    borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, ...shadows.sm,
  },
  providerAvatar: {
    width: 56, height: 56, borderRadius: radius.full, backgroundColor: colors.neutral[100],
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
    backgroundColor: colors.success[50], borderRadius: radius.sm,
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
