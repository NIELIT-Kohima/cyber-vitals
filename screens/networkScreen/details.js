import React, { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
    View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Modal, Switch,
    Image, ScrollView, Animated, Platform, StatusBar, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, PROTO_COLORS, PROTO_LABELS } from '../../constants';
import { store, startTap, stopTap, RANGES, fmtClock, fmtDur, fmtBytes } from './details-function';

const useStore = () => useSyncExternalStore(store.subscribe, () => store.version);

const Chip = ({ color = COLORS.textDim, children, filled }) => (
    <View style={[st.chip, filled && { backgroundColor: color, borderColor: color }]}>
        <Text style={[st.chipTx, { color: filled ? COLORS.onAccent : color }]}>{children}</Text>
    </View>
);
const ProtoChips = ({ ev }) => (
    <View style={st.rowC}>
        <Chip color={PROTO_COLORS[ev.proto] || COLORS.textDim}>{`${(ev.proto || '?').toUpperCase()} (${ev.port})`}</Chip>
        <Chip>{ev.domain ? (ev.src === 'sni' ? 'SNI' : 'DNS') : 'IP only'}</Chip>
    </View>
);
const AppIcon = ({ app, size = 40 }) =>
    app?.icon ? (
        <Image source={{ uri: `data:image/png;base64,${app.icon}` }} style={{ width: size, height: size, borderRadius: size * 0.22 }} />
    ) : (
        <View style={[st.iconFall, { width: size, height: size, borderRadius: size * 0.22 }]}>
            <Text style={[st.iconFallTx, { fontSize: size * 0.42 }]}>{(app?.label || '?').charAt(0).toUpperCase()}</Text>
        </View>
    );
const LetterIcon = ({ text, color = COLORS.textDim, size = 38 }) => (
    <View style={[st.iconFall, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={[st.iconFallTx, { color, fontSize: size * 0.42 }]}>{(text || '?').charAt(0).toUpperCase()}</Text>
    </View>
);
const Sparkline = ({ data, color = COLORS.accent, height = 26, width = 76 }) => {
    const max = Math.max(1, ...data);
    const bw = Math.max(2, Math.floor(width / data.length) - 1);
    return (
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', height, width }}>
            {data.map((v, i) => (
                <View key={i} style={{
                    width: bw, marginRight: 1, height: Math.max(2, (v / max) * height),
                    backgroundColor: color, opacity: v ? 0.95 : 0.15, borderRadius: 1,
                }} />
            ))}
        </View>
    );
};
const Segmented = ({ options, value, onChange }) => (
    <View style={st.seg}>
        {options.map((o) => {
            const on = o.key === value;
            return (
                <TouchableOpacity key={o.key} style={[st.segBtn, on && st.segBtnOn]} onPress={() => onChange(o.key)} activeOpacity={0.7}>
                    <Text style={[st.segTx, on && st.segTxOn]}>{o.label}</Text>
                </TouchableOpacity>
            );
        })}
    </View>
);
const Sheet = ({ visible, title, onClose, children }) => (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <TouchableOpacity style={st.sheetBack} activeOpacity={1} onPress={onClose}>
            <View style={st.sheet}>
                <View style={st.sheetHead}>
                    <Text style={st.sheetTitle}>{title}</Text>
                    <TouchableOpacity onPress={onClose}><Text style={st.sheetClose}>✕</Text></TouchableOpacity>
                </View>
                {children}
            </View>
        </TouchableOpacity>
    </Modal>
);
const SortMenu = ({ value, options, onChange }) => {
    const currentIndex = options.findIndex((o) => o.key === value);
    const currentOption = options[currentIndex >= 0 ? currentIndex : 0];
    const toggle = () => {
        const nextIndex = ((currentIndex >= 0 ? currentIndex : 0) + 1) % options.length;
        onChange(options[nextIndex].key);
    };
    return (
        <TouchableOpacity style={st.rowC} onPress={toggle} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="swap-vertical" size={13} color={COLORS.accent} />
            <Text style={st.sortTx}>Sort: </Text>
            <Text style={st.sortTxOn}>{currentOption?.label}</Text>
        </TouchableOpacity>
    );
};
const Legend = () => (
    <View style={st.rowC}>
        {Object.keys(PROTO_LABELS).map((k) => (
            <View key={k} style={st.legItem}>
                <View style={[st.legDot, { backgroundColor: PROTO_COLORS[k] }]} />
                <Text style={st.legTx}>{PROTO_LABELS[k]}</Text>
            </View>
        ))}
    </View>
);
const LiveCursor = () => {
    const pulse = useMemo(() => new Animated.Value(1), []);
    useEffect(() => {
        const l = Animated.loop(Animated.sequence([
            Animated.timing(pulse, { toValue: 0.25, duration: 900, useNativeDriver: true }),
            Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        ]));
        l.start();
        return () => l.stop();
    }, [pulse]);
    return (
        <View style={st.cursor} pointerEvents="none">
            <Animated.View style={[st.cursorDot, { opacity: pulse }]} />
            <View style={st.cursorLine} />
            <Text style={st.cursorTx}>Live</Text>
        </View>
    );
};
const Back = ({ onPress }) => (
    <TouchableOpacity style={st.rowC} onPress={onPress}>
        <Text style={st.backTx}>‹</Text><Text style={st.backTx}> Back</Text>
    </TouchableOpacity>
);

function StatusCard() {
    useStore();
    const [, setTick] = useState(0);
    useEffect(() => { const t = setInterval(() => setTick((x) => x + 1), 1000); return () => clearInterval(t); }, []);
    const s = store.getStats();
    const cfg = {
        active: { c: COLORS.accent, t: 'Local tap active', d: 'Capturing network traffic using Android VpnService.' },
        starting: { c: COLORS.warn, t: 'Starting tap…', d: 'Requesting the local VPN tunnel from the system.' },
        permission: { c: COLORS.warn, t: 'VPN permission requested', d: 'Approve the system dialog to allow the local tap.' },
        boot: { c: COLORS.warn, t: 'Loading device apps…', d: 'Indexing installed applications by UID.' },
        idle: { c: COLORS.textDim, t: 'Tap stopped', d: 'Start the local tap to capture per-app connections.' },
        error: { c: COLORS.danger, t: 'Tap error', d: s.error || 'The local VPN tunnel failed to start.' },
        unsupported: { c: COLORS.danger, t: 'Unavailable on this platform', d: 'The native VpnService tap requires Android.' },
    }[s.status] || { c: COLORS.textDim, t: s.status, d: '' };

    return (
        <View style={[st.banner, s.status === 'error' && { backgroundColor: COLORS.dangerDim }]}>
            <View style={st.bannerIcon}>
                {s.status === 'active' ? (
                    <Ionicons name="shield-checkmark" size={20} color={COLORS.accent} />
                ) : (s.status === 'starting' || s.status === 'boot') ? (
                    <ActivityIndicator size="small" color={COLORS.accent} />
                ) : (s.status === 'error' || s.status === 'unsupported') ? (
                    <Ionicons name="alert-circle-outline" size={20} color={COLORS.danger} />
                ) : (
                    <Ionicons name="shield-outline" size={20} color={COLORS.accent} />
                )}
            </View>
            <View style={st.bannerText}>
                <Text style={st.bannerTitle}>{cfg.t}</Text>
                <Text style={st.bannerDesc} numberOfLines={2}>
                    {s.status === 'active' ? `Live capturing · up ${fmtDur(Date.now() - s.startedAt)}` : cfg.d}
                </Text>
            </View>
            {(s.status === 'idle' || s.status === 'error' || s.status === 'unsupported') && (
                <TouchableOpacity
                    style={st.scanButton}
                    onPress={startTap}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel="Start tap"
                >
                    <Text style={st.scanButtonText}>Start tap</Text>
                </TouchableOpacity>
            )}
            {s.status === 'active' && (
                <TouchableOpacity
                    style={[st.scanButton, { backgroundColor: '#000' }]}
                    onPress={stopTap}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel="Stop tap"
                >
                    <Text style={st.scanButtonText}>Stop tap</Text>
                </TouchableOpacity>
            )}
            {(s.status === 'starting' || s.status === 'permission' || s.status === 'boot') && (
                <View style={[st.scanButton, { backgroundColor: COLORS.surfaceHigh }]}>
                    <Text style={[st.scanButtonText, { color: COLORS.textDim }]}>Waiting…</Text>
                </View>
            )}
        </View>
    );
}

function AppRow({ app, onOpen }) {
    const spark = store.spark(app.uid);
    const alert = store.hasCleartext(app.uid);
    return (
        <TouchableOpacity style={st.listRow} onPress={() => onOpen(app.uid)} activeOpacity={0.7}>
            <AppIcon app={app} />
            <View style={st.flex}>
                <View style={st.rowC}>
                    <Text style={st.rowTitle} numberOfLines={1}>{app.label}</Text>
                    {alert && <View style={st.alertDot}><Text style={st.alertDotTx}>!</Text></View>}
                </View>
                <Text style={st.rowSub} numberOfLines={1}>{app.pkg}</Text>
            </View>
            <Sparkline data={spark} />
            <View style={st.countCol}>
                <Text style={st.countTx}>{app.conns}</Text>
                <Text style={st.countSub}>live</Text>
            </View>
            <Text style={st.chev}>›</Text>
        </TouchableOpacity>
    );
}

function ListScreen({ nav }) {
    useStore();
    const [q, setQ] = useState('');
    const [sort, setSort] = useState('live');
    const [sheet, setSheet] = useState(false);
    const stats = store.getStats();
    const apps = store.listApps({ query: q, sort });
    const all = store.listApps({ scope: 'all' });

    return (
        <View style={st.screen}>
            <Text style={st.h1}>
                Network <Text style={{ color: COLORS.accent }}>Security</Text>
            </Text>
            <Text style={st.sub}>See which apps connect to the internet in real time.</Text>
            <StatusCard />
            <View style={st.statsRow}>
                <View style={st.statCell}>
                    <Text style={st.statVal}>{stats.monitored}</Text>
                    <Text style={st.statLab}>Apps monitored</Text>
                </View>
                <View style={st.statDiv} />
                <View style={st.statCell}>
                    <Text style={[st.statVal, { color: COLORS.accent }]}>{stats.live}</Text>
                    <Text style={st.statLab}>Live connections</Text>
                </View>
            </View>
            <TouchableOpacity style={st.mapRow} onPress={nav.openTimeline} activeOpacity={0.7}>
                <View style={st.mapIcon}><Text style={{ color: COLORS.accent }}>⇄</Text></View>
                <Text style={st.mapTx}>Overall Network Map</Text>
                <Text style={st.chev}>›</Text>
            </TouchableOpacity>

            <View style={st.search}>
                <Text style={st.searchIcon}>⌕</Text>
                <TextInput style={st.searchInput} placeholder="Search apps or domains…" placeholderTextColor={COLORS.textDim}
                    value={q} onChangeText={setQ} autoCorrect={false} />
            </View>
            <View style={[st.row, { justifyContent: 'space-between' }]}>
                <TouchableOpacity onPress={() => setSheet(true)}>
                    <Chip color={COLORS.accent}>{store.monitoredAll ? `All ${all.length}` : `${store.monitored.size} / ${all.length}`}</Chip>
                </TouchableOpacity>
                <SortMenu value={sort} onChange={setSort}
                    options={[{ key: 'live', label: 'Live connections' }, { key: 'name', label: 'Name' }]} />
            </View>

            <FlatList
                data={apps}
                keyExtractor={(a) => String(a.uid)}
                renderItem={({ item }) => <AppRow app={item} onOpen={nav.openDetail} />}
                contentContainerStyle={st.listPad}
                initialNumToRender={12}
                windowSize={7}
                removeClippedSubviews
                ListEmptyComponent={<Text style={st.empty}>{stats.status === 'boot' ? 'Loading…' : 'No apps match.'}</Text>}
            />

            <Sheet visible={sheet} title="Monitored apps" onClose={() => setSheet(false)}>
                <View style={st.row}>
                    <TouchableOpacity style={st.btnGhost} onPress={() => store.setMonitoredAll(true)}>
                        <Text style={[st.btnGhostTx, { color: COLORS.accent }]}>Select all</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={st.btnGhost} onPress={() => store.setMonitoredAll(false)}>
                        <Text style={st.btnGhostTx}>None</Text>
                    </TouchableOpacity>
                </View>
                <FlatList
                    data={all}
                    keyExtractor={(a) => String(a.uid)}
                    style={st.sheetList}
                    renderItem={({ item }) => {
                        const on = store.monitoredAll || store.monitored.has(item.uid);
                        return (
                            <View style={st.monRow}>
                                <AppIcon app={item} size={30} />
                                <View style={st.flex}>
                                    <Text style={st.rowTitle} numberOfLines={1}>{item.label}</Text>
                                    <Text style={st.rowSub} numberOfLines={1}>{item.pkg}</Text>
                                </View>
                                <Switch value={on} onValueChange={() => store.toggleMonitored(item.uid)}
                                    trackColor={{ true: COLORS.accentDim, false: COLORS.surfaceHigh }}
                                    thumbColor={on ? COLORS.accent : COLORS.textDim} />
                            </View>
                        );
                    }}
                />
            </Sheet>
        </View>
    );
}

function EndpointRow({ ep, expanded, onToggle }) {
    useStore();
    return (
        <View style={st.epWrap}>
            <TouchableOpacity style={st.epRow} onPress={onToggle} activeOpacity={0.7}>
                <LetterIcon text={ep.domain || '•'} color={ep.domain ? COLORS.text : COLORS.textDim} />
                <View style={st.flex}>
                    <Text style={st.rowTitle} numberOfLines={1}>{ep.domain || `Unknown (${ep.proto.toUpperCase()})`}</Text>
                    <Text style={st.rowSub}>{ep.ip}</Text>
                    <Text style={st.rowSub}>{fmtBytes(ep.bytes)} transferred</Text>
                </View>
                <View style={st.epRight}>
                    <Text style={st.countTx}>{ep.count}</Text>
                    <Text style={st.countSub}>connections</Text>
                    <ProtoChips ev={ep} />
                </View>
            </TouchableOpacity>
            {expanded && (
                <View style={st.epExpand}>
                    {ep.recent.map((r, i) => (
                        <View key={i} style={st.connRow}>
                            <Text style={st.connTime}>{fmtClock(r.ts)}</Text>
                            <Chip color={PROTO_COLORS[r.proto] || COLORS.textDim}>{r.proto.toUpperCase()} ({r.port})</Chip>
                            <Text style={st.connMeta}>{r.open ? 'open' : `${fmtDur(r.dur * 1000)} · ${fmtBytes(r.bytes)}`}</Text>
                        </View>
                    ))}
                    {!ep.recent.length && <Text style={st.empty}>No recent connections.</Text>}
                </View>
            )}
        </View>
    );
}

function DetailTimeline({ uid }) {
    useStore();
    const [rk, setRk] = useState('1H');
    const s = store.getSeries(uid, rk);
    const H = 140;
    return (
        <View style={st.card}>
            <Segmented value={rk} onChange={setRk}
                options={[{ key: '1H', label: '1H' }, { key: '24H', label: '24H' }, { key: '7D', label: '7D' }]} />
            <Legend />
            <View style={st.rowC}>
                <Chip color={COLORS.accent}>{s.total} connections</Chip>
                {s.clear > 0 && <Chip color={COLORS.warn}>{s.clear} cleartext</Chip>}
            </View>
            <View style={{ height: H + 26 }}>
                <View style={[st.row, { height: H, alignItems: 'flex-end' }]}>
                    {s.cells.map((c, i) => (
                        <View key={i} style={{ flex: 1, marginHorizontal: 0.5, justifyContent: 'flex-end', height: H }}>
                            {['tls', 'quic', 'clear', 'iponly', 'other'].map((k) =>
                                c[k] ? (
                                    <View key={k} style={{
                                        height: Math.max(2, (c[k] / s.max) * (H - 8)),
                                        backgroundColor: PROTO_COLORS[k], opacity: 0.9, borderRadius: 2, marginBottom: 1,
                                    }} />
                                ) : null)}
                        </View>
                    ))}
                    <LiveCursor />
                </View>
                <View style={[st.row, { height: 14 }]}>
                    {s.ticks.map((t) => (
                        <Text key={t.c} style={[st.tickTx, { position: 'absolute', left: `${(t.c / s.cols) * 100}%` }]}>{t.label}</Text>
                    ))}
                </View>
            </View>
        </View>
    );
}

function DetailScreen({ uid, nav }) {
    useStore();
    const [tab, setTab] = useState('connections');
    const [sort, setSort] = useState('activity');
    const [openKey, setOpenKey] = useState(null);
    const app = store.getApp(uid);
    const eps = app ? store.listEndpoints(uid, { sort }) : [];
    if (!app) {
        return <View style={st.screen}><Back onPress={nav.back} /><Text style={st.empty}>App not found.</Text></View>;
    }
    return (
        <View style={st.screen}>
            <Back onPress={nav.back} />
            <View style={st.row}>
                <AppIcon app={app} size={52} />
                <View style={st.flex}>
                    <Text style={st.h2}>{app.label}</Text>
                    <Text style={st.rowSub}>{app.pkg}</Text>
                </View>
            </View>
            <Segmented value={tab} onChange={setTab}
                options={[{ key: 'connections', label: 'Connections' }, { key: 'timeline', label: 'Timeline' }]} />

            {tab === 'connections' ? (
                <>
                    <View style={[st.row, { justifyContent: 'space-between' }]}>
                        <Text style={st.secTitle}>Live endpoints ({eps.length})</Text>
                        <SortMenu value={sort} onChange={setSort}
                            options={[{ key: 'activity', label: 'Activity' }, { key: 'count', label: 'Connections' }, { key: 'name', label: 'Name' }]} />
                    </View>
                    <FlatList
                        data={eps}
                        keyExtractor={(e) => `${e.ip}|${e.proto}`}
                        renderItem={({ item }) => {
                            const k = `${item.ip}|${item.proto}`;
                            return (
                                <EndpointRow ep={item} expanded={openKey === k}
                                    onToggle={() => setOpenKey(openKey === k ? null : k)} />
                            );
                        }}
                        contentContainerStyle={st.listPad}
                        ListEmptyComponent={<Text style={st.empty}>No connections captured for this app yet.</Text>}
                    />
                    <View style={st.footNote}>
                        <Text style={st.info}>ⓘ </Text>
                        <Text style={st.footTx}>
                            Domain names are read locally from TLS SNI and DNS traffic. When neither is available (e.g. encrypted DNS/QUIC), only the IP is shown.
                        </Text>
                    </View>
                </>
            ) : (
                <ScrollView contentContainerStyle={st.listPad}><DetailTimeline uid={uid} /></ScrollView>
            )}
        </View>
    );
}

function RecentRow({ ev }) {
    const app = store.getApp(ev.uid);
    return (
        <View style={st.recRow}>
            <Text style={st.recTime}>{fmtClock(ev.ts)}</Text>
            <LetterIcon text={ev.domain || '•'} color={PROTO_COLORS[ev.cat]} size={26} />
            <Text style={st.recDom} numberOfLines={1}>{ev.domain || `unknown (${ev.proto})`}</Text>
            <AppIcon app={app} size={22} />
            <Text style={st.recApp} numberOfLines={1}>{app?.label || `UID ${ev.uid}`}</Text>
            <Chip color={PROTO_COLORS[ev.proto] || COLORS.textDim}>{ev.proto.toUpperCase()} ({ev.port})</Chip>
        </View>
    );
}

function TimelineScreen({ nav }) {
    useStore();
    const [rk, setRk] = useState('1H');
    const tl = store.getTimeline(rk);
    const LABEL_W = 108, COUNT_W = 30;
    const recent = store.getRecent(25);
    return (
        <ScrollView style={st.screen} contentContainerStyle={{ paddingBottom: 40 }}>
            <Back onPress={nav.back} />
            <Text style={st.h1}>Connection Timeline</Text>
            <Text style={st.sub}>Visualize when apps connect to the internet.</Text>
            <Segmented value={rk} onChange={setRk}
                options={[{ key: '1H', label: '1H' }, { key: '24H', label: '24H' }, { key: '7D', label: '7D' }]} />
            <Legend />

            <View style={st.card}>
                <View style={[st.row, { height: 14, marginLeft: LABEL_W, marginRight: COUNT_W }]}>
                    {tl.ticks.map((t) => (
                        <Text key={t.c} style={[st.tickTx, { position: 'absolute', left: `${(t.c / tl.cols) * 100}%` }]}>{t.label}</Text>
                    ))}
                </View>
                <View style={{ marginTop: 8 }}>
                    {tl.rows.map((r) => (
                        <View key={r.uid} style={[st.row, st.tlRow]}>
                            <View style={[st.rowC, { width: LABEL_W }]}>
                                <AppIcon app={{ label: r.label, icon: r.icon }} size={20} />
                                <Text style={st.tlLabel} numberOfLines={1}>{r.label}</Text>
                            </View>
                            <View style={st.flexRow}>
                                {r.cells.map((c, i) => (
                                    <View key={i} style={[st.tlCell, c.cat
                                        ? { backgroundColor: PROTO_COLORS[c.cat], opacity: Math.min(1, 0.3 + 0.7 * (c.n / tl.max)) }
                                        : { backgroundColor: COLORS.border, opacity: 0.35 }]} />
                                ))}
                            </View>
                            <Text style={[st.tlCount, { width: COUNT_W }]}>{r.total}</Text>
                        </View>
                    ))}
                    {!tl.rows.length && <Text style={st.empty}>No activity in this window yet.</Text>}
                </View>
                <View style={[st.row, { marginTop: 6 }]}>
                    <View style={{ width: LABEL_W }} />
                    <View style={st.flexRow}><LiveCursor /></View>
                    <View style={{ width: COUNT_W }} />
                </View>
            </View>

            <View style={st.card}>
                <Text style={st.secTitle}>Recent Activity (live)</Text>
                {recent.map((ev, i) => <RecentRow key={`${ev.ts}-${i}`} ev={ev} />)}
                {!recent.length && <Text style={st.empty}>Waiting for connections…</Text>}
            </View>
        </ScrollView>
    );
}

export default function NetworkDetails() {
    const [route, setRoute] = useState({ name: 'list' });
    const nav = useMemo(() => ({
        openDetail: (uid) => setRoute({ name: 'detail', uid }),
        openTimeline: () => setRoute({ name: 'timeline' }),
        back: () => setRoute({ name: 'list' }),
    }), []);
    return (
        <View style={st.root}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />
            {route.name === 'list' && <ListScreen nav={nav} />}
            {route.name === 'detail' && <DetailScreen uid={route.uid} nav={nav} />}
            {route.name === 'timeline' && <TimelineScreen nav={nav} />}
        </View>
    );
}

const st = StyleSheet.create({
    root: { flex: 1, backgroundColor: COLORS.bg },
    screen: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 16, paddingTop: 18 },
    flex: { flex: 1 }, flexRow: { flex: 1, flexDirection: 'row' },
    row: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
    rowC: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    h1: { color: '#000', fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
    h2: { color: COLORS.text, fontSize: 20, fontWeight: '700' },
    sub: { color: COLORS.textDim, fontSize: 13, marginTop: 4, marginBottom: 12 },
    info: { color: COLORS.textDim, fontSize: 13 },
    chev: { color: COLORS.textDim, fontSize: 20, marginLeft: 8 },
    backTx: { color: COLORS.text, fontSize: 18 },
    banner: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.accentDim, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, padding: 12, marginTop: 8 },
    bannerIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
    bannerText: { flex: 1, marginLeft: 10, marginRight: 8 },
    bannerTitle: { color: COLORS.text, fontSize: 14.5, fontWeight: '700' },
    bannerDesc: { color: COLORS.textDim, fontSize: 12, marginTop: 2 },
    scanButton: { backgroundColor: COLORS.accent, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 11 },
    scanButtonText: { color: COLORS.onAccent, fontSize: 12.5, fontWeight: '800' },
    card: { backgroundColor: COLORS.surface, borderColor: COLORS.border, borderWidth: 1, borderRadius: 14, padding: 14, marginTop: 12 },
    cardTitle: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
    cardBody: { color: COLORS.textDim, fontSize: 12, marginTop: 4, lineHeight: 18 },
    shield: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    btnAccent: { backgroundColor: COLORS.accent, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8, marginTop: 10, alignSelf: 'flex-start' },
    btnAccentTx: { color: COLORS.onAccent, fontWeight: '700' },
    btnGhost: { borderColor: COLORS.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, marginTop: 10, marginRight: 8 },
    btnGhostTx: { color: COLORS.textDim, fontWeight: '600' },
    retryHint: { color: COLORS.textDim, fontSize: 11, marginTop: 16, marginLeft: 4 },
    statsRow: { flexDirection: 'row', backgroundColor: COLORS.surface, borderColor: COLORS.border, borderWidth: 1, borderRadius: 14, marginTop: 12, paddingVertical: 12 },
    statCell: { flex: 1, paddingHorizontal: 16 },
    statDiv: { width: 1, backgroundColor: COLORS.border },
    statVal: { color: COLORS.text, fontSize: 22, fontWeight: '700' },
    statLab: { color: COLORS.textDim, fontSize: 11, marginTop: 2 },
    mapRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceHigh, borderColor: COLORS.border, borderWidth: 1, borderRadius: 14, padding: 12, marginTop: 12 },
    mapIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: COLORS.accentDim, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
    mapTx: { color: COLORS.text, fontSize: 14, fontWeight: '600', flex: 1 },
    chip: { borderColor: COLORS.border, borderWidth: 1, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2, backgroundColor: COLORS.surfaceHigh },
    chipTx: { fontSize: 10, fontWeight: '600' },
    search: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderColor: COLORS.border, borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, marginTop: 10 },
    searchIcon: { color: COLORS.textDim, fontSize: 16, marginRight: 6 },
    searchInput: { flex: 1, color: COLORS.text, fontSize: 13, paddingVertical: 10 },
    sortTx: { color: COLORS.textDim, fontSize: 12 },
    sortTxOn: { color: COLORS.text, fontSize: 12, fontWeight: '600' },
    seg: { flexDirection: 'row', backgroundColor: COLORS.surface, borderColor: COLORS.border, borderWidth: 1, borderRadius: 12, padding: 3, marginTop: 12 },
    segBtn: { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center' },
    segBtnOn: { backgroundColor: COLORS.accentDim, borderWidth: 1, borderColor: COLORS.accent },
    segTx: { color: COLORS.textDim, fontSize: 13, fontWeight: '600' },
    segTxOn: { color: COLORS.accent },
    legItem: { flexDirection: 'row', alignItems: 'center', marginRight: 14, marginTop: 10 },
    legDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
    legTx: { color: COLORS.textDim, fontSize: 11 },
    listPad: { paddingBottom: 30, paddingTop: 6 },
    listRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 10 },
    rowTitle: { color: COLORS.text, fontSize: 14, fontWeight: '600', flexShrink: 1 },
    rowSub: { color: COLORS.textDim, fontSize: 11, marginTop: 2 },
    alertDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: COLORS.warnDim, borderWidth: 1, borderColor: COLORS.warn, alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
    alertDotTx: { color: COLORS.warn, fontSize: 9, fontWeight: '700' },
    countCol: { alignItems: 'flex-end', minWidth: 30 },
    countTx: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
    countSub: { color: COLORS.textDim, fontSize: 9 },
    iconFall: { backgroundColor: COLORS.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
    iconFallTx: { color: COLORS.textDim, fontWeight: '700' },
    empty: { color: COLORS.textDim, fontSize: 13, textAlign: 'center', marginTop: 24 },
    sheetBack: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 18, borderTopRightRadius: 18, borderColor: COLORS.border, borderWidth: 1, maxHeight: '70%', padding: 16 },
    sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    sheetTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
    sheetClose: { color: COLORS.textDim, fontSize: 15 },
    sheetList: { maxHeight: 420 },
    monRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10 },
    optRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    optTx: { color: COLORS.text, fontSize: 14 },
    secTitle: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
    epWrap: { backgroundColor: COLORS.surface, borderColor: COLORS.border, borderWidth: 1, borderRadius: 14, marginTop: 10, overflow: 'hidden' },
    epRow: { flexDirection: 'row', padding: 12, gap: 10 },
    epRight: { alignItems: 'flex-end', gap: 3 },
    epExpand: { backgroundColor: COLORS.surfaceHigh, borderTopWidth: 1, borderTopColor: COLORS.border, padding: 12 },
    connRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
    connTime: { color: COLORS.textDim, fontSize: 11, width: 62 },
    connMeta: { color: COLORS.textDim, fontSize: 11, flex: 1, textAlign: 'right' },
    footNote: { flexDirection: 'row', backgroundColor: COLORS.surface, borderColor: COLORS.border, borderWidth: 1, borderRadius: 12, padding: 10, marginTop: 12 },
    footTx: { color: COLORS.textDim, fontSize: 11, flex: 1, lineHeight: 16 },
    tickTx: { color: COLORS.textDim, fontSize: 9 },
    tlRow: { marginTop: 6 },
    tlLabel: { color: COLORS.textDim, fontSize: 10, marginLeft: 6, flex: 1 },
    tlCell: { flex: 1, height: 14, borderRadius: 3, marginHorizontal: 0.5 },
    tlCount: { color: COLORS.textDim, fontSize: 10, textAlign: 'right' },
    cursor: { position: 'absolute', right: 0, top: -8, bottom: -14, alignItems: 'center', width: 10 },
    cursorDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.accent },
    cursorLine: { flex: 1, width: 1, backgroundColor: COLORS.accent, opacity: 0.7 },
    cursorTx: { color: COLORS.textDim, fontSize: 9, marginTop: 2 },
    recRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    recTime: { color: COLORS.textDim, fontSize: 10, width: 56 },
    recDom: { color: COLORS.text, fontSize: 12, flex: 1.2 },
    recApp: { color: COLORS.textDim, fontSize: 11, flex: 1 },
});