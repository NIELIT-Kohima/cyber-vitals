import React, { useCallback, useReducer, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Modal,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    View,
    Platform,
    useWindowDimensions,
} from 'react-native';
import { COLORS } from '../../constants';
import { AiGenError, UPLOAD_COPY, ERR, analyze, formatBytes, pickImage, supportNote } from './details-function';

const STATUS_PAD = Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0;

const TONE_COLOR = { accent: COLORS.accent, warn: COLORS.warn, danger: COLORS.danger };
const TONE_DIM = { accent: COLORS.accentDim, warn: COLORS.warnDim, danger: COLORS.dangerDim };

const DETAIL_KEYS = ['type', 'dims', 'size', 'model', 'result', 'confidence'];
const ROW_ICONS = { type: 'image', dims: 'expand', size: 'file', model: 'robot', result: 'alert', confidence: 'chart' };


function Icon({ name, size = 20, color = COLORS.text, style }) {
    const t = Math.max(1.4, Math.round(size * 0.09));
    let body = null;

    switch (name) {
        case 'chevron':
            body = (
                <View
                    style={{
                        width: size * 0.55,
                        height: size * 0.55,
                        borderLeftWidth: t,
                        borderBottomWidth: t,
                        borderColor: color,
                        transform: [{ rotate: '45deg' }],
                    }}
                />
            );
            break;
        case 'close':
            body = (
                <View style={{ width: size * 0.72, height: size * 0.72 }}>
                    <View style={{ position: 'absolute', top: size * 0.33, left: 0, right: 0, height: t, backgroundColor: color, transform: [{ rotate: '45deg' }] }} />
                    <View style={{ position: 'absolute', top: size * 0.33, left: 0, right: 0, height: t, backgroundColor: color, transform: [{ rotate: '-45deg' }] }} />
                </View>
            );
            break;
        case 'image':
            body = (
                <View style={{ width: size, height: size * 0.82, borderWidth: t, borderColor: color, borderRadius: size * 0.18, overflow: 'hidden' }}>
                    <View style={{ position: 'absolute', top: size * 0.14, right: size * 0.16, width: size * 0.16, height: size * 0.16, borderRadius: size * 0.08, backgroundColor: color }} />
                    <View
                        style={{
                            position: 'absolute',
                            bottom: -size * 0.1,
                            left: size * 0.12,
                            width: 0,
                            height: 0,
                            borderLeftWidth: size * 0.22,
                            borderRightWidth: size * 0.22,
                            borderBottomWidth: size * 0.34,
                            borderLeftColor: 'transparent',
                            borderRightColor: 'transparent',
                            borderBottomColor: color,
                        }}
                    />
                </View>
            );
            break;
        case 'imagePlus':
            body = (
                <View style={{ width: size, height: size }}>
                    <Icon name="image" size={size * 0.88} color={color} style={{ position: 'absolute', top: 0, left: 0 }} />
                    <View style={{ position: 'absolute', right: 0, bottom: size * 0.04, width: size * 0.34, height: size * 0.34, borderRadius: size * 0.17, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: COLORS.onAccent, fontSize: size * 0.24, fontWeight: '800' }}>+</Text>
                    </View>
                </View>
            );
            break;
        case 'upload':
            body = (
                <View style={{ width: size, height: size, alignItems: 'center' }}>
                    <View style={{ width: 0, height: 0, borderLeftWidth: size * 0.16, borderRightWidth: size * 0.16, borderBottomWidth: size * 0.2, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: color }} />
                    <View style={{ width: t, height: size * 0.32, backgroundColor: color, marginTop: 1 }} />
                    <View style={{ position: 'absolute', bottom: 0, left: size * 0.08, right: size * 0.08, height: size * 0.42, borderBottomWidth: t, borderLeftWidth: t, borderRightWidth: t, borderColor: color, borderBottomLeftRadius: size * 0.12, borderBottomRightRadius: size * 0.12 }} />
                </View>
            );
            break;
        case 'camera':
            body = (
                <View style={{ width: size, height: size * 0.78, borderWidth: t, borderColor: color, borderRadius: size * 0.16, alignItems: 'center', justifyContent: 'center' }}>
                    <View style={{ position: 'absolute', top: -size * 0.09, left: size * 0.26, width: size * 0.28, height: size * 0.12, backgroundColor: color, borderTopLeftRadius: 3, borderTopRightRadius: 3 }} />
                    <View style={{ width: size * 0.34, height: size * 0.34, borderRadius: size * 0.17, borderWidth: t, borderColor: color }} />
                </View>
            );
            break;
        case 'expand': {
            const c = size * 0.34;
            const corner = (pos) => (
                <View
                    key={pos}
                    style={{
                        position: 'absolute',
                        width: c,
                        height: c,
                        borderColor: color,
                        borderTopWidth: pos[0] === 't' ? t : 0,
                        borderBottomWidth: pos[0] === 'b' ? t : 0,
                        borderLeftWidth: pos[1] === 'l' ? t : 0,
                        borderRightWidth: pos[1] === 'r' ? t : 0,
                        ...(pos[0] === 't' ? { top: 0 } : { bottom: 0 }),
                        ...(pos[1] === 'l' ? { left: 0 } : { right: 0 }),
                    }}
                />
            );
            body = <View style={{ width: size, height: size }}>{['tl', 'tr', 'bl', 'br'].map(corner)}</View>;
            break;
        }
        case 'file':
            body = (
                <View style={{ width: size * 0.76, height: size * 0.94, borderWidth: t, borderColor: color, borderRadius: size * 0.12, alignItems: 'center', justifyContent: 'center', gap: size * 0.1 }}>
                    <View style={{ width: size * 0.38, height: t, backgroundColor: color }} />
                    <View style={{ width: size * 0.38, height: t, backgroundColor: color }} />
                </View>
            );
            break;
        case 'chart':
            body = (
                <View style={{ width: size, height: size, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: size * 0.12 }}>
                    <View style={{ width: t * 1.6, height: size * 0.4, backgroundColor: color, borderRadius: t }} />
                    <View style={{ width: t * 1.6, height: size * 0.72, backgroundColor: color, borderRadius: t }} />
                    <View style={{ width: t * 1.6, height: size * 0.55, backgroundColor: color, borderRadius: t }} />
                </View>
            );
            break;
        case 'refresh':
            body = (
                <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
                    <View style={{ width: size * 0.72, height: size * 0.72, borderRadius: size * 0.36, borderWidth: t, borderColor: color, borderTopColor: 'transparent', transform: [{ rotate: '-35deg' }] }} />
                    <View style={{ position: 'absolute', top: size * 0.08, right: size * 0.16, width: 0, height: 0, borderLeftWidth: size * 0.09, borderRightWidth: size * 0.09, borderBottomWidth: size * 0.13, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: color, transform: [{ rotate: '55deg' }] }} />
                </View>
            );
            break;
        case 'alert':
            body = (
                <View style={{ width: size * 0.86, height: size * 0.8, backgroundColor: color, borderTopLeftRadius: size * 0.4, borderTopRightRadius: size * 0.4, borderBottomRightRadius: size * 0.4, borderBottomLeftRadius: size * 0.12, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: COLORS.bg, fontSize: size * 0.48, fontWeight: '900' }}>!</Text>
                </View>
            );
            break;
        default:
            body = null;
    }

    return (
        <View pointerEvents="none" importantForAccessibility="no" style={[{ alignItems: 'center', justifyContent: 'center' }, style]}>
            {body}
        </View>
    );
}


function Header() {
    return (
        <View style={s.header}>
            <Text style={s.headerTitle} numberOfLines={1}>
                Content <Text style={{ color: COLORS.accent }}>Buster</Text>
            </Text>
        </View>
    );
}

function PrimaryButton({ icon, label, onPress, disabled, loading }) {
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled || loading}
            accessibilityRole="button"
            accessibilityLabel={label}
            android_ripple={{ color: COLORS.onAccent }}
            style={({ pressed }) => [s.primaryBtn, (pressed || loading) && s.pressed, disabled && s.disabled]}
        >
            {loading ? (
                <ActivityIndicator color={COLORS.onAccent} size={18} />
            ) : icon ? (
                <Icon name={icon} size={19} color={COLORS.onAccent} />
            ) : null}
            <Text style={s.primaryLabel}>{label}</Text>
        </Pressable>
    );
}

function GhostButton({ icon, label, onPress, disabled }) {
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={label}
            style={({ pressed }) => [s.ghostBtn, pressed && s.pressed, disabled && s.disabled]}
        >
            {icon ? <Icon name={icon} size={19} color={COLORS.text} /> : null}
            <Text style={s.ghostLabel}>{label}</Text>
        </Pressable>
    );
}

function UploadPane({ busy, onLibrary, onCamera }) {
    return (
        <View style={s.dropzone}>
            {busy ? (
                <View style={s.busyBox}>
                    <ActivityIndicator size="large" color={COLORS.accent} />
                    <Text style={s.busyText}>Reading image…</Text>
                </View>
            ) : (
                <>
                    <Image
                        source={require('../../assets/searching.gif')}
                        style={s.searchingGif}
                        resizeMode="contain"
                    />
                    <Text style={s.dropTitle}>Upload Image</Text>
                    <Text style={s.dropSub}>{'Check whether an image is likely\nAI-generated'}</Text>

                    <View style={s.capRow}>
                        {UPLOAD_COPY.capabilities.map((cap) => (
                            <View key={cap} style={s.capChip}>
                                <Text style={s.capChipText}>{cap}</Text>
                            </View>
                        ))}
                    </View>

                    <Text style={s.privacyNote}>{UPLOAD_COPY.privacy}</Text>
                    <PrimaryButton icon="upload" label="Choose an image" onPress={onLibrary} />

                </>
            )}
        </View>
    );
}

function PreviewCard({ meta, height, onFull }) {
    return (
        <View style={[s.preview, { height }]}>
            <Image source={{ uri: meta.uri }} style={s.previewImg} resizeMode="cover" />
            <View style={s.chip}>
                <Icon name="image" size={16} color={COLORS.text} />
                <Text style={s.chipName} numberOfLines={1}>
                    {meta.name}
                </Text>
            </View>
            <Pressable
                onPress={onFull}
                accessibilityRole="button"
                accessibilityLabel="View full image"
                style={({ pressed }) => [s.viewFull, pressed && s.pressed]}
            >
                <Icon name="expand" size={14} color={COLORS.text} />
                <Text style={s.viewFullLabel}>View full image</Text>
            </Pressable>
        </View>
    );
}

function ProgressCard() {
    return (
        <View style={s.progressCard}>
            <ActivityIndicator size="large" color={COLORS.accent} />
            <Text style={s.progressTitle}>Analyzing image…</Text>
            <Text style={s.progressSub}>Running deepfake &amp; generation detectors</Text>
        </View>
    );
}

function VerdictCard({ report }) {
    const tone = TONE_COLOR[report.tone];
    return (
        <View style={[s.verdictCard, { backgroundColor: TONE_DIM[report.tone] }]}>
            <View style={s.verdictIconBox}>
                <View style={[s.verdictHalo, { backgroundColor: tone }]} />
                <View style={s.verdictHaloInner}>
                    <Icon name="alert" size={30} color={tone} />
                </View>
            </View>
            <View style={s.verdictBody}>
                <Text style={[s.verdictHead, { color: tone }]} numberOfLines={2}>
                    {report.headline}
                </Text>
                <Text style={[s.verdictPercent, { color: tone }]}>{report.percent}%</Text>
            </View>
        </View>
    );
}

function DetailsCard({ rows }) {
    return (
        <View style={s.detailsCard}>
            {rows.map((row, i) => (
                <View key={row.key} style={[s.row, i > 0 && s.rowBorder]}>
                    <Icon name={ROW_ICONS[row.key]} size={19} color={COLORS.text} />
                    <Text style={s.rowLabel}>{row.label}</Text>
                    <Text style={s.rowValue} numberOfLines={1}>
                        {row.value}
                    </Text>
                </View>
            ))}
        </View>
    );
}

function ErrorCard({ message, onRetry, retryLabel }) {
    return (
        <View style={s.errorCard}>
            <View style={s.errorHead}>
                <Icon name="alert" size={20} color={COLORS.danger} />
                <Text style={s.errorTitle}>Analysis failed</Text>
            </View>
            <Text style={s.errorMsg}>{message}</Text>
            {onRetry ? <PrimaryButton icon="refresh" label={retryLabel || 'Try again'} onPress={onRetry} /> : null}
        </View>
    );
}

const INITIAL = { status: 'idle', source: 'library', meta: null, rows: [], report: null, error: null };

function reducer(state, action) {
    switch (action.type) {
        case 'reading':
            return { ...INITIAL, status: 'reading', source: action.source };
        case 'analyzing':
            return { ...state, status: 'analyzing', meta: action.meta, error: null };
        case 'success':
            return { ...state, status: 'result', rows: action.rows, report: action.report, error: null };
        case 'fail':
            return { ...state, status: 'error', error: action.error };
        case 'reset':
            return { ...INITIAL, source: state.source };
        default:
            return state;
    }
}

function toErrorState(err) {
    if (err instanceof AiGenError) return { code: err.code, message: err.message, retryable: err.retryable };
    return { code: 'UNKNOWN', message: 'Something went wrong while processing the image.', retryable: true };
}


export default function AiContentBusterScreen({ onBack = () => { } }) {
    const [state, dispatch] = useReducer(reducer, INITIAL);
    const [fullOpen, setFullOpen] = useState(false);
    const { width } = useWindowDimensions();
    const previewHeight = Math.round(Math.min(width * 0.58, 420));
    const busy = state.status === 'reading' || state.status === 'analyzing';

    const runAnalysis = useCallback(async (meta) => {
        dispatch({ type: 'analyzing', meta });
        try {
            const { rows, report } = await analyze(meta);
            dispatch({ type: 'success', rows, report });
        } catch (err) {
            dispatch({ type: 'fail', error: toErrorState(err) });
        }
    }, []);

    const startPick = useCallback(
        async (source) => {
            if (busy) return;
            dispatch({ type: 'reading', source });
            try {
                const meta = await pickImage(source);
                await runAnalysis(meta);
            } catch (err) {
                if (err?.code === ERR.CANCELLED) {
                    dispatch({ type: 'reset' });
                    return;
                }
                dispatch({ type: 'fail', error: toErrorState(err) });
            }
        },
        [busy, runAnalysis],
    );

    const reset = useCallback(() => {
        setFullOpen(false);
        dispatch({ type: 'reset' });
    }, []);

    const retry = useCallback(() => {
        if (state.meta) runAnalysis(state.meta);
        else startPick(state.source);
    }, [state.meta, state.source, runAnalysis, startPick]);

    const pickLibrary = useCallback(() => startPick('library'), [startPick]);
    const pickCamera = useCallback(() => startPick('camera'), [startPick]);
    const openFull = useCallback(() => setFullOpen(true), []);
    const closeFull = useCallback(() => setFullOpen(false), []);

    const detailRows = state.rows.filter((r) => DETAIL_KEYS.includes(r.key));
    const showUpload = !state.meta;
    const showResult = state.status === 'result';

    return (
        <View style={s.page}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />
            <Header />

            <ScrollView contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">
                {showUpload ? (
                    <>
                        <UploadPane busy={state.status === 'reading'} onLibrary={pickLibrary} onCamera={pickCamera} />
                        <Text style={s.note}>{supportNote()}</Text>
                        {state.status === 'error' ? (
                            <ErrorCard message={state.error.message} onRetry={state.error.retryable ? retry : null} />
                        ) : null}
                    </>
                ) : null}

                {state.meta ? (
                    <>
                        <PreviewCard meta={state.meta} height={previewHeight} onFull={openFull} />

                        {state.status === 'analyzing' ? <ProgressCard /> : null}
                        {state.status === 'error' ? (
                            <ErrorCard
                                message={state.error.message}
                                onRetry={state.error.retryable ? retry : null}
                                retryLabel="Retry analysis"
                            />
                        ) : null}

                        {showResult ? (
                            <>
                                <VerdictCard report={state.report} />
                                <Text style={s.sectionTitle}>Analysis details</Text>
                                <DetailsCard rows={detailRows} />
                                <PrimaryButton icon="refresh" label="Scan another image" onPress={reset} />
                            </>
                        ) : null}

                        {state.status === 'error' ? (
                            <GhostButton icon="image" label="Choose a different image" onPress={reset} />
                        ) : null}
                    </>
                ) : null}
            </ScrollView>

            <Modal visible={fullOpen && !!state.meta} onRequestClose={closeFull} animationType="fade">
                <View style={s.page}>
                    <StatusBar barStyle="dark-content" backgroundColor="#fff" />
                    <View style={s.modalBar}>
                        <Text style={s.modalName} numberOfLines={1}>
                            {state.meta?.name}
                        </Text>
                        <Pressable
                            onPress={closeFull}
                            hitSlop={10}
                            accessibilityRole="button"
                            accessibilityLabel="Close full image"
                            android_ripple={{ color: COLORS.surfaceHigh, borderless: true }}
                            style={({ pressed }) => [s.modalClose, pressed && s.pressed]}
                        >
                            <Icon name="close" size={17} color={COLORS.text} />
                        </Pressable>
                    </View>
                    <Image source={{ uri: state.meta?.uri }} style={s.modalImg} resizeMode="contain" />
                </View>
            </Modal>
        </View>
    );
}


const s = StyleSheet.create({
    page: { flex: 1, backgroundColor: COLORS.bg },
    scrollContent: { padding: 20, paddingBottom: 44, gap: 16 },
    pressed: { opacity: 0.75 },
    disabled: { opacity: 0.45 },

    header: {
        paddingHorizontal: 20,
        paddingTop: 18,
        paddingBottom: 4,
        backgroundColor: COLORS.bg,
    },
    headerTitle: { color: '#000', fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },

    dropzone: {
        backgroundColor: COLORS.surface,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: COLORS.border,
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 44,
        paddingTop: 15,
        alignItems: 'center',
    },
    searchingGif: {
        width: 250,
        height: 250,
    },
    busyBox: { minHeight: 320, alignItems: 'center', justifyContent: 'center', gap: 14 },
    busyText: { color: COLORS.textDim, fontSize: 14 },
    dropTitle: { color: COLORS.text, fontSize: 22, fontWeight: '700' },
    dropSub: { color: COLORS.textDim, fontSize: 15, textAlign: 'center', marginBottom: 10 },
    note: { color: COLORS.textDim, fontSize: 13, lineHeight: 20, textAlign: 'center' },

    primaryBtn: {
        width: '100%',
        height: 54,
        borderRadius: 999,
        backgroundColor: COLORS.accent,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingHorizontal: 22,
    },
    primaryLabel: { color: COLORS.onAccent, fontSize: 16, fontWeight: '700' },
    ghostBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 46, marginTop: 4 },
    ghostLabel: { color: COLORS.text, fontSize: 15, fontWeight: '600' },

    preview: { borderRadius: 18, overflow: 'hidden', backgroundColor: COLORS.surfaceHigh },
    previewImg: { width: '100%', height: '100%' },
    chip: {
        position: 'absolute',
        top: 12,
        left: 12,
        maxWidth: '70%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: COLORS.surface,
        borderColor: COLORS.border,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 9,
    },
    chipName: { flex: 1, color: COLORS.text, fontSize: 13, fontWeight: '600' },
    viewFull: {
        position: 'absolute',
        right: 12,
        bottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        height: 40,
        paddingHorizontal: 12,
        borderRadius: 12,
        backgroundColor: COLORS.surface,
        borderColor: COLORS.border,
        borderWidth: 1,
    },
    viewFullLabel: { color: COLORS.text, fontSize: 13, fontWeight: '600' },

    progressCard: {
        backgroundColor: COLORS.surface,
        borderColor: COLORS.border,
        borderWidth: 1,
        borderRadius: 18,
        padding: 24,
        alignItems: 'center',
        gap: 10,
    },
    progressTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
    progressSub: { color: COLORS.textDim, fontSize: 13 },

    verdictCard: { borderRadius: 15, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 16 },
    verdictIconBox: { width: 44, height: 44 },
    verdictHalo: { position: 'absolute', inset: 0, borderRadius: 32, opacity: 0.22 },
    verdictHaloInner: { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' },
    verdictBody: { flex: 1 },
    verdictHead: { fontSize: 10, fontWeight: '700', letterSpacing: 1.1 },
    verdictPercent: { fontSize: 20, fontWeight: '800', marginTop: 2 },

    sectionTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700', marginTop: 6, marginBottom: -6 },
    detailsCard: {
        backgroundColor: COLORS.surface,
        borderColor: COLORS.border,
        borderWidth: 1,
        borderRadius: 18,
        paddingHorizontal: 16,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
    rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border },
    rowLabel: { flex: 1, color: COLORS.text, fontSize: 15 },
    rowValue: { color: COLORS.text, fontSize: 14, fontWeight: '600' },

    errorCard: { backgroundColor: COLORS.dangerDim, borderColor: COLORS.danger, borderWidth: 1, borderRadius: 18, padding: 16, gap: 10 },
    errorHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    errorTitle: { color: COLORS.danger, fontSize: 15, fontWeight: '700' },
    errorMsg: { color: COLORS.text, fontSize: 14, lineHeight: 20 },

    modalBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 56, paddingHorizontal: 16 },
    modalName: { flex: 1, color: COLORS.text, fontSize: 15, fontWeight: '600' },
    modalClose: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    modalImg: { flex: 1, width: '100%', backgroundColor: COLORS.bg },
    capRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 6,
        marginTop: 14,
        marginBottom: 14,
    },
    capChip: {
        backgroundColor: COLORS.surfaceHigh,
        borderColor: COLORS.border,
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 9,
        paddingVertical: 5,
    },
    capChipText: {
        color: COLORS.text,
        fontSize: 11.5,
        fontWeight: '600',
    },
    privacyNote: {
        color: COLORS.textDim,
        fontSize: 12,
        lineHeight: 18,
        textAlign: 'center',
        maxWidth: 320,
        marginBottom: 22,
    },
});