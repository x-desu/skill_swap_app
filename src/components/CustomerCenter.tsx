import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, TextInput, Modal, Linking, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ArrowLeft, Zap, ArrowLeftRight, MessageSquare, Plus,
  ChevronRight, Trash2, Clock, CheckCircle, AlertCircle, HelpCircle,
} from 'lucide-react-native';
import {
  getFirestore, doc, getDoc, collection, query,
  where, orderBy, limit, getDocs, addDoc, deleteDoc,
  serverTimestamp, onSnapshot,
} from '@react-native-firebase/firestore';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';

const PRIMARY = '#ff1a5c';
const BG = '#0d0202';
const SURFACE = 'rgba(255,255,255,0.04)';
const BORDER = 'rgba(255,255,255,0.08)';
const TEXT = '#ffffff';
const MUTED = 'rgba(255,255,255,0.5)';

type TicketStatus = 'open' | 'in_progress' | 'resolved';

interface SupportTicket {
  id: string;
  subject: string;
  message: string;
  status: TicketStatus;
  createdAt: any;
  uid: string;
  userEmail?: string;
}

interface SwapSummary {
  id: string;
  targetName: string;
  status: string;
  createdAt: any;
}

const db = () => getFirestore();

async function getUserCredits(uid: string): Promise<number> {
  const snap = await getDoc(doc(db(), 'users', uid));
  return (snap.data()?.credits as number) ?? 0;
}

async function getSwapHistory(uid: string): Promise<SwapSummary[]> {
  try {
    const q = query(
      collection(db(), 'swapRequests'),
      where('participants', 'array-contains', uid),
      orderBy('createdAt', 'desc'),
      limit(10)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as SwapSummary));
  } catch { return []; }
}

async function getTickets(uid: string): Promise<SupportTicket[]> {
  try {
    const q = query(
      collection(db(), 'supportTickets'),
      where('uid', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as SupportTicket));
  } catch { return []; }
}

async function createTicket(uid: string, email: string, subject: string, message: string): Promise<void> {
  await addDoc(collection(db(), 'supportTickets'), {
    uid, userEmail: email, subject, message,
    status: 'open', createdAt: serverTimestamp(),
  });
}

async function deleteTicket(ticketId: string): Promise<void> {
  await deleteDoc(doc(db(), 'supportTickets', ticketId));
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: TicketStatus }) {
  const config = {
    open:        { color: '#fbbf24', bg: 'rgba(251,191,36,0.15)',  Icon: Clock,        label: 'Open' },
    in_progress: { color: '#60a5fa', bg: 'rgba(96,165,250,0.15)', Icon: AlertCircle,  label: 'In Progress' },
    resolved:    { color: '#34d399', bg: 'rgba(52,211,153,0.15)', Icon: CheckCircle,  label: 'Resolved' },
  }[status] ?? { color: MUTED, bg: SURFACE, Icon: HelpCircle, label: status };

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <config.Icon color={config.color} size={11} />
      <Text style={[styles.badgeText, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

function NewTicketModal({ visible, onClose, onSubmit }: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (subject: string, message: string) => Promise<void>;
}) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert('Missing info', 'Please fill in both subject and message.');
      return;
    }
    setLoading(true);
    try {
      await onSubmit(subject.trim(), message.trim());
      setSubject(''); setMessage('');
      onClose();
    } catch {
      Alert.alert('Error', 'Could not submit ticket. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.modalClose}>
            <ArrowLeft color={TEXT} size={20} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>New Support Ticket</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 16 }}>
          <View>
            <Text style={styles.fieldLabel}>Subject</Text>
            <TextInput
              style={styles.input}
              placeholder="What's the issue?"
              placeholderTextColor={MUTED}
              value={subject}
              onChangeText={setSubject}
              maxLength={100}
            />
          </View>
          <View>
            <Text style={styles.fieldLabel}>Message</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="Describe your issue in detail..."
              placeholderTextColor={MUTED}
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              maxLength={1000}
            />
            <Text style={styles.charCount}>{message.length}/1000</Text>
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, loading && { opacity: 0.5 }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.submitBtnText}>Submit Ticket</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export function CustomerCenter() {
  const insets = useSafeAreaInsets();
  const authUser  = useSelector((s: RootState) => s.auth.user);
  const profile   = useSelector((s: RootState) => s.profile.profile);

  const [credits, setCredits]           = useState<number | null>(null);
  const [swaps, setSwaps]               = useState<SwapSummary[]>([]);
  const [tickets, setTickets]           = useState<SupportTicket[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [activeTab, setActiveTab]       = useState<'overview' | 'tickets'>('overview');

  const uid   = authUser?.uid ?? '';
  const email = authUser?.email ?? '';

  const loadData = useCallback(async () => {
    if (!uid) return;
    try {
      const [c, s, t] = await Promise.all([
        getUserCredits(uid),
        getSwapHistory(uid),
        getTickets(uid),
      ]);
      setCredits(c);
      setSwaps(s);
      setTickets(t);
    } catch (e) {
      console.error('[CustomerCenter] Load error:', e);
    }
  }, [uid]);

  useEffect(() => {
    setLoading(true);
    loadData().finally(() => setLoading(false));

    // Real-time credits listener
    if (!uid) return;
    const unsub = onSnapshot(doc(db(), 'users', uid), (snap) => {
      if (snap.exists()) setCredits((snap.data()?.credits as number) ?? 0);
    });
    return unsub;
  }, [uid, loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleCreateTicket = async (subject: string, message: string) => {
    await createTicket(uid, email, subject, message);
    const updated = await getTickets(uid);
    setTickets(updated);
  };

  const handleDeleteTicket = (ticketId: string) => {
    Alert.alert('Delete Ticket', 'Are you sure you want to delete this ticket?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await deleteTicket(ticketId);
            setTickets((prev) => prev.filter((t) => t.id !== ticketId));
          } catch { Alert.alert('Error', 'Could not delete ticket.'); }
        },
      },
    ]);
  };

  const formatDate = (ts: any): string => {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={PRIMARY} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color={TEXT} size={20} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Account</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {(['overview', 'tickets'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'overview' ? 'Overview' : `Support${tickets.length ? ` (${tickets.length})` : ''}`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} colors={[PRIMARY]} />}
      >
        {activeTab === 'overview' ? (
          <>
            {/* Credits Card */}
            <View style={styles.creditsCard}>
              <View style={styles.creditsLeft}>
                <Text style={styles.creditsLabel}>Credits Balance</Text>
                <Text style={styles.creditsValue}>{credits ?? '—'}</Text>
                <Text style={styles.creditsSub}>Used to connect & swap skills</Text>
              </View>
              <View style={styles.creditsIcon}>
                <Zap color={PRIMARY} size={28} />
              </View>
            </View>

            <TouchableOpacity
              style={styles.topUpBtn}
              onPress={() => router.push('/paywall')}
            >
              <Plus color="#fff" size={16} />
              <Text style={styles.topUpText}>Top Up Credits</Text>
            </TouchableOpacity>

            {/* User Info */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Account Info</Text>
              <View style={styles.card}>
                {[
                  { label: 'Name',  value: profile?.displayName || authUser?.displayName || '—' },
                  { label: 'Email', value: email || '—' },
                  { label: 'Member since', value: formatDate(profile?.createdAt) },
                  { label: 'Completed swaps', value: String(profile?.completedSwaps ?? 0) },
                ].map((row, i, arr) => (
                  <View key={row.label} style={[styles.infoRow, i < arr.length - 1 && styles.infoRowBorder]}>
                    <Text style={styles.infoLabel}>{row.label}</Text>
                    <Text style={styles.infoValue} numberOfLines={1}>{row.value}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Swap History */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent Swaps</Text>
              {swaps.length === 0 ? (
                <View style={styles.emptyCard}>
                  <ArrowLeftRight color={MUTED} size={28} />
                  <Text style={styles.emptyText}>No swaps yet</Text>
                </View>
              ) : (
                <View style={styles.card}>
                  {swaps.map((swap, i) => (
                    <View key={swap.id} style={[styles.swapRow, i < swaps.length - 1 && styles.infoRowBorder]}>
                      <View style={styles.swapIconWrap}>
                        <ArrowLeftRight color={PRIMARY} size={16} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.swapName} numberOfLines={1}>{swap.targetName || 'Swap'}</Text>
                        <Text style={styles.swapDate}>{formatDate(swap.createdAt)}</Text>
                      </View>
                      <View style={[styles.swapStatusBadge, { backgroundColor: swap.status === 'accepted' ? 'rgba(52,211,153,0.15)' : 'rgba(251,191,36,0.12)' }]}>
                        <Text style={[styles.swapStatusText, { color: swap.status === 'accepted' ? '#34d399' : '#fbbf24' }]}>{swap.status}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Quick links */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Help</Text>
              <View style={styles.card}>
                {[
                  { label: 'Contact Support', sub: 'Email us directly', onPress: () => Linking.openURL('mailto:support@skillswap.app') },
                  { label: 'Help Center', sub: 'FAQs and guides', onPress: () => Linking.openURL('https://skillswap.app/help') },
                ].map((item, i) => (
                  <TouchableOpacity key={item.label} style={[styles.linkRow, i === 0 && styles.infoRowBorder]} onPress={item.onPress}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.linkLabel}>{item.label}</Text>
                      <Text style={styles.swapDate}>{item.sub}</Text>
                    </View>
                    <ChevronRight color={MUTED} size={18} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        ) : (
          <>
            {/* New Ticket Button */}
            <TouchableOpacity style={styles.newTicketBtn} onPress={() => setShowNewTicket(true)}>
              <Plus color="#fff" size={18} />
              <Text style={styles.newTicketText}>New Support Ticket</Text>
            </TouchableOpacity>

            {/* Tickets List */}
            {tickets.length === 0 ? (
              <View style={styles.emptyCard}>
                <MessageSquare color={MUTED} size={28} />
                <Text style={styles.emptyText}>No tickets yet</Text>
                <Text style={styles.emptySub}>Submit a ticket if you need help</Text>
              </View>
            ) : (
              tickets.map((ticket) => (
                <View key={ticket.id} style={styles.ticketCard}>
                  <View style={styles.ticketHeader}>
                    <Text style={styles.ticketSubject} numberOfLines={1}>{ticket.subject}</Text>
                    <StatusBadge status={ticket.status} />
                  </View>
                  <Text style={styles.ticketMessage} numberOfLines={3}>{ticket.message}</Text>
                  <View style={styles.ticketFooter}>
                    <Text style={styles.ticketDate}>{formatDate(ticket.createdAt)}</Text>
                    {ticket.status === 'open' && (
                      <TouchableOpacity onPress={() => handleDeleteTicket(ticket.id)} style={styles.deleteBtn}>
                        <Trash2 color="#ef4444" size={16} />
                        <Text style={styles.deleteText}>Delete</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>

      <NewTicketModal
        visible={showNewTicket}
        onClose={() => setShowNewTicket(false)}
        onSubmit={handleCreateTicket}
      />
    </View>
  );
}

export default function CustomerCenterScreen() {
  return <CustomerCenter />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: SURFACE, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: BORDER },
  headerTitle: { fontSize: 18, fontWeight: '800', color: TEXT },

  // Tabs
  tabRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 8, backgroundColor: SURFACE, borderRadius: 12, padding: 3, borderWidth: 1, borderColor: BORDER },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: PRIMARY },
  tabText: { fontSize: 13, fontWeight: '600', color: MUTED },
  tabTextActive: { color: '#fff' },

  // Credits
  creditsCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,26,92,0.1)', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(255,26,92,0.25)', marginBottom: 10 },
  creditsLeft: { gap: 2 },
  creditsLabel: { fontSize: 12, color: MUTED, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  creditsValue: { fontSize: 48, fontWeight: '900', color: TEXT, lineHeight: 56 },
  creditsSub: { fontSize: 12, color: MUTED },
  creditsIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,26,92,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,26,92,0.3)' },

  topUpBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: PRIMARY, borderRadius: 14, paddingVertical: 14, marginBottom: 24, elevation: 6, shadowColor: PRIMARY, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12 },
  topUpText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Sections
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  card: { backgroundColor: SURFACE, borderRadius: 16, borderWidth: 1, borderColor: BORDER, overflow: 'hidden' },

  // Info rows
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: BORDER },
  infoLabel: { fontSize: 13, color: MUTED, fontWeight: '500' },
  infoValue: { fontSize: 13, color: TEXT, fontWeight: '600', maxWidth: '60%', textAlign: 'right' },

  // Swap rows
  swapRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  swapIconWrap: { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,26,92,0.12)', alignItems: 'center', justifyContent: 'center' },
  swapName: { fontSize: 14, color: TEXT, fontWeight: '600' },
  swapDate: { fontSize: 11, color: MUTED, marginTop: 2 },
  swapStatusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  swapStatusText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },

  // Link rows
  linkRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  linkLabel: { fontSize: 14, color: TEXT, fontWeight: '600' },

  // Empty
  emptyCard: { alignItems: 'center', paddingVertical: 40, gap: 10, backgroundColor: SURFACE, borderRadius: 16, borderWidth: 1, borderColor: BORDER },
  emptyText: { fontSize: 15, color: MUTED, fontWeight: '600' },
  emptySub: { fontSize: 12, color: MUTED },

  // Tickets
  newTicketBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: PRIMARY, borderRadius: 14, paddingVertical: 14, marginBottom: 16, elevation: 6, shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8 },
  newTicketText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  ticketCard: { backgroundColor: SURFACE, borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 16, marginBottom: 12 },
  ticketHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 8 },
  ticketSubject: { fontSize: 15, fontWeight: '700', color: TEXT, flex: 1 },
  ticketMessage: { fontSize: 13, color: MUTED, lineHeight: 19, marginBottom: 12 },
  ticketFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ticketDate: { fontSize: 11, color: MUTED },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' },
  deleteText: { fontSize: 12, color: '#ef4444', fontWeight: '600' },

  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: '700' },

  // Modal
  modalRoot: { flex: 1, backgroundColor: BG },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: BORDER },
  modalClose: { width: 36, height: 36, borderRadius: 18, backgroundColor: SURFACE, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontSize: 17, fontWeight: '800', color: TEXT },

  fieldLabel: { fontSize: 12, color: MUTED, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  input: { backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: TEXT, fontSize: 15 },
  inputMultiline: { height: 140, paddingTop: 12 },
  charCount: { fontSize: 11, color: MUTED, textAlign: 'right', marginTop: 4 },

  submitBtn: { backgroundColor: PRIMARY, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
