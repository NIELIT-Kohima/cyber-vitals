import React from 'react';
import { ActivityIndicator, FlatList, Image, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FLAGS } from '../../constants';
import ListFunc from './list-function';

function renderFlagIcon(key, color) {
    switch (key) {
        case 'verified':
            return <Ionicons name="shield-checkmark" size={13} color={color} />;
        case 'oem':
        case 'preinstalled':
            return <Ionicons name="checkmark-circle" size={13} color={color} />;
        case 'unknownOrigin':
            return <Ionicons name="warning" size={13} color={color} />;
        case 'debuggable':
            return <Ionicons name="bug" size={13} color={color} />;
        case 'outdatedSdk':
            return <Ionicons name="alert-circle" size={13} color={color} />;
        case 'stale':
            return <Ionicons name="time-outline" size={13} color={color} />;
        default:
            return <Ionicons name="alert-circle" size={13} color={color} />;
    }
}

const Badge = ({ id }) => {
    const flag = FLAGS[id] || { label: id, tone: 'textDim' };
    const color = COLORS[flag.tone] || COLORS.textDim;
    const bg = COLORS[`${flag.tone}Dim`] || COLORS.surfaceHigh;
    return (
        <View style={[st.badgePill, { backgroundColor: bg }]}>
            {renderFlagIcon(id, color)}
            <Text style={[st.badgeText, { color }]} numberOfLines={1}>
                {flag.label}
            </Text>
        </View>
    );
};

const Row = ({ item, onPress, highlighted = false, first = false }) => (
    <TouchableOpacity
        style={[st.row, highlighted && st.rowHighlighted, highlighted && !first && st.rowDivider]}
        onPress={onPress}
        activeOpacity={0.7}
    >
        <Image source={{ uri: `data:image/png;base64,${item.icon}` }} style={st.icon} />
        <View style={[st.grow, st.ml10]}>
            <Text style={st.title} numberOfLines={1}>{item.label}</Text>
            <Text style={st.sub} numberOfLines={1}>{item.packageName}</Text>
        </View>
        <Badge id={item.badge} />
        <Ionicons name="chevron-forward" size={16} color={COLORS.textDim} style={st.chev} />
    </TouchableOpacity>
);

export default function SourceList({ navigation }) {
    const { highlighted, other, total, riskyCount, loading, error, reload, tab, setTab, query, setQuery, scannedLabel, open } = ListFunc(navigation);

    const renderListHeader = () => {
        if (!highlighted || highlighted.length === 0) return null;
        return (
            <View style={st.highlightSection}>
                <View style={st.highlightBox}>
                    <View style={st.highlightHeader}>
                        <View style={st.highlightBadge}>
                            <Ionicons name="warning" size={18} color={COLORS.danger} />
                        </View>
                        <View style={st.highlightHeaderText}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={st.highlightTitle}>Security Attention Required</Text>
                                <View style={st.countPill}>
                                    <Text style={st.countPillText}>{highlighted.length}</Text>
                                </View>
                            </View>
                            <Text style={st.highlightSub}>Debuggable & Unknown Origin apps</Text>
                        </View>
                    </View>

                    {highlighted.map((item, idx) => (
                        <Row key={item.packageName} item={item} onPress={() => open(item)} highlighted first={idx === 0} />
                    ))}
                </View>

                {other.length > 0 && (
                    <View style={st.sectionDivider}>
                        <Text style={st.sectionTitle}>
                            {tab === 'installed' ? 'Other Installed Apps' : tab === 'risky' ? 'Other Risky Apps' : 'Other Apps'}
                        </Text>
                        <Text style={st.sectionCount}>{other.length}</Text>
                    </View>
                )}
            </View>
        );
    };

    return (
        <View style={st.root}>
            <View style={st.pad}>
                <View style={st.header}>
                    <Text style={st.headerTitle}>
                        Source <Text style={{ color: COLORS.accent }}>Screening</Text>
                    </Text>
                </View>
                <View style={st.banner}>
                    <View style={st.bannerIcon}>
                        <Ionicons name="shield-checkmark" size={20} color={COLORS.accent} />
                    </View>
                    <View style={st.bannerText}>
                        <Text style={st.bannerTitle}>{total} Apps Scanned</Text>
                        <Text style={st.bannerDesc}>{scannedLabel}</Text>
                    </View>
                    <TouchableOpacity
                        onPress={reload}
                        disabled={loading}
                        accessibilityRole="button"
                        accessibilityLabel="Start scan"
                        style={[st.scanButton, loading && st.scanButtonPressed]}
                    >
                        {loading ? (
                            <View style={st.scanningRow}>
                                <ActivityIndicator size="small" color={COLORS.onAccent} />
                                <Text style={st.scanButtonText}>Scanning…</Text>
                            </View>
                        ) : (
                            <Text style={st.scanButtonText}>Start Scan</Text>
                        )}
                    </TouchableOpacity>
                </View>
                <View style={st.tabs}>
                    {[
                        ['installed', 'Installed apps'],
                        ['system', 'System apps'],
                        ['risky', `Risky apps (${riskyCount})`],
                    ].map(([k, l]) => (
                        <TouchableOpacity key={k} style={st.tab} onPress={() => setTab(k)}>
                            <Text
                                style={[
                                    st.tabText,
                                    tab === k && { color: COLORS.text, fontWeight: '700' },
                                ]}
                            >
                                {l}
                            </Text>
                            {tab === k && <View style={st.tabLine} />}
                        </TouchableOpacity>
                    ))}
                </View>
                <View style={st.searchBox}>
                    <Ionicons name="search" size={17} color={COLORS.textDim} style={st.searchGlyph} />
                    <TextInput
                        style={st.searchInput}
                        placeholder="Search apps..."
                        placeholderTextColor={COLORS.textDim}
                        value={query}
                        onChangeText={setQuery}
                        autoCorrect={false}
                    />
                    {!!query && (
                        <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <Ionicons name="close-circle" size={16} color={COLORS.textDim} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
            {loading && !total ? (
                <ActivityIndicator style={st.center} color={COLORS.accent} />
            ) : error ? (
                <View style={st.center}>
                    <Text style={st.errorText}>{error}</Text>
                    <TouchableOpacity style={st.retry} onPress={reload}><Text style={st.retryText}>Retry</Text></TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={other}
                    keyExtractor={(i) => i.packageName}
                    renderItem={({ item }) => <Row item={item} onPress={() => open(item)} />}
                    ListHeaderComponent={renderListHeader}
                    refreshControl={<RefreshControl refreshing={loading && !!total} onRefresh={reload} tintColor={COLORS.accent} />}
                    ListEmptyComponent={(!highlighted || highlighted.length === 0) ? <Text style={st.empty}>No apps found</Text> : null}
                    contentContainerStyle={st.listPad}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
    );
}

const st = StyleSheet.create({
    root: { flex: 1, backgroundColor: COLORS.bg, paddingBottom: 50 },
    pad: { paddingHorizontal: 16 },
    header: { paddingTop: 18, paddingBottom: 6 },
    headerTitle: { color: '#000', fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
    banner: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.accentDim, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, padding: 12, marginTop: 8 },
    bannerIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: "#fff", alignItems: 'center', justifyContent: 'center' },
    bannerText: { flex: 1, marginLeft: 10, marginRight: 8 },
    bannerTitle: { color: COLORS.text, fontSize: 14.5, fontWeight: '700' },
    bannerDesc: { color: COLORS.textDim, fontSize: 12 },
    scanButton: { backgroundColor: COLORS.accent, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10 },
    scanButtonPressed: { opacity: 0.75 },
    scanButtonText: { color: COLORS.onAccent, fontSize: 12.5, fontWeight: '800' },
    scanningRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    tabs: { flexDirection: 'row', marginTop: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    tab: { flex: 1, alignItems: 'center', paddingBottom: 10 },
    tabText: { color: COLORS.textDim, fontSize: 13, fontWeight: '600' },
    tabLine: { position: 'absolute', bottom: 0, height: 3, width: '60%', borderRadius: 2, backgroundColor: COLORS.accent },
    searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 12, height: 44, marginTop: 12 },
    searchGlyph: { marginRight: 8 },
    searchInput: { flex: 1, color: COLORS.text, fontSize: 14, padding: 0 },
    listPad: { padding: 16, paddingTop: 12, paddingBottom: 34 },
    row: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 14, padding: 12, marginBottom: 8 },
    rowHighlighted: { backgroundColor: 'transparent', borderRadius: 0, marginBottom: 0, paddingHorizontal: 14 },
    rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#F5C6C6' },
    icon: { width: 46, height: 46, borderRadius: 12, backgroundColor: COLORS.surfaceHigh },
    grow: { flex: 1 },
    ml10: { marginLeft: 10, marginRight: 8 },
    title: { color: COLORS.text, fontSize: 14.5, fontWeight: '700' },
    sub: { color: COLORS.textDim, fontSize: 12, marginTop: 2 },
    badgePill: { flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4.5, maxWidth: 142 },
    badgeText: { fontSize: 11, fontWeight: '700', marginLeft: 4, flexShrink: 1 },
    chev: { marginLeft: 6 },
    highlightSection: { marginBottom: 6 },
    highlightBox: { backgroundColor: '#FFF5F5', borderWidth: 1, borderColor: '#FBD5D5', borderRadius: 18, overflow: 'hidden' },
    highlightHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingTop: 14, paddingBottom: 10 },
    highlightBadge: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },
    highlightHeaderText: { marginLeft: 10, flex: 1 },
    highlightTitle: { color: '#991B1B', fontSize: 14.5, fontWeight: '800', letterSpacing: -0.2 },
    highlightSub: { color: '#DC2626', fontSize: 11.5, marginTop: 1 },
    countPill: { backgroundColor: COLORS.danger, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 1.5, marginLeft: 8 },
    countPillText: { color: '#fff', fontSize: 11, fontWeight: '800' },
    sectionDivider: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: 8, paddingHorizontal: 2 },
    sectionTitle: { color: COLORS.text, fontSize: 14.5, fontWeight: '800', letterSpacing: -0.2 },
    sectionCount: { color: COLORS.textDim, fontSize: 12.5, fontWeight: '600' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    errorText: { color: COLORS.danger, fontSize: 14, textAlign: 'center' },
    retry: { marginTop: 14, backgroundColor: COLORS.accent, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10 },
    retryText: { color: COLORS.onAccent, fontWeight: '700' },
    empty: { color: COLORS.textDim, textAlign: 'center', marginTop: 40, fontSize: 13 },
});