import { Tabs } from 'expo-router';
import { Hop as Home, Calendar, User } from 'lucide-react-native';
import { colors } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';
import { useLanguage } from '@/lib/language-context';

export default function TabLayout() {
  const { t } = useLanguage();
  const { isDark } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary[600],
        tabBarInactiveTintColor: colors.neutral[400],
        tabBarStyle: {
          backgroundColor: colors.neutral[50],
          borderTopColor: colors.neutral[200],
          borderTopWidth: 1,
          paddingBottom: 4,
          paddingTop: 4,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          fontFamily: 'Inter, Noto Sans Malayalam, system-ui, sans-serif',
        },
        tabBarIconStyle: {
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('homeTab'),
          tabBarIcon: ({ size, color, focused }) => (
            <Home size={size} color={color} strokeWidth={focused ? 2.5 : 2} fill={focused ? colors.primary[50] : 'transparent'} />
          ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: t('bookingsTab'),
          tabBarIcon: ({ size, color, focused }) => (
            <Calendar size={size} color={color} strokeWidth={focused ? 2.5 : 2} fill={focused ? colors.primary[50] : 'transparent'} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('profileTab'),
          tabBarIcon: ({ size, color, focused }) => (
            <User size={size} color={color} strokeWidth={focused ? 2.5 : 2} fill={focused ? colors.primary[50] : 'transparent'} />
          ),
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
