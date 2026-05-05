// apps/mobile/app/service/[id].tsx
import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  StyleSheet, FlatList, Dimensions, ActivityIndicator, Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../store/auth';
import { api } from '../../utils/api';

const { width: SCREEN_W } = Dimensions.get('window');

const COLORS = {
  bg: '#0F172A',
  surface: '#1E293B',
  accent: '#6C63FF',
  accent2: '#06B6D4',
  text: '#F8FAFC',
  subtext: '#94A3B8',
  border: '#334155',
  gold: '#F59E0B',
  green: '#10B981',
};

function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Ionicons
          key={i}
          name={i <= Math.round(rating) ? 'star' : 'star-outline'}
          size={size}
          color={COLORS.gold}
        />
      ))}
    </View>
  );
}

function ReviewCard({ review }: { review: any }) {
  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <Image
          source={{ uri: review.reviewer?.avatar_url || `https://ui-avatars.com/api/?name=${review.reviewer?.full_name}&background=6C63FF&color=fff` }}
          style={styles.reviewAvatar}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.reviewerName}>{review.reviewer?.full_name}</Text>
          <StarRating rating={review.rating} />
        </View>
        <Text style={styles.reviewDate}>
          {new Date(review.created_at).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
        </Text>
      </View>
      {review.comment && (
        <Text style={styles.reviewComment}>{review.comment}</Text>
      )}
      {review.tags?.length > 0 && (
        <View style={styles.reviewTags}>
          {review.tags.map((tag: string) => (
            <View key={tag} style={styles.reviewTag}>
              <Text style={styles.reviewTagText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default function ServiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [service, setService] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    loadService();
  }, [id]);

  const loadService = async () => {
    try {
      const res = await api.getService(id);
      setService(res.data);
    } catch {
      Alert.alert('Error', 'Failed to load service');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleBook = () => {
    if (!user) {
      router.push('/(auth)/login');
      return;
    }
    if (service.provider_id === user.id) {
      Alert.alert('Cannot book', 'You cannot book your own service.');
      return;
    }
    router.push({
      pathname: '/booking/create',
      params: { service_id: id },
    });
  };

  const handleContact = async () => {
    if (!user) { router.push('/(auth)/login'); return; }
    try {
      const res = await api.startConversation({
        recipient_id: service.provider_id,
        initial_message: `Hi, I'm interested in your service: ${service.title}`,
      });
      router.push(`/chat/${res.data.conversation_id}`);
    } catch {
      Alert.alert('Error', 'Could not start conversation');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  if (!service) return null;

  const images = service.images?.length
    ? service.images
    : ['https://via.placeholder.com/400x300/1E293B/6C63FF?text=LOKASK'];

  const provider = service.provider;
  const providerProfile = provider?.provider_profiles?.[0] || provider?.provider_profiles;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image Carousel */}
        <View style={styles.imageContainer}>
          <FlatList
            data={images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              setActiveImage(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W));
            }}
            renderItem={({ item }) => (
              <Image
                source={{ uri: item }}
                style={styles.serviceImage}
                resizeMode="cover"
              />
            )}
            keyExtractor={(_, i) => i.toString()}
          />
          <LinearGradient
            colors={['transparent', COLORS.bg]}
            style={styles.imageGradient}
          />
          {images.length > 1 && (
            <View style={styles.imageDots}>
              {images.map((_: any, i: number) => (
                <View
                  key={i}
                  style={[styles.dot, activeImage === i && styles.dotActive]}
                />
              ))}
            </View>
          )}
          {/* Back button */}
          <TouchableOpacity
            style={[styles.backBtn, { top: insets.top + 8 }]}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Category + badges */}
          <View style={styles.badgeRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>
                {service.category?.replace('_', ' ').toUpperCase()}
              </Text>
            </View>
            {service.is_remote && (
              <View style={[styles.categoryBadge, { backgroundColor: `${COLORS.accent2}20` }]}>
                <Text style={[styles.categoryText, { color: COLORS.accent2 }]}>🌐 Remote</Text>
              </View>
            )}
          </View>

          {/* Title */}
          <Text style={styles.title}>{service.title}</Text>

          {/* Rating + reviews */}
          <View style={styles.ratingRow}>
            <StarRating rating={service.rating_avg} size={16} />
            <Text style={styles.ratingText}>
              {service.rating_avg?.toFixed(1) || '—'} ({service.review_count} reviews)
            </Text>
            <Text style={styles.viewCount}>· {service.view_count || 0} views</Text>
          </View>

          {/* Price */}
          <View style={styles.priceContainer}>
            <Text style={styles.priceAmount}>
              €{Number(service.price).toFixed(2)}
            </Text>
            <Text style={styles.priceUnit}>
              / {service.price_unit === 'hourly' ? 'hr' : service.price_unit}
            </Text>
          </View>

          {/* Provider card */}
          <TouchableOpacity
            style={styles.providerCard}
            onPress={() => router.push(`/provider/${service.provider_id}`)}
          >
            <Image
              source={{ uri: provider?.avatar_url || `https://ui-avatars.com/api/?name=${provider?.full_name}&background=6C63FF&color=fff` }}
              style={styles.providerAvatar}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.providerName}>{provider?.full_name}</Text>
              <Text style={styles.providerMeta}>
                {providerProfile?.tagline || provider?.city || 'Cyprus'}
              </Text>
              <View style={styles.providerBadges}>
                {providerProfile?.id_verified && (
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={12} color={COLORS.green} />
                    <Text style={styles.verifiedText}>Verified</Text>
                  </View>
                )}
                {providerProfile?.completed_jobs > 0 && (
                  <Text style={styles.jobsText}>
                    {providerProfile.completed_jobs} jobs done
                  </Text>
                )}
              </View>
            </View>
            <View style={styles.providerRating}>
              <Ionicons name="star" size={14} color={COLORS.gold} />
              <Text style={styles.providerRatingText}>
                {providerProfile?.rating_avg?.toFixed(1) || '—'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Ionicons name="time-outline" size={18} color={COLORS.accent} />
              <Text style={styles.statLabel}>
                {service.duration_minutes
                  ? `${service.duration_minutes} min`
                  : 'Flexible'}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Ionicons name="location-outline" size={18} color={COLORS.accent} />
              <Text style={styles.statLabel}>
                {service.service_area_km
                  ? `${service.service_area_km} km area`
                  : 'Location flexible'}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Ionicons name="flash-outline" size={18} color={COLORS.accent} />
              <Text style={styles.statLabel}>
                {providerProfile?.response_time_minutes
                  ? `~${providerProfile.response_time_minutes}m reply`
                  : 'Quick reply'}
              </Text>
            </View>
          </View>

          {/* Description */}
          <Text style={styles.sectionLabel}>About this service</Text>
          <Text style={styles.description}>{service.description}</Text>

          {/* Tags */}
          {service.tags?.length > 0 && (
            <View style={styles.tagsRow}>
              {service.tags.map((tag: string) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>#{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Reviews */}
          {service.reviews?.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>
                Reviews ({service.review_count})
              </Text>
              {service.reviews.map((review: any) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </>
          )}

          <View style={{ height: 120 }} />
        </View>
      </ScrollView>

      {/* Bottom action bar */}
      <LinearGradient
        colors={[`${COLORS.bg}00`, COLORS.bg]}
        style={[styles.actionBar, { paddingBottom: insets.bottom + 16 }]}
      >
        <TouchableOpacity style={styles.contactBtn} onPress={handleContact}>
          <Ionicons name="chatbubble-outline" size={20} color={COLORS.accent} />
          <Text style={styles.contactBtnText}>Message</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.bookBtn} onPress={handleBook}>
          <Text style={styles.bookBtnText}>
            Book Now · €{Number(service.price).toFixed(0)}
          </Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  imageContainer: { position: 'relative', height: 300 },
  serviceImage: { width: SCREEN_W, height: 300 },
  imageGradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 80,
  },
  imageDots: {
    position: 'absolute', bottom: 12, alignSelf: 'center',
    flexDirection: 'row', gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)' },
  dotActive: { backgroundColor: '#fff', width: 18 },
  backBtn: {
    position: 'absolute', left: 16,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  content: { paddingHorizontal: 20, paddingTop: 12 },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  categoryBadge: {
    backgroundColor: `${COLORS.accent}20`,
    borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4,
  },
  categoryText: { fontSize: 11, fontWeight: '700', color: COLORS.accent, letterSpacing: 0.5 },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.text, lineHeight: 32, marginBottom: 10 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  ratingText: { fontSize: 14, color: COLORS.text, fontWeight: '600' },
  viewCount: { fontSize: 13, color: COLORS.subtext },
  priceContainer: {
    flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 20,
    backgroundColor: `${COLORS.accent}15`, borderRadius: 12,
    padding: 12, borderWidth: 1, borderColor: `${COLORS.accent}30`,
    alignSelf: 'flex-start',
  },
  priceAmount: { fontSize: 28, fontWeight: '800', color: COLORS.accent },
  priceUnit: { fontSize: 15, color: COLORS.subtext },
  providerCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 16,
  },
  providerAvatar: { width: 48, height: 48, borderRadius: 24 },
  providerName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  providerMeta: { fontSize: 13, color: COLORS.subtext, marginTop: 1 },
  providerBadges: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  verifiedText: { fontSize: 12, color: COLORS.green },
  jobsText: { fontSize: 12, color: COLORS.subtext },
  providerRating: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  providerRatingText: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  statsRow: {
    flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: 14,
    padding: 14, marginBottom: 20, borderWidth: 1, borderColor: COLORS.border,
  },
  stat: { flex: 1, alignItems: 'center', gap: 6 },
  statLabel: { fontSize: 12, color: COLORS.subtext, textAlign: 'center' },
  statDivider: { width: 1, backgroundColor: COLORS.border },
  sectionLabel: {
    fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 10, marginTop: 4,
  },
  description: { fontSize: 15, color: COLORS.subtext, lineHeight: 24, marginBottom: 16 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  tag: { backgroundColor: COLORS.surface, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  tagText: { fontSize: 13, color: COLORS.subtext },
  reviewCard: {
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 10,
  },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  reviewAvatar: { width: 36, height: 36, borderRadius: 18 },
  reviewerName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  reviewDate: { fontSize: 12, color: COLORS.subtext },
  reviewComment: { fontSize: 14, color: COLORS.subtext, lineHeight: 22 },
  reviewTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  reviewTag: { backgroundColor: `${COLORS.accent}15`, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  reviewTagText: { fontSize: 12, color: COLORS.accent },
  actionBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', paddingHorizontal: 20, paddingTop: 24, gap: 12,
  },
  contactBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.surface, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  contactBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.accent },
  bookBtn: {
    flex: 1, backgroundColor: COLORS.accent, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
  },
  bookBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
