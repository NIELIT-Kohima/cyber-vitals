import { NativeModules } from 'react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';

export const AI_SCAN_ENDPOINT = 'https://api.accesscontrol.app/v1/permission-scan';
const SIMULATED_BACKEND = true;
const SIMULATED_FLAG_COUNT = 2;
const SIMULATED_LATENCY_MS = 1400;
const REQUEST_TIMEOUT_MS = 15000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const PERMISSION_META = {
    READ_SMS: { label: 'Read SMS', short: 'Read SMS', icon: 'sms', sensitive: true, description: 'Allows the app to read your text messages', note: 'Includes OTP / 2FA codes — read access alone enables account-takeover fraud.' },
    SEND_SMS: { label: 'Send SMS', short: 'Send SMS', icon: 'sms', sensitive: true, description: 'Allows the app to send text messages', note: 'Can silently send premium-rate SMS or spread itself to your contacts.' },
    RECEIVE_SMS: { label: 'Receive SMS', short: 'Receive SMS', icon: 'sms', sensitive: true, description: 'Allows the app to receive and process text messages', note: 'Can intercept OTP codes before you ever see them.' },
    RECORD_AUDIO: { label: 'Record audio', short: 'Microphone', icon: 'mic', sensitive: true, description: 'Allows the app to record audio', note: 'Microphone access captures calls, meetings and surroundings at any time.' },
    CAMERA: { label: 'Camera', short: 'Camera', icon: 'camera', sensitive: true, description: 'Allows the app to take pictures and record video', note: 'Can capture photos or video whenever the app is in use.' },
    ACCESS_FINE_LOCATION: { label: 'Location', short: 'Location', icon: 'pin', sensitive: true, description: 'Allows the app to access your precise location', note: 'Precise location reveals home, workplace and daily movement patterns.' },
    ACCESS_COARSE_LOCATION: { label: 'Approximate location', short: 'Location', icon: 'pin', sensitive: true, description: 'Allows the app to access your approximate location', note: 'Coarse location still reveals your area and movement.' },
    READ_CONTACTS: { label: 'Contacts', short: 'Contacts', icon: 'person', sensitive: true, description: 'Allows the app to read your contact list', note: 'Contact lists are commonly harvested for spam or social-graph profiling.' },
    READ_CALL_LOG: { label: 'Call log', short: 'Call log', icon: 'phone', sensitive: true, description: 'Allows the app to read your call history', note: 'Call history exposes who you talk to, and when.' },
    SYSTEM_ALERT_WINDOW: { label: 'Display over other apps', short: 'Overlay', icon: 'layers', sensitive: true, description: 'Allows the app to show content on top of other apps', note: 'Overlays can spoof login screens and intercept taps (overlay attacks).' },
    READ_PHONE_STATE: { label: 'Phone state', short: 'Phone state', icon: 'phone', sensitive: true, description: 'Allows the app to access device identifiers and call state', note: 'Exposes hardware identifiers that enable cross-app tracking.' },
    GET_ACCOUNTS: { label: 'Device accounts', short: 'Accounts', icon: 'person', sensitive: true, description: 'Allows the app to access the list of accounts on the device', note: 'Exposes which accounts (email, social) are configured on the device.' },
    READ_MEDIA_IMAGES: { label: 'Access photos and media', short: 'Photos', icon: 'folder', sensitive: false, description: 'Allows the app to access photos, media and files on your device', note: 'Scoped to media files — still review what the app uploads.' },
    READ_EXTERNAL_STORAGE: { label: 'Storage', short: 'Storage', icon: 'folder', sensitive: false, description: 'Allows the app to read files on your device', note: 'Broad file access can expose documents outside the media folders.' },
    WRITE_EXTERNAL_STORAGE: { label: 'Modify storage', short: 'Storage', icon: 'folder', sensitive: false, description: 'Allows the app to write files on your device', note: 'Write access can modify or delete your files.' },
    ACCESS_NETWORK_STATE: { label: 'View network connections', short: 'Network', icon: 'wifi', sensitive: false, description: 'Allows the app to view information about network connections', note: 'Read-only network info — low risk on its own.' },
    INTERNET: { label: 'Full network access', short: 'Internet', icon: 'globe', sensitive: false, description: 'Allows the app to create network sockets and use the internet', note: 'Needed for online features; combined with sensitive reads it enables exfiltration.' },
    POST_NOTIFICATIONS: { label: 'Notifications', short: 'Notifications', icon: 'bell', sensitive: false, description: 'Allows the app to post notifications', note: 'Low risk — used for alerts and incoming messages.' },
    VIBRATE: { label: 'Vibrate', short: 'Vibrate', icon: 'vibrate', sensitive: false, description: 'Allows the app to control the vibrator', note: 'Harmless on its own.' },
    WAKE_LOCK: { label: 'Keep device awake', short: 'Wake lock', icon: 'vibrate', sensitive: false, description: 'Allows the app to prevent the device from sleeping', note: 'Mostly used for playback and downloads; minor battery impact.' },
    BLUETOOTH_CONNECT: { label: 'Nearby devices', short: 'Nearby devices', icon: 'devices', sensitive: false, description: 'Allows the app to connect to paired Bluetooth devices', note: 'Used for headsets and casting; can also infer device proximity.' },
    BLUETOOTH_SCAN: { label: 'Scan nearby devices', short: 'Nearby devices', icon: 'devices', sensitive: true, description: 'Allows the app to scan for nearby Bluetooth devices', note: 'Scanning can be used for indoor tracking via beacons.' },
};

const SENSITIVE_PATTERN = /(READ_|SEND_|RECORD_|CAMERA|LOCATION|CONTACTS|CALL_LOG|SYSTEM_ALERT_WINDOW|PHONE_STATE|SMS|ACCOUNTS|BIOMETRIC|BODY_SENSORS)/;
const prettify = (id) =>
    String(id).split('.').pop().replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

export const metaFor = (id) =>
    PERMISSION_META[id] || {
        label: prettify(id),
        short: prettify(id),
        icon: 'shield',
        sensitive: SENSITIVE_PATTERN.test(id),
        description: 'Permission requested by this app on your device',
        note: 'No additional information available for this permission.',
    };

export const isSensitivePermission = (id) => metaFor(id).sensitive;

const ABUSIVE_COMBOS = [
    { severity: 'MALICIOUS', perms: ['READ_SMS', 'RECORD_AUDIO', 'SYSTEM_ALERT_WINDOW'], reason: 'Requests READ_SMS + RECORD_AUDIO + SYSTEM_ALERT_WINDOW: it can read OTPs, record audio and paint fake overlays on top of real apps. No legitimate utility needs this trio — the combo alone is the verdict, regardless of who published it.' },
    { severity: 'MALICIOUS', perms: ['READ_CONTACTS', 'READ_CALL_LOG', 'INTERNET'], reason: 'Harvests the contact list and call history and has full network access to upload both — the signature of predatory loan and spam apps.' },
    { severity: 'SUSPICIOUS', perms: ['READ_SMS', 'SYSTEM_ALERT_WINDOW'], reason: 'Can read SMS (including OTPs) while drawing overlays that spoof legitimate UI — a classic credential/OTP interception pair.' },
    { severity: 'SUSPICIOUS', perms: ['READ_SMS', 'INTERNET'], reason: 'Can read your text messages and transmit them over the network — SMS exfiltration channel.' },
    { severity: 'SUSPICIOUS', perms: ['RECORD_AUDIO', 'SYSTEM_ALERT_WINDOW'], reason: 'Microphone plus overlay windows can capture audio while disguising itself as legitimate interface.' },
];
const SEVERITY_RANK = { MALICIOUS: 0, SUSPICIOUS: 1 };

export function assessPermissions(permissions = []) {
    return ABUSIVE_COMBOS
        .filter((combo) => combo.perms.every((p) => permissions.includes(p)))
        .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
}
export const assessAppRisk = (app) => assessPermissions(app?.permissions);

const normalizeApp = (raw) => ({
    id: raw?.packageName,
    name: raw?.label || raw?.packageName || 'Unknown app',
    version: raw?.versionName || 'unknown',
    installer: raw?.installer || null,
    system: !!raw?.system,
    debuggable: !!raw?.debuggable,
    targetSdk: Number(raw?.targetSdk) || 0,
    lastUpdate: Number(raw?.lastUpdate) || 0,
    permissions: Array.isArray(raw?.permissions) ? raw.permissions : [],
    icon: raw?.icon || null,
    launchable: raw?.launchable !== false,
});

export async function fetchInstalledApps() {
    const bridge = NativeModules.InstalledApps;
    if (!bridge || typeof bridge.getInstalledApps !== 'function') {
        throw new Error('InstalledApps native bridge unavailable — rebuild the dev client.');
    }
    const rows = await bridge.getInstalledApps();
    return (rows || [])
        .map(normalizeApp)
        .filter((app) => !!app.id && app.launchable)
        .sort((a, b) => a.name.localeCompare(b.name));
}
export function buildPermissionsCsv(apps) {
    const escape = (value) => `"${String(value).replace(/"/g, '""')}"`;
    const lines = ['app_identifier,top_permissions,total_permission_count'];

    (apps || []).forEach((app) => {
        const relevantPerms = app.permissions
            .map(p => {
                if (p.startsWith('android.permission.')) {
                    return p.replace('android.permission.', '');
                }
                if (p.includes('.permission.') || p.includes('.provider')) {
                    return null;
                }
                return p;
            })
            .filter(Boolean);

        const sorted = relevantPerms.sort((a, b) => {
            return (isSensitivePermission(b) ? 1 : 0) - (isSensitivePermission(a) ? 1 : 0);
        });

        const cappedPerms = sorted.slice(0, 15);
        lines.push(`${app.id},${escape(cappedPerms.join('|'))},${app.permissions.length}`);
    });

    return lines.join('\n');
}

export function parsePermissionsCsv(csv) {
    return String(csv)
        .split('\n')
        .slice(1)
        .map((line) => line.match(/^([^,]+),"([^"]*)",(\d+)$/))
        .filter(Boolean)
        .map(([, id, perms, count]) => ({
            id,
            permissions: perms.split('|').filter(Boolean),
            count: Number(count),
        }));
}

export async function requestAiScan(csv) {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = setTimeout(() => controller?.abort(), REQUEST_TIMEOUT_MS);
    try {
        if (SIMULATED_BACKEND) {
            await sleep(SIMULATED_LATENCY_MS);
            const response = simulateServerResponse(csv);
            // if (__DEV__) console.log('[AI_SCAN] csv:\n' + csv, '\n[AI_SCAN] dummy response:', response);
            return response;
        }
        const res = await fetch(AI_SCAN_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'text/csv', Accept: 'application/json' },
            body: csv,
            signal: controller?.signal,
        });
        if (!res.ok) throw new Error(`Scan request failed with status ${res.status}`);
        return validateScanResponse(await res.json());
    } catch (error) {
        if (error?.name === 'AbortError') throw new Error('Scan timed out — please try again.');
        throw new Error(error?.message || 'Unable to reach the scan service.');
    } finally {
        clearTimeout(timer);
    }
}

function simulateServerResponse(csv) {
    const ranked = parsePermissionsCsv(csv)
        .map((row) => ({ row, sensitive: row.permissions.filter(isSensitivePermission) }))
        .sort((a, b) => b.sensitive.length - a.sensitive.length || b.row.count - a.row.count);

    return ranked.slice(0, SIMULATED_FLAG_COUNT).map(({ row, sensitive }) => {
        const hits = assessPermissions(row.permissions);
        const verdict = hits[0]?.severity || (sensitive.length >= 4 ? 'MALICIOUS' : 'SUSPICIOUS');
        const reason = hits[0]?.reason || genericReason(row, sensitive);
        return { [row.id]: verdict, reason };
    });
}

function genericReason(row, sensitive) {
    const list = sensitive.length ? sensitive : row.permissions.slice(0, 3);
    return `Flags ${list.length} sensitive capabilit${list.length === 1 ? 'y' : 'ies'} (${list.join(', ')}) beyond what its function obviously needs. The verdict is derived from the permission set alone — the publisher's identity is not considered.`;
}

export function validateScanResponse(json) {
    if (!Array.isArray(json)) throw new Error('Malformed scan response from server.');
    return json;
}

export function parseScanResponse(items, apps) {
    return (items || []).map((item) => {
        const idKey = Object.keys(item).find((key) => key !== 'reason');
        const id = idKey || 'unknown';
        const known = (apps || []).find((app) => app.id === id);
        return {
            id,
            name: known?.name || prettify(id),
            verdict: idKey ? item[idKey] : 'FLAGGED',
            reason: item.reason || 'No reason provided.',
        };
    });
}

export function AccessListFunc() {
    const [apps, setApps] = useState(null);
    const [loadError, setLoadError] = useState(null);
    const [query, setQuery] = useState('');
    const [selected, setSelected] = useState(null);

    const load = useCallback(async () => {
        setApps(null);
        setLoadError(null);
        try {
            setApps(await fetchInstalledApps());
        } catch (error) {
            setLoadError(error?.message || 'Could not read installed apps from this device.');
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const filtered = useMemo(() => {
        if (!apps) return [];
        const q = query.trim().toLowerCase();
        if (!q) return apps;
        return apps.filter((app) => app.name.toLowerCase().includes(q) || app.id.toLowerCase().includes(q));
    }, [apps, query]);

    return {
        apps, filtered, query, setQuery, selected,
        loading: apps === null && !loadError,
        loadError, reload: load,
        openApp: setSelected,
        closeApp: useCallback(() => setSelected(null), []),
    };
}
export function useAiScan(apps) {
    const [phase, setPhase] = useState('idle');
    const [items, setItems] = useState([]);
    const [csv, setCsv] = useState('');
    const [error, setError] = useState(null);

    const scan = useCallback(async () => {
        if (!apps?.length || phase === 'scanning') return;
        setPhase('scanning');
        setError(null);

        try {
            const sizeOf = (app) =>
                app.id.length +
                app.permissions.join('|').length +
                String(app.permissions.length).length;

            const heavyApps = [...apps]
                .sort((a, b) => sizeOf(b) - sizeOf(a))
                .slice(0, 10);

            const payload = buildPermissionsCsv(heavyApps);

            if (__DEV__) {
                console.log('[HEAVY_10_PAYLOAD]', {
                    apps: heavyApps.length,
                    chars: payload.length,
                    approxTokens: Math.ceil(payload.length / 4),
                    payload,
                });
            }

            const result = await requestAiScan(payload);

            setCsv(payload);
            setItems(parseScanResponse(result, apps));
            setPhase('done');
        } catch (err) {
            setError(err?.message || 'Unexpected scan error.');
            setPhase('error');
        }
    }, [apps, phase]);

    const dismiss = useCallback(() => {
        setPhase('idle');
        setItems([]);
        setError(null);
    }, []);

    return {
        phase, items, csv, error, scan, dismiss,
        modalVisible: phase === 'done' || phase === 'error',
    };
}

export function summarizePermissions(app, visible = 2) {
    const labels = (app.permissions || []).slice(0, visible).map((p) => metaFor(p).short);
    const rest = (app.permissions || []).length - visible;
    if (!labels.length) return 'No declared permissions';
    return rest > 0 ? `${labels.join(', ')} +${rest} more` : labels.join(', ');
}