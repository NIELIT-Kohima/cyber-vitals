import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar, RefreshControl } from 'react-native';
import { COLORS, FLAGS, RISK_FLAGS } from '../../constants';
import { TrackingDetailsFunc, fmtAxis, fmtBinRange, axisLabels } from './detailsFunc';
import { fmtDuration, fmtTime, fmtDayTime, fmtDate, installerLabel, RANGES } from './listFunc';
import { ScreenShell, Card, Chip, Glyph, IconTile, StateView, SectionHead, alpha, STATUS_PAD } from './listFront';

const MetaRow = ({ k, v, color }) => (
    <View style={D.metaRow}>
        <Text style={D.metaKey}>{k}</Text>
        <Text style={[D.metaVal, color && { color }]}>{v}</Text>
    </View>
);

const TrackingDetailsFront = ({ route, navigation }) => {
    const { pkg, label, icon, range = 'today' } = route?.params || {};
    const { status, refreshing, error, data, reload } = TrackingDetailsFunc(pkg, range);
    const [tab, setTab] = useState('usage');
    const [bin, setBin] = useState(null);
    const [showAll, setShowAll] = useState(false);

    const rangeLabel = RANGES.find((r) => r.key === range)?.label || 'Today';
    const maxBin = useMemo(() => Math.max(1, ...(data?.timeline || []).map((b) => b.ms)), [data]);

    const ready = status === 'ready' && !!data;

    if (!pkg) return null;

    const sessions = ready ? (showAll ? data.sessions : data.sessions.slice(0, 3)) : [];
    const risks = ready ? data.flags.filter((f) => RISK_FLAGS.includes(f)) : [];

    return (
        <ScreenShell>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
            <TouchableOpacity style={D.back} onPress={() => navigation?.goBack()} >
                <Glyph name="back" size={16} color={COLORS.text} />
            </TouchableOpacity>

            <View style={D.ident}>
                <IconTile icon={icon} label={label || pkg} size={56} />
                <View style={D.identText}>
                    <Text style={D.name} numberOfLines={1}>{label || pkg}</Text>
                    <Text style={D.pkg} numberOfLines={1}>{pkg}</Text>
                </View>
            </View>

            <View style={D.tabs}>
                {[['usage', 'Usage'], ['security', 'Security']].map(([key, txt]) => (
                    <TouchableOpacity key={key} style={D.tab} onPress={() => setTab(key)}>
                        <Text style={[D.tabText, tab === key && D.tabTextOn]}>{txt}</Text>
                        <View style={[D.tabLine, tab === key && D.tabLineOn]} />
                    </TouchableOpacity>
                ))}
            </View>

            <StateView status={status} error={error} onRetry={reload}>
                {ready && (
                    <ScrollView
                        contentContainerStyle={D.scroll}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={COLORS.accent} progressBackgroundColor={COLORS.surface} />}
                    >
                        {tab === 'usage' ? (
                            <>
                                <Card style={D.total}>
                                    <Glyph name="clock" size={20} color={COLORS.accent} />
                                    <View style={D.totalText}>
                                        <Text style={D.cardLabel}>Total Time in Foreground</Text>
                                        <Text style={D.totalValue}>{fmtDuration(data.totalMs)}</Text>
                                    </View>
                                    <Chip tone="accent" style={D.rangeChip}>{rangeLabel}</Chip>
                                </Card>

                                <View style={D.duo}>
                                    <Card style={D.duoCard}>
                                        <Glyph name="calendar" size={18} color={COLORS.textDim} />
                                        <Text style={[D.cardLabel, D.duoLabel]}>Last Time Used</Text>
                                        <Text style={D.duoValue}>{fmtDayTime(data.lastUsed)}</Text>
                                    </Card>
                                    <Card style={D.duoCard}>
                                        <Glyph name="layers" size={18} color={COLORS.textDim} />
                                        <Text style={[D.cardLabel, D.duoLabel]}>App Standby Bucket</Text>
                                        <Text style={[D.duoValue, { color: COLORS.accent }]}>{data.bucket}</Text>
                                    </Card>
                                </View>

                                <SectionHead title="Activity Timeline" />
                                <Card>
                                    <View style={D.chart}>
                                        <View style={D.yAxis}>
                                            <Text style={D.axisText}>{fmtAxis(maxBin)}</Text>
                                            <Text style={D.axisText}>{fmtAxis(maxBin / 2)}</Text>
                                            <Text style={D.axisText}>0m</Text>
                                        </View>
                                        <View style={D.plot}>
                                            {bin != null && data.timeline[bin] && (
                                                <View style={[D.tooltip, { left: `${((bin + 0.5) / data.timeline.length) * 100}%` }]}>
                                                    <Text style={D.tooltipText}>{fmtDuration(data.timeline[bin].ms)}</Text>
                                                    <Text style={D.tooltipSub}>{fmtBinRange(data.timeline[bin], range)}</Text>
                                                </View>
                                            )}
                                            <View style={D.bars}>
                                                {data.timeline.map((b, i) => (
                                                    <TouchableOpacity key={i} style={D.barHit} onPress={() => setBin(bin === i ? null : i)}>
                                                        {b.ms > 0 && (
                                                            <View style={[D.bar, { height: `${Math.max(4, (b.ms / maxBin) * 100)}%`, backgroundColor: bin === i ? COLORS.accent : alpha(COLORS.accent, 'B3') }]} />
                                                        )}
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                        </View>
                                    </View>
                                    <View style={D.xAxis}>
                                        {axisLabels(data.timeline, range).map((l, i) => <Text key={i} style={D.axisText}>{l}</Text>)}
                                    </View>
                                </Card>

                                <SectionHead
                                    title="Activity Sessions"
                                    action={data.sessions.length > 3 ? (showAll ? 'Show less' : 'View all') : null}
                                    onAction={() => setShowAll((v) => !v)}
                                />
                                {data.sessions.length ? (
                                    sessions.map((s) => (
                                        <View key={`${s.start}`} style={D.session}>
                                            <View style={D.dot} />
                                            <Text style={D.sessionTime}>{fmtTime(s.start)} – {fmtTime(s.end)}</Text>
                                            <Text style={D.sessionMs}>{fmtDuration(s.ms)}</Text>
                                        </View>
                                    ))
                                ) : (
                                    <Card><Text style={D.muted}>No visible sessions in this period.</Text></Card>
                                )}

                                {data.silent && (
                                    <Card style={[D.anomaly, { backgroundColor: COLORS.warnDim, borderColor: alpha(COLORS.warn, '55') }]}>
                                        <Glyph name="alert" size={18} color={COLORS.warn} />
                                        <Text style={[D.anomalyText, { color: COLORS.warn }]}>
                                            {fmtDuration(data.totalMs)} of foreground time with no visible session — possible silent background activity.
                                        </Text>
                                    </Card>
                                )}
                            </>
                        ) : (
                            <>
                                <View style={D.chips}>
                                    {data.flags.map((f) => (
                                        <Chip key={f} tone={FLAGS[f].tone} style={D.chip}>{FLAGS[f].tick}  {FLAGS[f].label}</Chip>
                                    ))}
                                </View>

                                {risks.length ? (
                                    <Card style={[D.anomaly, {
                                        backgroundColor: FLAGS[risks[0]].tone === 'danger' ? COLORS.dangerDim : COLORS.warnDim,
                                        borderColor: alpha(COLORS[FLAGS[risks[0]].tone], '55'),
                                    }]}>
                                        <Glyph name="alert" size={18} color={COLORS[FLAGS[risks[0]].tone]} />
                                        <Text style={[D.anomalyText, { color: COLORS[FLAGS[risks[0]].tone] }]}>
                                            {risks.length} risk indicator{risks.length > 1 ? 's' : ''}: {risks.map((f) => FLAGS[f].label).join(', ')}.
                                        </Text>
                                    </Card>
                                ) : (
                                    <Card><Text style={D.muted}>No risk indicators. Origin and build hygiene look healthy.</Text></Card>
                                )}

                                <Card style={D.meta}>
                                    <MetaRow k="Source" v={installerLabel(data.meta)} />
                                    <MetaRow k="Target SDK" v={String(data.meta.targetSdk || '—')} />
                                    <MetaRow k="Last updated" v={fmtDate(data.meta.updated)} />
                                    <MetaRow k="Debuggable" v={data.meta.debuggable ? 'Yes' : 'No'} color={data.meta.debuggable ? COLORS.danger : undefined} />
                                    <MetaRow k="Foreground drift" v={fmtDuration(data.drift)} color={data.drift > 120000 ? COLORS.warn : undefined} />
                                </Card>
                            </>
                        )}
                    </ScrollView>
                )}
            </StateView>
        </ScreenShell>
    );
};

const D = StyleSheet.create({
    back: { position: 'absolute', top: STATUS_PAD + 10, left: 16, zIndex: 2, padding: 6 },
    ident: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14 },
    identText: { marginLeft: 14, flex: 1 },
    name: { color: COLORS.text, fontSize: 21, fontWeight: '700' },
    pkg: { color: COLORS.textDim, fontSize: 13, marginTop: 3 },
    tabs: { flexDirection: 'row', paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    tab: { marginRight: 26 },
    tabText: { color: COLORS.textDim, fontSize: 14, fontWeight: '600', paddingBottom: 10 },
    tabTextOn: { color: COLORS.accent },
    tabLine: { height: 2, borderRadius: 1, backgroundColor: 'transparent', marginTop: -1 },
    tabLineOn: { backgroundColor: COLORS.accent },
    scroll: { padding: 16, paddingBottom: 32 },
    total: { flexDirection: 'row', alignItems: 'center' },
    totalText: { marginLeft: 12, flex: 1 },
    cardLabel: { color: COLORS.textDim, fontSize: 12 },
    totalValue: { color: COLORS.text, fontSize: 24, fontWeight: '700', marginTop: 4 },
    rangeChip: { alignSelf: 'flex-start' },
    duo: { flexDirection: 'row', marginTop: 10, flexWrap: 'wrap' },
    duoCard: { flex: 1, minWidth: '47%', margin: 5 },
    duoLabel: { marginTop: 10 },
    duoValue: { color: COLORS.text, fontSize: 15, fontWeight: '600', marginTop: 5 },
    chart: { flexDirection: 'row', marginTop: 6 },
    yAxis: { height: 140, justifyContent: 'space-between', alignItems: 'flex-end', paddingRight: 8 },
    axisText: { color: COLORS.textDim, fontSize: 10 },
    plot: { flex: 1, height: 140 },
    bars: { flex: 1, flexDirection: 'row', alignItems: 'flex-end' },
    barHit: { flex: 1, height: '100%', justifyContent: 'flex-end' },
    bar: { marginHorizontal: 1.5, borderRadius: 2, minHeight: 3 },
    tooltip: { position: 'absolute', top: -6, zIndex: 3, transform: [{ translateX: '-50%' }], backgroundColor: COLORS.surfaceHigh, borderColor: COLORS.border, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center' },
    tooltipText: { color: COLORS.text, fontSize: 12, fontWeight: '700' },
    tooltipSub: { color: COLORS.textDim, fontSize: 10, marginTop: 2 },
    xAxis: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8 },
    session: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 14, paddingVertical: 13, marginBottom: 8 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.accent, marginRight: 12 },
    sessionTime: { flex: 1, color: COLORS.text, fontSize: 13 },
    sessionMs: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
    muted: { color: COLORS.textDim, fontSize: 13 },
    anomaly: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
    anomalyText: { flex: 1, fontSize: 12.5, lineHeight: 18, marginLeft: 10, fontWeight: '600' },
    chips: { flexDirection: 'row', flexWrap: 'wrap' },
    chip: { margin: 4 },
    meta: { marginTop: 10 },
    metaRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    metaKey: { color: COLORS.textDim, fontSize: 13 },
    metaVal: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
});

export default TrackingDetailsFront;