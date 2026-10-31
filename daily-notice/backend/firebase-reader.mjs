import { LinkError, requireValue, textValue, limitedJson } from './security.mjs';
import { normalizeTask } from '../integrations/iroiro/task-core.mjs';
import { readFoodInventory } from '../integrations/iroiro/food-read.mjs';
import { taskImport } from '../lib/task-refresh.mjs';
import { foodImport } from '../lib/meal-plan.mjs';
const invalidTokens = new Set(['TOKEN_EXPIRED', 'USER_DISABLED', 'USER_NOT_FOUND', 'INVALID_REFRESH_TOKEN', 'INVALID_ID_TOKEN']);
const validUid = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);
// All URLs are constructed here; callers cannot supply a host, path or query.
// The only Firestore operations are a settings get and category-filtered queries.
export class FirebaseReader {
    constructor(config, { fetcher = fetch, now = Date.now } = {}) { this.config = config; this.fetcher = fetcher; this.now = now; }
    async remote(url, options = {}) {
        let response;
        try {
            // Workers supports only manual/follow. Never follow a redirect with
            // an ID token, refresh token, or Authorization header attached.
            response = await this.fetcher(url, { ...options, redirect: 'manual', signal: AbortSignal.timeout(10000) });
        }
        catch {
            throw new LinkError('network');
        }
        if (response.status >= 300 && response.status < 400) {
            await response.body?.cancel();
            throw new LinkError('network');
        }
        const data = await limitedJson(response);
        if (!response.ok) {
            if (invalidTokens.has(data?.error?.message))
                throw new LinkError('reconnect');
            if (response.status === 401 || response.status === 403)
                throw new LinkError('permission');
            throw new LinkError('network');
        }
        return data;
    }
    async verify(idToken, { recent = false, uid = null } = {}) {
        requireValue(textValue(idToken, 20000), 'invalid-token');
        let claims, header;
        try {
            const parts = idToken.split('.');
            requireValue(parts.length === 3);
            const decode = value => JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))));
            header = decode(parts[0]);
            claims = decode(parts[1]);
        }
        catch {
            throw new LinkError('invalid-token');
        }
        const now = this.now() / 1000;
        requireValue(header.alg === 'RS256' && textValue(header.kid, 200) && claims.aud === this.config.projectId && claims.iss === `https://securetoken.google.com/${this.config.projectId}` && validUid(claims.sub) && Number.isFinite(claims.exp) && claims.exp > now && Number.isFinite(claims.iat) && claims.iat <= now + 60 && Number.isFinite(claims.auth_time) && claims.auth_time <= now + 60, 'invalid-token');
        if (recent)
            requireValue(claims.auth_time >= now - 300, 'fresh-login-required');
        if (uid)
            requireValue(claims.sub === uid, 'account-mismatch');
        // Claims decoded above are NOT trusted until Google's lookup validates the
        // actual signed token. No local JWT decoding is used as authentication.
        const data = await this.remote(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(this.config.apiKey)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }) });
        requireValue(Array.isArray(data.users) && data.users.length === 1, 'invalid-token');
        const user = data.users[0];
        requireValue(user.localId === claims.sub && !user.disabled && user.emailVerified === true && typeof user.email === 'string' && user.email.toLowerCase() === this.config.expectedEmail.toLowerCase() && user.providerUserInfo?.some(p => p.providerId === 'google.com'), 'account-mismatch');
        return { uid: user.localId, email: user.email };
    }
    async refresh(refreshToken, uid = null) {
        requireValue(textValue(refreshToken), 'invalid-token');
        const data = await this.remote(`https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(this.config.apiKey)}`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }).toString() });
        requireValue(textValue(data.id_token) && textValue(data.refresh_token) && validUid(data.user_id), 'remote-data');
        const user = await this.verify(data.id_token, { uid: uid || data.user_id });
        requireValue(user.uid === data.user_id, 'account-mismatch');
        return { idToken: data.id_token, refreshToken: data.refresh_token, uid: user.uid, email: user.email };
    }
    async read(idToken, uid) {
        requireValue(validUid(uid), 'account-mismatch');
        // Date the read before the requests, so a slow pre-addition response
        // cannot overwrite a newer task addition in the dashboard.
        const fetchedAt = new Date(this.now()).toISOString();
        const base = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(this.config.projectId)}/databases/(default)/documents/users/${encodeURIComponent(uid)}`;
        const headers = { 'Authorization': `Bearer ${idToken}`, 'Content-Type': 'application/json' };
        const settings = decodeDocument(await this.remote(base + '/iroiroSettings/main?mask.fieldPaths=categories', { headers }));
        const categories = Array.isArray(settings.categories) ? settings.categories : [];
        const category = name => { const matches = categories.filter(c => typeof c?.name === 'string' && c.name.trim() === name && textValue(c.id, 1500)); requireValue(matches.length === 1, 'category'); return matches[0].id; };
        const taskCategory = category('タスク'), foodCategory = category('食材');
        const spices = categories.filter(c => typeof c?.name === 'string' && c.name.trim() === '調味料' && textValue(c.id, 1500));
        requireValue(spices.length <= 1, 'category');
        const allowed = new Set([taskCategory, foodCategory, ...spices.map(c => c.id)]);
        requireValue(allowed.size === 2 + spices.length, 'category');
        const query = async (categoryId) => {
            requireValue(allowed.has(categoryId), 'category');
            const fields = categoryId === taskCategory ? ['categoryId', 'title', 'type', 'task', 'items', 'updatedAt'] : categoryId === foodCategory ? ['categoryId', 'title', 'type', 'food', 'foodList', 'items', 'createdAt', 'updatedAt'] : ['categoryId', 'title', 'type', 'items', 'content'];
            const rows = await this.remote(base + ':runQuery', { method: 'POST', headers, body: JSON.stringify({ structuredQuery: { select: { fields: fields.map(fieldPath => ({ fieldPath })) }, from: [{ collectionId: 'iroiroNotes' }], where: { fieldFilter: { field: { fieldPath: 'categoryId' }, op: 'EQUAL', value: { stringValue: categoryId } } }, limit: 501 } }) });
            requireValue(Array.isArray(rows), 'remote-data');
            const docs = rows.filter(r => r.document).map(r => r.document);
            requireValue(docs.length <= 500, 'too-large');
            return docs.map(document => {
                const prefix = base.slice(base.indexOf('projects/')) + '/iroiroNotes/';
                requireValue(typeof document.name === 'string' && document.name.startsWith(prefix) && textValue(document.name.slice(prefix.length), 1500) && !document.name.slice(prefix.length).includes('/'), 'remote-data');
                const data = decodeDocument(document);
                requireValue(data.categoryId === categoryId, 'category');
                return { id: document.name.split('/').at(-1), data };
            });
        };
        const [tasks, foods, seasonings] = await Promise.all([query(taskCategory), query(foodCategory), spices.length ? query(spices[0].id) : Promise.resolve([])]);
        const notes = tasks.map(({ data }) => { const task = normalizeTask(data.task || { items: data.type === 'text' ? [] : data.items }); const date = Date.parse(data.updatedAt); return { title: String(data.title || ''), status: task.status, priority: task.priority, dueDate: task.dueDate, updatedAt: Number.isFinite(date) ? new Date(date).toISOString() : null, items: task.items.map(({ text, checked }) => ({ text, checked })) }; });
        const client = {
            auth: { currentUser: { uid } }, db: {},
            firestore: {
                doc: (db, ...parts) => parts,
                collection: (db, ...parts) => parts,
                where: (...parts) => ({ where: parts }), limit: n => ({ limit: n }),
                query: (collection, where, limit) => ({ collection, where, limit }),
                getDocFromServer: async () => ({ data: () => settings }),
                getDocsFromServer: async (q) => {
                    const id = q.where.where[2], list = id === foodCategory ? foods : seasonings;
                    return { size: list.length, docs: list.map(doc => ({ id: doc.id, data: () => doc.data })) };
                },
            },
        };
        const inventory = await readFoodInventory(client);
        inventory.fetchedAt = fetchedAt;
        const importedTasks = taskImport({ fetchedAt, notes }, this.now()), importedFood = foodImport(inventory, this.now());
        requireValue(importedTasks && importedFood, 'remote-data');
        return { fetchedAt, tasks: importedTasks, food: importedFood };
    }
}
export function decodeDocument(document) {
    requireValue(document && typeof document.fields === 'object' && !Array.isArray(document.fields), 'remote-data');
    const decode = (value, depth = 0) => {
        requireValue(depth < 25 && value && typeof value === 'object', 'remote-data');
        if ('nullValue' in value)
            return null;
        if ('stringValue' in value) {
            requireValue(typeof value.stringValue === 'string', 'remote-data');
            return value.stringValue;
        }
        if ('timestampValue' in value) {
            requireValue(typeof value.timestampValue === 'string', 'remote-data');
            return value.timestampValue;
        }
        if ('booleanValue' in value) {
            requireValue(typeof value.booleanValue === 'boolean', 'remote-data');
            return value.booleanValue;
        }
        if ('integerValue' in value || 'doubleValue' in value) {
            const n = Number(value.integerValue ?? value.doubleValue);
            requireValue(Number.isFinite(n), 'remote-data');
            return n;
        }
        if ('arrayValue' in value) {
            const values = value.arrayValue?.values ?? [];
            requireValue(Array.isArray(values) && values.length <= 2000, 'remote-data');
            return values.map(v => decode(v, depth + 1));
        }
        if ('mapValue' in value)
            return map(value.mapValue?.fields ?? {}, depth + 1);
        throw new LinkError('remote-data');
    };
    const map = (fields, depth) => { requireValue(fields && typeof fields === 'object' && !Array.isArray(fields), 'remote-data'); const out = Object.create(null); for (const [k, v] of Object.entries(fields)) {
        requireValue(!['__proto__', 'constructor', 'prototype'].includes(k), 'remote-data');
        out[k] = decode(v, depth);
    } return out; };
    return map(document.fields, 0);
}
