import React from 'react';
import { Image, Modal, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants';
import SourceDetailsFunc from './details-function';

const renderRowIcon = (title) => {
    switch (title) {
        case 'App Source':
            return <Ionicons name="cube-outline" size={18} color={COLORS.accent} />;
        case 'Debuggable':
            return <Ionicons name="bug-outline" size={18} color={COLORS.accent} />;
        case 'Target SDK':
            return <Ionicons name="code-slash" size={18} color={COLORS.accent} />;
        case 'Last Updated':
            return <Ionicons name="time-outline" size={18} color={COLORS.accent} />;
        default:
            return <Ionicons name="shield-outline" size={18} color={COLORS.accent} />;
    }
};

export default function SourceDetails({ route, navigation }) {
    const { app, rows, unsafeText, back, open, more, confirmVisible, showConfirm, hideConfirm, confirmUninstall } = SourceDetailsFunc(route, navigation);

    return (
        <View style={st.root}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />
            <ScrollView contentContainerStyle={st.pad} showsVerticalScrollIndicator={false}>
                <TouchableOpacity onPress={back} style={st.backButton} accessibilityRole="button" accessibilityLabel="Go back">
                    <Ionicons name="chevron-back" size={18} color="#fff" />
                </TouchableOpacity>

                <View style={st.head}>
                    <Image source={{ uri: `data:image/png;base64,${app.icon}` }} style={st.icon} />
                    <View style={st.ml14}>
                        <Text style={st.title}>{app.label}</Text>
                        <Text style={st.sub}>{app.packageName}</Text>
                        <Text style={st.sub}>Version {app.versionName || 'unknown'}</Text>
                    </View>
                </View>

                {!app.system && (
                    <View style={st.actions}>
                        <TouchableOpacity style={st.action} onPress={showConfirm}>
                            <Ionicons name="trash-outline" size={18} color="#000" />
                            <Text style={st.actionLabel}>Uninstall</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={st.action} onPress={more}>
                            <Ionicons name="settings-outline" size={18} color={COLORS.text} />
                            <Text style={st.actionLabel}>More</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <View style={st.card}>
                    <View style={st.cardHead}>
                        <View style={st.shield}>
                            <Ionicons name="shield-checkmark" size={16} color="#fff" />
                        </View>
                        <Text style={st.cardTitle}>Security Analysis</Text>
                    </View>
                    {rows.map((r) => (
                        <View key={r.title} style={st.row}>
                            <View style={st.rowIcon}>
                                {renderRowIcon(r.title)}
                            </View>
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
                        <View style={st.bannerDot}>
                            <Ionicons name="warning" size={18} color="#fff" />
                        </View>
                        <View style={st.grow}>
                            <Text style={st.bannerTitle}>This app may be unsafe</Text>
                            <Text style={st.bannerText}>{unsafeText}</Text>
                        </View>
                    </View>
                )}

                {!app.system && (
                    <TouchableOpacity style={st.uninstallBtn} onPress={showConfirm}>
                        <Text style={st.uninstallText}>Uninstall</Text>
                    </TouchableOpacity>
                )}
            </ScrollView>

            <Modal
                visible={confirmVisible}
                transparent
                animationType="fade"
                statusBarTranslucent
                onRequestClose={hideConfirm}
            >
                <View style={st.modalOverlay}>
                    <View style={st.modalCard}>
                        <View style={st.modalIconWrap}>
                            <Ionicons name="trash-outline" size={26} color={COLORS.danger} />
                        </View>
                        <Text style={st.modalTitle}>Uninstall {app.label}?</Text>
                        <Text style={st.modalDesc}>This app will be removed from your device along with its data.</Text>
                        <View style={st.modalActions}>
                            <TouchableOpacity style={st.modalCancelBtn} onPress={hideConfirm} activeOpacity={0.7}>
                                <Text style={st.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={st.modalDeleteBtn} onPress={confirmUninstall} activeOpacity={0.7}>
                                <Text style={st.modalDeleteText}>Uninstall</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const st = StyleSheet.create({
    root: { flex: 1, backgroundColor: COLORS.bg },
    pad: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 45 },
    backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
    head: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
    icon: { width: 68, height: 68, borderRadius: 16, backgroundColor: COLORS.surfaceHigh },
    ml14: { marginLeft: 14, flex: 1 },
    title: { color: COLORS.text, fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
    sub: { color: COLORS.textDim, fontSize: 12.5, marginTop: 3 },
    actions: { flexDirection: 'row', gap: 10, marginTop: 18 },
    action: { flex: 1, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: '#EAEAEA', borderRadius: 14, paddingVertical: 14, alignItems: 'center', gap: 6 },
    actionLabel: { color: COLORS.text, fontSize: 12.5, fontWeight: '700' },
    card: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: '#EAEAEA', borderRadius: 16, padding: 14, marginTop: 18 },
    cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
    shield: { width: 28, height: 28, borderRadius: 8, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center' },
    cardTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
    rowIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: COLORS.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
    grow: { flex: 1 },
    rowTitle: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
    rowValue: { fontSize: 12, fontWeight: '700' },
    banner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.dangerDim, borderWidth: 1, borderColor: COLORS.danger, borderRadius: 14, padding: 14, marginTop: 14 },
    bannerDot: { width: 34, height: 34, borderRadius: 10, backgroundColor: COLORS.danger, alignItems: 'center', justifyContent: 'center' },
    bannerTitle: { color: COLORS.danger, fontSize: 14, fontWeight: '700', marginBottom: 4 },
    bannerText: { color: COLORS.text, fontSize: 12, lineHeight: 17 },
    uninstallBtn: { backgroundColor: COLORS.danger, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 18 },
    uninstallText: { color: '#fff', fontSize: 15, fontWeight: '800' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.55)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    modalCard: { width: '100%', maxWidth: 340, backgroundColor: '#fff', borderRadius: 20, padding: 22, alignItems: 'center' },
    modalIconWrap: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
    modalTitle: { color: '#000', fontSize: 18, fontWeight: '800', textAlign: 'center', letterSpacing: -0.3 },
    modalDesc: { color: COLORS.textDim, fontSize: 13, lineHeight: 18, textAlign: 'center', marginTop: 6, marginBottom: 20 },
    modalActions: { flexDirection: 'row', gap: 10, width: '100%' },
    modalCancelBtn: { flex: 1, backgroundColor: '#F1F5F9', borderRadius: 12, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
    modalCancelText: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
    modalDeleteBtn: { flex: 1, backgroundColor: COLORS.danger, borderRadius: 12, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
    modalDeleteText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});