import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    Image,
    View,
    Platform,
    TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import RBSheet from 'react-native-raw-bottom-sheet';
import { COLORS } from '../../constants';
import * as F from './details-function';


const TONE = {
    accent: { fg: COLORS.accent, bg: COLORS.accentDim },
    warn: { fg: COLORS.warn, bg: COLORS.warnDim },
    danger: { fg: COLORS.danger, bg: COLORS.dangerDim },
    dim: { fg: COLORS.textDim, bg: COLORS.surfaceHigh },
};
const AVATAR_FG = [COLORS.accent, COLORS.warn, COLORS.danger, COLORS.textDim];
const avatarFg = (pkg) => AVATAR_FG[(pkg || '').length % AVATAR_FG.length];


const Chip = ({ tone = 'dim', children, small }) => (
    <View style={[st.chip, small && st.chipSmall, { backgroundColor: TONE[tone].bg }]}>
        <Text style={[st.chipText, small && st.chipTextSmall, { color: TONE[tone].fg }]} numberOfLines={1}>
            {children}
        </Text>
    </View>
);

const Btn = ({ label, onPress, kind = 'ghost', disabled, style }) => (
    <Pressable
        onPress={onPress}
        disabled={disabled}
        style={[
            st.btn,
            kind === 'primary' && { backgroundColor: COLORS.accent },
            kind === 'danger' && { backgroundColor: COLORS.dangerDim },
            disabled && { opacity: 0.45 },
            style,
        ]}
    >
        <Text
            style={[
                st.btnText,
                kind === 'primary' && { color: COLORS.onAccent },
                kind === 'danger' && { color: COLORS.danger },
            ]}
        >
            {label}
        </Text>
    </Pressable>
);

const ScoreBar = ({ label, score, tone }) => (
    <View style={st.scoreRow}>
        <Text style={st.scoreLabel}>{label}</Text>
        <View style={st.scoreTrack}>
            <View
                style={[
                    st.scoreFill,
                    { width: `${Math.round((score == null ? 0 : score) * 100)}%`, backgroundColor: TONE[tone].fg },
                ]}
            />
        </View>
        <Text style={[st.scoreVal, { color: TONE[tone].fg }]}>{score == null ? '–' : score.toFixed(2)}</Text>
    </View>
);

const AppAvatar = React.memo(function AppAvatar({ item, selecting, selected }) {
    const [iconBroken, setIconBroken] = useState(false);
    if (selecting) {
        return (
            <View style={[st.avatar, { backgroundColor: COLORS.surfaceHigh }]}>
                <View style={[st.check, selected && { backgroundColor: COLORS.accent, borderColor: COLORS.accent }]}>
                    {selected ? <Text style={st.checkTick}>✓</Text> : null}
                </View>
            </View>
        );
    }
    if (item.icon && !iconBroken) {
        return (
            <Image
                source={{ uri: item.icon }}
                style={[st.avatar, { backgroundColor: COLORS.surfaceHigh }]}
                resizeMode="cover"
                onError={() => setIconBroken(true)}
            />
        );
    }
    return (
        <View style={[st.avatar, { backgroundColor: COLORS.surfaceHigh }]}>
            <Text style={[st.avatarText, { color: avatarFg(item.pkg) }]}>
                {(item.appLabel || '?').charAt(0).toUpperCase()}
            </Text>
        </View>
    );
});

const NotifCard = React.memo(function NotifCard({ item, selecting, selected, expanded, onPress, onLongPress }) {
    const sev = item.analysis?.severity;
    const chip = sev ? F.SEVERITY_CHIP[sev] : null;
    const lc = item.analysis?.linkCheck;
    const displayText = item.translatedText || item.body || '';
    return (
        <Pressable
            onPress={onPress}
            onLongPress={onLongPress}
            style={[st.card, selected && { borderColor: COLORS.accent }]}
        >
            <View style={st.cardRow}>
                <AppAvatar item={item} selecting={selecting} selected={selected} />
                <View style={st.cardMain}>
                    <View style={st.cardHead}>
                        <Text style={st.appLabel} numberOfLines={1}>{item.appLabel}</Text>
                        <Text style={st.time}>{F.timeAgo(item.postedAt)}</Text>
                    </View>
                    <Text style={st.title} numberOfLines={1}>{item.title}</Text>
                    {!!displayText && (
                        <Text style={st.body} numberOfLines={expanded ? undefined : 1}>
                            {displayText}
                        </Text>
                    )}
                    <View style={st.chipRow}>
                        {chip && <Chip tone={chip.tone} small>{chip.label}</Chip>}
                        {!chip && <Chip tone="dim" small>Not scanned</Chip>}
                        {lc?.verdict === 'verified' && <Chip tone="accent" small>Verified Official Domain</Chip>}
                        {(lc?.verdict === 'unverified' || lc?.verdict === 'mixed') && (
                            <Chip tone="warn" small>Unverified link · caution</Chip>
                        )}
                        {item.translationStatus === 'translated' && <Chip tone="accent" small>Translated</Chip>}
                        {item.translationStatus === 'model_missing' && <Chip tone="warn" small>Model missing</Chip>}
                        {item.translationStatus === 'stalled' && <Chip tone="dim" small>Translation stalled</Chip>}
                    </View>

                    {expanded && (
                        <View style={st.expandBox}>
                            {item.translatedText && !!item.body && (
                                <Text style={st.originalText}>Original: {item.body}</Text>
                            )}
                            {item.analysis ? (
                                <>
                                    <ScoreBar label="Semantic suspicion" score={item.analysis.susp} tone={item.analysis.susp >= 0.45 ? 'danger' : item.analysis.susp >= 0.2 ? 'warn' : 'accent'} />
                                    <ScoreBar label="Adversarial spam" score={item.analysis.spam} tone={item.analysis.spam >= 0.45 ? 'danger' : item.analysis.spam >= 0.2 ? 'warn' : 'accent'} />
                                    {item.analysis.labels.map((l, i) => (
                                        <Chip key={`${l.key}-${i}`} tone={l.tone} small>{l.text}</Chip>
                                    ))}
                                    <Text style={st.metaText}>
                                        {item.pkg} · analyzed {F.timeAgo(item.analysis.analyzedAt)}
                                    </Text>
                                </>
                            ) : (
                                <Text style={st.metaText}>Not sent for analysis yet.</Text>
                            )}
                            {item.links?.length > 0 && (
                                <View style={st.linkBox}>
                                    {item.links.map((u) => {
                                        const d = F.parseRegistrableDomain(u);
                                        return (
                                            <Text key={u} style={[st.linkText, { color: d.verified ? COLORS.accent : COLORS.warn }]} numberOfLines={1}>
                                                {d.verified ? '✓' : '!'} {u}
                                            </Text>
                                        );
                                    })}
                                </View>
                            )}
                        </View>
                    )}
                </View>
            </View>
        </Pressable>
    );
});


const STAGE_LABELS = ['Preparing selection', 'Language identification', 'Server analysis', 'Saving & labeling'];

const ProgressModal = ({ progress: p, phase, blocked, onDownload, onSendWithout, onCancel, downloading }) => {
    if (!p && phase !== 'decision') return null;
    return (
        <Modal transparent animationType="fade" visible onRequestTransparent={() => { }}>
            <View style={st.overlay}>
                <View style={st.modalCard}>
                    <Text style={st.modalTitle}>{phase === 'decision' ? 'Missing translation models' : 'Analyzing notifications'}</Text>

                    {phase !== 'decision' && p && (
                        <>
                            <View style={st.stageList}>
                                {STAGE_LABELS.map((label, i) => {
                                    const done = p.stageIndex > i;
                                    const active = p.stageIndex === i;
                                    return (
                                        <View key={label} style={st.stageRow}>
                                            <View style={[st.stageDot, { backgroundColor: done ? COLORS.accent : active ? COLORS.warn : COLORS.surfaceHigh }]}>
                                                {done ? <Text style={st.stageTick}>✓</Text> : null}
                                                {active ? <View style={st.stagePulse} /> : null}
                                            </View>
                                            <Text style={[st.stageLabel, { color: done ? COLORS.text : active ? COLORS.text : COLORS.textDim }]}>
                                                {label}
                                                {active && p.itemCount ? ` · ${Math.min(p.itemIndex + 1, p.itemCount)}/${p.itemCount}` : ''}
                                            </Text>
                                        </View>
                                    );
                                })}
                            </View>
                            <View style={st.barTrack}>
                                <View style={[st.barFill, { width: `${p.percent}%` }]} />
                            </View>
                            <Text style={st.progressMsg} numberOfLines={1}>{p.message || 'Working…'} · {p.percent}%</Text>
                        </>
                    )}

                    {phase === 'decision' && (
                        <>
                            <Text style={st.modalBody}>
                                These items are in languages whose on-device translation model is not downloaded. They will NOT be sent unless you download the model:
                            </Text>
                            <ScrollView style={st.blockedList} nestedScrollEnabled>
                                {blocked.map((b) => (
                                    <View key={b.id} style={st.blockedRow}>
                                        <Text style={st.blockedText} numberOfLines={1}>
                                            {b.appLabel} · [{b.lang}] {b.preview}
                                        </Text>
                                    </View>
                                ))}
                            </ScrollView>
                            <View style={st.modalActions}>
                                <Btn label={downloading ? 'Downloading…' : 'Download & include'} kind="primary" onPress={onDownload} disabled={downloading} />
                                <Btn label="Send without them" onPress={onSendWithout} />
                                <Btn label="Cancel" onPress={onCancel} />
                            </View>
                        </>
                    )}
                </View>
            </View>
        </Modal>
    );
};
const STATUS_PAD = Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0;


export default function NotificationScreen() {
    const [boot, setBoot] = useState('loading');
    const [bootError, setBootError] = useState(null);
    const [items, setItems] = useState([]);
    const [meta, setMeta] = useState(null);
    const [listener, setListener] = useState({ supported: true, granted: false, checked: false });
    const [win, setWin] = useState('all');
    const [selectedPkgs, setSelectedPkgs] = useState([]);
    const appSheetRef = useRef(null);
    const [page, setPage] = useState(1);
    const [selecting, setSelecting] = useState(false);
    const [selected, setSelected] = useState([]);
    const [expandedId, setExpandedId] = useState(null);
    const [progress, setProgress] = useState(null);
    const [phase, setPhase] = useState('idle');
    const [blocked, setBlocked] = useState([]);
    const [pendingSendable, setPendingSendable] = useState([]);
    const [decisionIds, setDecisionIds] = useState([]);
    const [downloading, setDownloading] = useState(false);
    const [liModal, setLiModal] = useState(null);
    const [trModal, setTrModal] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [snack, setSnack] = useState(null);
    const [warn, setWarn] = useState(null);

    const mounted = useRef(true);
    const busy = useRef(false);
    const snackTimer = useRef(null);

    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);

    const reload = useCallback(async () => {
        const store = await F.getStore();
        if (!mounted.current) return;
        setItems(await F.withAppMeta(F.listItems(store)));
        setMeta(store.meta);
        setWarn(F.getStoreWarning());
    }, []);

    const showSnack = useCallback((msg) => {
        setSnack(msg);
        clearTimeout(snackTimer.current);
        snackTimer.current = setTimeout(() => mounted.current && setSnack(null), 2600);
    }, []);

    const safeProgress = useCallback((p) => mounted.current && setProgress(p), []);

    useEffect(() => {
        (async () => {
            try {
                await reload();
                const st = await F.getListenerStatus();
                if (!mounted.current) return;
                setListener({ ...st, checked: true });
                const li = await F.checkLanguageIdModel();
                if (!mounted.current) return;
                if (!li.ready) setLiModal(li);
                await F.processPendingTranslations((it) => mounted.current && setTrModal(it));
                if (!mounted.current) return;
                setBoot('ready');
            } catch (e) {
                if (mounted.current) {
                    setBootError(e?.message || 'Failed to initialise');
                    setBoot('error');
                }
            }
        })();
    }, [reload]);

    useEffect(() => {
        if (boot !== 'ready') return undefined;
        return F.subscribeLiveUpdates(() => {
            reload();
            F.processPendingTranslations((it) => mounted.current && setTrModal(it));
        });
    }, [boot, reload]);

    const filtered = useMemo(() => F.filterItems(items, win, selectedPkgs), [items, win, selectedPkgs]);
    const visible = useMemo(
        () => (win === 'all' ? filtered.slice(0, page * F.PAGE_SIZE) : filtered),
        [filtered, win, page],
    );
    const stats = useMemo(() => computeStatsSafe(items), [items]);
    const apps = useMemo(() => F.appOptions(F.filterItems(items, win, null)), [items, win]);

    useEffect(() => setPage(1), [win, selectedPkgs]);

    const toggleSelect = useCallback(
        (id) => {
            setSelected((prev) => {
                if (prev.includes(id)) return prev.filter((x) => x !== id);
                if (prev.length >= F.MAX_BATCH) {
                    showSnack(`Max ${F.MAX_BATCH} items per scan`);
                    return prev;
                }
                return [...prev, id];
            });
        },
        [showSnack],
    );

    const enterSelection = useCallback((id) => {
        setSelecting(true);
        setSelected(id ? [id] : []);
    }, []);

    const submit = useCallback(
        async (ids) => {
            setPhase('running');
            const res = await F.submitBatchForAnalysis(ids, { onProgress: safeProgress });
            if (!mounted.current) return res;
            await reload();
            setSelecting(false);
            setSelected([]);
            setPhase('idle');
            setProgress(null);
            setBlocked([]);
            showSnack(`Analyzed ${res.analyzed}${res.failed ? ` · ${res.failed} failed` : ''}`);
            return res;
        },
        [reload, safeProgress, showSnack],
    );

    const runPipeline = useCallback(
        async (ids) => {
            if (busy.current || !ids?.length) return;
            busy.current = true;
            setDecisionIds(ids);
            setPhase('running');
            setProgress(F.prepareBatchForAnalysis ? null : null);
            try {
                const prep = await F.prepareBatchForAnalysis(ids, { onProgress: safeProgress });
                if (!mounted.current) return;
                if (prep.blocked.length) {
                    setBlocked(prep.blocked);
                    setPendingSendable(prep.sendable);
                    setPhase('decision');
                    return;
                }
                await submit(prep.sendable);
            } catch (e) {
                if (mounted.current) {
                    showSnack(`Scan failed: ${e?.message || e}`);
                    setPhase('idle');
                    setProgress(null);
                }
            } finally {
                busy.current = false;
            }
        },
        [safeProgress, submit, showSnack],
    );

    const onDownloadAndRetry = useCallback(async () => {
        setDownloading(true);
        try {
            const userLang = await F.getUserLanguage();
            await F.downloadModelsFor(blocked.map((b) => b.lang), userLang, safeProgress);
            if (!mounted.current) return;
            setDownloading(false);
            setPhase('running');
            const prep = await F.prepareBatchForAnalysis(decisionIds, { onProgress: safeProgress });
            if (!mounted.current) return;
            if (prep.blocked.length) {
                setBlocked(prep.blocked);
                setPendingSendable(prep.sendable);
                setPhase('decision');
                showSnack('Some models still unavailable');
                return;
            }
            await submit(prep.sendable);
        } catch (e) {
            if (mounted.current) showSnack(`Download failed: ${e?.message || e}`);
        } finally {
            if (mounted.current) setDownloading(false);
        }
    }, [blocked, decisionIds, safeProgress, submit, showSnack]);

    const onSendWithout = useCallback(async () => {
        const ids = pendingSendable;
        setPhase('running');
        setBlocked([]);
        if (!ids.length) {
            setPhase('idle');
            setProgress(null);
            showSnack('Nothing sendable in this batch');
            return;
        }
        try {
            await submit(ids);
            showSnack(`Skipped ${blocked.length} item(s) missing models`);
        } catch (e) {
            showSnack(`Scan failed: ${e?.message || e}`);
            setPhase('idle');
            setProgress(null);
        }
    }, [pendingSendable, blocked.length, submit, showSnack]);

    const onCancelDecision = useCallback(() => {
        setPhase('idle');
        setProgress(null);
        setBlocked([]);
        setPendingSendable([]);
        setSelecting(false);
        setSelected([]);
    }, []);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await reload();
        await F.processPendingTranslations((it) => mounted.current && setTrModal(it));
        if (mounted.current) setRefreshing(false);
    }, [reload]);

    const quickScan = useCallback(() => runPipeline(F.autoPickIds(F.filterItems(items, win === 'all' ? 'h24' : win, selectedPkgs))), [runPipeline, items, win, selectedPkgs]);

    const resolveTr = useCallback(
        async (action) => {
            const id = trModal?.id;
            setTrModal(null);
            if (!id) return;
            const res = await F.resolveTranslation(id, action);
            await reload();
            showSnack(action === 'download' ? (res.ok ? 'Model downloaded & translated' : 'Download failed') : 'Translation stalled for this item');
            F.processPendingTranslations((it) => mounted.current && setTrModal(it));
        },
        [trModal, reload, showSnack],
    );

    const renderCard = useCallback(
        ({ item }) => (
            <NotifCard
                item={item}
                selecting={selecting}
                selected={selected.includes(item.id)}
                expanded={expandedId === item.id}
                onPress={() => (selecting ? toggleSelect(item.id) : setExpandedId((p) => (p === item.id ? null : item.id)))}
                onLongPress={() => (selecting ? toggleSelect(item.id) : enterSelection(item.id))}
            />
        ),
        [selecting, selected, expandedId, toggleSelect, enterSelection],
    );

    const listHeader = (
        <View>
            <View style={st.header}>
                <Text style={st.h1}>
                    Notification <Text style={{ color: COLORS.accent }}>Security</Text>
                </Text>
                <Text style={st.h2}>Smarter alerts. Safer you.</Text>
            </View>

            {warn && (
                <View style={[st.banner, { backgroundColor: COLORS.warnDim }]}>
                    <Text style={[st.bannerText, { color: COLORS.warn }]}>{warn}</Text>
                </View>
            )}
            {listener.checked && !listener.supported && (
                <View style={[st.banner, { backgroundColor: COLORS.surfaceHigh }]}>
                    <Text style={[st.bannerText, { color: COLORS.textDim }]}>
                        Notification listener unavailable in this build — showing locally stored items only.
                    </Text>
                </View>
            )}

            <View style={st.statusCard}>
                <View style={st.statusTop}>
                    <View style={st.statusLeft}>
                        <View style={st.monRow}>
                            <View style={[st.dot, { backgroundColor: listener.granted ? COLORS.accent : COLORS.warn }]} />
                            <Text style={[st.monText, { color: listener.granted ? COLORS.accent : COLORS.warn }]}>
                                {listener.granted ? 'Monitoring notifications' : 'Monitoring paused'}
                            </Text>
                        </View>
                        <Text style={st.statusTitle}>
                            You’re <Text style={{ color: listener.granted ? COLORS.accent : COLORS.warn }}>{listener.granted ? 'Covered' : 'Exposed'}</Text>
                        </Text>
                        <Text style={st.statusSub}>We scan your notifications and flag suspicious activity.</Text>
                    </View>
                </View>
                <View style={st.statRow}>
                    <View style={st.statCell}>
                        <Text style={st.statNum}>{stats.scanned}</Text>
                        <Text style={st.statLabel}>Captured</Text>
                    </View>
                    <View style={st.statDivider} />
                    <View style={st.statCell}>
                        <Text style={[st.statNum, { color: stats.flagged ? COLORS.danger : COLORS.text }]}>{stats.flagged}</Text>
                        <Text style={st.statLabel}>Flagged</Text>
                    </View>
                    <View style={st.statDivider} />
                    <View style={st.statCell}>
                        <Text style={[st.statNum, { color: COLORS.accent }]}>{stats.analyzed}</Text>
                        <Text style={st.statLabel}>Analyzed</Text>
                    </View>
                </View>
                <View style={st.ctaRow}>
                    <Btn label="Scan last 10" kind="primary" onPress={quickScan} disabled={phase !== 'idle' || !filtered.length} style={st.ctaBtn} />
                    <Btn label="Select manually" onPress={() => enterSelection(null)} disabled={phase !== 'idle' || !filtered.length} style={st.ctaBtn} />
                </View>
            </View>

            {!listener.granted && (
                <Pressable
                    style={st.permRow}
                    onPress={() => F.openListenerSettings().then(() => setTimeout(async () => setListener({ ...(await F.getListenerStatus()), checked: true }), 800))}
                >
                    <View style={[st.permIcon, { backgroundColor: COLORS.accentDim }]}>
                        <Text style={{ color: COLORS.accent }}>ⓘ</Text>
                    </View>
                    <View style={st.permText}>
                        <Text style={st.permTitle}>Notification Access</Text>
                        <Text style={st.permSub}>Required to scan your notifications</Text>
                    </View>
                    <Text style={{ color: COLORS.warn }}>
                        {listener.checked ? 'Grant →' : '…'}
                    </Text>
                </Pressable>
            )}

            {!meta?.hasScanned && items.length > 0 && (
                <View style={st.firstRun}>
                    <Text style={st.firstRunTitle}>No scans yet</Text>
                    <Text style={st.firstRunSub}>Run a first analysis on your recent notifications, or hand-pick up to 10 items.</Text>
                </View>
            )}

            <View style={st.filterBar}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.filterScroll}>
                    {F.TIME_WINDOWS.map((w) => (
                        <Pressable key={w.key} style={[st.filterChip, win === w.key && { backgroundColor: COLORS.accentDim, borderColor: COLORS.accent }]} onPress={() => setWin(w.key)}>
                            <Text style={[st.filterChipText, win === w.key && { color: COLORS.accent }]}>{w.label}</Text>
                        </Pressable>
                    ))}
                    <Pressable
                        style={[
                            st.filterChip,
                            st.filterIconChip,
                            selectedPkgs.length > 0 && { backgroundColor: COLORS.accentDim, borderColor: COLORS.accent },
                        ]}
                        onPress={() => appSheetRef.current?.open()}
                    >
                        <Ionicons
                            name="filter"
                            size={14}
                            color={selectedPkgs.length > 0 ? COLORS.accent : COLORS.textDim}
                        />
                        {selectedPkgs.length > 0 && (
                            <View style={st.filterBadge}>
                                <Text style={st.filterBadgeText}>{selectedPkgs.length}</Text>
                            </View>
                        )}
                    </Pressable>
                </ScrollView>
                {selecting && (
                    <View style={st.selBar}>
                        <Text style={st.selCount}>{selected.length} / {F.MAX_BATCH} selected</Text>
                        <Btn label="Scan" kind="primary" disabled={!selected.length || phase !== 'idle'} onPress={() => runPipeline(selected)} style={st.selBtn} />
                        <Btn label="Auto 10" disabled={phase !== 'idle'} onPress={() => runPipeline(F.autoPickIds(filtered))} style={st.selBtn} />
                        <Btn label="Done" onPress={() => { setSelecting(false); setSelected([]); }} style={st.selBtn} />
                    </View>
                )}
            </View>
        </View>
    );

    if (boot === 'loading') {
        return (
            <View style={st.screen}>
                <StatusBar barStyle="dark-content" backgroundColor="#fff" />
                <View style={st.center}>
                    <ActivityIndicator color={COLORS.accent} />
                    <Text style={st.centerText}>Loading local store…</Text>
                </View>
            </View>
        );
    }

    if (boot === 'error') {
        return (
            <View style={st.screen}>
                <StatusBar barStyle="dark-content" backgroundColor="#fff" />
                <View style={st.center}>
                    <Text style={[st.centerText, { color: COLORS.danger }]}>{bootError}</Text>
                    <Btn label="Retry" kind="primary" onPress={() => { setBoot('loading'); setBootError(null); }} />
                </View>
            </View>
        );
    }

    return (
        <View style={st.screen}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />
            <FlatList
                data={visible}
                keyExtractor={(it) => it.id}
                renderItem={renderCard}
                ListHeaderComponent={listHeader}
                ListEmptyComponent={
                    <View style={st.empty}>
                        <Text style={st.emptyTitle}>Nothing captured yet</Text>
                        <Text style={st.emptySub}>
                            {listener.granted ? 'New notifications will appear here as they arrive.' : 'Grant Notification Access to start capturing.'}
                        </Text>
                        {!listener.granted && <Btn label="Open Notification Access" kind="primary" onPress={() => F.openListenerSettings()} />}
                        {__DEV__ && !listener.supported && (
                            <Btn label="[DEV] Seed sample data" onPress={async () => { await F.seedDemoData(); reload(); }} style={st.devBtn} />
                        )}
                    </View>
                }
                ListFooterComponent={
                    win === 'all' && visible.length < filtered.length ? (
                        <View style={st.moreRow}>
                            <ActivityIndicator color={COLORS.textDim} size="small" />
                            <Text style={st.moreText}>Loading older…</Text>
                        </View>
                    ) : null
                }
                onEndReached={() => {
                    if (win === 'all' && visible.length < filtered.length) setPage((p) => p + 1);
                }}
                onEndReachedThreshold={0.4}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} colors={[COLORS.accent]} />}
                contentContainerStyle={st.listContent}
                showsVerticalScrollIndicator={false}
            />

            {/* app filter raw bottom sheet */}
            <RBSheet
                ref={appSheetRef}
                height={550}
                openDuration={250}
                closeDuration={200}
                draggable
                closeOnPressMask
                closeOnPressBack
                customStyles={{
                    wrapper: { backgroundColor: 'rgba(0,0,0,0.5)' },
                    container: {
                        backgroundColor: '#fff',
                        borderTopLeftRadius: 24,
                        borderTopRightRadius: 24,
                    },
                    draggableIcon: { backgroundColor: COLORS.border, width: 44, height: 4.5, borderRadius: 3 },
                }}
            >
                <View style={st.sheetHeader}>
                    <View style={st.sheetTitleRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="filter-outline" size={18} color={COLORS.accent} style={{ marginRight: 8 }} />
                            <Text style={st.modalTitle}>Filter by app</Text>
                            {selectedPkgs.length > 0 && (
                                <View style={st.sheetHeaderPill}>
                                    <Text style={st.sheetHeaderPillText}>{selectedPkgs.length} selected</Text>
                                </View>
                            )}
                        </View>
                        <TouchableOpacity
                            onPress={() => setSelectedPkgs([])}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Text style={st.sheetResetText}>
                                {selectedPkgs.length > 0 ? 'Clear all' : 'All apps'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={st.sheetSubtitle}>Select one or multiple apps to filter notifications</Text>
                </View>

                <ScrollView style={st.sheetList} showsVerticalScrollIndicator={false}>
                    {/* "All apps" option */}
                    <TouchableOpacity
                        style={[st.sheetRow, selectedPkgs.length === 0 && st.sheetRowActive]}
                        onPress={() => setSelectedPkgs([])}
                        activeOpacity={0.7}
                    >
                        <View style={[st.sheetRowIconBox, selectedPkgs.length === 0 && { backgroundColor: COLORS.accentDim }]}>
                            <Ionicons name="apps" size={18} color={selectedPkgs.length === 0 ? COLORS.accent : COLORS.textDim} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={[st.sheetRowText, selectedPkgs.length === 0 && { fontWeight: '700' }]}>
                                All apps
                            </Text>
                            <Text style={st.sheetRowSub}>Show notifications from all apps</Text>
                        </View>
                        <View style={[st.checkbox, selectedPkgs.length === 0 && st.checkboxActive]}>
                            {selectedPkgs.length === 0 && <Ionicons name="checkmark" size={14} color="#fff" />}
                        </View>
                    </TouchableOpacity>

                    {/* App options */}
                    {apps.map((a) => {
                        const isChecked = selectedPkgs.includes(a.pkg);
                        const toggleApp = () => {
                            setSelectedPkgs((prev) => {
                                if (prev.includes(a.pkg)) {
                                    return prev.filter((p) => p !== a.pkg);
                                } else {
                                    return [...prev, a.pkg];
                                }
                            });
                        };
                        return (
                            <TouchableOpacity
                                key={a.pkg}
                                style={[st.sheetRow, isChecked && st.sheetRowActive]}
                                onPress={toggleApp}
                                activeOpacity={0.7}
                            >
                                {a.icon ? (
                                    <Image source={{ uri: a.icon }} style={st.sheetAppIcon} resizeMode="cover" />
                                ) : (
                                    <View style={[st.sheetRowIconBox, { backgroundColor: COLORS.surfaceHigh }]}>
                                        <Text style={{ color: avatarFg(a.pkg), fontWeight: '700', fontSize: 13 }}>
                                            {(a.label || '?').charAt(0).toUpperCase()}
                                        </Text>
                                    </View>
                                )}
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={[st.sheetRowText, isChecked && { fontWeight: '700' }]} numberOfLines={1}>
                                        {a.label}
                                    </Text>
                                    <Text style={st.sheetRowSub} numberOfLines={1}>{a.pkg}</Text>
                                </View>
                                <View style={st.sheetCountBadge}>
                                    <Text style={st.sheetCount}>{a.count}</Text>
                                </View>
                                <View style={[st.checkbox, isChecked && st.checkboxActive]}>
                                    {isChecked && <Ionicons name="checkmark" size={14} color="#fff" />}
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                <View style={st.sheetFooter}>
                    <TouchableOpacity
                        style={st.sheetDoneBtn}
                        onPress={() => appSheetRef.current?.close()}
                        activeOpacity={0.8}
                    >
                        <Text style={st.sheetDoneBtnText}>
                            {selectedPkgs.length === 0 ? 'Done (All apps)' : `Apply Filter (${selectedPkgs.length})`}
                        </Text>
                    </TouchableOpacity>
                </View>
            </RBSheet>

            {/* language-id bootstrap popup */}
            <Modal transparent visible={!!liModal} animationType="fade" onRequestClose={() => setLiModal(null)}>
                <View style={st.overlay}>
                    <View style={st.modalCard}>
                        <Text style={st.modalTitle}>Language model missing</Text>
                        <Text style={st.modalBody}>
                            On-device language identification isn’t ready. You can go back and continue without language features, or install/update Google Play services which provides the model.
                        </Text>
                        <View style={st.modalActions}>
                            <Btn label="Go back" onPress={() => setLiModal(null)} />
                            <Btn label="Open source" kind="primary" onPress={() => F.openLanguageIdSource()} />
                        </View>
                    </View>
                </View>
            </Modal>

            {/* translation model popup */}
            <Modal transparent visible={!!trModal} animationType="fade" onRequestClose={() => resolveTr('stall')}>
                <View style={st.overlay}>
                    <View style={st.modalCard}>
                        <Text style={st.modalTitle}>Translate this message?</Text>
                        <Text style={st.modalBody}>
                            “{trModal?.appLabel}” sent a message in [{trModal?.lang}]. The on-device translation model for it is not downloaded.
                        </Text>
                        <View style={st.modalActions}>
                            <Btn label="Not now" onPress={() => resolveTr('stall')} />
                            <Btn label="Download & translate" kind="primary" onPress={() => resolveTr('download')} />
                        </View>
                    </View>
                </View>
            </Modal>

            <ProgressModal
                progress={progress}
                phase={phase}
                blocked={blocked}
                downloading={downloading}
                onDownload={onDownloadAndRetry}
                onSendWithout={onSendWithout}
                onCancel={onCancelDecision}
            />

            {!!snack && (
                <View style={st.snack} pointerEvents="none">
                    <Text style={st.snackText} numberOfLines={2}>{snack}</Text>
                </View>
            )}
        </View>
    );
}

const computeStatsSafe = (items) => F.computeStats(items);


const st = StyleSheet.create({
    screen: { flex: 1, backgroundColor: COLORS.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    centerText: { color: COLORS.textDim, marginTop: 12 },
    listContent: { padding: 16, paddingTop: 18, paddingBottom: 96 },
    header: { marginBottom: 12 },
    h1: { color: '#000', fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
    h2: { color: COLORS.textDim, fontSize: 14 },
    banner: { borderRadius: 12, padding: 10, marginBottom: 10 },
    bannerText: { fontSize: 12 },
    statusCard: { backgroundColor: COLORS.surface, borderColor: COLORS.border, borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 10 },
    statusTop: { flexDirection: 'row' },
    statusLeft: { flex: 1 },
    monRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
    monText: { fontSize: 13, fontWeight: '600' },
    statusTitle: { color: COLORS.text, fontSize: 26, fontWeight: '800' },
    statusSub: { color: COLORS.textDim, fontSize: 13, marginTop: 5 },
    statRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12 },
    statCell: { flex: 1, alignItems: 'center' },
    statNum: { color: COLORS.text, fontSize: 20, fontWeight: '800' },
    statLabel: { color: COLORS.textDim, fontSize: 11, marginTop: 2 },
    statDivider: { width: 1, height: 28, backgroundColor: COLORS.border },
    ctaRow: { flexDirection: 'row', marginTop: 14 },
    ctaBtn: { flex: 1, marginHorizontal: 4 },
    permRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderColor: COLORS.border, borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 10 },
    permIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    permText: { flex: 1 },
    permTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
    permSub: { color: COLORS.textDim, fontSize: 12, marginTop: 2 },
    firstRun: { backgroundColor: COLORS.accentDim, borderRadius: 14, padding: 12, marginBottom: 10 },
    firstRunTitle: { color: COLORS.accent, fontWeight: '700', fontSize: 14 },
    firstRunSub: { color: COLORS.text, fontSize: 12, marginTop: 4 },
    filterBar: { marginBottom: 6 },
    filterScroll: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
    filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, marginRight: 8 },
    filterChipText: { color: COLORS.textDim, fontSize: 13, fontWeight: '600' },
    selBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceHigh, borderRadius: 14, padding: 8, marginBottom: 6 },
    selCount: { color: COLORS.accent, fontWeight: '700', fontSize: 13, flex: 1, marginLeft: 6 },
    selBtn: { paddingHorizontal: 10, paddingVertical: 6, marginHorizontal: 3 },
    card: { backgroundColor: COLORS.surface, borderColor: COLORS.border, borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 10 },
    cardRow: { flexDirection: 'row' },
    avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    avatarText: { fontSize: 18, fontWeight: '800' },
    check: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: COLORS.textDim, alignItems: 'center', justifyContent: 'center' },
    checkTick: { color: COLORS.onAccent, fontSize: 12, fontWeight: '800' },
    cardMain: { flex: 1 },
    cardHead: { flexDirection: 'row', justifyContent: 'space-between' },
    appLabel: { color: COLORS.textDim, fontSize: 13, flex: 1 },
    time: { color: COLORS.textDim, fontSize: 12, marginLeft: 8 },
    title: { color: COLORS.text, fontSize: 15, fontWeight: '700', marginTop: 2 },
    body: { color: COLORS.textDim, fontSize: 13, marginTop: 3 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
    chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, marginRight: 6, marginTop: 4 },
    chipSmall: { paddingHorizontal: 8, paddingVertical: 4 },
    chipText: { fontSize: 12, fontWeight: '700' },
    chipTextSmall: { fontSize: 11 },
    expandBox: { marginTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10 },
    originalText: { color: COLORS.textDim, fontSize: 12, fontStyle: 'italic', marginBottom: 8 },
    scoreRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    scoreLabel: { color: COLORS.textDim, fontSize: 11, width: 118 },
    scoreTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: COLORS.surfaceHigh, overflow: 'hidden' },
    scoreFill: { height: 6, borderRadius: 3 },
    scoreVal: { width: 38, textAlign: 'right', fontSize: 11, fontWeight: '700' },
    metaText: { color: COLORS.textDim, fontSize: 11, marginTop: 6 },
    linkBox: { marginTop: 8 },
    linkText: { fontSize: 11, marginBottom: 3 },
    empty: { padding: 32, alignItems: 'center' },
    emptyTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
    emptySub: { color: COLORS.textDim, fontSize: 13, textAlign: 'center', marginTop: 6, marginBottom: 14 },
    devBtn: { marginTop: 10 },
    moreRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 12 },
    moreText: { color: COLORS.textDim, fontSize: 12, marginLeft: 8 },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', padding: 20 },
    modalCard: { backgroundColor: COLORS.surface, borderColor: COLORS.border, borderWidth: 1, borderRadius: 18, padding: 18 },
    modalTitle: { color: COLORS.text, fontSize: 17, fontWeight: '800', marginBottom: 8 },
    modalBody: { color: COLORS.textDim, fontSize: 13, lineHeight: 19 },
    modalActions: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 14 },
    stageList: { marginTop: 6, marginBottom: 10 },
    stageRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    stageDot: { width: 14, height: 14, borderRadius: 7, marginRight: 10, alignItems: 'center', justifyContent: 'center' },
    stageTick: { color: COLORS.onAccent, fontSize: 9, fontWeight: '800' },
    stagePulse: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.warn },
    stageLabel: { fontSize: 13 },
    barTrack: { height: 8, borderRadius: 4, backgroundColor: COLORS.surfaceHigh, overflow: 'hidden' },
    barFill: { height: 8, borderRadius: 4, backgroundColor: COLORS.accent },
    progressMsg: { color: COLORS.textDim, fontSize: 12, marginTop: 8 },
    blockedList: { maxHeight: 160, marginVertical: 10 },
    blockedRow: { backgroundColor: COLORS.surfaceHigh, borderRadius: 10, padding: 8, marginBottom: 6 },
    blockedText: { color: COLORS.text, fontSize: 12 },
    filterIconChip: { paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    filterBadge: { marginLeft: 5, backgroundColor: COLORS.accent, borderRadius: 999, width: 17, height: 17, alignItems: 'center', justifyContent: 'center' },
    filterBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
    sheetHeader: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    sheetTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    sheetSubtitle: { color: COLORS.textDim, fontSize: 12, marginTop: 4 },
    sheetHeaderPill: { backgroundColor: COLORS.accentDim, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginLeft: 8 },
    sheetHeaderPillText: { color: COLORS.accent, fontSize: 11, fontWeight: '700' },
    sheetResetText: { color: COLORS.accent, fontSize: 13, fontWeight: '700' },
    sheetList: { flex: 1, paddingHorizontal: 16, paddingTop: 10 },
    sheetRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 10, borderRadius: 12, marginBottom: 4 },
    sheetRowActive: { backgroundColor: COLORS.accentDim },
    sheetRowIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
    sheetAppIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.surfaceHigh },
    sheetRowText: { fontSize: 14, fontWeight: '600', color: COLORS.text },
    sheetRowSub: { fontSize: 11.5, color: COLORS.textDim, marginTop: 1 },
    sheetCountBadge: { backgroundColor: COLORS.surfaceHigh, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginRight: 10 },
    sheetCount: { fontSize: 11.5, fontWeight: '700', color: COLORS.textDim },
    checkbox: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.8, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
    checkboxActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
    sheetFooter: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: Platform.OS === 'android' ? 68 : 36, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: '#fff' },
    sheetDoneBtn: { backgroundColor: '#000', borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
    sheetDoneBtnText: { color: '#fff', fontSize: 14.5, fontWeight: '700' },
    btn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: COLORS.surfaceHigh, marginRight: 8, marginTop: 8, alignItems: 'center' },
    btnText: { color: COLORS.text, fontSize: 13, fontWeight: '700' },
    snack: { position: 'absolute', bottom: 24, alignSelf: 'center', backgroundColor: COLORS.surfaceHigh, borderColor: COLORS.border, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, maxWidth: '86%' },
    snackText: { color: COLORS.text, fontSize: 13 },
});