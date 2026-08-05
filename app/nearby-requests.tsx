import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, Pressable, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useLanguage } from '@/lib/language-context';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { colors, spacing, radius, typography, shadows } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';
import { Header, LoadingState, ErrorState } from '@/components/ui';
import { haversineKm, estimateEtaMins, formatDistance, formatEta } from '@/lib/distance';
import { useProviderLocation, updateProviderLocationInDb } from '@/lib/use-provider-location';
import type { BookingWithDetails, ProviderWithProfile } from '@/lib/types';
import { MapPin, Clock, Navigation, Check, X, Briefcase, Ruler, Star, ArrowLeft, CircleAlert as AlertCircle } from 'lucide-react-native';

interface NearbyRequest extends BookingWithDetails {
  _distanceKm: number | null;
  _etaMins: number | null;
}

export default function NearbyRequestsScreen() {
  const { t, lang } = useLanguage();
  const { session, loading: authLoading } = useAuth();
  const router = useRouter();
  const { isDark } = useTheme();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requests, setRequests] = useState<NearbyRequest[]>([]);
  const [providerProfile, setProviderProfile] = useState<ProviderWithProfile | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<NearbyRequest | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const requestsFetchingRef = useRef(false);
  const liveLocation = useProviderLocation(true);
  const liveLocRef = useRef<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });
  const lastSyncedLocationRef = useRef<{ lat: number; lng: number } | null>(null);
  const dbSyncRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    liveLocRef.current = { lat: liveLocation.latitude, lng: liveLocation.longitude };
  }, [liveLocation]);

  // Periodically sync live location to the database so other screens see it too
  useEffect(() => {
    if (!session?.user?.id) return;
    dbSyncRef.current = setInterval(async () => {
      const { lat, lng } = liveLocRef.current;
      const previous = lastSyncedLocationRef.current;
      const moved = !previous || Math.abs(previous.lat - lat!) > 0.0001 || Math.abs(previous.lng - lng!) > 0.0001;
      if (lat != null && lng != null && moved) {
        await updateProviderLocationInDb(supabase, session.user.id, lat, lng);
        lastSyncedLocationRef.current = { lat, lng };
      }
    }, 20000);
    return () => { if (dbSyncRef.current) clearInterval(dbSyncRef.current); };
  }, [session?.user?.id]);

  const fetchRequests = useCallback(async () => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }
    if (requestsFetchingRef.current) return;
    requestsFetchingRef.current = true;
    try {
      setError(null);

      // Get provider profile with location + category_ids
      const provRes = await supabase
        .from('profiles')
        .select('*, provider_profile:provider_profiles(*)')
        .eq('id', session.user.id)
        .maybeSingle();

      if (provRes.data) {
        const pp = provRes.data as ProviderWithProfile;
        setProviderProfile(pp);
        const providerProfileData = (provRes.data as any).provider_profile;
        if (!providerProfileData) {
          setLoading(false);
          requestsFetchingRef.current = false;
          return;
        }

        const categoryIds: string[] = providerProfileData.category_ids || [];
        // Prefer live GPS location; fall back to stored DB location
        const provLat = liveLocRef.current.lat ?? providerProfileData.latitude;
        const provLon = liveLocRef.current.lng ?? providerProfileData.longitude;

        // Get all pending bookings that either have no provider assigned yet,
        // or are assigned to this provider (so they can accept from here too)
        const bookingRes = await supabase
          .from('bookings')
          .select('*, subcategory:service_subcategories(id, name_en, name_ml, category_id), address:addresses(id, label, address_line, area, district, latitude, longitude)')
          .eq('status', 'pending')
          .or(`provider_id.is.null,provider_id.eq.${session.user.id}`)
          .order('created_at', { ascending: false })
          .limit(30);

        if (bookingRes.data) {
          // Filter to bookings whose subcategory's category_id matches one of the provider's categories
          const matched = (bookingRes.data as BookingWithDetails[]).filter((b) => {
            const catId = b.subcategory?.category_id;
            if (!catId) return false;
            return categoryIds.includes(catId);
          });

          // Compute distance + ETA for each
          const withDistance: NearbyRequest[] = matched.map((b) => {
            const custLat = b.address?.latitude;
            const custLon = b.address?.longitude;
            let dist: number | null = null;
            let eta: number | null = null;
            if (provLat != null && provLon != null && custLat != null && custLon != null) {
              dist = haversineKm(provLat, provLon, custLat, custLon);
              eta = estimateEtaMins(dist);
            }
            return { ...b, _distanceKm: dist, _etaMins: eta };
          });

          // Sort by distance (closest first); nulls go last
          withDistance.sort((a, b) => {
            if (a._distanceKm == null && b._distanceKm == null) return 0;
            if (a._distanceKm == null) return 1;
            if (b._distanceKm == null) return -1;
            return a._distanceKm - b._distanceKm;
          });

          setRequests(withDistance);
        }
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load requests');
    } finally {
      requestsFetchingRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (authLoading) return;
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }

    void fetchRequests();
  }, [authLoading, session?.user?.id, fetchRequests]);

  useEffect(() => {
    if (!session?.user?.id) return;
    // One scoped channel replaces the old 8-second list poll. The in-flight
    // guard in fetchRequests coalesces bursts of booking events.
    const channel = supabase
      .channel(`nearby-pending-bookings:${session.user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: 'status=eq.pending' }, () => {
        void fetchRequests();
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [session?.user?.id, fetchRequests]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchRequests();
  };

  const handleAccept = async (jobId: string, distanceKm: number | null, etaMins: number | null) => {
    setActionLoading(true);
    try {
      await supabase.from('bookings').update({
        status: 'accepted',
        provider_id: session?.user?.id,
        distance_km: distanceKm,
        estimated_eta_mins: etaMins,
        updated_at: new Date().toISOString(),
      }).eq('id', jobId);
      setShowModal(false);
      router.push(`/provider-job/${jobId}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (jobId: string) => {
    setActionLoading(true);
    try {
      // If the booking was assigned to this provider, reject it.
      // If it was unassigned (broadcast), just remove it from the provider's view by ignoring.
      await supabase.from('bookings').update({
        status: 'rejected',
        updated_at: new Date().toISOString(),
      }).eq('id', jobId).eq('provider_id', session?.user?.id);
      setShowModal(false);
      fetchRequests();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const openDetail = (req: NearbyRequest) => {
    setSelectedRequest(req);
    setShowModal(true);
  };

  const pp = providerProfile?.provider_profile;
  const hasLocation = (liveLocation.latitude != null && liveLocation.longitude != null) || (pp?.latitude != null && pp?.longitude != null);

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.neutral[50] },
    scroll: { flex: 1 },
    headerBanner: {
      backgroundColor: colors.primary[700],
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    headerBannerTitle: { fontSize: typography.sizes.lg, fontWeight: '700', color: colors.neutral[0], fontFamily: typography.fontFamilyBold },
    headerBannerSub: { fontSize: typography.sizes.sm, color: 'rgba(255,255,255,0.85)', marginTop: 2, fontFamily: typography.fontFamilyRegular },
    locationAlert: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: colors.warning[50], borderRadius: radius.md,
      paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
      marginHorizontal: spacing.md, marginTop: spacing.md,
    },
    locationAlertText: { flex: 1, fontSize: typography.sizes.sm, color: colors.warning[700], fontWeight: '600', fontFamily: typography.fontFamilyMedium },
    locationAlertBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full, backgroundColor: colors.warning[100] },
    locationAlertBtnText: { fontSize: typography.sizes.xs, fontWeight: '700', color: colors.warning[700], fontFamily: typography.fontFamilyBold },
    requestCard: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: colors.neutral[100], borderRadius: radius.lg,
      padding: spacing.md, marginHorizontal: spacing.md, marginBottom: spacing.sm,
      ...shadows.sm,
    },
    cardLeft: { flex: 1 },
    cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
    cardService: { fontSize: typography.sizes.md, fontWeight: '700', color: colors.neutral[700], fontFamily: typography.fontFamilyBold, flex: 1 },
    distanceBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 3,
      backgroundColor: colors.primary[50], borderRadius: radius.full,
      paddingHorizontal: spacing.sm, paddingVertical: 2,
    },
    distanceText: { fontSize: 11, fontWeight: '700', color: colors.primary[700], fontFamily: typography.fontFamilyBold },
    cardAddress: { fontSize: typography.sizes.sm, color: colors.neutral[500], lineHeight: 18, fontFamily: typography.fontFamilyRegular },
    cardMetaRow: { flexDirection: 'row', gap: spacing.md, marginTop: 6 },
    cardMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    cardMetaText: { fontSize: typography.sizes.xs, color: colors.neutral[400], fontFamily: typography.fontFamilyRegular },
    cardEtaText: { fontSize: typography.sizes.xs, fontWeight: '700', color: colors.success[600], fontFamily: typography.fontFamilyBold },
    cardActions: { flexDirection: 'row', gap: spacing.xs, marginLeft: spacing.sm },
    acceptBtn: { width: 40, height: 40, borderRadius: radius.full, backgroundColor: colors.primary[600], alignItems: 'center', justifyContent: 'center', ...shadows.sm },
    rejectBtn: { width: 40, height: 40, borderRadius: radius.full, backgroundColor: colors.neutral[200], alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.neutral[300] },
    emptyState: { alignItems: 'center', padding: spacing.xxl, marginTop: spacing.xxl },
    emptyIcon: { width: 80, height: 80, borderRadius: radius.xl, backgroundColor: colors.neutral[100], alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
    emptyTitle: { fontSize: typography.sizes.lg, fontWeight: '700', color: colors.neutral[500], fontFamily: typography.fontFamilyBold },
    emptyDesc: { fontSize: typography.sizes.sm, color: colors.neutral[400], marginTop: spacing.xs, textAlign: 'center', fontFamily: typography.fontFamilyRegular },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalCard: { backgroundColor: colors.neutral[100], borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingBottom: spacing.xl },
    modalHandle: { width: 40, height: 4, borderRadius: radius.full, backgroundColor: colors.neutral[200], alignSelf: 'center', marginTop: spacing.sm, marginBottom: spacing.sm },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg },
    modalTitle: { fontSize: typography.sizes.xxl, fontWeight: '700', color: colors.neutral[700], fontFamily: typography.fontFamilyBold },
    modalCloseBtn: { width: 36, height: 36, borderRadius: radius.full, backgroundColor: colors.neutral[200], alignItems: 'center', justifyContent: 'center' },
    modalInfoCard: { backgroundColor: colors.neutral[200], borderRadius: radius.lg, padding: spacing.md, marginHorizontal: spacing.lg, marginTop: spacing.md },
    modalInfoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
    modalInfoText: { flex: 1, fontSize: typography.sizes.sm, color: colors.neutral[700], fontFamily: typography.fontFamilyMedium },
    modalDistanceRow: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: spacing.lg, marginTop: spacing.lg },
    modalDistanceItem: { alignItems: 'center' },
    modalDistanceIconWrap: { width: 48, height: 48, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
    modalDistanceValue: { fontSize: typography.sizes.xl, fontWeight: '700', color: colors.neutral[700], fontFamily: typography.fontFamilyBold },
    modalDistanceLabel: { fontSize: typography.sizes.xs, color: colors.neutral[400], marginTop: 2, fontFamily: typography.fontFamilyRegular },
    modalActions: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, marginTop: spacing.xl },
    modalRejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 52, borderRadius: radius.full, backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.error[600] },
    modalRejectText: { fontSize: typography.sizes.md, fontWeight: '700', color: colors.error[600], fontFamily: typography.fontFamilyBold },
    modalAcceptBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 52, borderRadius: radius.full, backgroundColor: colors.primary[600], ...shadows.md },
    modalAcceptText: { fontSize: typography.sizes.md, fontWeight: '700', color: colors.neutral[0], fontFamily: typography.fontFamilyBold },
  });

  if (loading) return <LoadingState label={t('loading')} />;
  if (error) return <ErrorState message={error} onRetry={fetchRequests} />;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Header title={lang === 'ml' ? 'അടുത്തുള്ള അഭ്യർത്ഥനകൾ' : 'Nearby Requests'} onBack={() => router.back()} />
      <View style={styles.headerBanner}>
        <Text style={styles.headerBannerTitle}>{lang === 'ml' ? 'നിങ്ങളുടെ സേവന മേഖലയിലെ അഭ്യർത്ഥനകൾ' : 'Requests in your service area'}</Text>
        <Text style={styles.headerBannerSub}>{requests.length} {lang === 'ml' ? 'തുറന്ന അഭ്യർത്ഥനകൾ' : 'open requests'}{hasLocation ? '' : ' — ' + (lang === 'ml' ? 'ദൂരം കാണിക്കാൻ ലൊക്കേഷൻ ഓൺ ചെയ്യൂ' : 'Turn on location to see distance')}</Text>
      </View>

      {!hasLocation && (
        <View style={styles.locationAlert}>
          <AlertCircle size={18} color={colors.warning[600]} strokeWidth={2} />
          <Text style={styles.locationAlertText}>{lang === 'ml' ? 'ദൂരവും ETA യും കാണിക്കാൻ ലൊക്കേഷൻ അപ്ഡേറ്റ് ചെയ്യൂ' : 'Update your location to see distance and ETA'}</Text>
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary[600]} colors={[colors.primary[600]]} />}
      >
        {requests.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Briefcase size={40} color={colors.neutral[300]} strokeWidth={1.5} />
            </View>
            <Text style={styles.emptyTitle}>{lang === 'ml' ? 'അടുത്തുള്ള അഭ്യർത്ഥനകളൊന്നുമില്ല' : 'No nearby requests'}</Text>
            <Text style={styles.emptyDesc}>{lang === 'ml' ? 'പുതിയ അഭ്യർത്ഥനകൾ ഇവിടെ ദൃശ്യമാകും' : 'New requests will appear here'}</Text>
          </View>
        ) : (
          requests.map((req) => (
            <TouchableOpacity
              key={req.id}
              style={styles.requestCard}
              onPress={() => openDetail(req)}
              activeOpacity={0.8}
            >
              <View style={styles.cardLeft}>
                <View style={styles.cardTopRow}>
                  <Text style={styles.cardService} numberOfLines={1}>
                    {lang === 'ml' ? req.subcategory?.name_ml : req.subcategory?.name_en}
                  </Text>
                  {req._distanceKm != null && (
                    <View style={styles.distanceBadge}>
                      <Ruler size={11} color={colors.primary[700]} strokeWidth={2.5} />
                      <Text style={styles.distanceText}>{formatDistance(req._distanceKm)}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.cardAddress} numberOfLines={2}>
                  {req.address?.address_line}, {req.address?.area}
                </Text>
                <View style={styles.cardMetaRow}>
                  <View style={styles.cardMetaItem}>
                    <Clock size={12} color={colors.neutral[400]} strokeWidth={2} />
                    <Text style={styles.cardMetaText}>
                      {new Date(req.scheduled_at || req.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  {req._etaMins != null && (
                    <View style={styles.cardMetaItem}>
                      <Navigation size={12} color={colors.success[600]} strokeWidth={2.5} />
                      <Text style={styles.cardEtaText}>{formatEta(req._etaMins)}</Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAccept(req.id, req._distanceKm, req._etaMins)}>
                  <Check size={20} color={colors.neutral[0]} strokeWidth={3} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(req.id)}>
                  <X size={20} color={colors.error[600]} strokeWidth={3} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowModal(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            {selectedRequest && (
              <>
                <View style={styles.modalHandle} />
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{lang === 'ml' ? 'അഭ്യർത്ഥന വിശദാംശങ്ങൾ' : 'Request Details'}</Text>
                  <TouchableOpacity onPress={() => setShowModal(false)} style={styles.modalCloseBtn}>
                    <X size={20} color={colors.neutral[500]} strokeWidth={2} />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalInfoCard}>
                  <View style={styles.modalInfoRow}>
                    <Briefcase size={18} color={colors.primary[600]} strokeWidth={2} />
                    <Text style={styles.modalInfoText}>{lang === 'ml' ? selectedRequest.subcategory?.name_ml : selectedRequest.subcategory?.name_en}</Text>
                  </View>
                  <View style={styles.modalInfoRow}>
                    <MapPin size={18} color={colors.primary[600]} strokeWidth={2} />
                    <Text style={styles.modalInfoText} numberOfLines={2}>{selectedRequest.address?.address_line}, {selectedRequest.address?.area}, {selectedRequest.address?.district}</Text>
                  </View>
                  <View style={styles.modalInfoRow}>
                    <Clock size={18} color={colors.primary[600]} strokeWidth={2} />
                    <Text style={styles.modalInfoText}>{new Date(selectedRequest.scheduled_at || selectedRequest.created_at).toLocaleString('en-IN')}</Text>
                  </View>
                </View>

                {hasLocation && selectedRequest._distanceKm != null && (
                  <View style={styles.modalDistanceRow}>
                    <View style={styles.modalDistanceItem}>
                      <View style={[styles.modalDistanceIconWrap, { backgroundColor: colors.primary[50] }]}>
                        <Ruler size={22} color={colors.primary[600]} strokeWidth={2} />
                      </View>
                      <Text style={styles.modalDistanceValue}>{formatDistance(selectedRequest._distanceKm)}</Text>
                      <Text style={styles.modalDistanceLabel}>{lang === 'ml' ? 'ദൂരം' : 'Distance'}</Text>
                    </View>
                    <View style={styles.modalDistanceItem}>
                      <View style={[styles.modalDistanceIconWrap, { backgroundColor: colors.success[50] }]}>
                        <Navigation size={22} color={colors.success[600]} strokeWidth={2} />
                      </View>
                      <Text style={styles.modalDistanceValue}>{formatEta(selectedRequest._etaMins)}</Text>
                      <Text style={styles.modalDistanceLabel}>{lang === 'ml' ? 'എത്താൻ' : 'ETA'}</Text>
                    </View>
                  </View>
                )}

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.modalRejectBtn} onPress={() => handleReject(selectedRequest.id)} disabled={actionLoading}>
                    <X size={20} color={colors.error[600]} strokeWidth={2.5} />
                    <Text style={styles.modalRejectText}>{t('rejectJob')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalAcceptBtn}
                    onPress={() => handleAccept(selectedRequest.id, selectedRequest._distanceKm, selectedRequest._etaMins)}
                    disabled={actionLoading}
                  >
                    <Check size={20} color={colors.neutral[0]} strokeWidth={3} />
                    <Text style={styles.modalAcceptText}>{t('acceptJob')}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
