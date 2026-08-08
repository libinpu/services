import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Modal,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ShieldCheck, LayoutDashboard, FileCheck, CalendarClock, Database, Users, Search, CircleCheck as CheckCircle2, Circle as XCircle, RefreshCw, Award, Bell, ArrowLeft, ChevronRight, Eye, IndianRupee, ExternalLink, Trash2 } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { colors, radius } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';
import { ProviderProfile, Booking, Profile, Address, Wallet, ProviderApplication } from '@/lib/types';

type AdminTab = 'dashboard' | 'approvals' | 'requests' | 'tables' | 'users';

type UserDetailsState = {
  profile: Profile | null;
  providerProfile: ProviderProfile | null;
  providerApplication: ProviderApplication | null;
  addresses: Address[];
  bookings: Booking[];
  wallet: Wallet | null;
};

export default function AdminScreen() {
  const router = useRouter();
  const { profile, loading: authLoading } = useAuth();
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [loading, setLoading] = useState<boolean>(true);

  // Admin guard — redirect non-admins immediately
  useEffect(() => {
    if (!authLoading && profile && profile.role !== 'admin') {
      router.replace('/' as any);
    }
  }, [authLoading, profile]);

  // Database Data States
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [providers, setProviders] = useState<ProviderProfile[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);

  // Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [approvalFilter, setApprovalFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  // Modal State
  const [selectedProvider, setSelectedProvider] = useState<ProviderProfile | null>(null);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [selectedUserDetails, setSelectedUserDetails] = useState<UserDetailsState | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.neutral[50],
    },
    header: {
      height: 64,
      backgroundColor: colors.neutral[100],
      borderBottomWidth: 1,
      borderBottomColor: colors.neutral[200],
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    backBtn: {
      padding: 6,
    },
    logoBadge: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.primary[500],
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.neutral[700],
    },
    headerSub: {
      fontSize: 11,
      color: colors.neutral[400],
    },
    refreshBtn: {
      padding: 8,
      backgroundColor: colors.neutral[200],
      borderRadius: 8,
    },
    tabsContainer: {
      backgroundColor: colors.neutral[100],
      borderBottomWidth: 1,
      borderBottomColor: colors.neutral[200],
    },
    tabsScroll: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 8,
    },
    tabItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: colors.neutral[200],
    },
    activeTabItem: {
      backgroundColor: colors.primary[50],
      borderWidth: 1,
      borderColor: colors.primary[200],
    },
    tabText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.neutral[400],
    },
    activeTabText: {
      color: colors.primary[400],
    },
    centerContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    loadingText: {
      color: colors.neutral[400],
      fontSize: 13,
      marginTop: 12,
    },
    contentBody: {
      flex: 1,
      padding: 16,
    },
    sectionContainer: {
      gap: 16,
    },
    statsGrid: {
      flexDirection: 'row',
      gap: 12,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.neutral[100],
      padding: 14,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.neutral[200],
    },
    statLabel: {
      fontSize: 11,
      color: colors.neutral[400],
      fontWeight: '500',
    },
    statValAlert: {
      fontSize: 22,
      fontWeight: 'bold',
      color: colors.primary[600],
      marginVertical: 4,
    },
    statValSuccess: {
      fontSize: 22,
      fontWeight: 'bold',
      color: colors.success[600],
      marginVertical: 4,
    },
    statValInfo: {
      fontSize: 22,
      fontWeight: 'bold',
      color: colors.primary[600],
      marginVertical: 4,
    },
    statDesc: {
      fontSize: 10,
      color: colors.neutral[500],
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: 'bold',
      color: colors.neutral[700],
      marginTop: 8,
    },
    emptyCard: {
      backgroundColor: colors.neutral[100],
      padding: 20,
      borderRadius: 16,
      alignItems: 'center',
      gap: 8,
    },
    emptyText: {
      color: colors.neutral[400],
      fontSize: 13,
    },
    cardItem: {
      backgroundColor: colors.neutral[100],
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.neutral[200],
      gap: 12,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    cardTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      color: colors.neutral[700],
    },
    cardSub: {
      fontSize: 12,
      color: colors.neutral[400],
      marginTop: 2,
    },
    badgePending: {
      backgroundColor: colors.primary[50],
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: colors.primary[200],
    },
    badgePendingText: {
      fontSize: 10,
      fontWeight: 'bold',
      color: colors.primary[600],
    },
    badgeApproved: {
      backgroundColor: colors.success[50],
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: colors.success[200],
    },
    badgeRejected: {
      backgroundColor: colors.error[50],
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: colors.error[200],
    },
    badgeText: {
      fontSize: 10,
      fontWeight: 'bold',
      color: colors.neutral[0],
    },
    proofsRow: {
      flexDirection: 'row',
      gap: 8,
    },
    proofPill: {
      backgroundColor: colors.neutral[200],
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    proofPillText: {
      fontSize: 11,
      color: colors.neutral[500],
    },
    cardActions: {
      flexDirection: 'row',
      gap: 8,
    },
    btnInspect: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: colors.neutral[200],
      paddingVertical: 8,
      borderRadius: 10,
    },
    btnInspectText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.neutral[700],
    },
    btnApprove: {
      backgroundColor: colors.success[600],
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: radius.full,
    },
    btnApproveText: {
      fontSize: 12,
      fontWeight: 'bold',
      color: colors.neutral[0],
    },
    btnReject: {
      backgroundColor: colors.error[50],
      borderWidth: 1,
      borderColor: colors.error[200],
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 10,
    },
    btnRejectText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.error[600],
    },
    costText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.success[600],
    },
    tableCard: {
      backgroundColor: colors.neutral[100],
      borderRadius: 16,
      padding: 16,
      gap: 10,
    },
    tableCardTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      color: colors.neutral[700],
    },
    tableRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.neutral[200],
    },
    rowName: {
      color: colors.neutral[500],
      fontSize: 13,
    },
    rowRole: {
      color: colors.primary[400],
      fontSize: 11,
      fontWeight: 'bold',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.8)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    modalContent: {
      width: '100%',
      maxWidth: 500,
      backgroundColor: colors.neutral[100],
      borderRadius: 24,
      padding: 20,
      gap: 14,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.neutral[700],
    },
    docLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.neutral[400],
      marginTop: 10,
      marginBottom: 6,
    },
    certImg: {
      width: '100%',
      height: 160,
      borderRadius: 12,
      backgroundColor: colors.neutral[200],
    },
    modalFooter: {
      marginTop: 10,
    },
    btnApproveFull: {
      backgroundColor: colors.success[600],
      paddingVertical: 12,
      borderRadius: radius.full,
      alignItems: 'center',
    },
    detailSection: {
      backgroundColor: colors.neutral[50],
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.neutral[200],
      padding: 12,
      gap: 8,
    },
    detailTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.neutral[700],
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 8,
    },
    detailLabel: {
      fontSize: 12,
      color: colors.neutral[400],
      flex: 1,
    },
    detailValue: {
      fontSize: 12,
      color: colors.neutral[700],
      fontWeight: '600',
      flex: 1,
      textAlign: 'right',
    },
    detailChip: {
      backgroundColor: colors.primary[50],
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 4,
      alignSelf: 'flex-start',
    },
    detailChipText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.primary[600],
    },
  });

  const formatDate = (value: string | null | undefined) => {
    if (!value) return 'Not available';
    try {
      return new Date(value).toLocaleString();
    } catch {
      return value;
    }
  };

  const loadUserDetails = useCallback(async (user: Profile) => {
    setDetailsLoading(true);
    setDetailsError(null);
    setSelectedUser(user);
    setSelectedUserDetails(null);

    try {
      const [providerProfileResult, providerApplicationResult, addressesResult, bookingsResult, walletResult] = await Promise.all([
        supabase
          .from('provider_profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle(),
        supabase
          .from('provider_applications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('addresses')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('bookings')
          .select('*')
          .or(`customer_id.eq.${user.id},provider_id.eq.${user.id}`)
          .order('created_at', { ascending: false })
          .limit(25),
        supabase
          .from('wallets')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);

      if (providerProfileResult.error) throw providerProfileResult.error;
      if (providerApplicationResult.error) throw providerApplicationResult.error;
      if (addressesResult.error) throw addressesResult.error;
      if (bookingsResult.error) throw bookingsResult.error;
      if (walletResult.error) throw walletResult.error;

      setSelectedUserDetails({
        profile: user,
        providerProfile: (providerProfileResult.data as ProviderProfile | null) ?? null,
        providerApplication: (providerApplicationResult.data as ProviderApplication | null) ?? null,
        addresses: (addressesResult.data as Address[] | null) ?? [],
        bookings: (bookingsResult.data as Booking[] | null) ?? [],
        wallet: (walletResult.data as Wallet | null) ?? null,
      });
    } catch (error) {
      console.warn('User details fetch error:', error);
      setDetailsError('Unable to load this user’s database details right now.');
    } finally {
      setDetailsLoading(false);
    }
  }, []);

  const closeUserDetails = () => {
    setSelectedUser(null);
    setSelectedUserDetails(null);
    setDetailsError(null);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Admin data is bounded and loaded concurrently. Do not use this screen
      // for unbounded table scans; pagination/server summaries belong in an RPC.
      const [profilesResult, providersResult, bookingsResult] = await Promise.all([
        supabase.from('profiles')
          .select('id, role, full_name, phone, email, avatar_url, preferred_language, zone_id, is_active, created_at, updated_at')
          .order('created_at', { ascending: false }).limit(200),
        supabase.from('provider_profiles')
          .select('id, category_ids, specializations, experience_years, is_verified, background_check_status, rating_avg, rating_count, jobs_completed, is_online, price_per_hour, zone_id, bio_en, bio_ml, id_proof_url, address_proof_url, police_verification_url, latitude, longitude, last_location_at, created_at, updated_at')
          .order('created_at', { ascending: false }).limit(200),
        supabase.from('bookings')
          .select('id, customer_id, provider_id, subcategory_id, address_id, zone_id, status, scheduled_at, booking_mode, estimated_cost, final_cost, payment_method, payment_status, otp, otp_verified, started_at, completed_at, cancelled_at, cancellation_reason, created_at, updated_at, estimated_eta_mins, distance_km')
          .order('created_at', { ascending: false }).limit(200),
      ]);
      if (profilesResult.error) throw profilesResult.error;
      if (providersResult.error) throw providersResult.error;
      if (bookingsResult.error) throw bookingsResult.error;
      const profData = profilesResult.data;
      const provData = providersResult.data;
      const bookData = bookingsResult.data;
      if (profData) setProfiles(profData);
      if (provData) setProviders(provData);
      if (bookData) setBookings(bookData);
    } catch (error) {
      console.warn('Admin fetch error:', error);
      // Leave state as empty arrays — no mock/dummy fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleUpdateProviderStatus = async (provId: string, isVerified: boolean, status: 'approved' | 'rejected') => {
    try {
      const targetRole = isVerified ? 'provider' : 'customer';

      // 1. Update provider_profiles
      await supabase
        .from('provider_profiles')
        .update({ is_verified: isVerified, background_check_status: status, updated_at: new Date().toISOString() })
        .eq('id', provId);

      // 2. Update provider_applications
      await supabase
        .from('provider_applications')
        .update({ status, reviewed_at: new Date().toISOString() })
        .eq('user_id', provId);

      // 3. Update user profile role so user and professional both act like changed
      await supabase
        .from('profiles')
        .update({ role: targetRole, updated_at: new Date().toISOString() })
        .eq('id', provId);

      if (isVerified) {
        try {
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', provId)
            .maybeSingle();

          await supabase.functions.invoke('send-provider-approval-email', {
            body: {
              user_id: provId,
              email: userProfile?.email || null,
              full_name: userProfile?.full_name || 'Professional',
            },
          });
        } catch (mailError) {
          console.info('Approval notification trigger skipped because no provider-email function is configured yet.', mailError);
        }
      }

      setProviders((prev) =>
        prev.map((p) => (p.id === provId ? { ...p, is_verified: isVerified, background_check_status: status } : p))
      );

      setProfiles((prev) =>
        prev.map((u) => (u.id === provId ? { ...u, role: targetRole } : u))
      );

      if (Platform.OS === 'web') {
        alert(`Provider application marked as ${status.toUpperCase()} (Role: ${targetRole.toUpperCase()})`);
      } else {
        Alert.alert('Status Updated', `Provider marked as ${status} (Role: ${targetRole})`);
      }
      setSelectedProvider(null);
    } catch (e) {
      console.error('Update status failed:', e);
    }
  };

  const handleDeleteUser = (userId: string) => {
    if (Platform.OS === 'web') {
      if (window.confirm('Delete this user completely? This action cannot be undone.')) {
        executeDelete(userId);
      }
    } else {
      Alert.alert('Delete User', 'Are you sure you want to permanently delete this user? This action cannot be undone.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => executeDelete(userId) },
      ]);
    }
  };

  const executeDelete = async (userId: string) => {
    try {
      // 1. Delete from provider profiles if exists
      await supabase.from('provider_profiles').delete().eq('id', userId);
      // 2. Delete from profiles
      await supabase.from('profiles').delete().eq('id', userId);

      setProfiles(prev => prev.filter(p => p.id !== userId));
      setProviders(prev => prev.filter(p => p.id !== userId));

      if (Platform.OS === 'web') alert('User deleted successfully.');
      else Alert.alert('Success', 'User deleted successfully.');
    } catch (e) {
      console.error('Delete user failed:', e);
    }
  };

  const pendingProviders = providers.filter((p) => p.background_check_status === 'pending');
  const verifiedProviders = providers.filter((p) => p.is_verified);

  // Block non-admin users from seeing the dashboard
  if (authLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.neutral[50] }}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  if (!profile || profile.role !== 'admin') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.neutral[50], padding: 32 }}>
        <ShieldCheck size={64} color={colors.error[400]} strokeWidth={1.5} />
        <Text style={{ color: colors.neutral[700], fontSize: 22, fontWeight: '700', marginTop: 20, textAlign: 'center' }}>
          Access Denied
        </Text>
        <Text style={{ color: colors.neutral[500], fontSize: 14, marginTop: 8, textAlign: 'center', lineHeight: 22 }}>
          This area is restricted to administrators only. You do not have permission to view this page.
        </Text>
        <TouchableOpacity
          onPress={() => router.replace('/' as any)}
          style={{ marginTop: 28, backgroundColor: colors.primary[600], borderRadius: radius.full, paddingHorizontal: 28, paddingVertical: 12 }}
        >
          <Text style={{ color: colors.neutral[0], fontWeight: '700', fontSize: 15 }}>Go to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)');
              }
            }}
            style={styles.backBtn}
          >
            <ArrowLeft color={colors.neutral[700]} size={20} />
          </TouchableOpacity>
          <View style={styles.logoBadge}>
            <ShieldCheck color={colors.neutral[0]} size={20} />
          </View>
          <View>
            <Text style={styles.headerTitle}>SEVA Admin Panel</Text>
            <Text style={styles.headerSub}>Database & Verification Control Center</Text>
          </View>
        </View>

        <TouchableOpacity onPress={fetchData} style={styles.refreshBtn}>
          <RefreshCw color={colors.primary[400]} size={18} />
        </TouchableOpacity>
      </View>

      {/* Main Tabs Navigation */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'dashboard' && styles.activeTabItem]}
            onPress={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard color={activeTab === 'dashboard' ? colors.primary[500] : colors.neutral[400]} size={16} />
            <Text style={[styles.tabText, activeTab === 'dashboard' && styles.activeTabText]}>Dashboard</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'approvals' && styles.activeTabItem]}
            onPress={() => setActiveTab('approvals')}
          >
            <FileCheck color={activeTab === 'approvals' ? colors.primary[500] : colors.neutral[400]} size={16} />
            <Text style={[styles.tabText, activeTab === 'approvals' && styles.activeTabText]}>
              Approvals ({pendingProviders.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'requests' && styles.activeTabItem]}
            onPress={() => setActiveTab('requests')}
          >
            <CalendarClock color={activeTab === 'requests' ? colors.primary[500] : colors.neutral[400]} size={16} />
            <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
              Service Orders ({bookings.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'tables' && styles.activeTabItem]}
            onPress={() => setActiveTab('tables')}
          >
            <Database color={activeTab === 'tables' ? colors.primary[500] : colors.neutral[400]} size={16} />
            <Text style={[styles.tabText, activeTab === 'tables' && styles.activeTabText]}>Tables Explorer</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'users' && styles.activeTabItem]}
            onPress={() => setActiveTab('users')}
          >
            <Users color={activeTab === 'users' ? colors.primary[500] : colors.neutral[400]} size={16} />
            <Text style={[styles.tabText, activeTab === 'users' && styles.activeTabText]}>Users ({profiles.length})</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Main Content Area */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text style={styles.loadingText}>Syncing Supabase Records...</Text>
        </View>
      ) : (
        <ScrollView style={styles.contentBody} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <View style={styles.sectionContainer}>
              {/* Stat Cards */}
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>Pending Verification</Text>
                  <Text style={styles.statValAlert}>{pendingProviders.length}</Text>
                  <Text style={styles.statDesc}>Requires Admin Review</Text>
                </View>

                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>Verified Providers</Text>
                  <Text style={styles.statValSuccess}>{verifiedProviders.length}</Text>
                  <Text style={styles.statDesc}>Active Marketplace Pros</Text>
                </View>

                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>Total Bookings</Text>
                  <Text style={styles.statValInfo}>{bookings.length}</Text>
                  <Text style={styles.statDesc}>All Service Orders</Text>
                </View>
              </View>

              {/* Pending Approvals Quick Feed */}
              <Text style={styles.sectionTitle}>Pending Provider Verification Requests</Text>
              {pendingProviders.length === 0 ? (
                <View style={styles.emptyCard}>
                  <CheckCircle2 color={colors.success[600]} size={24} />
                  <Text style={styles.emptyText}>All provider applications have been reviewed!</Text>
                </View>
              ) : (
                pendingProviders.map((prov) => {
                  const prof = profiles.find(p => p.id === prov.id);
                  return (
                    <View key={prov.id} style={styles.cardItem}>
                      <View style={styles.cardHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.cardTitle}>{prof?.full_name || `Provider #${prov.id.substring(0, 6)}`}</Text>
                          <Text style={styles.cardSub}>
                            {prov.experience_years} Years Experience • ₹{prov.price_per_hour}/hr
                          </Text>
                        </View>
                        <View style={styles.badgePending}>
                          <Text style={styles.badgePendingText}>PENDING</Text>
                        </View>
                      </View>

                    <View style={styles.cardActions}>
                      <TouchableOpacity style={styles.btnInspect} onPress={() => setSelectedProvider(prov)}>
                        <Eye color={colors.neutral[700]} size={14} />
                        <Text style={styles.btnInspectText}>Inspect Certificate Proofs</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.btnApprove}
                        onPress={() => handleUpdateProviderStatus(prov.id, true, 'approved')}
                      >
                        <Text style={styles.btnApproveText}>Approve</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
              )}
            </View>
          )}

          {/* TAB 2: APPROVALS & CERTIFICATES */}
          {activeTab === 'approvals' && (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Provider Applications & Document Certificates</Text>

              {providers.map((prov) => {
                const prof = profiles.find(p => p.id === prov.id);
                return (
                  <View key={prov.id} style={styles.cardItem}>
                    <View style={styles.cardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle}>{prof?.full_name || `Professional Provider #${prov.id.substring(0, 6)}`}</Text>
                        <Text style={styles.cardSub}>
                          {prov.specializations?.join(', ') || 'General Repairs'} • {prov.experience_years} Years
                        </Text>
                      </View>
                      <View
                      style={
                        prov.background_check_status === 'approved'
                          ? styles.badgeApproved
                          : prov.background_check_status === 'pending'
                          ? styles.badgePending
                          : styles.badgeRejected
                      }
                    >
                      <Text style={styles.badgeText}>{prov.background_check_status.toUpperCase()}</Text>
                    </View>
                  </View>

                  <View style={styles.proofsRow}>
                    <View style={styles.proofPill}>
                      <Text style={styles.proofPillText}>ID Proof: Available</Text>
                    </View>
                    <View style={styles.proofPill}>
                      <Text style={styles.proofPillText}>Address Proof: Available</Text>
                    </View>
                  </View>

                  <View style={styles.cardActions}>
                    <TouchableOpacity style={styles.btnInspect} onPress={() => setSelectedProvider(prov)}>
                      <Eye color={colors.neutral[700]} size={14} />
                      <Text style={styles.btnInspectText}>View Certificates</Text>
                    </TouchableOpacity>

                    {prov.background_check_status === 'pending' && (
                      <TouchableOpacity
                        style={styles.btnApprove}
                        onPress={() => handleUpdateProviderStatus(prov.id, true, 'approved')}
                      >
                        <Text style={styles.btnApproveText}>Approve</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                );
              })}
            </View>
          )}

          {/* TAB 3: SERVICE ORDERS */}
          {activeTab === 'requests' && (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>All Marketplace Service Orders</Text>

              {bookings.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>No service bookings found in database</Text>
                </View>
              ) : (
                bookings.map((b) => (
                  <View key={b.id} style={styles.cardItem}>
                    <View style={styles.cardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle}>Booking #{b.id.substring(0, 8)}</Text>
                        <Text style={styles.cardSub}>Status: {b.status.toUpperCase()} • OTP: {b.otp && b.otp.length > 4 ? '[Secured]' : (b.otp || 'N/A')}</Text>
                      </View>
                      <Text style={styles.costText}>₹{b.estimated_cost}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {/* TAB 4: TABLES EXPLORER */}
          {activeTab === 'tables' && (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Database Tables Explorer</Text>
              <View style={styles.tableCard}>
                <Text style={styles.tableCardTitle}>Registered Profiles ({profiles.length})</Text>
                {profiles.slice(0, 5).map((p) => (
                  <View key={p.id} style={styles.tableRow}>
                    <Text style={styles.rowName}>{p.full_name || 'User Account'}</Text>
                    <Text style={styles.rowRole}>{p.role.toUpperCase()}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* TAB 5: USERS MANAGEMENT */}
          {activeTab === 'users' && (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Manage Platform Users</Text>
              
              {profiles.map((p) => (
                <View key={p.id} style={styles.cardItem}>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>{p.full_name || 'User Account'}</Text>
                      <Text style={styles.cardSub}>{p.phone || p.email || 'No contact info'}</Text>
                    </View>
                    <View style={p.role === 'admin' ? styles.badgePending : styles.badgeApproved}>
                      <Text style={p.role === 'admin' ? styles.badgePendingText : styles.badgeText}>{p.role.toUpperCase()}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.cardActions}>
                    <TouchableOpacity style={styles.btnInspect} onPress={() => void loadUserDetails(p)}>
                      <Eye color={colors.neutral[700]} size={14} />
                      <Text style={styles.btnInspectText}>View Details</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.btnReject} 
                      onPress={() => handleDeleteUser(p.id)}
                    >
                      <Trash2 color={colors.error[600]} size={14} />
                      <Text style={styles.btnRejectText}>Delete User</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* USER DETAILS MODAL */}
      <Modal visible={!!selectedUser} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>{selectedUser?.full_name || 'User Details'}</Text>
                <Text style={styles.cardSub}>{selectedUser?.email || selectedUser?.phone || 'No contact info'}</Text>
              </View>
              <TouchableOpacity onPress={closeUserDetails}>
                <XCircle color={colors.neutral[400]} size={24} />
              </TouchableOpacity>
            </View>

            {detailsLoading ? (
              <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={colors.primary[500]} />
                <Text style={styles.loadingText}>Loading live database details...</Text>
              </View>
            ) : detailsError ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>{detailsError}</Text>
              </View>
            ) : selectedUserDetails ? (
              <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ gap: 12, paddingVertical: 4 }}>
                <View style={styles.detailSection}>
                  <Text style={styles.detailTitle}>Profile Snapshot</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Role</Text>
                    <Text style={styles.detailValue}>{selectedUserDetails.profile?.role?.toUpperCase() || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status</Text>
                    <Text style={styles.detailValue}>{selectedUserDetails.profile?.is_active ? 'Active' : 'Inactive'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Phone</Text>
                    <Text style={styles.detailValue}>{selectedUserDetails.profile?.phone || 'Not provided'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Language</Text>
                    <Text style={styles.detailValue}>{selectedUserDetails.profile?.preferred_language?.toUpperCase() || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Created</Text>
                    <Text style={styles.detailValue}>{formatDate(selectedUserDetails.profile?.created_at)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Updated</Text>
                    <Text style={styles.detailValue}>{formatDate(selectedUserDetails.profile?.updated_at)}</Text>
                  </View>
                </View>

                {selectedUserDetails.providerProfile ? (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailTitle}>Provider Profile</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Verified</Text>
                      <Text style={styles.detailValue}>{selectedUserDetails.providerProfile.is_verified ? 'Yes' : 'No'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Status</Text>
                      <Text style={styles.detailValue}>{selectedUserDetails.providerProfile.background_check_status?.toUpperCase() || 'N/A'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Jobs</Text>
                      <Text style={styles.detailValue}>{selectedUserDetails.providerProfile.jobs_completed ?? 0}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Rating</Text>
                      <Text style={styles.detailValue}>{selectedUserDetails.providerProfile.rating_avg?.toFixed(1) || '0.0'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Price / hour</Text>
                      <Text style={styles.detailValue}>₹{selectedUserDetails.providerProfile.price_per_hour ?? 0}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Experience</Text>
                      <Text style={styles.detailValue}>{selectedUserDetails.providerProfile.experience_years ?? 0} yrs</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailTitle}>Provider Profile</Text>
                    <Text style={styles.detailValue}>No provider profile linked in the database.</Text>
                  </View>
                )}

                <View style={styles.detailSection}>
                  <Text style={styles.detailTitle}>Related Records</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Addresses</Text>
                    <Text style={styles.detailValue}>{selectedUserDetails.addresses.length}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Bookings</Text>
                    <Text style={styles.detailValue}>{selectedUserDetails.bookings.length}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Wallet Balance</Text>
                    <Text style={styles.detailValue}>₹{selectedUserDetails.wallet?.balance ?? 0}</Text>
                  </View>
                  {selectedUserDetails.providerApplication && (
                    <View style={{ marginTop: 4 }}>
                      <Text style={styles.detailLabel}>Provider Application</Text>
                      <View style={styles.detailChip}>
                        <Text style={styles.detailChipText}>{selectedUserDetails.providerApplication.status?.toUpperCase() || 'UNKNOWN'}</Text>
                      </View>
                    </View>
                  )}
                </View>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* INSPECT CERTIFICATE MODAL */}
      <Modal visible={!!selectedProvider} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Certificate & Document Proofs</Text>
              <TouchableOpacity onPress={() => setSelectedProvider(null)}>
                <XCircle color={colors.neutral[400]} size={24} />
              </TouchableOpacity>
            </View>

            {selectedProvider && (
              <ScrollView style={{ maxHeight: 400 }}>
                <Text style={styles.docLabel}>ID Proof Document</Text>
                {selectedProvider.id_proof_url ? (
                  <Image source={{ uri: selectedProvider.id_proof_url }} style={styles.certImg} />
                ) : (
                  <View style={[styles.certImg, { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.neutral[200] }]}>
                    <Text style={{ color: colors.neutral[500], fontSize: 13 }}>Not uploaded</Text>
                  </View>
                )}

                <Text style={styles.docLabel}>Address Proof Document</Text>
                {selectedProvider.address_proof_url ? (
                  <Image source={{ uri: selectedProvider.address_proof_url }} style={styles.certImg} />
                ) : (
                  <View style={[styles.certImg, { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.neutral[200] }]}>
                    <Text style={{ color: colors.neutral[500], fontSize: 13 }}>Not uploaded</Text>
                  </View>
                )}

                <Text style={styles.docLabel}>Police Clearance Certificate</Text>
                {selectedProvider.police_verification_url ? (
                  <Image source={{ uri: selectedProvider.police_verification_url }} style={styles.certImg} />
                ) : (
                  <View style={[styles.certImg, { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.neutral[200] }]}>
                    <Text style={{ color: colors.neutral[500], fontSize: 13 }}>Not uploaded</Text>
                  </View>
                )}
              </ScrollView>
            )}

            <View style={styles.modalFooter}>
              {selectedProvider?.background_check_status === 'pending' && (
                <TouchableOpacity
                  style={styles.btnApproveFull}
                  onPress={() =>
                    selectedProvider && handleUpdateProviderStatus(selectedProvider.id, true, 'approved')
                  }
                >
                  <Text style={styles.btnApproveText}>Approve Provider</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Router Hook helper
function RouterHook() {
  try {
    return useRouter();
  } catch (e) {
    return { back: () => {} };
  }
}
