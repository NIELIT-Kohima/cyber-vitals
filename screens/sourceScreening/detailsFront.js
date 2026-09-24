import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../constants';
import SourceDetailsFunc from './detailsFunc';

export default function SourceDetailsFront({ route, navigation }) {
    const { app, rows, unsafeText, back, open, more, uninstall } = SourceDetailsFunc(route, navigation);

    return (
        <SafeAreaView style={st.root} edges={['top']}>
            <ScrollView contentContainerStyle={st.pad}>
                <TouchableOpacity onPress={back}><Text style={st.back}>‹</Text></TouchableOpacity>
                <View style={st.head}>
                    <Image source={{ uri: `data:image/png;base64,${app.icon}` }} style={st.icon} />
                    <View style={st.ml14}>
                        <Text style={st.title}>{app.label}</Text>
                        <Text style={st.sub}>{app.packageName}</Text>
                        <Text style={st.sub}>Version {app.versionName || 'unknown'}</Text>
                    </View>
                </View>
                <View style={st.actions}>
                    {[['Uninstall', '✕', uninstall, 'text'], ['More', '⋯', more, 'text']].map(([l, g, fn, tone]) => (
                        <TouchableOpacity key={l} style={st.action} onPress={fn}>
                            <Text style={[st.actionGlyph, { color: COLORS[tone] }]}>{g}</Text>
                            <Text style={st.actionLabel}>{l}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <View style={st.card}>
                    <View style={st.cardHead}>
                        <View style={st.shield}><Text style={st.shieldTick}>✓</Text></View>
                        <Text style={st.cardTitle}>Security Analysis</Text>
                    </View>
                    {rows.map((r) => (
                        <View key={r.title} style={st.row}>
                            <View style={st.rowIcon}><Text style={st.rowGlyph}>{r.glyph}</Text></View>
                            <View style={st.grow}>
                                <Text style={st.rowTitle}>{r.title}</Text>
                                <Text style={st.sub}>{r.sub}</Text>
                            </View>
                            <Text style={[st.rowValue, { color: COLORS[r.tone] }]}>{r.value}</Text>
                        </View>
                    ))}
                </View>
                {unsafeText && (
                    <View style={st.banner}>
                        <View style={st.bannerDot}><Text style={st.bannerDotTick}>!</Text></View>
                        <View style={st.grow}>
                            <Text style={st.bannerTitle}>This app may be unsafe</Text>
                            <Text style={st.bannerText}>{unsafeText}</Text>
                        </View>
                    </View>
                )}
                <TouchableOpacity style={st.uninstallBtn} onPress={uninstall}>
                    <Text style={st.uninstallText}>Uninstall App</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const st = StyleSheet.create({
    root: { flex: 1, backgroundColor: COLORS.bg },
    pad: { paddingHorizontal: 16, paddingBottom: 24 },
    back: { color: COLORS.text, fontSize: 30, lineHeight: 34, paddingHorizontal: 8, alignSelf: 'flex-start' },
    head: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
    icon: { width: 72, height: 72, borderRadius: 16, backgroundColor: COLORS.surfaceHigh },
    ml14: { marginLeft: 14, flex: 1 },
    title: { color: COLORS.text, fontSize: 20, fontWeight: '700' },
    sub: { color: COLORS.textDim, fontSize: 12, marginTop: 3 },
    actions: { flexDirection: 'row', gap: 10, marginTop: 20 },
    action: { flex: 1, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, paddingVertical: 14, alignItems: 'center', gap: 6 },
    actionGlyph: { fontSize: 16 },
    actionLabel: { color: COLORS.text, fontSize: 12, fontWeight: '600' },
    card: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, padding: 14, marginTop: 18 },
    cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
    shield: { width: 26, height: 28, borderRadius: 8, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center' },
    shieldTick: { color: COLORS.onAccent, fontSize: 14, fontWeight: '800' },
    cardTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
    rowIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: COLORS.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
    rowGlyph: { color: COLORS.text, fontSize: 13, fontWeight: '700' },
    grow: { flex: 1 },
    rowTitle: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
    rowValue: { fontSize: 12, fontWeight: '700' },
    banner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.dangerDim, borderWidth: 1, borderColor: COLORS.danger, borderRadius: 14, padding: 14, marginTop: 14 },
    bannerDot: { width: 34, height: 34, borderRadius: 10, backgroundColor: COLORS.danger, alignItems: 'center', justifyContent: 'center' },
    bannerDotTick: { color: COLORS.bg, fontSize: 18, fontWeight: '800' },
    bannerTitle: { color: COLORS.danger, fontSize: 14, fontWeight: '700', marginBottom: 4 },
    bannerText: { color: COLORS.text, fontSize: 12, lineHeight: 17 },
    uninstallBtn: { backgroundColor: COLORS.accent, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 16 },
    uninstallText: { color: COLORS.onAccent, fontSize: 15, fontWeight: '800' },
});