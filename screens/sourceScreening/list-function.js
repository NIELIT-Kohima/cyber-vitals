import { useCallback, useEffect, useMemo, useState } from 'react';
import { NativeModules } from 'react-native';
import { LIMITS, RISK_FLAGS, STORES } from '../../constants';

const { InstalledApps } = NativeModules;
const BADGE_ORDER = ['debuggable', 'unknownOrigin', 'outdatedSdk', 'stale', 'verified', 'oem', 'preinstalled'];
const DAY = 864e5;

export const timeAgo = (ts) => {
    const m = Math.floor((Date.now() - ts) / 6e4);
    if (m < 1) return 'just now';
    if (m < 60) return `${m} minute${m > 1 ? 's' : ''} ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} hour${h > 1 ? 's' : ''} ago`;
    const d = Math.floor(h / 24);
    if (d < 365) return `${d} day${d > 1 ? 's' : ''} ago`;
    const y = Math.floor(d / 365);
    return `${y} year${y > 1 ? 's' : ''} ago`;
};

export const analyze = (a) => {
    const flags = [];
    if (a.system) flags.push('preinstalled');
    else if (a.installer === STORES.play) flags.push('verified');
    else if (STORES.oem.includes(a.installer)) flags.push('oem');
    else flags.push('unknownOrigin');
    if (a.debuggable) flags.push('debuggable');
    if (a.targetSdk > 0 && a.targetSdk <= LIMITS.oldSdk) flags.push('outdatedSdk');
    if (Date.now() - a.lastUpdate > LIMITS.staleDays * DAY) flags.push('stale');
    return {
        ...a,
        flags,
        risky: !a.system && flags.some((f) => RISK_FLAGS.includes(f)),
        badge: BADGE_ORDER.find((f) => flags.includes(f)),
    };
};

export default function ListFunc(navigation) {
    const [apps, setApps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [scannedAt, setScannedAt] = useState(null);
    const [tab, setTab] = useState('installed');
    const [query, setQuery] = useState('');

    const reload = useCallback(async () => {
        if (!InstalledApps) return setError('Native module "InstalledApps" is not linked.');
        setLoading(true);
        setError(null);
        try {
            setApps((await InstalledApps.getInstalledApps()).map(analyze));
            setScannedAt(Date.now());
        } catch (e) {
            setError(e.message || 'Failed to scan installed apps');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { reload(); }, [reload]);

    const { highlighted, other, list } = useMemo(() => {
        const q = query.trim().toLowerCase();

        const base = apps
            .filter((a) =>
                tab === 'risky'
                    ? a.risky
                    : tab === 'system'
                        ? a.system
                        : !a.system
            )
            .filter(
                (a) =>
                    !q ||
                    a.label.toLowerCase().includes(q) ||
                    a.packageName.includes(q)
            );

        const highlightedList = [];
        const otherList = [];

        base.forEach((app) => {
            if (app.flags.includes('debuggable') || app.flags.includes('unknownOrigin')) {
                highlightedList.push(app);
            } else {
                otherList.push(app);
            }
        });

        highlightedList.sort((a, b) => {
            const aDbg = a.flags.includes('debuggable') ? 0 : 1;
            const bDbg = b.flags.includes('debuggable') ? 0 : 1;
            if (aDbg !== bDbg) return aDbg - bDbg;
            return a.label.localeCompare(b.label);
        });

        otherList.sort((a, b) => a.label.localeCompare(b.label));

        return {
            highlighted: highlightedList,
            other: otherList,
            list: [...highlightedList, ...otherList],
        };
    }, [apps, tab, query]);

    return {
        list,
        highlighted,
        other,
        total: apps.length,
        riskyCount: useMemo(() => apps.filter((a) => a.risky).length, [apps]),
        loading, error, reload, tab, setTab, query, setQuery,
        scannedLabel: scannedAt ? `Last scanned ${timeAgo(scannedAt)}` : 'Not scanned yet',
        open: (app) => navigation.navigate('SourceDetails', { app }),
    };
}