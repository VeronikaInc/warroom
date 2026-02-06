/**
 * WAR ROOM — IndexedDB Local Database Layer
 * 
 * Gerçek yerel veritabanı: Yapılandırılmış, hızlı, güvenilir.
 * localStorage'dan farklı olarak büyük veri destekler, indexlenmiş sorgular yapar.
 */

const DB_NAME = 'WarRoomDB';
const DB_VERSION = 1;

let db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;

      // Operations tablosu
      if (!db.objectStoreNames.contains('operations')) {
        const store = db.createObjectStore('operations', { keyPath: 'id' });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('created_at', 'created_at', { unique: false });
      }

      // Directives tablosu
      if (!db.objectStoreNames.contains('directives')) {
        const store = db.createObjectStore('directives', { keyPath: 'id' });
        store.createIndex('priority', 'priority', { unique: false });
        store.createIndex('operation_id', 'operation_id', { unique: false });
        store.createIndex('done', 'done', { unique: false });
        store.createIndex('created_at', 'created_at', { unique: false });
      }

      // Intel tablosu
      if (!db.objectStoreNames.contains('intel')) {
        const store = db.createObjectStore('intel', { keyPath: 'id' });
        store.createIndex('category', 'category', { unique: false });
        store.createIndex('created_at', 'created_at', { unique: false });
      }

      // PT (Physical Training) tablosu
      if (!db.objectStoreNames.contains('pt')) {
        const store = db.createObjectStore('pt', { keyPath: 'id' });
        store.createIndex('created_at', 'created_at', { unique: false });
      }

      // Operation Logs tablosu
      if (!db.objectStoreNames.contains('operation_logs')) {
        const store = db.createObjectStore('operation_logs', { keyPath: 'id' });
        store.createIndex('operation_id', 'operation_id', { unique: false });
        store.createIndex('created_at', 'created_at', { unique: false });
      }

      // Reminders tablosu
      if (!db.objectStoreNames.contains('reminders')) {
        const store = db.createObjectStore('reminders', { keyPath: 'id' });
        store.createIndex('directive_id', 'directive_id', { unique: false });
        store.createIndex('datetime', 'datetime', { unique: false });
        store.createIndex('dismissed', 'dismissed', { unique: false });
      }
    };

    req.onsuccess = (e) => {
      db = e.target.result;
      resolve(db);
    };
    req.onerror = (e) => reject(e.target.error);
  });
}

export async function initDB() {
  if (!db) await openDB();
  return db;
}

function gid() {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

// Generic helpers
function tx(storeName, mode = 'readonly') {
  const t = db.transaction(storeName, mode);
  return t.objectStore(storeName);
}

function getAll(storeName) {
  return new Promise((resolve, reject) => {
    const req = tx(storeName).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function getByIndex(storeName, indexName, value) {
  return new Promise((resolve, reject) => {
    const store = tx(storeName);
    const idx = store.index(indexName);
    const req = idx.getAll(value);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function put(storeName, item) {
  return new Promise((resolve, reject) => {
    const req = tx(storeName, 'readwrite').put(item);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function del(storeName, id) {
  return new Promise((resolve, reject) => {
    const req = tx(storeName, 'readwrite').delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function getOne(storeName, id) {
  return new Promise((resolve, reject) => {
    const req = tx(storeName).get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ============ OPERATIONS ============
export const ops = {
  async getAll() {
    const all = await getAll('operations');
    return all.sort((a, b) => b.created_at - a.created_at);
  },
  async add(o) {
    const item = {
      id: gid(),
      name: o.name,
      description: o.description || '',
      status: o.status || 'PLANNING',
      progress: Number(o.progress) || 0,
      color: o.color || '#d4a843',
      created_at: Date.now()
    };
    await put('operations', item);
    return item.id;
  },
  async update(id, o) {
    const existing = await getOne('operations', id);
    if (!existing) return;
    await put('operations', {
      ...existing,
      name: o.name,
      description: o.description || '',
      status: o.status,
      progress: Number(o.progress) || 0,
      color: o.color
    });
  },
  async delete(id) {
    // Cascade: logları da sil
    const allLogs = await getByIndex('operation_logs', 'operation_id', id);
    for (const l of allLogs) await del('operation_logs', l.id);
    await del('operations', id);
  },
  async get(id) { return getOne('operations', id); }
};

// ============ OPERATION LOGS ============
export const opLogs = {
  async getByOp(opId) {
    const all = await getByIndex('operation_logs', 'operation_id', opId);
    return all.sort((a, b) => b.created_at - a.created_at);
  },
  async add(opId, text) {
    const item = { id: gid(), operation_id: opId, text, created_at: Date.now() };
    await put('operation_logs', item);
    return item.id;
  },
  async delete(id) { await del('operation_logs', id); }
};

// ============ DIRECTIVES ============
export const dirs = {
  async getAll() {
    const all = await getAll('directives');
    return all.sort((a, b) => b.created_at - a.created_at);
  },
  async add(d) {
    const item = {
      id: gid(),
      title: d.title,
      priority: d.priority || 'STANDARD',
      operation_id: d.operationId || '',
      due: d.due || '',
      done: 0,
      completed_at: 0,
      created_at: Date.now()
    };
    await put('directives', item);
    return item.id;
  },
  async toggle(id) {
    const row = await getOne('directives', id);
    if (!row) return;
    await put('directives', {
      ...row,
      done: row.done ? 0 : 1,
      completed_at: row.done ? 0 : Date.now()
    });
  },
  async delete(id) {
    // Cascade: hatırlatıcıları da sil
    const allRems = await getByIndex('reminders', 'directive_id', id);
    for (const r of allRems) await del('reminders', r.id);
    await del('directives', id);
  }
};

// ============ INTEL ============
export const intl = {
  async getAll() {
    const all = await getAll('intel');
    return all.sort((a, b) => b.created_at - a.created_at);
  },
  async add(i) {
    const item = {
      id: gid(),
      title: i.title,
      content: i.content || '',
      category: i.category || 'IDEA',
      created_at: Date.now()
    };
    await put('intel', item);
    return item.id;
  },
  async delete(id) { await del('intel', id); }
};

// ============ PT ============
export const ptDB = {
  async getAll() {
    const all = await getAll('pt');
    return all.sort((a, b) => b.created_at - a.created_at);
  },
  async add(p) {
    const item = {
      id: gid(),
      exercise: p.exercise,
      sets: Number(p.sets) || 0,
      reps: Number(p.reps) || 0,
      weight: Number(p.weight) || 0,
      notes: p.notes || '',
      created_at: Date.now()
    };
    await put('pt', item);
    return item.id;
  },
  async delete(id) { await del('pt', id); }
};

// ============ REMINDERS ============
export const rems = {
  async getAll() {
    const all = await getAll('reminders');
    return all.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
  },
  async add(r) {
    const item = {
      id: gid(),
      title: r.title,
      directive_id: r.directiveId || '',
      datetime: r.datetime,
      dismissed: 0,
      notified: 0,
      created_at: Date.now()
    };
    await put('reminders', item);
    return item.id;
  },
  async dismiss(id) {
    const row = await getOne('reminders', id);
    if (row) await put('reminders', { ...row, dismissed: 1 });
  },
  async markNotified(id) {
    const row = await getOne('reminders', id);
    if (row) await put('reminders', { ...row, notified: 1 });
  },
  async delete(id) { await del('reminders', id); }
};

// ============ DATA EXPORT / IMPORT ============
export async function exportAllData() {
  return {
    operations: await getAll('operations'),
    directives: await getAll('directives'),
    intel: await getAll('intel'),
    pt: await getAll('pt'),
    operation_logs: await getAll('operation_logs'),
    reminders: await getAll('reminders'),
    exported_at: Date.now()
  };
}

export async function importData(data) {
  const stores = ['operations', 'directives', 'intel', 'pt', 'operation_logs', 'reminders'];
  for (const name of stores) {
    if (data[name]) {
      for (const item of data[name]) {
        await put(name, item);
      }
    }
  }
}
