import { NativeModules } from 'react-native';
import { useCallback, useMemo } from 'react';
import { FLAGS, LIMITS, RISK_FLAGS, STORES } from '../../constants';
import { assessAppRisk, metaFor } from './listFunc';

const DAY_MS = 86400000;

export const initialsOf = (name = '') =>
    name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase();

export function computeFlags(app) {
    if (!app) return [];
    const keys = [];
    if (app.installer === STORES.play) keys.push('verified');
    else if (STORES.oem.includes(app.installer)) keys.push('oem');
    else if (app.system) keys.push('preinstalled');
    else keys.push('unknownOrigin');
    if (app.targetSdk && app.targetSdk <= LIMITS.oldSdk) keys.push('outdatedSdk');
    if (app.lastUpdate && Date.now() - app.lastUpdate > LIMITS.staleDays * DAY_MS) keys.push('stale');
    if (app.debuggable) keys.push('debuggable');
    return keys.map((key) => ({ key, ...FLAGS[key] }));
}

export const riskFlagsOf = (app) => computeFlags(app).filter((f) => RISK_FLAGS.includes(f.key));

export function sourceLabel(app) {
    if (!app?.installer) return app?.system ? 'Preinstalled system app' : 'Sideloaded — unknown source';
    if (app.installer === STORES.play) return 'Installed via Google Play';
    if (STORES.oem.includes(app.installer)) return 'Installed via OEM store';
    return `Installed via ${app.installer}`;
}

export function AccessDetailsFunc(app) {
    const sections = useMemo(() => {
        const primary = [];
        const other = [];
        (app?.permissions || []).forEach((id) => {
            const entry = { id, ...metaFor(id) };
            (entry.sensitive ? primary : other).push(entry);
        });
        return { primary, other };
    }, [app]);

    const riskHits = useMemo(() => assessAppRisk(app), [app]);
    const flags = useMemo(() => computeFlags(app), [app]);

    const header = useMemo(() => ({
        name: app?.name || 'Unknown app',
        version: `Version ${app?.version || 'unknown'}`,
        source: sourceLabel(app),
        icon: app?.icon || null,
        initials: initialsOf(app?.name),
    }), [app]);

    const banner = useMemo(() => ({ message: 'Review permissions carefully' }), []);

    const openInSettings = useCallback(() => {
        const bridge = NativeModules.InstalledApps;
        if (bridge?.openSettings && app?.id) bridge.openSettings(app.id);
    }, [app]);

    return { sections, riskHits, flags, header, banner, openInSettings };
}