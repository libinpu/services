import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Wrench, Zap, Wind, Hammer, Paintbrush, Sparkles, Bug, Refrigerator, Scissors,
  GraduationCap, Car, Bike, Laptop, Leaf, Droplets, ShowerHead, Sofa, Truck,
  Siren, CalendarClock, Navigation, RefreshCw, Wallet, Gift, ShieldCheck, Camera,
  MessageCircle, Bell, Bot, Mic, CreditCard, Crown, BellRing,
} from 'lucide-react-native';
import { iconTileGradients, shadows, type IconTileTone } from '@/lib/theme';

/**
 * 3D illustrated icon tile.
 *
 * Every tile in the app is rendered through this component so the whole icon
 * set shares one lighting model: a diagonal gradient body, a soft top-left
 * specular highlight, a bottom-right occlusion shade and a drop shadow beneath
 * the glyph. That keeps categories, quick actions and feature tiles from ever
 * mixing flat and dimensional styles.
 */

const GLYPHS = {
  Wrench, Zap, Wind, Hammer, Paintbrush, Sparkles, Bug, Refrigerator, Scissors,
  GraduationCap, Car, Bike, Laptop, Leaf, Droplets, ShowerHead, Sofa, Truck,
  Siren, CalendarClock, Navigation, RefreshCw, Wallet, Gift, ShieldCheck, Camera,
  MessageCircle, Bell, Bot, Mic, CreditCard, Crown, BellRing,
} as const;

export type GlyphName = keyof typeof GLYPHS;

/** Stable tone per icon so a category always renders in the same colours. */
const TONE_BY_GLYPH: Partial<Record<GlyphName, IconTileTone>> = {
  Zap: 'gold',
  Wrench: 'sky',
  Droplets: 'sky',
  ShowerHead: 'sky',
  Wind: 'teal',
  Hammer: 'clay',
  Paintbrush: 'violet',
  Sparkles: 'green',
  Bug: 'coral',
  Refrigerator: 'teal',
  Scissors: 'rose',
  GraduationCap: 'violet',
  Car: 'clay',
  Bike: 'coral',
  Laptop: 'sky',
  Leaf: 'green',
  Sofa: 'clay',
  Truck: 'gold',
  Siren: 'coral',
  CalendarClock: 'violet',
  Navigation: 'sky',
  RefreshCw: 'teal',
  Wallet: 'green',
  Gift: 'rose',
  ShieldCheck: 'green',
  Camera: 'violet',
  MessageCircle: 'sky',
  Bell: 'gold',
  BellRing: 'gold',
  Bot: 'violet',
  Mic: 'coral',
  CreditCard: 'teal',
  Crown: 'gold',
};

/** Semantic aliases so screens can ask for a concept, not a lucide name. */
const ALIASES: Record<string, GlyphName> = {
  emergency: 'Siren',
  schedule: 'CalendarClock',
  track: 'Navigation',
  rebook: 'RefreshCw',
  loyalty: 'Crown',
  plan: 'ShieldCheck',
  wallet: 'Wallet',
  offers: 'Gift',
  chat: 'MessageCircle',
  ai: 'Bot',
  voice: 'Mic',
  photos: 'Camera',
  reminder: 'BellRing',
  upi: 'CreditCard',
  verified: 'ShieldCheck',
  notifications: 'Bell',
  cleaning: 'Sparkles',
  plumbing: 'ShowerHead',
  electrical: 'Zap',
};

function canonicalName(name: string | null | undefined): GlyphName {
  const raw = name || '';
  if (raw in GLYPHS) return raw as GlyphName;
  return ALIASES[raw.toLowerCase()] || 'Wrench';
}

const TONE_ORDER: IconTileTone[] = ['green', 'gold', 'sky', 'coral', 'violet', 'teal', 'clay', 'rose'];

/** Deterministic fallback tone for icons we have not mapped explicitly. */
function toneFor(name: string): IconTileTone {
  const mapped = TONE_BY_GLYPH[name as GlyphName];
  if (mapped) return mapped;
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) % 997;
  return TONE_ORDER[hash % TONE_ORDER.length];
}

export function resolveGlyph(name: string | null | undefined) {
  return GLYPHS[canonicalName(name)];
}

export function ServiceIcon3D({
  name,
  size = 64,
  tone,
  style,
  shape = 'squircle',
}: {
  /** lucide glyph name coming from the DB (`service_categories.icon_name`) */
  name: string;
  size?: number;
  tone?: IconTileTone;
  style?: StyleProp<ViewStyle>;
  shape?: 'squircle' | 'circle';
}) {
  const glyphName = canonicalName(name);
  const Glyph = GLYPHS[glyphName];
  const [light, dark] = iconTileGradients[tone || toneFor(glyphName)];
  const br = shape === 'circle' ? size / 2 : Math.round(size * 0.32);
  const glyphSize = Math.round(size * 0.44);

  return (
    <View style={[{ width: size, height: size }, styles.wrap, { borderRadius: br }, shadows.md, style]}>
      <LinearGradient
        colors={[light, dark]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: br }]}
      />
      {/* top-left specular highlight */}
      <View
        style={{
          position: 'absolute',
          top: -size * 0.28,
          left: -size * 0.18,
          width: size * 0.95,
          height: size * 0.7,
          borderRadius: size,
          backgroundColor: 'rgba(255,255,255,0.28)',
          transform: [{ rotate: '-18deg' }],
        }}
      />
      {/* bottom-right occlusion shade */}
      <View
        style={{
          position: 'absolute',
          bottom: -size * 0.35,
          right: -size * 0.25,
          width: size * 0.9,
          height: size * 0.7,
          borderRadius: size,
          backgroundColor: 'rgba(0,0,0,0.12)',
        }}
      />
      {/* glyph drop shadow, then the glyph itself */}
      <View style={styles.glyphWrap}>
        <View style={{ position: 'absolute', transform: [{ translateY: 1.5 }, { translateX: 1 }] }}>
          <Glyph size={glyphSize} color="rgba(0,0,0,0.22)" strokeWidth={2.4} />
        </View>
        <Glyph size={glyphSize} color="#FFFFFF" strokeWidth={2.4} />
      </View>
      {/* glass rim */}
      <View
        style={[
          StyleSheet.absoluteFill,
          { borderRadius: br, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' },
        ]}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyphWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
