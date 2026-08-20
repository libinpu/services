import { Tabs } from 'expo-router';
import { View, Platform, StyleSheet, type ColorValue } from 'react-native';
import { Home, Calendar, User } from 'lucide-react-native';
import { colors, radius, typography } from '@/lib/theme';
import { useLanguage } from '@/lib/language-context';

/** Rounded pill behind the active tab icon. */
function TabIcon({
  Icon,
  color,
  focused,
}: {
  Icon: typeof Home;
  color: ColorValue;
  focused: boolean;
}) {
  return (
    <View style={[styles.iconPill, focused && styles.iconPillActive]}>
      <Icon size={20} color={focused ? colors.neutral[100] : String(color)} strokeWidth={focused ? 2.6 : 2} />
    </View>
  );
}

export default function TabLayout() {
  const { t } = useLanguage();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary[600],
        tabBarInactiveTintColor: colors.neutral[500],
        tabBarStyle: {
          backgroundColor: colors.neutral[100],
          borderTopWidth: 0,
          paddingBottom: Platform.OS === 'ios' ? 24 : 10,
          paddingTop: 10,
          height: Platform.OS === 'ios' ? 92 : 74,
          borderTopLeftRadius: radius.xxl,
          borderTopRightRadius: radius.xxl,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          boxShadow: '0 -6px 24px rgba(47, 107, 79, 0.10)',
          elevation: 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          fontFamily: typography.fontFamilyBold,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('homeTab'),
          tabBarIcon: ({ color, focused }) => <TabIcon Icon={Home} color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: t('bookingsTab'),
          tabBarIcon: ({ color, focused }) => <TabIcon Icon={Calendar} color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('profileTab'),
          tabBarIcon: ({ color, focused }) => <TabIcon Icon={User} color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconPill: {
    width: 46,
    height: 30,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPillActive: {
    backgroundColor: colors.primary[600],
  },
});
