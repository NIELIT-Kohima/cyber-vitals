import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../constants';

const STATUS_PAD = Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0;

const StatCard = ({ title, value, subtitle, color, badge }) => (
    <View style={[styles.statCard, { backgroundColor: color }]}>
        <View style={styles.statCircleLg} />
        <View style={styles.statCircleSm} />
        <View style={styles.statBadge}>
            <Text style={styles.statBadgeText}>{badge}</Text>
        </View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
        {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
);

// Vertical tile: icon on top, text below (used in the 2x2 grid)
const GridCard = ({ title, description, icon, onPress, color = COLORS.primary }) => (
    <TouchableOpacity activeOpacity={0.85} style={styles.gridCard} onPress={onPress}>
        <View style={[styles.gridIcon, { backgroundColor: color + '1F' }]}>
            <Text style={styles.gridIconText}>{icon}</Text>
        </View>
        <Text style={styles.gridTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.gridDescription} numberOfLines={2}>{description}</Text>
    </TouchableOpacity>
);

// Horizontal row card
const NavCard = ({ title, description, icon, onPress, color = COLORS.primary }) => (
    <TouchableOpacity activeOpacity={0.85} style={styles.navCard} onPress={onPress}>
        <View style={[styles.iconContainer, { backgroundColor: color + '1A' }]}>
            <Text style={[styles.iconText, { color }]}>{icon}</Text>
        </View>
        <View style={styles.navContent}>
            <Text style={styles.navTitle}>{title}</Text>
            <Text style={styles.navDescription}>{description}</Text>
        </View>
        <View style={styles.chevron} />
    </TouchableOpacity>
);

export default function Dashboard({ navigation }) {
    return (
        <View style={styles.root}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

                {/* Stats Section */}
                <Text style={styles.sectionTitle}>Overview</Text>
                <View style={styles.statsContainer}>
                    <StatCard title="Apps Scanned" value="388" subtitle="Last scanned today" badge="SCANNED" color={COLORS.accent} />
                    <StatCard title="Threats Found" value="0" subtitle="Device is secure" badge="SAFE" color={COLORS.primary} />
                </View>

                {/* Quick tools grid */}
                <Text style={styles.sectionTitle}>Diagnostic Tools</Text>
                <View style={styles.grid}>
                    <GridCard
                        title="Access Control"
                        description="Review app permissions"
                        icon="🔐"
                        color={COLORS.primary}
                        onPress={() => navigation.navigate('AccessList')}
                    />
                    <GridCard
                        title="Session Logs"
                        description="Track activity and usage"
                        icon="⏱️"
                        color={COLORS.accent}
                        onPress={() => navigation.navigate('TrackingList')}
                    />
                    <GridCard
                        title="Source Screening"
                        description="Check install sources"
                        icon="📦"
                        color="#8B5CF6"
                        onPress={() => navigation.navigate('SourceList')}
                    />
                    <GridCard
                        title="Malware Scanner"
                        description="Detect malicious packages"
                        icon="🦠"
                        color={COLORS.danger}
                        onPress={() => navigation.navigate('Malware')}
                    />
                </View>

                <Text style={styles.sectionTitle}>More Protection</Text>

                <NavCard
                    title="Notification Security"
                    description="Monitor notifications for phishing/spam"
                    icon="🔔"
                    color="#F59E0B"
                    onPress={() => navigation.navigate('Notifications')}
                />

                <NavCard
                    title="Network Security"
                    description="Monitor network activity and open ports"
                    icon="🌐"
                    color="#3B82F6"
                    onPress={() => navigation.navigate('Network')}
                />

                <NavCard
                    title="Content Buster"
                    description="Detect AI-generated phishing texts"
                    icon="🤖"
                    color="#EC4899"
                    onPress={() => navigation.navigate('AiContentBuster')}
                />

                <View style={styles.footerSpace} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: COLORS.bg },
    header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 },
    headerTitle: { color: COLORS.primary, fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
    headerAccent: { color: COLORS.accent },
    headerSubtitle: { color: COLORS.textDim, fontSize: 14, marginTop: 4, fontWeight: '500' },
    content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 25 },
    sectionTitle: { color: COLORS.text, fontSize: 18, fontWeight: '700', marginBottom: 12, marginTop: 8, letterSpacing: -0.2 },

    statsContainer: { flexDirection: 'row', gap: 12, marginBottom: 20 },
    statCard: { flex: 1, borderRadius: 22, padding: 18, overflow: 'hidden', minHeight: 150, justifyContent: 'flex-end' },
    statCircleLg: { position: 'absolute', top: -34, right: -34, width: 110, height: 110, borderRadius: 55, backgroundColor: 'rgba(255,255,255,0.16)' },
    statCircleSm: { position: 'absolute', top: 38, right: 18, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.12)' },
    statBadge: { position: 'absolute', top: 14, left: 14, backgroundColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    statBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
    statValue: { color: '#fff', fontSize: 40, fontWeight: '800', letterSpacing: -1, lineHeight: 46 },
    statTitle: { color: '#fff', fontSize: 14, fontWeight: '700', marginTop: 2 },
    statSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 11.5, marginTop: 2 },

    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 8 },
    gridCard: { width: '48%', backgroundColor: COLORS.surface, borderRadius: 20, padding: 16, paddingBottom: 0, marginBottom: 12, borderWidth: 1, borderColor: '#EAEAEA' },
    gridIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
    gridIconText: { fontSize: 26 },
    gridTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
    gridDescription: { color: COLORS.textDim, fontSize: 12, lineHeight: 17, minHeight: 34 },

    navCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 20, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#EAEAEA' },
    iconContainer: { width: 50, height: 50, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
    iconText: { fontSize: 24 },
    navContent: { flex: 1, marginLeft: 14 },
    navTitle: { color: COLORS.text, fontSize: 15.5, fontWeight: '700' },
    navDescription: { color: COLORS.textDim, fontSize: 12.5, lineHeight: 17 },
    chevron: { width: 9, height: 9, borderTopWidth: 2, borderRightWidth: 2, borderColor: COLORS.textDim, transform: [{ rotate: '45deg' }], marginRight: 6, marginLeft: 8 },
    footerSpace: { height: 110 }
});
