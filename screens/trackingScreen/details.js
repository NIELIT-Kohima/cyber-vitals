import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants';
import { TrackingDetailsFunc, fmtAxis, fmtBinRange, axisLabels } from './details-function';
import { fmtDuration, fmtTime, fmtDayTime, RANGES } from './list-function';
import { Card, Glyph, IconTile, StateView, alpha } from './list';

const TrackingDetails = ({ route, navigation }) => {
    const { pkg, label, icon, range = 'today' } = route?.params || {};
    const { status, refreshing, error, data, reload } = TrackingDetailsFunc(pkg, range);
    const [bin, setBin] = useState(null);
    const [showAll, setShowAll] = useState(false);

    const rangeLabel = RANGES.find((r) => r.key === range)?.label || 'Today';
    const maxBin = useMemo(() => Math.max(1, ...(data?.timeline || []).map((b) => b.ms)), [data]);

    const ready = status === 'ready' && !!data;

    if (!pkg) return null;

    const sessions = ready ? (showAll ? data.sessions : data.sessions.slice(0, 5)) : [];

    return (
        <View style={D.root}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            <View style={D.topSection}>
                <TouchableOpacity
                    style={D.backButton}
                    onPress={() => navigation?.goBack()}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                >
                    <Ionicons name="chevron-back" size={20} color="#fff" />
                </TouchableOpacity>

                <View style={D.ident}>
                    <IconTile icon={icon} label={label || pkg} size={58} />
                    <View style={D.identText}>
                        <Text style={D.name} numberOfLines={1}>{label || pkg}</Text>
                        <Text style={D.pkg} numberOfLines={1}>{pkg}</Text>
                    </View>
                </View>

            </View>

            <StateView status={status} error={error} onRetry={reload}>
                {ready && (
                    <ScrollView
                        contentContainerStyle={D.scroll}
                        showsVerticalScrollIndicator={false}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={COLORS.accent} progressBackgroundColor={COLORS.surface} />}
                    >
                                {/* Modern Total Usage Card matching list.js */}
                                <View style={D.usageCard}>
                                    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                                        <View style={[D.usageRing, { width: 110, height: 110, borderRadius: 55, top: -40, right: -30, backgroundColor: 'rgba(255,255,255,0.12)' }]} />
                                        <View style={[D.usageRing, { width: 70, height: 70, borderRadius: 35, bottom: -25, left: -20, backgroundColor: 'rgba(255,255,255,0.08)' }]} />
                                    </View>
                                    <View style={D.usageIconWrap}>
                                        <Glyph name="clock" size={22} color="#fff" />
                                    </View>
                                    <View style={D.usageTextWrap}>
                                        <Text style={D.usageLabel}>Total Time in Foreground</Text>
                                        <Text style={D.usageValue}>{fmtDuration(data.totalMs)}</Text>
                                    </View>
                                    <View style={D.rangeBadge}>
                                        <Text style={D.rangeBadgeText}>{rangeLabel}</Text>
                                    </View>
                                </View>

                                {/* Duo stats: Last Used & Bucket */}
                                <View style={D.duo}>
                                    <View style={D.duoCard}>
                                        <View style={D.duoIconWrap}>
                                            <Ionicons name="calendar-outline" size={17} color={COLORS.accent} />
                                        </View>
                                        <Text style={D.duoLabel}>Last Time Used</Text>
                                        <Text style={D.duoValue}>{fmtDayTime(data.lastUsed)}</Text>
                                    </View>
                                    <View style={D.duoCard}>
                                        <View style={D.duoIconWrap}>
                                            <Ionicons name="speedometer-outline" size={17} color={COLORS.accent} />
                                        </View>
                                        <Text style={D.duoLabel}>App Standby Bucket</Text>
                                        <Text style={[D.duoValue, { color: COLORS.accent }]}>{data.bucket}</Text>
                                    </View>
                                </View>

                                {/* Activity Timeline section */}
                                <View style={D.sectionHead}>
                                    <Text style={D.sectionTitle}>Activity Timeline</Text>
                                </View>

                                <Card style={D.chartCard}>
                                    <View style={D.chartHeader}>
                                        <View style={D.chartHeaderLeft}>
                                            <View style={D.chartBadge}>
                                                <Ionicons name="stats-chart" size={13} color={COLORS.accent} />
                                            </View>
                                            <Text style={D.chartSubtitle}>
                                                {bin != null && data.timeline[bin]
                                                    ? `${fmtBinRange(data.timeline[bin], range)}`
                                                    : 'Distribution across time slots'}
                                            </Text>
                                        </View>
                                        {bin != null && data.timeline[bin] ? (
                                            <View style={D.selectedDurationPill}>
                                                <Text style={D.selectedDurationText}>{fmtDuration(data.timeline[bin].ms)}</Text>
                                            </View>
                                        ) : (
                                            <Text style={D.chartHint}>Tap bar to inspect</Text>
                                        )}
                                    </View>

                                    <View style={D.chartBody}>
                                        <View style={D.yAxis}>
                                            <Text style={D.axisText}>{fmtAxis(maxBin)}</Text>
                                            <Text style={D.axisText}>{fmtAxis(maxBin / 2)}</Text>
                                            <Text style={D.axisText}>0m</Text>
                                        </View>
                                        <View style={D.plot}>
                                            {/* Horizontal dashed reference lines */}
                                            <View pointerEvents="none" style={D.gridLines}>
                                                <View style={D.gridLine} />
                                                <View style={D.gridLine} />
                                                <View style={[D.gridLine, { borderBottomColor: COLORS.border }]} />
                                            </View>

                                            <View style={D.bars}>
                                                {data.timeline.map((b, i) => {
                                                    const isSelected = bin === i;
                                                    const heightPct = (b.ms / maxBin) * 100;
                                                    return (
                                                        <TouchableOpacity
                                                            key={i}
                                                            style={D.barHit}
                                                            onPress={() => setBin(bin === i ? null : i)}
                                                            activeOpacity={0.8}
                                                        >
                                                            <View style={[D.barTrack, isSelected && D.barTrackSelected]}>
                                                                {b.ms > 0 && (
                                                                    <View
                                                                        style={[
                                                                            D.barFill,
                                                                            {
                                                                                height: `${Math.max(8, heightPct)}%`,
                                                                                backgroundColor: isSelected ? COLORS.accent : alpha(COLORS.accent, 'D0'),
                                                                            },
                                                                            isSelected && D.barFillSelected,
                                                                        ]}
                                                                    />
                                                                )}
                                                            </View>
                                                        </TouchableOpacity>
                                                    );
                                                })}
                                            </View>
                                        </View>
                                    </View>

                                    <View style={D.xAxis}>
                                        {axisLabels(data.timeline, range).map((l, i) => (
                                            <Text key={i} style={D.axisText}>{l}</Text>
                                        ))}
                                    </View>
                                </Card>

                                {/* Activity Sessions — grouped card like risky apps */}
                                {data.sessions.length ? (
                                    <View style={D.sessionsBox}>
                                        {/* Header row inside the grouped card */}
                                        <View style={D.sessionsHeader}>
                                            <View style={D.sessionsHeaderBadge}>
                                                <Ionicons name="pulse" size={18} color={COLORS.accent} />
                                            </View>
                                            <View style={D.sessionsHeaderText}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                    <Text style={D.sessionsHeaderTitle}>Activity Sessions</Text>
                                                    <View style={D.sessionsCountPill}>
                                                        <Text style={D.sessionsCountPillText}>{data.sessions.length}</Text>
                                                    </View>
                                                </View>
                                                <Text style={D.sessionsHeaderSub}>Foreground usage events for this period</Text>
                                            </View>
                                            {data.sessions.length > 5 && (
                                                <TouchableOpacity
                                                    onPress={() => setShowAll((v) => !v)}
                                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                                    style={D.sessionsViewAll}
                                                >
                                                    <Text style={D.sessionsViewAllText}>{showAll ? 'Less' : 'All'}</Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>

                                        {/* Session rows inside the card */}
                                        {sessions.map((s, idx) => (
                                            <View key={`${s.start}-${idx}`} style={[D.sessionRow, idx > 0 && D.sessionRowDivider]}>
                                                <View style={D.sessionDot} />
                                                <View style={D.sessionBody}>
                                                    <Text style={D.sessionTime}>{fmtTime(s.start)} – {fmtTime(s.end)}</Text>
                                                    <Text style={D.sessionDate}>{fmtDayTime(s.start)}</Text>
                                                </View>
                                                <View style={D.sessionDurationBadge}>
                                                    <Ionicons name="time-outline" size={12} color={COLORS.accent} style={{ marginRight: 4 }} />
                                                    <Text style={D.sessionDurationText}>{fmtDuration(s.ms)}</Text>
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                ) : (
                                    <Card style={D.emptyCard}>
                                        <Ionicons name="hourglass-outline" size={26} color={COLORS.textDim} style={{ marginBottom: 6 }} />
                                        <Text style={D.emptyTitle}>No Visible Sessions</Text>
                                        <Text style={D.emptySub}>No foreground activity recorded for this period.</Text>
                                    </Card>
                                )}

                                {data.silent && (
                                    <View style={D.anomalyCard}>
                                        <Ionicons name="alert-circle" size={20} color={COLORS.warn} />
                                        <Text style={D.anomalyText}>
                                            {fmtDuration(data.totalMs)} of foreground time with no visible session — possible silent background activity.
                                        </Text>
                                    </View>
                                )}
                    </ScrollView>
                )}
            </StateView>
        </View>
    );
};

const D = StyleSheet.create({
    root: { flex: 1, backgroundColor: COLORS.bg },
    topSection: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: COLORS.border },
    backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
    ident: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
    identText: { marginLeft: 14, flex: 1 },
    name: { color: COLORS.text, fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
    pkg: { color: COLORS.textDim, fontSize: 13, marginTop: 3 },
    scroll: { padding: 16, paddingBottom: 40 },

    // Usage Card matching list.js
    usageCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 18,
        backgroundColor: COLORS.accent,
        borderRadius: 18,
        overflow: 'hidden',
        shadowColor: COLORS.accent,
        shadowOpacity: 0.25,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 6,
        marginBottom: 12,
    },
    usageRing: { position: 'absolute' },
    usageIconWrap: {
        width: 46,
        height: 46,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    usageTextWrap: { flex: 1, marginLeft: 14 },
    usageLabel: { color: 'rgba(255,255,255,0.82)', fontSize: 12, fontWeight: '600', marginBottom: 2 },
    usageValue: { color: '#fff', fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
    rangeBadge: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.25)',
    },
    rangeBadgeText: { color: '#fff', fontSize: 11.5, fontWeight: '700' },

    // Duo stats
    duo: { flexDirection: 'row', gap: 10, marginBottom: 18 },
    duoCard: {
        flex: 1,
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 14,
    },
    duoIconWrap: {
        width: 34,
        height: 34,
        borderRadius: 10,
        backgroundColor: COLORS.accentDim,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    duoLabel: { color: COLORS.textDim, fontSize: 12, fontWeight: '600' },
    duoValue: { color: COLORS.text, fontSize: 14.5, fontWeight: '700', marginTop: 4 },

    // Section header
    sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, marginTop: 4 },
    sectionTitle: { color: COLORS.text, fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
    titleWithCount: { flexDirection: 'row', alignItems: 'center' },
    countBadge: { marginLeft: 8, backgroundColor: COLORS.accentDim, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
    countBadgeText: { color: COLORS.accent, fontSize: 11.5, fontWeight: '800' },
    sectionAction: { color: COLORS.accent, fontSize: 13, fontWeight: '700' },

    // Chart Card
    chartCard: { padding: 16, marginBottom: 18 },
    chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    chartHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    chartBadge: { width: 26, height: 26, borderRadius: 8, backgroundColor: COLORS.accentDim, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
    chartSubtitle: { color: COLORS.text, fontSize: 12.5, fontWeight: '600' },
    chartHint: { color: COLORS.textDim, fontSize: 11, fontWeight: '500' },
    selectedDurationPill: { backgroundColor: COLORS.accent, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    selectedDurationText: { color: '#fff', fontSize: 11.5, fontWeight: '800' },
    chartBody: { flexDirection: 'row' },
    yAxis: { height: 130, justifyContent: 'space-between', alignItems: 'flex-end', paddingRight: 8 },
    axisText: { color: COLORS.textDim, fontSize: 10, fontWeight: '600' },
    plot: { flex: 1, height: 130, position: 'relative' },
    gridLines: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },
    gridLine: { borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)', width: '100%' },
    bars: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', zIndex: 1 },
    barHit: { flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center' },
    barTrack: { width: 8, height: '100%', justifyContent: 'flex-end', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: 4 },
    barTrackSelected: { backgroundColor: 'rgba(0, 168, 150, 0.12)' },
    barFill: { width: '100%', borderRadius: 4, minHeight: 4 },
    barFillSelected: { backgroundColor: COLORS.accent, shadowColor: COLORS.accent, shadowOpacity: 0.5, shadowRadius: 4, elevation: 2 },
    xAxis: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10, paddingLeft: 30 },

    // Activity Sessions — grouped card
    sessionsBox: {
        backgroundColor: COLORS.accentDim,
        borderWidth: 1,
        borderColor: alpha(COLORS.accent, '30'),
        borderRadius: 18,
        overflow: 'hidden',
        marginBottom: 14,
    },
    sessionsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingTop: 14,
        paddingBottom: 10,
    },
    sessionsHeaderBadge: {
        width: 36,
        height: 36,
        borderRadius: 11,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    sessionsHeaderText: { marginLeft: 10, flex: 1 },
    sessionsHeaderTitle: { color: COLORS.text, fontSize: 14.5, fontWeight: '800', letterSpacing: -0.2 },
    sessionsHeaderSub: { color: COLORS.textDim, fontSize: 11.5, marginTop: 1 },
    sessionsCountPill: {
        backgroundColor: COLORS.accent,
        borderRadius: 999,
        paddingHorizontal: 7,
        paddingVertical: 1.5,
        marginLeft: 8,
    },
    sessionsCountPillText: { color: '#fff', fontSize: 11, fontWeight: '800' },
    sessionsViewAll: {
        backgroundColor: '#fff',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    sessionsViewAllText: { color: COLORS.accent, fontSize: 11.5, fontWeight: '700' },
    sessionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'transparent',
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    sessionRowDivider: {
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: alpha(COLORS.accent, '35'),
    },
    sessionDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.accent,
        marginRight: 12,
    },
    sessionBody: { flex: 1 },
    sessionTime: { color: COLORS.text, fontSize: 13.5, fontWeight: '700' },
    sessionDate: { color: COLORS.textDim, fontSize: 11.5, marginTop: 2 },
    sessionDurationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderWidth: 1,
        borderColor: alpha(COLORS.accent, '25'),
    },
    sessionDurationText: { color: COLORS.accent, fontSize: 12, fontWeight: '700' },

    // Empty state
    emptyCard: { alignItems: 'center', justifyContent: 'center', paddingVertical: 24, marginBottom: 14 },
    emptyTitle: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
    emptySub: { color: COLORS.textDim, fontSize: 12, textAlign: 'center', marginTop: 4, paddingHorizontal: 20 },

    // Anomaly Warning
    anomalyCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.warnDim,
        borderWidth: 1,
        borderColor: alpha(COLORS.warn, '44'),
        borderRadius: 14,
        padding: 12,
        marginTop: 6,
        marginBottom: 12,
    },
    anomalyText: { flex: 1, fontSize: 12.5, lineHeight: 18, marginLeft: 10, fontWeight: '600', color: COLORS.warn },

});

export default TrackingDetails;