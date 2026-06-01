/* ============================================================
   MIYA.EXE — Reyting tizimi (umumiy ombor: kvdb.io)
   Barcha qurilmalardagi HAQIQIY foydalanuvchilar ko'rinadi.
   kvdb.io — bepul, CORS QO'LLAYDI (jsonblob'dan farqli), server kerak emas.
   ============================================================ */

// Bu bucket allaqachon yaratilgan (sizning email'ingizga bog'langan).
const KVDB_BUCKET = '4V8vD9NVepxA5unu7hCv2y';
const STORE_URL   = `https://kvdb.io/${KVDB_BUCKET}/users`;

/* ── Reytingni umumiy ombordan olish ── */
async function fbGetLeaderboard() {
  try {
    const res = await fetch(STORE_URL, { cache: 'no-store' });
    if (!res.ok) return null;                   // 404 = ombor hali bo'sh
    const text  = await res.text();
    const users = text ? JSON.parse(text) : {};
    return Object.entries(users)
      .map(([uid, v]) => ({ user_id: uid, ...v }))
      .filter(u => u && u.name && typeof u.xp === 'number')
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
  if (!uid) return;
  try {
    // 1. Joriy holatni o'qiymiz
    const res = await fetch(STORE_URL, { cache: 'no-store' });
    let store = {};
    if (res.ok) {
      const t = await res.text();
      store = t ? JSON.parse(t) : {};
    }

    // 2. O'z yozuvimizni qo'shamiz/yangilaymiz
    store[uid] = {
      name:  data.name,
      xp:    data.xp,
      level: data.level,
      ts:    Date.now(),
    };

    // 3. Faqat eng faol 200 ta foydalanuvchini saqlaymiz
    const entries = Object.entries(store)
      .sort((a, b) => (b[1].xp || 0) - (a[1].xp || 0))
      .slice(0, 200);
    store = Object.fromEntries(entries);

    // 4. Qaytarib yozamiz
    await fetch(STORE_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(store),
    });
  } catch { /* internet yo'q — keyinroq qayta urinadi */ }
}
