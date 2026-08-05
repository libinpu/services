import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Modal, Pressable, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useLanguage } from '@/lib/language-context';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { colors, spacing, radius, typography, shadows } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';
import { Header, LoadingState, ErrorState, Button } from '@/components/ui';
import { LiveTrackingMap } from '@/components/LiveTrackingMap';
import type { BookingWithDetails } from '@/lib/types';
import { Phone, MessageSquare, MapPin, Navigation, Clock, CircleCheck as CheckCircle, X, User, Camera, ShieldCheck, Ruler, Receipt, Plus, Trash2, Image as ImageIcon } from 'lucide-react-native';
import { formatDistance, formatEta, haversineKm, estimateEtaMins } from '@/lib/distance';
import { useProviderLocation, updateProviderLocationInDb } from '@/lib/use-provider-location';

export default function ProviderJobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, lang } = useLanguage();
  const { session } = useAuth();
  const router = useRouter();
  const { isDark } = useTheme();

  const [booking, setBooking] = useState<BookingWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [otpInput, setOtpInput] = useState(['', '', '', '']);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [showSelfieModal, setShowSelfieModal] = useState<'start' | 'end' | null>(null);
  const [selfieCaptured, setSelfieCaptured] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);
  const [billDescription, setBillDescription] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [billPhoto, setBillPhoto] = useState<string | null>(null);
  const [submittingBill, setSubmittingBill] = useState(false);
  const billFileRef = useRef<HTMLInputElement>(null);
  const otpRefs = useRef<(TextInput | null)[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const liveLocation = useProviderLocation(['accepted', 'on_the_way', 'arrived'].includes(booking?.status || ''));
  const liveLocRef = useRef<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });
  const dbSyncRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    liveLocRef.current = { lat: liveLocation.latitude, lng: liveLocation.longitude };
  }, [liveLocation]);

  useEffect(() => {
    if (!session?.user?.id) return;
    dbSyncRef.current = setInterval(async () => {
      const { lat, lng } = liveLocRef.current;
      if (lat != null && lng != null) {
        await updateProviderLocationInDb(supabase, session.user.id, lat, lng);
      }
    }, 10000);
    return () => { if (dbSyncRef.current) clearInterval(dbSyncRef.current); };
  }, [session?.user?.id]);

  const fetchBooking = useCallback(async () => {
    try {
      setError(null);
      const { data, error: bookingError } = await supabase
        .from('bookings')
        .select(`*, subcategory:service_subcategories(*), address:addresses(*), provider:profiles!bookings_provider_id_fkey(*, provider_profile:provider_profiles(*)), booking_items(*), reviews(*)`)
        .eq('id', id)
        .maybeSingle();
      if (bookingError) throw bookingError;
      setBooking(data as BookingWithDetails);
    } catch (e: any) {
      setError(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchBooking();
    pollRef.current = setInterval(fetchBooking, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchBooking]);

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.neutral[50] },
    statusBanner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.md, marginHorizontal: spacing.md, marginTop: spacing.md, borderRadius: radius.full },
    statusDot: { width: 10, height: 10, borderRadius: radius.full, marginRight: spacing.sm },
    statusText: { fontSize: typography.sizes.md, fontWeight: '700', fontFamily: typography.fontFamilyBold },
    mapContainer: { marginHorizontal: spacing.md, marginTop: spacing.md, borderRadius: radius.lg, overflow: 'hidden', ...shadows.md },
    mapArea: { height: 200, backgroundColor: colors.neutral[100], position: 'relative', overflow: 'hidden' },
    mapRoad: { position: 'absolute', top: '50%', left: 0, right: 0, height: 3, backgroundColor: colors.neutral[300] },
    mapProviderMarker: { position: 'absolute', top: 30, left: '50%', marginLeft: -18 },
    mapProviderPin: { width: 36, height: 36, borderRadius: radius.full, backgroundColor: colors.primary[600], alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.neutral[0], ...shadows.md },
    mapPath: { position: 'absolute', top: 60, left: '50%', width: 2, height: 80, backgroundColor: colors.primary[400] },
    mapCustomerMarker: { position: 'absolute', bottom: 30, left: '50%', marginLeft: -18 },
    mapCustomerPin: { width: 36, height: 36, borderRadius: radius.full, backgroundColor: colors.neutral[0], alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.primary[600], ...shadows.md },
    mapEtaBadge: { position: 'absolute', top: spacing.sm, right: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary[700], paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full, ...shadows.md },
    mapEtaText: { fontSize: typography.sizes.xs, fontWeight: '700', color: colors.neutral[0], fontFamily: typography.fontFamilyBold },
    section: { paddingHorizontal: spacing.md, marginTop: spacing.lg },
    sectionTitle: { fontSize: typography.sizes.lg, fontWeight: '700', color: colors.neutral[900], marginBottom: spacing.sm, fontFamily: typography.fontFamilyBold },
    customerCard: { flexDirection: 'row', backgroundColor: colors.neutral[100], borderRadius: radius.lg, padding: spacing.md },
    customerAvatar: { width: 52, height: 52, borderRadius: radius.full, backgroundColor: colors.primary[100], alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
    customerAvatarText: { fontSize: typography.sizes.xl, fontWeight: '700', color: colors.primary[700], fontFamily: typography.fontFamilyBold },
    customerInfo: { flex: 1 },
    customerService: { fontSize: typography.sizes.md, fontWeight: '700', color: colors.neutral[900], marginBottom: 2, fontFamily: typography.fontFamilyBold },
    customerAddress: { fontSize: typography.sizes.sm, color: colors.neutral[500], lineHeight: 18, fontFamily: typography.fontFamilyRegular },
    customerTime: { fontSize: typography.sizes.xs, color: colors.neutral[400], marginTop: 4, fontFamily: typography.fontFamilyRegular },
    actionSection: { paddingHorizontal: spacing.md, marginTop: spacing.lg },
    actionBtn: { width: '100%' },
    otpSection: { backgroundColor: colors.neutral[100], borderRadius: radius.lg, padding: spacing.lg, marginHorizontal: spacing.md, marginTop: spacing.lg },
    otpHeader: { alignItems: 'center', marginBottom: spacing.md },
    otpTitle: { fontSize: typography.sizes.lg, fontWeight: '700', color: colors.neutral[900], marginTop: spacing.sm, fontFamily: typography.fontFamilyBold },
    otpDesc: { fontSize: typography.sizes.sm, color: colors.neutral[500], textAlign: 'center', marginTop: spacing.xs, fontFamily: typography.fontFamilyRegular },
    otpInputRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.md },
    otpInput: { width: 56, height: 64, borderRadius: radius.md, borderWidth: 2, borderColor: colors.neutral[200], fontSize: typography.sizes.xxxl, fontWeight: '700', color: colors.neutral[900], backgroundColor: colors.neutral[100], fontFamily: typography.fontFamilyBold },
    otpInputFilled: { borderColor: colors.primary[600], backgroundColor: colors.primary[50] },
    otpErrorText: { fontSize: typography.sizes.sm, color: colors.error[600], textAlign: 'center', marginTop: spacing.sm, fontFamily: typography.fontFamilyRegular },
    otpBtn: { width: '100%', marginTop: spacing.md },
    progressSection: { paddingHorizontal: spacing.md, marginTop: spacing.lg },
    progressHeader: { alignItems: 'center', padding: spacing.xl, backgroundColor: colors.neutral[100], borderRadius: radius.lg },
    progressIcon: { width: 80, height: 80, borderRadius: radius.xl, backgroundColor: colors.primary[50], alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
    progressTitle: { fontSize: typography.sizes.xl, fontWeight: '700', color: colors.neutral[900], marginBottom: spacing.sm, fontFamily: typography.fontFamilyBold },
    selfieBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, backgroundColor: colors.success[50], borderRadius: radius.full },
    selfieBadgeText: { fontSize: typography.sizes.xs, fontWeight: '600', color: colors.success[700], fontFamily: typography.fontFamilyMedium },
    endJobBtn: { width: '100%', marginTop: spacing.md },
    confirmCard: { alignItems: 'center', padding: spacing.xl, margin: spacing.md, backgroundColor: colors.neutral[100], borderRadius: radius.lg },
    confirmIcon: { width: 80, height: 80, borderRadius: radius.xl, backgroundColor: colors.success[50], alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
    confirmTitle: { fontSize: typography.sizes.xl, fontWeight: '700', color: colors.neutral[900], marginBottom: spacing.xs, fontFamily: typography.fontFamilyBold },
    confirmDesc: { fontSize: typography.sizes.sm, color: colors.neutral[500], fontFamily: typography.fontFamilyRegular },
    completedCard: { alignItems: 'center', padding: spacing.xl, margin: spacing.md, backgroundColor: colors.neutral[100], borderRadius: radius.lg },
    completedTitle: { fontSize: typography.sizes.xl, fontWeight: '700', color: colors.success[600], marginTop: spacing.md, fontFamily: typography.fontFamilyBold },
    contactRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, marginTop: spacing.lg },
    contactBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 48, backgroundColor: colors.neutral[100], borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.primary[600] },
    contactBtnText: { fontSize: typography.sizes.sm, fontWeight: '600', color: colors.primary[600], fontFamily: typography.fontFamilyMedium },
    selfieOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' },
    selfieCard: { flex: 1, backgroundColor: colors.neutral[100], marginTop: 60, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg },
    selfieHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    selfieTitle: { fontSize: typography.sizes.xxl, fontWeight: '700', color: colors.neutral[900], fontFamily: typography.fontFamilyBold },
    selfieCloseBtn: { width: 36, height: 36, borderRadius: radius.full, backgroundColor: colors.neutral[100], alignItems: 'center', justifyContent: 'center' },
    selfieDesc: { fontSize: typography.sizes.sm, color: colors.neutral[500], marginTop: spacing.xs, fontFamily: typography.fontFamilyRegular },
    cameraArea: { flex: 1, borderRadius: radius.lg, overflow: 'hidden', marginTop: spacing.lg, backgroundColor: colors.neutral[200] },
    cameraPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    cameraPlaceholderText: { fontSize: typography.sizes.sm, color: colors.neutral[400], marginTop: spacing.sm, fontFamily: typography.fontFamilyRegular },
    cameraCaptured: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    cameraCapturedText: { fontSize: typography.sizes.md, color: colors.success[500], marginTop: spacing.sm, fontWeight: '700', fontFamily: typography.fontFamilyBold },
    captureBtn: { alignSelf: 'center', width: 72, height: 72, borderRadius: radius.full, backgroundColor: colors.neutral[0], alignItems: 'center', justifyContent: 'center', marginTop: spacing.lg, borderWidth: 4, borderColor: colors.primary[600] },
    captureBtnInner: { width: 56, height: 56, borderRadius: radius.full, backgroundColor: colors.primary[600] },
    selfieActions: { gap: spacing.sm, marginTop: spacing.lg },
    retakeBtn: { height: 48, borderRadius: radius.full, backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.primary[600], alignItems: 'center', justifyContent: 'center' },
    retakeBtnText: { fontSize: typography.sizes.md, fontWeight: '600', color: colors.primary[600], fontFamily: typography.fontFamilyMedium },
    confirmSelfieBtn: { width: '100%' },
    materialSection: { paddingHorizontal: spacing.md, marginTop: spacing.lg },
    materialCard: { backgroundColor: colors.neutral[100], borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.neutral[200] },
    materialCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
    materialCardTitle: { fontSize: typography.sizes.md, fontWeight: '700', color: colors.neutral[900], fontFamily: typography.fontFamilyBold },
    materialAmountText: { fontSize: typography.sizes.lg, fontWeight: '700', color: colors.primary[700], fontFamily: typography.fontFamilyBold },
    materialBillImage: { width: '100%', height: 140, borderRadius: radius.md, marginBottom: spacing.sm, backgroundColor: colors.neutral[200] },
    materialStatusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.full, alignSelf: 'flex-start' },
    materialStatusPending: { backgroundColor: colors.warning[50] },
    materialStatusApproved: { backgroundColor: colors.success[50] },
    materialStatusText: { fontSize: typography.sizes.xs, fontWeight: '700', fontFamily: typography.fontFamilyBold },
    addBillBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, borderRadius: radius.full, borderWidth: 2, borderColor: colors.primary[600], backgroundColor: 'transparent', marginTop: spacing.sm },
    addBillBtnText: { fontSize: typography.sizes.md, fontWeight: '700', color: colors.primary[600], fontFamily: typography.fontFamilyBold },
    billOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    billCard: { backgroundColor: colors.neutral[100], borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingBottom: spacing.xl, maxHeight: '90%' },
    billHandle: { width: 40, height: 4, borderRadius: radius.full, backgroundColor: colors.neutral[200], alignSelf: 'center', marginTop: spacing.sm, marginBottom: spacing.sm },
    billHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
    billTitle: { fontSize: typography.sizes.xxl, fontWeight: '700', color: colors.neutral[900], fontFamily: typography.fontFamilyBold },
    billCloseBtn: { width: 36, height: 36, borderRadius: radius.full, backgroundColor: colors.neutral[200], alignItems: 'center', justifyContent: 'center' },
    billBody: { paddingHorizontal: spacing.lg },
    billDescInput: { minHeight: 52, borderWidth: 1.5, borderColor: colors.neutral[200], borderRadius: radius.md, paddingHorizontal: spacing.md, fontSize: typography.sizes.md, color: colors.neutral[900], backgroundColor: colors.neutral[100], fontFamily: typography.fontFamilyRegular, marginBottom: spacing.sm },
    billAmountInput: { minHeight: 52, borderWidth: 1.5, borderColor: colors.neutral[200], borderRadius: radius.md, paddingHorizontal: spacing.md, fontSize: typography.sizes.md, color: colors.neutral[900], backgroundColor: colors.neutral[100], fontFamily: typography.fontFamilyRegular, marginBottom: spacing.sm, keyboardType: 'numeric' },
    billUploadArea: { height: 160, borderWidth: 2, borderColor: colors.neutral[300], borderStyle: 'dashed', borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
    billUploadText: { fontSize: typography.sizes.sm, color: colors.neutral[400], marginTop: spacing.xs, fontFamily: typography.fontFamilyRegular },
    billPreviewImage: { width: '100%', height: 160, borderRadius: radius.lg, marginBottom: spacing.sm },
    billSubmitBtn: { width: '100%' },
  });


  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newOtp = [...otpInput];
    newOtp[index] = value;
    setOtpInput(newOtp);
    if (value && index < 3) otpRefs.current[index + 1]?.focus();
  };

  const handleVerifyOtp = async () => {
    if (!booking?.otp) return;
    setVerifying(true);
    setOtpError(null);
    const enteredOtp = otpInput.join('');
    if (enteredOtp === booking.otp) {
      await supabase.from('bookings').update({
        otp_verified: true, status: 'in_progress', started_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }).eq('id', id);
      setShowSelfieModal('start');
      setVerifying(false);
    } else {
      setOtpError(t('otpIncorrect'));
      setVerifying(false);
    }
  };

  const handleSelfieCapture = async () => {
    setSelfieCaptured(true);
    setActionLoading(true);
    const selfieType = showSelfieModal;
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const selfieUrl = `selfie_${selfieType}_${Date.now()}.jpg`;
    if (selfieType === 'start') {
      await supabase.from('bookings').update({
        start_selfie_url: selfieUrl, status: 'in_progress', updated_at: new Date().toISOString(),
      }).eq('id', id);
    } else if (selfieType === 'end') {
      await supabase.from('bookings').update({
        end_selfie_url: selfieUrl, status: 'awaiting_confirmation', completed_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }).eq('id', id);
    }
    setShowSelfieModal(null);
    setSelfieCaptured(false);
    setActionLoading(false);
    fetchBooking();
  };

  const handleStartNavigation = () => {
    if (booking?.address) {
      supabase.from('bookings').update({ status: 'on_the_way', updated_at: new Date().toISOString() }).eq('id', id).then(() => fetchBooking());
    }
  };

  const handleMarkArrived = async () => {
    await supabase.from('bookings').update({ status: 'arrived', updated_at: new Date().toISOString() }).eq('id', id);
    fetchBooking();
  };

  const handleEndJob = () => { setShowSelfieModal('end'); };

  const handleBillFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setBillPhoto(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    if (event.target) event.target.value = '';
  };

  const triggerBillFilePicker = () => {
    if (Platform.OS === 'web' && billFileRef.current) {
      billFileRef.current.click();
    }
  };

  const handleSubmitBill = async () => {
    if (!billDescription.trim() || !billAmount.trim()) return;
    setSubmittingBill(true);
    try {
      await supabase.from('booking_items').insert({
        booking_id: id,
        description_en: billDescription.trim(),
        description_ml: billDescription.trim(),
        amount: parseFloat(billAmount),
        bill_photo_url: billPhoto,
        is_approved_by_customer: false,
      });
      setBillDescription('');
      setBillAmount('');
      setBillPhoto(null);
      setShowBillModal(false);
      fetchBooking();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmittingBill(false);
    }
  };

  const pendingBills = (booking?.booking_items || []).filter((item) => !item.is_approved_by_customer);
  const approvedBills = (booking?.booking_items || []).filter((item) => item.is_approved_by_customer);
  const allBills = [...pendingBills, ...approvedBills];

  if (loading) return <LoadingState label={t('loading')} />;
  if (error) return <ErrorState message={error} onRetry={fetchBooking} />;
  if (!booking) return <ErrorState message="Job not found" />;

  const status = booking.status;
  const address = booking.address;
  const subcategory = booking.subcategory;

  const statusFlow: Record<string, { label: string; color: string }> = {
    accepted: { label: t('acceptJob'), color: colors.secondary[500] },
    on_the_way: { label: t('navigateToCustomer'), color: colors.accent[500] },
    arrived: { label: t('startJob'), color: colors.accent[500] },
    in_progress: { label: t('jobInProgress'), color: colors.primary[500] },
    awaiting_confirmation: { label: t('awaitingConfirmation'), color: colors.secondary[500] },
    completed: { label: t('completed'), color: colors.success[500] },
  };
  const statusInfo = statusFlow[status] || statusFlow.accepted;

  return (
    <SafeAreaView style={styles.container}>
      <Header title={`${t('jobRequest')} #${booking.id.slice(0, 6).toUpperCase()}`} onBack={() => router.back()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={[styles.statusBanner, { backgroundColor: statusInfo.color + '15' }]}>
          <View style={[styles.statusDot, { backgroundColor: statusInfo.color }]} />
          <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
        </View>

        {['accepted', 'on_the_way', 'arrived'].includes(status) && (
          <View style={styles.mapContainer}>
            <View style={styles.mapArea}>
              <LiveTrackingMap 
                userLat={booking?.address?.latitude || 10.8505} 
                userLng={booking?.address?.longitude || 76.2711} 
                providerLat={liveLocation.latitude ?? (booking as any)?.provider?.provider_profile?.latitude} 
                providerLng={liveLocation.longitude ?? (booking as any)?.provider?.provider_profile?.longitude} 
              />
              {status === 'on_the_way' && (
                <View style={styles.mapEtaBadge}>
                  <Navigation size={14} color={colors.neutral[0]} strokeWidth={2.5} />
                  <Text style={styles.mapEtaText}>
                    ETA: {
                      booking?.address?.latitude && booking?.address?.longitude && (liveLocation.latitude ?? (booking as any)?.provider?.provider_profile?.latitude) && (liveLocation.longitude ?? (booking as any)?.provider?.provider_profile?.longitude)
                      ? formatEta(estimateEtaMins(haversineKm(booking.address.latitude, booking.address.longitude, liveLocation.latitude ?? (booking as any).provider.provider_profile.latitude, liveLocation.longitude ?? (booking as any).provider.provider_profile.longitude)))
                      : (booking?.estimated_eta_mins ? formatEta(booking.estimated_eta_mins) : 'On the way')
                    }
                  </Text>
                </View>
              )}
              {status === 'accepted' && (
                <View style={styles.mapEtaBadge}>
                  <Clock size={14} color={colors.neutral[0]} strokeWidth={2.5} />
                  <Text style={styles.mapEtaText}>
                    {
                      booking?.address?.latitude && booking?.address?.longitude && (liveLocation.latitude ?? (booking as any)?.provider?.provider_profile?.latitude) && (liveLocation.longitude ?? (booking as any)?.provider?.provider_profile?.longitude)
                      ? formatDistance(haversineKm(booking.address.latitude, booking.address.longitude, liveLocation.latitude ?? (booking as any).provider.provider_profile.latitude, liveLocation.longitude ?? (booking as any).provider.provider_profile.longitude))
                      : (booking?.distance_km ? formatDistance(booking.distance_km) : 'Start navigation')
                    }
                  </Text>
                </View>
              )}
              {status === 'arrived' && (
                <View style={[styles.mapEtaBadge, { backgroundColor: colors.success[600] }]}>
                  <CheckCircle size={14} color={colors.neutral[0]} strokeWidth={2.5} />
                  <Text style={styles.mapEtaText}>Arrived</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {['accepted', 'on_the_way', 'arrived'].includes(status) && (
          <View style={styles.section}>
            <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.sm }}>
              {booking.distance_km != null && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ruler size={14} color={colors.primary[600]} strokeWidth={2} />
                  <Text style={{ fontSize: typography.sizes.sm, fontWeight: '600', color: colors.primary[700], fontFamily: typography.fontFamilyMedium }}>
                    {formatDistance(booking.distance_km)}
                  </Text>
                </View>
              )}
              {booking.estimated_eta_mins != null && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Navigation size={14} color={colors.success[600]} strokeWidth={2} />
                  <Text style={{ fontSize: typography.sizes.sm, fontWeight: '600', color: colors.success[600], fontFamily: typography.fontFamilyMedium }}>
                    ETA {formatEta(booking.estimated_eta_mins)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('customerDetails')}</Text>
          <View style={styles.customerCard}>
            <View style={styles.customerAvatar}>
              <Text style={styles.customerAvatarText}>{(booking.subcategory?.name_en || '?')[0].toUpperCase()}</Text>
            </View>
            <View style={styles.customerInfo}>
              <Text style={styles.customerService}>{lang === 'ml' ? subcategory?.name_ml : subcategory?.name_en}</Text>
              <Text style={styles.customerAddress} numberOfLines={2}>{address?.address_line}, {address?.area}, {address?.district}</Text>
              <Text style={styles.customerTime}>{new Date(booking.scheduled_at || booking.created_at).toLocaleString('en-IN')}</Text>
            </View>
          </View>
        </View>

        {status === 'accepted' && (
          <View style={styles.actionSection}>
            <Button label={t('navigateToCustomer')} onPress={handleStartNavigation} style={styles.actionBtn} />
          </View>
        )}

        {status === 'on_the_way' && (
          <View style={styles.actionSection}>
            <Button label={t('startJob')} onPress={handleMarkArrived} style={styles.actionBtn} />
          </View>
        )}

        {status === 'arrived' && !booking.otp_verified && (
          <View style={styles.otpSection}>
            <View style={styles.otpHeader}>
              <ShieldCheck size={24} color={colors.primary[600]} strokeWidth={2} />
              <Text style={styles.otpTitle}>{t('enterCustomerOtp')}</Text>
              <Text style={styles.otpDesc}>{t('enterCustomerOtpDesc')}</Text>
            </View>
            <View style={styles.otpInputRow}>
              {otpInput.map((digit, idx) => (
                <TextInput
                  key={idx}
                  ref={(ref) => { otpRefs.current[idx] = ref; }}
                  style={[styles.otpInput, digit && styles.otpInputFilled]}
                  value={digit}
                  onChangeText={(value) => handleOtpChange(idx, value)}
                  keyboardType="numeric"
                  maxLength={1}
                  textAlign="center"
                />
              ))}
            </View>
            {otpError && <Text style={styles.otpErrorText}>{otpError}</Text>}
            <Button label={t('verifyAndStart')} onPress={handleVerifyOtp} loading={verifying} style={styles.otpBtn} />
          </View>
        )}

        {status === 'in_progress' && (
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <View style={styles.progressIcon}><CheckCircle size={40} color={colors.primary[500]} strokeWidth={1.5} /></View>
              <Text style={styles.progressTitle}>{t('jobInProgress')}</Text>
              {booking.start_selfie_url && (
                <View style={styles.selfieBadge}>
                  <Camera size={12} color={colors.success[600]} strokeWidth={2} />
                  <Text style={styles.selfieBadgeText}>Start selfie captured</Text>
                </View>
              )}
            </View>

            {/* Material Bills Section */}
            <View style={styles.materialSection}>
              <Text style={styles.sectionTitle}>{t('materialBills')}</Text>
              {allBills.length === 0 ? (
                <Text style={{ fontSize: typography.sizes.sm, color: colors.neutral[400], fontFamily: typography.fontFamilyRegular, textAlign: 'center', paddingVertical: spacing.md }}>{t('noMaterialBills')}</Text>
              ) : (
                allBills.map((item) => (
                  <View key={item.id} style={styles.materialCard}>
                    <View style={styles.materialCardHeader}>
                      <Text style={styles.materialCardTitle}>{item.description_en}</Text>
                      <Text style={styles.materialAmountText}>₹{item.amount}</Text>
                    </View>
                    {item.bill_photo_url ? (
                      <Image source={{ uri: item.bill_photo_url }} style={styles.materialBillImage} resizeMode="cover" />
                    ) : null}
                    <View style={[styles.materialStatusBadge, item.is_approved_by_customer ? styles.materialStatusApproved : styles.materialStatusPending]}>
                      {item.is_approved_by_customer ? (
                        <CheckCircle size={12} color={colors.success[600]} strokeWidth={2.5} />
                      ) : (
                        <Clock size={12} color={colors.warning[600]} strokeWidth={2.5} />
                      )}
                      <Text style={[styles.materialStatusText, { color: item.is_approved_by_customer ? colors.success[700] : colors.warning[700] }]}>
                        {item.is_approved_by_customer ? t('approve') : t('billAdded')}
                      </Text>
                    </View>
                  </View>
                ))
              )}
              <TouchableOpacity style={styles.addBillBtn} onPress={() => setShowBillModal(true)} activeOpacity={0.8}>
                <Plus size={20} color={colors.primary[600]} strokeWidth={2.5} />
                <Text style={styles.addBillBtnText}>{t('addMaterialBill')}</Text>
              </TouchableOpacity>
            </View>

            <Button label={t('endJob')} onPress={handleEndJob} variant="danger" style={styles.endJobBtn} />
          </View>
        )}

        {status === 'awaiting_confirmation' && (
          <View style={styles.confirmCard}>
            <View style={styles.confirmIcon}><CheckCircle size={48} color={colors.success[500]} strokeWidth={1.5} /></View>
            <Text style={styles.confirmTitle}>{t('jobCompleted')}</Text>
            <Text style={styles.confirmDesc}>Waiting for customer confirmation</Text>
            {booking.end_selfie_url && (
              <View style={styles.selfieBadge}>
                <Camera size={12} color={colors.success[600]} strokeWidth={2} />
                <Text style={styles.selfieBadgeText}>End selfie captured</Text>
              </View>
            )}
          </View>
        )}

        {status === 'completed' && (
          <View style={styles.completedCard}>
            <CheckCircle size={48} color={colors.success[500]} strokeWidth={1.5} />
            <Text style={styles.completedTitle}>{t('completed')}</Text>
          </View>
        )}

        {['accepted', 'on_the_way', 'arrived', 'in_progress'].includes(status) && (
          <View style={styles.contactRow}>
            <TouchableOpacity style={styles.contactBtn}>
              <Phone size={20} color={colors.primary[600]} strokeWidth={2} />
              <Text style={styles.contactBtnText}>{t('call')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.contactBtn}>
              <MessageSquare size={20} color={colors.primary[600]} strokeWidth={2} />
              <Text style={styles.contactBtnText}>{t('chat')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <Modal visible={showSelfieModal !== null} animationType="slide" transparent onRequestClose={() => setShowSelfieModal(null)}>
        <View style={styles.selfieOverlay}>
          <View style={styles.selfieCard}>
            <View style={styles.selfieHeader}>
              <Text style={styles.selfieTitle}>{showSelfieModal === 'start' ? t('takeStartSelfie') : t('takeEndSelfie')}</Text>
              <TouchableOpacity onPress={() => setShowSelfieModal(null)} style={styles.selfieCloseBtn}>
                <X size={22} color={colors.neutral[700]} strokeWidth={2} />
              </TouchableOpacity>
            </View>
            <Text style={styles.selfieDesc}>{showSelfieModal === 'start' ? t('startSelfieDesc') : t('endSelfieDesc')}</Text>
            <View style={styles.cameraArea}>
              {!selfieCaptured ? (
                <View style={styles.cameraPlaceholder}>
                  <Camera size={48} color={colors.neutral[300]} strokeWidth={1.5} />
                  <Text style={styles.cameraPlaceholderText}>{lang === 'ml' ? 'ക്യാമറ തയ്യാറാണ്' : 'Camera ready'}</Text>
                </View>
              ) : (
                <View style={styles.cameraCaptured}>
                  <CheckCircle size={48} color={colors.success[500]} strokeWidth={1.5} />
                  <Text style={styles.cameraCapturedText}>Selfie captured!</Text>
                </View>
              )}
            </View>
            {!selfieCaptured ? (
              <TouchableOpacity style={styles.captureBtn} onPress={() => setSelfieCaptured(true)}>
                <View style={styles.captureBtnInner} />
              </TouchableOpacity>
            ) : (
              <View style={styles.selfieActions}>
                <TouchableOpacity style={styles.retakeBtn} onPress={() => setSelfieCaptured(false)}>
                  <Text style={styles.retakeBtnText}>{t('retakePhoto')}</Text>
                </TouchableOpacity>
                <Button label={t('confirmPhoto')} onPress={handleSelfieCapture} loading={actionLoading} style={styles.confirmSelfieBtn} />
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Add Material Bill Modal */}
      <Modal visible={showBillModal} animationType="slide" transparent onRequestClose={() => setShowBillModal(false)}>
        <Pressable style={styles.billOverlay} onPress={() => setShowBillModal(false)}>
          <Pressable style={styles.billCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.billHandle} />
            <View style={styles.billHeader}>
              <Text style={styles.billTitle}>{t('addMaterialBill')}</Text>
              <TouchableOpacity onPress={() => setShowBillModal(false)} style={styles.billCloseBtn}>
                <X size={20} color={colors.neutral[500]} strokeWidth={2} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.billBody} showsVerticalScrollIndicator={false}>
              <TextInput
                style={styles.billDescInput}
                value={billDescription}
                onChangeText={setBillDescription}
                placeholder={t('materialDescription')}
                placeholderTextColor={colors.neutral[400]}
              />
              <TextInput
                style={styles.billAmountInput}
                value={billAmount}
                onChangeText={setBillAmount}
                placeholder={t('materialAmount')}
                placeholderTextColor={colors.neutral[400]}
                keyboardType="numeric"
              />
              {billPhoto ? (
                <View>
                  <Image source={{ uri: billPhoto }} style={styles.billPreviewImage} resizeMode="cover" />
                  <TouchableOpacity onPress={() => setBillPhoto(null)} style={{ position: 'absolute', top: 8, right: 8, width: 32, height: 32, borderRadius: radius.full, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' }}>
                    <Trash2 size={16} color={colors.neutral[0]} strokeWidth={2} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.billUploadArea} onPress={triggerBillFilePicker} activeOpacity={0.8}>
                  <ImageIcon size={32} color={colors.neutral[400]} strokeWidth={1.5} />
                  <Text style={styles.billUploadText}>{t('uploadBillPhoto')}</Text>
                </TouchableOpacity>
              )}
              <Button label={t('addBill')} onPress={handleSubmitBill} loading={submittingBill} style={styles.billSubmitBtn} />
              <View style={{ height: 20 }} />
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {Platform.OS === 'web' && (
        <input
          ref={billFileRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleBillFileSelect}
        />
      )}
    </SafeAreaView>
  );
}
