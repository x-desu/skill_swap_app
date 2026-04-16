import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import MapView, { Circle, Marker, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { X, Infinity, Zap, Star, ShieldCheck } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Constants from 'expo-constants';
import { upsertUserProfile } from '../src/services/firestoreService';
import { getPaywallStrings } from '../src/i18n/paywallI18n';
import { useAuth } from '../src/hooks/useAuth';
import { startRazorpayPayment } from '../src/services/razorpayService';

const PRIMARY = '#ff1a5c';
const DARK_BG = '#000000';
const DARK_SURFACE = '#0d0202';
const DARK_CARD = '#1a0505';
const DARK_TEXT = '#FFFFFF';
const DARK_TEXT_MUTED = '#888888';
const MAP_CIRCLE = 'rgba(255, 26, 92, 0.25)';

const FALLBACK: Region = {
  latitude: 28.6139,
  longitude: 77.2090,
  latitudeDelta: 0.09,
  longitudeDelta: 0.09,
};

type ResolvedLocation = {
  city: string;
  country: string;
};

const CREDIT_PACKS = [
  { id: 'starter', credits: 10, inr: 99,  label: 'Starter Pack', badge: '10' },
  { id: 'value',   credits: 25, inr: 250, label: 'Value Pack',   badge: '25' },
  { id: 'pro',     credits: 75, inr: 499, label: 'Pro Pack',     badge: '75' },
];

function formatLocationLabel(location: Partial<ResolvedLocation> | null | undefined): string {
  const city = location?.city?.trim();
  const country = location?.country?.trim();
  if (city && country) return `${city}, ${country}`;
  if (city) return city;
  if (country) return country;
  return 'Location unavailable';
}

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const t = getPaywallStrings();
  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;
  const mapRef = useRef<MapView | null>(null);

  const [region, setRegion] = useState(FALLBACK);
  const [locationLabel, setLocationLabel] = useState('Location unavailable');
  const [showUserLocation, setShowUserLocation] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(1);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let subscription: Location.LocationSubscription | null = null;

    const applyRegion = (nextRegion: Region, shouldShowRealUserLocation: boolean) => {
      if (cancelled) return;
      setRegion(nextRegion);
      setShowUserLocation(shouldShowRealUserLocation);
    };

    const applyLocationLabel = (location: Partial<ResolvedLocation> | null | undefined) => {
      if (cancelled) return;
      setLocationLabel(formatLocationLabel(location));
    };

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (status !== 'granted') return;

        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        if (cancelled) return;

        const initialRegion = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          latitudeDelta: 0.06,
          longitudeDelta: 0.06,
        };
        applyRegion(initialRegion, true);
        mapRef.current?.animateToRegion(initialRegion, 1000);

        subscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
          async (location) => {
            if (cancelled) return;
            const nextRegion = {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              latitudeDelta: 0.06,
              longitudeDelta: 0.06,
            };
            applyRegion(nextRegion, true);
            try {
              const geocode = await Location.reverseGeocodeAsync({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
              });
              if (geocode.length > 0) {
                const place = geocode[0];
                applyLocationLabel({
                  city: place.city || place.subregion || place.region || '',
                  country: place.country || '',
                });
              }
            } catch {}
          }
        );

        const geocode = await Location.reverseGeocodeAsync({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        if (geocode.length > 0) {
          const place = geocode[0];
          applyLocationLabel({
            city: place.city || place.subregion || place.region || '',
            country: place.country || '',
          });
        }
      } catch (e) {
        console.log('[Paywall] Location error', e);
      }
    })();

    return () => {
      cancelled = true;
      if (subscription) subscription.remove();
    };
  }, []);

  const onPurchase = async () => {
    const pack = CREDIT_PACKS[selectedIdx];
    if (!pack) return;
    setPurchasing(true);
    try {
      const success = await startRazorpayPayment(
        pack.inr,
        pack.credits,
        user?.email || undefined
      );
      if (success) {
        if (user?.uid) await upsertUserProfile(user.uid, { hasSeenPaywall: true });
        Alert.alert('', t.purchaseThanks, [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]);
      }
    } catch (e) {
      console.error('[Paywall] Purchase error', e);
      Alert.alert('Error', 'Payment could not be completed.');
    } finally {
      setPurchasing(false);
    }
  };

  const onSkip = async () => {
    if (user?.uid) await upsertUserProfile(user.uid, { hasSeenPaywall: true });
    router.replace('/(tabs)');
  };

  const onRestore = () =>
    Alert.alert('Restore', 'Credits are non-restorable consumables. Check your transaction history in Settings.');

  const openUrl = (url?: string) => { if (url) Linking.openURL(url); };

  const center = { latitude: region.latitude, longitude: region.longitude };

  const features = [
    { label: t.chip1,             icon: <Infinity     color={PRIMARY} size={24} /> },
    { label: t.chip2,             icon: <Zap          color={PRIMARY} size={24} /> },
    { label: t.chip3,             icon: <Star         color={PRIMARY} size={24} /> },
    { label: 'Verified profiles', icon: <ShieldCheck  color={PRIMARY} size={24} /> },
  ];

  return (
    <View style={styles.root}>
      {/* ── Map hero ── */}
      <View style={styles.mapWrap}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={region}
          region={region}
          showsUserLocation={showUserLocation}
          userInterfaceStyle="dark"
          scrollEnabled={true}
          zoomEnabled={true}
        >
          <Circle center={center} radius={4200} strokeColor={PRIMARY} fillColor={MAP_CIRCLE} />
          <Marker coordinate={center} title={t.markerTitle} description={locationLabel} />
        </MapView>

        {/* Top chrome */}
        <View style={[styles.mapChrome, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={onSkip} style={styles.iconBtn}>
            <X color={DARK_TEXT} size={22} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onRestore}>
            <Text style={styles.restore}>{t.restore}</Text>
          </TouchableOpacity>
        </View>

        {/* Location pill */}
        <BlurView intensity={20} style={styles.locationPill}>
          <Text style={styles.locationEyebrow}>Your area</Text>
          <Text style={styles.locationText} numberOfLines={1}>{locationLabel}</Text>
        </BlurView>
      </View>

      {/* ── Bottom sheet ── */}
      <LinearGradient
        colors={[DARK_BG, DARK_SURFACE, DARK_CARD]}
        style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}
      >
        <Text style={styles.title}>{t.title}</Text>
        <Text style={styles.subtitle}>{t.subtitle}</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuresRow}>
          {features.map((f, i) => (
            <View key={i} style={styles.featureCard}>
              <View style={styles.featureIconContainer}>{f.icon}</View>
              <Text style={styles.featureLabel}>{f.label}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.cardsRow}>
          {CREDIT_PACKS.map((pack, i) => {
            const selected = i === selectedIdx;
            return (
              <TouchableOpacity
                key={pack.id}
                style={[styles.card, selected && styles.cardSelected]}
                onPress={() => setSelectedIdx(i)}
                activeOpacity={0.9}
              >
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{pack.badge} CREDITS</Text>
                </View>
                <Text style={[styles.period, selected && styles.periodSelected]}>{pack.label}</Text>
                <Text style={[styles.price,  selected && styles.priceSelected]}>₹{pack.inr}</Text>
                <Text style={styles.approxPrice}>{pack.credits} credits to connect</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.trustRow}>
          <Text style={styles.trust}>{t.trust}</Text>
        </View>

        <TouchableOpacity
          style={[styles.cta, purchasing && styles.ctaDisabled]}
          onPress={onPurchase}
          disabled={purchasing}
        >
          {purchasing
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.ctaText}>{t.continue}</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity onPress={onSkip} style={styles.skipBtn}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <TouchableOpacity onPress={() => openUrl(extra.paywallPrivacyUrl)}>
            <Text style={styles.link}>{t.privacy}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openUrl(extra.paywallTermsUrl)}>
            <Text style={styles.link}>{t.terms}</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DARK_BG },
  mapWrap: { height: '32%', minHeight: 220 },
  mapChrome: {
    position: 'absolute',
    left: 0, right: 0, top: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    alignItems: 'center',
    zIndex: 10,
  },
  locationPill: {
    position: 'absolute',
    left: 16, right: 16, bottom: 14,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  locationEyebrow: {
    color: DARK_TEXT_MUTED,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  locationText: { color: DARK_TEXT, fontSize: 17, fontWeight: '700', marginTop: 2 },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  restore: { fontSize: 16, color: PRIMARY, fontWeight: '700' },
  sheet: {
    flex: 1,
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    marginTop: -28,
    paddingHorizontal: 20, paddingTop: 26,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)',
  },
  title: { fontSize: 26, fontWeight: '900', textAlign: 'center', color: DARK_TEXT, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: DARK_TEXT_MUTED, textAlign: 'center', marginTop: 8, lineHeight: 20, fontWeight: '500' },
  featuresRow: { flexDirection: 'row', gap: 12, marginTop: 24, paddingBottom: 16, paddingHorizontal: 4 },
  featureCard: {
    width: 105, minHeight: 110,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 22, padding: 12,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  featureIconContainer: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: 'rgba(255,26,92,0.15)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(255,26,92,0.3)',
  },
  featureLabel: { fontSize: 11, color: DARK_TEXT, fontWeight: '700', textAlign: 'center', marginTop: 2 },
  cardsRow: { flexDirection: 'row', gap: 8, marginTop: 24, justifyContent: 'space-between' },
  card: {
    flex: 1, minHeight: 155,
    borderRadius: 20, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 10, paddingTop: 36,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  cardSelected: {
    borderColor: PRIMARY,
    backgroundColor: 'rgba(255,26,92,0.06)',
    borderWidth: 1.5,
  },
  badge: {
    position: 'absolute', top: -12, alignSelf: 'center',
    backgroundColor: PRIMARY,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 10, zIndex: 10,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8,
  },
  badgeText: { fontSize: 9, fontWeight: '900', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5 },
  period: { fontSize: 12, color: DARK_TEXT_MUTED, fontWeight: '700', textAlign: 'center' },
  periodSelected: { color: DARK_TEXT },
  price: { fontSize: 18, color: DARK_TEXT, textAlign: 'center', marginTop: 10, fontWeight: '900', letterSpacing: -0.5 },
  priceSelected: { color: PRIMARY },
  approxPrice: { fontSize: 10, color: DARK_TEXT_MUTED, textAlign: 'center', marginTop: 6, lineHeight: 14, fontWeight: '600' },
  trustRow: { marginTop: 16 },
  trust: { fontSize: 11, color: DARK_TEXT_MUTED, textAlign: 'center', fontWeight: '500', opacity: 0.7 },
  cta: {
    marginTop: 18, backgroundColor: PRIMARY,
    borderRadius: 16, paddingVertical: 18, alignItems: 'center',
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5, shadowRadius: 20, elevation: 15,
  },
  ctaDisabled: { opacity: 0.5 },
  ctaText: { color: '#fff', fontSize: 19, fontWeight: '900', letterSpacing: 0.5 },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginTop: 22 },
  link: { fontSize: 12, color: DARK_TEXT_MUTED, textDecorationLine: 'underline', fontWeight: '500' },
  skipBtn: { marginTop: 16, alignItems: 'center', paddingVertical: 10 },
  skipText: { fontSize: 16, color: DARK_TEXT_MUTED, fontWeight: '600' },
});
