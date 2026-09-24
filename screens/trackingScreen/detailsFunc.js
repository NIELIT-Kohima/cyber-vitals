
import { useEffect, useState, useCallback } from 'react';
import {
    Native, rangeBounds, axisBounds, binsFor, pairSessions, buildTimeline,
    bucketLabel, deriveFlags, simMeta, simSessions, fmtDate,
} from './listFunc';

export const loadDetail = async (pkg, rangeKey = 'today') => {
    const bounds = rangeBounds(rangeKey);
    const axis = axisBounds(rangeKey);
    let meta, sessions, simulated = false;

    if (Native) {
        const [m, events] = await Promise.all([
            Native.getAppInfo(pkg, bounds.start, bounds.end),
            Native.getEvents(pkg, bounds.start, bounds.end),
        ]);
        meta = m;
        sessions = pairSessions(events);
    } else {
        meta = simMeta(pkg);
        sessions = simSessions(pkg, bounds);
        simulated = true;
    }

    const sessionsMs = sessions.reduce((s, x) => s + x.ms, 0);
    const totalMs = meta.totalMs || sessionsMs;
    return {
        meta,
        sessions,
        totalMs,
        drift: Math.max(0, totalMs - sessionsMs),
        silent: totalMs > 0 && sessions.length === 0,
        bucket: bucketLabel(meta.bucket),
        lastUsed: meta.lastUsed,
        timeline: buildTimeline(sessions, axis, binsFor(rangeKey)),
        flags: deriveFlags(meta),
        simulated,
    };
};

export const fmtAxis = (ms) => `${Math.round(ms / 60000)}m`;
const hourLabel = (ts) => new Date(ts).toLocaleTimeString([], { hour: 'numeric' });
export const fmtBinRange = (bin, rangeKey) =>
    rangeKey === 'today' ? `${hourLabel(bin.start)} – ${hourLabel(bin.start + 3600e3)}` : fmtDate(bin.start);
export const axisLabels = (timeline, rangeKey) => {
    if (rangeKey === 'today') return ['12 AM', '6 AM', '12 PM', '6 PM', '12 AM'];
    const idx = [0, Math.floor(timeline.length / 3), Math.floor((timeline.length * 2) / 3), timeline.length - 1];
    return idx.map((i) => new Date(timeline[i].start).toLocaleDateString([], { month: 'short', day: 'numeric' }));
};

export const TrackingDetailsFunc = (pkg, range = 'today') => {
    const [state, set] = useState({ status: 'loading', refreshing: false, data: null, error: null });

    const load = useCallback(async () => {
        set((s) => ({ ...s, error: null, refreshing: s.status === 'ready', status: s.status === 'ready' ? s.status : 'loading' }));
        try {
            const data = await loadDetail(pkg, range);
            set({ status: 'ready', refreshing: false, data, error: null });
        } catch (e) {
            set((s) => ({ ...s, status: 'error', refreshing: false, error: e?.message || 'Unable to load app details.' }));
        }
    }, [pkg, range]);

    useEffect(() => { load(); }, [load]);
    return { ...state, reload: load };
};