import { NativeModules, DeviceEventEmitter } from 'react-native';

export const MINUTE_MS = 60000;
export const RING_MS = 3 * 24 * 60 * MINUTE_MS;
export const RING_CAP = 50000;
export const RANGES = { '1H': 60 * MINUTE_MS, '24H': 1440 * MINUTE_MS, '7D': 10080 * MINUTE_MS };
export const RANGE_COLS = { '1H': 60, '24H': 96, '7D': 84 };
export const LIVE_MS = 2 * MINUTE_MS;
const MINUTES_KEEP = Math.ceil(RING_MS / MINUTE_MS);
const CATS = ['tls', 'quic', 'clear', 'iponly', 'other'];

const Bridge = NativeModules.NetworkTapModule || null;

export function onEvents(cb) {
    return DeviceEventEmitter.addListener('NetworkTapEvents', (payload) => {
        const batch = payload?.events || payload;
        if (Array.isArray(batch)) cb(batch);
    });
}

function onStatus(cb) {
    return DeviceEventEmitter.addListener('NetworkTapStatus', cb);
}

export const catOf = (ev) => {
    if (!ev.domain) return 'iponly';
    switch (ev.proto) {
        case 'tls': return 'tls';
        case 'quic': return 'quic';
        case 'clear': return 'clear';
        case 'dns': return 'clear';
        default: return 'other';
    }
};

export function fmtBytes(n) {
    if (!n) return '0 B';
    const u = ['B', 'KB', 'MB', 'GB'];
    const i = Math.min(u.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
    return `${(n / 1024 ** i).toFixed(i ? 1 : 0)} ${u[i]}`;
}
const p2 = (n) => String(n).padStart(2, '0');
export const fmtClock = (ts) => { const d = new Date(ts); return `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`; };
export const fmtHM = (ts) => { const d = new Date(ts); return `${p2(d.getHours())}:${p2(d.getMinutes())}`; };
export function fmtTick(ts, rk) {
    const d = new Date(ts);
    if (rk === '7D') return d.toLocaleDateString(undefined, { weekday: 'short' });
    if (rk === '24H') return `${p2(d.getHours())}:00`;
    return fmtHM(ts);
}
export function fmtDur(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    return `${p2(Math.floor(s / 3600))}:${p2(Math.floor(s / 60) % 60)}:${p2(s % 60)}`;
}
class NetworkStore {
    constructor() {
        this.version = 0;
        this.status = Bridge ? 'boot' : 'unsupported';
        this.error = null;
        this.startedAt = 0;
        this.apps = new Map();
        this.endpoints = new Map();
        this.events = [];
        this.minutes = new Map();
        this.monitoredAll = true;
        this.monitored = new Set();
        this._listeners = new Set();
        this._queued = false;
        if (Bridge) {
            onEvents((batch) => this._ingest(batch));
            onStatus((s) => this._status(s));
            this._hydrate();
        }
    }

    subscribe = (fn) => { this._listeners.add(fn); return () => this._listeners.delete(fn); };
    _emit() {
        if (this._queued) return;
        this._queued = true;
        setTimeout(() => { this._queued = false; this.version++; this._listeners.forEach((f) => f()); }, 350);
    }

    async _hydrate() {
        try {
            const apps = (await Bridge.getInstalledApps()) || [];
            apps.forEach((a) => this._upsertApp(a.uid, a));
            const buf = (await Bridge.drainEvents()) || [];
            if (buf.length) this._ingest(buf);
            const st = await Bridge.getStatus();
            this._status({ state: st });
        } catch (e) {
            this.status = 'error';
            this.error = e?.message || 'native bridge error';
        }
        this._emit();
    }

    _status(s) {
        const map = { active: 'active', stopped: 'idle', starting: 'starting', permission: 'permission', error: 'error' };
        this.status = map[s.state] || (Bridge ? 'idle' : 'unsupported');
        this.error = s.msg || null;
        if (s.state === 'active' && !this.startedAt) this.startedAt = s.ts || Date.now();
        if (s.state === 'stopped') this.startedAt = 0;
        this._emit();
    }

    async startTap() {
        if (!Bridge) { this.status = 'unsupported'; this._emit(); return; }
        this.status = 'starting'; this.error = null; this._emit();
        try {
            const r = await Bridge.startTap();
            if (r === 'permission') this.status = 'permission';
        } catch (e) { this.status = 'error'; this.error = e?.message || 'failed to start tap'; }
        this._emit();
    }
    async stopTap() {
        if (!Bridge) return;
        try { await Bridge.stopTap(); } catch (_) { }
        this.status = 'idle'; this.startedAt = 0; this._emit();
    }

    setMonitoredAll(v) {
        this.monitoredAll = v;
        if (v) this.monitored = new Set(this.apps.keys());
        this._emit();
    }
    toggleMonitored(uid) {
        if (this.monitoredAll) { this.monitored = new Set(this.apps.keys()); this.monitoredAll = false; }
        if (this.monitored.has(uid)) this.monitored.delete(uid); else this.monitored.add(uid);
        this._emit();
    }
    _isMonitored(uid) { return this.monitoredAll || this.monitored.has(uid); }

    _upsertApp(uid, base) {
        let a = this.apps.get(uid);
        if (!a) {
            a = {
                uid, pkg: base.pkg || '', label: base.label || `UID ${uid}`, icon: base.icon || null,
                conns: 0, total: 0, bytes: 0, firstSeen: 0, lastSeen: 0, clear: false,
            };
            this.apps.set(uid, a);
            if (this.monitoredAll) this.monitored.add(uid);
        }
        return a;
    }

    _ingest(batch) {
        const now = Date.now();
        for (const ev of batch) {
            if (ev.t === 'open') this._open(ev, now);
            else if (ev.t === 'close') this._close(ev, now);
        }
        this._prune(now);
        this._emit();
    }
    _open(ev, now) {
        if (!this._isMonitored(ev.uid)) return;
        const ts = ev.ts || now;
        const app = this._upsertApp(ev.uid, ev);
        app.total++; app.conns++; app.lastSeen = ts; if (!app.firstSeen) app.firstSeen = ts;
        const cat = catOf(ev);
        if (cat === 'clear') app.clear = true;

        const key = `${ev.uid}|${ev.ip}|${ev.proto}`;
        let ep = this.endpoints.get(key);
        if (!ep) {
            ep = {
                uid: ev.uid, ip: ev.ip, proto: ev.proto, port: ev.port, domain: ev.domain || null,
                src: ev.src || null, count: 0, open: 0, bytes: 0, firstTs: ts, lastTs: ts, recent: [],
            };
            this.endpoints.set(key, ep);
        }
        ep.count++; ep.open++; ep.lastTs = ts; ep.port = ev.port;
        if (ev.domain) { ep.domain = ev.domain; ep.src = ev.src; }
        ep.recent.unshift({ ts, port: ev.port, proto: ev.proto, bytes: 0, dur: 0, open: true });
        if (ep.recent.length > 12) ep.recent.pop();

        this._minute(ev.uid, Math.floor(ts / MINUTE_MS), cat);
        this.events.push({ ...ev, ts, cat });
    }
    _close(ev, now) {
        const app = this.apps.get(ev.uid);
        if (app) { app.conns = Math.max(0, app.conns - 1); app.bytes += ev.bytes || 0; }
        const ep = this.endpoints.get(`${ev.uid}|${ev.ip}|${ev.proto}`);
        if (ep) {
            ep.open = Math.max(0, ep.open - 1); ep.bytes += ev.bytes || 0; ep.lastTs = now;
            const r = ep.recent.find((x) => x.open);
            if (r) { r.open = false; r.bytes = ev.bytes || 0; r.dur = ev.dur || 0; }
        }
    }
    _minute(uid, idx, cat) {
        let m = this.minutes.get(uid);
        if (!m) { m = new Map(); this.minutes.set(uid, m); }
        let b = m.get(idx);
        if (!b) { b = { tls: 0, quic: 0, clear: 0, iponly: 0, other: 0, total: 0 }; m.set(idx, b); }
        b[cat]++; b.total++;
        while (m.size > MINUTES_KEEP) m.delete(m.keys().next().value);
    }
    _prune(now) {
        const cut = now - RING_MS;
        let i = 0;
        while (i < this.events.length && this.events[i].ts < cut) i++;
        if (i) this.events.splice(0, i);
        while (this.events.length > RING_CAP) this.events.shift();
    }

    getStats() {
        let live = 0;
        this.apps.forEach((a) => { live += a.conns; });
        return {
            status: this.status, error: this.error, startedAt: this.startedAt,
            apps: this.apps.size,
            monitored: this.monitoredAll ? this.apps.size : this.monitored.size,
            live, events: this.events.length,
        };
    }

    listApps({ query = '', sort = 'live', scope = 'monitored' } = {}) {
        const q = query.trim().toLowerCase();
        let domIdx = null;
        if (q) {
            domIdx = new Map();
            this.endpoints.forEach((ep) => {
                if (!ep.domain) return;
                if (!domIdx.has(ep.uid)) domIdx.set(ep.uid, []);
                domIdx.get(ep.uid).push(ep.domain.toLowerCase());
            });
        }
        const out = [];
        this.apps.forEach((a) => {
            const mon = this.monitoredAll || this.monitored.has(a.uid);
            if (scope === 'monitored' && !mon) return;
            if (q) {
                const hit = a.label.toLowerCase().includes(q) || a.pkg.toLowerCase().includes(q) ||
                    (domIdx.get(a.uid) || []).some((d) => d.includes(q));
                if (!hit) return;
            }
            out.push(a);
        });
        if (sort === 'name') out.sort((x, y) => x.label.localeCompare(y.label));
        else out.sort((x, y) => y.conns - x.conns || y.total - x.total);
        return out;
    }

    getApp = (uid) => this.apps.get(uid);

    listEndpoints(uid, { sort = 'activity' } = {}) {
        const out = [];
        this.endpoints.forEach((ep) => { if (ep.uid === uid) out.push(ep); });
        if (sort === 'count') out.sort((a, b) => b.count - a.count);
        else if (sort === 'name') out.sort((a, b) => (a.domain || a.ip).localeCompare(b.domain || b.ip));
        else out.sort((a, b) => b.lastTs - a.lastTs);
        return out;
    }

    spark(uid, n = 30) {
        const m = this.minutes.get(uid);
        const nowIdx = Math.floor(Date.now() / MINUTE_MS);
        const out = new Array(n).fill(0);
        if (!m) return out;
        for (let i = 0; i < n; i++) {
            const b = m.get(nowIdx - (n - 1) + i);
            out[i] = b ? b.total : 0;
        }
        return out;
    }

    hasCleartext(uid, withinMs = RANGES['1H']) {
        const cut = Date.now() - withinMs;
        for (let i = this.events.length - 1; i >= 0 && this.events[i].ts >= cut; i--) {
            if (this.events[i].uid === uid && this.events[i].cat === 'clear') return true;
        }
        return false;
    }

    _rangeTotals(start, now) {
        const a = Math.floor(start / MINUTE_MS), b = Math.floor(now / MINUTE_MS);
        const totals = new Map();
        this.minutes.forEach((m, uid) => {
            let t = 0;
            for (let i = a; i <= b; i++) { const bk = m.get(i); if (bk) t += bk.total; }
            if (t) totals.set(uid, t);
        });
        return totals;
    }

    getTimeline(rk, now = Date.now()) {
        const range = RANGES[rk], cols = RANGE_COLS[rk], colMs = range / cols, start = now - range;
        const totals = this._rangeTotals(start, now);
        const top = [...totals.entries()].sort((x, y) => y[1] - x[1]).slice(0, 8);
        let max = 1;
        const rows = top.map(([uid, tot]) => {
            const m = this.minutes.get(uid) || new Map();
            const cells = [];
            for (let c = 0; c < cols; c++) {
                const cs = start + c * colMs;
                const agg = { tls: 0, quic: 0, clear: 0, iponly: 0, other: 0, total: 0 };
                for (let i = Math.floor(cs / MINUTE_MS); i <= Math.floor((cs + colMs - 1) / MINUTE_MS); i++) {
                    const b = m.get(i);
                    if (b) {
                        CATS.forEach((k) => { agg[k] += b[k]; });
                        agg.total += b.total;
                    }
                }
                let cat = null;
                if (agg.total) {
                    cat = CATS.reduce((best, k) => (agg[k] > agg[best] ? k : best), 'tls');
                    max = Math.max(max, agg.total);
                }
                cells.push({ cat, n: agg.total });
            }
            const app = this.apps.get(uid);
            return { uid, label: app?.label || `UID ${uid}`, icon: app?.icon || null, cells, total: tot };
        });
        const tickMs = rk === '1H' ? 10 * MINUTE_MS : rk === '24H' ? 4 * 3600000 : 86400000;
        const ticks = [];
        for (let c = 0; c < cols; c++) { const ts = start + c * colMs; if (ts % tickMs < colMs) ticks.push({ c, label: fmtTick(ts, rk) }); }
        return { cols, colMs, start, rows, ticks, max };
    }

    getSeries(uid, rk, now = Date.now()) {
        const range = RANGES[rk], cols = RANGE_COLS[rk], colMs = range / cols, start = now - range;
        const m = this.minutes.get(uid) || new Map();
        let max = 1, total = 0, clear = 0;
        const cells = [];
        for (let c = 0; c < cols; c++) {
            const cs = start + c * colMs;
            const agg = { tls: 0, quic: 0, clear: 0, iponly: 0, other: 0, total: 0 };
            for (let i = Math.floor(cs / MINUTE_MS); i <= Math.floor((cs + colMs - 1) / MINUTE_MS); i++) {
                const b = m.get(i);
                if (b) {
                    CATS.forEach((k) => { agg[k] += b[k]; });
                    agg.total += b.total;
                }
            }
            max = Math.max(max, agg.total); total += agg.total; clear += agg.clear;
            cells.push(agg);
        }
        const tickMs = rk === '1H' ? 10 * MINUTE_MS : rk === '24H' ? 4 * 3600000 : 86400000;
        const ticks = [];
        for (let c = 0; c < cols; c++) { const ts = start + c * colMs; if (ts % tickMs < colMs) ticks.push({ c, label: fmtTick(ts, rk) }); }
        return { cols, colMs, start, cells, ticks, max, total, clear };
    }

    getRecent(limit = 30, uid = null) {
        const out = [];
        for (let i = this.events.length - 1; i >= 0 && out.length < limit; i--) {
            const e = this.events[i];
            if (!uid || e.uid === uid) out.push(e);
        }
        return out;
    }
}

export const store = new NetworkStore();
export const startTap = () => store.startTap();
export const stopTap = () => store.stopTap();