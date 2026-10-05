export const COLORS = {
    bg: '#F7F9FC',
    surface: '#FFFFFF',
    surfaceHigh: '#F1F5F9',
    border: '#E2E8F0',
    text: '#000000',
    textDim: '#64748B',
    accent: '#31bba1',
    accentDim: '#E6F7F4',
    onAccent: '#FFFFFF',
    warn: '#D97706',
    warnDim: '#FEF3C7',
    danger: '#DC2626',
    dangerDim: '#FEE2E2',
    primary: '#003088',
};

export const STORES = {
    play: 'com.android.vending',
    oem: ['com.sec.android.app.samsungapps', 'com.huawei.appmarket', 'com.xiaomi.market', 'com.oppo.market', 'com.heytap.market', 'com.amazon.venezia'],
};

export const PROTO_COLORS = {
    tls: COLORS.accent,
    quic: '#A78BFA',
    clear: COLORS.warn,
    iponly: COLORS.textDim,
    other: COLORS.textDim,
};
export const PROTO_LABELS = { tls: 'TLS', quic: 'QUIC', clear: 'Cleartext', iponly: 'IP only' };

export const LIMITS = { oldSdk: 22, staleDays: 365 * 4 };

export const FLAGS = {
    verified: { label: 'Verified', tone: 'accent', tick: '✓' },
    oem: { label: 'Verified by OEM', tone: 'accent', tick: '✓' },
    preinstalled: { label: 'Preinstalled', tone: 'accent', tick: '✓' },
    unknownOrigin: { label: 'Unknown Origin', tone: 'warn', tick: '!' },
    outdatedSdk: { label: 'Outdated SDK', tone: 'warn', tick: '!' },
    stale: { label: 'Abandoned', tone: 'warn', tick: '!' },
    debuggable: { label: 'Debuggable App', tone: 'danger', tick: '!' },
};

export const RISK_FLAGS = ['unknownOrigin', 'outdatedSdk', 'stale', 'debuggable'];