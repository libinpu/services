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
} from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import { colors, spacing, radius, typography, shadows } from '@/lib/theme';

// Build styles fresh on each call so they pick up the current theme values.
function makeStyles() {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.neutral[50],
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      backgroundColor: colors.neutral[50],
      paddingTop: spacing.xl,
    },
    headerBtn: {
      width: 40,
      height: 40,
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.neutral[100],
    },
    headerBtnText: {
      fontSize: 22,
      color: colors.neutral[700],
      includeFontPadding: false,
    },
    headerTitle: {
      flex: 1,
      fontSize: typography.sizes.xl,
      fontWeight: '700',
      color: colors.neutral[700],
      marginLeft: spacing.sm,
      fontFamily: typography.fontFamilyBold,
      includeFontPadding: false,
    },
    headerRight: {
      width: 40,
    },
    btnBase: {
      minHeight: 52,
      paddingVertical: spacing.sm,
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
    },
    btnPrimary: {
      backgroundColor: colors.primary[600],
    },
    btnSecondary: {
      backgroundColor: colors.neutral[100],
      borderWidth: 1.5,
      borderColor: colors.primary[600],
    },
    btnOutline: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: colors.primary[600],
    },
    btnGhost: {
      backgroundColor: 'transparent',
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
      color: colors.neutral[0],
    },
    btnSecondaryText: {
      color: colors.primary[600],
    },
    btnOutlineText: {
      color: colors.primary[600],
    },
    btnGhostText: {
      color: colors.primary[600],
    },
    btnDangerText: {
      color: colors.neutral[0],
    },
    card: {
      backgroundColor: colors.neutral[100],
      borderRadius: radius.lg,
      padding: spacing.md,
    },
    input: {
      minHeight: 52,
      borderWidth: 1.5,
      borderColor: colors.neutral[200],
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      fontSize: typography.sizes.md,
      color: colors.neutral[700],
      backgroundColor: colors.neutral[100],
      fontFamily: typography.fontFamilyRegular,
      includeFontPadding: false,
    },
    badge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
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
      color: colors.warning[600],
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
      color: colors.neutral[400],
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
      paddingHorizontal: spacing.md,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    sectionTitle: {
      fontSize: typography.sizes.lg,
      fontWeight: '700',
      color: colors.neutral[700],
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
}: {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
}) {
  const styles = makeStyles();
  return (
    <View style={styles.header}>
      {onBack && (
        <TouchableOpacity onPress={onBack} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>←</Text>
        </TouchableOpacity>
      )}
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={styles.headerRight}>{right}</View>
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

  const iconColor = variant === 'primary' || variant === 'secondary' || variant === 'danger' ? colors.neutral[0] : colors.primary[600];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.btnBase, variantStyle, disabled && styles.btnDisabled, style]}
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
      placeholderTextColor={colors.neutral[400]}
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      style={[styles.input, style]}
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
      <ActivityIndicator size="large" color={colors.primary[600]} />
      {label && <Text style={styles.loadingText}>{label}</Text>}
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
