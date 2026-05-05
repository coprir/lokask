// apps/mobile/app/(tabs)/dashboard.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Linking, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../store/auth';
import { api } from '../../utils/api';
import { format } from 'date-fns';

const COLORS = {
  bg: '#0F172A', surface: '#1E293B', accent: '#6C63FF',
  accent2: '#06B6D4', text: '#F8FAFC', subtext: '#94A3B8',
  border: '#334155', gold: '#F59E0B', green: '#10B981', error: '#EF4444',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pending: { label: 'Pending', color: '#F59E0B', bg: '#F59E0B20', icon: 'time-outline' },
  confirmed: { label: 'Confirmed', color: '#06B6D4', bg: '#06B6D420', icon: 'checkmark-circle-outline' },
  in_progress: { label: 'In Progress', color: '#6C63FF', bg: '#6C63FF20', icon: 'flash-outline' },
  completed: { label: 'Completed', color: '#10B981', bg: '#10B98120', icon: 'checkmark-done-outline' },
  cancelled: { label: 'Cancelled', color: '#EF4444', bg: '#EF444420', icon: 'close-circle-outline' },
};

function EarningsCard({ total, thisMonth, count }: any) {
  return (
    <LinearGradient
      colors={['#6C63FF', '#4F46E5']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.earningsCard}
    >
      <Text style={styles.earningsLabel}>Total Earnings</Text>
      <Text style={styles.earningsTotal}>€{Number(total).toFixed(2)}</Text>
      <View style={styles.earningsRow}>
        <View style={styles.earningsStat}>
          <Text style={styles.earningsStatVal}>€{Number(thisMonth).toFixed(2)}</Text>
          <Text style={styles.earningsStatLabel}>This month</Text>
        </View>
        <View style={styles.earningsDivider} />
        <View style={styles.earningsStat}>
          <Text style={styles.earningsStatVal}>{count}</Text>
          <Text style={styles.earningsStatLabel}>Completed</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

function BookingItem({ booking, onUpdateStatus }: any) {
  const cfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
  const isProvider = true;

  return (
    <TouchableOpacity
      style={styles.bookingItem}
      onPress={() => router.push(`/booking/${booking.id}`)}
    >
      <View style={styles.bookingItemTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.bookingService} numberOfLines={1}>
            {booking.service?.title || 'Service'}
          </Text>
          <Text style={styles.bookingCustomer}>
            {booking.customer?.full_name || booking.provider?.full_name}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
          <Ionicons name={cfg.icon as any} size={12} color={cfg.color} />
          <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>

      <View style={styles.bookingItemBottom}>
        <View style={styles.bookingMeta}>
          <Ionicons name="calendar-outline" size={13} color={COLORS.subtext} />
          <Text style={styles.bookingMetaText}>
            {format(new Date(booking.scheduled_at), 'EEE d MMM, HH:mm')}
          </Text>
        </View>
        <Text style={styles.bookingAmount}>
          €{Number(booking.total_amount).toFixed(2)}
        </Text>
      </View>

      {/* Quick actions for provider */}
      {booking.status === 'pending' && (
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: `${COLORS.green}20`, borderColor: `${COLORS.green}40` }]}
            onPress={() => onUpdateStatus(booking.id, 'confirmed')}
          >
            <Ionicons name="checkmark" size={14} color={COLORS.green} />
            <Text style={[styles.actionBtnText, { color: COLORS.green }]}>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: `${COLORS.error}20`, borderColor: `${COLORS.error}40` }]}
            onPress={() => onUpdateStatus(booking.id, 'cancelled')}
          >
            <Ionicons name="close" size={14} color={COLORS.error} />
            <Text style={[styles.actionBtnText, { color: COLORS.error }]}>Decline</Text>
          </TouchableOpacity>
        </View>
      )}
      {booking.status === 'confirmed' && (
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.actionBtn, { flex: 1, backgroundColor: `${COLORS.accent}20`, borderColor: `${COLORS.accent}40` }]}
            onPress={() => onUpdateStatus(booking.id, 'in_progress')}
          >
            <Ionicons name="flash" size={14} color={COLORS.accent} />
            <Text style={[styles.actionBtnText, { color: COLORS.accent }]}>Start Service</Text>
          </TouchableOpacity>
        </View>
      )}
      {booking.status === 'in_progress' && (
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.actionBtn, { flex: 1, backgroundColor: `${COLORS.green}20`, borderColor: `${COLORS.green}40` }]}
            onPress={() => onUpdateStatus(booking.id, 'completed')}
          >
            <Ionicons name="checkmark-done" size={14} color={COLORS.green} />
            <Text style={[styles.actionBtnText, { color: COLORS.green }]}>Mark Complete</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function DashboardScreen() {
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'provider' | 'customer'>('provider');
  const [bookings, setBookings] = useState<any[]>([]);
  const [earnings, setEarnings] = useState<any>(null);
  const [stripeStatus, setStripeStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  const isProvider = user?.role === 'provider' || user?.role === 'both';

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = useCallback(async () => {
    try {
      const params: any = { role: activeTab, limit: 30 };
      if (filterStatus) params.status = filterStatus;

      const [bookingsRes] = await Promise.all([
        api.getBookings(params),
        ...(activeTab === 'provider' && isProvider
          ? [
            api.getProviderDashboard().then(r => setEarnings(r.data)),
            api.getConnectStatus().then(r => setStripeStatus(r.data)).catch(() => null),
          ]
          : []),
      ]);

      setBookings(bookingsRes.data || []);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, filterStatus, isProvider]);

  const handleUpdateStatus = async (bookingId: string, status: string) => {
    try {
      await api.updateBookingStatus(bookingId, { status });
      setBookings(prev =>
        prev.map(b => b.id === bookingId ? { ...b, status } : b)
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update booking');
    }
  };

  const handleStripeOnboard = async () => {
    try {
      const res = await api.onboardStripeConnect();
      await Linking.openURL(res.data.url);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to start onboarding');
    }
  };

  const STATUS_FILTERS = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard</Text>
        {isProvider && (
          <TouchableOpacity
            style={styles.addServiceBtn}
            onPress={() => router.push('/service/create')}
          >
            <Ionicons name="add" size={20} color={COLORS.accent} />
            <Text style={styles.addServiceText}>Add Service</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tab switcher */}
      {(user?.role === 'both' || isProvider) && (
        <View style={styles.tabSwitcher}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'provider' && styles.tabBtnActive]}
            onPress={() => setActiveTab('provider')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'provider' && styles.tabBtnTextActive]}>
              As Provider
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'customer' && styles.tabBtnActive]}
            onPress={() => setActiveTab('customer')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'customer' && styles.tabBtnTextActive]}>
              As Customer
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadData(); }}
            tintColor={COLORS.accent}
          />
        }
      >
        {/* Earnings (provider only) */}
        {activeTab === 'provider' && isProvider && (
          <>
            {earnings && (
              <View style={styles.section}>
                <EarningsCard
                  total={earnings.total_earnings}
                  thisMonth={earnings.this_month}
                  count={earnings.payment_count}
                />
              </View>
            )}

            {/* Stripe Connect CTA */}
            {!stripeStatus?.charges_enabled && (
              <TouchableOpacity style={styles.stripeCTA} onPress={handleStripeOnboard}>
                <View style={styles.stripeIcon}>
                  <Text style={styles.stripeIconText}>💳</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stripeCTATitle}>Set up payouts</Text>
                  <Text style={styles.stripeCTASubtext}>
                    Connect Stripe to receive payments directly
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={COLORS.accent} />
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Status filter */}
        <View style={styles.section}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <TouchableOpacity
              style={[styles.filterChip, !filterStatus && styles.filterChipActive]}
              onPress={() => setFilterStatus(null)}
            >
              <Text style={[styles.filterChipText, !filterStatus && styles.filterChipTextActive]}>
                All
              </Text>
            </TouchableOpacity>
            {STATUS_FILTERS.map(s => (
              <TouchableOpacity
                key={s}
                style={[styles.filterChip, filterStatus === s && styles.filterChipActive]}
                onPress={() => setFilterStatus(filterStatus === s ? null : s)}
              >
                <Text style={[styles.filterChipText, filterStatus === s && styles.filterChipTextActive]}>
                  {STATUS_CONFIG[s]?.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Bookings list */}
        <View style={styles.section}>
          {loading ? (
            <ActivityIndicator size="large" color={COLORS.accent} style={{ marginTop: 40 }} />
          ) : bookings.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>
                {activeTab === 'provider' ? '📋' : '🛒'}
              </Text>
              <Text style={styles.emptyTitle}>No bookings yet</Text>
              <Text style={styles.emptySubtext}>
                {activeTab === 'provider'
                  ? 'Create a service listing to start receiving bookings.'
                  : 'Browse services to make your first booking.'}
              </Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => activeTab === 'provider'
                  ? router.push('/service/create')
                  : router.push('/(tabs)')
                }
              >
                <Text style={styles.emptyBtnText}>
                  {activeTab === 'provider' ? 'Create Service' : 'Browse Services'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.bookingsList}>
              {bookings.map(booking => (
                <BookingItem
                  key={booking.id}
                  booking={booking}
                  onUpdateStatus={handleUpdateStatus}
                />
              ))}
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: COLORS.text },
  addServiceBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: `${COLORS.accent}20`, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: `${COLORS.accent}40`,
  },
  addServiceText: { fontSize: 14, fontWeight: '600', color: COLORS.accent },
  tabSwitcher: {
    flexDirection: 'row', marginHorizontal: 20, marginBottom: 12,
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 4,
    borderWidth: 1, borderColor: COLORS.border,
  },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center' },
  tabBtnActive: { backgroundColor: COLORS.accent },
  tabBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.subtext },
  tabBtnTextActive: { color: '#fff' },
  section: { paddingHorizontal: 20, marginBottom: 8 },
  earningsCard: {
    borderRadius: 18, padding: 20, marginBottom: 16,
  },
  earningsLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  earningsTotal: { fontSize: 38, fontWeight: '900', color: '#fff', marginVertical: 4 },
  earningsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  earningsStat: { flex: 1, alignItems: 'center' },
  earningsStatVal: { fontSize: 18, fontWeight: '700', color: '#fff' },
  earningsStatLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  earningsDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.2)' },
  stripeCTA: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 16,
    marginHorizontal: 20,
  },
  stripeIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: `${COLORS.accent}20`,
    alignItems: 'center', justifyContent: 'center',
  },
  stripeIconText: { fontSize: 20 },
  stripeCTATitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  stripeCTASubtext: { fontSize: 13, color: COLORS.subtext, marginTop: 2 },
  filterScroll: { marginBottom: 12 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    marginRight: 8,
  },
  filterChipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  filterChipText: { fontSize: 13, fontWeight: '500', color: COLORS.subtext },
  filterChipTextActive: { color: '#fff' },
  bookingsList: { gap: 12 },
  bookingItem: {
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  bookingItemTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  bookingService: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  bookingCustomer: { fontSize: 13, color: COLORS.subtext },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  statusText: { fontSize: 12, fontWeight: '600' },
  bookingItemBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bookingMeta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  bookingMetaText: { fontSize: 13, color: COLORS.subtext },
  bookingAmount: { fontSize: 15, fontWeight: '700', color: COLORS.accent },
  quickActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1,
  },
  actionBtnText: { fontSize: 13, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: COLORS.subtext, textAlign: 'center', marginBottom: 20, lineHeight: 22 },
  emptyBtn: {
    backgroundColor: COLORS.accent, borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 12,
  },
  emptyBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
