# 🧠 MIYA.EXE

Telegram Mini App — AI tahlil, IQ test, mini o'yinlar va psixologik testlar.

## 📁 Struktura

```
miya-exe/
├── miniapp/     # Telegram Mini App (HTML/CSS/JS) — Vercel da
│   ├── index.html
│   ├── css/style.css
│   └── js/app.js, firebase.js
├── bot/         # Telegram Bot (Python aiogram) — Railway da
│   └── main.py
├── backend/     # FastAPI server (ixtiyoriy)
└── shov/        # Reklama posterlari (PNG)
```

## ✨ Imkoniyatlar

- 😂 **AI Kuldiradi** — foydalanuvchini kulgili tahlil qiladi
- 🧠 **IQ Test** — 60+ savol, 3 daraja qiyinlik
- 🎮 **5 ta o'yin** — Reflex, Xotira, Ruletka, Tez Hisob, NPC test
- 🤔 **Ha/Yo'q** — 28 ta ilmiy fakt
- ⚡ **Bugungi savol** — har kuni yangi
- 🏆 **Reyting** — barcha o'yinchilar bo'yicha
- 🪙 XP, daraja, sovrinlar tizimi

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
