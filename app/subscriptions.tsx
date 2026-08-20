import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useLanguage } from '@/lib/language-context';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { colors, spacing, radius, typography, shadows } from '@/lib/theme';
import { Header, Button, LoadingState, ErrorState } from '@/components/ui';
import { ServiceIcon3D } from '@/components/ServiceIcon3D';
import type { SubscriptionPlan, UserSubscription } from '@/lib/types';
import { Check } from 'lucide-react-native';

export default function SubscriptionsScreen() {
  const { t, lang } = useLanguage();
  const { session } = useAuth();
  const router = useRouter();

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const styles = makeStyles();
  const userId = session?.user?.id;

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [plansRes, subRes] = await Promise.all([
        supabase.from('subscription_plans').select('*').eq('is_active', true).order('sort_order'),
        userId
          ? supabase
              .from('user_subscriptions')
              .select('*')
              .eq('user_id', userId)
              .eq('status', 'active')
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);
      if (plansRes.error) throw plansRes.error;
      const list = (plansRes.data || []) as SubscriptionPlan[];
      setPlans(list);
      setSubscription((subRes.data as UserSubscription) || null);
      setSelectedId((subRes.data as UserSubscription)?.plan_id || list[0]?.id || null);
    } catch (e: any) {
      setError(e.message || 'Failed to load plans');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubscribe = async () => {
    if (!userId || !selectedId) return;
    const plan = plans.find((p) => p.id === selectedId);
    if (!plan) return;
    setSaving(true);
    setError(null);
    try {
      const renewsAt = new Date();
      if (plan.billing_period === 'monthly') renewsAt.setMonth(renewsAt.getMonth() + 1);
      else renewsAt.setFullYear(renewsAt.getFullYear() + 1);

      if (subscription) {
        const { error: updateError } = await supabase
          .from('user_subscriptions')
          .update({ plan_id: plan.id, renews_at: renewsAt.toISOString(), status: 'active' })
          .eq('id', subscription.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from('user_subscriptions').insert({
          user_id: userId,
          plan_id: plan.id,
          status: 'active',
          renews_at: renewsAt.toISOString(),
        });
        if (insertError) throw insertError;
      }
      await fetchData();
    } catch (e: any) {
      setError(e.message || 'Could not update your plan');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState label={t('loading')} />;
  if (error && plans.length === 0) return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title={t('homeCarePlans')}
        subtitle={t('homeCarePlansDesc')}
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
      />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
        {plans.map((plan) => {
          const active = selectedId === plan.id;
          const current = subscription?.plan_id === plan.id;
          const perks = lang === 'ml' ? plan.perks_ml : plan.perks_en;
          return (
            <Pressable
              key={plan.id}
              onPress={() => setSelectedId(plan.id)}
              style={[styles.planCard, active && styles.planCardActive]}
            >
              <View style={styles.planHeader}>
                <ServiceIcon3D name="plan" size={48} tone={plan.billing_period === 'yearly' ? 'gold' : 'green'} />
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text style={styles.planName}>{lang === 'ml' ? plan.name_ml : plan.name_en}</Text>
                  <Text style={styles.planDesc} numberOfLines={2}>
                    {lang === 'ml' ? plan.description_ml : plan.description_en}
                  </Text>
                </View>
                <View>
                  <Text style={styles.planPrice}>₹{Number(plan.price).toFixed(0)}</Text>
                  <Text style={styles.planPeriod}>/{plan.billing_period === 'monthly' ? 'mo' : 'yr'}</Text>
                </View>
              </View>

              <View style={styles.perkList}>
                <Text style={styles.included}>
                  {plan.included_services} {t('servicesIncluded')}
                </Text>
                {perks.map((perk) => (
                  <View key={perk} style={styles.perkRow}>
                    <Check size={14} color={colors.primary[600]} strokeWidth={3} />
                    <Text style={styles.perkText}>{perk}</Text>
                  </View>
                ))}
              </View>

              {current ? (
                <View style={styles.currentPill}>
                  <Text style={styles.currentPillText}>
                    {t('activePlan')} · {subscription?.services_used ?? 0}/{plan.included_services}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>

      <View style={styles.bottomBar}>
        <Button
          label={t('subscribe')}
          onPress={handleSubscribe}
          loading={saving}
          disabled={!selectedId}
          style={{ width: '100%' }}
        />
      </View>
    </SafeAreaView>
  );
}

function makeStyles() {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.neutral[50] },
    planCard: {
      marginHorizontal: spacing.lg,
      marginTop: spacing.lg,
      backgroundColor: colors.neutral[100],
      borderRadius: radius.xl,
      padding: spacing.lg,
      borderWidth: 2,
      borderColor: 'transparent',
      ...shadows.md,
    },
    planCardActive: { borderColor: colors.primary[600] },
    planHeader: { flexDirection: 'row', alignItems: 'center' },
    planName: {
      fontSize: typography.sizes.lg,
      fontWeight: '800',
      color: colors.neutral[900],
      fontFamily: typography.fontFamilyDisplay,
    },
    planDesc: {
      fontSize: typography.sizes.xs,
      color: colors.neutral[500],
      marginTop: 2,
      fontFamily: typography.fontFamilyRegular,
    },
    planPrice: {
      fontSize: typography.sizes.xxl,
      fontWeight: '800',
      color: colors.primary[600],
      fontFamily: typography.fontFamilyDisplay,
      textAlign: 'right',
    },
    planPeriod: {
      fontSize: typography.sizes.xs,
      color: colors.neutral[500],
      textAlign: 'right',
      fontFamily: typography.fontFamilyRegular,
    },
    perkList: { marginTop: spacing.md, gap: 6 },
    included: {
      fontSize: typography.sizes.sm,
      fontWeight: '700',
      color: colors.neutral[900],
      fontFamily: typography.fontFamilyBold,
      marginBottom: 2,
    },
    perkRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    perkText: {
      flex: 1,
      fontSize: typography.sizes.sm,
      color: colors.neutral[600],
      fontFamily: typography.fontFamilyRegular,
    },
    currentPill: {
      alignSelf: 'flex-start',
      marginTop: spacing.md,
      backgroundColor: colors.primary[50],
      borderRadius: radius.full,
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
    },
    currentPillText: {
      fontSize: typography.sizes.xs,
      fontWeight: '700',
      color: colors.primary[600],
      fontFamily: typography.fontFamilyBold,
    },
    errorText: {
      fontSize: typography.sizes.sm,
      color: colors.error[600],
      textAlign: 'center',
      marginTop: spacing.lg,
      fontFamily: typography.fontFamilyRegular,
    },
    bottomBar: {
      position: 'absolute',
      left: 0, right: 0, bottom: 0,
      backgroundColor: colors.neutral[50],
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.xl,
    },
  });
}
