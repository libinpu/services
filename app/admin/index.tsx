import React, { useEffect, useState } from 'react';
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
import {
  ShieldCheck,
  LayoutDashboard,
  FileCheck,
  CalendarClock,
  Database,
  Users,
  Search,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Award,
  Bell,
  ArrowLeft,
  ChevronRight,
  Eye,
  IndianRupee,
  ExternalLink,
  Trash2,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { colors } from '@/lib/theme';
import { ProviderProfile, Booking, Profile } from '@/lib/types';

type AdminTab = 'dashboard' | 'approvals' | 'requests' | 'tables' | 'users';

export default function AdminScreen() {
  const router = useRouter();
  const { profile, loading: authLoading } = useAuth();
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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Profiles
      const { data: profData } = await supabase.from('profiles').select('*');
      if (profData) setProfiles(profData);

      // Fetch Provider Profiles
      const { data: provData } = await supabase.from('provider_profiles').select('*');
      if (provData) setProviders(provData);

      // Fetch Bookings
      const { data: bookData } = await supabase.from('bookings').select('*');
      if (bookData) setBookings(bookData);
    } catch (error) {
      console.warn('Admin fetch error:', error);
      // Leave state as empty arrays — no mock/dummy fallback
    } finally {
      setLoading(false);
    }
  };

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
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.neutral[900] }}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  if (!profile || profile.role !== 'admin') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.neutral[900], padding: 32 }}>
        <ShieldCheck size={64} color={colors.error[400]} strokeWidth={1.5} />
        <Text style={{ color: '#fff', fontSize: 22, fontWeight: '700', marginTop: 20, textAlign: 'center' }}>
          Access Denied
        </Text>
        <Text style={{ color: '#9ca3af', fontSize: 14, marginTop: 8, textAlign: 'center', lineHeight: 22 }}>
          This area is restricted to administrators only. You do not have permission to view this page.
        </Text>
        <TouchableOpacity
          onPress={() => router.replace('/' as any)}
          style={{ marginTop: 28, backgroundColor: colors.primary[600], borderRadius: 12, paddingHorizontal: 28, paddingVertical: 12 }}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Go to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft color="#fff" size={20} />
          </TouchableOpacity>
          <View style={styles.logoBadge}>
            <ShieldCheck color="#fff" size={20} />
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
            <LayoutDashboard color={activeTab === 'dashboard' ? colors.primary[500] : '#9CA3AF'} size={16} />
            <Text style={[styles.tabText, activeTab === 'dashboard' && styles.activeTabText]}>Dashboard</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'approvals' && styles.activeTabItem]}
            onPress={() => setActiveTab('approvals')}
          >
            <FileCheck color={activeTab === 'approvals' ? colors.primary[500] : '#9CA3AF'} size={16} />
            <Text style={[styles.tabText, activeTab === 'approvals' && styles.activeTabText]}>
              Approvals ({pendingProviders.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'requests' && styles.activeTabItem]}
            onPress={() => setActiveTab('requests')}
          >
            <CalendarClock color={activeTab === 'requests' ? colors.primary[500] : '#9CA3AF'} size={16} />
            <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
              Service Orders ({bookings.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'tables' && styles.activeTabItem]}
            onPress={() => setActiveTab('tables')}
          >
            <Database color={activeTab === 'tables' ? colors.primary[500] : '#9CA3AF'} size={16} />
            <Text style={[styles.tabText, activeTab === 'tables' && styles.activeTabText]}>Tables Explorer</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'users' && styles.activeTabItem]}
            onPress={() => setActiveTab('users')}
          >
            <Users color={activeTab === 'users' ? colors.primary[500] : '#9CA3AF'} size={16} />
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
                  <CheckCircle2 color="#10B981" size={24} />
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
                        <Eye color="#fff" size={14} />
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
                      <Eye color="#fff" size={14} />
                      <Text style={styles.btnInspectText}>View Certificates</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.btnApprove}
                      onPress={() => handleUpdateProviderStatus(prov.id, true, 'approved')}
                    >
                      <Text style={styles.btnApproveText}>Approve</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.btnReject}
                      onPress={() => handleUpdateProviderStatus(prov.id, false, 'rejected')}
                    >
                      <Text style={styles.btnRejectText}>Reject</Text>
                    </TouchableOpacity>
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
                        <Text style={styles.cardSub}>Status: {b.status.toUpperCase()} • OTP: {b.otp || 'N/A'}</Text>
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
                    <TouchableOpacity 
                      style={styles.btnReject} 
                      onPress={() => handleDeleteUser(p.id)}
                    >
                      <Trash2 color="#EF4444" size={14} />
                      <Text style={styles.btnRejectText}>Delete User</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* INSPECT CERTIFICATE MODAL */}
      <Modal visible={!!selectedProvider} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Certificate & Document Proofs</Text>
              <TouchableOpacity onPress={() => setSelectedProvider(null)}>
                <XCircle color="#9CA3AF" size={24} />
              </TouchableOpacity>
            </View>

            {selectedProvider && (
              <ScrollView style={{ maxHeight: 400 }}>
                <Text style={styles.docLabel}>ID Proof Document</Text>
                {selectedProvider.id_proof_url ? (
                  <Image source={{ uri: selectedProvider.id_proof_url }} style={styles.certImg} />
                ) : (
                  <View style={[styles.certImg, { alignItems: 'center', justifyContent: 'center', backgroundColor: '#1f2937' }]}>
                    <Text style={{ color: '#6b7280', fontSize: 13 }}>Not uploaded</Text>
                  </View>
                )}

                <Text style={styles.docLabel}>Address Proof Document</Text>
                {selectedProvider.address_proof_url ? (
                  <Image source={{ uri: selectedProvider.address_proof_url }} style={styles.certImg} />
                ) : (
                  <View style={[styles.certImg, { alignItems: 'center', justifyContent: 'center', backgroundColor: '#1f2937' }]}>
                    <Text style={{ color: '#6b7280', fontSize: 13 }}>Not uploaded</Text>
                  </View>
                )}

                <Text style={styles.docLabel}>Police Clearance Certificate</Text>
                {selectedProvider.police_verification_url ? (
                  <Image source={{ uri: selectedProvider.police_verification_url }} style={styles.certImg} />
                ) : (
                  <View style={[styles.certImg, { alignItems: 'center', justifyContent: 'center', backgroundColor: '#1f2937' }]}>
                    <Text style={{ color: '#6b7280', fontSize: 13 }}>Not uploaded</Text>
                  </View>
                )}
              </ScrollView>
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.btnApproveFull}
                onPress={() =>
                  selectedProvider && handleUpdateProviderStatus(selectedProvider.id, true, 'approved')
                }
              >
                <Text style={styles.btnApproveText}>Approve Provider</Text>
              </TouchableOpacity>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  header: {
    height: 64,
    backgroundColor: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
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
    color: '#FFF',
  },
  headerSub: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  refreshBtn: {
    padding: 8,
    backgroundColor: '#1F2937',
    borderRadius: 8,
  },
  tabsContainer: {
    backgroundColor: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
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
    backgroundColor: '#1F2937',
  },
  activeTabItem: {
    backgroundColor: colors.primary[900] + '40',
    borderWidth: 1,
    borderColor: colors.primary[500] + '60',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
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
    color: '#9CA3AF',
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
    backgroundColor: '#111827',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  statLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  statValAlert: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#F59E0B',
    marginVertical: 4,
  },
  statValSuccess: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#10B981',
    marginVertical: 4,
  },
  statValInfo: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#3B82F6',
    marginVertical: 4,
  },
  statDesc: {
    fontSize: 10,
    color: '#6B7280',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 8,
  },
  emptyCard: {
    backgroundColor: '#111827',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  cardItem: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1F2937',
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
    color: '#FFF',
  },
  cardSub: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  badgePending: {
    backgroundColor: '#F59E0B20',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#F59E0B50',
  },
  badgePendingText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#F59E0B',
  },
  badgeApproved: {
    backgroundColor: '#10B98120',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#10B98150',
  },
  badgeRejected: {
    backgroundColor: '#EF444420',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#EF444450',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFF',
  },
  proofsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  proofPill: {
    backgroundColor: '#1F2937',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  proofPillText: {
    fontSize: 11,
    color: '#D1D5DB',
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
    backgroundColor: '#1F2937',
    paddingVertical: 8,
    borderRadius: 10,
  },
  btnInspectText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  btnApprove: {
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  btnApproveText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFF',
  },
  btnReject: {
    backgroundColor: '#EF444420',
    borderWidth: 1,
    borderColor: '#EF444450',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  btnRejectText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
  },
  costText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10B981',
  },
  tableCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  tableCardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFF',
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  rowName: {
    color: '#E5E7EB',
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
    backgroundColor: '#111827',
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
    color: '#FFF',
  },
  docLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    marginTop: 10,
    marginBottom: 6,
  },
  certImg: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    backgroundColor: '#1F2937',
  },
  modalFooter: {
    marginTop: 10,
  },
  btnApproveFull: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
});
