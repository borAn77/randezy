import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Session } from '@supabase/supabase-js';
import { StatusBar } from 'expo-status-bar';
import {
  View, Text, TouchableOpacity, StyleSheet, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from './lib/supabase';
import { usePushNotifications } from './hooks/usePushNotifications';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import CalendarScreen from './screens/CalendarScreen';
import BusinessScreen from './screens/BusinessScreen';
import SettingsScreen from './screens/SettingsScreen';
import { BRAND } from './constants/colors';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ─── Tab definitions ───────────────────────────────────────────────────────────
const TABS: {
  name: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
}[] = [
  { name: 'Ana',     label: 'Ana Sayfa', icon: 'home-outline',       iconActive: 'home' },
  { name: 'Takvim',  label: 'Takvim',    icon: 'calendar-outline',   iconActive: 'calendar' },
  { name: 'Isletme', label: 'İşletme',   icon: 'storefront-outline', iconActive: 'storefront' },
  { name: 'Profil',  label: 'Profil',    icon: 'person-outline',     iconActive: 'person' },
];

// ─── Custom Tab Bar ────────────────────────────────────────────────────────────
function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const handleFab = () => {
    Alert.alert('Yeni Randevu', 'Yakında eklenecek.');
  };

  const leftTabs = [0, 1];
  const rightTabs = [2, 3];

  const renderTab = (tabIndex: number) => {
    const tab = TABS[tabIndex];
    const focused = state.index === tabIndex;

    return (
      <TouchableOpacity
        key={tab.name}
        style={tabBarStyles.tab}
        onPress={() => navigation.navigate(tab.name)}
        activeOpacity={0.7}
      >
        <Ionicons
          name={focused ? tab.iconActive : tab.icon}
          size={24}
          color={focused ? BRAND : '#94a3b8'}
        />
        <Text style={[tabBarStyles.label, focused && tabBarStyles.labelActive]}>
          {tab.label}
        </Text>
        {focused && <View style={tabBarStyles.dot} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={tabBarStyles.container}>
      <View style={tabBarStyles.inner}>
        {/* Left tabs */}
        <View style={tabBarStyles.side}>
          {leftTabs.map(renderTab)}
        </View>

        {/* FAB */}
        <View style={tabBarStyles.fabWrap}>
          <TouchableOpacity style={tabBarStyles.fab} onPress={handleFab} activeOpacity={0.85}>
            <Ionicons name="add" size={32} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Right tabs */}
        <View style={tabBarStyles.side}>
          {rightTabs.map(renderTab)}
        </View>
      </View>
    </View>
  );
}

const tabBarStyles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e8ecf0',
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    paddingHorizontal: 8,
  },
  side: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    gap: 3,
    position: 'relative',
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94a3b8',
  },
  labelActive: {
    color: BRAND,
    fontWeight: '700',
  },
  dot: {
    position: 'absolute',
    bottom: -6,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: BRAND,
  },
  fabWrap: {
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
  },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0f172a',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
});

// ─── Main tabs navigator ───────────────────────────────────────────────────────
function MainTabs() {
  usePushNotifications();
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={props => <CustomTabBar {...props} />}
    >
      <Tab.Screen name="Ana"     component={HomeScreen} />
      <Tab.Screen name="Takvim"  component={CalendarScreen} />
      <Tab.Screen name="Isletme" component={BusinessScreen} />
      <Tab.Screen name="Profil"  component={SettingsScreen} />
    </Tab.Navigator>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!ready) return null;

  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {session ? (
          <Stack.Screen name="Main" component={MainTabs} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
