// public/sw-sync.js
importScripts('https://unpkg.com/idb@8.0.0/build/umd/index-min.js');

const DB_NAME = 'jansamadhan-db';
const STORE_NAME = 'complaints-sync';

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-complaints') {
    event.waitUntil(syncComplaints());
  }
});

async function syncComplaints() {
  const db = await idb.openDB(DB_NAME, 1);
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const queued = await store.getAll();

  for (const item of queued) {
    try {
      const response = await fetch('/api/complaints', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${item.token}`
        },
        body: JSON.stringify(item.data)
      });

      if (response.ok) {
        const deleteTx = db.transaction(STORE_NAME, 'readwrite');
        await deleteTx.objectStore(STORE_NAME).delete(item.id);
        await deleteTx.done;
        
        // Notify the client that sync succeeded (optional)
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
          client.postMessage({ type: 'SYNC_SUCCESS', ticket: item.id });
        });
      }
    } catch (err) {
      console.error('Failed to sync complaint:', err);
      // Don't delete, will retry on next sync event
    }
  }
}
