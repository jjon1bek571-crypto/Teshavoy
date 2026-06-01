# 🧠 MIYA.EXE

Telegram Mini App — AI tahlil, IQ test, mini o'yinlar va psixologik testlar.

## 📁 Struktura

```
miya-exe/
├── miniapp/     # Telegram Mini App (HTML/CSS/JS) — Vercel da
│   ├── index.html
│   ├── css/style.css
│   └── js/app.js       # ilova mantiq
│       firebase.js     # umumiy reyting (kvdb.io)
├── bot/         # Telegram Bot (Python aiogram) — Railway da
│   └── main.py
├── shov/        # Reklama posterlari (PNG)
├── backend/     # FastAPI server (ishlatilmaydi — ixtiyoriy/eski)
└── api/         # Vercel serverless (ishlatilmaydi — reyting kvdb.io da)
```

## ✨ Imkoniyatlar

- 😂 **AI Kuldiradi** — foydalanuvchini kulgili tahlil qiladi
- 🧠 **IQ Test** — 60+ savol, 3 daraja qiyinlik
- 🎮 **10 ta o'yin** — Reflex, Xotira, Baxt g'ildiragi, Tez Hisob, NPC test,
  Ha/Yo'q, Rang testi (Stroop), Topqirlik, Tez tap, Nishonga ol
- ⚡ **Bugungi savol** — har kuni yangi
- 🏆 **Reyting** — barcha qurilmalardagi haqiqiy o'yinchilar (kvdb.io umumiy ombor)
- 🪙 XP, daraja, badge va yashirin kodlar tizimi

## 🚀 Ishga tushirish

### Bot
```bash
cd bot
pip install -r requirements.txt
# Token: muhit o'zgaruvchisi BOT_TOKEN yoki bot/secret.py
python main.py
```

### Mini App
`miniapp/` papkasini Vercel ga deploy qiling.

## 🔐 Maxfiylik

Bot token `bot/secret.py` faylida (`.gitignore` da). Repozitoriyga tashlanmaydi.

---
Made with 🧠 by [@djuraeef_v](https://instagram.com/djuraeef_v)
