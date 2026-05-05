// apps/mobile/app/(tabs)/index.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, FlatList,
  RefreshControl, StyleSheet, TextInput, Image,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useAuthStore } from '../../store/auth';
import { api } from '../../utils/api';
import { ServiceCard } from '../../components/ServiceCard';
import { CategoryPill } from '../../components/CategoryPill';

const COLORS = {
  bg: '#0F172A',
  surface: '#1E293B',
  card: '#1E293B',
  accent: '#6C63FF',
  accent2: '#06B6D4',
  text: '#F8FAFC',
  subtext: '#94A3B8',
  border: '#334155',
};

const CATEGORIES = [
  { id: 'cleaning', label: 'Cleaning', icon: '🧹', color: '#06B6D4' },
  { id: 'tutoring', label: 'Tutoring', icon: '📚', color: '#8B5CF6' },
  { id: 'handyman', label: 'Handyman', icon: '🔧', color: '#F59E0B' },
  { id: 'beauty', label: 'Beauty', icon: '💅', color: '#EC4899' },
  { id: 'delivery', label: 'Delivery', icon: '📦', color: '#10B981' },
  { id: 'tech_support', label: 'Tech', icon: '💻', color: '#3B82F6' },
  { id: 'cooking', label: 'Cooking', icon: '👨‍🍳', color: '#EF4444' },
  { id: 'translation', label: 'Translation', icon: '🌍', color: '#6C63FF' },
  { id: 'childcare', label: 'Childcare', icon: '👶', color: '#F97316' },
  { id: 'fitness', label: 'Fitness', icon: '💪', color: '#14B8A6' },
  { id: 'photography', label: 'Photos', icon: '📷', color: '#A855F7' },
  { id: 'pet_care', label: 'Pets', icon: '🐾', color: '#78716C' },
];

export default function HomeScreen() {
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    getUserLocation();
    fetchServices();
  }, [selectedCategory]);

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const loc = await Location.getCurrentPositionAsync({});
      setUserLocation({
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
      });
    } catch { /* silent fail */ }
  };

  const fetchServices = useCallback(async () => {
    try {
      const params: any = {
        limit: 20,
        ...(selectedCategory ? { category: selectedCategory } : {}),
        ...(userLocation ? { lat: userLocation.lat, lng: userLocation.lng, radius_km: 15 } : {}),
      };

      const res = await api.getServices(params);
      setServices(res.data || []);
    } catch (err) {
      console.error('Failed to load services:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory, userLocation]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchServices();
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting()},</Text>
          <Text style={styles.name}>
            {user?.full_name?.split(' ')[0] || 'Welcome'} 👋
          </Text>
        </View>
        <TouchableOpacity
          style={styles.notifBtn}
          onPress={() => router.push('/notifications')}
        >
          <Ionicons name="notifications-outline" size={22} color={COLORS.text} />
          <View style={styles.notifDot} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <TouchableOpacity
        style={styles.searchBar}
        onPress={() => router.push('/(tabs)/search')}
        activeOpacity={0.9}
      >
        <Ionicons name="search" size={18} color={COLORS.subtext} />
        <Text style={styles.searchPlaceholder}>
          Search services, providers...
        </Text>
        <View style={styles.filterBtn}>
          <Ionicons name="options-outline" size={16} color={COLORS.accent} />
        </View>
      </TouchableOpacity>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.accent}
          />
        }
      >
        {/* Location Banner */}
        {userLocation && (
          <View style={styles.locationBanner}>
            <Ionicons name="location" size={14} color={COLORS.accent2} />
            <Text style={styles.locationText}>
              Showing services near you in Cyprus
            </Text>
          </View>
        )}

        {/* Categories */}
        <Text style={styles.sectionTitle}>Categories</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesRow}
        >
          <CategoryPill
            label="All"
            icon="⚡"
            color={COLORS.accent}
            selected={!selectedCategory}
            onPress={() => setSelectedCategory(null)}
          />
          {CATEGORIES.map((cat) => (
            <CategoryPill
              key={cat.id}
              label={cat.label}
              icon={cat.icon}
              color={cat.color}
              selected={selectedCategory === cat.id}
              onPress={() =>
                setSelectedCategory(selectedCategory === cat.id ? null : cat.id)
              }
            />
          ))}
        </ScrollView>

        {/* Featured / Nearby Services */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {selectedCategory
              ? CATEGORIES.find(c => c.id === selectedCategory)?.label
              : 'Nearby Services'}
          </Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/search')}>
            <Text style={styles.seeAll}>See all →</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            {[...Array(3)].map((_, i) => (
              <View key={i} style={styles.skeletonCard} />
            ))}
          </View>
        ) : services.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyTitle}>No services found</Text>
            <Text style={styles.emptySubtext}>
              Try a different category or expand your search area
            </Text>
          </View>
        ) : (
          <View style={styles.servicesList}>
            {services.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                onPress={() => router.push(`/service/${service.id}`)}
              />
            ))}
          </View>
        )}

        {/* Become a Provider CTA */}
        {user?.role === 'customer' && (
          <TouchableOpacity
            style={styles.providerCTA}
            onPress={() => router.push('/become-provider')}
          >
            <View style={styles.ctaContent}>
              <Text style={styles.ctaEmoji}>🚀</Text>
              <View>
                <Text style={styles.ctaTitle}>Have a skill? Earn money</Text>
                <Text style={styles.ctaSubtext}>
                  Join hundreds of providers in Cyprus
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.accent} />
          </TouchableOpacity>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  greeting: { fontSize: 14, color: COLORS.subtext },
  name: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  notifBtn: { position: 'relative', padding: 8 },
  notifDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: COLORS.bg,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: 20,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
  },
  searchPlaceholder: { flex: 1, color: COLORS.subtext, marginLeft: 10, fontSize: 15 },
  filterBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: `${COLORS.accent}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 6,
    gap: 6,
  },
  locationText: { fontSize: 12, color: COLORS.subtext },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 20,
  },
  seeAll: { fontSize: 13, color: COLORS.accent, fontWeight: '600' },
  categoriesRow: { paddingHorizontal: 20, gap: 10 },
  servicesList: { paddingHorizontal: 20, gap: 12 },
  loadingContainer: { paddingHorizontal: 20, gap: 12 },
  skeletonCard: {
    height: 200,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    opacity: 0.5,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: COLORS.subtext, textAlign: 'center' },
  providerCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.accent}15`,
    borderWidth: 1,
    borderColor: `${COLORS.accent}40`,
    borderRadius: 16,
    marginHorizontal: 20,
    marginTop: 24,
    padding: 16,
  },
  ctaContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  ctaEmoji: { fontSize: 28 },
  ctaTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  ctaSubtext: { fontSize: 12, color: COLORS.subtext, marginTop: 2 },
});
