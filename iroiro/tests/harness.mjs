import { readFile } from 'node:fs/promises';
import { webcrypto } from 'node:crypto';
import vm from 'node:vm';
import * as taskCore from '../task-core.mjs';

const source = await readFile(new URL('../script.js', import.meta.url), 'utf8');
const executable = source.replace(/^import .*;\n/gm, '').replace(/initialize\(\);\s*$/, '');
export const tick = () => new Promise(resolve => setImmediate(resolve));

// FirebaseとDOMだけを置き換え、アプリ本体の関数を実行する。外部通信は行わない。
export function harness(initial = []) {
  const elements = new Map();
  const timers = new Map();
  const store = new Map(initial);
  const writes = [];
  let timerId = 0;
  let generatedId = 0;
  const element = id => {
    if (!elements.has(id)) elements.set(id, {
      value: '', textContent: '', innerHTML: '', open: false, disabled: false,
      dataset: {}, classList: { add() {}, remove() {}, toggle() {} },
      showModal() { this.open = true; }, close() { this.open = false; },
      focus() {}, addEventListener() {}, querySelector() { return null; },
      setAttribute(name, value) { this[name] = value; }, removeAttribute(name) { delete this[name]; },
      querySelectorAll() { return []; },
    });
    return elements.get(id);
  };
  const snapshot = ref => ({
    exists: () => store.has(ref), data: () => structuredClone(store.get(ref)),
  });
  const write = async (ref, data, options) => {
    await api.beforeWrite?.(ref, data);
    const next = options?.merge ? { ...store.get(ref), ...structuredClone(data) } : structuredClone(data);
    store.set(ref, next);
    writes.push({ ref, data: next });
  };
  const context = vm.createContext({
    window: {}, document: { getElementById: element, querySelectorAll: () => [],
      body: { dataset: {}, classList: { add() {}, remove() {} } } },
    ...taskCore, crypto: webcrypto, TextEncoder, structuredClone, URL, Date, Intl,
    setTimeout: (cb, ms) => { timers.set(++timerId, { cb, ms }); return timerId; },
    clearTimeout: id => timers.delete(id),
    serverTimestamp: () => new Date('2026-10-22T00:00:00Z'),
    collection: (_db, ...parts) => parts.join('/'),
    doc: (...parts) => (typeof parts[0] === 'string' ? parts : parts.slice(1)).join('/'),
    Timestamp: { fromDate: date => date },
    getDoc: async ref => snapshot(ref), setDoc: write,
    updateDoc: async (ref, patch) => {
      const next=structuredClone(store.get(ref)||{});
      for(const [key,value] of Object.entries(patch)) {
        const parts=key.split('.'); let object=next;
        for(const part of parts.slice(0,-1))object=object[part]??={};
        object[parts.at(-1)]=structuredClone(value);
      }
      await write(ref,next);
    },
    addDoc: async (ref, data) => { const id = `generated-${++generatedId}`; await write(`${ref}/${id}`, data); return { id }; },
    runTransaction: async (_db, callback) => {
      const pending = [];
      const result = await callback({ get: async ref => snapshot(ref),
        set: (ref, data, options) => pending.push([ref, data, options]) });
      for (const args of pending) await write(...args);
      return result;
    },
    writeBatch: () => {
      const pending = [];
      return { set: (...args) => pending.push(args), commit: async () => {
        await api.beforeBatch?.();
        for (const args of pending) await write(...args);
      } };
    },
    localStorage: { getItem: () => null },
    onSnapshot: () => () => {}, query: (...args) => args, orderBy: (...args) => args,
  });
  vm.runInContext(executable, context);
  const api = { context, element, timers, store, writes,
    run: code => vm.runInContext(code, context) };
  element('sortSelect').value='updated-desc';
  api.run("currentUser={uid:'test-user'}");
  return api;
}

