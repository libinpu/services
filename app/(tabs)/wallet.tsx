import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '@/lib/language-context';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { colors, spacing, radius, typography, shadows } from '@/lib/theme';
import { LoadingState, EmptyState, Button } from '@/components/ui';
import type { Wallet, WalletTransaction, Offer } from '@/lib/types';
import { LinearGradient } from 'expo-linear-gradient';
import { Wallet as WalletIcon, TrendingUp, TrendingDown, Gift, Tag } from 'lucide-react-native';

export default function WalletScreen() {
  const { t, lang } = useLanguage();
  const { session } = useAuth();

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }
    try {
      // Mock data
      setWallet({ id: 'w1', user_id: session.user.id, balance: 1250.50 } as Wallet);
      setTransactions([
        { id: 't1', wallet_id: 'w1', amount: 500, type: 'credit', description: 'Refund', created_at: new Date().toISOString() },
        { id: 't2', wallet_id: 'w1', amount: 150, type: 'debit', description: 'Service Payment', created_at: new Date(Date.now() - 86400000).toISOString() }
      ] as WalletTransaction[]);
      setOffers([
        { id: '1', title_en: 'Add ₹1000 & get ₹100 extra', title_ml: '₹1000 ചേർക്കുക, ₹100 അധികം നേടുക', discount_text_en: '10% Extra', discount_text_ml: '10% അധികം', is_active: true } as Offer
      ]);
    } catch (e) {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) return <LoadingState label={t('loading')} />;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Wallet balance card */}
        <View style={styles.walletCardWrap}>
          <LinearGradient
            colors={[colors.primary[500], colors.primary[700]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.walletCard}
          >
            <View style={styles.walletHeader}>
              <WalletIcon size={24} color={colors.neutral[0]} strokeWidth={2} />
              <Text style={styles.walletLabel}>{t('walletBalance')}</Text>
            </View>
            <Text style={styles.walletBalance}>₹{wallet?.balance?.toFixed(2) || '0.00'}</Text>
            <View style={styles.walletActions}>
              <Button label="Add Money" onPress={() => {}} variant="secondary" style={styles.walletActionBtn} />
            </View>
          </LinearGradient>
        </View>

        {/* Offers */}
        {offers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('offersForYou')}</Text>
            {offers.map((offer) => (
              <View key={offer.id} style={styles.offerCard}>
                <View style={styles.offerIcon}>
                  <Tag size={20} color={colors.secondary[600]} strokeWidth={2} />
                </View>
                <View style={styles.offerInfo}>
                  <Text style={styles.offerTitle}>
                    {lang === 'ml' ? offer.title_ml : offer.title_en}
                  </Text>
                  <Text style={styles.offerDesc}>
                    {lang === 'ml' ? offer.description_ml : offer.description_en}
                  </Text>
                </View>
                <View style={styles.offerBadge}>
                  <Text style={styles.offerBadgeText}>
                    {lang === 'ml' ? offer.discount_text_ml : offer.discount_text_en}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Transactions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('transactions')}</Text>
          {transactions.length === 0 ? (
            <EmptyState title="No transactions yet" />
          ) : (
            transactions.map((tx) => (
              <View key={tx.id} style={styles.txRow}>
                <View style={[styles.txIcon, { backgroundColor: tx.type === 'credit' ? colors.success[50] : colors.error[50] }]}>
                  {tx.type === 'credit' ? (
                    <TrendingUp size={18} color={colors.success[600]} strokeWidth={2} />
                  ) : (
                    <TrendingDown size={18} color={colors.error[600]} strokeWidth={2} />
                  )}
                </View>
                <View style={styles.txInfo}>
                  <Text style={styles.txDesc}>{tx.description || tx.type}</Text>
                  <Text style={styles.txDate}>{new Date(tx.created_at).toLocaleDateString('en-IN')}</Text>
                </View>
                <Text style={[styles.txAmount, { color: tx.type === 'credit' ? colors.success[600] : colors.error[600] }]}>
                  {tx.type === 'credit' ? '+' : '-'}₹{tx.amount}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  walletCardWrap: {
    margin: spacing.md,
    borderRadius: radius.xl,
    ...shadows.lg,
    overflow: 'hidden',
  },
  walletCard: {
    padding: spacing.xl,
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  walletLabel: {
    fontSize: typography.sizes.md,
    color: colors.neutral[100],
    marginLeft: spacing.sm,
    fontFamily: typography.fontFamilyMedium,
  },
  walletBalance: {
    fontSize: typography.sizes.display,
    fontWeight: '700',
    color: colors.neutral[0],
    marginBottom: spacing.lg,
    fontFamily: typography.fontFamilyBold,
  },
  walletActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  walletActionBtn: {
    flex: 1,
  },
  section: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    color: colors.neutral[0],
    marginBottom: spacing.sm,
    fontFamily: typography.fontFamilyBold,
  },
  offerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[100],
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  offerIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.secondary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  offerInfo: {
    flex: 1,
  },
  offerTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: '700',
    color: colors.neutral[0],
    fontFamily: typography.fontFamilyBold,
  },
  offerDesc: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
    marginTop: 2,
    fontFamily: typography.fontFamilyRegular,
  },
  offerBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.secondary[100],
    borderRadius: radius.sm,
  },
  offerBadgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: '700',
    color: colors.secondary[700],
    fontFamily: typography.fontFamilyBold,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[100],
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  txInfo: {
    flex: 1,
  },
  txDesc: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.neutral[0],
    fontFamily: typography.fontFamilyMedium,
  },
  txDate: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[400],
    marginTop: 2,
    fontFamily: typography.fontFamilyRegular,
  },
  txAmount: {
    fontSize: typography.sizes.md,
    fontWeight: '700',
    fontFamily: typography.fontFamilyBold,
  },
});
