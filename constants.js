export const COLORS = {
    bg: '#0A0F0C',
    surface: '#111814',
    surfaceHigh: '#18211C',
    border: '#20302A',
    text: '#EDF3EF',
    textDim: '#7E8B84',
    accent: '#2EE59D',
    accentDim: '#12352A',
    onAccent: '#062B1D',
    warn: '#F0B429',
    warnDim: '#3A2E14',
    danger: '#FF5C72',
    dangerDim: '#3A1620',
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
    verified: { label: 'Verified by Play', tone: 'accent', tick: '✓' },
    oem: { label: 'Verified by OEM', tone: 'accent', tick: '✓' },
    preinstalled: { label: 'Preinstalled', tone: 'accent', tick: '✓' },
    unknownOrigin: { label: 'Unknown Origin', tone: 'warn', tick: '!' },
    outdatedSdk: { label: 'Outdated SDK', tone: 'warn', tick: '!' },
    stale: { label: 'Abandoned', tone: 'warn', tick: '!' },
    debuggable: { label: 'Debuggable App', tone: 'danger', tick: '!' },
};

export const RISK_FLAGS = ['unknownOrigin', 'outdatedSdk', 'stale', 'debuggable'];