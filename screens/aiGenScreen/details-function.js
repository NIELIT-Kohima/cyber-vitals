import { Image } from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';

export const SUPPORT = Object.freeze({
    formats: ['JPG', 'JPEG', 'PNG', 'WEBP'],
    maxBytes: 10 * 1024 * 1024, // 10 MB
});

export const API_CONFIG = Object.freeze({
    url: 'https://api.example.dev/v1/detect',
    timeoutMs: 1400,
    fixedRequest: Object.freeze({
        image_ref: 'fixed-placeholder-uri',
        detectors: ['ai-generated', 'deepfake'],
        profile_pic_mode: true,
    }),
    fixedResponse: Object.freeze({
        result: 'likely ai generated',
        confidence: 0.92,
        model_version: 'detector-v3.2',
    }),
});

const MIME_LABELS = {
    'image/jpeg': 'JPEG',
    'image/jpg': 'JPEG',
    'image/png': 'PNG',
    'image/webp': 'WEBP',
};
const EXT_LABELS = { jpg: 'JPEG', jpeg: 'JPEG', png: 'PNG', webp: 'WEBP' };

export const ERR = Object.freeze({
    CANCELLED: 'CANCELLED',
    PICKER: 'PICKER',
    VALIDATION: 'VALIDATION',
    META: 'META',
    NETWORK: 'NETWORK',
    SHAPE: 'SHAPE',
});

export class AiGenError extends Error {
    constructor(code, message, { retryable = false } = {}) {
        super(message);
        this.name = 'AiGenError';
        this.code = code;
        this.retryable = retryable;
    }
}


const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const clamp01 = (n) => Math.min(1, Math.max(0, n));

export function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes < 0) return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    const units = ['KB', 'MB', 'GB'];
    let value = bytes / 1024;
    let u = 0;
    while (value >= 1024 && u < units.length - 1) {
        value /= 1024;
        u += 1;
    }
    const rounded = value >= 100 ? Math.round(value) : Math.round(value * 10) / 10;
    return `${rounded} ${units[u]}`;
}

export function fileNameFromUri(uri) {
    const clean = String(uri || '').split('?')[0];
    const last = clean.split('/').pop() || '';
    try {
        return decodeURIComponent(last);
    } catch {
        return last;
    }
}

export function imageTypeLabel(mime, uri) {
    const fromMime = MIME_LABELS[String(mime || '').toLowerCase()];
    if (fromMime) return fromMime;
    const ext = (fileNameFromUri(uri).split('.').pop() || '').toLowerCase();
    return EXT_LABELS[ext] || (ext ? ext.toUpperCase() : 'Unknown');
}

export function supportNote() {
    return `Supported formats: ${SUPPORT.formats.join(', ')}\nMax file size: ${formatBytes(SUPPORT.maxBytes)}`;
}

export function readDimensions(uri, fallback) {
    return new Promise((resolve) => {
        let settled = false;
        const done = (width, height) => {
            if (!settled) {
                settled = true;
                resolve({ width, height });
            }
        };
        const timer = setTimeout(() => done(fallback?.width || 0, fallback?.height || 0), 4000);
        Image.getSize(
            uri,
            (w, h) => {
                clearTimeout(timer);
                done(w, h);
            },
            () => {
                clearTimeout(timer);
                done(fallback?.width || 0, fallback?.height || 0);
            },
        );
    });
}

async function probeFileSize(uri) {
    try {
        const res = await fetch(uri);
        const blob = await res.blob();
        return blob && Number.isFinite(blob.size) && blob.size > 0 ? blob.size : null;
    } catch {
        return null;
    }
}
export async function pickImage(source) {
    const launch = source === 'camera' ? launchCamera : launchImageLibrary;
    const options =
        source === 'camera'
            ? { mediaType: 'photo', saveToPhotos: false }
            : { mediaType: 'photo', selectionLimit: 1 };

    let response;
    try {
        response = await launch(options);
    } catch {
        throw new AiGenError(ERR.PICKER, 'The image picker is unavailable on this device.');
    }
    if (response?.didCancel) throw new AiGenError(ERR.CANCELLED, 'Selection cancelled.');
    if (response?.errorCode) {
        throw new AiGenError(ERR.PICKER, response.errorMessage || `Picker error: ${response.errorCode}`);
    }
    const asset = response?.assets?.[0];
    if (!asset?.uri) throw new AiGenError(ERR.PICKER, 'No image was returned by the picker.');
    return collectMeta(asset);
}

async function collectMeta(asset) {
    const uri = asset.uri;
    const mime = String(asset.type || '').toLowerCase();
    const typeLabel = imageTypeLabel(mime, uri);

    if (!SUPPORT.formats.includes(typeLabel)) {
        throw new AiGenError(
            ERR.VALIDATION,
            `Unsupported format “${typeLabel}”. Use ${SUPPORT.formats.join(', ')}.`,
        );
    }

    let size = Number.isFinite(asset.fileSize) && asset.fileSize > 0 ? asset.fileSize : null;
    if (size == null) size = await probeFileSize(uri);
    if (size != null && size > SUPPORT.maxBytes) {
        throw new AiGenError(
            ERR.VALIDATION,
            `File is ${formatBytes(size)} — the limit is ${formatBytes(SUPPORT.maxBytes)}.`,
        );
    }

    const { width, height } = await readDimensions(uri, asset);
    if (!width || !height) {
        throw new AiGenError(ERR.META, 'Could not read the image dimensions.', { retryable: true });
    }

    return {
        uri,
        name: asset.fileName || fileNameFromUri(uri),
        mime,
        typeLabel,
        size,
        width,
        height,
    };
}

export async function requestAnalysis(meta) {
    const payload = API_CONFIG.fixedRequest;
    void meta;
    void payload;
    await delay(API_CONFIG.timeoutMs);
    // Real integration point:
    // const res = await fetch(API_CONFIG.url, { method: 'POST', body: form });
    // if (!res.ok) throw new AiGenError(ERR.NETWORK, 'Detector unreachable.', { retryable: true });
    // return assertShape(await res.json());
    return assertShape(API_CONFIG.fixedResponse);
}

function assertShape(json) {
    const ok =
        json &&
        typeof json === 'object' &&
        typeof json.result === 'string' &&
        Number.isFinite(Number(json.confidence)) &&
        typeof json.model_version === 'string';
    if (!ok) {
        throw new AiGenError(ERR.SHAPE, 'The detector returned an unexpected response.', {
            retryable: true,
        });
    }
    return {
        result: json.result,
        confidence: Number(json.confidence),
        model_version: json.model_version,
    };
}

export const UPLOAD_COPY = Object.freeze({
    capabilities: [
        'AI faces',
        'Flags deepfake',
        'Synthetic textures',
    ],
    privacy: 'Uploaded images are analyzed for AI-generated content and are not stored or shared.',
});

export function buildResults(meta, server) {
    const confidence = clamp01(Number(server.confidence));
    const percent = Math.round(confidence * 100);
    const result = String(server.result ?? '').trim();

    const negative = /(unlikely|not ai|authentic|real|human|organic)/i.test(result);
    const aiSide = !negative && /(ai|generated|deepfake|synthetic|fake)/i.test(result);
    const tone = confidence < 0.55 ? 'warn' : aiSide ? 'danger' : 'accent';

    const rows = [
        { key: 'name', label: 'Image name', value: meta.name, source: 'device' },
        { key: 'type', label: 'Image type', value: meta.typeLabel, source: 'device' },
        { key: 'dims', label: 'Dimensions', value: `${meta.width} × ${meta.height}`, source: 'device' },
        { key: 'size', label: 'File size', value: formatBytes(meta.size), source: 'device' },
        { key: 'result', label: 'Result', value: result, source: 'server' },
        { key: 'confidence', label: 'Confidence', value: `${percent}%`, source: 'server' },
        { key: 'model', label: 'Model version', value: String(server.model_version), source: 'server' },
    ];

    return {
        rows,
        report: { tone, headline: result.toUpperCase(), percent },
    };
}

export async function analyze(meta) {
    const server = await requestAnalysis(meta);
    return buildResults(meta, server);
}