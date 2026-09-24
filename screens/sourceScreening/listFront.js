import { ActivityIndicator, FlatList, Image, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FLAGS } from '../../constants';
import ListFunc from './listFunc';

const Badge = ({ id }) => (
    <View style={st.badge}>
        <View style={[st.dot, { backgroundColor: COLORS[FLAGS[id].tone] }]}>
            <Text style={st.dotTick}>{FLAGS[id].tick}</Text>
        </View>
        <Text style={[st.badgeText, { color: COLORS[FLAGS[id].tone] }]} numberOfLines={1}>{FLAGS[id].label}</Text>
    </View>
);

const Row = ({ item, onPress }) => (
    <TouchableOpacity style={st.row} onPress={onPress}>
        <Image source={{ uri: `data:image/png;base64,${item.icon}` }} style={st.icon} />
        <View style={[st.grow, st.ml10]}>
            <Text style={st.title} numberOfLines={1}>{item.label}</Text>
            <Text style={st.sub} numberOfLines={1}>{item.packageName}</Text>
        </View>
        <Badge id={item.badge} />
        <Text style={st.chev}>›</Text>
    </TouchableOpacity>
);

export default function SourceListFront({ navigation }) {
    const { list, total, riskyCount, loading, error, reload, tab, setTab, query, setQuery, scannedLabel, open } = ListFunc(navigation);

    return (
        <SafeAreaView style={st.root} edges={['top']}>
            <View style={st.pad}>
                <View style={st.nav}>
                    <TouchableOpacity onPress={() => navigation.goBack()}><Text style={st.back}>‹</Text></TouchableOpacity>
                    <Text style={st.navTitle}>App Security</Text>
                    <View style={st.backSlot} />
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
                <View style={st.scan}>
                    <View style={st.shield}><Text style={st.shieldTick}>✓</Text></View>
                    <View style={[st.grow, st.ml10]}>
                        <Text style={st.title}>{total} Apps Scanned</Text>
                        <Text style={st.sub}>{scannedLabel}</Text>
                    </View>
                    <TouchableOpacity style={st.refreshBtn} onPress={reload}><Text style={st.refreshGlyph}>⟳</Text></TouchableOpacity>
                </View>
                <View style={st.searchBox}>
                    <Text style={st.searchGlyph}>⌕</Text>
                    <TextInput style={st.searchInput} placeholder="Search apps..." placeholderTextColor={COLORS.textDim} value={query} onChangeText={setQuery} />
                </View>
            </View>
            {loading ? (
                <ActivityIndicator style={st.center} color={COLORS.accent} />
            ) : error ? (
                <View style={st.center}>
                    <Text style={st.errorText}>{error}</Text>
                    <TouchableOpacity style={st.retry} onPress={reload}><Text style={st.retryText}>Retry</Text></TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={list}
                    keyExtractor={(i) => i.packageName}
                    renderItem={({ item }) => <Row item={item} onPress={() => open(item)} />}
                    refreshControl={<RefreshControl refreshing={loading && !!total} onRefresh={reload} tintColor={COLORS.accent} />}
                    ListEmptyComponent={<Text style={st.empty}>No apps found</Text>}
                    contentContainerStyle={st.listPad}
                />
            )}
        </SafeAreaView>
    );
}

const st = StyleSheet.create({
    root: { flex: 1, backgroundColor: COLORS.bg },
    pad: { paddingHorizontal: 16 },
    nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 },
    back: { color: COLORS.text, fontSize: 30, lineHeight: 34, paddingHorizontal: 8 },
    navTitle: { color: COLORS.text, fontSize: 17, fontWeight: '700' },
    backSlot: { width: 30 },
    tabs: { flexDirection: 'row', marginTop: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    tab: { flex: 1, alignItems: 'center', paddingBottom: 10 },
    tabText: { color: COLORS.textDim, fontSize: 13, fontWeight: '600' },
    tabLine: { position: 'absolute', bottom: 0, height: 3, width: '60%', borderRadius: 2, backgroundColor: COLORS.accent },
    scan: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.accentDim, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 14, marginTop: 14 },
    shield: { width: 40, height: 44, borderRadius: 10, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center' },
    shieldTick: { color: COLORS.onAccent, fontSize: 20, fontWeight: '800' },
    refreshBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
    refreshGlyph: { color: COLORS.accent, fontSize: 18 },
    searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 12, height: 44, marginTop: 12 },
    searchGlyph: { color: COLORS.textDim, fontSize: 16, marginRight: 8 },
    searchInput: { flex: 1, color: COLORS.text, fontSize: 14, padding: 0 },
    listPad: { padding: 16, paddingTop: 12, paddingBottom: 24 },
    row: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 14, padding: 10, marginBottom: 10 },
    icon: { width: 46, height: 46, borderRadius: 12, backgroundColor: COLORS.surfaceHigh },
    grow: { flex: 1 },
    ml10: { marginLeft: 10, marginRight: 8 },
    title: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
    sub: { color: COLORS.textDim, fontSize: 12, marginTop: 2 },
    badge: { flexDirection: 'row', alignItems: 'center', maxWidth: 132 },
    dot: { width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 6 },
    dotTick: { color: COLORS.bg, fontSize: 10, fontWeight: '800' },
    badgeText: { fontSize: 12, fontWeight: '600', flexShrink: 1 },
    chev: { color: COLORS.textDim, fontSize: 18, marginLeft: 6 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    errorText: { color: COLORS.danger, fontSize: 14, textAlign: 'center' },
    retry: { marginTop: 14, backgroundColor: COLORS.accent, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10 },
    retryText: { color: COLORS.onAccent, fontWeight: '700' },
    empty: { color: COLORS.textDim, textAlign: 'center', marginTop: 40, fontSize: 13 },
});