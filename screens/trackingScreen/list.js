import React from 'react';
import {
    View, Text, Image, FlatList, TouchableOpacity, StyleSheet,
    ActivityIndicator, Platform, RefreshControl, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../constants';

import { TrackingListFunc, RANGES, fmtDuration, fmtTime } from './list-function';
export const alpha = (hex, a) => `${hex}${a}`;
export const STATUS_PAD = Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0;
export const ScreenShell = ({ children }) => <SafeAreaView style={[S.root, { paddingTop: STATUS_PAD }]}>{children}</SafeAreaView>;

export const Header = ({ title, subtitle, left }) => (
    <View style={S.header}>
        {left}
        <View style={S.headerText}>
            <Text style={S.title}>{title}</Text>
            {!!subtitle && <Text style={S.subtitle}>{subtitle}</Text>}
        </View>
    </View>
);

export const Card = ({ style, children, ...rest }) => (
    <View style={[S.card, style]} {...rest}>{children}</View>
);

export const Chip = ({ tone = 'accent', style, children }) => (
    <View style={[S.chip, { backgroundColor: COLORS[`${tone}Dim`], borderColor: alpha(COLORS[tone], '55') }, style]}>
        <Text style={[S.chipText, { color: COLORS[tone] }]}>{children}</Text>
    </View>
);

export const Glyph = ({ name, size = 18, color = COLORS.textDim }) => {
    const t = Math.max(1.5, size * 0.1);
    const box = { width: size, height: size };
    const abs = (st) => <View style={{ position: 'absolute', backgroundColor: color, borderRadius: t / 2, ...st }} />;
    switch (name) {
        case 'clock':
            return (
                <View style={[box, { borderRadius: size / 2, borderWidth: t, borderColor: color }]}>
                    {abs({ width: t, height: size * 0.3, top: size * 0.2, left: size / 2 - t / 2 })}
                    {abs({ width: size * 0.22, height: t, top: size / 2 - t / 2, left: size / 2 - t / 2 })}
                </View>
            );
        case 'calendar':
            return (
                <View style={[box, { borderRadius: size * 0.18, borderWidth: t, borderColor: color }]}>
                    {abs({ width: size * 0.7, height: t, top: size * 0.28, left: size * 0.15 })}
                    {abs({ width: t, height: size * 0.2, top: -size * 0.1, left: size * 0.28 })}
                    {abs({ width: t, height: size * 0.2, top: -size * 0.1, right: size * 0.28 })}
                </View>
            );
        case 'layers':
            return (
                <View style={[box, { justifyContent: 'center', alignItems: 'center' }]}>
                    {[1, 0.78, 0.56].map((w, i) => (
                        <View key={i} style={{ width: size * w, height: t * 1.4, borderRadius: t, backgroundColor: color, marginTop: i ? size * 0.14 : 0 }} />
                    ))}
                </View>
            );
        case 'chevron':
            return <View style={{ width: size * 0.55, height: size * 0.55, borderRightWidth: t, borderTopWidth: t, borderColor: color, transform: [{ rotate: '45deg' }] }} />;
        case 'back':
            return <View style={{ width: size * 0.55, height: size * 0.55, borderLeftWidth: t, borderBottomWidth: t, borderColor: color, transform: [{ rotate: '45deg' }] }} />;
        case 'alert':
            return (
                <View style={[box, { borderRadius: size / 2, borderWidth: t, borderColor: color, alignItems: 'center', justifyContent: 'center' }]}>
                    {abs({ width: t, height: size * 0.34, top: size * 0.2 })}
                    {abs({ width: t, height: t, top: size * 0.66 })}
                </View>
            );
        default:
            return null;
    }
};

export const IconTile = ({ icon, label = '?', size = 44 }) =>
    icon ? (
        <Image source={{ uri: `data:image/png;base64,${icon}` }} style={{ width: size, height: size, borderRadius: size * 0.22 }} />
    ) : (
        <View style={[S.tile, { width: size, height: size, borderRadius: size * 0.22 }]}>
            <Text style={[S.tileLetter, { fontSize: size * 0.42 }]}>{(label || '?')[0].toUpperCase()}</Text>
        </View>
    );

export const Bar = ({ pct, tone = 'accent' }) => (
    <View style={S.barTrack}>
        <View style={[S.barFill, { width: `${Math.min(100, Math.max(3, pct))}%`, backgroundColor: COLORS[tone] }]} />
    </View>
);

export const SectionHead = ({ title, action, onAction }) => (
    <View style={S.sectionHead}>
        <Text style={S.sectionTitle}>{title}</Text>
        {!!action && <TouchableOpacity onPress={onAction} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}><Text style={S.sectionAction}>{action}</Text></TouchableOpacity>}
    </View>
);

export const StateView = ({ status, error, onRetry, empty, emptyText, children }) => {
    if (status === 'loading') {
        return (
            <View style={S.state}>
                <ActivityIndicator color={COLORS.accent} />
                <Text style={S.stateText}>Reading usage stats…</Text>
            </View>
        );
    }
    if (status === 'error') {
        return (
            <View style={S.state}>
                <Glyph name="alert" size={26} color={COLORS.danger} />
                <Text style={S.stateText}>{error}</Text>
                <TouchableOpacity style={S.btn} onPress={onRetry}><Text style={S.btnText}>Retry</Text></TouchableOpacity>
            </View>
        );
    }
    if (empty) return <View style={S.state}><Text style={S.stateText}>{emptyText || 'Nothing here yet.'}</Text></View>;
    return children;
};

export const Segmented = ({ value, onChange }) => (
    <View style={S.tabsRow}>
        {RANGES.map((r) => (
            <TouchableOpacity key={r.key} activeOpacity={0.8} style={S.tabBtn} onPress={() => onChange(r.key)}>
                <Text style={[S.tabLabel, value === r.key && S.tabLabelOn]}>{r.label}</Text>
                {value === r.key && <View style={S.tabIndicator} />}
            </TouchableOpacity>
        ))}
    </View>
);

const PermissionCard = ({ onEnable }) => (
    <Card style={S.permCard}>
        <Glyph name="alert" size={22} color={COLORS.warn} />
        <Text style={S.permTitle}>Usage access required</Text>
        <Text style={S.permText}>
            Android keeps usage data private. Enable “Usage access” for this app in system settings to analyse foreground
            activity. The list refreshes automatically when you return.
        </Text>
        <TouchableOpacity style={S.btn} onPress={onEnable}><Text style={S.btnText}>Open Settings</Text></TouchableOpacity>
    </Card>
);

const TrackingList = ({ navigation }) => {
    const { status, refreshing, error, apps, total, range, sort, simulated, permission, setRange, setSort, refresh, enableAccess } = TrackingListFunc();

    const STATUS_PAD = Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0;
    return (

        <View style={S.root}>
            <View style={S.header} >
                <Text style={S.title}>
                    Session <Text style={{ color: COLORS.accent }}>Logs</Text>
                </Text>

                <Text
                    style={S.subtitle}
                >
                    Track and analyze app activity on your device
                </Text>
            </View>

            <View style={S.body}>
                <Segmented value={range} onChange={setRange} />
                {permission === 'denied' ? (
                    <PermissionCard onEnable={enableAccess} />
                ) : (
                    <StateView status={status} error={error} onRetry={refresh} empty={!apps.length} emptyText="No app activity in this period.">
                        <FlatList
                            data={apps}
                            keyExtractor={(i) => i.pkg}
                            contentContainerStyle={S.listContent}
                            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={COLORS.accent} progressBackgroundColor={COLORS.surface} />}
                            ListHeaderComponent={(
                                <View>
                                    <View style={S.usageCard}>
                                        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                                            <View style={[S.usageRing, { width: 110, height: 110, borderRadius: 55, top: -40, right: -30, backgroundColor: 'rgba(255,255,255,0.12)' }]} />
                                            <View style={[S.usageRing, { width: 70, height: 70, borderRadius: 35, bottom: -25, left: -20, backgroundColor: 'rgba(255,255,255,0.08)' }]} />
                                        </View>
                                        <View style={S.usageIconWrap}>
                                            <Glyph name="clock" size={22} color="#fff" />
                                        </View>
                                        <View style={S.usageTextWrap}>
                                            <Text style={S.usageLabel}>Total Screen Time</Text>
                                            <Text style={S.usageValue}>{fmtDuration(total)}</Text>
                                        </View>
                                        {simulated && <Chip tone="warn" style={S.simChip}>Simulated</Chip>}
                                    </View>
                                    <View style={S.sortRow}>
                                        <Text style={S.count}>Installed Apps ({apps.length})</Text>
                                        <View style={S.sortBtns}>
                                            <TouchableOpacity
                                                style={[S.sortBtn, sort === 'usage' && S.sortBtnActive]}
                                                onPress={() => setSort('usage')}
                                                activeOpacity={0.7}
                                            >
                                                <Text style={[S.sortBtnText, sort === 'usage' && S.sortBtnTextActive]}>Most Used</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[S.sortBtn, sort === 'recent' && S.sortBtnActive]}
                                                onPress={() => setSort('recent')}
                                                activeOpacity={0.7}
                                            >
                                                <Text style={[S.sortBtnText, sort === 'recent' && S.sortBtnTextActive]}>Recent</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>
                            )}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    activeOpacity={0.7}
                                    style={S.row}
                                    onPress={() => navigation?.navigate('TrackingDetails', { pkg: item.pkg, label: item.label, icon: item.icon, range })}
                                >
                                    <IconTile icon={item.icon} label={item.label} />
                                    <View style={S.rowMain}>
                                        <View style={S.rowLine}>
                                            <Text style={S.rowName} numberOfLines={1}>{item.label}</Text>
                                        </View>
                                        <Text style={S.rowSub}>{fmtDuration(item.totalMs)} ({item.pct}%)</Text>
                                        <Bar pct={item.pct} />
                                    </View>
                                    <View style={S.rowSide}>
                                        <Text style={S.sideLabel}>Last used</Text>
                                        <Text style={S.sideValue}>{fmtTime(item.lastUsed)}</Text>
                                    </View>
                                    <Glyph name="chevron" size={14} color={COLORS.textDim} />
                                </TouchableOpacity>
                            )}
                        />
                    </StateView>
                )}
            </View>
        </View>
    );
};

const S = StyleSheet.create({

    root: { flex: 1, backgroundColor: COLORS.bg },
    header: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 10 },
    headerText: { flex: 1 },
    title: { color: '#000', fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
    subtitle: { color: COLORS.textDim, fontSize: 13, marginTop: 4 },
    body: { flex: 1, paddingHorizontal: 16 },
    tabsRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.border, marginBottom: 4 },
    tabBtn: { flex: 1, alignItems: 'center', paddingBottom: 10 },
    tabLabel: { color: COLORS.textDim, fontSize: 13, fontWeight: '600' },
    tabLabelOn: { color: COLORS.text, fontWeight: '700' },
    tabIndicator: { position: 'absolute', bottom: 0, height: 3, width: '60%', borderRadius: 2, backgroundColor: COLORS.accent },
    listContent: { paddingBottom: 110 },
    usageCard: {
        flexDirection: 'row', alignItems: 'center', marginTop: 14, padding: 18,
        backgroundColor: COLORS.accent, borderRadius: 18, overflow: 'hidden',
        shadowColor: COLORS.accent, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6,
    },
    usageRing: { position: 'absolute' },
    usageIconWrap: { width: 46, height: 46, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    usageTextWrap: { flex: 1, marginLeft: 14 },
    usageLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600', marginBottom: 2 },
    usageValue: { color: '#fff', fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
    simChip: { marginLeft: 'auto' },
    count: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
    sortRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 12 },
    sortBtns: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: 8, padding: 3, borderWidth: 1, borderColor: COLORS.border },
    sortBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
    sortBtnActive: { backgroundColor: COLORS.surfaceHigh },
    sortBtnText: { color: COLORS.textDim, fontSize: 12, fontWeight: '600' },
    sortBtnTextActive: { color: COLORS.accent },
    row: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 12, marginBottom: 10 },
    rowMain: { flex: 1, marginLeft: 12, marginRight: 10 },
    rowLine: { flexDirection: 'row', alignItems: 'center' },
    rowName: { color: COLORS.text, fontSize: 15, fontWeight: '600', flexShrink: 1 },
    rowSub: { color: COLORS.textDim, fontSize: 12, marginVertical: 4 },
    barTrack: { height: 4, borderRadius: 2, backgroundColor: COLORS.surfaceHigh },
    barFill: { height: 4, borderRadius: 2 },
    rowSide: { alignItems: 'flex-end', marginRight: 8 },
    sideLabel: { color: COLORS.textDim, fontSize: 11 },
    sideValue: { color: COLORS.text, fontSize: 12, marginTop: 3 },
    card: { backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 14 },
    chip: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 4, alignSelf: 'flex-start' },
    chipText: { fontSize: 11, fontWeight: '700' },
    tile: { backgroundColor: COLORS.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
    tileLetter: { color: COLORS.accent, fontWeight: '700' },
    sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, marginBottom: 10 },
    sectionTitle: { color: COLORS.text, fontSize: 17, fontWeight: '700' },
    sectionAction: { color: COLORS.accent, fontSize: 13, fontWeight: '600' },
    state: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
    stateText: { color: COLORS.textDim, fontSize: 13, marginTop: 12, textAlign: 'center' },
    btn: { marginTop: 16, backgroundColor: COLORS.accent, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 11 },
    btnText: { color: COLORS.onAccent, fontWeight: '700', fontSize: 14 },
    permCard: { marginTop: 16, alignItems: 'center', padding: 22 },
    permTitle: { color: COLORS.text, fontSize: 17, fontWeight: '700', marginTop: 12 },
    permText: { color: COLORS.textDim, fontSize: 13, lineHeight: 19, marginTop: 8, textAlign: 'center' },
});

export default TrackingList;