import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Star, MapPin, ShieldCheck, BadgeCheck, Users, ChevronRight, User as UserIcon,
} from 'lucide-react-native';
import { colors, spacing, radius, typography, shadows, type IconTileTone } from '@/lib/theme';
import { ServiceIcon3D } from '@/components/ServiceIcon3D';

/**
 * Shared surface components for the Seva design system:
 * 3D category tiles, quick action tiles, promo/offer cards and provider cards.
 */

export function CategoryTile({
  icon,
  label,
  onPress,
  size = 64,
  tone,
  width,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  size?: number;
  tone?: IconTileTone;
  width?: number;
}) {
  const styles = makeStyles();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.categoryTile,
        width ? { width } : null,
        pressed && { transform: [{ scale: 0.95 }] },
      ]}
    >
      <ServiceIcon3D name={icon} size={size} tone={tone} />
      <Text style={styles.categoryLabel} numberOfLines={2}>{label}</Text>
    </Pressable>
  );
}

export function QuickActionTile({
  icon,
  label,
  onPress,
  tone,
  urgent = false,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  tone?: IconTileTone;
  /** Emergency styling — red card surface */
  urgent?: boolean;
}) {
  const styles = makeStyles();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickTile,
        urgent && { backgroundColor: colors.error[50] },
        pressed && { transform: [{ scale: 0.96 }] },
      ]}
    >
      <ServiceIcon3D name={icon} size={44} tone={urgent ? 'coral' : tone} shape="circle" />
      <Text style={[styles.quickLabel, urgent && { color: colors.error[600] }]} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Full-width promo / offer card with discount badge and pill CTA. */
export function PromoCard({
  title,
  description,
  discountText,
  ctaLabel,
  onPress,
  imageUrl,
  tone = 'green',
  style,
}: {
  title: string;
  description?: string | null;
  discountText?: string | null;
  ctaLabel: string;
  onPress: () => void;
  imageUrl?: string | null;
  tone?: 'green' | 'gold';
  style?: StyleProp<ViewStyle>;
}) {
  const styles = makeStyles();
  const gradient: [string, string] =
    tone === 'gold' ? ['#E7BC63', '#C98F2C'] : ['#3B7F5F', '#22513C'];
  return (
    <TouchableOpacity activeOpacity={0.92} onPress={onPress} style={[styles.promoCard, style]}>
      <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={styles.promoGlow} />
      <View style={{ flex: 1, paddingRight: spacing.md }}>
        {discountText ? (
          <View style={styles.promoBadge}>
            <Text style={styles.promoBadgeText}>{discountText}</Text>
          </View>
        ) : null}
        <Text style={styles.promoTitle} numberOfLines={2}>{title}</Text>
        {description ? (
          <Text style={styles.promoDesc} numberOfLines={2}>{description}</Text>
        ) : null}
        <View style={styles.promoCta}>
          <Text style={styles.promoCtaText}>{ctaLabel}</Text>
        </View>
      </View>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.promoImage} resizeMode="cover" />
      ) : null}
    </TouchableOpacity>
  );
}

export type TrustBadges = {
  verifiedAadhaar?: boolean | null;
  verifiedPolice?: boolean | null;
  areaServed?: string | null;
};

/** Pill badges showing the local trust signals for a provider. */
export function TrustBadgeRow({ badges, labels }: { badges: TrustBadges; labels: { aadhaar: string; police: string } }) {
  const styles = makeStyles();
  const items: React.ReactNode[] = [];
  if (badges.verifiedAadhaar) {
    items.push(
      <View key="aadhaar" style={[styles.trustPill, { backgroundColor: colors.primary[50] }]}>
        <BadgeCheck size={12} color={colors.primary[600]} strokeWidth={2.6} />
        <Text style={[styles.trustPillText, { color: colors.primary[600] }]}>{labels.aadhaar}</Text>
      </View>
    );
  }
  if (badges.verifiedPolice) {
    items.push(
      <View key="police" style={[styles.trustPill, { backgroundColor: colors.warning[50] }]}>
        <ShieldCheck size={12} color={colors.warning[700]} strokeWidth={2.6} />
        <Text style={[styles.trustPillText, { color: colors.warning[700] }]}>{labels.police}</Text>
      </View>
    );
  }
  if (badges.areaServed) {
    items.push(
      <View key="area" style={[styles.trustPill, { backgroundColor: colors.neutral[50] }]}>
        <MapPin size={12} color={colors.neutral[500]} strokeWidth={2.6} />
        <Text style={[styles.trustPillText, { color: colors.neutral[500] }]}>{badges.areaServed}</Text>
      </View>
    );
  }
  if (items.length === 0) return null;
  return <View style={styles.trustRow}>{items}</View>;
}

/** Circular provider avatar with a verified tick overlay. */
export function ProviderAvatar({
  url,
  size = 56,
  verified = false,
  online = false,
}: {
  url?: string | null;
  size?: number;
  verified?: boolean | null;
  online?: boolean;
}) {
  const styles = makeStyles();
  return (
    <View style={{ width: size, height: size }}>
      {url ? (
        <Image source={{ uri: url }} style={{ width: size, height: size, borderRadius: size / 2 }} />
      ) : (
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: colors.primary[100],
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <UserIcon size={size * 0.5} color={colors.primary[600]} strokeWidth={2} />
        </View>
      )}
      {verified ? (
        <View style={[styles.avatarTick, { borderColor: colors.neutral[100] }]}>
          <BadgeCheck size={12} color="#FFFFFF" strokeWidth={3} />
        </View>
      ) : null}
      {online ? (
        <View style={styles.onlineDot} />
      ) : null}
    </View>
  );
}

/** Rounded provider card used across listings, search and the home screen. */
export function ProviderCard({
  name,
  avatarUrl,
  rating,
  ratingCount,
  jobsCompleted,
  distanceLabel,
  priceLabel,
  badges,
  badgeLabels,
  neighborhoodNote,
  online,
  onPress,
  style,
}: {
  name: string;
  avatarUrl?: string | null;
  rating: number;
  ratingCount?: number;
  jobsCompleted?: number;
  distanceLabel?: string | null;
  priceLabel?: string | null;
  badges?: TrustBadges;
  badgeLabels: { aadhaar: string; police: string; jobs: string };
  /** e.g. "12 families in Ayyanthole booked this pro" */
  neighborhoodNote?: string | null;
  online?: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const styles = makeStyles();
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={[styles.providerCard, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <ProviderAvatar url={avatarUrl} size={58} verified={badges?.verifiedPolice || badges?.verifiedAadhaar} online={online} />
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Text style={styles.providerName} numberOfLines={1}>{name}</Text>
          <View style={styles.providerMetaRow}>
            <Star size={13} color={colors.warning[500]} fill={colors.warning[500]} strokeWidth={0} />
            <Text style={styles.providerRating}>{rating.toFixed(1)}</Text>
            {ratingCount != null ? <Text style={styles.providerMuted}>({ratingCount})</Text> : null}
            {jobsCompleted != null ? (
              <Text style={styles.providerMuted}>· {jobsCompleted} {badgeLabels.jobs}</Text>
            ) : null}
          </View>
          {distanceLabel ? (
            <View style={styles.providerMetaRow}>
              <MapPin size={12} color={colors.neutral[500]} strokeWidth={2.2} />
              <Text style={styles.providerMuted}>{distanceLabel}</Text>
            </View>
          ) : null}
        </View>
        {priceLabel ? (
          <View style={styles.priceTag}>
            <Text style={styles.priceTagText}>{priceLabel}</Text>
          </View>
        ) : (
          <ChevronRight size={20} color={colors.neutral[300]} strokeWidth={2.4} />
        )}
      </View>

      {badges ? <TrustBadgeRow badges={badges} labels={badgeLabels} /> : null}

      {neighborhoodNote ? (
        <View style={styles.neighborhoodRow}>
          <Users size={13} color={colors.primary[600]} strokeWidth={2.4} />
          <Text style={styles.neighborhoodText} numberOfLines={2}>{neighborhoodNote}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

function makeStyles() {
  return StyleSheet.create({
  categoryTile: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  categoryLabel: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '600',
    color: colors.neutral[900],
    fontFamily: typography.fontFamilyMedium,
    textAlign: 'center',
    maxWidth: 78,
  },
  quickTile: {
    flex: 1,
    backgroundColor: colors.neutral[100],
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    gap: spacing.sm,
    ...shadows.sm,
  },
  quickLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    color: colors.neutral[900],
    fontFamily: typography.fontFamilyBold,
    textAlign: 'center',
  },
  promoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.xl,
    padding: spacing.lg,
    overflow: 'hidden',
    minHeight: 150,
    ...shadows.lg,
  },
  promoGlow: {
    position: 'absolute',
    top: -60,
    right: -30,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  promoBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.secondary[500],
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    marginBottom: spacing.sm,
  },
  promoBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1E1E1E',
    fontFamily: typography.fontFamilyBold,
  },
  promoTitle: {
    fontSize: typography.sizes.xl,
    lineHeight: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: typography.fontFamilyDisplay,
    letterSpacing: -0.3,
  },
  promoDesc: {
    marginTop: 4,
    fontSize: typography.sizes.xs,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.82)',
    fontFamily: typography.fontFamilyRegular,
  },
  promoCta: {
    alignSelf: 'flex-start',
    marginTop: spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: 9,
  },
  promoCtaText: {
    fontSize: typography.sizes.xs,
    fontWeight: '800',
    color: colors.primary[600],
    fontFamily: typography.fontFamilyBold,
  },
  promoImage: {
    width: 96,
    height: 96,
    borderRadius: radius.lg,
  },
  trustRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: spacing.sm + 2,
  },
  trustPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  trustPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    fontFamily: typography.fontFamilyBold,
  },
  avatarTick: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary[600],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  onlineDot: {
    position: 'absolute',
    left: 0,
    bottom: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.success[500],
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  providerCard: {
    backgroundColor: colors.neutral[100],
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  providerName: {
    fontSize: typography.sizes.md,
    fontWeight: '700',
    color: colors.neutral[900],
    fontFamily: typography.fontFamilyBold,
  },
  providerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  providerRating: {
    fontSize: typography.sizes.sm,
    fontWeight: '700',
    color: colors.neutral[900],
    fontFamily: typography.fontFamilyBold,
  },
  providerMuted: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
    fontFamily: typography.fontFamilyRegular,
  },
  priceTag: {
    backgroundColor: colors.primary[600],
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
  },
  priceTagText: {
    fontSize: typography.sizes.sm,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: typography.fontFamilyBold,
  },
  neighborhoodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm + 2,
    backgroundColor: colors.primary[50],
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 7,
  },
  neighborhoodText: {
    flex: 1,
    fontSize: 11.5,
    lineHeight: 16,
    color: colors.primary[700],
    fontWeight: '600',
    fontFamily: typography.fontFamilyMedium,
  },
});
}
