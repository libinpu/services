import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  ViewStyle,
  TextStyle,
  StyleProp,
  Platform,
  Animated,
} from 'react-native';
import { ArrowRight, ChevronLeft, MapPin, ChevronDown, Search, SlidersHorizontal } from 'lucide-react-native';
import { colors, spacing, radius, typography, shadows, heroHeadline } from '@/lib/theme';

// Build styles fresh on each call so they pick up the current theme values.
function makeStyles() {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.neutral[50],
    },
    // Flat warm header that sits directly on the beige canvas
    header: {
      backgroundColor: colors.neutral[50],
      paddingHorizontal: spacing.lg,
      paddingTop: Platform.OS === 'ios' ? 54 : spacing.lg,
      paddingBottom: spacing.md,
      position: 'relative',
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerBtn: {
      width: 42,
      height: 42,
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.neutral[100],
      marginRight: spacing.md,
      ...shadows.sm,
    },
    headerTitle: {
      flex: 1,
      fontSize: typography.sizes.xl,
      fontWeight: '800',
      color: colors.neutral[900],
      fontFamily: typography.fontFamilyDisplay,
      letterSpacing: -0.3,
      includeFontPadding: false,
    },
    headerRight: {
      minWidth: 42,
      alignItems: 'flex-end',
    },
    headerSubtitle: {
      fontSize: typography.sizes.xs,
      color: colors.neutral[500],
      fontFamily: typography.fontFamilyRegular,
      marginTop: spacing.xs,
      marginLeft: 42 + spacing.md, // Align with title
    },
    btnBase: {
      minHeight: 54,
      paddingVertical: spacing.sm,
      borderRadius: radius.full, // fully rounded pill
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xl,
      ...shadows.sm,
    },
    btnPrimary: {
      backgroundColor: colors.primary[600], // forest green CTA
    },
    btnSecondary: {
      backgroundColor: colors.neutral[900], // solid black pill
    },
    btnOutline: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: colors.primary[600],
    },
    btnGhost: {
      backgroundColor: 'transparent',
      ...shadows.sm,
      boxShadow: 'none',
      elevation: 0,
    },
    btnDanger: {
      backgroundColor: colors.error[500],
    },
    btnDisabled: {
      opacity: 0.5,
    },
    btnContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    btnText: {
      fontSize: typography.sizes.md,
      fontWeight: '700',
      fontFamily: typography.fontFamilyBold,
      includeFontPadding: false,
      textAlign: 'center',
    },
    btnPrimaryText: {
      color: '#FFFFFF',
    },
    btnSecondaryText: {
      color: colors.neutral[0],
    },
    btnOutlineText: {
      color: colors.primary[600],
    },
    btnGhostText: {
      color: colors.primary[600],
    },
    btnDangerText: {
      color: colors.neutral[100],
    },
    card: {
      backgroundColor: colors.neutral[100], // white surface
      borderRadius: radius.xl, // 24px rounded corners
      padding: spacing.lg, // generous padding
      marginHorizontal: spacing.md,
      marginVertical: spacing.sm,
      ...shadows.md, // soft shadow, no hard border
    },
    input: {
      minHeight: 54,
      borderWidth: 1,
      borderColor: colors.neutral[200],
      borderRadius: radius.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      fontSize: typography.sizes.md,
      color: colors.neutral[900],
      backgroundColor: colors.neutral[100],
      fontFamily: typography.fontFamilyRegular,
      includeFontPadding: false,
      ...shadows.sm,
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: 5,
      borderRadius: radius.full,
    },
    badgeDefault: {
      backgroundColor: colors.primary[50],
    },
    badgeSuccess: {
      backgroundColor: colors.success[50],
    },
    badgeWarning: {
      backgroundColor: colors.warning[50],
    },
    badgeError: {
      backgroundColor: colors.error[50],
    },
    badgeText: {
      fontSize: typography.sizes.xs,
      fontWeight: '700',
      fontFamily: typography.fontFamilyBold,
    },
    badgeDefaultText: {
      color: colors.primary[600],
    },
    badgeSuccessText: {
      color: colors.success[600],
    },
    badgeWarningText: {
      color: colors.warning[700],
    },
    badgeErrorText: {
      color: colors.error[600],
    },
    loading: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
      backgroundColor: colors.neutral[50],
    },
    loadingText: {
      marginTop: spacing.md,
      fontSize: typography.sizes.sm,
      color: colors.neutral[500],
      fontFamily: typography.fontFamilyRegular,
    },
    empty: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
    },
    emptyTitle: {
      fontSize: typography.sizes.lg,
      fontWeight: '600',
      color: colors.neutral[500],
      fontFamily: typography.fontFamilyMedium,
    },
    emptyDesc: {
      marginTop: spacing.sm,
      fontSize: typography.sizes.sm,
      color: colors.neutral[500],
      textAlign: 'center',
      fontFamily: typography.fontFamilyRegular,
    },
    error: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
      backgroundColor: colors.neutral[50],
    },
    errorText: {
      fontSize: typography.sizes.md,
      color: colors.error[600],
      textAlign: 'center',
      fontFamily: typography.fontFamilyRegular,
    },
    sectionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      marginTop: spacing.xl,
      marginBottom: spacing.md,
    },
    sectionTitle: {
      fontSize: typography.sizes.xl,
      fontWeight: '800',
      color: colors.neutral[900],
      fontFamily: typography.fontFamilyDisplay,
      letterSpacing: -0.3,
    },
    // ── Floating pill search bar ──
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginHorizontal: spacing.lg,
    },
    searchBar: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      height: 58,
      backgroundColor: colors.neutral[100],
      borderRadius: radius.full,
      paddingHorizontal: spacing.sm,
      ...shadows.lg,
    },
    searchLocationChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.primary[50],
      borderRadius: radius.full,
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: 7,
      maxWidth: 130,
    },
    searchLocationText: {
      fontSize: typography.sizes.xs,
      fontWeight: '700',
      color: colors.primary[600],
      fontFamily: typography.fontFamilyBold,
    },
    searchPlaceholder: {
      flex: 1,
      marginLeft: spacing.sm,
      fontSize: typography.sizes.sm,
      color: colors.neutral[500],
      fontFamily: typography.fontFamilyRegular,
    },
    searchIconBtn: {
      width: 44,
      height: 44,
      borderRadius: radius.full,
      backgroundColor: colors.primary[600],
      alignItems: 'center',
      justifyContent: 'center',
    },
    searchFilterBtn: {
      width: 58,
      height: 58,
      borderRadius: radius.full,
      backgroundColor: colors.neutral[900],
      alignItems: 'center',
      justifyContent: 'center',
      ...shadows.lg,
    },
    // ── Location pill ──
    locationPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-start',
      backgroundColor: colors.neutral[100],
      borderRadius: radius.full,
      paddingLeft: spacing.sm,
      paddingRight: spacing.sm + 4,
      paddingVertical: 7,
      maxWidth: 220,
      ...shadows.sm,
    },
    locationPillIcon: {
      width: 26,
      height: 26,
      borderRadius: radius.full,
      backgroundColor: colors.primary[50],
      alignItems: 'center',
      justifyContent: 'center',
    },
    locationPillLabel: {
      fontSize: 10,
      color: colors.neutral[500],
      fontFamily: typography.fontFamilyRegular,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    locationPillText: {
      fontSize: typography.sizes.sm,
      fontWeight: '700',
      color: colors.neutral[900],
      fontFamily: typography.fontFamilyBold,
    },
    heroTitle: heroHeadline,
    heroSubtitle: {
      marginTop: 6,
      fontSize: typography.sizes.sm,
      color: colors.neutral[500],
      fontFamily: typography.fontFamilyRegular,
      lineHeight: 20,
    },
  });
}

/** Bold two-line hero headline used under the top bar. */
export function HeroHeading({ title, subtitle, style }: { title: string; subtitle?: string; style?: StyleProp<ViewStyle> }) {
  const styles = makeStyles();
  return (
    <View style={[{ paddingHorizontal: spacing.lg }, style]}>
      <Text style={styles.heroTitle}>{title}</Text>
      {subtitle ? <Text style={styles.heroSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

/** Tappable location pill for the top bar. */
export function LocationPill({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  const styles = makeStyles();
  return (
    <TouchableOpacity style={styles.locationPill} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.locationPillIcon}>
        <MapPin size={14} color={colors.primary[600]} strokeWidth={2.5} />
      </View>
      <View style={{ flexShrink: 1 }}>
        <Text style={styles.locationPillLabel}>{label}</Text>
        <Text style={styles.locationPillText} numberOfLines={1}>{value}</Text>
      </View>
      <ChevronDown size={16} color={colors.neutral[500]} strokeWidth={2.5} />
    </TouchableOpacity>
  );
}

/**
 * Floating pill search bar that sits between the header and the content.
 * Optional location chip on the left, green search button on the right.
 */
export function FloatingSearchBar({
  placeholder,
  locationChip,
  onPress,
  onFilterPress,
  style,
}: {
  placeholder: string;
  locationChip?: string;
  onPress: () => void;
  onFilterPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const styles = makeStyles();
  return (
    <View style={[styles.searchWrap, style]}>
      <TouchableOpacity style={styles.searchBar} onPress={onPress} activeOpacity={0.9}>
        {locationChip ? (
          <View style={styles.searchLocationChip}>
            <MapPin size={12} color={colors.primary[600]} strokeWidth={2.5} />
            <Text style={styles.searchLocationText} numberOfLines={1}>{locationChip}</Text>
          </View>
        ) : null}
        <Text style={styles.searchPlaceholder} numberOfLines={1}>{placeholder}</Text>
        <View style={styles.searchIconBtn}>
          <Search size={20} color="#FFFFFF" strokeWidth={2.4} />
        </View>
      </TouchableOpacity>
      {onFilterPress ? (
        <TouchableOpacity style={styles.searchFilterBtn} onPress={onFilterPress} activeOpacity={0.9}>
          <SlidersHorizontal size={20} color="#FFFFFF" strokeWidth={2.4} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function ScreenContainer({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const styles = makeStyles();
  return <View style={[styles.screen, style]}>{children}</View>;
}

export function Header({
  title,
  onBack,
  right,
  subtitle,
}: {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
  subtitle?: string;
}) {
  const styles = makeStyles();
  return (
    <View style={styles.header}>
      <View style={styles.headerRow}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.headerBtn} activeOpacity={0.7}>
            <ChevronLeft size={22} color={colors.neutral[900]} strokeWidth={2.5} />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.headerRight}>{right}</View>
      </View>
      {subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  showArrow = false,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  showArrow?: boolean;
}) {
  const styles = makeStyles();
  const variantStyle = {
    primary: styles.btnPrimary,
    secondary: styles.btnSecondary,
    outline: styles.btnOutline,
    ghost: styles.btnGhost,
    danger: styles.btnDanger,
  }[variant];

  const variantTextStyle = {
    primary: styles.btnPrimaryText,
    secondary: styles.btnSecondaryText,
    outline: styles.btnOutlineText,
    ghost: styles.btnGhostText,
    danger: styles.btnDangerText,
  }[variant];

  const iconColor = variant === 'primary' || variant === 'secondary' || variant === 'danger' ? '#FFFFFF' : colors.primary[600];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.btnBase, variantStyle, disabled && styles.btnDisabled, style]}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={iconColor} />
      ) : (
        <View style={styles.btnContent}>
          <Text style={[styles.btnText, variantTextStyle]}>{label}</Text>
          {showArrow && <ArrowRight size={18} color={iconColor} strokeWidth={2.5} />}
        </View>
      )}
    </TouchableOpacity>
  );
}

export function Card({ children, style, onPress }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  const styles = makeStyles();
  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} style={[styles.card, style]} activeOpacity={0.9}>
        {children}
      </TouchableOpacity>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Input({
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  style,
  autoCapitalize = 'none',
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  style?: StyleProp<TextStyle>;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}) {
  const styles = makeStyles();
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.neutral[500]}
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      style={[styles.input, style, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
    />
  );
}

export function Badge({
  label,
  variant = 'default',
  icon,
}: {
  label: string;
  variant?: 'default' | 'success' | 'warning' | 'error';
  /** Optional small leading icon, e.g. a shield for "Police Verified" */
  icon?: React.ReactNode;
}) {
  const styles = makeStyles();
  const variantStyle = {
    default: styles.badgeDefault,
    success: styles.badgeSuccess,
    warning: styles.badgeWarning,
    error: styles.badgeError,
  }[variant];
  const variantTextStyle = {
    default: styles.badgeDefaultText,
    success: styles.badgeSuccessText,
    warning: styles.badgeWarningText,
    error: styles.badgeErrorText,
  }[variant];
  return (
    <View style={[styles.badge, variantStyle]}>
      {icon}
      <Text style={[styles.badgeText, variantTextStyle]}>{label}</Text>
    </View>
  );
}

export function LoadingState({ label }: { label?: string }) {
  const styles = makeStyles();
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={colors.primary[600]} />
      {label && <Text style={styles.loadingText}>{label}</Text>}
    </View>
  );
}

/**
 * SkeletonBox — animated placeholder rectangle.
 * Use inside page shells so the layout is visible immediately
 * while data loads in the background, eliminating full-screen blank states.
 */
export function SkeletonBox({
  width = '100%',
  height = 16,
  borderRadius: br = 6,
  style,
}: {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const [opacity] = React.useState(() => new Animated.Value(0.4));

  React.useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[{ width: width as ViewStyle['width'], height, borderRadius: br, backgroundColor: colors.neutral[200], opacity }, style]}
    />
  );
}

/** Renders skeleton card rows \u2014 drop-in for list loading states */
export function SkeletonList({ rows = 3 }: { rows?: number }) {
  return (
    <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.md }}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={{ backgroundColor: colors.neutral[100], borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
            <SkeletonBox width={44} height={44} borderRadius={radius.md} style={{ marginRight: spacing.md }} />
            <View style={{ flex: 1, gap: 6 }}>
              <SkeletonBox width="70%" height={14} />
              <SkeletonBox width="45%" height={11} />
            </View>
          </View>
          <SkeletonBox width="90%" height={11} style={{ marginBottom: 4 }} />
          <SkeletonBox width="55%" height={11} />
        </View>
      ))}
    </View>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  const styles = makeStyles();
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {description && <Text style={styles.emptyDesc}>{description}</Text>}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const styles = makeStyles();
  return (
    <View style={styles.error}>
      <Text style={styles.errorText}>{message}</Text>
      {onRetry && (
        <Button label="Retry" onPress={onRetry} variant="outline" style={{ marginTop: spacing.md }} />
      )}
    </View>
  );
}

export function SectionTitle({ title, action }: { title: string; action?: React.ReactNode }) {
  const styles = makeStyles();
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action}
    </View>
  );
}
