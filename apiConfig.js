/**
 * CyberVitals - Central API Configuration & Client
 * 
 * Base Endpoint: https://151-185-33-7.sslip.io
 * 
 * ============================================================================
 * FULL API REFERENCE:
 * ============================================================================
 * 
 * 1. HASH VERIFICATION (Malware Detection)
 *    Route: POST /check-hash
 *    Headers: Content-Type: application/json
 *    Request Body:
 *      {
 *        "sha256": ["E19A010305F742A0CD549A5EFD41E18D324BBAD990F30300EB5FED4249EE7739", ...]
 *      }
 *    Response (200 OK):
 *      {
 *        "matched": ["E19A010305F742A0CD549A5EFD41E18D324BBAD990F30300EB5FED4249EE7739", ...]
 *      }
 * 
 * 2. TEXT CLASSIFICATION (Notification Security)
 *    Route: POST /classify-texts
 *    Headers: Content-Type: application/json
 *    Request Body:
 *      {
 *        "texts": ["Your account has been suspended.", ...]
 *      }
 *    Response (200 OK):
 *      {
 *        "results": [
 *          {
 *            "notification": "Your account has been suspended.",
 *            "match": "Suspended Account Suspended Account Sorry...",
 *            "label": "phishing",
 *            "distance": 0.4222128689289093
 *          }
 *        ]
 *      }
 * 
 * 3. AI IMAGE DETECTION (AI Generated / Deepfake Media)
 *    Route: POST /detect-ai
 *    Headers: multipart/form-data
 *    Request Body:
 *      FormData with field "file" (@file.png)
 *    Response (200 OK):
 *      {
 *        "filename": "abhrams.png",
 *        "ai_generated_probability": 0.9998644590377808,
 *        "is_ai_generated": true
 *      }
 * 
 * 4. IP VALIDATION (Network Security)
 *    Route: POST /check-ips
 *    Headers: Content-Type: application/json
 *    Request Body:
 *      {
 *        "ips": ["123.178.210.138", "123.178.210.135", "8.8.8.8", "122.96.28.97"]
 *      }
 *    Response (200 OK):
 *      {
 *        "matched": ["123.178.210.138", "123.178.210.135", "122.96.28.97"]
 *      }
 * 
 * 5. SERVICE HEALTH
 *    Route: GET /health
 *    Response (200 OK):
 *      {}
 * ============================================================================
 */

export const API_BASE_URL = 'https://151-185-33-7.sslip.io';

export const API_ROUTES = Object.freeze({
    CHECK_HASH: '/check-hash',
    CLASSIFY_TEXTS: '/classify-texts',
    DETECT_AI: '/detect-ai',
    CHECK_IPS: '/check-ips',
    HEALTH: '/health',
});

const DEFAULT_TIMEOUT_MS = 15000;

/**
 * Fetch with configurable timeout
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
        });
        return response;
    } catch (err) {
        if (err.name === 'AbortError') {
            throw new Error(`Request timed out after ${timeoutMs}ms: ${url}`);
        }
        throw err;
    } finally {
        clearTimeout(timer);
    }
}

/**
 * 1. Verify app SHA-256 hashes against malware database
 * @param {string[]} sha256List - Array of SHA-256 hash strings (case-insensitive)
 * @returns {Promise<{ matched: string[] }>}
 */
export async function checkHashApi(sha256List = []) {
    if (!Array.isArray(sha256List) || sha256List.length === 0) {
        return { matched: [] };
    }

    const cleanList = sha256List
        .map((h) => String(h || '').trim())
        .filter(Boolean);

    if (cleanList.length === 0) {
        return { matched: [] };
    }

    const response = await fetchWithTimeout(
        `${API_BASE_URL}${API_ROUTES.CHECK_HASH}`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify({ sha256: cleanList }),
        },
        30000, // App hash checking can be a large batch
    );

    if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`Hash check failed (${response.status}): ${errText || response.statusText}`);
    }

    const data = await response.json();
    return {
        matched: Array.isArray(data?.matched) ? data.matched : [],
    };
}

/**
 * 2. Classify notification texts for phishing / scam / spam threats
 * @param {string[]} texts - Array of notification text strings
 * @returns {Promise<{ results: Array<{ notification: string, match: string, label: string, distance: number }> }>}
 */
export async function classifyTextsApi(texts = []) {
    if (!Array.isArray(texts) || texts.length === 0) {
        return { results: [] };
    }

    const cleanTexts = texts.map((t) => String(t || '').trim()).filter(Boolean);
    if (cleanTexts.length === 0) {
        return { results: [] };
    }

    const reqBody = { texts: cleanTexts };
    console.log('[NotificationSecurity API Request Body]:', JSON.stringify(reqBody, null, 2));

    const response = await fetchWithTimeout(
        `${API_BASE_URL}${API_ROUTES.CLASSIFY_TEXTS}`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify(reqBody),
        },
        20000,
    );

    if (!response.ok) {
        const errText = await response.text().catch(() => '');
        console.error('[NotificationSecurity API Error]:', response.status, errText);
        throw new Error(`Text classification failed (${response.status}): ${errText || response.statusText}`);
    }

    const data = await response.json();
    console.log('[NotificationSecurity API Response]:', JSON.stringify(data, null, 2));
    return {
        results: Array.isArray(data?.results) ? data.results : [],
    };
}

/**
 * 3. Detect whether an image is AI generated or synthetic
 * Uses XMLHttpRequest to safely stream native file multipart data in React Native/Hermes,
 * avoiding Expo fetch's convertFormDataAsync limitations with native file URIs.
 * 
 * @param {Object} file - { uri: string, name?: string, type?: string }
 * @returns {Promise<{ filename: string, ai_generated_probability: number, is_ai_generated: boolean }>}
 */
export async function detectAiImageApi(file) {
    if (!file || !file.uri) {
        throw new Error('Image file URI is required for AI detection.');
    }

    const fileName = file.name || 'image.png';
    const fileType = file.type || 'image/png';
    const fileUri = file.uri;

    console.log('[detectAiImageApi Request]:', { uri: fileUri, name: fileName, type: fileType });

    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const url = `${API_BASE_URL}${API_ROUTES.DETECT_AI}`;

        xhr.open('POST', url);
        xhr.timeout = 45000;
        xhr.setRequestHeader('Accept', 'application/json');
        // Do NOT set Content-Type header manually - XMLHttpRequest + FormData in RN sets multipart boundary automatically

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const data = JSON.parse(xhr.responseText);
                    console.log('[detectAiImageApi Response]:', JSON.stringify(data, null, 2));
                    resolve({
                        filename: data?.filename || fileName,
                        ai_generated_probability: Number(data?.ai_generated_probability ?? 0),
                        is_ai_generated: Boolean(data?.is_ai_generated),
                    });
                } catch (parseErr) {
                    console.error('[detectAiImageApi Parse Error]:', parseErr, xhr.responseText);
                    reject(new Error(`Failed to parse AI detection server response: ${xhr.responseText}`));
                }
            } else {
                console.error('[detectAiImageApi Error]:', xhr.status, xhr.responseText);
                reject(new Error(`AI image detection failed (${xhr.status}): ${xhr.responseText || xhr.statusText}`));
            }
        };

        xhr.onerror = (e) => {
            console.error('[detectAiImageApi Network Error]:', e);
            reject(new Error('Network request failed during AI image detection upload.'));
        };

        xhr.ontimeout = () => {
            console.error('[detectAiImageApi Timeout]: after 45s');
            reject(new Error('AI image detection request timed out after 45s.'));
        };

        try {
            const formData = new FormData();
            formData.append('file', {
                uri: fileUri,
                name: fileName,
                type: fileType,
            });
            xhr.send(formData);
        } catch (sendErr) {
            console.error('[detectAiImageApi Send Error]:', sendErr);
            reject(sendErr);
        }
    });
}

/**
 * 4. Check destination IPs against known malicious IP list
 * @param {string[]} ips - Array of IP address strings
 * @returns {Promise<{ matched: string[] }>}
 */
export async function checkIpsApi(ips = []) {
    if (!Array.isArray(ips) || ips.length === 0) {
        return { matched: [] };
    }

    const cleanIps = Array.from(new Set(ips.map((ip) => String(ip || '').trim()).filter(Boolean)));
    if (cleanIps.length === 0) {
        return { matched: [] };
    }

    const response = await fetchWithTimeout(
        `${API_BASE_URL}${API_ROUTES.CHECK_IPS}`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify({ ips: cleanIps }),
        },
        15000,
    );

    if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`IP check failed (${response.status}): ${errText || response.statusText}`);
    }

    const data = await response.json();
    return {
        matched: Array.isArray(data?.matched) ? data.matched : [],
    };
}

/**
 * 5. Health check
 * @returns {Promise<boolean>}
 */
export async function checkHealthApi() {
    try {
        const response = await fetchWithTimeout(`${API_BASE_URL}${API_ROUTES.HEALTH}`, { method: 'GET' }, 5000);
        return response.ok;
    } catch {
        return false;
    }
}

