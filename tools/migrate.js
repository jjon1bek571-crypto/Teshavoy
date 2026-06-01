#!/usr/bin/env node
/* ============================================================
   MIYA.EXE — Bir martalik migratsiya
   Eski OCHIQ kvdb bucketdan yangi XAVFSIZ bucketga o'yinchilar
   ballarini ko'chiradi. Yangi bucket xavfsiz ishga tushishidan
   OLDIN bir marta ishga tushiring.

   PowerShell:
     $env:KVDB_BUCKET="yangi_bucket_id"
     $env:KVDB_SECRET="bucket_secret_key"
     node tools/migrate.js

   (OLD_BUCKET ko'rsatilmasa, joriy eski bucket ishlatiladi.)
   Idempotent: qayta ishga tushirsangiz, yangi bucketdagi kattaroq
   ballarni ustiga yozmaydi.
   ============================================================ */

const OLD_BUCKET = process.env.OLD_BUCKET || '4V8vD9NVepxA5unu7hCv2y';
const NEW_BUCKET = process.env.KVDB_BUCKET || '';
const NEW_SECRET = process.env.KVDB_SECRET || '';

if (!NEW_BUCKET || !NEW_SECRET) {
  console.error("XATO: KVDB_BUCKET va KVDB_SECRET muhit o'zgaruvchilari kerak.");
  process.exit(1);
}

const AUTH     = 'Basic ' + Buffer.from(NEW_SECRET + ':').toString('base64');
const NEW_BASE = `https://kvdb.io/${NEW_BUCKET}`;

async function main() {
  // 1. Eski ma'lumotni o'qiymiz (ochiq — kalit kerak emas)
  const res = await fetch(`https://kvdb.io/${OLD_BUCKET}/users`, { cache: 'no-store' });
  if (!res.ok) { console.error("Eski bucket o'qilmadi:", res.status); process.exit(1); }
  const txt   = await res.text();
  const store = txt ? JSON.parse(txt) : {};
  const uids  = Object.keys(store);
  console.log(`Eski bucketda ${uids.length} o'yinchi topildi.`);

  let yozildi = 0, otkazildi = 0;
  for (const uid of uids) {
    const v = store[uid] || {};
    if (!v.name) { otkazildi++; continue; }
    const key = 'u:' + uid;

    // Idempotent: yangi bucketda teng/kattaroq xp bo'lsa — tegmaymiz
    const cur = await fetch(`${NEW_BASE}/${encodeURIComponent(key)}`,
      { headers: { Authorization: AUTH }, cache: 'no-store' });
    if (cur.ok) {
      try {
        const o = JSON.parse(await cur.text());
        if (o && typeof o.xp === 'number' && o.xp >= (+v.xp || 0)) { otkazildi++; continue; }
      } catch { /* yangi bucketda yo'q yoki buzilgan — yozaveramiz */ }
    }

    const obj = {
      name:   String(v.name).slice(0, 32),
      xp:     Math.max(0, Math.floor(+v.xp || 0)),
      level:  Math.max(1, Math.floor(+v.level || 1)),
      streak: 0, games: 0, iq: 0,
      ts:     +v.ts || Date.now(),
    };
    const w = await fetch(`${NEW_BASE}/${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { Authorization: AUTH, 'Content-Type': 'text/plain' },
      body: JSON.stringify(obj),
    });
    if (w.ok) { yozildi++; process.stdout.write('.'); }
    else { console.error(`\nXATO ${key}: ${w.status}`); }
  }
  console.log(`\nTayyor. Ko'chirildi: ${yozildi}, o'tkazib yuborildi: ${otkazildi}.`);
}

main().catch(e => { console.error(e); process.exit(1); });
