import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, Alert } from 'react-native';
import { ChevronLeft, MoreVertical, Phone, Video } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ChatHeaderProps {
  name: string;
  avatar?: string;
  isOnline?: boolean;
  statusText?: string;
  onViewProfile?: () => void;
}

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  name,
  avatar,
  isOnline = false,
  statusText,
  onViewProfile,
}) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleCallPress = () => {
    Alert.alert(
      '📞 Voice Call',
      `Voice calling with ${name} is coming soon!`,
      [{ text: 'OK', style: 'default' }]
    );
  };

  const handleVideoPress = () => {
    Alert.alert(
      '📹 Video Call',
      `Video calling with ${name} is coming soon!`,
      [{ text: 'OK', style: 'default' }]
    );
  };

  const handleMorePress = () => {
    Alert.alert(
      name,
      'Choose an action',
      [
        {
          text: 'View Profile',
          onPress: onViewProfile,
        },
        {
          text: 'Mute Notifications',
          onPress: () => Alert.alert('Muted', `Notifications for ${name} have been muted.`),
        },
        {
          text: 'Block User',
          style: 'destructive',
          onPress: () =>
            Alert.alert(
              'Block User',
              `Are you sure you want to block ${name}?`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Block',
                  style: 'destructive',
                  onPress: () => Alert.alert('Blocked', `${name} has been blocked.`),
                },
              ]
            ),
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        {/* Back button */}
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft color="#fff" size={28} />
        </TouchableOpacity>

        {/* User info — tappable to view profile */}
        <TouchableOpacity
          style={styles.userInfo}
          onPress={onViewProfile}
          activeOpacity={0.7}
        >
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarText}>{getInitials(name)}</Text>
            </View>
          )}
          {isOnline && <View style={styles.onlineDot} />}
          <View style={styles.nameContainer}>
            <Text style={styles.nameText} numberOfLines={1}>
              {name}
            </Text>
            <Text style={[styles.statusText, isOnline && styles.onlineText]}>
              {isOnline ? 'Active now' : statusText || 'Offline'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity onPress={handleCallPress} style={styles.actionButton}>
            <Phone color="#fff" size={20} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleVideoPress} style={styles.actionButton}>
            <Video color="#fff" size={22} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleMorePress} style={styles.actionButton}>
            <MoreVertical color="#fff" size={22} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0d0202',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  content: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  backButton: {
    padding: 4,
    marginRight: 4,
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarFallback: {
    backgroundColor: '#ff1a5c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  onlineDot: {
    position: 'absolute',
    left: 30,
    bottom: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#34d399',
    borderWidth: 2,
    borderColor: '#0d0202',
  },
  nameContainer: {
    flex: 1,
  },
  nameText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  statusText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    marginTop: 1,
  },
  onlineText: {
    color: '#34d399',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionButton: {
    padding: 8,
  },
});
