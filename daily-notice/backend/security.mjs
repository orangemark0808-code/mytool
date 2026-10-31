export class LinkError extends Error {
    constructor(code) { super(code); this.name = 'LinkError'; this.code = code; }
}
export const requireValue = (condition, code = 'invalid') => { if (!condition)
    throw new LinkError(code); };
export const textValue = (value, max = 20000) => typeof value === 'string' && value.length > 0 && value.length <= max;
export function base64(bytes) { return btoa(String.fromCharCode(...bytes)); }
export function unbase64(value) {
    requireValue(textValue(value, 40000));
    try {
        return Uint8Array.from(atob(value), char => char.charCodeAt(0));
    }
    catch {
        throw new LinkError('invalid');
    }
}
export function randomId() { return crypto.randomUUID(); }
export function ownerRequest(request, identity, config) {
    requireValue(config.ownerId && config.origin && config.expectedEmail && config.projectId && config.apiKey, 'not-configured');
    requireValue(identity?.userId === config.ownerId, 'forbidden');
    requireValue(request.headers.get('origin') === config.origin, 'origin-rejected');
}
export async function importKey(secret) {
    const bytes = unbase64(secret);
    requireValue(bytes.length === 32, 'not-configured');
    return crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
}
export async function seal(value, key, context) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(context) }, key, new TextEncoder().encode(value));
    return JSON.stringify({ v: 1, iv: base64(iv), cipher: base64(new Uint8Array(cipher)) });
}
export async function unseal(envelope, key, context) {
    try {
        const parsed = JSON.parse(envelope);
        requireValue(parsed.v === 1);
        const iv = unbase64(parsed.iv);
        requireValue(iv.length === 12);
        return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(context) }, key, unbase64(parsed.cipher)));
    }
    catch {
        throw new LinkError('connection-unavailable');
    }
}
export async function digest(value) { return base64(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))); }
export async function limitedJson(response, max = 1000000) {
    const reader = response.body?.getReader();
    requireValue(reader, 'remote-data');
    const chunks = [];
    let size = 0;
    for (;;) {
        const { value, done } = await reader.read();
        if (done)
            break;
        size += value.length;
        if (size > max) {
            await reader.cancel();
            throw new LinkError('too-large');
        }
        chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
    }
    try {
        return JSON.parse(new TextDecoder().decode(bytes));
    }
    catch {
        throw new LinkError('remote-data');
    }
}
