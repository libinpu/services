import React, { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Bell, ChevronRight, Clock3, MapPin, Search, ShieldCheck, Sparkles, Star, Wrench } from 'lucide-react-native';
import { colors, radius, shadows, spacing, typography } from '@/lib/theme';
import { useAuth } from '@/lib/auth-context';

const services = [
  { title: 'Home repair', subtitle: 'Fixes, installs, and more', image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&auto=format&fit=crop&q=80' },
  { title: 'Cleaning', subtitle: 'A calmer home, on demand', image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&auto=format&fit=crop&q=80' },
  { title: 'Beauty & wellness', subtitle: 'Care that comes to you', image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=80' },
];

const providers = [
  { name: 'Maya Thomas', service: 'Home cleaning', rating: '4.9', price: '₹650', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80' },
  { name: 'Arjun Menon', service: 'AC service', rating: '4.8', price: '₹499', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [location] = useState('Kakkanad, Kochi');
  const firstName = profile?.full_name?.split(' ')[0] || 'there';

  const styles = useMemo(() => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.neutral[50] },
    content: { paddingHorizontal: spacing.lg, paddingBottom: 112 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing.md, paddingBottom: spacing.lg },
    eyebrow: { color: colors.neutral[500], fontSize: 12, fontFamily: typography.fontFamilyMedium, letterSpacing: 1.2, textTransform: 'uppercase' },
    greeting: { color: colors.neutral[800], fontSize: 27, lineHeight: 33, fontFamily: typography.fontFamilyBold, marginTop: 3 },
    iconButton: { width: 42, height: 42, borderRadius: radius.full, backgroundColor: colors.neutral[100], alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.neutral[200] },
    location: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.lg },
    locationText: { color: colors.neutral[700], fontSize: 13, fontFamily: typography.fontFamilyMedium },
    hero: { minHeight: 194, backgroundColor: colors.primary[600], borderRadius: 28, padding: spacing.lg, overflow: 'hidden', justifyContent: 'space-between', ...shadows.md },
    heroKicker: { color: '#DCEAE2', fontSize: 12, fontFamily: typography.fontFamilyMedium, letterSpacing: 1.4, textTransform: 'uppercase' },
    heroTitle: { maxWidth: 260, color: '#FFFDF8', fontSize: 26, lineHeight: 31, fontFamily: typography.fontFamilyBold, marginTop: 10 },
    heroCopy: { maxWidth: 245, color: '#C4D7CE', fontSize: 13, lineHeight: 19, fontFamily: typography.fontFamilyRegular, marginTop: 8 },
    heroButton: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#D8B76B', paddingHorizontal: 15, paddingVertical: 11, borderRadius: radius.full, marginTop: 17 },
    heroButtonText: { color: colors.neutral[900], fontSize: 13, fontFamily: typography.fontFamilyBold },
    heroMark: { position: 'absolute', right: -22, bottom: -28, width: 155, height: 155, borderRadius: 80, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 28, marginBottom: 13 },
    sectionTitle: { color: colors.neutral[800], fontSize: 18, fontFamily: typography.fontFamilyBold },
    seeAll: { color: colors.primary[500], fontSize: 13, fontFamily: typography.fontFamilyBold },
    search: { backgroundColor: colors.neutral[100], borderColor: colors.neutral[200], borderWidth: 1, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
    searchText: { color: colors.neutral[400], fontSize: 14, fontFamily: typography.fontFamilyRegular },
    serviceRow: { gap: 12 },
    serviceCard: { width: 154, backgroundColor: colors.neutral[100], borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: colors.neutral[200] },
    serviceImage: { width: '100%', height: 98 },
    serviceBody: { padding: 12 },
    serviceTitle: { color: colors.neutral[800], fontSize: 14, fontFamily: typography.fontFamilyBold },
    serviceSubtitle: { color: colors.neutral[500], fontSize: 11, lineHeight: 16, marginTop: 4, fontFamily: typography.fontFamilyRegular },
    providerCard: { flexDirection: 'row', backgroundColor: colors.neutral[100], borderRadius: 20, padding: 12, alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: colors.neutral[200] },
    avatar: { width: 54, height: 54, borderRadius: 18 },
    providerInfo: { flex: 1, marginLeft: 12 },
    providerName: { color: colors.neutral[800], fontSize: 14, fontFamily: typography.fontFamilyBold },
    providerService: { color: colors.neutral[500], fontSize: 12, marginTop: 3, fontFamily: typography.fontFamilyRegular },
    providerMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 7 },
    rating: { color: colors.neutral[700], fontSize: 11, fontFamily: typography.fontFamilyMedium },
    price: { color: colors.primary[500], fontSize: 14, fontFamily: typography.fontFamilyBold },
    trust: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: colors.primary[50], borderRadius: 16, padding: 14, marginTop: 18 },
    trustText: { flex: 1, color: colors.primary[700], fontSize: 12, lineHeight: 17, fontFamily: typography.fontFamilyMedium },
  }), []);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View><Text style={styles.eyebrow}>Good morning</Text><Text style={styles.greeting}>Hello, {firstName}</Text></View>
          <Pressable accessibilityLabel="Notifications" style={styles.iconButton} onPress={() => router.push('/notifications' as never)}><Bell size={20} color={colors.neutral[700]} strokeWidth={1.8} /></Pressable>
        </View>
        <Pressable style={styles.location} onPress={() => router.push('/location-setup')}><MapPin size={15} color={colors.primary[500]} /><Text style={styles.locationText}>{location}</Text><ChevronRight size={14} color={colors.neutral[400]} /></Pressable>
        <View style={styles.hero}><View style={styles.heroMark} /><View><Text style={styles.heroKicker}>BEIGE care</Text><Text style={styles.heroTitle}>Your home, in good hands.</Text><Text style={styles.heroCopy}>Trusted professionals for the things that make life feel lighter.</Text></View><Pressable style={styles.heroButton} onPress={() => router.push('/category-group/home-repair' as never)}><Text style={styles.heroButtonText}>Explore services</Text><ChevronRight size={16} color={colors.neutral[900]} /></Pressable></View>
        <Pressable style={styles.search} onPress={() => router.push('/search' as never)}><Search size={18} color={colors.neutral[400]} /><Text style={styles.searchText}>What do you need help with?</Text></Pressable>
        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Browse services</Text><Pressable onPress={() => router.push('/categories' as never)}><Text style={styles.seeAll}>See all</Text></Pressable></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.serviceRow}>{services.map((service) => <Pressable key={service.title} style={styles.serviceCard} onPress={() => router.push('/category-group/home-repair' as never)}><Image source={{ uri: service.image }} style={styles.serviceImage} /><View style={styles.serviceBody}><Text style={styles.serviceTitle}>{service.title}</Text><Text style={styles.serviceSubtitle}>{service.subtitle}</Text></View></Pressable>)}</ScrollView>
        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Recommended near you</Text><Pressable onPress={() => router.push('/providers' as never)}><Text style={styles.seeAll}>See all</Text></Pressable></View>
        {providers.map((provider) => <Pressable key={provider.name} style={styles.providerCard} onPress={() => router.push('/provider/demo' as never)}><Image source={{ uri: provider.image }} style={styles.avatar} /><View style={styles.providerInfo}><Text style={styles.providerName}>{provider.name}</Text><Text style={styles.providerService}>{provider.service}</Text><View style={styles.providerMeta}><Star size={12} color="#B48A3C" fill="#B48A3C" /><Text style={styles.rating}>{provider.rating} · Verified</Text></View></View><Text style={styles.price}>{provider.price}</Text></Pressable>)}
        <View style={styles.trust}><ShieldCheck size={20} color={colors.primary[500]} /><Text style={styles.trustText}>Every BEIGE professional is background-checked and reviewed by our community.</Text></View>
      </ScrollView>
    </SafeAreaView>
  );
}
