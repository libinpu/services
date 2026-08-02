import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useLanguage } from '@/lib/language-context';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { colors, spacing, radius, typography, shadows } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';
import { Header, LoadingState, ErrorState, Button } from '@/components/ui';
import { Star, Camera, Check } from 'lucide-react-native';

const RATING_TAGS = [
  { key: 'onTime', en: 'On time', ml: 'സമയത്ത്' },
  { key: 'polite', en: 'Polite', ml: 'മര്യാദയുള്ള' },
  { key: 'goodWork', en: 'Good work', ml: 'നല്ല ജോലി' },
  { key: 'overpriced', en: 'Overpriced', ml: 'വില കൂടുതലായിരുന്നു' },
  { key: 'late', en: 'Late', ml: 'വൈകി' },
  { key: 'unprofessional', en: 'Unprofessional', ml: 'അപ്രൊഫഷണൽ' },
];

export default function FeedbackScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, lang } = useLanguage();
  const { session } = useAuth();
  const router = useRouter();
  const { isDark } = useTheme();

  const [rating, setRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.neutral[50],
    },
    providerCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.neutral[100],
      borderRadius: radius.lg,
      padding: spacing.md,
      margin: spacing.md,
    },
    providerAvatar: {
      width: 48,
      height: 48,
      borderRadius: radius.full,
      backgroundColor: colors.primary[100],
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.md,
    },
    providerAvatarText: {
      fontSize: typography.sizes.xl,
      fontWeight: '700',
      color: colors.primary[700],
      fontFamily: typography.fontFamilyBold,
    },
    providerName: {
      fontSize: typography.sizes.lg,
      fontWeight: '700',
      color: colors.neutral[900],
      fontFamily: typography.fontFamilyBold,
    },
    section: {
      paddingHorizontal: spacing.md,
      marginTop: spacing.lg,
    },
    questionText: {
      fontSize: typography.sizes.xl,
      fontWeight: '700',
      color: colors.neutral[900],
      textAlign: 'center',
      marginBottom: spacing.lg,
      fontFamily: typography.fontFamilyBold,
    },
    starsRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: spacing.sm,
    },
    sectionTitle: {
      fontSize: typography.sizes.md,
      fontWeight: '600',
      color: colors.neutral[700],
      marginBottom: spacing.sm,
      fontFamily: typography.fontFamilyMedium,
    },
    tagsWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    tag: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: colors.neutral[100],
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: colors.neutral[200],
      gap: spacing.xs,
    },
    tagSelected: {
      borderColor: colors.primary[600],
      backgroundColor: colors.primary[50],
    },
    tagText: {
      fontSize: typography.sizes.sm,
      color: colors.neutral[600],
      fontFamily: typography.fontFamilyRegular,
    },
    tagTextSelected: {
      color: colors.primary[700],
      fontWeight: '600',
      fontFamily: typography.fontFamilyMedium,
    },
    commentInput: {
      minHeight: 100,
      borderWidth: 1.5,
      borderColor: colors.neutral[200],
      borderRadius: radius.lg,
      padding: spacing.md,
      fontSize: typography.sizes.md,
      color: colors.neutral[900],
      backgroundColor: colors.neutral[100],
      fontFamily: typography.fontFamilyRegular,
    },
    photoUpload: {
      height: 120,
      borderWidth: 2,
      borderColor: colors.neutral[300],
      borderStyle: 'dashed',
      borderRadius: radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    photoText: {
      fontSize: typography.sizes.sm,
      color: colors.neutral[400],
      marginTop: spacing.xs,
      fontFamily: typography.fontFamilyRegular,
    },
    errorText: {
      fontSize: typography.sizes.sm,
      color: colors.error[600],
      textAlign: 'center',
      paddingHorizontal: spacing.md,
      marginTop: spacing.md,
      fontFamily: typography.fontFamilyRegular,
    },
    bottomBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: colors.neutral[100],
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.neutral[200],
    },
    submitBtn: {
      width: '100%',
      borderRadius: radius.full,
    },
  });

  useEffect(() => {
    const fetchBooking = async () => {
      const { data } = await supabase
        .from('bookings')
        .select('*, provider:profiles!bookings_provider_id_fkey(*)')
        .eq('id', id)
        .maybeSingle();
      setBooking(data);
      setLoading(false);
    };
    fetchBooking();
  }, [id]);

  const handleToggleTag = (tagKey: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagKey) ? prev.filter((t) => t !== tagKey) : [...prev, tagKey]
    );
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }
    if (!session?.user?.id || !booking?.provider_id) return;

    setSubmitting(true);
    setError(null);

    try {
      const tagLabels = selectedTags.map((key) => {
        const tag = RATING_TAGS.find((t) => t.key === key);
        return tag ? (lang === 'ml' ? tag.ml : tag.en) : key;
      });

      const { error: reviewError } = await supabase.from('reviews').insert({
        booking_id: id,
        customer_id: session.user.id,
        provider_id: booking.provider_id,
        rating,
        tags: tagLabels,
        comment: comment.trim() || null,
      });

      if (reviewError) throw reviewError;

      router.replace('/(tabs)/bookings');
    } catch (e: any) {
      setError(e.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState label={t('loading')} />;

  return (
    <SafeAreaView style={styles.container}>
      <Header title={t('rateYourExperience')} onBack={() => router.back()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Provider info */}
        {booking?.provider && (
          <View style={styles.providerCard}>
            <View style={styles.providerAvatar}>
              <Text style={styles.providerAvatarText}>
                {(booking.provider.full_name || '?')[0].toUpperCase()}
              </Text>
            </View>
            <Text style={styles.providerName}>{booking.provider.full_name}</Text>
          </View>
        )}

        {/* Star rating */}
        <View style={styles.section}>
          <Text style={styles.questionText}>{t('howWasService')}</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setRating(star)} activeOpacity={0.7}>
                <Star
                  size={48}
                  color={star <= rating ? colors.warning[500] : colors.neutral[300]}
                  fill={star <= rating ? colors.warning[500] : 'transparent'}
                  strokeWidth={1.5}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Tags */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('howWasService')}</Text>
          <View style={styles.tagsWrap}>
            {RATING_TAGS.map((tag) => {
              const isSelected = selectedTags.includes(tag.key);
              return (
                <TouchableOpacity
                  key={tag.key}
                  style={[styles.tag, isSelected && styles.tagSelected]}
                  onPress={() => handleToggleTag(tag.key)}
                >
                  {isSelected && <Check size={14} color={colors.primary[700]} strokeWidth={2.5} />}
                  <Text style={[styles.tagText, isSelected && styles.tagTextSelected]}>
                    {lang === 'ml' ? tag.ml : tag.en}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Written review */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('writeReview')}</Text>
          <TextInput
            style={styles.commentInput}
            value={comment}
            onChangeText={setComment}
            placeholder="Share your experience..."
            placeholderTextColor={colors.neutral[400]}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Photo upload */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('addPhoto')}</Text>
          <TouchableOpacity style={styles.photoUpload} activeOpacity={0.8}>
            <Camera size={32} color={colors.neutral[400]} strokeWidth={1.5} />
            <Text style={styles.photoText}>Tap to upload</Text>
          </TouchableOpacity>
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}
      </ScrollView>

      <View style={styles.bottomBar}>
        <Button label={t('submitReview')} onPress={handleSubmit} loading={submitting} style={styles.submitBtn} />
      </View>
    </SafeAreaView>
  );
}
