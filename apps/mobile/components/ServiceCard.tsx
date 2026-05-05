// apps/mobile/components/ServiceCard.tsx
import React from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const COLORS = {
  bg: '#0F172A', surface: '#1E293B', accent: '#6C63FF',
  text: '#F8FAFC', subtext: '#94A3B8', border: '#334155', gold: '#F59E0B',
};

interface ServiceCardProps {
  service: {
    id: string;
    title: string;
    price: number;
    price_unit: string;
    rating_avg: number;
    review_count: number;
    images?: string[];
    image_url?: string;
    category: string;
    provider_name?: string;
    provider_avatar?: string;
    provider?: {
      full_name: string;
      avatar_url?: string;
      city?: string;
    };
    is_remote?: boolean;
    distance_km?: number;
  };
  onPress: () => void;
  horizontal?: boolean;
}

export function ServiceCard({ service, onPress, horizontal }: ServiceCardProps) {
  const imageUrl = service.image_url
    || service.images?.[0]
    || `https://via.placeholder.com/400x250/1E293B/6C63FF?text=${encodeURIComponent(service.category)}`;

  const providerName = service.provider_name || service.provider?.full_name || 'Provider';
  const providerAvatar = service.provider_avatar || service.provider?.avatar_url
    || `https://ui-avatars.com/api/?name=${providerName}&background=6C63FF&color=fff`;

  if (horizontal) {
    return (
      <TouchableOpacity style={styles.hCard} onPress={onPress} activeOpacity={0.9}>
        <Image source={{ uri: imageUrl }} style={styles.hCardImage} resizeMode="cover" />
        <View style={styles.hCardContent}>
          <Text style={styles.hCardTitle} numberOfLines={2}>{service.title}</Text>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={12} color={COLORS.gold} />
            <Text style={styles.ratingText}>
              {service.rating_avg?.toFixed(1) || '—'}
            </Text>
            <Text style={styles.reviewCount}>({service.review_count})</Text>
          </View>
          <Text style={styles.hCardPrice}>
            €{Number(service.price).toFixed(0)}
            <Text style={styles.priceUnit}>/{service.price_unit === 'hourly' ? 'hr' : service.price_unit}</Text>
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.imageWrapper}>
        <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
        {service.is_remote && (
          <View style={styles.remoteBadge}>
            <Text style={styles.remoteBadgeText}>🌐 Remote</Text>
          </View>
        )}
        {service.distance_km !== undefined && (
          <View style={styles.distanceBadge}>
            <Ionicons name="location" size={10} color={COLORS.accent} />
            <Text style={styles.distanceBadgeText}>
              {service.distance_km < 1
                ? `${Math.round(service.distance_km * 1000)}m`
                : `${service.distance_km.toFixed(1)}km`}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.cardContent}>
        <View style={styles.providerRow}>
          <Image source={{ uri: providerAvatar }} style={styles.providerAvatar} />
          <Text style={styles.providerName} numberOfLines={1}>
            {providerName}
          </Text>
          <View style={styles.categoryTag}>
            <Text style={styles.categoryTagText}>
              {service.category?.replace('_', ' ')}
            </Text>
          </View>
        </View>

        <Text style={styles.cardTitle} numberOfLines={2}>{service.title}</Text>

        <View style={styles.cardFooter}>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={13} color={COLORS.gold} />
            <Text style={styles.ratingText}>
              {Number(service.rating_avg || 0).toFixed(1)}
            </Text>
            <Text style={styles.reviewCount}>({service.review_count})</Text>
          </View>
          <Text style={styles.price}>
            <Text style={styles.priceAmount}>€{Number(service.price).toFixed(0)}</Text>
            <Text style={styles.priceUnit}>/{service.price_unit === 'hourly' ? 'hr' : service.price_unit}</Text>
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}


// ─── CategoryPill ──────────────────────────────────────────────
// apps/mobile/components/CategoryPill.tsx

interface CategoryPillProps {
  label: string;
  icon: string;
  color: string;
  selected: boolean;
  onPress: () => void;
}

export function CategoryPill({ label, icon, color, selected, onPress }: CategoryPillProps) {
  return (
    <TouchableOpacity
      style={[
        pillStyles.pill,
        selected && { backgroundColor: color, borderColor: color },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={pillStyles.icon}>{icon}</Text>
      <Text style={[pillStyles.label, selected && { color: '#fff' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const pillStyles = StyleSheet.create({
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9,
    backgroundColor: '#1E293B', borderRadius: 100,
    borderWidth: 1, borderColor: '#334155',
  },
  icon: { fontSize: 14 },
  label: { fontSize: 13, fontWeight: '600', color: '#94A3B8' },
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },
  imageWrapper: { position: 'relative', height: 180 },
  image: { width: '100%', height: '100%' },
  remoteBadge: {
    position: 'absolute', top: 10, left: 10,
    backgroundColor: 'rgba(15,23,42,0.85)', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  remoteBadgeText: { fontSize: 11, color: COLORS.text, fontWeight: '600' },
  distanceBadge: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: 'rgba(15,23,42,0.85)', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
    flexDirection: 'row', alignItems: 'center', gap: 3,
  },
  distanceBadgeText: { fontSize: 11, color: COLORS.accent, fontWeight: '600' },
  cardContent: { padding: 14 },
  providerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  providerAvatar: { width: 24, height: 24, borderRadius: 12 },
  providerName: { flex: 1, fontSize: 12, color: COLORS.subtext, fontWeight: '500' },
  categoryTag: {
    backgroundColor: `${COLORS.accent}20`, borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  categoryTagText: { fontSize: 10, fontWeight: '700', color: COLORS.accent, textTransform: 'uppercase' },
  cardTitle: {
    fontSize: 16, fontWeight: '700', color: COLORS.text, lineHeight: 22, marginBottom: 10,
  },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  reviewCount: { fontSize: 12, color: COLORS.subtext },
  price: {},
  priceAmount: { fontSize: 18, fontWeight: '800', color: COLORS.accent },
  priceUnit: { fontSize: 12, color: COLORS.subtext },

  // Horizontal card
  hCard: {
    flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', width: 280,
  },
  hCardImage: { width: 90, height: 90 },
  hCardContent: { flex: 1, padding: 12 },
  hCardTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, lineHeight: 20, marginBottom: 4 },
  hCardPrice: { fontSize: 16, fontWeight: '800', color: COLORS.accent, marginTop: 4 },
});
