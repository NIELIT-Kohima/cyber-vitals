import { Linking, NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNListener, {
    RNAndroidNotificationListenerHeadlessJsName,
} from 'react-native-android-notification-listener';
import IdentifyLanguages from '@react-native-ml-kit/identify-languages';
import TranslateText from '@react-native-ml-kit/translate-text';

export const HEADLESS_TASK_NAME = RNAndroidNotificationListenerHeadlessJsName;
export const MAX_BATCH = 10;
export const PAGE_SIZE = 12;
const STORE_CAP = 400;

const K_STORE = 'ns_store_v2';
const K_VER = 'ns_store_ver_v2';
const K_MODELS = 'ns_model_pairs_v2';

export const TIME_WINDOWS = [
    { key: 'all', label: 'All' },
    { key: 'h1', label: 'Last hour' },
    { key: 'h12', label: '12 hrs' },
    { key: 'h24', label: '24 hrs' },
];
const WINDOW_MS = { all: null, h1: 3.6e6, h12: 4.32e7, h24: 8.64e7 };

const TRUSTED_SLD = ['.bank.in', '.gov.in', '.nic.in', '.mil.in', '.fin.in'];

const STAGES = [
    { key: 'prepare', label: 'Preparing selection', weight: 0.05 },
    { key: 'lang', label: 'Language identification', weight: 0.45 },
    { key: 'upload', label: 'Server analysis', weight: 0.35 },
    { key: 'finalize', label: 'Saving & labeling', weight: 0.15 },
];
const stageBase = (key) =>
    STAGES.slice(0, STAGES.findIndex((s) => s.key === key)).reduce((a, s) => a + s.weight, 0);
const progress = (stage, frac, message, itemIndex, itemCount) => ({
    stage,
    stageLabel: (STAGES.find((s) => s.key === stage) || {}).label || stage,
    stageIndex: Math.max(0, STAGES.findIndex((s) => s.key === stage)),
    stageCount: STAGES.length,
    percent: Math.min(100, Math.round(100 * (stageBase(stage) + STAGES.find((s) => s.key === stage).weight * clamp01(frac)))),
    message: message || '',
    itemIndex: itemIndex == null ? null : itemIndex,
    itemCount: itemCount == null ? null : itemCount,
});

const now = () => Date.now();
const clamp01 = (n) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);
const str = (v) => (typeof v === 'string' ? v.trim() : '');
const strOrNull = (v) => (str(v) ? str(v) : null);

export function toScore(v) {
    if (v == null || v === '') return null;
    const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
    if (!Number.isFinite(n)) return null;
    return Math.round(clamp01(n > 1 ? n / 100 : n) * 100) / 100;
}

function hashId(input) {
    let h = 5381;
    for (let i = 0; i < input.length; i++) h = ((h << 5) + h + input.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
}

export function timeAgo(ts) {
    const d = now() - (ts || 0);
    if (d < 45e3) return 'just now';
    if (d < 3.6e6) return `${Math.max(1, Math.round(d / 6e4))} min ago`;
    if (d < 8.64e7) return `${Math.round(d / 3.6e6)} hr ago`;
    return `${Math.round(d / 8.64e7)} d ago`;
}

const prettify = (s) =>
    str(s)
        .replace(/[_-]+/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .trim();

export function severityOf(scores) {
    const vals = [scores?.susp, scores?.spam].filter((v) => v != null);
    if (!vals.length) return 'unknown';
    const m = Math.max(...vals);
    if (m >= 0.75) return 'critical';
    if (m >= 0.45) return 'suspicious';
    if (m >= 0.2) return 'caution';
    return 'safe';
}

export const SEVERITY_CHIP = {
    critical: { label: 'Suspicious', tone: 'danger' },
    suspicious: { label: 'Suspicious', tone: 'danger' },
    caution: { label: 'Potential Risk', tone: 'warn' },
    safe: { label: 'Looks Safe', tone: 'accent' },
    unknown: { label: 'No Verdict', tone: 'dim' },
};


const URL_RE = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;

export function extractLinks(...texts) {
    const found = [];
    texts.forEach((t) => {
        if (!t) return;
        (String(t).match(URL_RE) || []).forEach((u) => {
            const clean = u.replace(/[)\],.;:!?'"»]+$/g, '');
            if (clean && !found.includes(clean)) found.push(clean);
        });
    });
    return found;
}

export function parseRegistrableDomain(url) {
    let host = null;
    try {
        const u = new URL(/^https?:/i.test(url) ? url : `http://${url}`);
        host = (u.hostname || '').toLowerCase().replace(/\.$/, '');
    } catch {
        const m = str(url).replace(/^https?:\/\//i, '').match(/^[^/?#:]+/i);
        host = m ? m[0].toLowerCase().split('@').pop().split(':')[0] : '';
    }
    if (!host || !host.includes('.')) return { host, registrable: null, verified: false, sld: null };
    for (const sld of TRUSTED_SLD) {
        const i = host.length - sld.length;
        if (i > 0 && host.endsWith(sld) && host[i - 1] === '.') {
            const labels = host.split('.');
            const reg = labels.length >= 3 ? `${labels[labels.length - 3]}${sld}` : host;
            return { host, registrable: reg, verified: true, sld };
        }
    }
    const labels = host.split('.');
    return { host, registrable: labels.slice(-2).join('.'), verified: false, sld: null };
}

export function classifyLinks(links) {
    const per = (links || []).map((url) => ({ url, ...parseRegistrableDomain(url) }));
    const verified = per.filter((l) => l.verified);
    const unverified = per.filter((l) => !l.verified);
    let verdict = 'none';
    if (per.length && unverified.length === 0) verdict = 'verified';
    else if (verified.length && unverified.length) verdict = 'mixed';
    else if (unverified.length) verdict = 'unverified';
    return { per, verdict, verifiedCount: verified.length, unverifiedCount: unverified.length };
}


export function normalizeRawNotification(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const pkg = str(raw.app || raw.packageName || raw.pkg || raw.package) || 'unknown';
    const title = str(raw.title) || str(raw.titleBig) || str(raw.subText) || prettify(pkg.split('.').pop());
    const parts = [
        raw.text,
        raw.bigText,
        raw.summaryText,
        raw.extraInfoText,
        ...(Array.isArray(raw.groupedMessages)
            ? raw.groupedMessages.map((g) => [g?.title, g?.text].filter(Boolean).join(': '))
            : []),
    ]
        .map(str)
        .filter(Boolean);
    const body = Array.from(new Set(parts)).join(' · ');
    const tsRaw = raw.time != null ? parseInt(raw.time, 10) : NaN;
    const postedAt = Number.isFinite(tsRaw) && tsRaw > 0 ? (tsRaw > 1e12 ? tsRaw : tsRaw * 1000) : now();
    const links = extractLinks(title, body);
    const id = str(raw.key) || hashId(`${pkg}|${title}|${body}|${Math.floor(postedAt / 6e4)}`);
    return {
        id,
        pkg,
        appLabel: prettify(str(raw.appLabel) || pkg.split('.').pop()),
        title,
        body,
        links,
        postedAt,
        style: strOrNull(raw.style),
        category: strOrNull(raw.category),
        groupKey: strOrNull(raw.groupKey),
        lang: null,
        langStatus: 'pending',
        translatedText: null,
        translationStatus: 'none',
        analysis: null,
        sentAt: null,
        capturedAt: now(),
        source: 'listener',
    };
}

const searchTextOf = (it) => str(it.body) || str(it.title);


let storeCache = null;
let writeQueue = Promise.resolve();
let storeWarning = null;
const modelPairCache = new Map();

const freshStore = () => ({ version: 2, items: {}, meta: { hasScanned: false, totalCaptured: 0, lastCaptureAt: null } });

export function getStoreWarning() {
    return storeWarning;
}

export async function getStore() {
    if (storeCache) return storeCache;
    try {
        const rawJson = await AsyncStorage.getItem(K_STORE);
        const parsed = rawJson ? JSON.parse(rawJson) : null;
        storeCache =
            parsed && parsed.version === 2 && parsed.items && parsed.meta
                ? parsed
                : freshStore();
    } catch (e) {
        storeWarning = 'Local store unreadable – running in memory only.';
        storeCache = freshStore();
    }
    return storeCache;
}

function mutateStore(fn) {
    writeQueue = writeQueue
        .then(async () => {
            const store = await getStore();
            fn(store);
            const ids = Object.keys(store.items);
            if (ids.length > STORE_CAP) {
                ids
                    .sort((a, b) => store.items[b].postedAt - store.items[a].postedAt)
                    .slice(STORE_CAP)
                    .forEach((id) => delete store.items[id]);
            }
            storeCache = store;
            try {
                await AsyncStorage.setItem(K_STORE, JSON.stringify(store));
                await AsyncStorage.setItem(K_VER, String(now()));
            } catch (e) {
                storeWarning = 'Could not persist locally – storage full or unavailable.';
            }
        })
        .catch((e) => {
            storeWarning = `Store write failed: ${e?.message || e}`;
        });
    return writeQueue;
}

export const listItems = (store) =>
    Object.values(store.items).sort((a, b) => b.postedAt - a.postedAt);

export async function upsertItems(normalized, { bumpCapture = true } = {}) {
    const valid = (normalized || []).filter(Boolean);
    if (!valid.length) return 0;
    await mutateStore((store) => {
        valid.forEach((item) => {
            const prev = store.items[item.id];
            store.items[item.id] = prev
                ? { ...item, ...prev, links: item.links?.length ? item.links : prev.links }
                : item;
        });
        if (bumpCapture) {
            store.meta.totalCaptured += valid.length;
            store.meta.lastCaptureAt = now();
        }
    });
    return valid.length;
}

const patchItem = (id, patch) =>
    mutateStore((store) => {
        if (store.items[id]) store.items[id] = { ...store.items[id], ...patch };
    });


export const listenerSupported = () => Platform.OS === 'android' && !!RNListener;

export async function getListenerStatus() {
    if (!listenerSupported()) return { supported: false, granted: false, status: 'unsupported' };
    try {
        const status = await RNListener.getPermissionStatus();
        return { supported: true, granted: status === 'authorized', status };
    } catch (e) {
        return { supported: true, granted: false, status: 'error', error: e?.message };
    }
}

export async function openListenerSettings() {
    if (!listenerSupported()) return false;
    try {
        await RNListener.requestPermission();
        return true;
    } catch {
        try {
            await Linking.openSettings();
            return true;
        } catch {
            return false;
        }
    }
}

export function createNotificationHeadlessHandler() {
    return async ({ notification } = {}) => {
        try {
            const raw = typeof notification === 'string' ? JSON.parse(notification) : notification;
            const item = normalizeRawNotification(raw);
            if (!item) return;
            const lang = await detectLanguage(searchTextOf(item));
            if (lang) {
                item.lang = lang;
                item.langStatus = lang === 'und' ? 'und' : 'ok';
                item.translationStatus = needsTranslation(lang) ? 'pending' : 'none';
            }
            await upsertItems([item]);
        } catch (e) {
            console.warn('[ns] headless capture failed', e?.message);
        }
    };
}

export function subscribeLiveUpdates(onChange) {
    let lastVer = null;
    let alive = true;
    const readVer = async () => {
        try {
            return await AsyncStorage.getItem(K_VER);
        } catch {
            return null;
        }
    };
    readVer().then((v) => {
        lastVer = v;
    });
    const timer = setInterval(async () => {
        if (!alive) return;
        const v = await readVer();
        if (v !== lastVer) {
            lastVer = v;
            onChange?.();
        }
    }, 5000);
    const sub = AppStateSafe((state) => {
        if (state === 'active') onChange?.();
    });
    return () => {
        alive = false;
        clearInterval(timer);
        sub?.();
    };
}

function AppStateSafe(cb) {
    try {
        const { AppState } = require('react-native');
        const h = AppState.addEventListener('change', cb);
        return () => h?.remove?.();
    } catch {
        return null;
    }
}


let userLangCache = null;

export async function getUserLanguage() {
    if (userLangCache) return userLangCache;
    let code = null;
    try {
        code =
            NativeModules?.I18nManager?.localeIdentifier ||
            NativeModules?.PlatformConstants?.Locale ||
            NativeModules?.SettingsManager?.SettingsManager?.localeAndroid ||
            null;
    } catch {
        code = null;
    }
    userLangCache = (str(code).split(/[-_]/)[0].toLowerCase() || 'en').slice(0, 8) || 'en';
    return userLangCache;
}

export async function checkLanguageIdModel() {
    try {
        await IdentifyLanguages.identify('The quick brown fox jumps.');
        return { ready: true };
    } catch (e) {
        return { ready: false, message: e?.message || 'Language model unavailable' };
    }
}

export async function openLanguageIdSource() {
    const url = 'market://details?id=com.google.android.gms';
    try {
        await Linking.openURL(url);
        return true;
    } catch {
        try {
            await Linking.openURL('https://play.google.com/store/apps/details?id=com.google.android.gms');
            return true;
        } catch {
            return false;
        }
    }
}

export async function detectLanguage(text) {
    const t = str(text);
    if (t.length < 3) return null;
    try {
        const code = await IdentifyLanguages.identify(t);
        return str(code) || null;
    } catch {
        return null;
    }
}

const needsTranslation = (lang) => !!lang && lang !== 'und';

const pairKey = (src, tgt) => `${src}>${tgt}`;

async function loadPositivePairs() {
    try {
        const rawJson = await AsyncStorage.getItem(K_MODELS);
        return rawJson ? JSON.parse(rawJson) : {};
    } catch {
        return {};
    }
}

export async function isPairReady(src, tgt) {
    if (!src || src === 'und' || src === tgt) return true;
    const key = pairKey(src, tgt);
    if (modelPairCache.has(key)) return modelPairCache.get(key);
    try {
        const positives = await loadPositivePairs();
        if (positives[key]) {
            modelPairCache.set(key, true);
            return true;
        }
    } catch {
    }
    try {
        await TranslateText.translate({
            text: '.',
            sourceLanguage: src,
            targetLanguage: tgt,
            downloadModelIfNeeded: false,
        });
        modelPairCache.set(key, true);
        return true;
    } catch {
        modelPairCache.set(key, false);
        return false;
    }
}

async function markPairReady(src, tgt) {
    const key = pairKey(src, tgt);
    modelPairCache.set(key, true);
    try {
        const positives = await loadPositivePairs();
        positives[key] = true;
        await AsyncStorage.setItem(K_MODELS, JSON.stringify(positives));
    } catch {
    }
}

const unwrapTranslation = (res) =>
    typeof res === 'string' ? res : str(res?.translatedText) || str(res?.text) || (res ? String(res) : '');

export async function downloadModelsFor(langs, targetLang, onProgress) {
    const unique = Array.from(new Set((langs || []).filter((l) => l && l !== 'und')));
    const failed = [];
    for (let i = 0; i < unique.length; i++) {
        onProgress?.(progress('lang', i / unique.length, `Downloading model · ${unique[i]}`, i, unique.length));
        try {
            await TranslateText.translate({
                text: 'warmup',
                sourceLanguage: unique[i],
                targetLanguage: unique[i] === targetLang ? 'en' : targetLang,
                downloadModelIfNeeded: true,
            });
            await markPairReady(unique[i], targetLang);
        } catch (e) {
            failed.push({ lang: unique[i], error: e?.message });
        }
    }
    onProgress?.(progress('lang', 1, 'Model download finished', unique.length, unique.length));
    return { ok: failed.length === 0, failed };
}

const translationPopupShown = new Set();

export async function processPendingTranslations(onPopup) {
    const store = await getStore();
    const userLang = await getUserLanguage();
    const queued = listItems(store).filter((it) => it.translationStatus === 'pending' && searchTextOf(it));
    for (const it of queued) {
        let lang = it.lang;
        if (!lang) {
            lang = await detectLanguage(searchTextOf(it));
            await patchItem(it.id, { lang, langStatus: lang ? (lang === 'und' ? 'und' : 'ok') : 'error' });
        }
        if (!lang || lang === 'und' || lang === userLang) {
            await patchItem(it.id, { translationStatus: 'none' });
            continue;
        }
        const ready = await isPairReady(lang, userLang);
        if (ready) {
            try {
                const out = unwrapTranslation(
                    await TranslateText.translate({
                        text: searchTextOf(it),
                        sourceLanguage: lang,
                        targetLanguage: userLang,
                        downloadModelIfNeeded: false,
                    }),
                );
                await patchItem(it.id, { translatedText: out || null, translationStatus: out ? 'translated' : 'error' });
            } catch {
                await patchItem(it.id, { translationStatus: 'model_missing' });
            }
        } else {
            await patchItem(it.id, { translationStatus: 'model_missing' });
            if (onPopup && !translationPopupShown.has(it.id)) {
                translationPopupShown.add(it.id);
                onPopup({ ...it, lang });
            }
        }
    }
}

export async function resolveTranslation(id, action) {
    const store = await getStore();
    const it = store.items[id];
    if (!it) return { ok: false };
    const userLang = await getUserLanguage();
    if (action === 'stall') {
        await patchItem(id, { translationStatus: 'stalled' });
        return { ok: true, stalled: true };
    }
    try {
        const out = unwrapTranslation(
            await TranslateText.translate({
                text: searchTextOf(it),
                sourceLanguage: it.lang,
                targetLanguage: userLang,
                downloadModelIfNeeded: true,
            }),
        );
        await markPairReady(it.lang, userLang);
        await patchItem(id, { translatedText: out || null, translationStatus: out ? 'translated' : 'error' });
        return { ok: !!out };
    } catch (e) {
        await patchItem(id, { translationStatus: 'model_missing' });
        return { ok: false, error: e?.message };
    }
}


const buildRequestBody = (items) =>
    items.map((it) => ({
        item_id: it.id,
        app_id: it.pkg,
        posted_at: new Date(it.postedAt).toISOString(),
        title: it.title || '',
        body: it.body || '',
        links: it.links || [],
        language: it.lang || null,
    }));

function dummyClassifyResponse(body) {
    const URGENT = ['verify', 'blocked', 'locked', 'suspended', 'urgent', 'immediately', 'expir', 'last chance', 'act now', 'click here', 'tap here', 'within 24'];
    const LURE = ['reward', 'claim', 'prize', 'lottery', 'winner', 'won', 'free', 'cashback', 'offer', 'gift'];
    const CRED = ['otp', 'one time password', 'password', 'pin', 'cvv', 'aadhaar', 'kyc', 'login', 'credential', 'account'];
    return body.map((b) => {
        const t = `${b.title} ${b.body}`.toLowerCase();
        const hit = (kws) => kws.filter((k) => t.includes(k)).length;
        const u = hit(URGENT);
        const l = hit(LURE);
        const c = hit(CRED);
        const hasLink = (b.links || []).length > 0;
        const untrusted = (b.links || []).some((x) => !parseRegistrableDomain(x).verified);
        let susp = 0.05 + 0.12 * u + 0.16 * c + (hasLink ? (untrusted ? 0.25 : 0.05) : 0);
        let spam = 0.03 + 0.2 * l + 0.1 * (hasLink ? 1 : 0) + 0.08 * u;
        const suspMatch =
            l > 0 && hasLink ? 'financial_scam_lottery'
                : c > 0 && u > 0 ? 'bank_impersonation_otp'
                    : u > 0 && hasLink ? 'phishing_link_urgency'
                        : null;
        const spamMatch = l > 0 ? 'financial_scam_lottery' : spam >= 0.4 ? 'bulk_promo_spam' : null;
        return {
            item_id: b.item_id,
            app_id: b.app_id,
            suspicious_semantic_score: Math.round(clamp01(susp) * 100) / 100,
            spam_adv_semantic_score: Math.round(clamp01(spam) * 100) / 100,
            suspicious_matching_text: suspMatch,
            spam_adv_matching_text: spamMatch,
        };
    });
}
const AppLabelNative = NativeModules.AppLabel || null;
const labelCache = new Map();
const iconCache = new Map();

export async function withAppLabels(items) {
    const list = Array.isArray(items) ? items : [];
    if (!AppLabelNative || typeof AppLabelNative.getLabels !== 'function') return list;
    const missing = Array.from(new Set(list.map((it) => it.pkg).filter((p) => p && !labelCache.has(p))));
    if (missing.length) {
        try {
            const res = (await AppLabelNative.getLabels(missing)) || {};
            Object.entries(res).forEach(([pkg, label]) => label && labelCache.set(pkg, label));
        } catch { }
    }
    if (!labelCache.size) return list;
    return list.map((it) => (labelCache.has(it.pkg) ? { ...it, appLabel: labelCache.get(it.pkg) } : it));
}

export async function withAppIcons(items) {
    const list = Array.isArray(items) ? items : [];
    if (!AppLabelNative || typeof AppLabelNative.getIcons !== 'function') return list;
    const missing = Array.from(new Set(list.map((it) => it.pkg).filter((p) => p && p !== 'unknown' && !iconCache.has(p))));
    if (missing.length) {
        try {
            const res = (await AppLabelNative.getIcons(missing)) || {};
            Object.entries(res).forEach(([pkg, uri]) => uri && iconCache.set(pkg, uri));
        } catch { }
    }
    if (!iconCache.size) return list;
    return list.map((it) => (iconCache.has(it.pkg) ? { ...it, icon: iconCache.get(it.pkg) } : it));
}
export const withAppMeta = async (items) => {
    const list = Array.isArray(items) ? items : [];
    const labeled = await withAppLabels(list);
    const withIcons = await withAppIcons(labeled);
    return withIcons;
};

export async function classifyOnServer(body) {
    if (!Array.isArray(body) || !body.length) throw new Error('Empty batch');
    /*  BACKEND NOT BUILT: single stubbed transport line 
     *   const res = await fetch(`${API_BASE}/v1/notifications/classify`, {
     *     method: 'POST',
     *     headers: { 'Content-Type': 'application/json' },
     *     body: JSON.stringify(body),
     *   });
     *   if (!res.ok) throw new Error(`Server ${res.status}`);
     *   return await res.json(); */
    return dummyClassifyResponse(body); // stub
}

function normalizeServerResponse(raw, body) {
    const arr = Array.isArray(raw) ? raw : Array.isArray(raw?.results) ? raw.results : null;
    if (!arr) throw new Error('Malformed server response');
    const byId = {};
    arr.forEach((r) => {
        if (r && r.item_id) byId[r.item_id] = r;
    });
    return body.map((b, i) => {
        const r = byId[b.item_id] || arr[i];
        if (!r || typeof r !== 'object') return { itemId: b.item_id, ok: false };
        return {
            itemId: b.item_id,
            ok: true,
            appId: strOrNull(r.app_id) || b.app_id,
            susp: toScore(r.suspicious_semantic_score),
            spam: toScore(r.spam_adv_semantic_score),
            suspMatch: strOrNull(r.suspicious_matching_text),
            spamMatch: strOrNull(r.spam_adv_matching_text),
        };
    });
}


export async function prepareBatchForAnalysis(ids, { onProgress } = {}) {
    const store = await getStore();
    const userLang = await getUserLanguage();
    const picked = (ids || []).filter((id) => store.items[id]).slice(0, MAX_BATCH);
    if (!picked.length) throw new Error('Nothing selected');
    onProgress?.(progress('prepare', 1, `Validating ${picked.length} item(s)`));
    const sendable = [];
    const blocked = [];
    for (let i = 0; i < picked.length; i++) {
        const it = store.items[picked[i]];
        onProgress?.(progress('lang', i / picked.length, `Language check · ${it.appLabel}`, i, picked.length));
        let lang = it.lang;
        if (!lang && searchTextOf(it)) {
            lang = await detectLanguage(searchTextOf(it));
            await patchItem(it.id, { lang, langStatus: lang ? (lang === 'und' ? 'und' : 'ok') : 'error' });
        }
        if (lang && lang !== 'und' && lang !== userLang) {
            const ready = await isPairReady(lang, userLang);
            if (!ready) {
                blocked.push({ id: it.id, appLabel: it.appLabel, lang, preview: it.title || it.body });
                continue;
            }
        }
        sendable.push(it.id);
    }
    onProgress?.(progress('lang', 1, 'Language checks complete', picked.length, picked.length));
    return { sendable, blocked, userLang, total: picked.length };
}

export async function submitBatchForAnalysis(ids, { onProgress } = {}) {
    const store = await getStore();
    const items = (ids || []).map((id) => store.items[id]).filter(Boolean).slice(0, MAX_BATCH);
    if (!items.length) throw new Error('Nothing to send');
    const body = buildRequestBody(items);
    onProgress?.(progress('upload', 0.15, `Uploading ${items.length} item(s)`));
    const raw = await classifyOnServer(body); // ← only stubbed piece
    onProgress?.(progress('upload', 1, 'Server responded'));
    const results = normalizeServerResponse(raw, body);
    onProgress?.(progress('finalize', 0.3, 'Applying results & link checks'));
    const batchId = hashId(`${now()}`);
    let analyzed = 0;
    await mutateStore((s) => {
        results.forEach((r) => {
            const it = s.items[r.itemId];
            if (!it || !r.ok) return;
            const linkCheck = classifyLinks(it.links);
            const severity = severityOf(r);
            const labels = [];
            if (r.suspMatch) labels.push({ key: 'semantic', text: prettify(r.suspMatch), tone: severity === 'safe' ? 'warn' : 'danger' });
            if (r.spamMatch) labels.push({ key: 'spam', text: prettify(r.spamMatch), tone: 'warn' });
            if (linkCheck.verdict === 'verified') labels.push({ key: 'domain', text: 'Verified Official Domain', tone: 'accent' });
            else if (linkCheck.verdict !== 'none') labels.push({ key: 'domain', text: 'Unverified link · proceed with caution', tone: 'warn' });
            it.analysis = {
                batchId,
                susp: r.susp,
                spam: r.spam,
                severity,
                labels,
                linkCheck,
                analyzedAt: now(),
            };
            it.sentAt = now();
            analyzed += 1;
        });
        s.meta.hasScanned = true;
    });
    onProgress?.(progress('finalize', 1, 'Saved'));
    return { analyzed, failed: results.length - analyzed, batchId };
}


export function filterItems(items, windowKey, pkg) {
    const ms = WINDOW_MS[windowKey] ?? null;
    const cutoff = ms ? now() - ms : null;
    return (items || [])
        .filter((it) => (cutoff ? it.postedAt >= cutoff : true))
        .filter((it) => {
            if (!pkg) return true;
            if (Array.isArray(pkg)) return pkg.length === 0 || pkg.includes(it.pkg);
            return it.pkg === pkg;
        })
        .sort((a, b) => b.postedAt - a.postedAt);
}

export const autoPickIds = (items, n = MAX_BATCH) => (items || []).slice(0, n).map((it) => it.id);

export function appOptions(items) {
    const map = new Map();
    (items || []).forEach((it) => {
        const e = map.get(it.pkg) || { pkg: it.pkg, label: it.appLabel, icon: it.icon, count: 0 };
        e.count += 1;
        if (!e.icon && it.icon) e.icon = it.icon;
        map.set(it.pkg, e);
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

export function computeStats(items) {
    const all = items || [];
    return {
        scanned: all.length,
        analyzed: all.filter((it) => it.analysis).length,
        flagged: all.filter((it) => ['critical', 'suspicious'].includes(it.analysis?.severity)).length,
        lastCaptureAt: all.reduce((m, it) => Math.max(m, it.postedAt), 0) || null,
    };
}


export async function seedDemoData() {
    if (!__DEV__) return 0;
    const t = now();
    const samples = [
        { app: 'com.whatsapp', title: '+91 98765 43210', text: 'Hi, check this link to claim your reward http://bit.ly/3xRewards', time: t - 2 * 6e4 },
        { app: 'com.google.android.gm', title: 'Account Security', text: 'New login detected from an unrecognized device. Verify now.', time: t - 18 * 6e4 },
        { app: 'com.android.mms', title: 'AX-PAYTMB', text: 'Your A/C will be blocked. Verify now: http://paytmb-verify.tk/kyc', time: t - 3.6e6 },
        { app: 'com.android.mms', title: 'SBI-BANK', text: 'Visit https://www.sbi.bank.in for details. Your account will be blocked otherwise.', time: t - 5 * 3.6e6 },
        { app: 'com.instagram.android', title: '[2] New messages', text: 'sent you a message.', time: t - 2 * 3.6e6 },
        { app: 'in.zomato', title: 'Your order is out for delivery', text: 'Arriving in 8 mins.', time: t - 3 * 3.6e6 },
        { app: 'com.whatsapp', title: 'Rahul', text: 'कल मिलते हैं, टाइम पक्का रखना!', time: t - 4 * 3.6e6 },
    ];
    const items = samples.map(normalizeRawNotification).filter(Boolean);
    return upsertItems(items.map((it) => ({ ...it, source: 'seed' })));
}