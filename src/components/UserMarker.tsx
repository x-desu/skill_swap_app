import React from 'react';
import { View, StyleSheet, Image, Text } from 'react-native';
import { Marker, Callout } from 'react-native-maps';
import { UserDocument } from '../types/user';

interface UserMarkerProps {
  user: UserDocument;
  onPress?: () => void;
  distanceLabel?: string;
  isMe?: boolean;
}

const PRIMARY = '#ff1a5c';
const USER_BLUE = '#007AFF'; // iOS blue for "Me"

// Simple deterministic hash for coordinate jitter
const getJitter = (uid: string) => {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = ((hash << 5) - hash) + uid.charCodeAt(i);
    hash |= 0;
  }
  // Offset by up to ~200 meters (0.00004deg ~ 4.5m * 44 ~ 200m)
  return ((Math.abs(hash) % 100) - 50) * 0.00004;
};

export const UserMarker = ({ user, isMe }: UserMarkerProps) => {
  if (!user.coords) return null;

  const baseLat = Number(user.coords.latitude);
  const baseLng = Number(user.coords.longitude);

  if (isNaN(baseLat) || isNaN(baseLng)) return null;

  // Apply deterministic jitter so overlapping markers are visible
  const latitude = baseLat + getJitter(user.uid + 'lat');
  const longitude = baseLng + getJitter(user.uid + 'lng');

  const markerColor = isMe ? USER_BLUE : PRIMARY;

  return (
    <Marker 
      coordinate={{ latitude, longitude }}
      tracksViewChanges={false}
      zIndex={isMe ? 100 : 1}
    >
      <View style={styles.container}>
        <View style={[styles.pinCircle, { backgroundColor: markerColor }]}>
          <View style={styles.avatarContainer}>
            {user.photoURL ? (
              <Image source={{ uri: user.photoURL }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: '#ccc', alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#fff' }}>
                  {user.displayName?.charAt(0) || '?'}
                </Text>
              </View>
            )}
          </View>
        </View>
        <View style={[styles.pinPoint, { backgroundColor: markerColor }]} />
        {isMe && (
          <View style={styles.meLabel}>
            <Text style={styles.meText}>You</Text>
          </View>
        )}
      </View>
    </Marker>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 70,
  },
  staticPulse: {
    position: 'absolute',
    bottom: 22,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,26,92,0.3)',
  },
  pinContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PRIMARY,
    padding: 2,
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  avatarContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  pinPoint: {
    width: 14,
    height: 14,
    backgroundColor: PRIMARY,
    transform: [{ rotate: '45deg' }],
    marginTop: -8,
    zIndex: 1,
  },
  callout: {
    backgroundColor: 'rgba(0,0,0,0.9)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PRIMARY,
    minWidth: 100,
    alignItems: 'center',
  },
  name: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  calloutDistance: {
    color: PRIMARY,
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  distancePill: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  distanceText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  meLabel: {
    backgroundColor: USER_BLUE,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  meText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
});
