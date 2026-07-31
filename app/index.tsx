import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ScrollView, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '@/lib/language-context';
import { colors, spacing, radius, typography, shadows } from '@/lib/theme';
import { Button } from '@/components/ui';
import { Wrench, ShieldCheck, MapPin } from 'lucide-react-native';

const { width } = Dimensions.get('window');

const slides = [
  {
    icon: 'Wrench',
    color: colors.primary[500],
    bg: colors.primary[50],
  },
  {
    icon: 'ShieldCheck',
    color: colors.secondary[500],
    bg: colors.secondary[50],
  },
  {
    icon: 'MapPin',
    color: colors.accent[500],
    bg: colors.accent[50],
  },
];

export default function OnboardingScreen() {
  const { t, lang } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const titles = [t('intro1Title'), t('intro2Title'), t('intro3Title')];
  const descs = [t('intro1Desc'), t('intro2Desc'), t('intro3Desc')];

  const handleScroll = (e: any) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    setCurrentIndex(index);
  };

  const handleNext = () => {
    if (currentIndex < 2) {
      scrollRef.current?.scrollTo({ x: width * (currentIndex + 1), animated: true });
    } else {
      handleGetStarted();
    }
  };

  const handleGetStarted = () => {
    // Navigate to login - using router
    const { router } = require('expo-router');
    router.replace('/login');
  };

  const handleSkip = () => {
    handleGetStarted();
  };

  const renderIcon = (iconName: string, color: string, bg: string) => {
    const iconProps = { size: 64, color, strokeWidth: 1.5 };
    return (
      <View style={[styles.iconWrap, { backgroundColor: bg }]}>
        {iconName === 'Wrench' && <Wrench {...iconProps} />}
        {iconName === 'ShieldCheck' && <ShieldCheck {...iconProps} />}
        {iconName === 'MapPin' && <MapPin {...iconProps} />}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.skipRow}>
        {currentIndex < 2 && (
          <TouchableOpacity onPress={handleSkip}>
            <Text style={styles.skipText}>{t('skip')}</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {slides.map((slide, index) => (
          <View key={index} style={styles.slide}>
            {renderIcon(slides[index].icon, slides[index].color, slides[index].bg)}
            <Text style={styles.slideTitle}>{titles[index]}</Text>
            <Text style={styles.slideDesc}>{descs[index]}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dotsRow}>
        {slides.map((_, index) => (
          <View
            key={index}
            style={[styles.dot, currentIndex === index ? styles.dotActive : styles.dotInactive]}
          />
        ))}
      </View>

      <View style={styles.bottomArea}>
        <Button
          label={currentIndex === 2 ? t('getStarted') : t('next')}
          onPress={handleNext}
          style={styles.ctaBtn}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[0],
  },
  skipRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  skipText: {
    fontSize: typography.sizes.md,
    color: colors.neutral[500],
    fontWeight: '600',
    fontFamily: typography.fontFamilyMedium,
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    width,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  iconWrap: {
    width: 140,
    height: 140,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  slideTitle: {
    fontSize: typography.sizes.xxxl,
    fontWeight: '700',
    color: colors.neutral[900],
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 36,
    fontFamily: typography.fontFamilyBold,
  },
  slideDesc: {
    fontSize: typography.sizes.md,
    color: colors.neutral[500],
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: typography.fontFamilyRegular,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  dot: {
    height: 8,
    borderRadius: radius.full,
    marginHorizontal: spacing.xs,
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.primary[600],
  },
  dotInactive: {
    width: 8,
    backgroundColor: colors.neutral[300],
  },
  bottomArea: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  ctaBtn: {
    width: '100%',
  },
});
