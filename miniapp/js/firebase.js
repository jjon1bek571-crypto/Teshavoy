/* ============================================================
   MIYA.EXE — Reyting tizimi (umumiy ombor)
   Barcha qurilmalardagi HAQIQIY foydalanuvchilar ko'rinadi.
   jsonblob.com — bepul, signupsiz umumiy saqlash.
   ============================================================ */

const STORE_URL = 'https://jsonblob.com/api/jsonBlob/019e7d5d-77b4-7629-9ab1-b82918fd084b';

/* ── Reytingni umumiy ombordan olish ── */
async function fbGetLeaderboard() {
  try {
    const res = await fetch(STORE_URL, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json();
    const users = data.users || {};
    return Object.entries(users)
      .map(([uid, v]) => ({ user_id: uid, ...v }))
      .filter(u => u.name && typeof u.xp === 'number')
      .sort((a, b) => b.xp - a.xp)
      .slice(0, 30);
  } catch {
    return null;
  }
}

/* ── O'yinchini umumiy reytingga qo'shish/yangilash ── */
let _saveTimer = null;
async function fbSaveUser(uid, data) {
  // Tez-tez yozmaslik uchun 1.5s kechikish (debounce)
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => _doSave(uid, data), 1500);
}

async function _doSave(uid, data) {
  try {
    // 1. Joriy holatni o'qiymiz
    const res = await fetch(STORE_URL, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });
    const store = res.ok ? await res.json() : { users: {} };
    if (!store.users) store.users = {};

    // 2. O'z yozuvimizni qo'shamiz/yangilaymiz
    store.users[uid] = {
      name:  data.name,
      xp:    data.xp,
      level: data.level,
      ts:    Date.now(),
    };

    // 3. Faqat eng faol 200 ta foydalanuvchini saqlaymiz
    const entries = Object.entries(store.users)
      .sort((a, b) => (b[1].xp || 0) - (a[1].xp || 0))
      .slice(0, 200);
    store.users = Object.fromEntries(entries);

    // 4. Qaytarib yozamiz
    await fetch(STORE_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(store),
    });
  } catch { /* internet yo'q — keyinroq qayta urinadi */ }
}
