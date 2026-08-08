import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useLanguage } from '@/lib/language-context';
import { useTheme } from '@/lib/theme-context';
import { supabase } from '@/lib/supabase';
import { colors, spacing, radius, typography, shadows } from '@/lib/theme';
import { Header, LoadingState, ErrorState, Button } from '@/components/ui';
import type { ProviderWithProfile, Review } from '@/lib/types';
import { Star, ShieldCheck, MapPin, User, Briefcase, Award, MessageSquare } from 'lucide-react-native';

export default function ProviderProfileScreen() {
  const { id, subId } = useLocalSearchParams<{ id: string; subId: string }>();
  const { t, lang } = useLanguage();
  const router = useRouter();
  const { isDark } = useTheme();

  const [provider, setProvider] = useState<ProviderWithProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.neutral[50] },
    profileHeader: { flexDirection: 'row', backgroundColor: colors.neutral[100], padding: spacing.lg },
    avatarWrap: {
      width: 80, height: 80, borderRadius: radius.full, backgroundColor: colors.neutral[200],
      alignItems: 'center', justifyContent: 'center', marginRight: spacing.md,
    },
    avatarPlaceholder: { width: 80, height: 80, borderRadius: radius.full, backgroundColor: colors.neutral[200] },
    profileInfo: { flex: 1, justifyContent: 'center' },
    nameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs, flexWrap: 'wrap' },
    name: {
      fontSize: typography.sizes.xxl, fontWeight: '700', color: colors.neutral[900],
      marginRight: spacing.sm, fontFamily: typography.fontFamilyBold,
    },
    verifiedBadge: {
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
      backgroundColor: colors.success[50], borderRadius: radius.full,
    },
    verifiedText: {
      fontSize: typography.sizes.xs, color: colors.success[700], fontWeight: '600',
      marginLeft: 4, fontFamily: typography.fontFamilyMedium,
    },
    ratingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
    ratingText: {
      fontSize: typography.sizes.sm, fontWeight: '600', color: colors.neutral[700],
      marginLeft: 4, fontFamily: typography.fontFamilyMedium,
    },
    ratingCount: {
      fontSize: typography.sizes.sm, color: colors.neutral[400],
      marginLeft: 4, fontFamily: typography.fontFamilyRegular,
    },
    dot: { fontSize: typography.sizes.sm, color: colors.neutral[300], marginHorizontal: spacing.xs },
    jobsText: {
      fontSize: typography.sizes.sm, color: colors.neutral[500], fontFamily: typography.fontFamilyRegular,
    },
    locationRow: { flexDirection: 'row', alignItems: 'center' },
    locationText: {
      fontSize: typography.sizes.sm, color: colors.neutral[500],
      marginLeft: 4, fontFamily: typography.fontFamilyRegular,
    },
    statsRow: {
      flexDirection: 'row', backgroundColor: colors.neutral[100], marginHorizontal: spacing.md,
      marginTop: spacing.md, borderRadius: radius.lg, padding: spacing.md,
    },
    statItem: { flex: 1, alignItems: 'center' },
    statValue: {
      fontSize: typography.sizes.xxl, fontWeight: '700', color: colors.primary[700],
      fontFamily: typography.fontFamilyBold,
    },
    statLabel: {
      fontSize: typography.sizes.xs, color: colors.neutral[500], marginTop: 2,
      fontFamily: typography.fontFamilyRegular,
    },
    statDivider: { width: 1, backgroundColor: colors.neutral[200] },
    section: { paddingHorizontal: spacing.md, marginTop: spacing.lg },
    sectionTitle: {
      fontSize: typography.sizes.lg, fontWeight: '700', color: colors.neutral[900],
      marginBottom: spacing.sm, fontFamily: typography.fontFamilyBold,
    },
    bioText: {
      fontSize: typography.sizes.md, color: colors.neutral[600],
      lineHeight: 22, fontFamily: typography.fontFamilyRegular,
    },
    tagsWrap: { flexDirection: 'row', flexWrap: 'wrap' },
    skillTag: {
      paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
      backgroundColor: colors.primary[50], borderRadius: radius.full,
      marginRight: spacing.sm, marginBottom: spacing.sm,
    },
    skillTagText: {
      fontSize: typography.sizes.sm, color: colors.primary[700], fontWeight: '600',
      fontFamily: typography.fontFamilyMedium,
    },
    noReviewsText: {
      fontSize: typography.sizes.sm, color: colors.neutral[400], fontFamily: typography.fontFamilyRegular,
    },
    reviewCard: {
      backgroundColor: colors.neutral[100], borderRadius: radius.lg,
      padding: spacing.md, marginBottom: spacing.sm,
    },
    reviewHeader: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs,
    },
    reviewStars: { flexDirection: 'row' },
    reviewDate: {
      fontSize: typography.sizes.xs, color: colors.neutral[400], fontFamily: typography.fontFamilyRegular,
    },
    reviewComment: {
      fontSize: typography.sizes.sm, color: colors.neutral[600],
      lineHeight: 20, marginBottom: spacing.xs, fontFamily: typography.fontFamilyRegular,
    },
    reviewTags: { flexDirection: 'row', flexWrap: 'wrap' },
    reviewTag: {
      paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
      backgroundColor: colors.neutral[200], borderRadius: radius.full,
      marginRight: spacing.xs, marginBottom: spacing.xs,
    },
    reviewTagText: {
      fontSize: typography.sizes.xs, color: colors.neutral[600], fontFamily: typography.fontFamilyRegular,
    },
    bottomBar: {
      position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.neutral[100],
      paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
      borderTopWidth: 1, borderTopColor: colors.neutral[200],
    },
    bookBtn: { width: '100%', borderRadius: radius.full },
  });

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [provRes, reviewRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('*, provider_profile:provider_profiles(*)')
          .eq('id', id)
          .maybeSingle(),
        supabase
          .from('reviews')
          .select('*')
          .eq('provider_id', id)
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      if (provRes.error) throw provRes.error;
      if (reviewRes.error) throw reviewRes.error;

      setProvider(provRes.data as ProviderWithProfile);
      setReviews(reviewRes.data || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <LoadingState label={t('loading')} />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;
  if (!provider) return <ErrorState message="Provider not found" />;

  const pp = provider.provider_profile;

  const handleBookNow = () => {
    if (subId) {
      router.push(`/booking/new?subId=${subId}&mode=manual&providerId=${provider.id}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title={t('provider')}
        onBack={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(tabs)');
          }
        }}
      />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarWrap}>
            {provider.avatar_url ? (
              <View style={styles.avatarPlaceholder} />
            ) : (
              <User size={40} color={colors.neutral[400]} strokeWidth={2} />
            )}
          </View>
          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{provider.full_name || 'Provider'}</Text>
              {pp?.is_verified && (
                <View style={styles.verifiedBadge}>
                  <ShieldCheck size={16} color={colors.success[600]} strokeWidth={2} />
                  <Text style={styles.verifiedText}>{t('backgroundChecked')}</Text>
                </View>
              )}
            </View>
            {pp && (
              <View style={styles.ratingRow}>
                <Star size={16} color={colors.warning[500]} fill={colors.warning[500]} strokeWidth={0} />
                <Text style={styles.ratingText}>{pp.rating_avg.toFixed(1)}</Text>
                <Text style={styles.ratingCount}>({pp.rating_count} {t('reviews')})</Text>
                <Text style={styles.dot}>·</Text>
                <Text style={styles.jobsText}>{pp.jobs_completed} {t('jobsCompleted')}</Text>
              </View>
            )}
            {pp && (
              <View style={styles.locationRow}>
                <MapPin size={14} color={colors.neutral[400]} strokeWidth={2} />
                <Text style={styles.locationText}>Thrissur, Kerala</Text>
              </View>
            )}
          </View>
        </View>

        {/* Stats Row */}
        {pp && (
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{pp.experience_years}</Text>
              <Text style={styles.statLabel}>{t('yearsExp')}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{pp.jobs_completed}</Text>
              <Text style={styles.statLabel}>{t('jobsCompleted')}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{pp.rating_avg.toFixed(1)}</Text>
              <Text style={styles.statLabel}>{t('rating')}</Text>
            </View>
          </View>
        )}

        {/* Bio */}
        {pp?.bio_en && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('provider')}</Text>
            <Text style={styles.bioText}>
              {lang === 'ml' ? pp.bio_ml || pp.bio_en : pp.bio_en}
            </Text>
          </View>
        )}

        {/* Skills */}
        {pp && pp.specializations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('skills')}</Text>
            <View style={styles.tagsWrap}>
              {pp.specializations.map((skill, idx) => (
                <View key={idx} style={styles.skillTag}>
                  <Text style={styles.skillTagText}>{skill}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Reviews */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('reviews')}</Text>
          {reviews.length === 0 ? (
            <Text style={styles.noReviewsText}>No reviews yet.</Text>
          ) : (
            reviews.map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewStars}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={14}
                        color={star <= review.rating ? colors.warning[500] : colors.neutral[300]}
                        fill={star <= review.rating ? colors.warning[500] : 'transparent'}
                        strokeWidth={0}
                      />
                    ))}
                  </View>
                  <Text style={styles.reviewDate}>
                    {new Date(review.created_at).toLocaleDateString()}
                  </Text>
                </View>
                {review.comment && <Text style={styles.reviewComment}>{review.comment}</Text>}
                {review.tags.length > 0 && (
                  <View style={styles.reviewTags}>
                    {review.tags.map((tag, idx) => (
                      <View key={idx} style={styles.reviewTag}>
                        <Text style={styles.reviewTagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Book Now Button */}
      <View style={styles.bottomBar}>
        <Button label={t('bookNow')} onPress={handleBookNow} style={styles.bookBtn} />
      </View>
    </SafeAreaView>
  );
}
