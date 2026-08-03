import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Dimensions, TextInput, Modal, Pressable, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useLanguage } from '@/lib/language-context';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { colors, spacing, radius, typography, shadows } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';
import { Header, LoadingState, ErrorState, Button } from '@/components/ui';
import type { BookingWithDetails, ChatMessage, ProviderWithProfile } from '@/lib/types';
import { Phone, MessageSquare, MapPin, Star, ShieldCheck, Navigation, Clock, CircleCheck as CheckCircle, CircleAlert as AlertCircle, X, Share2, User, Briefcase, Award, Image as ImageIcon, Receipt } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, lang } = useLanguage();
  const { session } = useAuth();
  const router = useRouter();
  const { isDark } = useTheme();

  const [booking, setBooking] = useState<BookingWithDetails | null>(null);
  const [providerProfile, setProviderProfile] = useState<ProviderWithProfile | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [extraCharges, setExtraCharges] = useState<any[]>([]);
  const [showSos, setShowSos] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.neutral[50] },
    statusBanner: {
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md,
      paddingVertical: spacing.md, marginHorizontal: spacing.md, marginTop: spacing.md, borderRadius: radius.full,
    },
    statusDot: { width: 10, height: 10, borderRadius: radius.full, marginRight: spacing.sm },
    statusText: { fontSize: typography.sizes.md, fontWeight: '700', fontFamily: typography.fontFamilyBold },
    waitingCard: {
      alignItems: 'center', padding: spacing.xl, margin: spacing.md,
      backgroundColor: colors.neutral[100], borderRadius: radius.lg,
    },
    waitingIconWrap: {
      width: 80, height: 80, borderRadius: radius.xl, backgroundColor: colors.warning[50],
      alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md,
    },
    waitingTitle: {
      fontSize: typography.sizes.xl, fontWeight: '700', color: colors.neutral[900],
      marginBottom: spacing.xs, fontFamily: typography.fontFamilyBold,
    },
    waitingDesc: {
      fontSize: typography.sizes.sm, color: colors.neutral[500], textAlign: 'center',
      lineHeight: 20, marginBottom: spacing.lg, fontFamily: typography.fontFamilyRegular,
    },
    waitingPulse: {
      width: 60, height: 60, borderRadius: radius.full, backgroundColor: colors.warning[100],
      position: 'absolute', top: 40, opacity: 0.3,
    },
    cancelBtn: { width: '100%', borderRadius: radius.full },

    // Map styles — Zomato/Swiggy style
    mapContainer: { marginHorizontal: spacing.md, marginTop: spacing.md, borderRadius: radius.lg, overflow: 'hidden', ...shadows.md },
    mapArea: { height: 220, backgroundColor: colors.neutral[100], position: 'relative', overflow: 'hidden' },
    mapGrid: {
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: colors.neutral[100],
    } as any,
    mapRoads: {
      position: 'absolute', top: '50%', left: 0, right: 0, height: 3, backgroundColor: colors.neutral[300],
    },
    mapProviderMarker: {
      position: 'absolute', top: 30, left: '50%', marginLeft: -18,
    },
    mapProviderPin: {
      width: 36, height: 36, borderRadius: radius.full, backgroundColor: colors.primary[600],
      alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.neutral[0], ...shadows.md,
    },
    mapPath: {
      position: 'absolute', top: 60, left: '50%', width: 2, height: 100,
      backgroundColor: colors.primary[400], borderStyle: 'dashed',
    },
    mapUserMarker: {
      position: 'absolute', bottom: 30, left: '50%', marginLeft: -18,
    },
    mapUserPin: {
      width: 36, height: 36, borderRadius: radius.full, backgroundColor: colors.neutral[0],
      alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.primary[600], ...shadows.md,
    },
    mapEtaBadge: {
      position: 'absolute', top: spacing.sm, right: spacing.sm,
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: colors.primary[700], paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
      borderRadius: radius.full, ...shadows.md,
    },
    mapEtaText: {
      fontSize: typography.sizes.xs, fontWeight: '700', color: colors.neutral[0], fontFamily: typography.fontFamilyBold,
    },

    // Tracking bar
    trackingBar: {
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md,
      paddingVertical: spacing.md, backgroundColor: colors.neutral[100], marginHorizontal: spacing.md,
      borderRadius: radius.lg, marginTop: spacing.sm,
    },
    trackingStep: { alignItems: 'center', width: 50 },
    trackingDot: {
      width: 28, height: 28, borderRadius: radius.full, backgroundColor: colors.neutral[200],
      alignItems: 'center', justifyContent: 'center', marginBottom: 4,
    },
    trackingDotDone: { backgroundColor: colors.primary[600] },
    trackingDotCurrent: { backgroundColor: colors.primary[700], borderWidth: 3, borderColor: colors.primary[200] },
    trackingLabel: {
      fontSize: 9, color: colors.neutral[400], textAlign: 'center', fontFamily: typography.fontFamilyRegular,
    },
    trackingLabelDone: { color: colors.neutral[600] },
    trackingLabelCurrent: { color: colors.primary[700], fontWeight: '700' },
    trackingLine: { flex: 1, height: 2, backgroundColor: colors.neutral[200], marginBottom: 16, marginHorizontal: -2 },
    trackingLineDone: { backgroundColor: colors.primary[500] },

    // Provider card
    providerCardWrap: { paddingHorizontal: spacing.md, marginTop: spacing.sm },
    providerCard: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: colors.neutral[100],
      borderRadius: radius.lg, padding: spacing.md,
    },
    providerAvatarLarge: {
      width: 64, height: 64, borderRadius: radius.full, backgroundColor: colors.primary[100],
      alignItems: 'center', justifyContent: 'center', marginRight: spacing.md, overflow: 'hidden',
    },
    providerAvatarImg: {
      width: 64, height: 64, borderRadius: radius.full, backgroundColor: colors.neutral[200],
    },
    providerAvatar: {
      width: 56, height: 56, borderRadius: radius.full, backgroundColor: colors.primary[100],
      alignItems: 'center', justifyContent: 'center', marginRight: spacing.md,
    },
    providerAvatarText: {
      fontSize: typography.sizes.xl, fontWeight: '700', color: colors.primary[700],
      fontFamily: typography.fontFamilyBold,
    },
    providerCardInfo: { flex: 1 },
    providerCardName: {
      fontSize: typography.sizes.lg, fontWeight: '700', color: colors.neutral[900],
      fontFamily: typography.fontFamilyBold,
    },
    providerCardService: {
      fontSize: typography.sizes.sm, color: colors.neutral[500], marginTop: 2,
      fontFamily: typography.fontFamilyRegular,
    },
    providerCardMeta: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs },
    providerRatingRow: { flexDirection: 'row', alignItems: 'center' },
    providerRatingText: {
      fontSize: typography.sizes.xs, fontWeight: '600', color: colors.neutral[700],
      marginLeft: 2, fontFamily: typography.fontFamilyMedium,
    },
    providerDot: { fontSize: typography.sizes.xs, color: colors.neutral[300], marginHorizontal: spacing.xs },
    providerJobs: { fontSize: typography.sizes.xs, color: colors.neutral[500], fontFamily: typography.fontFamilyRegular },
    providerNameRow: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    },
    providerVerifiedBadge: {
      width: 18, height: 18, borderRadius: radius.full, backgroundColor: colors.success[50],
      alignItems: 'center', justifyContent: 'center',
    },
    providerSkillsRow: {
      flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.xs, gap: 4,
    },
    providerSkillTag: {
      paddingHorizontal: spacing.xs, paddingVertical: 2,
      backgroundColor: colors.primary[50], borderRadius: radius.sm,
    },
    providerSkillText: {
      fontSize: 10, color: colors.primary[700], fontWeight: '600',
      fontFamily: typography.fontFamilyMedium,
    },
    providerCardActions: { flexDirection: 'row', gap: spacing.xs },
    providerCallBtn: {
      width: 40, height: 40, borderRadius: radius.full, backgroundColor: colors.primary[50],
      alignItems: 'center', justifyContent: 'center',
    },
    providerChatBtn: {
      width: 40, height: 40, borderRadius: radius.full, backgroundColor: colors.primary[50],
      alignItems: 'center', justifyContent: 'center',
    },

    // OTP section
    otpSection: {
      backgroundColor: colors.neutral[100], borderRadius: radius.lg, padding: spacing.lg,
      marginTop: spacing.sm,
    },
    otpInfoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
    otpInfoText: { marginLeft: spacing.sm, flex: 1 },
    otpTitle: {
      fontSize: typography.sizes.md, fontWeight: '700', color: colors.neutral[900],
      fontFamily: typography.fontFamilyBold,
    },
    otpDesc: {
      fontSize: typography.sizes.xs, color: colors.neutral[500], marginTop: 2,
      fontFamily: typography.fontFamilyRegular,
    },
    otpDigitsDisplay: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
    otpDigitBox: {
      width: 56, height: 64, borderRadius: radius.md, backgroundColor: colors.primary[50],
      alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.primary[300],
    },
    otpDigitText: {
      fontSize: typography.sizes.xxxl, fontWeight: '700', color: colors.primary[700],
      fontFamily: typography.fontFamilyBold,
    },

    // Action buttons
    actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
    actionBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      height: 48, backgroundColor: colors.neutral[100], borderRadius: radius.md, gap: spacing.xs,
    },
    actionBtnText: {
      fontSize: typography.sizes.sm, fontWeight: '600', color: colors.primary[600],
      fontFamily: typography.fontFamilyMedium,
    },
    sosBtn: { backgroundColor: colors.neutral[200] },

    // In progress
    progressSection: { paddingHorizontal: spacing.md, marginTop: spacing.md },
    progressHeader: {
      alignItems: 'center', padding: spacing.xl, backgroundColor: colors.neutral[100],
      borderRadius: radius.lg,
    },
    progressIcon: {
      width: 80, height: 80, borderRadius: radius.xl, backgroundColor: colors.primary[50],
      alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md,
    },
    progressTitle: {
      fontSize: typography.sizes.xl, fontWeight: '700', color: colors.neutral[900],
      marginBottom: spacing.xs, fontFamily: typography.fontFamilyBold,
    },
    progressDesc: {
      fontSize: typography.sizes.sm, color: colors.neutral[500], fontFamily: typography.fontFamilyRegular,
    },
    otpVerifiedBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm,
      paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
      backgroundColor: colors.success[50], borderRadius: radius.full,
    },
    otpVerifiedText: {
      fontSize: typography.sizes.xs, fontWeight: '600', color: colors.success[700],
      fontFamily: typography.fontFamilyMedium,
    },
    section: { marginTop: spacing.lg },
    sectionTitle: {
      fontSize: typography.sizes.lg, fontWeight: '700', color: colors.neutral[900],
      marginBottom: spacing.sm, fontFamily: typography.fontFamilyBold,
    },
    chargeCard: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: colors.warning[50], borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm,
    },
    chargeInfo: { flex: 1 },
    chargeDesc: {
      fontSize: typography.sizes.sm, color: colors.neutral[700], marginBottom: spacing.xs,
      fontFamily: typography.fontFamilyMedium,
    },
    approveBtn: { paddingHorizontal: spacing.md, height: 40, borderRadius: radius.full },
    chargeBillImage: { width: '100%', height: 120, borderRadius: radius.md, marginBottom: spacing.sm, backgroundColor: colors.neutral[200] },
    chargeBillLabel: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
    chargeBillLabelText: { fontSize: typography.sizes.xs, fontWeight: '600', color: colors.neutral[500], fontFamily: typography.fontFamilyMedium },
    completeBtn: { marginTop: spacing.md, borderRadius: radius.full },

    // Awaiting confirmation
    confirmCard: {
      alignItems: 'center', padding: spacing.xl, margin: spacing.md,
      backgroundColor: colors.neutral[100], borderRadius: radius.lg,
    },
    confirmIcon: {
      width: 80, height: 80, borderRadius: radius.xl, backgroundColor: colors.success[50],
      alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md,
    },
    confirmTitle: {
      fontSize: typography.sizes.xl, fontWeight: '700', color: colors.neutral[900],
      marginBottom: spacing.xs, fontFamily: typography.fontFamilyBold,
    },
    confirmDesc: {
      fontSize: typography.sizes.sm, color: colors.neutral[500], textAlign: 'center',
      marginBottom: spacing.lg, fontFamily: typography.fontFamilyRegular,
    },
    confirmBtn: { width: '100%', borderRadius: radius.full },

    // Completed
    completedCard: {
      alignItems: 'center', padding: spacing.xl, margin: spacing.md,
      backgroundColor: colors.neutral[100], borderRadius: radius.lg,
    },
    completedIcon: {
      width: 80, height: 80, borderRadius: radius.xl, backgroundColor: colors.success[50],
      alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md,
    },
    completedTitle: {
      fontSize: typography.sizes.xl, fontWeight: '700', color: colors.neutral[900],
      marginBottom: spacing.lg, fontFamily: typography.fontFamilyBold,
    },
    feedbackBtn: { width: '100%', borderRadius: radius.full },

    // Cancelled
    cancelledCard: {
      alignItems: 'center', padding: spacing.xl, margin: spacing.md,
      backgroundColor: colors.neutral[100], borderRadius: radius.lg,
    },
    cancelledTitle: {
      fontSize: typography.sizes.xl, fontWeight: '700', color: colors.error[600],
      marginTop: spacing.md, fontFamily: typography.fontFamilyBold,
    },

    // Detail card
    detailCard: {
      backgroundColor: colors.neutral[100], borderRadius: radius.lg, padding: spacing.md,
    },
    detailRow: {
      flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm,
      borderBottomWidth: 1, borderBottomColor: colors.neutral[200],
    },
    detailLabel: {
      fontSize: typography.sizes.sm, color: colors.neutral[500], fontFamily: typography.fontFamilyRegular,
    },
    detailValue: {
      fontSize: typography.sizes.sm, color: colors.neutral[900], fontWeight: '600',
      textAlign: 'right', flex: 1, marginLeft: spacing.md, fontFamily: typography.fontFamilyMedium,
    },

    // Chat
    chatOverlay: {
      position: 'absolute', bottom: 0, left: 0, right: 0, height: 400,
      backgroundColor: colors.neutral[100], borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, ...shadows.lg,
    },
    chatHeader: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.neutral[200],
    },
    chatTitle: {
      fontSize: typography.sizes.lg, fontWeight: '700', color: colors.neutral[900],
      fontFamily: typography.fontFamilyBold,
    },
    chatCloseBtn: {
      width: 36, height: 36, borderRadius: radius.full, backgroundColor: colors.neutral[100],
      alignItems: 'center', justifyContent: 'center',
    },
    chatMessages: { flex: 1, padding: spacing.md },
    chatEmptyText: {
      fontSize: typography.sizes.sm, color: colors.neutral[400], textAlign: 'center',
      marginTop: spacing.xl, fontFamily: typography.fontFamilyRegular,
    },
    chatBubble: {
      maxWidth: '80%', paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
      borderRadius: radius.lg, marginBottom: spacing.sm,
    },
    chatBubbleMine: { alignSelf: 'flex-end', backgroundColor: colors.primary[600] },
    chatBubbleTheirs: { alignSelf: 'flex-start', backgroundColor: colors.neutral[100] },
    chatBubbleText: { fontSize: typography.sizes.sm, fontFamily: typography.fontFamilyRegular },
    chatBubbleTextMine: { color: colors.neutral[0] },
    chatBubbleTextTheirs: { color: colors.neutral[700] },
    chatInputRow: { flexDirection: 'row', padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.neutral[200] },
    chatInput: {
      flex: 1, height: 44, borderWidth: 1.5, borderColor: colors.neutral[200], borderRadius: radius.md,
      paddingHorizontal: spacing.md, fontSize: typography.sizes.sm, color: colors.neutral[900],
      backgroundColor: colors.neutral[100], fontFamily: typography.fontFamilyRegular,
    },
    chatSendBtn: {
      width: 44, height: 44, borderRadius: radius.full, backgroundColor: colors.primary[600],
      alignItems: 'center', justifyContent: 'center', marginLeft: spacing.sm,
    },
    chatSendText: { fontSize: 20, color: colors.neutral[0] },

    // SOS
    sosOverlay: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center',
    },
    sosCard: {
      backgroundColor: colors.neutral[100], borderRadius: radius.xl, padding: spacing.xl,
      margin: spacing.xl, alignItems: 'center',
    },
    sosIcon: {
      width: 80, height: 80, borderRadius: radius.xl, backgroundColor: colors.error[50],
      alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md,
    },
    sosTitle: {
      fontSize: typography.sizes.xxl, fontWeight: '700', color: colors.error[600],
      marginBottom: spacing.sm, fontFamily: typography.fontFamilyBold,
    },
    sosDesc: {
      fontSize: typography.sizes.sm, color: colors.neutral[500], textAlign: 'center',
      lineHeight: 20, marginBottom: spacing.lg, fontFamily: typography.fontFamilyRegular,
    },
    sosSendBtn: { width: '100%', borderRadius: radius.full },
    sosCloseBtn: { width: '100%', marginTop: spacing.sm },
  });

  const fetchBooking = useCallback(async () => {
    try {
      setError(null);
      const { data, error: bookingError } = await supabase
        .from('bookings')
        .select(`
          *,
          subcategory:service_subcategories(*),
          address:addresses(*),
          provider:profiles!bookings_provider_id_fkey(*),
          booking_items(*),
          reviews(*)
        `)
        .eq('id', id)
        .maybeSingle();

      if (bookingError) throw bookingError;
      setBooking(data as BookingWithDetails);

      // Fetch provider profile with provider_profile join
      if (data?.provider_id) {
        const { data: provData } = await supabase
          .from('profiles')
          .select('*, provider_profile:provider_profiles(*)')
          .eq('id', data.provider_id)
          .maybeSingle();
        if (provData) setProviderProfile(provData as ProviderWithProfile);
      }

      if (data) {
        const pendingCharges = (data as any).booking_items?.filter((item: any) => !item.is_approved_by_customer) || [];
        setExtraCharges(pendingCharges);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load booking');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchChat = useCallback(async () => {
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('booking_id', id)
      .order('created_at', { ascending: true });
    if (data) setChatMessages(data as ChatMessage[]);
  }, [id]);

  useEffect(() => {
    fetchBooking();
    fetchChat();
    pollRef.current = setInterval(() => {
      fetchBooking();
      fetchChat();
    }, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchBooking, fetchChat]);

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !session?.user?.id) return;
    const { error: msgError } = await supabase
      .from('chat_messages')
      .insert({ booking_id: id, sender_id: session.user.id, message: chatInput.trim() });
    if (!msgError) {
      setChatInput('');
      fetchChat();
    }
  };

  const handleApproveCharge = async (itemId: string) => {
    const { error } = await supabase
      .from('booking_items')
      .update({ is_approved_by_customer: true })
      .eq('id', itemId);
    if (!error) fetchBooking();
  };

  const handleVerifyOtp = async () => {
    if (!booking?.otp) return;
    setVerifying(true);
    setOtpError(null);
    if (otpInput.trim() === booking.otp) {
      const { error } = await supabase
        .from('bookings')
        .update({
          otp_verified: true,
          status: 'in_progress',
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (!error) {
        setOtpInput('');
        fetchBooking();
      }
    } else {
      setOtpError('Incorrect OTP. Please check and try again.');
    }
    setVerifying(false);
  };

  const handleMarkComplete = async () => {
    const { error } = await supabase
      .from('bookings')
      .update({
        status: 'awaiting_confirmation',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (!error) fetchBooking();
  };

  const handleConfirmComplete = async () => {
    const { error } = await supabase
      .from('bookings')
      .update({
        status: 'completed',
        final_cost: 0,
        payment_status: 'paid',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (!error) {
      router.push(`/feedback/${id}`);
    }
  };

  const handleCancelBooking = async () => {
    setShowCancelConfirm(false);
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', id);
    if (!error) router.replace('/(tabs)/bookings');
  };

  if (loading) return <LoadingState label={t('loading')} />;
  if (error) return <ErrorState message={error} onRetry={fetchBooking} />;
  if (!booking) return <ErrorState message="Booking not found" />;

  const status = booking.status;
  const provider = booking.provider;
  const subcategory = booking.subcategory;
  const address = booking.address;

  const statusFlow: Record<string, { label: string; color: string }> = {
    pending: { label: t('pending'), color: colors.warning[500] },
    accepted: { label: t('accepted'), color: colors.accent[500] },
    on_the_way: { label: t('onTheWay'), color: colors.accent[500] },
    arrived: { label: t('arrived'), color: colors.accent[500] },
    in_progress: { label: t('inProgress'), color: colors.primary[500] },
    awaiting_confirmation: { label: t('awaitingConfirmation'), color: colors.secondary[500] },
    completed: { label: t('completed'), color: colors.success[500] },
    cancelled: { label: t('cancelled'), color: colors.error[500] },
    rejected: { label: t('rejected'), color: colors.error[500] },
  };
  const statusInfo = statusFlow[status] || statusFlow.pending;

  // Progress steps for the tracking bar
  const trackingSteps = [
    { key: 'pending', label: 'Booked', icon: CheckCircle },
    { key: 'accepted', label: 'Accepted', icon: ShieldCheck },
    { key: 'on_the_way', label: 'On the way', icon: Navigation },
    { key: 'arrived', label: 'Arrived', icon: MapPin },
    { key: 'in_progress', label: 'In Progress', icon: Clock },
    { key: 'awaiting_confirmation', label: 'Done', icon: CheckCircle },
  ];
  const currentStepIndex = trackingSteps.findIndex((s) => s.key === status);

  return (
    <SafeAreaView style={styles.container}>
      <Header title={`${t('bookingId')}: ${booking.id.slice(0, 8).toUpperCase()}`} onBack={() => router.back()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Status Banner */}
        <View style={[styles.statusBanner, { backgroundColor: statusInfo.color + '15' }]}>
          <View style={[styles.statusDot, { backgroundColor: statusInfo.color }]} />
          <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
        </View>

        {/* Pending: Waiting for provider */}
        {status === 'pending' && (
          <View style={styles.waitingCard}>
            <View style={styles.waitingIconWrap}>
              <Clock size={48} color={colors.warning[500]} strokeWidth={1.5} />
            </View>
            <Text style={styles.waitingTitle}>{t('pending')}</Text>
            <Text style={styles.waitingDesc}>
              {booking.booking_mode === 'auto'
                ? 'Finding the nearest available provider for you...'
                : 'Waiting for provider to accept your booking...'}
            </Text>
            <View style={styles.waitingPulse} />
            <Button label={t('cancel')} onPress={() => setShowCancelConfirm(true)} variant="outline" style={styles.cancelBtn} />
          </View>
        )}

        {/* Accepted / On the way / Arrived — Zomato/Swiggy style tracking */}
        {['accepted', 'on_the_way', 'arrived'].includes(status) && provider && (
          <>
            {/* Map View */}
            <View style={styles.mapContainer}>
              <View style={styles.mapArea}>
                {/* Simulated map background */}
                <View style={styles.mapGrid} />
                <View style={styles.mapRoads} />
                {/* Provider marker (top) */}
                <View style={styles.mapProviderMarker}>
                  <View style={styles.mapProviderPin}>
                    <User size={16} color={colors.neutral[0]} strokeWidth={2.5} />
                  </View>
                </View>
                {/* Dashed path */}
                <View style={styles.mapPath} />
                {/* User marker (bottom) */}
                <View style={styles.mapUserMarker}>
                  <View style={styles.mapUserPin}>
                    <MapPin size={18} color={colors.primary[700]} fill={colors.primary[700]} strokeWidth={0} />
                  </View>
                </View>
                {/* ETA badge */}
                {status === 'on_the_way' && (
                  <View style={styles.mapEtaBadge}>
                    <Navigation size={14} color={colors.neutral[0]} strokeWidth={2.5} />
                    <Text style={styles.mapEtaText}>ETA: 15 mins</Text>
                  </View>
                )}
                {status === 'accepted' && (
                  <View style={styles.mapEtaBadge}>
                    <Clock size={14} color={colors.neutral[0]} strokeWidth={2.5} />
                    <Text style={styles.mapEtaText}>Preparing to start</Text>
                  </View>
                )}
                {status === 'arrived' && (
                  <View style={[styles.mapEtaBadge, { backgroundColor: colors.success[600] }]}>
                    <CheckCircle size={14} color={colors.neutral[0]} strokeWidth={2.5} />
                    <Text style={styles.mapEtaText}>Provider has arrived</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Progress tracking bar */}
            <View style={styles.trackingBar}>
              {trackingSteps.slice(0, 5).map((step, idx) => {
                const Icon = step.icon;
                const isDone = idx <= currentStepIndex;
                const isCurrent = idx === currentStepIndex;
                return (
                  <React.Fragment key={step.key}>
                    <View style={styles.trackingStep}>
                      <View style={[
                        styles.trackingDot,
                        isDone && styles.trackingDotDone,
                        isCurrent && styles.trackingDotCurrent,
                      ]}>
                        <Icon
                          size={14}
                          color={isDone ? colors.neutral[0] : colors.neutral[400]}
                          strokeWidth={2.5}
                        />
                      </View>
                      <Text style={[
                        styles.trackingLabel,
                        isDone && styles.trackingLabelDone,
                        isCurrent && styles.trackingLabelCurrent,
                      ]} numberOfLines={1}>
                        {step.label}
                      </Text>
                    </View>
                    {idx < 4 && (
                      <View style={[styles.trackingLine, isDone && idx < currentStepIndex && styles.trackingLineDone]} />
                    )}
                  </React.Fragment>
                );
              })}
            </View>

            {/* Provider Card — Zomato/Swiggy style with full details */}
            <View style={styles.providerCardWrap}>
              <View style={styles.providerCard}>
                <View style={styles.providerAvatarLarge}>
                  {provider.avatar_url ? (
                    <View style={styles.providerAvatarImg} />
                  ) : (
                    <Text style={styles.providerAvatarText}>
                      {(provider.full_name || '?')[0].toUpperCase()}
                    </Text>
                  )}
                </View>
                <View style={styles.providerCardInfo}>
                  <View style={styles.providerNameRow}>
                    <Text style={styles.providerCardName}>{provider.full_name}</Text>
                    {providerProfile?.provider_profile?.is_verified && (
                      <View style={styles.providerVerifiedBadge}>
                        <ShieldCheck size={12} color={colors.success[600]} strokeWidth={2.5} />
                      </View>
                    )}
                  </View>
                  <Text style={styles.providerCardService}>
                    {lang === 'ml' ? subcategory?.name_ml : subcategory?.name_en}
                  </Text>
                  <View style={styles.providerCardMeta}>
                    <View style={styles.providerRatingRow}>
                      <Star size={12} color={colors.accent[500]} fill={colors.accent[500]} strokeWidth={0} />
                      <Text style={styles.providerRatingText}>
                        {providerProfile?.provider_profile?.rating_avg?.toFixed(1) || '4.8'}
                      </Text>
                    </View>
                    <Text style={styles.providerDot}>·</Text>
                    <Text style={styles.providerJobs}>
                      {providerProfile?.provider_profile?.jobs_completed || 0} jobs
                    </Text>
                    <Text style={styles.providerDot}>·</Text>
                    <Text style={styles.providerJobs}>
                      {providerProfile?.provider_profile?.experience_years || 0} yrs exp
                    </Text>
                  </View>
                  {providerProfile?.provider_profile && providerProfile.provider_profile.specializations.length > 0 && (
                    <View style={styles.providerSkillsRow}>
                      {providerProfile.provider_profile.specializations.slice(0, 3).map((skill, idx) => (
                        <View key={idx} style={styles.providerSkillTag}>
                          <Text style={styles.providerSkillText}>{skill}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>

              {/* OTP Display — when provider arrives */}
              {status === 'arrived' && booking.otp && !booking.otp_verified && (
                <View style={styles.otpSection}>
                  <View style={styles.otpInfoRow}>
                    <ShieldCheck size={20} color={colors.primary[600]} strokeWidth={2} />
                    <View style={styles.otpInfoText}>
                      <Text style={styles.otpTitle}>{t('shareOtp')}</Text>
                      <Text style={styles.otpDesc}>Share this OTP with the provider to start the service</Text>
                    </View>
                  </View>
                  <View style={styles.otpDigitsDisplay}>
                    {booking.otp.split('').map((digit, idx) => (
                      <View key={idx} style={styles.otpDigitBox}>
                        <Text style={styles.otpDigitText}>{digit}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Action buttons */}
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => setShowChat(true)}>
                  <MessageSquare size={18} color={colors.primary[600]} strokeWidth={2} />
                  <Text style={styles.actionBtnText}>{t('chat')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn}>
                  <Phone size={18} color={colors.primary[600]} strokeWidth={2} />
                  <Text style={styles.actionBtnText}>{t('call')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.sosBtn]} onPress={() => setShowSos(true)}>
                  <AlertCircle size={18} color={colors.error[600]} strokeWidth={2} />
                  <Text style={[styles.actionBtnText, { color: colors.error[600] }]}>{t('sos')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}

        {/* In Progress — OTP verification by provider */}
        {status === 'in_progress' && (
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <View style={styles.progressIcon}>
                <CheckCircle size={40} color={colors.primary[500]} strokeWidth={1.5} />
              </View>
              <Text style={styles.progressTitle}>{t('jobStarted')}</Text>
              <Text style={styles.progressDesc}>
                {lang === 'ml' ? subcategory?.name_ml : subcategory?.name_en}
              </Text>
              <View style={styles.otpVerifiedBadge}>
                <ShieldCheck size={14} color={colors.success[600]} strokeWidth={2.5} />
                <Text style={styles.otpVerifiedText}>OTP Verified</Text>
              </View>
            </View>

            {/* Extra charges */}
            {extraCharges.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('approveCharges')}</Text>
                {extraCharges.map((item) => (
                  <View key={item.id} style={styles.chargeCard}>
                    <View style={styles.chargeInfo}>
                      <Text style={styles.chargeDesc}>
                        {lang === 'ml' ? item.description_ml || item.description_en : item.description_en}
                      </Text>
                      {item.bill_photo_url && (
                        <>
                          <View style={styles.chargeBillLabel}>
                            <Receipt size={12} color={colors.neutral[500]} strokeWidth={2} />
                            <Text style={styles.chargeBillLabelText}>Bill Photo</Text>
                          </View>
                          <Image source={{ uri: item.bill_photo_url }} style={styles.chargeBillImage} resizeMode="cover" />
                        </>
                      )}
                    </View>
                    <Button label={t('approve')} onPress={() => handleApproveCharge(item.id)} style={styles.approveBtn} />
                  </View>
                ))}
              </View>
            )}

            <Button label={t('jobCompleted')} onPress={handleMarkComplete} style={styles.completeBtn} />
          </View>
        )}

        {/* Awaiting confirmation */}
        {status === 'awaiting_confirmation' && (
          <View style={styles.confirmCard}>
            <View style={styles.confirmIcon}>
              <CheckCircle size={48} color={colors.success[500]} strokeWidth={1.5} />
            </View>
            <Text style={styles.confirmTitle}>{t('jobCompleted')}</Text>
            <Text style={styles.confirmDesc}>Please confirm that the service has been completed</Text>
            <Button label={t('confirm')} onPress={handleConfirmComplete} style={styles.confirmBtn} />
          </View>
        )}

        {/* Completed */}
        {status === 'completed' && (
          <View style={styles.completedCard}>
            <View style={styles.completedIcon}>
              <CheckCircle size={48} color={colors.success[500]} strokeWidth={1.5} />
            </View>
            <Text style={styles.completedTitle}>{t('jobCompleted')}</Text>
            <Button
              label={t('rateYourExperience')}
              onPress={() => router.push(`/feedback/${id}`)}
              style={styles.feedbackBtn}
            />
          </View>
        )}

        {/* Cancelled */}
        {status === 'cancelled' && (
          <View style={styles.cancelledCard}>
            <X size={48} color={colors.error[500]} strokeWidth={1.5} />
            <Text style={styles.cancelledTitle}>{t('cancelled')}</Text>
          </View>
        )}

        {/* Booking details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('serviceSummary')}</Text>
          <View style={styles.detailCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('subcategories')}</Text>
              <Text style={styles.detailValue}>
                {lang === 'ml' ? subcategory?.name_ml : subcategory?.name_en}
              </Text>
            </View>
            {provider && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('provider')}</Text>
                <Text style={styles.detailValue}>{provider.full_name}</Text>
              </View>
            )}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('date')}</Text>
              <Text style={styles.detailValue}>
                {booking.scheduled_at ? new Date(booking.scheduled_at).toLocaleDateString('en-IN') : '-'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('time')}</Text>
              <Text style={styles.detailValue}>
                {booking.scheduled_at ? new Date(booking.scheduled_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '-'}
              </Text>
            </View>
            {address && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('address')}</Text>
                <Text style={styles.detailValue} numberOfLines={2}>
                  {address.address_line}, {address.area}
                </Text>
              </View>
            )}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('paymentMethod')}</Text>
              <Text style={styles.detailValue}>{t(booking.payment_method as any)}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Chat overlay */}
      <Modal visible={showChat} animationType="slide" transparent onRequestClose={() => setShowChat(false)}>
        <View style={styles.chatOverlay}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatTitle}>{t('chat')}</Text>
            <TouchableOpacity onPress={() => setShowChat(false)} style={styles.chatCloseBtn}>
              <X size={22} color={colors.neutral[700]} strokeWidth={2} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.chatMessages} showsVerticalScrollIndicator={false}>
            {chatMessages.length === 0 ? (
              <Text style={styles.chatEmptyText}>No messages yet. Start a conversation!</Text>
            ) : (
              chatMessages.map((msg) => (
                <View
                  key={msg.id}
                  style={[
                    styles.chatBubble,
                    msg.sender_id === session?.user?.id ? styles.chatBubbleMine : styles.chatBubbleTheirs,
                  ]}
                >
                  <Text style={[styles.chatBubbleText, msg.sender_id === session?.user?.id ? styles.chatBubbleTextMine : styles.chatBubbleTextTheirs]}>{msg.message}</Text>
                </View>
              ))
            )}
          </ScrollView>
          <View style={styles.chatInputRow}>
            <TextInput
              style={styles.chatInput}
              value={chatInput}
              onChangeText={setChatInput}
              placeholder="Type a message..."
              placeholderTextColor={colors.neutral[400]}
            />
            <TouchableOpacity style={styles.chatSendBtn} onPress={handleSendMessage}>
              <Text style={styles.chatSendText}>→</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* SOS overlay */}
      <Modal visible={showSos} animationType="fade" transparent onRequestClose={() => setShowSos(false)}>
        <View style={styles.sosOverlay}>
          <View style={styles.sosCard}>
            <View style={styles.sosIcon}>
              <AlertCircle size={48} color={colors.error[500]} strokeWidth={1.5} />
            </View>
            <Text style={styles.sosTitle}>SOS Alert</Text>
            <Text style={styles.sosDesc}>
              Your live location and booking details will be shared with our emergency support team.
            </Text>
            <Button
              label="Send Emergency Alert"
              onPress={() => {
                setShowSos(false);
                setError('Emergency alert sent. Our support team will contact you immediately.');
              }}
              variant="danger"
              style={styles.sosSendBtn}
            />
            <Button label={t('close')} onPress={() => setShowSos(false)} variant="ghost" style={styles.sosCloseBtn} />
          </View>
        </View>
      </Modal>

      {/* Cancel confirmation */}
      <Modal visible={showCancelConfirm} animationType="fade" transparent onRequestClose={() => setShowCancelConfirm(false)}>
        <Pressable style={styles.sosOverlay} onPress={() => setShowCancelConfirm(false)}>
          <Pressable style={styles.sosCard} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.sosIcon, { backgroundColor: colors.error[50] }]}>
              <X size={48} color={colors.error[500]} strokeWidth={1.5} />
            </View>
            <Text style={[styles.sosTitle, { color: colors.error[600] }]}>{t('cancel')}</Text>
            <Text style={styles.sosDesc}>Are you sure you want to cancel this booking?</Text>
            <Button label={t('cancel')} onPress={handleCancelBooking} variant="danger" style={styles.sosSendBtn} />
            <Button label="No, Keep" onPress={() => setShowCancelConfirm(false)} variant="ghost" style={styles.sosCloseBtn} />
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
