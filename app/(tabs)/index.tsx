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
  Image,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useLanguage } from '@/lib/language-context';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import { colors, spacing, radius, typography, shadows } from '@/lib/theme';
import { LoadingState, ErrorState } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import type { ServiceCategory, ServiceCategoryGroup } from '@/lib/types';
import {
  Wrench, Zap, Wind, Hammer, Paintbrush, Sparkles, Bug, Refrigerator, Scissors,
  GraduationCap, Car, Bike, Laptop, Leaf,
  Search, Bell, ChevronRight, MapPin, Star, Clock, ShieldCheck,
  BadgeCheck, ArrowRight, Siren, CalendarClock, Navigation, RefreshCw,
  X, Gift, Heart, SlidersHorizontal,
} from 'lucide-react-native';

const { width } = Dimensions.get('window');
const SCREEN_PADDING = spacing.lg;
const CARD_GAP = spacing.sm;
const NUM_COLUMNS = 4;
const CATEGORY_TILE_SIZE = (width - SCREEN_PADDING * 2 - CARD_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

const iconMap: Record<string, any> = {
  Wrench, Zap, Wind, Hammer, Paintbrush, Sparkles, Bug, Refrigerator, Scissors,
  GraduationCap, Car, Bike, Laptop, Leaf,
};

const serviceImages: Record<string, string> = {
  Wrench: 'https://images.unsplash.com/photo-1607472829122-ed2b2a996393?w=400&auto=format&fit=crop&q=60',
  Zap: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&auto=format&fit=crop&q=60',
  Wind: 'https://images.unsplash.com/photo-1631545806609-871189be6bcc?w=400&auto=format&fit=crop&q=60',
  Hammer: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=400&auto=format&fit=crop&q=60',
  Paintbrush: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=400&auto=format&fit=crop&q=60',
  Sparkles: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&auto=format&fit=crop&q=60',
  Bug: 'https://images.unsplash.com/photo-1608613304899-ea8098577e38?w=400&auto=format&fit=crop&q=60',
  Refrigerator: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&auto=format&fit=crop&q=60',
  Scissors: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&auto=format&fit=crop&q=60',
  GraduationCap: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&auto=format&fit=crop&q=60',
  Car: 'https://images.unsplash.com/photo-1632823463650-1c2e5b5b5b5b?w=400&auto=format&fit=crop&q=60',
  Bike: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=400&auto=format&fit=crop&q=60',
  Laptop: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&auto=format&fit=crop&q=60',
  Leaf: 'https://images.unsplash.com/photo-1416879592905-1c3e6f3f3f3f?w=400&auto=format&fit=crop&q=60',
};

type SearchResult = { id: string; label: string; subtitle: string; categoryId: string; icon: string };

export default function HomeScreen() {
  const { t, lang } = useLanguage();
  const { profile } = useAuth();
  const router = useRouter();
  const { isDark } = useTheme();

  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [groups, setGroups] = useState<ServiceCategoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  const fetchData = useCallback(async () => {
    try {
      const [catsRes, groupsRes] = await Promise.all([
        supabase.from('service_categories').select('*').order('name_en'),
        supabase.from('service_category_groups').select('*').order('name_en'),
      ]);

      if (catsRes.error) throw catsRes.error;
      if (groupsRes.error) throw groupsRes.error;

      setCategories(catsRes.data || []);
      setGroups(groupsRes.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
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

  const searchIndex: SearchResult[] = useMemo(() => {
    return categories.map((cat) => ({
      id: cat.id,
      label: lang === 'ml' ? cat.name_ml : cat.name_en,
      subtitle: t('subcategories'),
      categoryId: cat.id,
      icon: cat.icon_name,
    }));
  }, [categories, lang, t]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return searchIndex.filter((s) => s.label.toLowerCase().includes(q)).slice(0, 12);
  }, [searchQuery, searchIndex]);

  const goToCategory = (catId: string) => {
    setSearchOpen(false);
    setSearchQuery('');
    router.push(`/category/${catId}`);
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.neutral[50] },
    scroll: { flex: 1 },
    // Large rounded header card in deep slate blue with decorative shapes
    heroBlock: {
      backgroundColor: colors.primary[600],
      borderBottomLeftRadius: 36,
      borderBottomRightRadius: 36,
      paddingHorizontal: spacing.lg,
      paddingTop: Platform.OS === 'ios' ? 30 : spacing.sm,
      paddingBottom: spacing.xl,
      ...shadows.lg,
      position: 'relative',
      overflow: 'hidden',
    },
    heroCircle1: {
      position: 'absolute',
      top: -40,
      right: -40,
      width: 160,
      height: 160,
      borderRadius: radius.full,
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    heroCircle2: {
      position: 'absolute',
      bottom: -60,
      left: -20,
      width: 120,
      height: 120,
      borderRadius: radius.full,
      backgroundColor: 'rgba(255, 255, 255, 0.04)',
    },
    heroTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.lg,
    },
    heroLeft: { flex: 1 },
    locationLabel: {
      fontSize: 11,
      color: 'rgba(255, 255, 255, 0.7)',
      fontFamily: typography.fontFamilyRegular,
      marginBottom: 2,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    locationRow: { flexDirection: 'row', alignItems: 'center' },
    locationText: {
      fontSize: typography.sizes.md,
      fontWeight: '700',
      color: colors.neutral[100],
      marginLeft: spacing.xs,
      marginRight: 2,
      fontFamily: typography.fontFamilyBold,
    },
    heroIcons: { flexDirection: 'row', gap: spacing.sm },
    iconBtn: {
      width: 44, height: 44, borderRadius: radius.full,
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
      alignItems: 'center', justifyContent: 'center',
    },
    iconBtnPressed: { backgroundColor: 'rgba(255, 255, 255, 0.25)' },
    bellDot: {
      position: 'absolute', top: 11, right: 12, width: 8, height: 8,
      borderRadius: radius.full, backgroundColor: colors.accent[500], // orange dot badge
      borderWidth: 1.5, borderColor: colors.primary[600],
    },
    searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    searchBar: {
      flex: 1, flexDirection: 'row', alignItems: 'center', height: 54,
      backgroundColor: colors.neutral[100], borderRadius: radius.full, // pill shaped
      paddingHorizontal: spacing.md,
      ...shadows.sm,
    },
    searchBarPressed: { transform: [{ scale: 0.99 }] },
    searchPlaceholder: {
      flex: 1, marginLeft: spacing.sm, fontSize: typography.sizes.md,
      color: colors.neutral[500], fontFamily: typography.fontFamilyRegular,
    },
    filterBtn: {
      width: 54, height: 54, borderRadius: radius.full,
      backgroundColor: colors.accent[500], alignItems: 'center', justifyContent: 'center', // active state accent color
      ...shadows.md,
    },
    filterBtnPressed: { backgroundColor: '#FF8C5A' },
    
    // Stats Block
    statsRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: colors.neutral[100], marginHorizontal: spacing.lg, marginTop: spacing.md,
      paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.xl,
      borderWidth: 1, borderColor: colors.neutral[200],
      ...shadows.md,
    },
    statItem: { flex: 1, alignItems: 'center' },
    statValue: {
      fontSize: typography.sizes.lg, fontWeight: '800', color: colors.primary[600],
      fontFamily: typography.fontFamilyBold,
    },
    statLabel: {
      fontSize: 11, color: colors.neutral[500], marginTop: 2,
      fontFamily: typography.fontFamilyRegular, textAlign: 'center',
    },
    statDivider: { width: 1, height: 32, backgroundColor: colors.neutral[200] },
    
    // Sections & Headers
    section: { marginTop: spacing.xl },
    sectionHeader: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: spacing.lg, marginBottom: spacing.md,
    },
    groupTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    groupIconWrap: {
      width: 38, height: 38, borderRadius: 10,
      alignItems: 'center', justifyContent: 'center',
    },
    sectionTitle: {
      fontSize: typography.sizes.lg, fontWeight: '800', color: colors.neutral[900],
      fontFamily: typography.fontFamilyBold, paddingHorizontal: spacing.lg, marginBottom: spacing.md,
    },
    sectionTitleInline: {
      fontSize: typography.sizes.lg, fontWeight: '800', color: colors.neutral[900],
      fontFamily: typography.fontFamilyBold,
    },
    viewAllText: {
      fontSize: typography.sizes.sm, color: colors.accent[500], fontWeight: '700', // orange color for CTA links
      fontFamily: typography.fontFamilyMedium,
    },
    
    // Quick Actions Section
    quickRow: { flexDirection: 'row', paddingHorizontal: spacing.md, gap: spacing.xs },
    servicesGrid: { 
      flexDirection: 'row', 
      flexWrap: 'wrap', 
      paddingHorizontal: spacing.lg, 
      backgroundColor: colors.neutral[100], 
      borderRadius: radius.xl,
      paddingVertical: spacing.lg,
      marginHorizontal: spacing.lg,
      borderWidth: 1,
      borderColor: colors.neutral[200],
      ...shadows.sm,
    },
    serviceItem: { width: (width - spacing.lg * 4) / 4, alignItems: 'center', marginBottom: spacing.md },
    serviceItemPressed: { transform: [{ scale: 0.95 }] },
    serviceIcon: {
      width: 58, height: 58, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center',
      marginBottom: spacing.xs,
      ...shadows.sm,
    },
    serviceName: {
      fontSize: 11, fontWeight: '600', color: colors.neutral[900],
      textAlign: 'center', fontFamily: typography.fontFamilyMedium, lineHeight: 14,
    },
    
    // Popular Cards list
    popularScroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
    popularCard: {
      width: 200, backgroundColor: colors.neutral[100], borderRadius: radius.xl, // rounded corners 22-28px
      marginRight: spacing.md, overflow: 'hidden',
      borderWidth: 1, borderColor: colors.neutral[200],
      ...shadows.md,
    },
    popularImageWrap: { width: '100%', height: 120, position: 'relative' },
    popularImage: { width: '100%', height: '100%' },
    popularRatingBadge: {
      position: 'absolute', top: spacing.sm, left: spacing.sm, flexDirection: 'row', alignItems: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 3, gap: 3,
      ...shadows.sm,
    },
    popularRatingText: {
      fontSize: 11, fontWeight: '700', color: colors.neutral[900], fontFamily: typography.fontFamilyBold,
    },
    popularHeartBtn: {
      position: 'absolute', top: spacing.sm, right: spacing.sm, width: 32, height: 32,
      borderRadius: radius.full, backgroundColor: 'rgba(255, 255, 255, 0.9)', alignItems: 'center', justifyContent: 'center',
      ...shadows.sm,
    },
    popularBody: { padding: spacing.md },
    popularName: {
      fontSize: typography.sizes.sm, fontWeight: '700', color: colors.neutral[900],
      marginBottom: 2, fontFamily: typography.fontFamilyBold,
    },
    popularSubtitle: {
      fontSize: 11, color: colors.neutral[500],
      fontFamily: typography.fontFamilyRegular, marginBottom: spacing.md,
    },
    popularFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    popularBookBtn: {
      backgroundColor: colors.accent[500], paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.full, alignSelf: 'flex-start',
      ...shadows.sm,
    },
    popularBookBtnText: {
      fontSize: 11, fontWeight: '700', color: colors.neutral[100], fontFamily: typography.fontFamilyBold,
    },
    
    // How It Works
    howItWorksRow: { flexDirection: 'row', paddingHorizontal: spacing.lg, alignItems: 'flex-start' },
    howItWorksConnector: { flex: 1, height: 2, backgroundColor: colors.neutral[200], marginTop: 28 },
    
    // Trust Row
    trustRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: colors.neutral[100], marginHorizontal: spacing.lg, marginTop: spacing.xl,
      paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderRadius: radius.xl,
      borderWidth: 1, borderColor: colors.neutral[200], ...shadows.sm,
    },
    trustItem: { flex: 1, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
    trustText: {
      fontSize: 11, color: colors.neutral[900], fontWeight: '600',
      fontFamily: typography.fontFamilyMedium,
    },
    trustDivider: { width: 1, height: 20, backgroundColor: colors.neutral[200] },
    
    // Refer Section
    referCard: {
      flexDirection: 'row', backgroundColor: colors.primary[600], borderRadius: radius.xl,
      marginHorizontal: spacing.lg, padding: spacing.lg, alignItems: 'center', justifyContent: 'space-between',
      overflow: 'hidden', position: 'relative',
      ...shadows.md,
    },
    referLeft: { flexDirection: 'row', gap: spacing.md, flex: 1, alignItems: 'center' },
    referIconWrap: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
    referTextWrap: { flex: 1 },
    referTitle: { fontSize: typography.sizes.md, fontWeight: '700', color: colors.neutral[100], fontFamily: typography.fontFamilyBold },
    referDesc: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2, fontFamily: typography.fontFamilyRegular },
    referCta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm },
    referCtaText: { fontSize: 12, color: '#FF8C5A', fontWeight: '700' },
    referRight: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md },
    referAmount: { fontSize: typography.sizes.lg, fontWeight: '800', color: '#FF8C5A' },
    
    // Search Modal
    searchModal: { flex: 1, backgroundColor: colors.neutral[50] },
    searchHeader: {
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md,
      paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.neutral[200], backgroundColor: colors.neutral[100],
    },
    searchBackBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    searchInputWrap: {
      flex: 1, flexDirection: 'row', alignItems: 'center', height: 46,
      backgroundColor: colors.neutral[50], borderRadius: radius.full, paddingHorizontal: spacing.md, marginLeft: spacing.xs,
    },
    searchInput: {
      flex: 1, marginLeft: spacing.sm, fontSize: typography.sizes.md, color: colors.neutral[900],
      fontFamily: typography.fontFamilyRegular,
    },
    searchEmptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
    searchEmptyTitle: { fontSize: typography.sizes.lg, fontWeight: '700', color: colors.neutral[900], marginTop: spacing.md },
    searchEmptyDesc: { fontSize: typography.sizes.sm, color: colors.neutral[500], marginTop: spacing.xs, textAlign: 'center' },
    searchResultsList: { padding: spacing.lg },
    searchResult: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md },
    searchResultIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
    searchResultText: { flex: 1 },
    searchResultLabel: { fontSize: typography.sizes.md, fontWeight: '700', color: colors.neutral[900] },
    searchResultSubtitle: { fontSize: typography.sizes.xs, color: colors.neutral[500], marginTop: 2 },
    searchResultDivider: { height: 1, backgroundColor: colors.neutral[200], marginVertical: spacing.xs },
  });

  if (loading) return <LoadingState label={t('loading')} />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  const groupThemes: Record<string, { bg: string; fg: string }> = {
    blue: { bg: 'rgba(51, 78, 104, 0.08)', fg: colors.primary[600] },
    teal: { bg: 'rgba(51, 78, 104, 0.08)', fg: colors.primary[600] },
    amber: { bg: 'rgba(51, 78, 104, 0.08)', fg: colors.primary[600] },
  };
  const DEFAULT_THEME = groupThemes.blue;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary[600]} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent[500]} colors={[colors.accent[500]]} />}
        style={styles.scroll}
      >
        {/* Welcome Section Header */}
        <View style={styles.heroBlock}>
          <View style={styles.heroCircle1} />
          <View style={styles.heroCircle2} />
          <View style={styles.heroTop}>
            <View style={styles.heroLeft}>
              <Text style={styles.locationLabel}>Location</Text>
              <TouchableOpacity style={styles.locationRow} activeOpacity={0.7}>
                <MapPin size={16} color={colors.neutral[100]} strokeWidth={2.5} />
                <Text style={styles.locationText}>Thrissur, Kerala</Text>
                <ChevronRight size={16} color={colors.neutral[100]} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
            <View style={styles.heroIcons}>
              <Pressable
                style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
                onPress={() => router.push('/(tabs)/bookings')}
              >
                <Bell size={20} color={colors.neutral[100]} strokeWidth={2.2} />
                <View style={styles.bellDot} />
              </Pressable>
            </View>
          </View>

          {/* Pill Search Bar */}
          <View style={styles.searchRow}>
            <Pressable
              style={({ pressed }) => [styles.searchBar, pressed && styles.searchBarPressed]}
              onPress={() => setSearchOpen(true)}
            >
              <Search size={20} color={colors.neutral[500]} strokeWidth={2.2} />
              <Text style={styles.searchPlaceholder}>{t('searchServices')}</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.filterBtn, pressed && styles.filterBtnPressed]}
              onPress={() => setSearchOpen(true)}
            >
              <SlidersHorizontal size={20} color={colors.neutral[100]} strokeWidth={2.2} />
            </Pressable>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('quickActions')}</Text>
          <View style={styles.quickRow}>
            <QuickAction icon={Siren} label={t('emergency')} desc={t('emergencyDesc')} onPress={() => setSearchOpen(true)} />
            <QuickAction icon={CalendarClock} label={t('scheduleService')} desc={t('scheduleDesc')} onPress={() => setSearchOpen(true)} />
            <QuickAction icon={Navigation} label={t('trackService')} desc={t('trackDesc')} onPress={() => router.push('/(tabs)/bookings?tab=ongoing')} />
            <QuickAction icon={RefreshCw} label={t('rebookService')} desc={t('rebookDesc')} onPress={() => router.push('/(tabs)/bookings?tab=completed')} />
          </View>
        </View>

        {/* Categories Section */}
        {groups.map((group) => {
          const groupCats = categoriesByGroup[group.id] || [];
          if (groupCats.length === 0) return null;
          const theme = groupThemes[group.color_theme] || DEFAULT_THEME;
          const groupName = lang === 'ml' ? group.name_ml : group.name_en;
          return (
            <View key={group.id} style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.groupTitleRow}>
                  <View style={[styles.groupIconWrap, { backgroundColor: theme.bg }]}>
                    <GroupIcon name={group.icon_name} color={theme.fg} />
                  </View>
                  <Text style={styles.sectionTitleInline}>{groupName}</Text>
                </View>
                <TouchableOpacity onPress={() => router.push(`/category-group/${group.id}`)} activeOpacity={0.6}>
                  <Text style={styles.viewAllText}>{t('viewAll')}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.servicesGrid}>
                {groupCats.map((cat) => {
                  const Icon = iconMap[cat.icon_name] || Wrench;
                  return (
                    <Pressable
                      key={cat.id}
                      style={({ pressed }) => [styles.serviceItem, pressed && styles.serviceItemPressed]}
                      onPress={() => router.push(`/category/${cat.id}`)}
                    >
                      <View style={[styles.serviceIcon, { backgroundColor: theme.bg }]}>
                        <Icon size={24} color={theme.fg} strokeWidth={1.8} />
                      </View>
                      <Text style={styles.serviceName} numberOfLines={2}>
                        {lang === 'ml' ? cat.name_ml : cat.name_en}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}

        {/* Popular Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitleInline}>{t('popularNearYou')}</Text>
            <TouchableOpacity onPress={() => router.push('/category-group/all')} activeOpacity={0.6}>
              <Text style={styles.viewAllText}>{t('viewAll')}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.popularScroll}>
            {categories.map((cat) => {
              const imageUri = serviceImages[cat.icon_name] || serviceImages.Wrench;
              const isFav = !!favorites[cat.id];
              return (
                <TouchableOpacity
                  key={`popular-${cat.id}`}
                  style={styles.popularCard}
                  onPress={() => router.push(`/category/${cat.id}`)}
                  activeOpacity={0.9}
                >
                  <View style={styles.popularImageWrap}>
                    <Image source={{ uri: imageUri }} style={styles.popularImage} resizeMode="cover" />
                    <View style={styles.popularRatingBadge}>
                      <Star size={11} color="#FF8C5A" fill="#FF8C5A" strokeWidth={0} />
                      <Text style={styles.popularRatingText}>4.8</Text>
                    </View>
                    <Pressable
                      style={styles.popularHeartBtn}
                      onPress={() => toggleFavorite(cat.id)}
                      hitSlop={6}
                    >
                      <Heart
                        size={16}
                        color={isFav ? '#F44336' : colors.neutral[500]}
                        fill={isFav ? '#F44336' : 'transparent'}
                        strokeWidth={2}
                      />
                    </Pressable>
                  </View>
                  <View style={styles.popularBody}>
                    <Text style={styles.popularName} numberOfLines={1}>
                      {lang === 'ml' ? cat.name_ml : cat.name_en}
                    </Text>
                    <Text style={styles.popularSubtitle}>Trusted Provider</Text>
                    <View style={styles.popularFooter}>
                      <TouchableOpacity
                        style={styles.popularBookBtn}
                        activeOpacity={0.85}
                        onPress={() => router.push(`/category/${cat.id}`)}
                      >
                        <Text style={styles.popularBookBtnText}>{t('bookNow')}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* How It Works */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('howItWorks')}</Text>
          <View style={styles.howItWorksRow}>
            <HowItWorksStep num="1" title={t('step1Title')} desc={t('step1Desc')} icon={Search} />
            <View style={styles.howItWorksConnector} />
            <HowItWorksStep num="2" title={t('step2Title')} desc={t('step2Desc')} icon={CalendarClock} />
            <View style={styles.howItWorksConnector} />
            <HowItWorksStep num="3" title={t('step3Title')} desc={t('step3Desc')} icon={Navigation} />
          </View>
        </View>

        {/* Trust Indicators */}
        <View style={styles.trustRow}>
          <View style={styles.trustItem}>
            <ShieldCheck size={20} color={colors.primary[600]} strokeWidth={2.2} />
            <Text style={styles.trustText}>Verified</Text>
          </View>
          <View style={styles.trustDivider} />
          <View style={styles.trustItem}>
            <BadgeCheck size={20} color="#FF8C5A" strokeWidth={2.2} />
            <Text style={styles.trustText}>BG Checked</Text>
          </View>
          <View style={styles.trustDivider} />
          <View style={styles.trustItem}>
            <Star size={20} color={colors.accent[500]} fill={colors.accent[500]} strokeWidth={0} />
            <Text style={styles.trustText}>4.9 Rated</Text>
          </View>
        </View>

        {/* Refer & Earn */}
        <View style={styles.section}>
          <View style={styles.referCard}>
            <View style={styles.referLeft}>
              <View style={styles.referIconWrap}>
                <Gift size={22} color={colors.neutral[100]} strokeWidth={2} />
              </View>
              <View style={styles.referTextWrap}>
                <Text style={styles.referTitle}>{t('referEarn')}</Text>
                <Text style={styles.referDesc}>{t('referEarnDesc')}</Text>
                <TouchableOpacity style={styles.referCta} activeOpacity={0.85}>
                  <Text style={styles.referCtaText}>{t('inviteFriends')}</Text>
                  <ArrowRight size={14} color="#FF8C5A" strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.referRight}>
              <Text style={styles.referAmount}>₹100</Text>
            </View>
          </View>
        </View>

        {/* Stats Row Card */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>12K+</Text>
            <Text style={styles.statLabel}>{t('jobsBooked')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>8K+</Text>
            <Text style={styles.statLabel}>{t('happyCustomers')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>4.9</Text>
            <Text style={styles.statLabel}>{t('avgRating')}</Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Search Modal */}
      <Modal
        visible={searchOpen}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setSearchOpen(false)}
      >
        <SafeAreaView style={styles.searchModal} edges={['top']}>
          <View style={styles.searchHeader}>
            <TouchableOpacity style={styles.searchBackBtn} onPress={() => setSearchOpen(false)} activeOpacity={0.6}>
              <X size={22} color={colors.neutral[500]} strokeWidth={2.2} />
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
              <Search size={48} color={colors.neutral[200]} strokeWidth={1.5} />
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
              ItemSeparatorComponent={() => <View style={styles.searchResultDivider} />}
              renderItem={({ item }) => {
                const Icon = iconMap[item.icon] || Wrench;
                return (
                  <TouchableOpacity
                    style={styles.searchResult}
                    activeOpacity={0.7}
                    onPress={() => goToCategory(item.categoryId)}
                  >
                    <View style={[styles.searchResultIcon, { backgroundColor: DEFAULT_THEME.bg }]}>
                      <Icon size={20} color={DEFAULT_THEME.fg} strokeWidth={1.8} />
                    </View>
                    <View style={styles.searchResultText}>
                      <Text style={styles.searchResultLabel}>{item.label}</Text>
                      <Text style={styles.searchResultSubtitle}>{item.subtitle}</Text>
                    </View>
                    <ChevronRight size={18} color={colors.neutral[500]} strokeWidth={2} />
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function GroupIcon({ name, color }: { name: string; color: string }) {
  const props = { size: 18, color, strokeWidth: 2 };
  switch (name) {
    case 'Wrench': return <Wrench {...props} />;
    case 'Car': return <Car {...props} />;
    case 'GraduationCap': return <GraduationCap {...props} />;
    case 'Sparkles': return <Sparkles {...props} />;
    case 'Heart': return <Heart {...props} />;
    default: return <Wrench {...props} />;
  }
}

function QuickAction({ icon: Icon, label, desc, onPress }: {
  icon: any; label: string; desc: string; onPress: () => void;
}) {
  const styles = StyleSheet.create({
    quickCard: {
      flex: 1, backgroundColor: colors.neutral[100], borderRadius: radius.xl,
      padding: spacing.md, alignItems: 'center',
      borderWidth: 1, borderColor: colors.neutral[200],
      ...shadows.sm,
    },
    quickCardPressed: { transform: [{ scale: 0.96 }] },
    quickIcon: {
      width: 48, height: 48, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center',
      marginBottom: spacing.xs, backgroundColor: 'rgba(255, 140, 90, 0.12)',
    },
    quickLabel: {
      fontSize: 11, fontWeight: '700', color: colors.neutral[900],
      fontFamily: typography.fontFamilyBold, textAlign: 'center',
    },
    quickDesc: {
      fontSize: 9, color: colors.neutral[500], fontFamily: typography.fontFamilyRegular,
      textAlign: 'center', marginTop: 2,
    },
  });
  return (
    <Pressable style={({ pressed }) => [styles.quickCard, pressed && styles.quickCardPressed]} onPress={onPress}>
      <View style={styles.quickIcon}>
        <Icon size={20} color={colors.accent[500]} strokeWidth={2} />
      </View>
      <Text style={styles.quickLabel} numberOfLines={1}>{label}</Text>
      <Text style={styles.quickDesc} numberOfLines={1}>{desc}</Text>
    </Pressable>
  );
}

function HowItWorksStep({ num, title, desc, icon: Icon }: {
  num: string; title: string; desc: string; icon: any;
}) {
  const styles = StyleSheet.create({
    howItWorksStep: { flex: 1, alignItems: 'center', paddingHorizontal: spacing.xs },
    howItWorksIconWrap: {
      width: 56, height: 56, borderRadius: radius.full, backgroundColor: 'rgba(51, 78, 104, 0.08)',
      alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm,
      borderWidth: 1.5, borderColor: colors.primary[600],
      position: 'relative',
    },
    howItWorksNum: {
      position: 'absolute', top: -4, right: -4, width: 22, height: 22, borderRadius: radius.full,
      backgroundColor: colors.accent[500], alignItems: 'center', justifyContent: 'center',
      borderWidth: 2, borderColor: colors.neutral[50],
    },
    howItWorksNumText: {
      fontSize: 11, fontWeight: '700', color: colors.neutral[100], fontFamily: typography.fontFamilyBold,
    },
    howItWorksTitle: {
      fontSize: typography.sizes.xs, fontWeight: '700', color: colors.neutral[900],
      textAlign: 'center', marginBottom: 4, fontFamily: typography.fontFamilyBold,
    },
    howItWorksDesc: {
      fontSize: 10, color: colors.neutral[500], textAlign: 'center',
      fontFamily: typography.fontFamilyRegular, lineHeight: 14,
    },
  });
  return (
    <View style={styles.howItWorksStep}>
      <View style={styles.howItWorksIconWrap}>
        <Icon size={20} color={colors.primary[600]} strokeWidth={2} />
        <View style={styles.howItWorksNum}>
          <Text style={styles.howItWorksNumText}>{num}</Text>
        </View>
      </View>
      <Text style={styles.howItWorksTitle}>{title}</Text>
      <Text style={styles.howItWorksDesc}>{desc}</Text>
    </View>
  );
}
