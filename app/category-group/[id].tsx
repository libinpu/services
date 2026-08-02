import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useLanguage } from '@/lib/language-context';
import { useTheme } from '@/lib/theme-context';
import { colors, spacing, radius, typography, shadows } from '@/lib/theme';
import { LoadingState, ErrorState, Header } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import type { ServiceCategory, ServiceCategoryGroup } from '@/lib/types';
import {
  Wrench, Zap, Wind, Hammer, Paintbrush, Sparkles, Bug, Refrigerator, Scissors,
  GraduationCap, Car, Bike, Laptop, Leaf, ChevronRight, Layers,
} from 'lucide-react-native';

const { width } = Dimensions.get('window');
const NUM_COLUMNS = 3;
const SCREEN_PADDING = spacing.lg;
const CARD_GAP = spacing.sm;
const CARD_SIZE = (width - SCREEN_PADDING * 2 - CARD_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

const iconMap: Record<string, any> = {
  Wrench, Zap, Wind, Hammer, Paintbrush, Sparkles, Bug, Refrigerator, Scissors,
  GraduationCap, Car, Bike, Laptop, Leaf,
};

const groupThemes: Record<string, { bg: string; fg: string }> = {
  blue: { bg: colors.primary[50], fg: colors.primary[600] },
  teal: { bg: colors.secondary[50], fg: colors.secondary[600] },
  amber: { bg: colors.accent[50], fg: colors.accent[600] },
};

const DEFAULT_THEME = groupThemes.blue;

export default function CategoryGroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, lang } = useLanguage();
  const router = useRouter();
  const { isDark } = useTheme();

  const [group, setGroup] = useState<ServiceCategoryGroup | null>(null);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.neutral[50] },
    scroll: { flex: 1, paddingHorizontal: spacing.lg },
    groupBanner: {
      flexDirection: 'row', alignItems: 'center', padding: spacing.lg,
      borderRadius: radius.lg, marginTop: spacing.md,
    },
    groupBannerIcon: {
      width: 56, height: 56, borderRadius: radius.md, backgroundColor: colors.neutral[200],
      alignItems: 'center', justifyContent: 'center', marginRight: spacing.md,
    },
    groupBannerText: { flex: 1 },
    groupBannerTitle: {
      fontSize: typography.sizes.xl, fontWeight: '700', fontFamily: typography.fontFamilyBold,
    },
    groupBannerCount: {
      fontSize: typography.sizes.sm, color: colors.neutral[600], marginTop: 2,
      fontFamily: typography.fontFamilyRegular,
    },
    grid: {
      flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: spacing.md,
    },
    card: {
      width: CARD_SIZE, backgroundColor: colors.neutral[100], borderRadius: radius.lg,
      padding: spacing.md, marginBottom: spacing.md, alignItems: 'center',
    },
    cardPressed: { transform: [{ scale: 0.96 }] },
    cardIcon: {
      width: 60, height: 60, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center',
      marginBottom: spacing.sm,
    },
    cardName: {
      fontSize: typography.sizes.sm, fontWeight: '600', color: colors.neutral[800],
      textAlign: 'center', fontFamily: typography.fontFamilyMedium, marginBottom: spacing.xs,
      minHeight: 36,
    },
    cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    cardCta: {
      fontSize: typography.sizes.xs, color: colors.primary[600], fontWeight: '600',
      fontFamily: typography.fontFamilyMedium,
    },
  });

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (id === 'all') {
        const catRes = await supabase
          .from('service_categories')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });
        if (catRes.error) throw catRes.error;
        setCategories((catRes.data || []) as ServiceCategory[]);
        setGroup(null);
      } else if (!UUID_RE.test(id)) {
        setError('Invalid category group');
        setLoading(false);
        return;
      } else {
        const [groupRes, catRes] = await Promise.all([
          supabase.from('service_category_groups').select('*').eq('id', id).maybeSingle(),
          supabase.from('service_categories').select('*').eq('group_id', id).eq('is_active', true).order('sort_order', { ascending: true }),
        ]);
        if (groupRes.error) throw groupRes.error;
        if (catRes.error) throw catRes.error;
        setGroup(groupRes.data as ServiceCategoryGroup);
        setCategories((catRes.data || []) as ServiceCategory[]);
      }
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

  const title = id === 'all'
    ? t('subcategories')
    : group ? (lang === 'ml' ? group.name_ml : group.name_en) : t('subcategories');

  const theme = group ? (groupThemes[group.color_theme] || DEFAULT_THEME) : DEFAULT_THEME;

  return (
    <SafeAreaView style={styles.container}>
      <Header title={title} onBack={() => router.back()} />
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
      >
        {group && (
          <View style={[styles.groupBanner, { backgroundColor: theme.bg }]}>
            <View style={styles.groupBannerIcon}>
              <Layers size={28} color={theme.fg} strokeWidth={2} />
            </View>
            <View style={styles.groupBannerText}>
              <Text style={[styles.groupBannerTitle, { color: theme.fg }]}>
                {lang === 'ml' ? group.name_ml : group.name_en}
              </Text>
              <Text style={styles.groupBannerCount}>
                {categories.length} {t('subcategories').toLowerCase()}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.grid}>
          {categories.map((cat) => {
            const Icon = iconMap[cat.icon_name] || Wrench;
            return (
              <Pressable
                key={cat.id}
                style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                onPress={() => router.push(`/category/${cat.id}`)}
              >
                <View style={[styles.cardIcon, { backgroundColor: theme.bg }]}>
                  <Icon size={28} color={theme.fg} strokeWidth={1.8} />
                </View>
                <Text style={styles.cardName} numberOfLines={2}>
                  {lang === 'ml' ? cat.name_ml : cat.name_en}
                </Text>
                <View style={styles.cardFooter}>
                  <Text style={styles.cardCta}>{t('viewAll')}</Text>
                  <ChevronRight size={14} color={theme.fg} strokeWidth={2.5} />
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
