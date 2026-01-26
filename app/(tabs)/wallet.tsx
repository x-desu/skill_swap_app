import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useStore } from '../../src/store/useStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Clock, TrendingUp, TrendingDown, Plus } from 'lucide-react-native';

export default function WalletScreen() {
    const { currentUser } = useStore();
    const insets = useSafeAreaInsets();

    return (
        <ScrollView style={[styles.container, { paddingTop: insets.top }]}>
            <Text style={styles.title}>Wallet</Text>

            <View style={styles.card}>
                <Text style={styles.cardLabel}>Available Balance</Text>
                <View style={styles.balanceRow}>
                    <Clock color="#fff" size={32} />
                    <Text style={styles.balance}>{currentUser.credits.toFixed(1)}</Text>
                    <Text style={styles.unit}>Credits</Text>
                </View>
                <Text style={styles.subText}>1 Credit ≈ 1 Hour of Service</Text>
            </View>

            <TouchableOpacity style={styles.addButton}>
                <Plus color="#fff" size={20} />
                <Text style={styles.addButtonText}>Buy More Credits</Text>
            </TouchableOpacity>

            <Text style={styles.sectionTitle}>History</Text>

            {/* Mock Transactions */}
            <View style={styles.transaction}>
                <View style={[styles.iconBox, { backgroundColor: '#E8F5E9' }]}>
                    <TrendingUp color="#4CD964" size={24} />
                </View>
                <View style={styles.transInfo}>
                    <Text style={styles.transTitle}>Gardening Help</Text>
                    <Text style={styles.transDate}>Yesterday</Text>
                </View>
                <Text style={styles.transAmountPositive}>+2.0</Text>
            </View>

            <View style={styles.transaction}>
                <View style={[styles.iconBox, { backgroundColor: '#FFEBEE' }]}>
                    <TrendingDown color="#FF5A5F" size={24} />
                </View>
                <View style={styles.transInfo}>
                    <Text style={styles.transTitle}>French Lesson</Text>
                    <Text style={styles.transDate}>Last Week</Text>
                </View>
                <Text style={styles.transAmountNegative}>-1.0</Text>
            </View>

            <View style={styles.transaction}>
                <View style={[styles.iconBox, { backgroundColor: '#E3F2FD' }]}>
                    <Plus color="#2196F3" size={24} />
                </View>
                <View style={styles.transInfo}>
                    <Text style={styles.transTitle}>Welcome Bonus</Text>
                    <Text style={styles.transDate}>Jan 20</Text>
                </View>
                <Text style={styles.transAmountPositive}>+3.0</Text>
            </View>

        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 20 },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 20,
        color: '#333'
    },
    card: {
        backgroundColor: '#333',
        borderRadius: 20,
        padding: 25,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
    },
    cardLabel: {
        color: '#aaa',
        fontSize: 14,
        fontWeight: '600',
        textTransform: 'uppercase',
        marginBottom: 10,
    },
    balanceRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 5,
    },
    balance: {
        color: '#fff',
        fontSize: 48,
        fontWeight: 'bold',
        marginHorizontal: 10,
    },
    unit: {
        color: '#aaa',
        fontSize: 18,
    },
    subText: {
        color: '#666',
        fontSize: 12,
    },
    addButton: {
        backgroundColor: '#FF5A5F',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 18,
        borderRadius: 15,
        marginBottom: 30,
    },
    addButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
        marginLeft: 8,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 15,
    },
    transaction: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        paddingVertical: 5,
    },
    iconBox: {
        width: 50,
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    transInfo: {
        flex: 1,
    },
    transTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    transDate: {
        fontSize: 12,
        color: '#999',
        marginTop: 2,
    },
    transAmountPositive: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#4CD964',
    },
    transAmountNegative: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
});
