import React, { useEffect, useRef } from 'react';
import {
    Animated, Platform, BackHandler, Dimensions, Image, Pressable, SafeAreaView, ScrollView,
    StatusBar, StyleSheet, Text, View,
} from 'react-native';
import { COLORS } from '../../constants';
import { AccessDetailsFunc } from './detailsFunc';

const TONE_BG = { accent: COLORS.accentDim, warn: COLORS.warnDim, danger: COLORS.dangerDim };
const TONE_FG = { accent: COLORS.accent, warn: COLORS.warn, danger: COLORS.danger };

function Icon({ name, size = 22, color = COLORS.text, strokeWidth = 1.6 }) {
    const s = strokeWidth;
    const stroke = (style) => [{ position: 'absolute', borderColor: color, borderWidth: s, backgroundColor: 'transparent' }, style];
    const fill = (style) => [{ position: 'absolute', backgroundColor: color }, style];
    let inner = null;
    switch (name) {
        case 'chevron-right':
            inner = <View style={stroke({ width: size * 0.42, height: size * 0.42, borderLeftWidth: 0, borderBottomWidth: 0, transform: [{ rotate: '45deg' }], left: size * 0.24, top: size * 0.2 })} />;
            break;
        case 'chevron-left':
            inner = <View style={stroke({ width: size * 0.42, height: size * 0.42, borderLeftWidth: 0, borderBottomWidth: 0, transform: [{ rotate: '225deg' }], left: size * 0.34, top: size * 0.2 })} />;
            break;
        case 'sms':
            inner = (
                <>
                    <View style={stroke({ width: size * 0.86, height: size * 0.6, borderRadius: size * 0.14, left: size * 0.07, top: size * 0.14 })} />
                    <View style={stroke({ width: size * 0.16, height: size * 0.16, borderTopWidth: 0, borderRightWidth: 0, transform: [{ rotate: '45deg' }], left: size * 0.2, top: size * 0.62 })} />
                    <View style={fill({ width: size * 0.46, height: s, borderRadius: s, left: size * 0.27, top: size * 0.32 })} />
                    <View style={fill({ width: size * 0.3, height: s, borderRadius: s, left: size * 0.27, top: size * 0.48 })} />
                </>
            );
            break;
        case 'mic':
            inner = (
                <>
                    <View style={stroke({ width: size * 0.34, height: size * 0.48, borderRadius: size * 0.17, left: size * 0.33, top: size * 0.06 })} />
                    <View style={stroke({ width: size * 0.62, height: size * 0.34, borderBottomLeftRadius: size * 0.31, borderBottomRightRadius: size * 0.31, borderTopWidth: 0, left: size * 0.19, top: size * 0.34 })} />
                    <View style={fill({ width: s, height: size * 0.14, left: size / 2 - s / 2, top: size * 0.68 })} />
                    <View style={fill({ width: size * 0.3, height: s, borderRadius: s, left: size * 0.35, top: size * 0.84 })} />
                </>
            );
            break;
        case 'layers':
            inner = (
                <>
                    <View style={stroke({ width: size * 0.56, height: size * 0.46, borderRadius: size * 0.1, left: size * 0.1, top: size * 0.1 })} />
                    <View style={stroke({ width: size * 0.56, height: size * 0.46, borderRadius: size * 0.1, left: size * 0.34, top: size * 0.42 })} />
                </>
            );
            break;
        case 'folder':
            inner = (
                <>
                    <View style={fill({ width: size * 0.34, height: s, borderRadius: s, left: size * 0.08, top: size * 0.26 })} />
                    <View style={stroke({ width: size * 0.84, height: size * 0.52, borderRadius: size * 0.1, left: size * 0.08, top: size * 0.3 })} />
                </>
            );
            break;
        case 'wifi':
            inner = (
                <>
                    <View style={stroke({ width: size * 0.9, height: size * 0.45, borderTopLeftRadius: size * 0.45, borderTopRightRadius: size * 0.45, borderBottomWidth: 0, left: size * 0.05, top: size * 0.16 })} />
                    <View style={stroke({ width: size * 0.58, height: size * 0.29, borderTopLeftRadius: size * 0.29, borderTopRightRadius: size * 0.29, borderBottomWidth: 0, left: size * 0.21, top: size * 0.36 })} />
                    <View style={stroke({ width: size * 0.28, height: size * 0.14, borderTopLeftRadius: size * 0.14, borderTopRightRadius: size * 0.14, borderBottomWidth: 0, left: size * 0.36, top: size * 0.56 })} />
                    <View style={fill({ width: s * 1.8, height: s * 1.8, borderRadius: s, left: size / 2 - s * 0.9, top: size * 0.74 })} />
                </>
            );
            break;
        case 'globe':
            inner = (
                <>
                    <View style={stroke({ width: size * 0.84, height: size * 0.84, borderRadius: size * 0.42, left: size * 0.08, top: size * 0.08 })} />
                    <View style={fill({ width: size * 0.84, height: s, left: size * 0.08, top: size / 2 - s / 2 })} />
                    <View style={stroke({ width: size * 0.4, height: size * 0.84, borderRadius: size * 0.2, left: size * 0.3, top: size * 0.08 })} />
                </>
            );
            break;
        case 'camera':
            inner = (
                <>
                    <View style={fill({ width: size * 0.28, height: s, borderRadius: s, left: size * 0.2, top: size * 0.22 })} />
                    <View style={stroke({ width: size * 0.88, height: size * 0.56, borderRadius: size * 0.12, left: size * 0.06, top: size * 0.3 })} />
                    <View style={stroke({ width: size * 0.28, height: size * 0.28, borderRadius: size * 0.14, left: size / 2 - size * 0.14, top: size * 0.44 })} />
                </>
            );
            break;
        case 'pin':
            inner = (
                <>
                    <View style={stroke({ width: size * 0.56, height: size * 0.56, borderRadius: size * 0.28, left: size * 0.22, top: size * 0.08 })} />
                    <View style={stroke({ width: size * 0.24, height: size * 0.24, borderTopWidth: 0, borderLeftWidth: 0, transform: [{ rotate: '45deg' }], left: size * 0.38, top: size * 0.5 })} />
                </>
            );
            break;
        case 'person':
            inner = (
                <>
                    <View style={stroke({ width: size * 0.34, height: size * 0.34, borderRadius: size * 0.17, left: size * 0.33, top: size * 0.1 })} />
                    <View style={stroke({ width: size * 0.66, height: size * 0.34, borderTopLeftRadius: size * 0.33, borderTopRightRadius: size * 0.33, borderBottomWidth: 0, left: size * 0.17, top: size * 0.56 })} />
                </>
            );
            break;
        case 'bell':
            inner = (
                <>
                    <View style={stroke({ width: size * 0.6, height: size * 0.44, borderTopLeftRadius: size * 0.3, borderTopRightRadius: size * 0.3, borderBottomWidth: 0, left: size * 0.2, top: size * 0.14 })} />
                    <View style={fill({ width: size * 0.76, height: s, borderRadius: s, left: size * 0.12, top: size * 0.58 })} />
                    <View style={fill({ width: s * 1.8, height: s * 1.8, borderRadius: s, left: size / 2 - s * 0.9, top: size * 0.7 })} />
                </>
            );
            break;
        case 'devices':
            inner = (
                <>
                    <View style={stroke({ width: size * 0.5, height: size * 0.62, borderRadius: size * 0.1, left: size * 0.06, top: size * 0.12 })} />
                    <View style={stroke({ width: size * 0.3, height: size * 0.44, borderRadius: size * 0.08, left: size * 0.62, top: size * 0.36 })} />
                </>
            );
            break;
        case 'phone':
            inner = <View style={fill({ width: size * 0.66, height: size * 0.26, borderRadius: size * 0.13, transform: [{ rotate: '45deg' }], left: size * 0.17, top: size * 0.37 })} />;
            break;
        case 'vibrate':
            inner = (
                <>
                    <View style={stroke({ width: size * 0.3, height: size * 0.62, borderRadius: size * 0.12, left: size * 0.35, top: size * 0.19 })} />
                    <View style={stroke({ width: size * 0.16, height: size * 0.4, borderTopLeftRadius: size * 0.16, borderBottomLeftRadius: size * 0.16, borderRightWidth: 0, left: size * 0.12, top: size * 0.3 })} />
                    <View style={stroke({ width: size * 0.16, height: size * 0.4, borderTopRightRadius: size * 0.16, borderBottomRightRadius: size * 0.16, borderLeftWidth: 0, left: size * 0.72, top: size * 0.3 })} />
                </>
            );
            break;
        case 'shield':
            inner = (
                <>
                    <View style={stroke({ width: size * 0.68, height: size * 0.76, borderTopLeftRadius: size * 0.12, borderTopRightRadius: size * 0.12, borderBottomLeftRadius: size * 0.34, borderBottomRightRadius: size * 0.34, left: size * 0.16, top: size * 0.1 })} />
                    <View style={fill({ width: s, height: size * 0.2, borderRadius: s, left: size / 2 - s / 2, top: size * 0.3 })} />
                    <View style={fill({ width: s * 1.6, height: s * 1.6, borderRadius: s, left: size / 2 - s * 0.8, top: size * 0.56 })} />
                </>
            );
            break;
        case 'alert':
            inner = (
                <>
                    <View style={stroke({ width: size * 0.86, height: size * 0.86, borderRadius: size * 0.43, left: size * 0.07, top: size * 0.07 })} />
                    <View style={fill({ width: s, height: size * 0.32, borderRadius: s, left: size / 2 - s / 2, top: size * 0.26 })} />
                    <View style={fill({ width: s * 1.6, height: s * 1.6, borderRadius: s, left: size / 2 - s * 0.8, top: size * 0.64 })} />
                </>
            );
            break;
        default:
            inner = null;
    }
    return <View pointerEvents="none" style={{ width: size, height: size }}>{inner}</View>;
}

function AppTile({ app, initials, size = 88 }) {
    if (app?.icon) {
        return (
            <Image
                source={{ uri: `data:image/png;base64,${app.icon}` }}
                style={{ width: size, height: size, borderRadius: size * 0.24 }}
                resizeMode="cover"
            />
        );
    }
    return (
        <View style={{ width: size, height: size, borderRadius: size * 0.24, backgroundColor: COLORS.accentDim, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: COLORS.accent, fontSize: size * 0.32, fontWeight: '800' }}>{initials}</Text>
        </View>
    );
}

const PermissionRow = ({ item }) => (
    <View style={styles.permRow}>
        <Icon name={item.icon} size={22} color={COLORS.text} />
        <View style={styles.permBody}>
            <Text style={styles.permLabel}>{item.label}</Text>
            <Text style={styles.permDesc}>{item.description}</Text>
        </View>
    </View>
);

export default function AppDetailScreen({ app, onBack }) {
    const { sections, riskHits, flags, header, banner, openInSettings } = AccessDetailsFunc(app);
    const slide = useRef(new Animated.Value(Dimensions.get('window').width)).current;
    const STATUS_PAD = Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0;
    useEffect(() => {
        Animated.spring(slide, { toValue: 0, useNativeDriver: true, speed: 30, bounciness: 0 }).start();
    }, [slide]);

    useEffect(() => {
        const sub = BackHandler.addEventListener('hardwareBackPress', () => { onBack(); return true; });
        return () => sub.remove();
    }, [onBack]);

    return (
        <Animated.View style={[styles.root, { transform: [{ translateX: slide }] }]}>
            <SafeAreaView style={[styles.root, { paddingTop: STATUS_PAD }]}>
                <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
                <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                    <Pressable onPress={onBack} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Go back">
                        <Icon name="chevron-left" size={18} color={COLORS.text} />
                    </Pressable>

                    <View style={styles.headerRow}>
                        <AppTile app={app} initials={header.initials} />
                        <View style={styles.headerText}>
                            <Text style={styles.appName}>{header.name}</Text>
                            <Text style={styles.appVersion}>{header.version}</Text>
                            <Text style={styles.appDeveloper}>{header.source}</Text>
                            <View style={styles.flagRow}>
                                {flags.map((f) => (
                                    <View key={f.key} style={[styles.flagChip, { backgroundColor: TONE_BG[f.tone] }]}>
                                        <Text style={[styles.flagChipText, { color: TONE_FG[f.tone] }]}>{f.tick} {f.label}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <Text style={styles.sectionTitle}>Permissions</Text>
                    <Text style={styles.sectionSubtitle}>This app can access the following on your device</Text>

                    {riskHits.length > 0 && (
                        <View style={styles.riskCard}>
                            <Icon name="alert" size={20} color={COLORS.warn} />
                            <View style={styles.riskBody}>
                                <Text style={styles.riskTitle}>Permission-based verdict: {riskHits[0].severity}</Text>
                                <Text style={styles.riskReason}>{riskHits[0].reason}</Text>
                            </View>
                        </View>
                    )}

                    <View style={styles.permList}>
                        {sections.primary.map((item) => (
                            <PermissionRow key={item.id} item={item} />
                        ))}
                    </View>

                    <Text style={styles.otherLabel}>Other permissions</Text>
                    <View style={styles.permList}>
                        {sections.other.map((item) => (
                            <PermissionRow key={item.id} item={item} />
                        ))}
                    </View>

                    <View style={styles.banner}>
                        <Icon name="shield" size={26} color={COLORS.accent} />
                        <Text style={styles.bannerText}>{banner.message}</Text>
                    </View>

                    <Pressable style={styles.settingsLink} onPress={openInSettings} accessibilityRole="button">
                        <Text style={styles.settingsLinkText}>Manage permissions in system settings</Text>
                        <Icon name="chevron-right" size={14} color={COLORS.accent} />
                    </Pressable>
                </ScrollView>
            </SafeAreaView>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: COLORS.bg },
    safe: { flex: 1 },
    scroll: { padding: 16, paddingBottom: 40 },
    backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
    headerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 18 },
    headerText: { flex: 1, marginLeft: 14 },
    appName: { color: COLORS.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.4 },
    appVersion: { color: COLORS.textDim, fontSize: 14, marginTop: 6 },
    appDeveloper: { color: COLORS.textDim, fontSize: 13, marginTop: 4 },
    flagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
    flagChip: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
    flagChipText: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.3 },
    divider: { height: 1, backgroundColor: COLORS.border, marginTop: 18 },
    sectionTitle: { color: COLORS.text, fontSize: 20, fontWeight: '800', marginTop: 18 },
    sectionSubtitle: { color: COLORS.textDim, fontSize: 13.5, marginTop: 4 },
    riskCard: { flexDirection: 'row', backgroundColor: COLORS.warnDim, borderRadius: 14, padding: 12, marginTop: 14 },
    riskBody: { flex: 1, marginLeft: 10 },
    riskTitle: { color: COLORS.warn, fontSize: 13, fontWeight: '800' },
    riskReason: { color: COLORS.text, fontSize: 12, lineHeight: 17, marginTop: 4 },
    permList: { marginTop: 14, gap: 10 },
    permRow: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: COLORS.surface, borderRadius: 14, padding: 14 },
    permBody: { flex: 1, marginLeft: 12 },
    permLabel: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
    permDesc: { color: COLORS.textDim, fontSize: 12.5, lineHeight: 17, marginTop: 3 },
    otherLabel: { color: COLORS.textDim, fontSize: 13, marginTop: 18, marginBottom: -2 },
    banner: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.accentDim, borderRadius: 16, padding: 16, marginTop: 22 },
    bannerText: { color: COLORS.accent, fontSize: 14, fontWeight: '700', marginLeft: 12 },
    settingsLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
    settingsLinkText: { color: COLORS.accent, fontSize: 13, fontWeight: '700', marginRight: 4 },
});