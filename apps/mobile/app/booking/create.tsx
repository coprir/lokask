// apps/mobile/app/booking/create.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, ActivityIndicator, Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStripe } from '@stripe/stripe-react-native';
import { api } from '../../utils/api';
import { format, addDays, setHours, setMinutes } from 'date-fns';

const COLORS = {
  bg: '#0F172A', surface: '#1E293B', accent: '#6C63FF',
  accent2: '#06B6D4', text: '#F8FAFC', subtext: '#94A3B8',
  border: '#334155', green: '#10B981', error: '#EF4444',
};

const STEPS = ['Date & Time', 'Details', 'Payment'];

// Generate time slots
function generateTimeSlots() {
  const slots = [];
  for (let h = 8; h <= 20; h++) {
    for (const m of [0, 30]) {
      slots.push(setMinutes(setHours(new Date(), h), m));
    }
  }
  return slots;
}

// Generate next 14 days
function generateDays() {
  return Array.from({ length: 14 }, (_, i) => addDays(new Date(), i + 1));
}

export default function CreateBookingScreen() {
  const { service_id } = useLocalSearchParams<{ service_id: string }>();
  const insets = useSafeAreaInsets();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const [step, setStep] = useState(0);
  const [service, setService] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<Date | null>(null);
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [duration, setDuration] = useState(60);

  const days = generateDays();
  const timeSlots = generateTimeSlots();

  useEffect(() => {
    loadService();
  }, [service_id]);

  const loadService = async () => {
    try {
      const res = await api.getService(service_id);
      const svc = res.data;
      setService(svc);
      if (svc.duration_minutes) setDuration(svc.duration_minutes);
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = service
    ? service.price_unit === 'hourly'
      ? (service.price * duration) / 60
      : service.price
    : 0;

  const handleNext = () => {
    if (step === 0 && (!selectedDay || !selectedTime)) {
      Alert.alert('Please select', 'Choose a date and time to continue.');
      return;
    }
    if (step < STEPS.length - 1) setStep(s => s + 1);
  };

  const buildScheduledAt = (): string => {
    if (!selectedDay || !selectedTime) return '';
    const d = new Date(selectedDay);
    d.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
    return d.toISOString();
  };

  const handlePay = async () => {
    setSubmitting(true);
    try {
      // 1. Create booking
      const bookingRes = await api.createBooking({
        service_id,
        scheduled_at: buildScheduledAt(),
        duration_minutes: duration,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      const booking = bookingRes.data;

      // 2. Create payment intent
      const intentRes = await api.createPaymentIntent(booking.id);
      const { client_secret, amount, currency } = intentRes.data;

      // 3. Init Stripe Payment Sheet
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'LOKASK',
        paymentIntentClientSecret: client_secret,
        defaultBillingDetails: {},
        appearance: {
          colors: {
            primary: '#6C63FF',
            background: '#1E293B',
            componentBackground: '#0F172A',
            componentBorder: '#334155',
            componentDivider: '#334155',
            primaryText: '#F8FAFC',
            secondaryText: '#94A3B8',
            componentText: '#F8FAFC',
            placeholderText: '#64748B',
            icon: '#94A3B8',
          },
        },
      });

      if (initError) throw new Error(initError.message);

      // 4. Present payment sheet
      const { error: payError } = await presentPaymentSheet();

      if (payError) {
        if (payError.code !== 'Canceled') {
          Alert.alert('Payment failed', payError.message);
        }
        return;
      }

      // 5. Success
      router.replace({
        pathname: '/booking/success',
        params: { booking_id: booking.id },
      });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => step > 0 ? setStep(s => s - 1) : router.back()}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book Service</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Step indicator */}
      <View style={styles.stepIndicator}>
        {STEPS.map((label, i) => (
          <React.Fragment key={i}>
            <View style={styles.stepItem}>
              <View style={[
                styles.stepCircle,
                i <= step && styles.stepCircleActive,
                i < step && styles.stepCircleDone,
              ]}>
                {i < step
                  ? <Ionicons name="checkmark" size={14} color="#fff" />
                  : <Text style={[styles.stepNum, i <= step && { color: '#fff' }]}>{i + 1}</Text>
                }
              </View>
              <Text style={[styles.stepLabel, i <= step && { color: COLORS.text }]}>
                {label}
              </Text>
            </View>
            {i < STEPS.length - 1 && (
              <View style={[styles.stepLine, i < step && styles.stepLineActive]} />
            )}
          </React.Fragment>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Service summary */}
        <View style={styles.serviceSummary}>
          <Text style={styles.summaryTitle} numberOfLines={1}>{service?.title}</Text>
          <Text style={styles.summaryPrice}>
            €{Number(service?.price).toFixed(2)}/{service?.price_unit === 'hourly' ? 'hr' : service?.price_unit}
          </Text>
        </View>

        {/* ── STEP 0: Date & Time ── */}
        {step === 0 && (
          <View>
            <Text style={styles.sectionLabel}>Select Date</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daysScroll}>
              {days.map((day, i) => {
                const isSelected = selectedDay?.toDateString() === day.toDateString();
                return (
                  <TouchableOpacity
                    key={i}
                    style={[styles.dayCard, isSelected && styles.dayCardSelected]}
                    onPress={() => setSelectedDay(day)}
                  >
                    <Text style={[styles.dayName, isSelected && { color: '#fff' }]}>
                      {format(day, 'EEE')}
                    </Text>
                    <Text style={[styles.dayNum, isSelected && { color: '#fff' }]}>
                      {format(day, 'd')}
                    </Text>
                    <Text style={[styles.dayMonth, isSelected && { color: 'rgba(255,255,255,0.7)' }]}>
                      {format(day, 'MMM')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={styles.sectionLabel}>Select Time</Text>
            <View style={styles.timeGrid}>
              {timeSlots.map((slot, i) => {
                const isSelected = selectedTime?.getTime() === slot.getTime();
                return (
                  <TouchableOpacity
                    key={i}
                    style={[styles.timeSlot, isSelected && styles.timeSlotSelected]}
                    onPress={() => setSelectedTime(slot)}
                  >
                    <Text style={[styles.timeText, isSelected && { color: '#fff' }]}>
                      {format(slot, 'HH:mm')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Duration (for hourly) */}
            {service?.price_unit === 'hourly' && (
              <>
                <Text style={styles.sectionLabel}>Duration</Text>
                <View style={styles.durationRow}>
                  {[30, 60, 90, 120, 180, 240].map((mins) => (
                    <TouchableOpacity
                      key={mins}
                      style={[styles.durationBtn, duration === mins && styles.durationBtnSelected]}
                      onPress={() => setDuration(mins)}
                    >
                      <Text style={[styles.durationText, duration === mins && { color: '#fff' }]}>
                        {mins < 60 ? `${mins}m` : `${mins / 60}h`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </View>
        )}

        {/* ── STEP 1: Details ── */}
        {step === 1 && (
          <View>
            <Text style={styles.sectionLabel}>Service Address</Text>
            <TextInput
              style={styles.textInput}
              value={address}
              onChangeText={setAddress}
              placeholder="Street, city... (if applicable)"
              placeholderTextColor={COLORS.subtext}
              multiline
            />

            <Text style={styles.sectionLabel}>Notes for provider</Text>
            <TextInput
              style={[styles.textInput, { height: 100 }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Any special requirements, access instructions..."
              placeholderTextColor={COLORS.subtext}
              multiline
              textAlignVertical="top"
            />

            {/* Booking summary */}
            <View style={styles.bookingSummary}>
              <Text style={styles.summaryHeading}>Booking Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryKey}>Date</Text>
                <Text style={styles.summaryVal}>
                  {selectedDay ? format(selectedDay, 'EEEE, d MMMM yyyy') : '—'}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryKey}>Time</Text>
                <Text style={styles.summaryVal}>
                  {selectedTime ? format(selectedTime, 'HH:mm') : '—'}
                </Text>
              </View>
              {service?.price_unit === 'hourly' && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryKey}>Duration</Text>
                  <Text style={styles.summaryVal}>
                    {duration >= 60 ? `${duration / 60}h` : `${duration}m`}
                  </Text>
                </View>
              )}
              <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 8, paddingTop: 8 }]}>
                <Text style={[styles.summaryKey, { fontWeight: '700', color: COLORS.text }]}>Total</Text>
                <Text style={styles.totalAmount}>€{totalAmount.toFixed(2)}</Text>
              </View>
            </View>
          </View>
        )}

        {/* ── STEP 2: Payment ── */}
        {step === 2 && (
          <View>
            <View style={styles.paymentInfo}>
              <Ionicons name="lock-closed" size={20} color={COLORS.green} />
              <Text style={styles.paymentInfoText}>
                Secure payment via Stripe. Your full payment goes directly to the provider.
              </Text>
            </View>

            <View style={styles.paymentSummary}>
              <Text style={styles.summaryHeading}>Payment Details</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryKey}>Service</Text>
                <Text style={styles.summaryVal} numberOfLines={1}>
                  {service?.title}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryKey}>Date & Time</Text>
                <Text style={styles.summaryVal}>
                  {selectedDay && selectedTime
                    ? `${format(selectedDay, 'MMM d')} at ${format(selectedTime, 'HH:mm')}`
                    : '—'}
                </Text>
              </View>
              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={[styles.summaryKey, { fontWeight: '800', fontSize: 16, color: COLORS.text }]}>
                  Total to pay
                </Text>
                <Text style={[styles.totalAmount, { fontSize: 22 }]}>
                  €{totalAmount.toFixed(2)}
                </Text>
              </View>
              <View style={styles.feeNote}>
                <Ionicons name="information-circle-outline" size={14} color={COLORS.subtext} />
                <Text style={styles.feeNoteText}>
                  No platform fees. Stripe processing fees (~1.5%) apply.
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom CTA */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 8 }]}>
        <View style={styles.totalPreview}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>€{totalAmount.toFixed(2)}</Text>
        </View>

        <TouchableOpacity
          style={[styles.ctaBtn, submitting && { opacity: 0.6 }]}
          onPress={step === STEPS.length - 1 ? handlePay : handleNext}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.ctaBtnText}>
              {step === STEPS.length - 1 ? '💳 Pay Now' : 'Continue →'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 12,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  stepIndicator: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 16,
  },
  stepItem: { alignItems: 'center', gap: 6 },
  stepCircle: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: COLORS.surface, borderWidth: 2, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  stepCircleActive: { borderColor: COLORS.accent, backgroundColor: COLORS.accent },
  stepCircleDone: { backgroundColor: COLORS.green, borderColor: COLORS.green },
  stepNum: { fontSize: 13, fontWeight: '700', color: COLORS.subtext },
  stepLabel: { fontSize: 11, color: COLORS.subtext, fontWeight: '500' },
  stepLine: { flex: 1, height: 2, backgroundColor: COLORS.border, marginBottom: 20, marginHorizontal: 4 },
  stepLineActive: { backgroundColor: COLORS.accent },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 20 },
  serviceSummary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 20,
  },
  summaryTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text, flex: 1, marginRight: 8 },
  summaryPrice: { fontSize: 16, fontWeight: '700', color: COLORS.accent },
  sectionLabel: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 12, marginTop: 4 },
  daysScroll: { marginBottom: 20 },
  dayCard: {
    width: 60, alignItems: 'center', backgroundColor: COLORS.surface,
    borderRadius: 12, padding: 10, marginRight: 10,
    borderWidth: 1, borderColor: COLORS.border,
  },
  dayCardSelected: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  dayName: { fontSize: 11, fontWeight: '600', color: COLORS.subtext, marginBottom: 4 },
  dayNum: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  dayMonth: { fontSize: 11, color: COLORS.subtext, marginTop: 2 },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  timeSlot: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  timeSlotSelected: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  timeText: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  durationRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  durationBtn: {
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  durationBtnSelected: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  durationText: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  textInput: {
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 14,
    color: COLORS.text, fontSize: 15, borderWidth: 1, borderColor: COLORS.border,
    marginBottom: 16, minHeight: 52,
  },
  bookingSummary: {
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: COLORS.border,
  },
  paymentSummary: {
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: COLORS.border,
  },
  summaryHeading: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  summaryKey: { fontSize: 14, color: COLORS.subtext },
  summaryVal: { fontSize: 14, color: COLORS.text, fontWeight: '500', maxWidth: '55%', textAlign: 'right' },
  totalRow: { borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 8, paddingTop: 12 },
  totalAmount: { fontSize: 18, fontWeight: '800', color: COLORS.accent },
  feeNote: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12,
    backgroundColor: `${COLORS.accent}10`, borderRadius: 8, padding: 10,
  },
  feeNoteText: { fontSize: 12, color: COLORS.subtext, flex: 1 },
  paymentInfo: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: `${COLORS.green}15`, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: `${COLORS.green}30`, marginBottom: 16,
  },
  paymentInfoText: { fontSize: 13, color: COLORS.subtext, flex: 1, lineHeight: 20 },
  bottomBar: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingTop: 16,
    borderTopWidth: 1, borderTopColor: COLORS.border,
    backgroundColor: COLORS.bg,
  },
  totalPreview: {},
  totalLabel: { fontSize: 12, color: COLORS.subtext },
  totalValue: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  ctaBtn: {
    flex: 1, backgroundColor: COLORS.accent, borderRadius: 14,
    paddingVertical: 15, alignItems: 'center',
  },
  ctaBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
