/* ============================================================
   MIYA.EXE — Reyting (XAVFSIZ backend orqali)
   - Yozish FAQAT server orqali: Telegram initData HMAC bilan tekshiriladi.
   - Mijozda na bucket id, na maxfiy kalit bor — hech narsa sizib chiqmaydi.
   - Tashqaridan reytingni o'chirib/buzib bo'lmaydi.
   Endpointlar app bilan bir domenda (Vercel) — CORS muammosi yo'q:
     GET  /api/leaderboard   — top o'yinchilar
     POST /api/score         — o'z ballini saqlash (initData talab qilinadi)
   ============================================================ */

const API_BASE = '/api';

/* ── Reytingni olish ── */
async function fbGetLeaderboard() {
  try {
    const res = await fetch(`${API_BASE}/leaderboard`, { cache: 'no-store' });
    if (!res.ok) return null;
    const arr = await res.json();
    return Array.isArray(arr) ? arr : null;
  } catch {
    return null;
  }
}

/* ── O'yinchini saqlash/yangilash (debounce bilan) ── */
let _saveTimer = null;
async function fbSaveUser(uid, data) {           // uid endi serverda initData'dan olinadi
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => _doSave(data), 1500);
}

async function _doSave(data) {
  const initData = window.Telegram?.WebApp?.initData || '';
  // Telegram tashqarisida (oddiy brauzer testi) initData bo'lmaydi — yozmaymiz
  if (!initData) return;
  try {
    await fetch(`${API_BASE}/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        initData,
        name:   data.name,
        xp:     data.xp,
        level:  data.level,
        streak: data.streak,
        games:  data.games,
        iq:     data.iq,
      }),
    });
  } catch { /* internet yo'q — keyingi safar qayta urinadi */ }
}
