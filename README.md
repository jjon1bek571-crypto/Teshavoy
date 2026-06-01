# 🧠 MIYA.EXE

Telegram Mini App — AI tahlil, IQ test, mini o'yinlar va psixologik testlar.

## 📁 Struktura

```
miya-exe/
├── miniapp/     # Telegram Mini App — Vercel da
│   ├── index.html
│   ├── css/style.css
│   ├── js/app.js        # ilova mantiq
│   │   firebase.js      # reyting (xavfsiz backend orqali)
│   └── api/             # Vercel serverless (XAVFSIZ backend)
│       ├── _lib.js          # initData tekshiruvi + kvdb (maxfiy)
│       ├── score.js         # POST — ballni saqlash (initData talab)
│       └── leaderboard.js   # GET  — top o'yinchilar
├── bot/         # Telegram Bot (Python aiogram) — Railway da
│   └── main.py
├── shov/        # Reklama posterlari (PNG)
└── backend/     # FastAPI server (ishlatilmaydi — eski muqobil)
```

## ✨ Imkoniyatlar

- 😂 **AI Kuldiradi** — foydalanuvchini kulgili tahlil qiladi
- 🧠 **IQ Test** — 60+ savol, 3 daraja qiyinlik
- 🎮 **10 ta o'yin** — Reflex, Xotira, Baxt g'ildiragi, Tez Hisob, NPC test,
  Ha/Yo'q, Rang testi (Stroop), Topqirlik, Tez tap, Nishonga ol
- ⚡ **Bugungi savol** — har kuni yangi
- 🏆 **Reyting** — barcha qurilmalardagi haqiqiy o'yinchilar (xavfsiz backend)
- 🪙 XP, daraja, badge va yashirin kodlar tizimi

## 🚀 Ishga tushirish

### Bot
```bash
cd bot
pip install -r requirements.txt
# Token: muhit o'zgaruvchisi BOT_TOKEN yoki bot/secret.py
python main.py
```

### Mini App + backend (Vercel)
`miniapp/` papkasini Vercel ga deploy qiling. Reyting xavfsiz ishlashi uchun
quyidagi qadamlarni bajaring (bir marta):

1. **Maxfiy kalitli yangi kvdb bucket yarating** (eski bucketga secret qo'shib
   bo'lmaydi, shuning uchun yangisi kerak):
   ```bash
   curl https://kvdb.io -d 'email=SIZNING_EMAIL' -d 'secret_key=UZUN_TASODIFIY_KALIT'
   ```
   Javobda yangi `BUCKET_ID` qaytadi.

2. **Eski ballarni ko'chiring** (mavjud o'yinchilar yo'qolmasligi uchun) — bir marta:
   ```powershell
   $env:KVDB_BUCKET="yangi_BUCKET_ID"
   $env:KVDB_SECRET="UZUN_TASODIFIY_KALIT"
   node tools/migrate.js
   ```
   Telegram'dan o'ynaganlar o'z ballarini keyin ham yangilab boradi.

3. **Vercel → Settings → Environment Variables** ga qo'shing:
   | Nomi | Qiymati |
   |------|---------|
   | `BOT_TOKEN`   | botning tokeni (initData tekshiruvi uchun) |
   | `KVDB_BUCKET` | yuqoridagi yangi `BUCKET_ID` |
   | `KVDB_SECRET` | yuqoridagi `secret_key` |

4. Qayta deploy qiling (Redeploy).

## 🔐 Maxfiylik / Xavfsizlik

- Bot token `bot/secret.py` da (`.gitignore` da) va Vercel env'da — repozitoriyga
  tashlanmaydi.
- Reytingga yozish faqat **server orqali**: Telegram `initData` HMAC bilan
  tekshiriladi, kvdb maxfiy kaliti faqat serverda. Tashqaridan reytingni
  o'chirib/buzib bo'lmaydi.
- **Anti-cheat:** ballar mijozda hisoblanadi, lekin server himoyalaydi:
  - Soatlik XP cheklovi (`HOURLY_CAP`) — skript/instant shishirishni to'xtatadi
  - Bitta so'rov backstop (`MAX_DELTA`) + kamayishga yo'l yo'q
  - Shubhali sakrashlar (`SUSPECT_DELTA`) `flags` bilan belgilanadi (bloklamaydi)
  - **To'liq cheat-proof emas** — shuning uchun g'olib sovg'a oldidan qo'lda
    tekshiriladi (pastga qarang).

## 🏆 Mavsum / Sovg'a / G'olibni tekshirish

- Reyting **oylik mavsumlarga** bo'lingan (Toshkent vaqti). `s:<oy>:<id>` —
  mavsum, `u:<id>` — barcha vaqt. Mavsum har oy 0 dan boshlanadi.
- **G'olibni tekshirish** (sovg'a oldidan flags'ni ko'rish):
  ```
  https://<APP_URL>/api/admin?key=<KVDB_SECRET>&season=YYYY-MM
  ```
  `flags > 0` bo'lsa — o'sha o'yinchini qo'lda ko'zdan kechiring. `key` =
  `KVDB_SECRET` (faqat sizda).

---
Made with 🧠 by [@djuraeef_v](https://instagram.com/djuraeef_v)
