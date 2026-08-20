import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  RefreshControl,
  Pressable,
  Modal,
  TextInput,
  FlatList,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useLanguage } from '@/lib/language-context';
import { useAuth } from '@/lib/auth-context';
import { colors, spacing, radius, typography, shadows } from '@/lib/theme';
import {
  ErrorState, SkeletonList, SkeletonBox, HeroHeading, LocationPill, FloatingSearchBar,
} from '@/components/ui';
import { CategoryTile, QuickActionTile, PromoCard, ProviderAvatar } from '@/components/cards';
import { ServiceIcon3D } from '@/components/ServiceIcon3D';
import { supabase } from '@/lib/supabase';
import type { ServiceCategory, ServiceCategoryGroup, Offer } from '@/lib/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { cache } from '@/lib/cache';
import { seasonalByMonth, seasonalSuggestion, type SeasonalSuggestion } from '@/lib/seasonal';
import { Bell, ChevronRight, Search, X, Gift, Sparkles } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const SCREEN_PADDING = spacing.lg;
const NUM_COLUMNS = 4;
const TILE_WIDTH = (width - SCREEN_PADDING * 2 - spacing.sm * (NUM_COLUMNS - 1)) / NUM_COLUMNS;
const HOME_DATA_TIMEOUT_MS = 12_000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Unable to load services. Check your connection and try again.'));
    }, timeoutMs);
    promise.then(
      (value) => { clearTimeout(timeout); resolve(value); },
      (error) => { clearTimeout(timeout); reject(error); }
    );
  });
}

type SearchResult = { id: string; label: string; subtitle: string; categoryId: string; icon: string };

export default function HomeScreen() {
  const { t, lang } = useLanguage();
  const { profile, session } = useAuth();
  const router = useRouter();

  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [groups, setGroups] = useState<ServiceCategoryGroup[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocationText, setSelectedLocationText] = useState<string>(t('setLocation'));
  const [seasonal, setSeasonal] = useState<SeasonalSuggestion>(() => seasonalByMonth());
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const loadSelectedAddress = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      const selectedId = await AsyncStorage.getItem(`selected_address_${session.user.id}`);
      if (!selectedId) {
        setSelectedLocationText(t('setLocation'));
        return;
      }
      const { data, error: addrError } = await supabase
        .from('addresses')
        .select('area, city, label, latitude, longitude')
        .eq('id', selectedId)
        .single();
      if (!addrError && data) {
        const parts = [data.area, data.city].filter(Boolean);
        setSelectedLocationText(parts.length > 0 ? parts.join(', ') : data.label || 'My Location');
        if (data.latitude != null && data.longitude != null) {
          setCoords({ lat: Number(data.latitude), lng: Number(data.longitude) });
        }
      }
    } catch { /* silent */ }
  }, [session?.user?.id, t]);

  useFocusEffect(
    useCallback(() => { loadSelectedAddress(); }, [loadSelectedAddress])
  );

  useEffect(() => {
    let active = true;
    seasonalSuggestion(coords).then((s) => { if (active) setSeasonal(s); });
    return () => { active = false; };
  }, [coords]);

  const fetchData = useCallback(async () => {
    try {
      const cachedCats = cache.get<ServiceCategory[]>('service_categories');
      const cachedGroups = cache.get<ServiceCategoryGroup[]>('service_category_groups');
      const cachedOffers = cache.get<Offer[]>('offers');
      if (cachedCats && cachedGroups && cachedOffers) {
        setCategories(cachedCats);
        setGroups(cachedGroups);
        setOffers(cachedOffers);
        setLoading(false);
        return;
      }

      const [catsRes, groupsRes, offersRes] = await withTimeout(
        Promise.all([
          supabase.from('service_categories').select('*').order('name_en'),
          supabase.from('service_category_groups').select('*').order('name_en'),
          supabase.from('offers').select('*').eq('is_active', true).order('sort_order'),
        ]),
        HOME_DATA_TIMEOUT_MS
      );

      if (catsRes.error) throw catsRes.error;
      if (groupsRes.error) throw groupsRes.error;

      const cats = catsRes.data || [];
      const sortedGroups = (groupsRes.data || []).slice().sort((a, b) => {
        const getPriority = (name: string) => {
          const n = name.toLowerCase();
          if (n.includes('home repair') || n.includes('home service')) return 0;
          return 1;
        };
        return getPriority(a.name_en) - getPriority(b.name_en) || a.name_en.localeCompare(b.name_en);
      });
      const activeOffers = (offersRes.error ? [] : offersRes.data || []) as Offer[];

      cache.set('service_categories', cats);
      cache.set('service_category_groups', sortedGroups);
      cache.set('offers', activeOffers);

      setCategories(cats);
      setGroups(sortedGroups);
      setOffers(activeOffers);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    cache.clear();
    fetchData();
  };

  const categoriesByGroup = useMemo(() => {
    const map: Record<string, ServiceCategory[]> = {};
    categories.forEach((cat) => {
      const gid = cat.group_id || 'ungrouped';
      if (!map[gid]) map[gid] = [];
      map[gid].push(cat);
    });
    return map;
  }, [categories]);

  const searchIndex: SearchResult[] = useMemo(() => (
    categories.map((cat) => ({
      id: cat.id,
      label: lang === 'ml' ? cat.name_ml : cat.name_en,
      subtitle: t('subcategories'),
      categoryId: cat.id,
      icon: cat.icon_name,
    }))
  ), [categories, lang, t]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return searchIndex.filter((s) => s.label.toLowerCase().includes(q)).slice(0, 12);
  }, [searchQuery, searchIndex]);

  const seasonalCategory = useMemo(() => (
    categories.find((cat) =>
      seasonal.categoryHints.some((hint) => cat.name_en.toLowerCase().includes(hint))
    ) || categories[0]
  ), [categories, seasonal]);

  const goToCategory = (catId: string) => {
    setSearchOpen(false);
    setSearchQuery('');
    router.push(`/category/${catId}`);
  };

  const styles = makeStyles();

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.neutral[50]} />
        <View style={{ padding: SCREEN_PADDING }}>
          <SkeletonBox width={180} height={34} borderRadius={radius.full} />
          <SkeletonBox width="90%" height={36} style={{ marginTop: spacing.lg }} />
          <SkeletonBox width="70%" height={36} style={{ marginTop: spacing.xs }} />
          <SkeletonBox width="100%" height={62} borderRadius={radius.full} style={{ marginTop: spacing.lg }} />
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl }}>
            {[0, 1, 2, 3].map((i) => (
              <SkeletonBox key={i} style={{ flex: 1 }} height={96} borderRadius={radius.lg} />
            ))}
          </View>
        </View>
        <SkeletonList rows={2} />
      </SafeAreaView>
    );
  }
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  const firstName = (profile?.full_name || '').split(' ')[0];
  const loyaltyPoints = profile?.loyalty_points ?? 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.neutral[50]} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary[600]}
            colors={[colors.primary[600]]}
          />
        }
        contentContainerStyle={{ paddingBottom: 110 }}
      >
        {/* Top bar: location pill + notifications + avatar */}
        <View style={styles.topBar}>
          <LocationPill
            label={t('yourLocation')}
            value={selectedLocationText}
            onPress={() => router.push('/location-setup')}
          />
          <View style={styles.topActions}>
            <Pressable style={styles.iconBtn} onPress={() => router.push('/(tabs)/bookings')}>
              <Bell size={20} color={colors.neutral[900]} strokeWidth={2.2} />
              <View style={styles.bellDot} />
            </Pressable>
            <Pressable onPress={() => router.push('/(tabs)/profile')}>
              <ProviderAvatar url={profile?.avatar_url} size={44} />
            </Pressable>
          </View>
        </View>

        {/* Hero headline */}
        <HeroHeading
          title={`${t('heroTitleLine1')}\n${t('heroTitleLine2')}`}
          subtitle={firstName ? `${t('goodMorning')}, ${firstName} · ${t('heroSubtitle')}` : t('heroSubtitle')}
          style={{ paddingHorizontal: SCREEN_PADDING, marginTop: spacing.md }}
        />

        {/* Floating pill search */}
        <FloatingSearchBar
          placeholder={t('searchServices')}
          locationChip={selectedLocationText}
          onPress={() => setSearchOpen(true)}
          onFilterPress={() => setSearchOpen(true)}
          style={{ marginHorizontal: SCREEN_PADDING, marginTop: spacing.lg }}
        />

        {/* Quick actions */}
        <View style={styles.quickRow}>
          <QuickActionTile icon="emergency" label={t('emergency')} urgent onPress={() => router.push('/emergency')} />
          <QuickActionTile icon="schedule" label={t('scheduleService')} tone="green" onPress={() => setSearchOpen(true)} />
          <QuickActionTile icon="track" label={t('trackService')} tone="sky" onPress={() => router.push('/(tabs)/bookings?tab=ongoing')} />
          <QuickActionTile icon="rebook" label={t('rebookService')} tone="violet" onPress={() => router.push('/(tabs)/bookings?tab=completed')} />
        </View>

        {/* Loyalty strip */}
        <Pressable style={styles.loyaltyStrip} onPress={() => router.push('/(tabs)/wallet')}>
          <ServiceIcon3D name="loyalty" size={40} tone="gold" shape="circle" />
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={styles.loyaltyLabel}>{t('loyaltyPoints')}</Text>
            <Text style={styles.loyaltyValue}>{loyaltyPoints} pts · ₹{loyaltyPoints}</Text>
          </View>
          <ChevronRight size={20} color={colors.neutral[400]} strokeWidth={2.4} />
        </Pressable>

        {/* Seasonal / weather suggestion */}
        <PromoCard
          title={t(seasonal.titleKey)}
          description={t(seasonal.descKey)}
          discountText={t('bookNowCta')}
          ctaLabel={t('bookNowCta')}
          tone="gold"
          onPress={() => seasonalCategory && goToCategory(seasonalCategory.id)}
          style={{ marginHorizontal: SCREEN_PADDING, marginTop: spacing.lg }}
        />

        {/* Horizontal category row */}
        {categories.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('exploreServices')}</Text>
              <TouchableOpacity onPress={() => router.push('/category-group/all')} activeOpacity={0.7}>
                <Text style={styles.seeAll}>{t('seeAll')}</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryRow}
            >
              {categories.slice(0, 10).map((cat) => (
                <CategoryTile
                  key={`row-${cat.id}`}
                  icon={cat.icon_name}
                  label={lang === 'ml' ? cat.name_ml : cat.name_en}
                  onPress={() => goToCategory(cat.id)}
                  size={68}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Offers carousel */}
        {offers.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('offersForYou')}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.offerRow}>
              {offers.map((offer, index) => (
                <PromoCard
                  key={offer.id}
                  title={lang === 'ml' ? offer.title_ml : offer.title_en}
                  description={lang === 'ml' ? offer.description_ml : offer.description_en}
                  discountText={lang === 'ml' ? offer.discount_text_ml : offer.discount_text_en}
                  ctaLabel={t('bookNowCta')}
                  imageUrl={offer.image_url}
                  tone={index % 2 === 0 ? 'green' : 'gold'}
                  onPress={() => router.push('/category-group/all')}
                  style={{ width: width - SCREEN_PADDING * 2 }}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Grouped category grids */}
        {groups.map((group) => {
          const groupCats = categoriesByGroup[group.id] || [];
          if (groupCats.length === 0) return null;
          const groupName = lang === 'ml' ? group.name_ml : group.name_en;
          return (
            <View key={group.id} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{groupName}</Text>
                <TouchableOpacity onPress={() => router.push(`/category-group/${group.id}`)} activeOpacity={0.7}>
                  <Text style={styles.seeAll}>{t('seeAll')}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.grid}>
                {groupCats.map((cat) => (
                  <CategoryTile
                    key={cat.id}
                    icon={cat.icon_name}
                    label={lang === 'ml' ? cat.name_ml : cat.name_en}
                    onPress={() => goToCategory(cat.id)}
                    width={TILE_WIDTH}
                    size={62}
                  />
                ))}
              </View>
            </View>
          );
        })}

        {/* Home care plans */}
        <Pressable style={styles.planCard} onPress={() => router.push('/subscriptions')}>
          <ServiceIcon3D name="plan" size={52} tone="teal" />
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={styles.planTitle}>{t('homeCarePlans')}</Text>
            <Text style={styles.planDesc}>{t('homeCarePlansDesc')}</Text>
          </View>
          <View style={styles.planCta}>
            <Text style={styles.planCtaText}>{t('subscribe')}</Text>
          </View>
        </Pressable>

        {/* Refer & earn */}
        <View style={styles.referCard}>
          <View style={styles.referIcon}>
            <Gift size={22} color={colors.primary[600]} strokeWidth={2.2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.referTitle}>{t('referEarn')}</Text>
            <Text style={styles.referDesc}>{t('referEarnDesc')}</Text>
          </View>
          <Text style={styles.referAmount}>₹100</Text>
        </View>
      </ScrollView>

      {/* Search modal */}
      <Modal visible={searchOpen} animationType="slide" transparent={false} onRequestClose={() => setSearchOpen(false)}>
        <SafeAreaView style={styles.searchModal} edges={['top']}>
          <View style={styles.searchHeader}>
            <TouchableOpacity style={styles.searchBackBtn} onPress={() => setSearchOpen(false)} activeOpacity={0.6}>
              <X size={22} color={colors.neutral[900]} strokeWidth={2.2} />
            </TouchableOpacity>
            <View style={styles.searchInputWrap}>
              <Search size={20} color={colors.neutral[500]} strokeWidth={2.2} />
              <TextInput
                style={[styles.searchInput, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
                placeholder={t('searchServices')}
                placeholderTextColor={colors.neutral[500]}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
                autoCapitalize="none"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
                  <X size={18} color={colors.neutral[500]} strokeWidth={2} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {searchQuery.length === 0 ? (
            <View style={styles.searchEmptyState}>
              <Sparkles size={44} color={colors.neutral[300]} strokeWidth={1.6} />
              <Text style={styles.searchEmptyTitle}>{t('searchServices')}</Text>
              <Text style={styles.searchEmptyDesc}>{t('subcategories')}</Text>
            </View>
          ) : searchResults.length === 0 ? (
            <View style={styles.searchEmptyState}>
              <Text style={styles.searchEmptyTitle}>{t('noResults')}</Text>
              <Text style={styles.searchEmptyDesc}>{t('tryDifferentSearch')}</Text>
            </View>
          ) : (
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.searchResultsList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.searchResult}
                  activeOpacity={0.8}
                  onPress={() => goToCategory(item.categoryId)}
                >
                  <ServiceIcon3D name={item.icon} size={44} />
                  <View style={styles.searchResultText}>
                    <Text style={styles.searchResultLabel}>{item.label}</Text>
                    <Text style={styles.searchResultSubtitle}>{item.subtitle}</Text>
                  </View>
                  <ChevronRight size={18} color={colors.neutral[400]} strokeWidth={2.2} />
                </TouchableOpacity>
              )}
            />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function makeStyles() {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.neutral[50] },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SCREEN_PADDING,
      paddingTop: spacing.sm,
      gap: spacing.sm,
    },
    topActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    iconBtn: {
      width: 44, height: 44, borderRadius: radius.full,
      backgroundColor: colors.neutral[100],
      alignItems: 'center', justifyContent: 'center',
      ...shadows.sm,
    },
    bellDot: {
      position: 'absolute', top: 11, right: 12, width: 9, height: 9,
      borderRadius: radius.full, backgroundColor: colors.secondary[500],
      borderWidth: 1.5, borderColor: colors.neutral[100],
    },
    quickRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      paddingHorizontal: SCREEN_PADDING,
      marginTop: spacing.xl,
    },
    loyaltyStrip: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: SCREEN_PADDING,
      marginTop: spacing.lg,
      backgroundColor: colors.neutral[100],
      borderRadius: radius.xl,
      padding: spacing.md,
      ...shadows.sm,
    },
    loyaltyLabel: {
      fontSize: typography.sizes.xs,
      color: colors.neutral[500],
      fontFamily: typography.fontFamilyRegular,
    },
    loyaltyValue: {
      fontSize: typography.sizes.md,
      fontWeight: '800',
      color: colors.neutral[900],
      fontFamily: typography.fontFamilyBold,
      marginTop: 1,
    },
    section: { marginTop: spacing.xl },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SCREEN_PADDING,
      marginBottom: spacing.md,
    },
    sectionTitle: {
      fontSize: typography.sizes.xl,
      fontWeight: '800',
      color: colors.neutral[900],
      fontFamily: typography.fontFamilyDisplay,
      letterSpacing: -0.3,
    },
    seeAll: {
      fontSize: typography.sizes.sm,
      fontWeight: '700',
      color: colors.primary[600],
      fontFamily: typography.fontFamilyBold,
    },
    categoryRow: {
      paddingHorizontal: SCREEN_PADDING,
      gap: spacing.lg,
      paddingBottom: spacing.xs,
    },
    offerRow: {
      paddingHorizontal: SCREEN_PADDING,
      gap: spacing.md,
      paddingBottom: spacing.xs,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      rowGap: spacing.lg,
      paddingHorizontal: SCREEN_PADDING,
    },
    planCard: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: SCREEN_PADDING,
      marginTop: spacing.xl,
      backgroundColor: colors.neutral[100],
      borderRadius: radius.xl,
      padding: spacing.md,
      ...shadows.md,
    },
    planTitle: {
      fontSize: typography.sizes.md,
      fontWeight: '800',
      color: colors.neutral[900],
      fontFamily: typography.fontFamilyBold,
    },
    planDesc: {
      fontSize: typography.sizes.xs,
      color: colors.neutral[500],
      marginTop: 2,
      fontFamily: typography.fontFamilyRegular,
    },
    planCta: {
      backgroundColor: colors.primary[600],
      borderRadius: radius.full,
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
    },
    planCtaText: {
      fontSize: typography.sizes.xs,
      fontWeight: '800',
      color: '#FFFFFF',
      fontFamily: typography.fontFamilyBold,
    },
    referCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginHorizontal: SCREEN_PADDING,
      marginTop: spacing.lg,
      backgroundColor: colors.primary[50],
      borderRadius: radius.xl,
      padding: spacing.md,
    },
    referIcon: {
      width: 44, height: 44, borderRadius: radius.full,
      backgroundColor: colors.neutral[100],
      alignItems: 'center', justifyContent: 'center',
    },
    referTitle: {
      fontSize: typography.sizes.sm,
      fontWeight: '800',
      color: colors.neutral[900],
      fontFamily: typography.fontFamilyBold,
    },
    referDesc: {
      fontSize: typography.sizes.xs,
      color: colors.neutral[500],
      marginTop: 2,
      fontFamily: typography.fontFamilyRegular,
    },
    referAmount: {
      fontSize: typography.sizes.lg,
      fontWeight: '800',
      color: colors.primary[600],
      fontFamily: typography.fontFamilyBold,
    },
    searchModal: { flex: 1, backgroundColor: colors.neutral[50] },
    searchHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      gap: spacing.xs,
    },
    searchBackBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    searchInputWrap: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      height: 52,
      backgroundColor: colors.neutral[100],
      borderRadius: radius.full,
      paddingHorizontal: spacing.md,
      ...shadows.sm,
    },
    searchInput: {
      flex: 1,
      marginLeft: spacing.sm,
      fontSize: typography.sizes.md,
      color: colors.neutral[900],
      fontFamily: typography.fontFamilyRegular,
    },
    searchEmptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
    searchEmptyTitle: {
      fontSize: typography.sizes.lg,
      fontWeight: '800',
      color: colors.neutral[900],
      marginTop: spacing.md,
      fontFamily: typography.fontFamilyBold,
    },
    searchEmptyDesc: {
      fontSize: typography.sizes.sm,
      color: colors.neutral[500],
      marginTop: spacing.xs,
      textAlign: 'center',
      fontFamily: typography.fontFamilyRegular,
    },
    searchResultsList: { padding: spacing.lg, gap: spacing.sm },
    searchResult: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.neutral[100],
      borderRadius: radius.lg,
      padding: spacing.sm + 2,
      ...shadows.sm,
    },
    searchResultText: { flex: 1, marginLeft: spacing.md },
    searchResultLabel: {
      fontSize: typography.sizes.md,
      fontWeight: '700',
      color: colors.neutral[900],
      fontFamily: typography.fontFamilyBold,
    },
    searchResultSubtitle: {
      fontSize: typography.sizes.xs,
      color: colors.neutral[500],
      marginTop: 2,
      fontFamily: typography.fontFamilyRegular,
    },
  });
}
