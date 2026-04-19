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
import { X, Infinity as InfinityIcon, Zap, Star, ShieldCheck, MapPin, Crown, Check } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Constants from 'expo-constants';
import { 
  upsertUserProfile, 
  listenToUsersInRange,
  updateUserLocation,
  repairMissingGeohashes,
} from '../src/services/firestoreService';
import { getPaywallStrings } from '../src/i18n/paywallI18n';
import { useAuth } from '../src/hooks/useAuth';
import { startRazorpayPayment } from '../src/services/razorpayService';
import { UserMarker } from '../src/components/UserMarker';
import { distanceBetween } from 'geofire-common';
import { UserDocument } from '../src/types/user';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PRIMARY = '#ff1a5c';
const PRIMARY_GLOW = 'rgba(255,26,92,0.25)';
const DARK_BG = '#0a0010';
const DARK_SURFACE = '#110018';
const DARK_CARD = '#1a0025';
const DARK_TEXT = '#FFFFFF';
const DARK_TEXT_MUTED = 'rgba(255,255,255,0.5)';
const MAP_CIRCLE = 'rgba(255, 26, 92, 0.18)';

const FALLBACK: Region = {
  latitude: 28.6139,
  longitude: 77.2090,
  latitudeDelta: 0.09,
  longitudeDelta: 0.09,
};

type ResolvedLocation = { city: string; country: string };

const CREDIT_PACKS = [
  { id: 'starter', credits: 10, inr: 99,  label: 'Starter', badge: '10', popular: false },
  { id: 'value',   credits: 25, inr: 250, label: 'Value',   badge: '25', popular: true  },
  { id: 'pro',     credits: 75, inr: 499, label: 'Pro',     badge: '75', popular: false },
];

function formatLocationLabel(loc: Partial<ResolvedLocation> | null | undefined): string {
  const city = loc?.city?.trim();
  const country = loc?.country?.trim();
  if (city && country) return `${city}, ${country}`;
  return city || country || 'Detecting location…';
}

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const t = getPaywallStrings();
  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;
  const mapRef = useRef<MapView | null>(null);

  const [region, setRegion] = useState(FALLBACK);
  const [locationLabel, setLocationLabel] = useState('Detecting location…');
  const [showUserLocation, setShowUserLocation] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(1);
  const [purchasing, setPurchasing] = useState(false);
  const [nearbyUsers, setNearbyUsers] = useState<UserDocument[]>([]);
  const [mapSettled, setMapSettled] = useState(false);
  const [searchRadius, setSearchRadius] = useState(50000); // 50km for better discovery coverage
  useEffect(() => {
    if (isMapReady) {
      const t = setTimeout(() => setMapSettled(true), 600);
      return () => clearTimeout(t);
    }
  }, [isMapReady]);
  const [isRegionStable, setIsRegionStable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let subscription: Location.LocationSubscription | null = null;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled || status !== 'granted') return;
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (cancelled) return;
        const nr = { latitude: pos.coords.latitude, longitude: pos.coords.longitude, latitudeDelta: 0.6, longitudeDelta: 0.6 };
        setRegion(nr);
        setShowUserLocation(true);
        mapRef.current?.animateToRegion(nr, 1000);
        try {
          const geo = await Location.reverseGeocodeAsync({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
          if (geo.length > 0 && !cancelled) {
            const p = geo[0];
            setLocationLabel(formatLocationLabel({ city: p.city || p.subregion || p.region || '', country: p.country || '' }));
          }
        } catch {}
        subscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, timeInterval: 8000, distanceInterval: 30 },
          (loc) => {
            if (cancelled) return;
            // Periodically update user location in Firestore
            if (user?.uid) {
              updateUserLocation(user.uid, loc.coords.latitude, loc.coords.longitude).catch(console.error);
            }
          }
        );
      } catch (e) { 
        console.log('[Paywall] Location error', e); 
      }
    })();
    return () => { cancelled = true; subscription?.remove(); };
  }, [user?.uid]);

  // Listen for nearby users
  useEffect(() => {
    if (!showUserLocation || !region.latitude || !region.longitude) return;
    
    const unsub = listenToUsersInRange(
      [region.latitude, region.longitude],
      searchRadius,
      (users) => {
        setNearbyUsers(users);
      }
    );
    
    return () => unsub();
  }, [showUserLocation, user?.uid, region.latitude, region.longitude]);


  const onPurchase = async () => {
    const pack = CREDIT_PACKS[selectedIdx];
    if (!pack) return;
    setPurchasing(true);
    try {
      const success = await startRazorpayPayment(pack.inr, pack.credits, user?.email || undefined);
      if (success) {
        if (user?.uid) await upsertUserProfile(user.uid, { hasSeenPaywall: true });
        Alert.alert('🎉 Credits Added!', t.purchaseThanks, [{ text: 'Continue', onPress: () => router.replace('/(tabs)') }]);
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
    Alert.alert('Restore Purchases', 'Credits are consumable. Check your transaction history in Settings for details.');

  const openUrl = (url?: string) => { if (url) Linking.openURL(url); };

  // Memoize center to prevent excessive re-renders/invalid coordinate crashes
  const center = React.useMemo(() => {
    const lat = Number(region?.latitude);
    const lng = Number(region?.longitude);
    if (isNaN(lat) || isNaN(lng)) return FALLBACK;
    return { 
      latitude: lat, 
      longitude: lng,
      latitudeDelta: region.latitudeDelta || 0.05,
      longitudeDelta: region.longitudeDelta || 0.05
    };
  }, [region.latitude, region.longitude, region.latitudeDelta, region.longitudeDelta]);

  // Deduplicate nearby users to prevent key collisions
  const uniqueNearbyUsers = React.useMemo(() => {
    const map = new Map();
    nearbyUsers.forEach(u => {
      if (u.uid) map.set(u.uid, u);
    });
    return Array.from(map.values());
  }, [nearbyUsers]);

  const features = [
    { label: 'Unlimited\nSwipes',  icon: <InfinityIcon color={PRIMARY} size={22} /> },
    { label: 'Priority\nMatching', icon: <Zap         color={PRIMARY} size={22} /> },
    { label: 'Instant\nMatches',   icon: <Star        color={PRIMARY} size={22} /> },
    { label: 'Verified\nProfiles', icon: <ShieldCheck color={PRIMARY} size={22} /> },
  ];

  const isValidCenter = center && !isNaN(center.latitude) && !isNaN(center.longitude);

  return (
    <View style={styles.root}>
      {/* ── Map Hero ── */}
      <View style={styles.mapWrap}>
        {isValidCenter && (
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFill}
            initialRegion={region}
            showsUserLocation={true}
            userInterfaceStyle="dark"
            onMapReady={() => setIsMapReady(true)}
          >
            {mapSettled && (
              <>
                <Circle 
                  center={center} 
                  radius={searchRadius} 
                  strokeColor={PRIMARY} 
                  strokeWidth={4} 
                  fillColor={MAP_CIRCLE} 
                />
                
                {uniqueNearbyUsers.map((u) => {
                  if (!u.coords) return null;
                  return (
                    <UserMarker 
                      key={`user-${u.uid}`} 
                      user={u} 
                      isMe={u.uid === user?.uid}
                    />
                  );
                })}
              </>
            )}
          </MapView>
        )}

        {/* Gradient fade at bottom of map */}
        <LinearGradient
          colors={['transparent', 'rgba(10,0,16,0.6)', DARK_BG]}
          style={styles.mapFade}
          pointerEvents="none"
        />

        {/* Top chrome */}
        <View style={[styles.mapChrome, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={onSkip} style={styles.closeBtn}>
            <X color={DARK_TEXT} size={18} strokeWidth={2.5} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onRestore} style={styles.restoreBtn}>
            <Text style={styles.restoreText}>Restore</Text>
          </TouchableOpacity>
        </View>

        {/* ── Location Header ── */}
        {isMapReady && (
          <View style={styles.locationHeader}>
            <View style={styles.locationBadge}>
              <MapPin size={14} color={PRIMARY} style={{ marginRight: 8 }} />
              <Text style={styles.locationText} numberOfLines={1}>
                {locationLabel === 'Detecting location…' ? 'Pune, India' : locationLabel}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* ── Bottom Sheet ── */}
      <View style={styles.sheet}>
        {/* Header */}
        <Text style={styles.title}>Unlock SkillSwap</Text>
        <Text style={styles.subtitle}>Connect with your city. Swap skills. Grow together.</Text>

        {/* Feature chips */}
        <View style={styles.featuresRow}>
          {features.map((f, i) => (
            <View key={i} style={styles.featureCard}>
              <LinearGradient
                colors={['rgba(255,26,92,0.18)', 'rgba(255,26,92,0.06)']}
                style={styles.featureIcon}
              >
                {f.icon}
              </LinearGradient>
              <Text style={styles.featureLabel}>{f.label}</Text>
            </View>
          ))}
        </View>

        {/* Credit packs */}
        <View style={styles.cardsRow}>
          {CREDIT_PACKS.map((pack, i) => {
            const selected = i === selectedIdx;
            return (
              <TouchableOpacity
                key={pack.id}
                style={[styles.card, selected && styles.cardSelected]}
                onPress={() => setSelectedIdx(i)}
                activeOpacity={0.85}
              >
                {pack.popular && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularText}>POPULAR</Text>
                  </View>
                )}
                <View style={styles.creditBadge}>
                  <Text style={styles.creditBadgeText}>{pack.badge}</Text>
                </View>
                <Text style={[styles.packLabel, selected && styles.packLabelSelected]}>{pack.label}</Text>
                <Text style={[styles.packPrice, selected && styles.packPriceSelected]}>₹{pack.inr}</Text>
                <Text style={styles.packSub}>{pack.credits} credits</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Trust line */}
        <Text style={styles.trust}>🔒 Secure payment · Cancel anytime</Text>

        {/* CTA */}
        <TouchableOpacity
          style={[styles.cta, purchasing && styles.ctaDisabled]}
          onPress={onPurchase}
          disabled={purchasing}
          activeOpacity={0.88}
        >
          <LinearGradient
            colors={['#ff4d7a', PRIMARY, '#cc0044']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGradient}
          >
            {purchasing
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.ctaText}>Get Premium ✦</Text>
            }
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={onSkip} style={styles.skipBtn}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 8 }]}>
          <TouchableOpacity onPress={() => openUrl(extra.paywallPrivacyUrl)}>
            <Text style={styles.link}>Privacy</Text>
          </TouchableOpacity>
          <Text style={styles.footerDot}>·</Text>
          <TouchableOpacity onPress={() => openUrl(extra.paywallTermsUrl)}>
            <Text style={styles.link}>Terms</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DARK_BG },

  // Map
  mapWrap: { height: '38%', minHeight: 240 },
  mapFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 80 },
  mapChrome: {
    position: 'absolute', left: 0, right: 0, top: 0,
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 16, zIndex: 10,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  restoreBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  restoreText: { color: DARK_TEXT, fontSize: 13, fontWeight: '600' },
  locationHeader: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 60, // Raised slightly to clear sheet transition
    width: '100%',
    alignItems: 'center',
    zIndex: 99,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: PRIMARY,
    backgroundColor: 'rgba(10,0,16,0.92)', // More opaque for better readability
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  locationText: { color: DARK_TEXT, fontSize: 15, fontWeight: '900', letterSpacing: 0.3 },
  markerDot: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: PRIMARY,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.8, shadowRadius: 8, elevation: 8,
  },

  // Sheet
  sheet: {
    flex: 1, backgroundColor: DARK_BG,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    marginTop: -28, paddingHorizontal: 20, paddingTop: 28,
    borderTopWidth: 1, borderTopColor: 'rgba(255,26,92,0.2)',
  },
  title: {
    fontSize: 28, fontWeight: '900', color: DARK_TEXT,
    textAlign: 'center', letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14, color: DARK_TEXT_MUTED, textAlign: 'center',
    marginTop: 6, marginBottom: 20, lineHeight: 20,
  },

  // Features
  featuresRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  featureCard: { flex: 1, alignItems: 'center', gap: 8, marginHorizontal: 3 },
  featureIcon: {
    width: 52, height: 52, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,26,92,0.3)',
  },
  featureLabel: {
    color: DARK_TEXT, fontSize: 10, fontWeight: '700',
    textAlign: 'center', lineHeight: 14,
  },

  // Cards
  cardsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  card: {
    flex: 1, borderRadius: 18, borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 10, paddingTop: 22, alignItems: 'center', minHeight: 130,
  },
  cardSelected: {
    borderColor: PRIMARY,
    backgroundColor: 'rgba(255,26,92,0.1)',
  },
  popularBadge: {
    position: 'absolute', top: -10, alignSelf: 'center',
    backgroundColor: PRIMARY, paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 8, zIndex: 5,
  },
  popularText: { fontSize: 8, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
  creditBadge: {
    backgroundColor: 'rgba(255,26,92,0.2)', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 3, marginBottom: 6,
    borderWidth: 1, borderColor: 'rgba(255,26,92,0.4)',
  },
  creditBadgeText: { fontSize: 11, fontWeight: '900', color: PRIMARY },
  packLabel: { fontSize: 12, color: DARK_TEXT_MUTED, fontWeight: '700', marginBottom: 4 },
  packLabelSelected: { color: DARK_TEXT },
  packPrice: { fontSize: 22, color: DARK_TEXT, fontWeight: '900', letterSpacing: -0.5 },
  packPriceSelected: { color: PRIMARY },
  packSub: { fontSize: 10, color: DARK_TEXT_MUTED, marginTop: 3 },

  // Trust
  trust: { fontSize: 12, color: DARK_TEXT_MUTED, textAlign: 'center', marginBottom: 16 },

  // CTA
  cta: { borderRadius: 18, overflow: 'hidden', marginBottom: 14, elevation: 12, shadowColor: PRIMARY, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 16 },
  ctaDisabled: { opacity: 0.5 },
  ctaGradient: { paddingVertical: 18, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },

  // Skip / Footer
  skipBtn: { alignItems: 'center', paddingVertical: 10, marginBottom: 8 },
  skipText: { fontSize: 14, color: DARK_TEXT_MUTED, fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  footerDot: { color: DARK_TEXT_MUTED, fontSize: 12 },
  link: { fontSize: 12, color: DARK_TEXT_MUTED, textDecorationLine: 'underline' },
});
