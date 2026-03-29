import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import Animated, { FadeIn, Layout } from 'react-native-reanimated';
import { MessageCircle, HeartHandshake } from 'lucide-react-native';

import { useMatches } from '../../src/hooks/useMatches';
import { useLikes } from '../../src/hooks/useLikes';
import { useMatchUserProfiles } from '../../src/hooks/useMatchUserProfiles';
import UserAvatar from '../../src/components/UserAvatar';
import { likeUser } from '../../src/services/matchingService';
import type { LikeDocument, MatchDocument } from '../../src/types/user';
import type { RootState } from '../../src/store';

const COLORS = {
  rosePrimary: '#ff1a5c',
  bgBase: '#0d0202',
  bgCard: 'rgba(255, 26, 92, 0.05)',
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255, 255, 255, 0.6)',
  borderLight: 'rgba(255, 255, 255, 0.08)',
  success: '#34d399',
  danger: '#ff4d4d',
};

type TabType = 'requests' | 'matches';

export default function MatchesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const authUser = useSelector((state: RootState) => state.auth.user);
  
  const [activeTab, setActiveTab] = useState<TabType>('requests');

  const { pendingIncoming, pendingOutgoing, isLoading: isLoadingLikes } = useLikes(authUser?.uid);
  const { matches, loading: isLoadingMatches } = useMatches(authUser?.uid || null);
  
  const allLikedUids = [...pendingIncoming.map(l => l.fromUid), ...pendingOutgoing.map(l => l.toUid)];
  const matchedUserUids = matches
    .map(m => m.users.find(uid => uid !== authUser?.uid))
    .filter((uid): uid is string => !!uid);
  
  const allUids = [...new Set([...allLikedUids, ...matchedUserUids])];
  const { profiles: userProfiles } = useMatchUserProfiles(allUids);

  const handleLikeBack = async (fromUid: string) => {
    try {
      const newMatch = await likeUser(authUser!.uid, fromUid);
      if (newMatch) {
        Alert.alert('🎉 It\'s a Match!', 'You both liked each other! Start chatting now.');
      }
    } catch (e) {
      Alert.alert('Error', 'Could not like back. Please try again.');
    }
  };

  const handlePressMatch = (match: MatchDocument) => {
    if (!authUser) return;
    const targetUid = match.users.find(uid => uid !== authUser.uid);
    if (!targetUid) return;
    
    const profile = userProfiles.get(targetUid);
    
    router.push({
      pathname: '/chat/[id]',
      params: { 
        id: match.id, 
        targetUid,
        name: profile?.displayName || '',
        photoURL: profile?.photoURL || ''
      },
    });
  };

  const renderIncoming = ({ item }: { item: LikeDocument }) => {
    const profile = userProfiles.get(item.fromUid);
    const displayName = profile?.displayName || `User ${item.fromUid.slice(0, 4)}...`;
    
    return (
      <Animated.View entering={FadeIn} layout={Layout.springify()} style={styles.card}>
        <View style={styles.cardRow}>
          <UserAvatar uid={item.fromUid} displayName={displayName} photoURL={profile?.photoURL} size={48} />
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>{displayName}</Text>
            <Text style={styles.cardSubtext}>Liked your profile! Like back to match.</Text>
          </View>
        </View>
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.btn, styles.btnAccept]} onPress={() => handleLikeBack(item.fromUid)}>
            <Text style={styles.btnText}>Like Back</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  const renderOutgoing = ({ item }: { item: LikeDocument }) => {
    const profile = userProfiles.get(item.toUid);
    const displayName = profile?.displayName || `User ${item.toUid.slice(0, 4)}...`;
    
    return (
      <Animated.View entering={FadeIn} layout={Layout.springify()} style={styles.card}>
        <View style={styles.cardRow}>
          <UserAvatar uid={item.toUid} displayName={displayName} photoURL={profile?.photoURL} size={48} />
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>{displayName}</Text>
            <Text style={styles.cardSubtext}>You liked them. Waiting for them to like you back...</Text>
          </View>
        </View>
      </Animated.View>
    );
  };

  const renderMatch = ({ item }: { item: MatchDocument }) => {
    const otherUid = item.users.find(uid => uid !== authUser?.uid);
    const profile = otherUid ? userProfiles.get(otherUid) : null;
    const displayName = profile?.displayName || `User ${otherUid?.slice(0, 4)}...`;
    const photoURL = profile?.photoURL || null;
    const unreadCount = authUser?.uid ? (item.unreadCount?.[authUser.uid] || 0) : 0;
    const hasUnread = unreadCount > 0;
    
    return (
      <TouchableOpacity style={styles.chatRow} onPress={() => handlePressMatch(item)} activeOpacity={0.7}>
        <View style={styles.avatarContainer}>
          <UserAvatar uid={otherUid || 'unknown'} displayName={displayName} photoURL={photoURL} size={56} />
          {hasUnread && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </View>
        <View style={styles.chatContent}>
          <View style={styles.chatHeader}>
            <Text style={[styles.chatName, hasUnread && styles.chatNameUnread]}>{displayName}</Text>
            {item.lastMessageTime && (
              <Text style={styles.chatTime}>
                {new Date(item.lastMessageTime.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            )}
          </View>
          <Text style={[styles.chatMessage, hasUnread && styles.chatMessageUnread]} numberOfLines={1}>
            {item.lastMessage || 'New Match! Say hello.'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.headerTitle}>Swaps</Text>

      <View style={styles.segmentContainer}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'requests' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('requests')}
        >
          <HeartHandshake size={18} color={activeTab === 'requests' ? '#fff' : COLORS.textSecondary} />
          <Text style={[styles.segmentText, activeTab === 'requests' && styles.segmentTextActive]}>Requests</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'matches' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('matches')}
        >
          <MessageCircle size={18} color={activeTab === 'matches' ? '#fff' : COLORS.textSecondary} />
          <Text style={[styles.segmentText, activeTab === 'matches' && styles.segmentTextActive]}>Messages</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1 }}>
        {activeTab === 'requests' ? (
          isLoadingLikes ? (
            <ActivityIndicator size="large" color={COLORS.rosePrimary} style={{ marginTop: 40 }} />
          ) : (
            <FlatList
              data={[...pendingIncoming, ...pendingOutgoing]}
              keyExtractor={item => item.id!}
              renderItem={(props) => {
                if (pendingIncoming.some(p => p.id === props.item.id)) return renderIncoming(props);
                return renderOutgoing(props);
              }}
              contentContainerStyle={styles.listContent}
            />
          )
        ) : (
          isLoadingMatches ? (
            <ActivityIndicator size="large" color={COLORS.rosePrimary} style={{ marginTop: 40 }} />
          ) : (
            <FlatList
              data={matches}
              keyExtractor={item => item.id}
              renderItem={renderMatch}
              contentContainerStyle={styles.listContent}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          )
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgBase },
  headerTitle: {
    fontFamily: 'Inter', fontSize: 28, fontWeight: '800',
    color: COLORS.textPrimary, marginHorizontal: 20, marginTop: 16, marginBottom: 16,
  },
  segmentContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  segmentBtnActive: {
    backgroundColor: 'rgba(255, 26, 92, 0.4)',
  },
  segmentText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: '#fff',
  },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  card: {
    backgroundColor: COLORS.bgCard, borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: COLORS.borderLight,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  cardInfo: { flex: 1, marginLeft: 12 },
  cardTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  cardSubtext: { color: COLORS.textSecondary, fontSize: 13 },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16, gap: 12 },
  btn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 },
  btnAccept: { backgroundColor: COLORS.rosePrimary },
  btnText: { color: COLORS.textPrimary, fontWeight: '600', fontSize: 14 },
  chatRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  avatarContainer: { position: 'relative' },
  unreadBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: COLORS.rosePrimary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  chatContent: { flex: 1, marginLeft: 14 },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  chatName: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '700' },
  chatNameUnread: { fontWeight: '800' },
  chatTime: { color: COLORS.textSecondary, fontSize: 12 },
  chatMessage: { color: COLORS.textSecondary, fontSize: 14, lineHeight: 20 },
  chatMessageUnread: { color: COLORS.textPrimary, fontWeight: '600' },
  separator: { height: 1, backgroundColor: COLORS.borderLight, marginLeft: 70 },
});
