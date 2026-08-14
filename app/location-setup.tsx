import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, ActivityIndicator, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MapWebView } from '@/components/MapWebView';
import { useLanguage } from '@/lib/language-context';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { colors, spacing, radius, typography, shadows } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';
import { Button, Input } from '@/components/ui';
import { Navigation, CircleAlert as AlertCircle, CircleCheck as CheckCircle, MapPin, Trash2, Plus, Home, Briefcase, Tag, ArrowLeft, CheckCircle2 } from 'lucide-react-native';
import * as Location from 'expo-location';
import type { Address } from '@/lib/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THRISSUR_BOUNDS = {
  minLat: 10.35,
  maxLat: 10.75,
  minLng: 76.05,
  maxLng: 76.45,
};

function isInThrissur(lat: number, lng: number): boolean {
  return lat >= THRISSUR_BOUNDS.minLat && lat <= THRISSUR_BOUNDS.maxLat &&
         lng >= THRISSUR_BOUNDS.minLng && lng <= THRISSUR_BOUNDS.maxLng;
}

function getLabelIcon(label: string) {
  const lower = label.toLowerCase();
  if (lower === 'home') return Home;
  if (lower === 'work') return Briefcase;
  return Tag;
}

export default function LocationSetupScreen() {
  const { t } = useLanguage();
  const { session } = useAuth();
  const router = useRouter();
  const { isDark } = useTheme();

  const { fromBooking } = useLocalSearchParams<{ fromBooking?: string }>();

  const [step, setStep] = useState<'list' | 'permission' | 'map' | 'details' | 'outside' | 'denied'>('list');

  // Saved addresses state
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  const SELECTED_KEY = `selected_address_${session?.user?.id}`;

  // Add-new form state
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [reverseGeocoding, setReverseGeocoding] = useState(false);
  const [reverseGeocodeText, setReverseGeocodeText] = useState<string | null>(null);
  const [label, setLabel] = useState('Home');
  const [customLabel, setCustomLabel] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [area, setArea] = useState('');
  const [city, setCity] = useState('');
  const [districtName, setDistrictName] = useState('');
  const [stateName, setStateName] = useState('');
  const [pincode, setPincode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchAddresses = useCallback(async () => {
    if (!session?.user?.id) { setLoadingAddresses(false); return; }
    setLoadingAddresses(true);
    try {
      const { data, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      if (!error && data) setAddresses(data as Address[]);
    } catch { /* silent */ } finally {
      setLoadingAddresses(false);
    }
  }, [session?.user?.id]);

  // Load persisted selection
  useEffect(() => {
    if (!session?.user?.id) return;
    AsyncStorage.getItem(`selected_address_${session.user.id}`).then((id) => {
      if (id) setSelectedAddressId(id);
    }).catch(() => {});
  }, [session?.user?.id]);

  useEffect(() => { fetchAddresses(); }, [fetchAddresses]);

  const handleSelectAddress = async (id: string) => {
    setSelectedAddressId(id);
    try {
      await AsyncStorage.setItem(`selected_address_${session?.user?.id}`, id);
    } catch { /* silent */ }
    // If opened from booking flow, go back immediately so booking screen picks up new selection
    if (fromBooking === 'true') {
      router.back();
    }
  };

  const handleDeleteAddress = async (id: string) => {
    const confirmDelete = Platform.OS === 'web'
      ? window.confirm('Delete this address?')
      : await new Promise<boolean>((resolve) =>
          Alert.alert('Delete Address', 'Remove this address?', [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
          ])
        );
    if (!confirmDelete) return;
    setDeletingId(id);
    try {
      await supabase.from('addresses').delete().eq('id', id);
      setAddresses((prev) => prev.filter((a) => a.id !== id));
      // If deleted address was selected, clear the selection
      if (selectedAddressId === id) {
        setSelectedAddressId(null);
        try { await AsyncStorage.removeItem(`selected_address_${session?.user?.id}`); } catch { /* silent */ }
      }
    } catch { /* silent */ } finally {
      setDeletingId(null);
    }
  };

  const handleAddNew = () => {
    setCoords(null); setLabel('Home'); setCustomLabel('');
    setAddressLine(''); setArea(''); setCity(''); setDistrictName('');
    setStateName(''); setPincode(''); setError(null); setReverseGeocodeText(null);
    setStep('permission');
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.neutral[50] },
    flex1: { flex: 1 },

    // List step
    listHeader: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
      borderBottomWidth: 1, borderBottomColor: colors.neutral[200],
      backgroundColor: colors.neutral[100],
    },
    listBackBtn: {
      width: 36, height: 36, borderRadius: radius.full,
      backgroundColor: colors.neutral[200],
      alignItems: 'center', justifyContent: 'center', marginRight: spacing.md,
    },
    listTitle: {
      fontSize: typography.sizes.lg, fontWeight: '700',
      color: colors.neutral[900], fontFamily: typography.fontFamilyBold, flex: 1,
    },
    listScroll: { flex: 1 },
    listContent: { padding: spacing.lg, paddingBottom: 100 },
    sectionLabel: {
      fontSize: typography.sizes.sm, fontWeight: '600',
      color: colors.neutral[500], fontFamily: typography.fontFamilyMedium,
      textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm,
    },
    emptyState: { alignItems: 'center', paddingVertical: 48 },
    emptyIcon: {
      width: 72, height: 72, borderRadius: radius.full,
      backgroundColor: colors.primary[50],
      alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md,
    },
    emptyTitle: {
      fontSize: typography.sizes.md, fontWeight: '700',
      color: colors.neutral[900], fontFamily: typography.fontFamilyBold, marginBottom: 4,
    },
    emptyDesc: {
      fontSize: typography.sizes.sm, color: colors.neutral[500],
      fontFamily: typography.fontFamilyRegular, textAlign: 'center',
    },
    addressCard: {
      backgroundColor: colors.neutral[100], borderRadius: radius.xl,
      borderWidth: 1, borderColor: colors.neutral[200],
      padding: spacing.md, marginBottom: spacing.md,
      flexDirection: 'row', alignItems: 'flex-start', ...shadows.sm,
    },
    addressIconWrap: {
      width: 40, height: 40, borderRadius: radius.md,
      backgroundColor: 'rgba(51, 78, 104, 0.08)',
      alignItems: 'center', justifyContent: 'center',
      marginRight: spacing.md, flexShrink: 0,
    },
    addressInfo: { flex: 1 },
    addrLabel: {
      fontSize: typography.sizes.md, fontWeight: '700',
      color: colors.neutral[900], fontFamily: typography.fontFamilyBold, marginBottom: 2,
    },
    addrLine: {
      fontSize: typography.sizes.sm, color: colors.neutral[600],
      fontFamily: typography.fontFamilyRegular, lineHeight: 20,
    },
    addrMeta: {
      fontSize: 11, color: colors.neutral[400],
      fontFamily: typography.fontFamilyRegular, marginTop: 2,
    },
    deleteBtn: {
      width: 34, height: 34, borderRadius: radius.full,
      backgroundColor: '#FEE2E2',
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    // Selected address badge
    selectedBadge: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: colors.success[50],
      borderRadius: radius.full,
      paddingHorizontal: 8, paddingVertical: 3,
      gap: 4, marginTop: 6, alignSelf: 'flex-start',
    },
    selectedBadgeText: {
      fontSize: 10, fontWeight: '700',
      color: colors.success[700], fontFamily: typography.fontFamilyMedium,
      textTransform: 'uppercase', letterSpacing: 0.4,
    },
    // Radio circle for unselected state
    radioCircle: {
      width: 22, height: 22, borderRadius: 11,
      borderWidth: 2, borderColor: colors.neutral[300],
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    addBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      backgroundColor: colors.primary[600], borderRadius: radius.xl,
      paddingVertical: spacing.md, paddingHorizontal: spacing.lg,
      gap: spacing.sm, ...shadows.md, marginTop: spacing.sm,
    },
    addBtnText: {
      fontSize: typography.sizes.md, fontWeight: '700',
      color: colors.neutral[100], fontFamily: typography.fontFamilyBold,
    },

    // Sub-step back button
    subStepBack: {
      width: 36, height: 36, borderRadius: radius.full,
      backgroundColor: colors.neutral[200],
      alignItems: 'center', justifyContent: 'center',
      margin: spacing.md,
    },

    // Permission / denied / outside
    centerContent: {
      flex: 1, alignItems: 'center', justifyContent: 'center',
      paddingHorizontal: spacing.xl,
    },
    iconWrap: {
      width: 120, height: 120, borderRadius: radius.xl,
      backgroundColor: colors.primary[50],
      alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl,
    },
    iconWrapError: { backgroundColor: colors.warning[50] },
    title: {
      fontSize: typography.sizes.xxl, fontWeight: '700',
      color: colors.neutral[900], textAlign: 'center',
      marginBottom: spacing.sm, fontFamily: typography.fontFamilyBold,
    },
    desc: {
      fontSize: typography.sizes.md, color: colors.neutral[500],
      textAlign: 'center', lineHeight: 24,
      marginBottom: spacing.xl, fontFamily: typography.fontFamilyRegular,
    },
    actionBtn: { width: '100%' },
    skipBtn: { marginTop: spacing.lg },
    skipText: {
      fontSize: typography.sizes.md, color: colors.primary[700],
      fontWeight: '600', fontFamily: typography.fontFamilyMedium,
    },

    // Map step
    mapHeader: { padding: spacing.lg, alignItems: 'center' },
    mapTitle: {
      fontSize: typography.sizes.xxl, fontWeight: '700',
      color: colors.neutral[900], marginBottom: spacing.xs,
      fontFamily: typography.fontFamilyBold,
    },
    mapDesc: { fontSize: typography.sizes.sm, color: colors.neutral[500], fontFamily: typography.fontFamilyRegular },
    mapArea: { flex: 1, margin: spacing.md, borderRadius: radius.lg, overflow: 'hidden' },
    mapHintText: { fontSize: typography.sizes.md, color: colors.neutral[700], fontFamily: typography.fontFamilyMedium },
    addressPreview: {
      paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
      backgroundColor: colors.neutral[50],
      borderTopWidth: 1, borderTopColor: colors.neutral[200],
    },
    mapFooter: { padding: spacing.lg },

    // Details step
    scrollContent: { padding: spacing.lg },
    detailsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
    fieldLabel: {
      fontSize: typography.sizes.sm, fontWeight: '600',
      color: colors.neutral[700], marginBottom: spacing.sm,
      fontFamily: typography.fontFamilyMedium,
    },
    labelRow: { flexDirection: 'row', marginBottom: spacing.md },
    labelChip: {
      paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
      borderRadius: radius.full, borderWidth: 1.5,
      borderColor: colors.neutral[200], marginRight: spacing.sm,
    },
    labelChipActive: { borderColor: colors.primary[600], backgroundColor: colors.primary[50] },
    labelChipText: { fontSize: typography.sizes.sm, color: colors.neutral[600], fontFamily: typography.fontFamilyRegular },
    labelChipTextActive: { color: colors.primary[700], fontWeight: '600', fontFamily: typography.fontFamilyMedium },
    input: { marginBottom: spacing.sm },
    errorText: {
      fontSize: typography.sizes.sm, color: colors.error[600],
      marginBottom: spacing.sm, fontFamily: typography.fontFamilyRegular,
    },
  });

  const handleAllowLocation = async () => {
    setLoading(true);
    setError(null);
    try {
      if (Platform.OS !== 'web') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setStep('denied');
          setLoading(false);
          return;
        }
      }
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = location.coords;
      setCoords({ lat: latitude, lng: longitude });
      setStep('map');
      reverseGeocode(latitude, longitude);
    } catch (e: any) {
      if (Platform.OS === 'web' && e.message?.toLowerCase().includes('denied')) {
        setStep('denied');
      } else {
        setError('Could not get your location. Please enable GPS and try again.');
        setStep('denied');
      }
    } finally {
      setLoading(false);
    }
  };

  // When permission is denied, the OS won't show the dialog again —
  // we must redirect the user to App Settings to grant it manually.
  const handleOpenSettings = async () => {
    try {
      await Linking.openSettings();
    } catch {
      setError('Could not open settings. Please enable location manually.');
    }
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    setReverseGeocoding(true);
    setReverseGeocodeText(null);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&zoom=18`,
        { 
          headers: { 
            'Accept-Language': 'en',
            'User-Agent': 'SevaApp/1.0 (Contact: admin@sevaapp.com)'
          } 
        }
      );
      if (!res.ok) throw new Error('Reverse geocode failed');
      const data = await res.json();
      const addr = data.address || {};
      const houseNo = addr.house_number || '';
      const road = addr.road || addr.pedestrian || addr.footway || '';
      const neighbourhood = addr.neighbourhood || addr.hamlet || '';
      const suburb = addr.suburb || addr.residential || '';
      const locality = addr.locality || addr.quarter || '';
      const village = addr.village || '';
      const town = addr.town || '';
      const city = addr.city || addr.municipality || town || village || 'Thrissur';
      const county = addr.county || addr.state_district || 'Thrissur';
      const state = addr.state || 'Kerala';
      const pin = addr.postcode || '';
      const line1 = [houseNo, road].filter(Boolean).join(' ');
      const areaName = [neighbourhood, suburb, locality].filter(Boolean).join(', ') || village || town || '';
      const fullLine = [line1, areaName].filter(Boolean).join(', ');
      const displayName = data.display_name || `${areaName}, ${city}, ${state}`;
      setAddressLine(fullLine || (displayName ? displayName.split(',').slice(0, 2).join(', ') : ''));
      setArea(areaName || city);
      setCity(city);
      setDistrictName(county);
      setStateName(state);
      setPincode(pin);
      setReverseGeocodeText(displayName);
    } catch (e) {
      setReverseGeocodeText(null);
    } finally {
      setReverseGeocoding(false);
    }
  };

  const handleConfirmPin = () => {
    if (!coords) return;
    if (isInThrissur(coords.lat, coords.lng)) {
      setStep('details');
    } else {
      setStep('outside');
    }
  };

  const handleSaveAddress = async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    setError(null);

    const finalLabel = label === 'custom' ? customLabel : label;

    try {
      const { error } = await supabase.from('addresses').insert({
        user_id: session.user.id,
        label: finalLabel,
        address_line: addressLine || 'Location confirmed on map',
        area: area || 'Thrissur',
        city: city || 'Thrissur',
        district: districtName || 'Thrissur',
        state: stateName || 'Kerala',
        pincode: pincode || '680001',
        latitude: coords?.lat || 10.52,
        longitude: coords?.lng || 76.21,
        is_in_service_zone: true,
      });

      if (error) throw error;
      await fetchAddresses();
      setStep('list');
    } catch (e: any) {
      setError(e.message || 'Failed to save address');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    setStep('details');
  };

  return (
    <SafeAreaView style={styles.container}>

      {/* ── LIST ── */}
      {step === 'list' && (
        <View style={styles.flex1}>
          <View style={styles.listHeader}>
            <TouchableOpacity
              style={styles.listBackBtn}
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/(tabs)');
                }
              }}
              activeOpacity={0.7}
            >
              <ArrowLeft size={18} color={colors.neutral[700]} strokeWidth={2} />
            </TouchableOpacity>
            <Text style={styles.listTitle}>{t('manageAddresses')}</Text>
          </View>
          <ScrollView style={styles.listScroll} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
            {loadingAddresses ? (
              <ActivityIndicator size="large" color={colors.primary[600]} style={{ marginTop: 40 }} />
            ) : addresses.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <MapPin size={32} color={colors.primary[600]} strokeWidth={1.8} />
                </View>
                <Text style={styles.emptyTitle}>No saved addresses</Text>
                <Text style={styles.emptyDesc}>Add your home, work or any other address to get started</Text>
              </View>
            ) : (
              <>
                <Text style={styles.sectionLabel}>Saved ({addresses.length})</Text>
                {addresses.map((addr) => {
                  const LabelIcon = getLabelIcon(addr.label);
                  const isSelected = selectedAddressId === addr.id;
                  return (
                    <TouchableOpacity
                      key={addr.id}
                      activeOpacity={0.75}
                      onPress={() => handleSelectAddress(addr.id)}
                      style={[
                        styles.addressCard,
                        isSelected && {
                          borderColor: colors.primary[500],
                          borderWidth: 2,
                          backgroundColor: colors.primary[50],
                        },
                      ]}
                    >
                      <View style={[
                        styles.addressIconWrap,
                        isSelected && { backgroundColor: 'rgba(51, 78, 104, 0.15)' },
                      ]}>
                        <LabelIcon size={20} color={isSelected ? colors.primary[700] : colors.primary[600]} strokeWidth={2} />
                      </View>
                      <View style={styles.addressInfo}>
                        <Text style={[
                          styles.addrLabel,
                          isSelected && { color: colors.primary[800] },
                        ]}>{addr.label}</Text>
                        <Text style={styles.addrLine} numberOfLines={2}>
                          {addr.address_line}{addr.area ? `, ${addr.area}` : ''}
                        </Text>
                        {(addr.city || addr.pincode) ? (
                          <Text style={styles.addrMeta}>
                            {[addr.city, addr.pincode].filter(Boolean).join(' – ')}
                          </Text>
                        ) : null}
                        {isSelected && (
                          <View style={styles.selectedBadge}>
                            <CheckCircle2 size={10} color={colors.success[600]} strokeWidth={2.5} />
                            <Text style={styles.selectedBadgeText}>Currently Using</Text>
                          </View>
                        )}
                      </View>
                      {/* Right side: radio + delete */}
                      <View style={{ alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        {isSelected
                          ? <CheckCircle2 size={22} color={colors.primary[600]} strokeWidth={2.5} />
                          : <View style={styles.radioCircle} />
                        }
                        <TouchableOpacity
                          style={styles.deleteBtn}
                          onPress={(e) => { e.stopPropagation?.(); handleDeleteAddress(addr.id); }}
                          disabled={deletingId === addr.id}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          activeOpacity={0.7}
                        >
                          {deletingId === addr.id
                            ? <ActivityIndicator size="small" color="#EF4444" />
                            : <Trash2 size={16} color="#EF4444" strokeWidth={2} />
                          }
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </>
            )}

            <TouchableOpacity style={styles.addBtn} onPress={handleAddNew} activeOpacity={0.85}>
              <Plus size={20} color={colors.neutral[100]} strokeWidth={2.5} />
              <Text style={styles.addBtnText}>Add New Address</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* ── PERMISSION ── */}
      {step === 'permission' && (
        <View style={styles.flex1}>
          <TouchableOpacity style={styles.subStepBack} onPress={() => setStep('list')} activeOpacity={0.7}>
            <ArrowLeft size={18} color={colors.neutral[700]} strokeWidth={2} />
          </TouchableOpacity>
          <View style={styles.centerContent}>
            <View style={styles.iconWrap}>
              <Navigation size={64} color={colors.primary[700]} strokeWidth={1.5} />
            </View>
            <Text style={styles.title}>{t('locationPermission')}</Text>
            <Text style={styles.desc}>{t('locationPermissionDesc')}</Text>
            {error && <Text style={styles.errorText}>{error}</Text>}
            <Button
              label={loading ? t('detectingLocation') : t('allowLocation')}
              onPress={handleAllowLocation}
              loading={loading}
              style={styles.actionBtn}
            />
            <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
              <Text style={styles.skipText}>{t('enterAddressManually')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── DENIED ── */}
      {step === 'denied' && (
        <View style={styles.flex1}>
          <TouchableOpacity style={styles.subStepBack} onPress={() => setStep('permission')} activeOpacity={0.7}>
            <ArrowLeft size={18} color={colors.neutral[700]} strokeWidth={2} />
          </TouchableOpacity>
          <View style={styles.centerContent}>
            <View style={[styles.iconWrap, styles.iconWrapError]}>
              <AlertCircle size={64} color={colors.warning[500]} strokeWidth={1.5} />
            </View>
            <Text style={styles.title}>{t('locationDenied')}</Text>
            <Text style={styles.desc}>
              {Platform.OS === 'web' 
                ? 'Please enable location access in your browser settings (usually a lock icon in the address bar) and try again.'
                : 'Please enable location in your device settings. Once enabled, press "Check Again".'}
            </Text>
            {Platform.OS !== 'web' && (
              <>
                <Button label={t('enableLocation')} onPress={handleOpenSettings} style={[styles.actionBtn, { marginBottom: spacing.md }]} />
                <Button label="Check Again" onPress={handleAllowLocation} variant="outline" style={styles.actionBtn} loading={loading} />
              </>
            )}
            <TouchableOpacity onPress={() => setStep('details')} style={[styles.skipBtn, Platform.OS === 'web' && { marginTop: spacing.md }]}>
              <Text style={styles.skipText}>{t('enterAddressManually')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── MAP ── */}
      {step === 'map' && (
        <View style={styles.flex1}>
          <TouchableOpacity style={styles.subStepBack} onPress={() => setStep('permission')} activeOpacity={0.7}>
            <ArrowLeft size={18} color={colors.neutral[700]} strokeWidth={2} />
          </TouchableOpacity>
          <View style={styles.mapHeader}>
            <Text style={styles.mapTitle}>{t('confirmAddress')}</Text>
            <Text style={styles.mapDesc}>{t('dragPin')}</Text>
          </View>
          <View style={styles.mapArea}>
            {coords && (
              <MapWebView
                lat={coords.lat}
                lng={coords.lng}
                onPinDrag={(lat, lng) => {
                  setCoords({ lat, lng });
                  reverseGeocode(lat, lng);
                }}
              />
            )}
          </View>
          <View style={styles.addressPreview}>
            {reverseGeocoding ? (
              <ActivityIndicator size="small" color={colors.primary[600]} />
            ) : reverseGeocodeText ? (
              <Text style={styles.mapHintText} numberOfLines={3}>{reverseGeocodeText}</Text>
            ) : (
              <Text style={styles.mapHintText}>{coords?.lat.toFixed(5)}, {coords?.lng.toFixed(5)}</Text>
            )}
          </View>
          <View style={styles.mapFooter}>
            <Button label={t('confirmAddress')} onPress={handleConfirmPin} style={styles.actionBtn} />
            <TouchableOpacity onPress={() => setStep('details')} style={styles.skipBtn}>
              <Text style={styles.skipText}>{t('enterAddressManually')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── DETAILS ── */}
      {step === 'details' && (
        <ScrollView style={styles.flex1} contentContainerStyle={styles.scrollContent}>
          <TouchableOpacity style={styles.subStepBack} onPress={() => setStep('list')} activeOpacity={0.7}>
            <ArrowLeft size={18} color={colors.neutral[700]} strokeWidth={2} />
          </TouchableOpacity>
          <View style={styles.detailsHeader}>
            <CheckCircle size={48} color={colors.success[500]} strokeWidth={1.5} />
            <Text style={styles.title}>{t('saveAddress')}</Text>
          </View>
          <Text style={styles.fieldLabel}>{t('saveAs')}</Text>
          <View style={styles.labelRow}>
            {['Home', 'Work', 'custom'].map((l) => (
              <TouchableOpacity
                key={l}
                style={[styles.labelChip, label === l && styles.labelChipActive]}
                onPress={() => setLabel(l)}
              >
                <Text style={[styles.labelChipText, label === l && styles.labelChipTextActive]}>
                  {l === 'custom' ? t('customLabel') : l === 'Home' ? t('home') : t('work')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {label === 'custom' && (
            <Input value={customLabel} onChangeText={setCustomLabel} placeholder={t('customLabel')} style={styles.input} />
          )}
          <Input value={addressLine} onChangeText={setAddressLine} placeholder="House/Flat no, Street name" style={styles.input} autoCapitalize="words" />
          <Input value={area} onChangeText={setArea} placeholder="Area / Locality" style={styles.input} autoCapitalize="words" />
          <Input value={city} onChangeText={setCity} placeholder="City / Town" style={styles.input} autoCapitalize="words" />
          <Input value={districtName} onChangeText={setDistrictName} placeholder="District" style={styles.input} autoCapitalize="words" />
          <Input value={pincode} onChangeText={setPincode} placeholder="Pincode" keyboardType="numeric" style={styles.input} />
          {error && <Text style={styles.errorText}>{error}</Text>}
          <Button label={t('saveAddress')} onPress={handleSaveAddress} loading={loading} style={styles.actionBtn} />
        </ScrollView>
      )}

      {/* ── OUTSIDE ── */}
      {step === 'outside' && (
        <View style={styles.flex1}>
          <TouchableOpacity style={styles.subStepBack} onPress={() => setStep('map')} activeOpacity={0.7}>
            <ArrowLeft size={18} color={colors.neutral[700]} strokeWidth={2} />
          </TouchableOpacity>
          <View style={styles.centerContent}>
            <View style={[styles.iconWrap, styles.iconWrapError]}>
              <AlertCircle size={64} color={colors.warning[500]} strokeWidth={1.5} />
            </View>
            <Text style={styles.title}>{t('notInServiceArea')}</Text>
            <Text style={styles.desc}>{t('notInServiceAreaDesc')}</Text>
            <Button label={t('enterAddressManually')} onPress={() => setStep('details')} variant="outline" style={styles.actionBtn} />
            <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
              <Text style={styles.skipText}>{t('skip')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

    </SafeAreaView>
  );
}

