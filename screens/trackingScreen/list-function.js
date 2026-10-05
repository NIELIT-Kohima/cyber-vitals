import { useEffect, useState, useCallback } from 'react';
import { NativeModules, AppState } from 'react-native';
import { FLAGS, LIMITS, RISK_FLAGS, STORES } from '../../constants';

export const Native = NativeModules.UsageStatsModule;

const DAY = 864e5;
export const RANGES = [
  { key: 'today', label: 'Today', days: 1 },
  { key: '24h', label: 'Last 24 Hours', days: 1 },
  { key: '7d', label: 'Last 7 Days', days: 7 },
];
const daysFor = (key) => RANGES.find((r) => r.key === key)?.days ?? 1;

export const rangeBounds = (key) => {
  if (key === '24h') {
    return { start: Date.now() - DAY, end: Date.now() };
  }
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return { start: start.getTime() - (daysFor(key) - 1) * DAY, end: Date.now() };
};
export const axisBounds = (key) => {
  const { start } = rangeBounds(key);
  return { start, end: start + daysFor(key) * DAY };
};
export const binsFor = (key) => (key === 'today' ? 24 : key === '7d' ? 7 : 30);

export const fmtDuration = (ms = 0) => {
  const m = Math.round(ms / 60000);
  if (m < 1) return '<1m';
  const h = Math.floor(m / 60), d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m}m`;
};
export const fmtTime = (ts) => new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
export const fmtDate = (ts) => (ts ? new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '—');
export const fmtDayTime = (ts) => {
  const sameDay = new Date(ts).toDateString() === new Date().toDateString();
  const day = sameDay ? 'Today' : new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' });
  return `${day}, ${fmtTime(ts)}`;
};

export const deriveFlags = (a = {}) => {
  const flags = [];
  flags.push(
    a.installer === STORES.play ? 'verified'
      : STORES.oem.includes(a.installer) ? 'oem'
        : a.system ? 'preinstalled' : 'unknownOrigin',
  );
  if (a.targetSdk && a.targetSdk <= LIMITS.oldSdk) flags.push('outdatedSdk');
  if (a.updated && Date.now() - a.updated > LIMITS.staleDays * DAY) flags.push('stale');
  if (a.debuggable) flags.push('debuggable');
  return flags;
};
const TONE_RANK = { accent: 0, warn: 1, danger: 2 };
export const worstFlag = (flags = []) =>
  flags.slice().sort((a, b) => TONE_RANK[FLAGS[b]?.tone] - TONE_RANK[FLAGS[a]?.tone])[0] || null;
export const worstTone = (flags = []) => {
  const f = worstFlag(flags);
  return f ? FLAGS[f].tone : 'accent';
};
export const installerLabel = (m = {}) =>
  m.installer === STORES.play ? 'Google Play'
    : STORES.oem.includes(m.installer) ? 'OEM store'
      : m.system ? 'Preinstalled (system)'
        : m.installer || 'Side-loaded / unknown';

export const pairSessions = (events = []) => {
  const out = [];
  let open = null;
  for (const e of events.slice().sort((a, b) => a.ts - b.ts)) {
    if (e.type === 'resume') {
      if (open) out.push({ start: open, end: e.ts, ms: e.ts - open });
      open = e.ts;
    } else if (e.type === 'pause' && open) {
      out.push({ start: open, end: e.ts, ms: e.ts - open });
      open = null;
    }
  }
  if (open) out.push({ start: open, end: Date.now(), ms: Date.now() - open });
  return out.filter((s) => s.ms > 0).sort((a, b) => b.start - a.start);
};
export const buildTimeline = (sessions, axis, bins) => {
  const span = (axis.end - axis.start) / bins;
  const tl = Array.from({ length: bins }, (_, i) => ({ start: axis.start + i * span, ms: 0 }));
  for (const s of sessions) {
    for (let i = 0; i < bins; i++) {
      const b = tl[i];
      const overlap = Math.min(s.end, b.start + span) - Math.max(s.start, b.start);
      if (overlap > 0) b.ms += overlap;
    }
  }
  return tl;
};
export const bucketLabel = (b) =>
  ({ 10: 'Active', 20: 'Working Set', 30: 'Frequent', 40: 'Rare', 45: 'Restricted', 50: 'Never' }[b] || 'Unknown');

export const checkPermission = async () =>
  Native ? { granted: await Native.hasPermission(), simulated: false } : { granted: true, simulated: true };
export const openUsageSettings = () => Native?.openUsageAccessSettings();

export const loadUsage = async (rangeKey) => {
  const bounds = rangeBounds(rangeKey);
  let apps;
  let simulated = false;
  if (Native) apps = await Native.getAppUsage(bounds.start, bounds.end);
  else { apps = simUsage(bounds); simulated = true; }
  const enriched = apps
    .map((a) => ({ ...a, flags: deriveFlags(a) }))
    .filter((a) => a.totalMs > 0)
    .sort((a, b) => b.totalMs - a.totalMs);
  const total = enriched.reduce((s, a) => s + a.totalMs, 0);
  return {
    apps: enriched.map((a) => ({ ...a, pct: total ? Math.round((a.totalMs / total) * 100) : 0 })),
    total, simulated, bounds,
  };
};

const at = (h, m = 0, dayBack = 0) => { const d = new Date(); d.setHours(h, m, 0, 0); return d.getTime() - dayBack * DAY; };
const SIM = [
  { pkg: 'com.whatsapp', label: 'WhatsApp', installer: STORES.play, targetSdk: 34, upd: 21, bucket: 10, sess: [[9, 10, 9, 34], [13, 32, 14, 11], [19, 14, 20, 2], [21, 5, 21, 28]] },
  { pkg: 'com.instagram.android', label: 'Instagram', installer: STORES.play, targetSdk: 33, upd: 35, bucket: 20, sess: [[12, 0, 12, 40], [20, 5, 20, 37]] },
  { pkg: 'com.android.chrome', label: 'Chrome', installer: STORES.play, targetSdk: 34, upd: 12, bucket: 20, sess: [[11, 0, 11, 30], [18, 30, 18, 48]] },
  { pkg: 'com.google.android.youtube', label: 'YouTube', installer: STORES.play, targetSdk: 34, upd: 9, bucket: 30, sess: [[16, 0, 16, 32]] },
  { pkg: 'com.google.android.gm', label: 'Gmail', installer: STORES.play, targetSdk: 34, upd: 15, bucket: 30, sess: [[15, 0, 15, 18]] },
  { pkg: 'com.android.phone', label: 'Phone', system: true, targetSdk: 34, upd: 120, bucket: 20, sess: [[10, 0, 10, 12]] },
  { pkg: 'com.android.settings', label: 'Settings', system: true, targetSdk: 34, upd: 120, bucket: 10, sess: [[10, 14, 10, 22]] },
  { pkg: 'com.skyware.cleaner', label: 'SkyWare Cleaner', installer: 'com.side.load.store', targetSdk: 21, upd: 1610, debuggable: true, bucket: 40, sess: [], total: 6 * 60000, lastAgo: 2 * 3600e3 },
];
export const simSessions = (pkg, bounds) => {
  const app = SIM.find((a) => a.pkg === pkg);
  if (!app) return [];
  const days = Math.max(1, Math.round((bounds.end - bounds.start) / DAY));
  const out = [];
  for (let d = 0; d < days; d++) {
    for (const [sh, sm, eh, em] of app.sess) {
      const start = at(sh, sm, d), end = at(eh, em, d);
      if (end > bounds.start && start < bounds.end) out.push({ start, end, ms: end - start });
    }
  }
  return out.sort((a, b) => b.start - a.start);
};
export const simMeta = (pkg) => {
  const a = SIM.find((x) => x.pkg === pkg) || SIM[0];
  const sess = simSessions(a.pkg, rangeBounds('today'));
  return {
    pkg: a.pkg, label: a.label, icon: null, installer: a.installer || null, system: !!a.system,
    targetSdk: a.targetSdk, updated: Date.now() - (a.upd || 30) * DAY,
    firstInstall: Date.now() - ((a.upd || 30) + 400) * DAY, debuggable: !!a.debuggable, bucket: a.bucket,
    lastUsed: a.lastAgo ? Date.now() - a.lastAgo : sess[0]?.end ?? Date.now() - 3600e3,
    totalMs: a.total ?? sess.reduce((s, x) => s + x.ms, 0),
  };
};
const simUsage = (bounds) =>
  SIM.map((a) => {
    const sess = simSessions(a.pkg, bounds);
    const total = a.total ? a.total * Math.max(1, Math.round((bounds.end - bounds.start) / DAY)) : sess.reduce((s, x) => s + x.ms, 0);
    return { ...simMeta(a.pkg), totalMs: total, lastUsed: sess[0]?.end ?? simMeta(a.pkg).lastUsed };
  }).filter((x) => x.totalMs > 0);

export const TrackingListFunc = () => {
  const [state, set] = useState({
    status: 'loading', refreshing: false, permission: 'checking',
    range: 'today', sort: 'usage',
    apps: [], total: 0, simulated: false, error: null,
  });
  const load = useCallback(async (range, opts = {}) => {
    set((s) => ({ ...s, range, error: null, refreshing: !!opts.refresh && s.status === 'ready', status: s.status === 'ready' ? s.status : 'loading' }));
    try {
      const perm = await checkPermission();
      if (!perm.granted) { set((s) => ({ ...s, permission: 'denied', status: 'ready', refreshing: false, apps: [], total: 0 })); return; }
      const data = await loadUsage(range);
      set((s) => ({
        ...s,
        ...data,
        apps: s.sort === 'recent'
          ? [...data.apps].sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0))
          : data.apps,
        permission: 'granted',
        status: 'ready',
        refreshing: false
      }));
    } catch (e) {
      set((s) => ({ ...s, status: 'error', refreshing: false, error: e?.message || 'Unable to read usage stats.' }));
    }
  }, []);

  useEffect(() => { load('today'); }, [load]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (n) => { if (n === 'active') load(state.range, { refresh: true }); });
    return () => sub.remove();
  }, [load, state.range]);

  const setSort = useCallback((key) => {
    set((s) => {
      if (s.sort === key) return s;
      return {
        ...s,
        sort: key,
        apps: key === 'usage'
          ? [...s.apps].sort((a, b) => b.totalMs - a.totalMs)
          : [...s.apps].sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0))
      };
    });
  }, []);

  return {
    ...state,
    setRange: (key) => load(key),
    setSort,
    refresh: () => load(state.range, { refresh: true }),
    enableAccess: openUsageSettings,
  };
};


