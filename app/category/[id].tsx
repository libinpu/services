import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal,
  Pressable, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useLanguage } from '@/lib/language-context';
import { useTheme } from '@/lib/theme-context';
import { supabase } from '@/lib/supabase';
import { colors, spacing, radius, typography, shadows } from '@/lib/theme';
import { Header, LoadingState, ErrorState } from '@/components/ui';
import type { ServiceCategory, ServiceSubcategory } from '@/lib/types';
import { Clock, ChevronRight, X, ShieldCheck, Star, Zap } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, lang } = useLanguage();
  const router = useRouter();

  const [category, setCategory] = useState<ServiceCategory | null>(null);
  const [subcategories, setSubcategories] = useState<ServiceSubcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSub, setSelectedSub] = useState<ServiceSubcategory | null>(null);
  const { isDark } = useTheme();

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.neutral[50] },
    scroll: { flex: 1, paddingHorizontal: spacing.md },
    introText: {
      fontSize: typography.sizes.sm, color: colors.neutral[500],
      paddingVertical: spacing.md, fontFamily: typography.fontFamilyRegular,
    },
    emptyState: { padding: spacing.xl, alignItems: 'center' },
    emptyText: {
      fontSize: typography.sizes.md, color: colors.neutral[400],
      fontFamily: typography.fontFamilyRegular,
    },
    subCard: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: colors.neutral[100],
      borderRadius: radius.lg, padding: spacing.md, marginTop: spacing.sm,
    },
    subCardContent: { flex: 1 },
    subName: {
      fontSize: typography.sizes.lg, fontWeight: '700', color: colors.neutral[900],
      marginBottom: spacing.xs, fontFamily: typography.fontFamilyBold,
    },
    subDesc: {
      fontSize: typography.sizes.sm, color: colors.neutral[500],
      marginBottom: spacing.sm, lineHeight: 20, fontFamily: typography.fontFamilyRegular,
    },
    subMetaRow: { flexDirection: 'row', alignItems: 'center' },
    timeTag: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
      backgroundColor: colors.neutral[200], borderRadius: radius.sm,
    },
    timeText: {
      fontSize: typography.sizes.sm, color: colors.neutral[600],
      marginLeft: 4, fontFamily: typography.fontFamilyRegular,
    },
    sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    sheetCard: {
      backgroundColor: colors.neutral[100], borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl, paddingBottom: spacing.xl, maxHeight: '80%',
    },
    sheetHandle: {
      width: 40, height: 4, borderRadius: radius.full, backgroundColor: colors.neutral[200],
      alignSelf: 'center', marginTop: spacing.sm, marginBottom: spacing.sm,
    },
    sheetHeader: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: spacing.lg, paddingBottom: spacing.sm,
    },
    sheetTitle: {
      flex: 1, fontSize: typography.sizes.xxl, fontWeight: '700',
      color: colors.neutral[900], fontFamily: typography.fontFamilyBold,
    },
    sheetCloseBtn: {
      width: 36, height: 36, borderRadius: radius.full, backgroundColor: colors.neutral[200],
      alignItems: 'center', justifyContent: 'center',
    },
    sheetBody: { paddingHorizontal: spacing.lg },
    sheetDesc: {
      fontSize: typography.sizes.md, color: colors.neutral[600],
      lineHeight: 24, marginBottom: spacing.lg, fontFamily: typography.fontFamilyRegular,
    },
    sheetInfoRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
    sheetInfoCard: {
      flex: 1, backgroundColor: colors.primary[50], borderRadius: radius.lg,
      padding: spacing.md, alignItems: 'center',
    },
    sheetInfoLabel: {
      fontSize: typography.sizes.xs, color: colors.neutral[500],
      marginTop: spacing.xs, fontFamily: typography.fontFamilyRegular,
    },
    sheetInfoValue: {
      fontSize: typography.sizes.lg, fontWeight: '700', color: colors.primary[700],
      marginTop: 2, fontFamily: typography.fontFamilyBold,
    },
    sheetFeatures: { gap: spacing.sm, marginBottom: spacing.xxl },
    sheetFeature: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    sheetFeatureText: {
      fontSize: typography.sizes.sm, color: colors.neutral[700],
      fontFamily: typography.fontFamilyMedium,
    },
    sheetBookBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      backgroundColor: colors.primary[600], borderRadius: radius.full,
      paddingVertical: spacing.md, gap: spacing.xs,
    },
    sheetBookBtnText: {
      fontSize: typography.sizes.lg, fontWeight: '700',
      color: colors.neutral[0], fontFamily: typography.fontFamilyBold,
    },
  });

  const fetchData = useCallback(async () => {
    if (!id) {
      setError(t('selectServiceFirst'));
      setLoading(false);
      return;
    }
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(id)) {
      setError('Invalid category');
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const catRes = await supabase
        .from('service_categories')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (catRes.error) throw catRes.error;
      setCategory(catRes.data as ServiceCategory);

      const subRes = await supabase
        .from('service_subcategories')
        .select('*')
        .eq('category_id', id)
        .eq('is_active', true)
        .order('name_en', { ascending: true });
      if (subRes.error) throw subRes.error;
      setSubcategories((subRes.data || []) as ServiceSubcategory[]);
    } catch (e: any) {
      setError(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <LoadingState label={t('loading')} />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  const categoryName = category ? (lang === 'ml' ? category.name_ml : category.name_en) : '';

  return (
    <SafeAreaView style={styles.container}>
      <Header title={categoryName} onBack={() => router.back()} />
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <Text style={styles.introText}>{t('chooseServiceDesc')}</Text>
        {subcategories.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>{t('noServicesYet')}</Text>
          </View>
        ) : (
          subcategories.map((sub) => (
            <TouchableOpacity
              key={sub.id}
              style={styles.subCard}
              onPress={() => setSelectedSub(sub)}
              activeOpacity={0.8}
            >
              <View style={styles.subCardContent}>
                <Text style={styles.subName}>
                  {lang === 'ml' ? sub.name_ml : sub.name_en}
                </Text>
                {(lang === 'ml' ? sub.description_ml : sub.description_en) ? (
                  <Text style={styles.subDesc} numberOfLines={2}>
                    {lang === 'ml' ? sub.description_ml : sub.description_en}
                  </Text>
                ) : null}
                <View style={styles.subMetaRow}>
                  <View style={styles.timeTag}>
                    <Clock size={14} color={colors.neutral[500]} strokeWidth={2} />
                    <Text style={styles.timeText}>
                      {sub.estimated_time_mins >= 60
                        ? `${Math.floor(sub.estimated_time_mins / 60)} ${t('hours')} ${sub.estimated_time_mins % 60} ${t('mins')}`
                        : `${sub.estimated_time_mins} ${t('mins')}`}
                    </Text>
                  </View>
                </View>
              </View>
              <ChevronRight size={20} color={colors.neutral[300]} strokeWidth={2} />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Service description bottom sheet */}
      <Modal
        visible={selectedSub !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedSub(null)}
      >
        <Pressable style={styles.sheetOverlay} onPress={() => setSelectedSub(null)}>
          <Pressable style={styles.sheetCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                {selectedSub ? (lang === 'ml' ? selectedSub.name_ml : selectedSub.name_en) : ''}
              </Text>
              <TouchableOpacity style={styles.sheetCloseBtn} onPress={() => setSelectedSub(null)}>
                <X size={20} color={colors.neutral[500]} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            {selectedSub && (
              <ScrollView style={styles.sheetBody} showsVerticalScrollIndicator={false}>
                <Text style={styles.sheetDesc}>
                  {(lang === 'ml' ? selectedSub.description_ml : selectedSub.description_en) ||
                    t('serviceDescDefault')}
                </Text>

                <View style={styles.sheetInfoRow}>
                  <View style={styles.sheetInfoCard}>
                    <Clock size={20} color={colors.primary[600]} strokeWidth={2} />
                    <Text style={styles.sheetInfoLabel}>{t('estimatedTime')}</Text>
                    <Text style={styles.sheetInfoValue}>
                      {selectedSub.estimated_time_mins >= 60
                        ? `${Math.floor(selectedSub.estimated_time_mins / 60)} ${t('hours')} ${selectedSub.estimated_time_mins % 60} ${t('mins')}`
                        : `${selectedSub.estimated_time_mins} ${t('mins')}`}
                    </Text>
                  </View>
                </View>

                <View style={styles.sheetFeatures}>
                  <View style={styles.sheetFeature}>
                    <ShieldCheck size={16} color={colors.primary[600]} strokeWidth={2} />
                    <Text style={styles.sheetFeatureText}>{t('verifiedProviders')}</Text>
                  </View>
                  <View style={styles.sheetFeature}>
                    <Star size={16} color={colors.accent[500]} fill={colors.accent[500]} strokeWidth={0} />
                    <Text style={styles.sheetFeatureText}>{t('topRated')}</Text>
                  </View>
                  <View style={styles.sheetFeature}>
                    <Zap size={16} color={colors.primary[600]} strokeWidth={2} />
                    <Text style={styles.sheetFeatureText}>{t('quickService')}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.sheetBookBtn}
                  onPress={() => {
                    if (selectedSub) router.push(`/providers/${selectedSub.id}`);
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.sheetBookBtnText}>{t('bookNow')}</Text>
                  <ChevronRight size={20} color={colors.neutral[0]} strokeWidth={2.5} />
                </TouchableOpacity>
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

