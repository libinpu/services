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
  DimensionValue,
} from 'react-native';
import { ArrowRight, ChevronLeft } from 'lucide-react-native';
import { colors, spacing, radius, typography, shadows } from '@/lib/theme';

// Build styles fresh on each call so they pick up the current theme values.
function makeStyles() {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.neutral[50],
    },
    // Premium round header style with slate blue bg (#334E68)
    header: {
      backgroundColor: colors.primary[600],
      borderBottomLeftRadius: radius.xl,
      borderBottomRightRadius: radius.xl,
      paddingHorizontal: spacing.lg,
      paddingTop: Platform.OS === 'ios' ? 54 : spacing.xl,
      paddingBottom: spacing.lg,
      ...shadows.md,
      position: 'relative',
      overflow: 'hidden',
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
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
      marginRight: spacing.md,
    },
    headerTitle: {
      flex: 1,
      fontSize: typography.sizes.xl,
      fontWeight: '700',
      color: colors.neutral[100],
      fontFamily: typography.fontFamilyBold,
      includeFontPadding: false,
    },
    headerRight: {
      minWidth: 42,
      alignItems: 'flex-end',
    },
    headerSubtitle: {
      fontSize: typography.sizes.xs,
      color: 'rgba(255, 255, 255, 0.75)',
      fontFamily: typography.fontFamilyRegular,
      marginTop: spacing.xs,
      marginLeft: 42 + spacing.md, // Align with title
    },
    btnBase: {
      minHeight: 54,
      paddingVertical: spacing.sm,
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xl,
      ...shadows.sm,
    },
    btnPrimary: {
      backgroundColor: colors.accent[500], // Coral Orange CTA
    },
    btnSecondary: {
      backgroundColor: colors.neutral[100],
      borderWidth: 1.5,
      borderColor: colors.accent[500],
    },
    btnOutline: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: colors.accent[500],
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
      color: colors.neutral[100],
    },
    btnSecondaryText: {
      color: colors.accent[500],
    },
    btnOutlineText: {
      color: colors.accent[500],
    },
    btnGhostText: {
      color: colors.accent[500],
    },
    btnDangerText: {
      color: colors.neutral[100],
    },
    card: {
      backgroundColor: colors.neutral[100], // Clean white background
      borderRadius: radius.xl, // Large rounded corners 22-28px
      padding: spacing.lg, // Generous padding
      marginHorizontal: spacing.md,
      marginVertical: spacing.sm,
      borderWidth: 1,
      borderColor: colors.neutral[200],
      ...shadows.md, // Soft shadow / subtle elevation
    },
    input: {
      minHeight: 54,
      borderWidth: 1,
      borderColor: colors.neutral[200],
      borderRadius: radius.md,
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
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: radius.full,
    },
    badgeDefault: {
      backgroundColor: 'rgba(255, 140, 90, 0.12)',
    },
    badgeSuccess: {
      backgroundColor: 'rgba(76, 175, 80, 0.12)',
    },
    badgeWarning: {
      backgroundColor: 'rgba(245, 166, 35, 0.12)',
    },
    badgeError: {
      backgroundColor: 'rgba(244, 67, 54, 0.12)',
    },
    badgeText: {
      fontSize: typography.sizes.xs,
      fontWeight: '700',
      fontFamily: typography.fontFamilyBold,
    },
    badgeDefaultText: {
      color: '#FF8C5A',
    },
    badgeSuccessText: {
      color: '#4CAF50',
    },
    badgeWarningText: {
      color: '#F5A623',
    },
    badgeErrorText: {
      color: '#F44336',
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
      color: '#F44336',
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
      fontSize: typography.sizes.lg,
      fontWeight: '700',
      color: colors.neutral[900],
      fontFamily: typography.fontFamilyBold,
    },
  });
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
      {/* Soft decorative background shape */}
      <View
        style={{
          position: 'absolute',
          top: -40,
          right: -40,
          width: 140,
          height: 140,
          borderRadius: radius.full,
          backgroundColor: 'rgba(255,255,255,0.06)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: -50,
          left: -20,
          width: 100,
          height: 100,
          borderRadius: radius.full,
          backgroundColor: 'rgba(255,255,255,0.04)',
        }}
      />
      <View style={styles.headerRow}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.headerBtn} activeOpacity={0.7}>
            <ChevronLeft size={22} color={colors.neutral[100]} strokeWidth={2.5} />
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

  const iconColor = variant === 'primary' ? colors.neutral[100] : colors.accent[500];

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

export function Badge({ label, variant = 'default' }: { label: string; variant?: 'default' | 'success' | 'warning' | 'error' }) {
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
      <Text style={[styles.badgeText, variantTextStyle]}>{label}</Text>
    </View>
  );
}

export function LoadingState({ label }: { label?: string }) {
  const styles = makeStyles();
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={colors.accent[500]} />
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
  width?: DimensionValue;
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
      style={[{ width, height, borderRadius: br, backgroundColor: colors.neutral[200], opacity }, style]}
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
