import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { colors, spacing, radius, typography, shadows } from '@/lib/theme';
import { useLanguage } from '@/lib/language-context';
import type { BookingPhoto, PhotoPhase } from '@/lib/types';
import { Camera, ImagePlus } from 'lucide-react-native';

const BUCKET = 'booking-photos';

function storagePath(bookingId: string, phase: PhotoPhase, extension: string): string {
  return `${bookingId}/${phase}-${Date.now()}.${extension}`;
}

async function readAsArrayBuffer(uri: string): Promise<ArrayBuffer> {
  const response = await fetch(uri);
  return await response.arrayBuffer();
}

/**
 * Before/after job photos for a booking. Read-only for customers; providers
 * assigned to the booking get capture buttons for each phase.
 */
export function BookingPhotos({
  bookingId,
  uploaderId,
  canUpload = false,
}: {
  bookingId: string;
  uploaderId?: string | null;
  canUpload?: boolean;
}) {
  const { t } = useLanguage();
  const [photos, setPhotos] = useState<BookingPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<PhotoPhase | null>(null);
  const [error, setError] = useState<string | null>(null);

  const styles = makeStyles();

  const fetchPhotos = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from('booking_photos')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at');
    if (!fetchError) setPhotos((data || []) as BookingPhoto[]);
    setLoading(false);
  }, [bookingId]);

  useEffect(() => { fetchPhotos(); }, [fetchPhotos]);

  const handleAdd = async (phase: PhotoPhase) => {
    if (!uploaderId) return;
    setError(null);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    const result = permission.granted
      ? await ImagePicker.launchCameraAsync({ quality: 0.6 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.6, mediaTypes: ['images'] });
    if (result.canceled || !result.assets?.length) return;

    setUploading(phase);
    try {
      const asset = result.assets[0];
      const extension = (asset.uri.split('.').pop() || 'jpg').split('?')[0];
      const path = storagePath(bookingId, phase, extension);
      const body = await readAsArrayBuffer(asset.uri);

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, body, { contentType: asset.mimeType || 'image/jpeg', upsert: false });
      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const { error: insertError } = await supabase.from('booking_photos').insert({
        booking_id: bookingId,
        uploaded_by: uploaderId,
        phase,
        photo_url: publicUrl.publicUrl,
      });
      if (insertError) throw insertError;
      await fetchPhotos();
    } catch (e: any) {
      setError(e.message || 'Upload failed');
    } finally {
      setUploading(null);
    }
  };

  const renderPhase = (phase: PhotoPhase, label: string) => {
    const items = photos.filter((p) => p.phase === phase);
    return (
      <View style={styles.phaseBlock} key={phase}>
        <View style={styles.phaseHeader}>
          <Text style={styles.phaseLabel}>{label}</Text>
          {canUpload ? (
            <Pressable style={styles.addBtn} onPress={() => handleAdd(phase)} disabled={uploading !== null}>
              {uploading === phase ? (
                <ActivityIndicator size="small" color={colors.primary[600]} />
              ) : (
                <>
                  <Camera size={14} color={colors.primary[600]} strokeWidth={2.4} />
                  <Text style={styles.addBtnText}>{label}</Text>
                </>
              )}
            </Pressable>
          ) : null}
        </View>
        {items.length === 0 ? (
          <View style={styles.emptyTile}>
            <ImagePlus size={20} color={colors.neutral[400]} strokeWidth={2} />
            <Text style={styles.emptyText}>{t('noWorkPhotos')}</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            {items.map((photo) => (
              <Image key={photo.id} source={{ uri: photo.photo_url }} style={styles.photo} resizeMode="cover" />
            ))}
          </ScrollView>
        )}
      </View>
    );
  };

  if (loading) return null;
  if (!canUpload && photos.length === 0) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t('workPhotos')}</Text>
      {renderPhase('before', t('beforePhotos'))}
      {renderPhase('after', t('afterPhotos'))}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function makeStyles() {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.neutral[100],
      borderRadius: radius.xl,
      padding: spacing.lg,
      marginHorizontal: spacing.lg,
      marginTop: spacing.lg,
      ...shadows.sm,
    },
    title: {
      fontSize: typography.sizes.lg,
      fontWeight: '800',
      color: colors.neutral[900],
      fontFamily: typography.fontFamilyDisplay,
      marginBottom: spacing.md,
    },
    phaseBlock: { marginBottom: spacing.md },
    phaseHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
    },
    phaseLabel: {
      fontSize: typography.sizes.sm,
      fontWeight: '700',
      color: colors.neutral[600],
      fontFamily: typography.fontFamilyBold,
    },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.primary[50],
      borderRadius: radius.full,
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
      minWidth: 74,
      justifyContent: 'center',
    },
    addBtnText: {
      fontSize: typography.sizes.xs,
      fontWeight: '700',
      color: colors.primary[600],
      fontFamily: typography.fontFamilyBold,
    },
    photo: { width: 104, height: 104, borderRadius: radius.lg, backgroundColor: colors.neutral[200] },
    emptyTile: {
      height: 76,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: colors.neutral[300],
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    emptyText: {
      fontSize: typography.sizes.xs,
      color: colors.neutral[400],
      fontFamily: typography.fontFamilyRegular,
    },
    error: {
      fontSize: typography.sizes.xs,
      color: colors.error[600],
      fontFamily: typography.fontFamilyRegular,
    },
  });
}
