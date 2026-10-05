import React, { useState } from 'react';
import {
    ActivityIndicator, BackHandler, FlatList, Image, Modal, Pressable, SafeAreaView, ScrollView,
    StatusBar, Platform, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants';
import { AccessListFunc, useAiScan, summarizePermissions, computeOverview, appsWithGroup } from './list-function';
import AccessDetails from './details';

const OVERVIEW_TONES = {
    location: { fg: '#2563EB', bg: '#E8F0FE' },
    contacts: { fg: '#7C3AED', bg: '#F1EAFE' },
    audio: { fg: '#EA580C', bg: '#FFEDE0' },
    sms: { fg: '#0891B2', bg: '#E0F6FA' },
    camera: { fg: '#DB2777', bg: '#FDE8F1' },
    storage: { fg: '#31bba1', bg: '#E6F7F4' },
};

export function Icon({ name, size = 20, color = COLORS.textDim, strokeWidth = 1.6 }) {
    const s = strokeWidth;
    const stroke = (style) => [{ position: 'absolute', borderColor: color, borderWidth: s, backgroundColor: 'transparent' }, style];
    const fill = (style) => [{ position: 'absolute', backgroundColor: color }, style];
    let inner = null;
    switch (name) {
        case 'chevron-right':
            inner = <View style={stroke({ width: size * 0.42, height: size * 0.42, borderLeftWidth: 0, borderBottomWidth: 0, transform: [{ rotate: '45deg' }], left: size * 0.24, top: size * 0.2 })} />;
            break;
        case 'close':
            inner = (
                <>
                    <View style={fill({ width: size * 0.7, height: s, borderRadius: s, transform: [{ rotate: '45deg' }], left: size * 0.15, top: size / 2 - s / 2 })} />
                    <View style={fill({ width: size * 0.7, height: s, borderRadius: s, transform: [{ rotate: '-45deg' }], left: size * 0.15, top: size / 2 - s / 2 })} />
                </>
            );
            break;
        case 'search':
            inner = (
                <>
                    <View style={stroke({ width: size * 0.62, height: size * 0.62, borderRadius: size * 0.31, left: size * 0.08, top: size * 0.08 })} />
                    <View style={fill({ width: size * 0.34, height: s, borderRadius: s, transform: [{ rotate: '45deg' }], left: size * 0.56, top: size * 0.62 })} />
                </>
            );
            break;
        case 'sparkle':
            inner = (
                <>
                    <View style={fill({ width: size * 0.46, height: size * 0.46, borderRadius: size * 0.08, transform: [{ rotate: '45deg' }], left: size * 0.27, top: size * 0.27 })} />
                    <View style={fill({ width: size * 0.2, height: size * 0.2, borderRadius: size * 0.05, transform: [{ rotate: '45deg' }], left: size * 0.62, top: size * 0.1 })} />
                    <View style={fill({ width: s * 2, height: s * 2, borderRadius: s, left: size * 0.16, top: size * 0.68 })} />
                </>
            );
            break;
        case 'alert':
            inner = (
                <>
                    <View style={stroke({ width: size * 0.86, height: size * 0.86, borderRadius: size * 0.43, left: size * 0.07, top: size * 0.07 })} />
                    <View style={fill({ width: s, height: size * 0.32, borderRadius: s, left: size / 2 - s / 2, top: size * 0.26 })} />
                    <View style={fill({ width: s * 1.6, height: s * 1.6, borderRadius: s, left: size / 2 - s * 0.8, top: size * 0.64 })} />
                </>
            );
            break;
        default:
            inner = null;
    }
    return <View pointerEvents="none" style={{ width: size, height: size }}>{inner}</View>;
}

const TILE_TONES = [
    { bg: COLORS.accentDim, fg: COLORS.accent },
    { bg: COLORS.warnDim, fg: COLORS.warn },
    { bg: COLORS.dangerDim, fg: COLORS.danger },
    { bg: COLORS.surfaceHigh, fg: COLORS.text },
];
const toneFor = (id) => {
    let hash = 0;
    for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
    return TILE_TONES[hash % TILE_TONES.length];
};

export function AppTile({ app, size = 55 }) {
    if (app?.icon) {
        return (
            <Image
                source={{ uri: `data:image/png;base64,${app.icon}` }}
                style={{ width: size, height: size, borderRadius: size * 0.26 }}
                resizeMode="cover"
            />
        );
    }
    const tone = toneFor(app.id);
    const initials = app.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
    return (
        <View style={{ width: size, height: size, borderRadius: size * 0.26, backgroundColor: tone.bg, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: tone.fg, fontSize: size * 0.34, fontWeight: '800' }}>{initials}</Text>
        </View>
    );
}

const AiBanner = ({ scanning, onScan }) => (
    <View style={styles.banner}>
        <View style={styles.bannerIcon}><Icon name="sparkle" size={20} color={COLORS.accent} /></View>
        <View style={styles.bannerText}>
            <Text style={styles.bannerTitle}>Let AI check your apps</Text>
            <Text style={styles.bannerDesc}>Scan your installed apps and flag any that have risky permissions.</Text>
        </View>
        <Pressable
            onPress={onScan}
            disabled={scanning}
            accessibilityRole="button"
            accessibilityLabel="Scan installed apps with AI"
            style={({ pressed }) => [styles.scanButton, (pressed || scanning) && styles.scanButtonPressed]}
        >
            {scanning ? (
                <View style={styles.scanningRow}>
                    <ActivityIndicator size="small" color={COLORS.onAccent} />
                    <Text style={styles.scanButtonText}>Scanning…</Text>
                </View>
            ) : (
                <Text style={styles.scanButtonText}>Start Scan</Text>
            )}
        </Pressable>
    </View>
);

const AppRow = ({ app, onPress }) => (
    <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Open permission details for ${app.name}`}
        android_ripple={{ color: COLORS.surfaceHigh }}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
        <AppTile app={app} />
        <View style={styles.rowBody}>
            <Text style={styles.rowName} numberOfLines={1}>{app.name}</Text>
            <Text style={styles.rowCount}>{app.permissions.length} permissions</Text>
            <Text style={styles.rowSummary} numberOfLines={1}>{summarizePermissions(app)}</Text>
        </View>
        <Icon name="chevron-right" size={18} />
    </Pressable>
);

const StateView = ({ icon, tone, title, subtitle, actionLabel, onAction }) => (
    <View style={styles.stateView}>
        {icon === 'spinner'
            ? <ActivityIndicator size="large" color={COLORS.accent} />
            : <Icon name={icon} size={26} color={tone === 'danger' ? COLORS.danger : COLORS.textDim} />}
        <Text style={styles.stateTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.stateSubtitle}>{subtitle}</Text>}
        {!!actionLabel && (
            <Pressable onPress={onAction} style={styles.stateButton} accessibilityRole="button">
                <Text style={styles.stateButtonText}>{actionLabel}</Text>
            </Pressable>
        )}
    </View>
);

const VerdictChip = ({ verdict }) => {
    const danger = verdict === 'MALICIOUS';
    return (
        <View style={[styles.chip, { backgroundColor: danger ? COLORS.dangerDim : COLORS.warnDim }]}>
            <Text style={[styles.chipText, { color: danger ? COLORS.danger : COLORS.warn }]}>{verdict}</Text>
        </View>
    );
};

const ScanModal = ({ scan, totalCount }) => {
    const [showCsv, setShowCsv] = useState(false);
    const failed = scan.phase === 'error';
    return (
        <Modal visible={scan.modalVisible} transparent animationType="fade" statusBarTranslucent onRequestClose={scan.dismiss}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalCard}>
                    <View style={styles.modalHeader}>
                        <View style={styles.modalHeading}>
                            <Text style={styles.modalTitle}>{failed ? 'Scan failed' : 'AI Scan Results'}</Text>
                            <Text style={styles.modalSubtitle}>
                                {failed ? 'The scan service could not be reached.' : `${scan.items.length} of ${totalCount} apps flagged · verdicts are permission-based only`}
                            </Text>
                        </View>
                        <Pressable onPress={scan.dismiss} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close scan results">
                            <Icon name="close" size={16} color={COLORS.textDim} />
                        </Pressable>
                    </View>

                    {failed ? (
                        <View style={styles.modalError}>
                            <Icon name="alert" size={24} color={COLORS.danger} />
                            <Text style={styles.modalErrorText}>{scan.error}</Text>
                            <View style={styles.modalErrorActions}>
                                <Pressable onPress={scan.scan} style={styles.retryButton} accessibilityRole="button">
                                    <Text style={styles.retryButtonText}>Retry</Text>
                                </Pressable>
                                <Pressable onPress={scan.dismiss} style={styles.dismissButton} accessibilityRole="button">
                                    <Text style={styles.dismissButtonText}>Dismiss</Text>
                                </Pressable>
                            </View>
                        </View>
                    ) : (
                        <ScrollView showsVerticalScrollIndicator={false} style={styles.modalList}>
                            {scan.items.map((item) => (
                                <View key={item.id} style={styles.flagCard}>
                                    <View style={styles.flagHead}>
                                        <Text style={styles.flagName} numberOfLines={1}>{item.name}</Text>
                                        <VerdictChip verdict={item.verdict} />
                                    </View>
                                    <Text style={styles.flagId}>{item.id}</Text>
                                    <Text style={styles.flagReason}>{item.reason}</Text>
                                </View>
                            ))}
                            <Pressable onPress={() => setShowCsv((v) => !v)} style={styles.csvToggle} accessibilityRole="button">
                                <View style={styles.csvToggleIcon}><Icon name="chevron-right" size={14} color={COLORS.accent} /></View>
                                <Text style={styles.csvToggleText}>{showCsv ? 'Hide CSV payload' : 'View CSV payload'}</Text>
                            </Pressable>
                            {showCsv && (
                                <ScrollView horizontal style={styles.csvBox}>
                                    <Text selectable style={styles.csvText}>{scan.csv}</Text>
                                </ScrollView>
                            )}
                            <Text style={styles.modalNote}>Publisher identity is never considered — only the permissions an app requests.</Text>
                        </ScrollView>
                    )}
                </View>
            </View>
        </Modal>
    );
};

export default function AccessList() {
    const list = AccessListFunc();
    const scan = useAiScan(list.apps);
    const [tab, setTab] = useState('overview');
    const [group, setGroup] = useState(null);
    const total = list.apps?.length ?? 0;
    const overview = React.useMemo(() => computeOverview(list.apps), [list.apps]);
    const groupMeta = overview.find((g) => g.key === group) || null;
    const groupApps = React.useMemo(() => (group ? appsWithGroup(list.apps, group) : []), [list.apps, group]);
    React.useEffect(() => {
        if (!group) return undefined;
        const sub = BackHandler.addEventListener('hardwareBackPress', () => { setGroup(null); return true; });
        return () => sub.remove();
    }, [group]);
    if (list.selected) {
        return <AccessDetails app={list.selected} onBack={list.closeApp} />;
    }

    return (
        <View style={styles.root}>
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
            <View style={styles.header}>
                <Text style={styles.headerTitle}>
                    Access <Text style={styles.headerAccent}>Control</Text>
                </Text>
            </View>

            <View style={styles.content}>
                <AiBanner scanning={scan.phase === 'scanning'} onScan={scan.scan} />

                <View style={styles.tabBar}>
                    <Pressable style={[styles.tab, tab === 'overview' && styles.tabActive]} onPress={() => { setTab('overview'); setGroup(null); }} accessibilityRole="tab">
                        <Text style={styles.tabText}>Overview</Text>
                        {tab === 'overview' && <View style={styles.tabUnderline} />}
                    </Pressable>
                    <Pressable style={[styles.tab, tab === 'all' && styles.tabActive]} onPress={() => { setTab('all'); setGroup(null); }} accessibilityRole="tab">
                        <Text style={styles.tabText}>All Apps ({list.apps?.length ?? 0})</Text>
                        {tab === 'all' && <View style={styles.tabUnderline} />}
                    </Pressable>
                </View>

                {tab === 'all' && <View style={styles.searchBar}>
                    <Icon name="search" size={17} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search apps..."
                        placeholderTextColor={COLORS.textDim}
                        value={list.query}
                        onChangeText={list.setQuery}
                        autoCorrect={false}
                        accessibilityLabel="Search apps"
                    />
                    {!!list.query && (
                        <Pressable onPress={() => list.setQuery('')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Clear search">
                            <Icon name="close" size={14} color={COLORS.textDim} />
                        </Pressable>
                    )}
                </View>}
            </View>

            {list.loading ? (
                <StateView icon="spinner" title="Loading installed apps" subtitle="Reading packages and permissions" />
            ) : list.loadError ? (
                <StateView icon="alert" tone="danger" title="Couldn't load apps" subtitle={list.loadError} actionLabel="Retry" onAction={list.reload} />
            ) : tab === 'overview' && groupMeta ? (
                <FlatList
                    data={groupApps}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    ListHeaderComponent={(
                        <View style={styles.groupHeader}>
                            <Pressable onPress={() => setGroup(null)} style={styles.groupBack} accessibilityRole="button" accessibilityLabel="Back to overview">
                                <Ionicons name="chevron-back" size={18} color="#fff" />
                            </Pressable>
                            <View style={styles.groupHeaderText}>
                                <Text style={styles.groupTitle}>{groupMeta.label} access</Text>
                                <Text style={styles.groupSub}>{groupApps.length} apps can use this permission</Text>
                            </View>
                        </View>
                    )}
                    renderItem={({ item }) => <AppRow app={item} onPress={() => list.openApp(item)} />}
                    ListEmptyComponent={<StateView icon="search" title="No apps" subtitle="No installed app requests this permission." />}
                    showsVerticalScrollIndicator={false}
                />
            ) : tab === 'overview' ? (
                <ScrollView contentContainerStyle={styles.overviewContent} showsVerticalScrollIndicator={false}>
                    <Text style={styles.overviewHint}>Apps with access to sensitive permissions</Text>
                    <View style={styles.overviewGrid}>
                        {overview.map((g) => {
                            const tone = OVERVIEW_TONES[g.key] || { fg: COLORS.accent, bg: COLORS.accentDim };
                            const pct = total ? Math.round((g.count / total) * 100) : 0;
                            return (
                                <Pressable
                                    key={g.key}
                                    onPress={() => setGroup(g.key)}
                                    accessibilityRole="button"
                                    accessibilityLabel={`${g.count} apps with ${g.label} access`}
                                    style={({ pressed }) => [styles.overviewCard, pressed && styles.overviewCardPressed]}
                                >
                                    <View pointerEvents="none" style={styles.ringLayer}>
                                        <View style={[styles.ring, { width: 150, height: 150, borderRadius: 75, top: -75, right: -75, backgroundColor: tone.bg, opacity: 0.55 }]} />
                                        <View style={[styles.ring, { width: 110, height: 110, borderRadius: 55, top: -55, right: -55, borderWidth: 1.5, borderColor: tone.fg, opacity: 0.16 }]} />
                                        <View style={[styles.ring, { width: 76, height: 76, borderRadius: 38, top: -38, right: -38, borderWidth: 1.5, borderColor: tone.fg, opacity: 0.22 }]} />
                                        <View style={[styles.ring, { width: 120, height: 120, borderRadius: 60, bottom: -70, left: -50, borderWidth: 1.5, borderColor: tone.fg, opacity: 0.1 }]} />
                                        <View style={[styles.ring, { width: 80, height: 80, borderRadius: 40, bottom: -48, left: -30, borderWidth: 1.5, borderColor: tone.fg, opacity: 0.14 }]} />
                                    </View>
                                    <View style={styles.overviewTop}>
                                        <View style={[styles.overviewIcon, { backgroundColor: tone.bg }]}>
                                            <Ionicons name={g.icon} size={20} color={tone.fg} />
                                        </View>
                                        <View style={[styles.overviewPill, { backgroundColor: tone.bg }]}>
                                            <Text style={[styles.overviewPillText, { color: tone.fg }]}>{pct}%</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.overviewCount}>{g.count}</Text>
                                    <Text style={styles.overviewLabel}>{g.label}</Text>
                                    <View style={styles.overviewTrack}>
                                        <View style={[styles.overviewFill, { width: `${pct}%`, backgroundColor: tone.fg }]} />
                                    </View>
                                    <Text style={styles.overviewSub}>{g.count} of {total} apps</Text>
                                </Pressable>
                            );
                        })}
                    </View>
                </ScrollView>
            ) : (
                <FlatList
                    data={list.filtered}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item }) => <AppRow app={item} onPress={() => list.openApp(item)} />}
                    ListEmptyComponent={<StateView icon="search" title="No apps found" subtitle={`Nothing matches “${list.query}”.`} />}
                    showsVerticalScrollIndicator={false}
                />
            )}

            <ScanModal scan={scan} totalCount={list.apps?.length ?? 0} />
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: COLORS.bg, paddingBottom: 50 },
    header: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 4 },
    headerTitle: { color: '#000', fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
    headerAccent: { color: COLORS.accent },
    content: { paddingHorizontal: 16 },
    banner: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.accentDim, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, padding: 12, marginTop: 8 },
    bannerIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: "#fff", alignItems: 'center', justifyContent: 'center' },
    bannerText: { flex: 1, marginLeft: 10, marginRight: 8 },
    bannerTitle: { color: COLORS.text, fontSize: 14.5, fontWeight: '700' },
    bannerDesc: { color: COLORS.textDim, fontSize: 12 },
    scanButton: { backgroundColor: COLORS.accent, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 11 },
    scanButtonPressed: { opacity: 0.75 },
    scanButtonText: { color: COLORS.onAccent, fontSize: 12.5, fontWeight: '800' },
    scanningRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    tabBar: { flexDirection: 'row', marginTop: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    tab: { paddingHorizontal: 20, paddingVertical: 10, borderTopLeftRadius: 10, borderTopRightRadius: 10 },
    tabActive: { backgroundColor: COLORS.surfaceHigh },
    overviewContent: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 110 },
    overviewHint: { color: COLORS.textDim, fontSize: 13, marginBottom: 15, fontWeight: "bold" },
    overviewGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
    overviewCard: { width: '48%', backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#EAEAEA', padding: 14, overflow: 'hidden' },
    overviewCardPressed: { backgroundColor: '#FAFBFC', transform: [{ scale: 0.98 }] },
    ringLayer: { ...StyleSheet.absoluteFillObject },
    ring: { position: 'absolute' },
    groupHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
    groupBack: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
    groupHeaderText: { flex: 1, marginLeft: 12 },
    groupTitle: { color: '#000', fontSize: 18, fontWeight: '800' },
    groupSub: { color: COLORS.textDim, fontSize: 12.5, marginTop: 2 },
    overviewTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    overviewIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    overviewPill: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
    overviewPillText: { fontSize: 11.5, fontWeight: '800' },
    overviewCount: { color: '#000', fontSize: 34, fontWeight: '800', letterSpacing: -1, marginTop: 14 },
    overviewLabel: { color: '#000', fontSize: 14, fontWeight: '700', marginTop: 0 },
    overviewTrack: { height: 6, borderRadius: 3, backgroundColor: '#F1F3F5', marginTop: 12, overflow: 'hidden' },
    overviewFill: { height: 6, borderRadius: 3 },
    overviewSub: { color: COLORS.textDim, fontSize: 11.5, marginTop: 6 },
    tabText: { color: COLORS.text, fontSize: 13, fontWeight: '700' },
    tabUnderline: { position: 'absolute', left: 0, right: 0, bottom: -1, height: 2, backgroundColor: COLORS.accent },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 12, paddingHorizontal: 12, height: 44, marginTop: 10 },
    searchInput: { flex: 1, marginLeft: 8, color: COLORS.text, fontSize: 14, paddingVertical: 0 },
    listContent: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 110 },
    row: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 14, padding: 12, marginBottom: 10, overflow: 'hidden' },
    rowPressed: { backgroundColor: COLORS.surfaceHigh },
    rowBody: { flex: 1, marginLeft: 12, marginRight: 8 },
    rowName: { color: COLORS.text, fontSize: 14.5, fontWeight: '700' },
    rowCount: { color: COLORS.textDim, fontSize: 12.5 },
    rowSummary: { color: COLORS.textDim, fontSize: 11.5 },
    stateView: { alignItems: 'center', paddingTop: 64, paddingHorizontal: 32 },
    stateTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700', marginTop: 14, textAlign: 'center' },
    stateSubtitle: { color: COLORS.textDim, fontSize: 14, marginTop: 1, textAlign: 'center', lineHeight: 18 },
    stateButton: { backgroundColor: COLORS.accent, borderRadius: 999, paddingHorizontal: 20, paddingVertical: 10, marginTop: 16 },
    stateButtonText: { color: COLORS.onAccent, fontWeight: '800', fontSize: 13 },
    modalOverlay: { flex: 1, backgroundColor: COLORS.bg, opacity: 0.97, justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalCard: { width: '100%', maxWidth: 460, maxHeight: '78%', backgroundColor: COLORS.surface, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, padding: 16 },
    modalHeader: { flexDirection: 'row', alignItems: 'flex-start' },
    modalHeading: { flex: 1, marginRight: 10 },
    modalTitle: { color: COLORS.text, fontSize: 17, fontWeight: '800' },
    modalSubtitle: { color: COLORS.textDim, fontSize: 11.5, marginTop: 3, lineHeight: 16 },
    modalList: { marginTop: 6 },
    flagCard: { backgroundColor: COLORS.surfaceHigh, borderRadius: 12, padding: 12, marginTop: 10 },
    flagHead: { flexDirection: 'row', alignItems: 'center' },
    flagName: { flex: 1, color: COLORS.text, fontSize: 14, fontWeight: '700', marginRight: 8 },
    chip: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    chipText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
    flagId: { color: COLORS.textDim, fontSize: 10.5, marginTop: 3 },
    flagReason: { color: COLORS.textDim, fontSize: 12, lineHeight: 17, marginTop: 6 },
    csvToggle: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
    csvToggleIcon: { transform: [{ rotate: '90deg' }] },
    csvToggleText: { color: COLORS.accent, fontSize: 12, fontWeight: '700', marginLeft: 4 },
    csvBox: { maxHeight: 130, backgroundColor: COLORS.bg, borderRadius: 10, padding: 10, marginTop: 8 },
    csvText: { color: COLORS.textDim, fontSize: 10, fontFamily: 'monospace' },
    modalNote: { color: COLORS.textDim, fontSize: 10.5, marginTop: 12, marginBottom: 4, lineHeight: 15 },
    modalError: { alignItems: 'center', paddingTop: 18, paddingBottom: 8 },
    modalErrorText: { color: COLORS.textDim, fontSize: 12.5, marginTop: 10, textAlign: 'center', lineHeight: 18 },
    modalErrorActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
    retryButton: { backgroundColor: COLORS.accent, borderRadius: 999, paddingHorizontal: 20, paddingVertical: 10 },
    retryButtonText: { color: COLORS.onAccent, fontWeight: '800', fontSize: 12.5 },
    dismissButton: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 999, paddingHorizontal: 20, paddingVertical: 10 },
    dismissButtonText: { color: COLORS.text, fontWeight: '700', fontSize: 12.5 },
});