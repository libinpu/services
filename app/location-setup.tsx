import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Platform, Linking, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useLanguage } from '@/lib/language-context';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { colors, spacing, radius, typography, shadows } from '@/lib/theme';
import { Button, Input } from '@/components/ui';
import { MapPin, Navigation, CircleAlert as AlertCircle, CircleCheck as CheckCircle, Crosshair } from 'lucide-react-native';
import * as Location from 'expo-location';

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

export default function LocationSetupScreen() {
  const { t } = useLanguage();
  const { session } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<'permission' | 'map' | 'details' | 'outside' | 'denied'>('permission');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [label, setLabel] = useState('Home');
  const [customLabel, setCustomLabel] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [area, setArea] = useState('');
  const [pincode, setPincode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAllowLocation = async () => {
    setLoading(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setStep('denied');
        setLoading(false);
        return;
      }
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = location.coords;
      setCoords({ lat: latitude, lng: longitude });
      setStep('map');
    } catch (e: any) {
      setError(e.message || t('locationError'));
    } finally {
      setLoading(false);
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
        city: 'Thrissur',
        district: 'Thrissur',
        state: 'Kerala',
        pincode: pincode || '680001',
        latitude: coords?.lat || 10.52,
        longitude: coords?.lng || 76.21,
        is_in_service_zone: true,
      });

      if (error) throw error;
      router.replace('/(tabs)');
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
      {step === 'permission' && (
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
      )}

      {step === 'denied' && (
        <View style={styles.centerContent}>
          <View style={[styles.iconWrap, styles.iconWrapError]}>
            <AlertCircle size={64} color={colors.warning[500]} strokeWidth={1.5} />
          </View>
          <Text style={styles.title}>{t('locationDenied')}</Text>
          <Text style={styles.desc}>{t('locationDeniedDesc')}</Text>
          <Button
            label={t('enableLocation')}
            onPress={handleAllowLocation}
            style={styles.actionBtn}
          />
          <TouchableOpacity onPress={() => setStep('details')} style={styles.skipBtn}>
            <Text style={styles.skipText}>{t('enterAddressManually')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 'map' && (
        <View style={styles.flex1}>
          <View style={styles.mapHeader}>
            <Text style={styles.mapTitle}>{t('confirmAddress')}</Text>
            <Text style={styles.mapDesc}>{t('dragPin')}</Text>
          </View>
          <View style={styles.mapArea}>
            <View style={styles.mapPlaceholder}>
              <MapPin size={48} color={colors.primary[700]} strokeWidth={1.5} />
              <Text style={styles.mapCoordText}>
                {coords?.lat.toFixed(4)}, {coords?.lng.toFixed(4)}
              </Text>
              <Text style={styles.mapHintText}>Thrissur, Kerala</Text>
              <View style={styles.mapBadge}>
                <Text style={styles.mapBadgeText}>Map View</Text>
              </View>
            </View>
          </View>
          <View style={styles.mapFooter}>
            <Button label={t('confirmAddress')} onPress={handleConfirmPin} style={styles.actionBtn} />
            <TouchableOpacity onPress={() => setStep('details')} style={styles.skipBtn}>
              <Text style={styles.skipText}>{t('enterAddressManually')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {step === 'details' && (
        <ScrollView style={styles.flex1} contentContainerStyle={styles.scrollContent}>
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
            <Input
              value={customLabel}
              onChangeText={setCustomLabel}
              placeholder={t('customLabel')}
              style={styles.input}
            />
          )}

          <Input
            value={addressLine}
            onChangeText={setAddressLine}
            placeholder="House/Flat no, Street name"
            style={styles.input}
            autoCapitalize="words"
          />
          <Input
            value={area}
            onChangeText={setArea}
            placeholder="Area / Locality"
            style={styles.input}
            autoCapitalize="words"
          />
          <Input
            value={pincode}
            onChangeText={setPincode}
            placeholder="Pincode"
            keyboardType="numeric"
            style={styles.input}
          />

          {error && <Text style={styles.errorText}>{error}</Text>}

          <Button
            label={t('saveAddress')}
            onPress={handleSaveAddress}
            loading={loading}
            style={styles.actionBtn}
          />
        </ScrollView>
      )}

      {step === 'outside' && (
        <View style={styles.centerContent}>
          <View style={[styles.iconWrap, styles.iconWrapError]}>
            <AlertCircle size={64} color={colors.warning[500]} strokeWidth={1.5} />
          </View>
          <Text style={styles.title}>{t('notInServiceArea')}</Text>
          <Text style={styles.desc}>{t('notInServiceAreaDesc')}</Text>
          <Button
            label={t('enterAddressManually')}
            onPress={() => setStep('details')}
            variant="outline"
            style={styles.actionBtn}
          />
          <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
            <Text style={styles.skipText}>{t('skip')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  flex1: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  iconWrap: {
    width: 120,
    height: 120,
    borderRadius: radius.xl,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  iconWrapError: {
    backgroundColor: colors.warning[50],
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: '700',
    color: colors.neutral[900],
    textAlign: 'center',
    marginBottom: spacing.sm,
    fontFamily: typography.fontFamilyBold,
  },
  desc: {
    fontSize: typography.sizes.md,
    color: colors.neutral[500],
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xl,
    fontFamily: typography.fontFamilyRegular,
  },
  actionBtn: {
    width: '100%',
  },
  skipBtn: {
    marginTop: spacing.lg,
  },
  skipText: {
    fontSize: typography.sizes.md,
    color: colors.primary[700],
    fontWeight: '600',
    fontFamily: typography.fontFamilyMedium,
  },
  mapHeader: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  mapTitle: {
    fontSize: typography.sizes.xxl,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: spacing.xs,
    fontFamily: typography.fontFamilyBold,
  },
  mapDesc: {
    fontSize: typography.sizes.sm,
    color: colors.neutral[500],
    fontFamily: typography.fontFamilyRegular,
  },
  mapArea: {
    flex: 1,
    margin: spacing.md,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  mapPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary[50],
    borderRadius: radius.lg,
  },
  mapCoordText: {
    fontSize: typography.sizes.sm,
    color: colors.neutral[600],
    marginTop: spacing.md,
    fontFamily: typography.fontFamilyMedium,
  },
  mapHintText: {
    fontSize: typography.sizes.md,
    color: colors.neutral[700],
    marginTop: spacing.xs,
    fontFamily: typography.fontFamilyMedium,
  },
  mapBadge: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primary[100],
    borderRadius: radius.full,
  },
  mapBadgeText: {
    fontSize: typography.sizes.xs,
    color: colors.primary[700],
    fontWeight: '600',
    fontFamily: typography.fontFamilyMedium,
  },
  mapFooter: {
    padding: spacing.lg,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.neutral[700],
    marginBottom: spacing.sm,
    fontFamily: typography.fontFamilyMedium,
  },
  labelRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  labelChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.neutral[200],
    marginRight: spacing.sm,
  },
  labelChipActive: {
    borderColor: colors.primary[600],
    backgroundColor: colors.primary[50],
  },
  labelChipText: {
    fontSize: typography.sizes.sm,
    color: colors.neutral[600],
    fontFamily: typography.fontFamilyRegular,
  },
  labelChipTextActive: {
    color: colors.primary[700],
    fontWeight: '600',
    fontFamily: typography.fontFamilyMedium,
  },
  input: {
    marginBottom: spacing.sm,
  },
  errorText: {
    fontSize: typography.sizes.sm,
    color: colors.error[600],
    marginBottom: spacing.sm,
    fontFamily: typography.fontFamilyRegular,
  },
});
