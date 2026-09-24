import { useMemo } from 'react';
import { Alert, NativeModules } from 'react-native';
import { FLAGS, LIMITS, RISK_FLAGS } from '../../constants';
import { timeAgo } from './listFunc';

const { InstalledApps } = NativeModules;
const DAY = 864e5;

export default function SourceDetailsFunc(route, navigation) {
    const app = route.params.app;

    const rows = useMemo(() => {
        const has = (f) => app.flags.includes(f);
        const stale = Date.now() - app.lastUpdate > LIMITS.staleDays * DAY;
        return [
            {
                glyph: '▶\uFE0E', title: 'App Source', sub: app.installer || 'No installer record (sideloaded)',
                value: has('unknownOrigin') ? 'Unknown Origin' : has('preinstalled') ? 'Preinstalled' : 'Trusted Store',
                tone: has('unknownOrigin') ? 'danger' : has('preinstalled') ? 'textDim' : 'accent'
            },
            {
                glyph: '⚙\uFE0E', title: 'Debuggable', sub: app.debuggable ? 'Application is debuggable' : 'Release build',
                value: app.debuggable ? 'Flagged' : 'Safe', tone: app.debuggable ? 'danger' : 'accent'
            },
            {
                glyph: '</>', title: 'Target SDK', sub: `Targets Android SDK ${app.targetSdk}`,
                value: has('outdatedSdk') ? 'Outdated' : 'Current', tone: has('outdatedSdk') ? 'warn' : 'accent'
            },
            {
                glyph: '⏱\uFE0E', title: 'Last Updated', sub: `${new Date(app.lastUpdate).toDateString()} (${timeAgo(app.lastUpdate)})`,
                value: stale ? 'Outdated' : 'Recent', tone: stale ? 'warn' : 'accent'
            },
        ];
    }, [app]);

    const unsafeText = useMemo(() => {
        if (!app.risky) return null;
        const hits = app.flags.filter((f) => RISK_FLAGS.includes(f));
        return `${hits.map((f) => FLAGS[f].label).join(', ')}. It may contain modified code or malicious behavior.`;
    }, [app]);

    return {
        app, rows, unsafeText,
        back: () => navigation.goBack(),
        open: async () => { if (!(await InstalledApps.openApp(app.packageName))) Alert.alert('Cannot open', 'This app has no launchable activity.'); },
        more: () => InstalledApps.openSettings(app.packageName),
        uninstall: () => Alert.alert(`Uninstall ${app.label}?`, 'It will be removed from this device.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Uninstall', style: 'destructive', onPress: () => { InstalledApps.uninstallApp(app.packageName); navigation.goBack(); } },
        ]),
    };
}