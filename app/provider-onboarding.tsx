import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useLanguage } from '@/lib/language-context';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { colors, spacing, radius, typography, shadows, getLangTextStyle } from '@/lib/theme';
import { Header, Button, LoadingState, ErrorState } from '@/components/ui';
import type { ServiceCategory, ProviderApplication } from '@/lib/types';
import {
  Briefcase, Check, X, ShieldCheck, Clock,
  CreditCard, Camera, FileText, User,
} from 'lucide-react-native';

export default function ProviderOnboardingScreen() {
  const { t, lang } = useLanguage();
  const { session, refreshProfile, profile } = useAuth();
  const router = useRouter();
  const mlStyle = getLangTextStyle(lang);

  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [experienceYears, setExperienceYears] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingApp, setExistingApp] = useState<ProviderApplication | null>(null);
  const [aadhaarFront, setAadhaarFront] = useState<string | null>(null);
  const [aadhaarBack, setAadhaarBack] = useState<string | null>(null);
  const [selfie, setSelfie] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<'front' | 'back' | 'selfie' | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const catRes = await supabase
        .from('service_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (catRes.error) throw catRes.error;
      setCategories((catRes.data || []) as ServiceCategory[]);

      if (session?.user?.id) {
        const appRes = await supabase
          .from('provider_applications')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (appRes.data) {
          setExistingApp(appRes.data as ProviderApplication);
          if (appRes.data.status === 'pending') {
            setSelectedCategories(appRes.data.category_ids);
            setExperienceYears(String(appRes.data.experience_years));
            setBio(lang === 'ml' ? (appRes.data.bio_ml || appRes.data.bio_en || '') : (appRes.data.bio_en || ''));
            setAadhaarFront(appRes.data.id_proof_url || null);
            setAadhaarBack(appRes.data.address_proof_url || null);
            setSelfie(appRes.data.certificate_url || null);
          }
        }
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, lang]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleCategory = (catId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  };

  const triggerFilePicker = (target: 'front' | 'back' | 'selfie') => {
    setUploadTarget(target);
    if (Platform.OS === 'web' && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !uploadTarget) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      if (uploadTarget === 'front') setAadhaarFront(url);
      else if (uploadTarget === 'back') setAadhaarBack(url);
      else if (uploadTarget === 'selfie') setSelfie(url);
      setUploadTarget(null);
    };
    reader.readAsDataURL(file);

    if (event.target) event.target.value = '';
  };

  const removeFile = (target: 'front' | 'back' | 'selfie') => {
    if (target === 'front') setAadhaarFront(null);
    else if (target === 'back') setAadhaarBack(null);
    else if (target === 'selfie') setSelfie(null);
  };

  const handleSubmit = async () => {
    if (!session?.user?.id) return;
    if (selectedCategories.length === 0) {
      setError(lang === 'ml' ? 'ഒരു വിഭാഗം തിരഞ്ഞെടുക്കുക' : 'Please select at least one category');
      return;
    }
    if (!experienceYears.trim()) {
      setError(lang === 'ml' ? 'അനുഭവം നൽകുക' : 'Please enter your experience');
      return;
    }
    if (!aadhaarFront || !aadhaarBack) {
      setError(lang === 'ml' ? 'ആധാർ ഫോട്ടോകൾ അപ്ലോഡ് ചെയ്യുക' : 'Please upload both Aadhaar photos');
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      // 1. Upsert provider_applications
      const { error: appError } = await supabase
        .from('provider_applications')
        .upsert({
          user_id: session.user.id,
          category_ids: selectedCategories,
          experience_years: parseInt(experienceYears, 10) || 0,
          bio_en: bio,
          bio_ml: bio,
          id_proof_url: aadhaarFront,
          address_proof_url: aadhaarBack,
          certificate_url: selfie,
          status: 'pending',
          submitted_at: new Date().toISOString(),
        });

      if (appError) throw appError;

      // 2. Upsert provider_profiles as pending
      const { error: provError } = await supabase
        .from('provider_profiles')
        .upsert({
          id: session.user.id,
          category_ids: selectedCategories,
          specializations: [],
          experience_years: parseInt(experienceYears, 10) || 0,
          is_verified: false,
          background_check_status: 'pending',
          bio_en: bio,
          bio_ml: bio,
          id_proof_url: aadhaarFront,
          address_proof_url: aadhaarBack,
          police_verification_url: selfie,
          updated_at: new Date().toISOString(),
        });

      if (provError) throw provError;

      if (refreshProfile) {
        await refreshProfile();
      }

      router.replace('/provider-dashboard');
    } catch (e: any) {
      setError(e.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState label={t('loading')} />;
  if (error && !categories.length) return <ErrorState message={error} onRetry={fetchData} />;

  const isApprovedProfessional = profile?.role === 'provider' || existingApp?.status === 'approved';

  if (isApprovedProfessional) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title={t('providerOnboarding')} onBack={() => router.back()} />
        <View style={styles.approvedCard}>
          <View style={styles.approvedIcon}>
            <ShieldCheck size={48} color={colors.success[600]} strokeWidth={1.5} />
          </View>
          <Text style={[styles.approvedTitle, mlStyle]}>{t('approvedProvider')}</Text>
          <Text style={[styles.approvedDesc, mlStyle]}>{t('providerDashboard')}</Text>
          <Button label={t('providerDashboard')} onPress={() => router.replace('/provider-dashboard')} style={styles.approvedBtn} />
        </View>
      </SafeAreaView>
    );
  }

  const renderUploadCard = (
    label: string,
    icon: React.ComponentType<any>,
    imageUrl: string | null,
    target: 'front' | 'back' | 'selfie'
  ) => {
    const Icon = icon;
    return (
      <View style={styles.uploadCard}>
        <TouchableOpacity
          style={styles.uploadArea}
          onPress={() => triggerFilePicker(target)}
          activeOpacity={0.7}
        >
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.uploadPreview} resizeMode="cover" />
          ) : (
            <View style={styles.uploadPlaceholder}>
              <Icon size={28} color={colors.primary[600]} strokeWidth={1.5} />
              <Text style={[styles.uploadPlaceholderText, mlStyle]}>{t('selectFile')}</Text>
            </View>
          )}
        </TouchableOpacity>
        <View style={styles.uploadInfo}>
          <Text style={[styles.uploadLabel, mlStyle]}>{label}</Text>
          {imageUrl ? (
            <TouchableOpacity onPress={() => removeFile(target)} style={styles.removeBtn}>
              <X size={14} color={colors.error[600]} strokeWidth={2.5} />
              <Text style={[styles.removeBtnText, mlStyle]}>{t('removeFile')}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => triggerFilePicker(target)} style={styles.chooseBtn}>
              <Text style={[styles.chooseBtnText, mlStyle]}>{t('selectFile')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title={t('providerOnboarding')} onBack={() => router.back()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.introCard}>
          <Briefcase size={32} color={colors.primary[600]} strokeWidth={1.5} />
          <Text style={[styles.introTitle, mlStyle]}>{t('becomeProvider')}</Text>
          <Text style={[styles.introDesc, mlStyle]}>{t('providerOnboardingDesc')}</Text>
        </View>

        {existingApp?.status === 'rejected' && (
          <View style={styles.warningCard}>
            <X size={18} color={colors.error[600]} strokeWidth={2.5} />
            <Text style={[styles.warningText, mlStyle]}>
              {lang === 'ml'
                ? 'നിങ്ങളുടെ പ്രൊഫഷണൽ അപ്ലിക്കേഷൻ റിജക്റ്റ് ചെയ്തു. പുതിയ ഡോക്യുമന്റുകൾ അപ്ലോഡ് ചെയ്ത് വീണ്ടും സമർപ്പിക്കുക.'
                : 'Your professional application was rejected. Please update the details and submit again for review.'}
            </Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, mlStyle]}>{t('selectServiceCategory')}</Text>
          <Text style={[styles.sectionDesc, mlStyle]}>{t('selectServiceCategoryDesc')}</Text>
          <View style={styles.categoryGrid}>
            {categories.map((cat) => {
              const isSelected = selectedCategories.includes(cat.id);
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
                  onPress={() => toggleCategory(cat.id)}
                  activeOpacity={0.7}
                >
                  {isSelected && <Check size={14} color={colors.neutral[0]} strokeWidth={3} />}
                  <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextActive, mlStyle]}>
                    {lang === 'ml' ? cat.name_ml : cat.name_en}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, mlStyle]}>{t('experienceYears')}</Text>
          <View style={styles.expRow}>
            <TextInput
              style={styles.expInput}
              value={experienceYears}
              onChangeText={setExperienceYears}
              placeholder="0"
              placeholderTextColor={colors.neutral[400]}
              keyboardType="numeric"
              maxLength={2}
            />
            <Text style={[styles.expLabel, mlStyle]}>{t('years')}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, mlStyle]}>{t('writeBio')}</Text>
          <TextInput
            style={[styles.bioInput, mlStyle]}
            value={bio}
            onChangeText={setBio}
            placeholder={t('bioPlaceholder')}
            placeholderTextColor={colors.neutral[400]}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, mlStyle]}>{t('aadhaarImages')}</Text>
          <Text style={[styles.sectionDesc, mlStyle]}>{t('aadhaarDesc')}</Text>
          {renderUploadCard(t('uploadAadhaarFront'), CreditCard, aadhaarFront, 'front')}
          {renderUploadCard(t('uploadAadhaarBack'), FileText, aadhaarBack, 'back')}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, mlStyle]}>{t('uploadSelfie')}</Text>
          <Text style={[styles.sectionDesc, mlStyle]}>{t('selfieDesc')}</Text>
          {renderUploadCard(t('uploadSelfie'), User, selfie, 'selfie')}
        </View>

        {error && <Text style={[styles.errorText, mlStyle]}>{error}</Text>}
      </ScrollView>

      <View style={styles.bottomBar}>
        <Button
          label={t('submitForApproval')}
          onPress={handleSubmit}
          loading={submitting}
          style={styles.submitBtn}
        />
      </View>

      {Platform.OS === 'web' && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileSelected}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral[50] },
  introCard: {
    alignItems: 'center', padding: spacing.xl, margin: spacing.md,
    backgroundColor: colors.neutral[0], borderRadius: radius.lg, ...shadows.sm,
  },
  introTitle: {
    fontSize: typography.sizes.xl, fontWeight: '700', color: colors.neutral[900],
    marginTop: spacing.sm, marginBottom: spacing.xs, fontFamily: typography.fontFamilyBold,
  },
  introDesc: {
    fontSize: typography.sizes.sm, color: colors.neutral[500], textAlign: 'center',
    fontFamily: typography.fontFamilyRegular,
  },
  section: { paddingHorizontal: spacing.md, marginTop: spacing.lg },
  sectionTitle: {
    fontSize: typography.sizes.lg, fontWeight: '700', color: colors.neutral[900],
    marginBottom: spacing.xs, fontFamily: typography.fontFamilyBold,
  },
  sectionDesc: {
    fontSize: typography.sizes.sm, color: colors.neutral[500], marginBottom: spacing.sm,
    fontFamily: typography.fontFamilyRegular,
  },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  categoryChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.neutral[0], borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.neutral[200], ...shadows.sm,
  },
  categoryChipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
  categoryChipText: {
    fontSize: typography.sizes.sm, color: colors.neutral[700], fontWeight: '600',
    fontFamily: typography.fontFamilyMedium,
  },
  categoryChipTextActive: { color: colors.neutral[0] },
  expRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  expInput: {
    width: 80, height: 52, borderWidth: 1.5, borderColor: colors.neutral[300],
    borderRadius: radius.md, paddingHorizontal: spacing.md, fontSize: typography.sizes.xl,
    color: colors.neutral[900], backgroundColor: colors.neutral[0], textAlign: 'center',
    fontFamily: typography.fontFamilyBold,
  },
  expLabel: {
    fontSize: typography.sizes.md, color: colors.neutral[500],
    fontFamily: typography.fontFamilyRegular,
  },
  bioInput: {
    height: 120, borderWidth: 1.5, borderColor: colors.neutral[300], borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md, fontSize: typography.sizes.md,
    color: colors.neutral[900], backgroundColor: colors.neutral[0],
    fontFamily: typography.fontFamilyRegular,
  },
  uploadCard: {
    flexDirection: 'row', backgroundColor: colors.neutral[0],
    borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, ...shadows.sm,
  },
  uploadArea: {
    width: 80, height: 80, borderRadius: radius.md, overflow: 'hidden',
    backgroundColor: colors.neutral[100], marginRight: spacing.md,
  },
  uploadPreview: { width: '100%', height: '100%' },
  uploadPlaceholder: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
  },
  uploadPlaceholderText: {
    fontSize: typography.sizes.xs, color: colors.neutral[400], marginTop: 4,
    fontFamily: typography.fontFamilyRegular,
  },
  uploadInfo: { flex: 1, justifyContent: 'center' },
  uploadLabel: {
    fontSize: typography.sizes.md, color: colors.neutral[700], fontWeight: '600',
    fontFamily: typography.fontFamilyMedium, marginBottom: spacing.xs,
  },
  removeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.error[50], paddingHorizontal: spacing.sm, paddingVertical: 4,
    borderRadius: radius.sm, alignSelf: 'flex-start',
  },
  removeBtnText: {
    fontSize: typography.sizes.xs, color: colors.error[600], fontWeight: '600',
    fontFamily: typography.fontFamilyMedium,
  },
  chooseBtn: {
    backgroundColor: colors.primary[50], paddingHorizontal: spacing.md, paddingVertical: 6,
    borderRadius: radius.sm, alignSelf: 'flex-start',
  },
  chooseBtnText: {
    fontSize: typography.sizes.sm, color: colors.primary[700], fontWeight: '600',
    fontFamily: typography.fontFamilyMedium,
  },
  errorText: {
    fontSize: typography.sizes.sm, color: colors.error[600], textAlign: 'center',
    paddingHorizontal: spacing.md, marginTop: spacing.md, fontFamily: typography.fontFamilyRegular,
  },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.neutral[0],
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.neutral[200],
  },
  submitBtn: { width: '100%' },
  approvedCard: {
    alignItems: 'center', padding: spacing.xl, margin: spacing.md,
    backgroundColor: colors.neutral[0], borderRadius: radius.lg, ...shadows.sm,
  },
  approvedIcon: {
    width: 80, height: 80, borderRadius: radius.xl, backgroundColor: colors.success[50],
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md,
  },
  approvedTitle: {
    fontSize: typography.sizes.xl, fontWeight: '700', color: colors.neutral[900],
    marginBottom: spacing.xs, fontFamily: typography.fontFamilyBold,
  },
  approvedDesc: {
    fontSize: typography.sizes.sm, color: colors.neutral[500], marginBottom: spacing.lg,
    fontFamily: typography.fontFamilyRegular,
  },
  approvedBtn: { width: '100%' },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.error[50],
    borderRadius: radius.md,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.error[200],
  },
  warningText: {
    flex: 1,
    color: colors.error[700],
    fontSize: typography.sizes.sm,
    lineHeight: 20,
    fontFamily: typography.fontFamilyRegular,
  },
});
