import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootState } from '../../src/store';
import { useMatches } from '../../src/hooks/useMatches';
import UserAvatar from '../../src/components/UserAvatar';
import type { MatchDocument } from '../../src/types/user';

const COLORS = {
  rosePrimary: '#ff1a5c',
  bgBase: '#0d0202',
  bgCard: 'rgba(255, 26, 92, 0.05)',
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255, 255, 255, 0.6)',
  borderLight: 'rgba(255, 255, 255, 0.08)',
};

export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const authUser = useSelector((state: RootState) => state.auth.user);
  const { matches, loading, error } = useMatches(authUser?.uid || null);

  const handlePressMatch = (match: MatchDocument) => {
    if (!authUser) return;
    
    // Find the other user's UID (the one that isn't ours)
    const targetUid = match.users.find(uid => uid !== authUser.uid);
    if (!targetUid) return;

    // Route to chat room
    // For MVP, we pass targetName as Unknown since we don't denormalize names yet.
    // In a production app, we would denormalize the targetName into the match document,
    // or fetch it. We will just pass the UID and let the [id].tsx screen handle name fetching if needed.
    router.push({
      pathname: '/chat/[id]',
      params: { id: match.id, targetUid },
    });
  };

  const renderMatch = ({ item }: { item: MatchDocument }) => {
    // Determine the "other" user ID
    const otherUid = item.users.find(uid => uid !== authUser?.uid);

    return (
      <TouchableOpacity
        style={styles.chatRow}
        onPress={() => handlePressMatch(item)}
        activeOpacity={0.7}
      >
        <UserAvatar
          uid={otherUid || 'unknown'}
          displayName={otherUid || 'User'}
          photoURL={null} // We rely on UserAvatar's fallback or fetch via Redux if implemented
          size={56}
        />
        <View style={styles.chatContent}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatName}>Match ({otherUid?.slice(0, 4)}...)</Text>
            {item.lastMessageTime && (
              <Text style={styles.chatTime}>
                {new Date(item.lastMessageTime.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            )}
          </View>
          <Text style={styles.chatMessage} numberOfLines={1}>
            {item.lastMessage || 'New Match! Say hello.'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.rosePrimary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.headerTitle}>Messages</Text>
      
      {matches.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>💬</Text>
          <Text style={styles.emptyTitle}>No messages yet</Text>
          <Text style={styles.emptySubtext}>Swipe right on people to get matches!</Text>
        </View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(item) => item.id}
          renderItem={renderMatch}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgBase,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'Inter',
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 24,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  chatContent: {
    flex: 1,
    marginLeft: 14,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  chatTime: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  chatMessage: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginLeft: 70, // Align with text
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyEmoji: {
    fontSize: 54,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
