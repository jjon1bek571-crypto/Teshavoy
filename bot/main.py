"""
MIYA.EXE Telegram Bot — aiogram 3.x
Ishga tushirish: python main.py
"""

import os
import asyncio
import random
import json
import base64
from urllib.parse import quote
import aiohttp
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import CommandStart, Command, CommandObject
from aiogram.types import WebAppInfo
from aiogram.utils.keyboard import InlineKeyboardBuilder

# ══════════════════════════════════════════════════════════════
# SOZLAMALAR
# ══════════════════════════════════════════════════════════════
# Bot token: avval muhit o'zgaruvchisidan, keyin secret.py dan o'qiladi.
# (secret.py GitHub ga tashlanmaydi — .gitignore da)
BOT_TOKEN = os.getenv("BOT_TOKEN", "")
if not BOT_TOKEN:
    try:
        from secret import BOT_TOKEN  # bot/secret.py
    except ImportError:
        BOT_TOKEN = "YOUR_BOT_TOKEN_HERE"  # bu yerga tokeningizni qo'ying

MINI_APP_URL  = "https://miniapp-fawn-sigma.vercel.app"
CHANNEL_URL   = "https://t.me/myprojectuz1"
INSTAGRAM_URL = "https://instagram.com/djuraeef_v"

# Referral ombori (mini app bilan bir xil kvdb bucket).
# Avval muhit o'zgaruvchisidan (Railway), keyin secret.py dan o'qiladi.
KVDB_BUCKET = os.getenv("KVDB_BUCKET", "")
KVDB_SECRET = os.getenv("KVDB_SECRET", "")
if not KVDB_BUCKET or not KVDB_SECRET:
    try:
        import secret as _secret  # bot/secret.py
        KVDB_BUCKET = KVDB_BUCKET or getattr(_secret, "KVDB_BUCKET", "")
        KVDB_SECRET = KVDB_SECRET or getattr(_secret, "KVDB_SECRET", "")
    except ImportError:
        pass
_KV_BASE = f"https://kvdb.io/{KVDB_BUCKET}"
_KV_AUTH = "Basic " + base64.b64encode((KVDB_SECRET + ":").encode()).decode()

# ══════════════════════════════════════════════════════════════


async def _kv_get(session, key):
    try:
        async with session.get(f"{_KV_BASE}/{quote(key, safe='')}",
                               headers={"Authorization": _KV_AUTH}) as r:
            if r.status != 200:
                return None
            try:
                return json.loads(await r.text())
            except Exception:
                return None
    except Exception:
        return None


async def _kv_set(session, key, obj):
    try:
        async with session.post(f"{_KV_BASE}/{quote(key, safe='')}",
                                headers={"Authorization": _KV_AUTH,
                                         "Content-Type": "text/plain"},
                                data=json.dumps(obj)) as r:
            return r.status < 300
    except Exception:
        return False


async def record_referral(referrer: str, new_user: str):
    """Yangi user referral orqali kelsa, taklif qiluvchi sonini +1 qiladi.
    Har yangi user FAQAT bir marta; o'z-o'zini taklif hisoblanmaydi."""
    if not KVDB_BUCKET or not KVDB_SECRET:
        print("[REF] ❌ KVDB sozlanmagan — referral SAQLANMADI. "
              "Railway env'ga KVDB_BUCKET va KVDB_SECRET qo'shing (Vercel bilan bir xil).")
        return
    if not referrer or not referrer.isdigit() or referrer == new_user:
        print(f"[REF] ⏭  e'tiborsiz (referrer={referrer!r}, new={new_user!r})")
        return
    async with aiohttp.ClientSession() as session:
        if await _kv_get(session, f"refby:{new_user}"):
            print(f"[REF] ⏭  {new_user} allaqachon hisoblangan")
            return  # allaqachon hisoblangan
        ok1 = await _kv_set(session, f"refby:{new_user}", {"by": referrer})
        rec = await _kv_get(session, f"ref:{referrer}")
        cnt = rec.get("count", 0) if isinstance(rec, dict) else 0
        ok2 = await _kv_set(session, f"ref:{referrer}", {"count": cnt + 1})
        if ok1 and ok2:
            print(f"[REF] ✅ {referrer} +1 (jami {cnt + 1}) — yangi: {new_user}")
        else:
            print(f"[REF] ⚠️  yozishda xato (ok1={ok1}, ok2={ok2}) — "
                  "KVDB_SECRET noto'g'ri yoki bucket boshqacha bo'lishi mumkin")


bot = Bot(token=BOT_TOKEN)
dp  = Dispatcher()

ROASTLAR = [
    "Siz motivatsiya videolarini saqlab qo'yasiz, lekin hech qachon qayta ko'rmaysiz.",
    "Miyangiz 'ertaga boshlayman' rejimida uzoq vaqtdan beri ishlayapti.",
    "Siz kitob sotib olasiz, 3 sahifa o'qiysiz, keyin javon bezagi bo'ladi.",
    "Telefoningiz sizni hammadan ko'proq ko'radi. U allaqachon charchagan.",
    "Soat 2 da uxlaysiz, soat 7 da 'bugun sog'lom yashaman' deb o'ylaysiz.",
    "Notificationlarni o'chirding, lekin o'zing har 5 daqiqada telefon ko'rding.",
    "'Hamma narsani tartibga solaman' deb papka yaratding, ichiga hech narsa qo'ymading.",
    "Reels ko'rib 'men ham shunday qilaman' deysiz. Keyin yana reels ko'rasiz.",
]

FAKTLAR = [
    "💡 Prokrastinatsiya dangasalik emas — bu hissiy boshqaruv muammosi.",
    "💡 Miya 'ertaga' so'zini eshitganda xuddi ish qilgandek his qiladi.",
    "💡 Uyqu paytida miya tozalanadi — shuning uchun uyqu juda muhim.",
    "💡 O'rtacha inson kuniga 70,000 ta fikr o'ylaydi, 70% i takroriy.",
    "💡 Kulish uchun 17 ta muskul kerak — kulib yurish osonroq!",
]


def mini_app_keyboard(text="🧠 MIYA.EXE ni ochish"):
    kb = InlineKeyboardBuilder()
    kb.button(text=text, web_app=WebAppInfo(url=MINI_APP_URL))
    kb.button(text="📢 Kanal", url=CHANNEL_URL)
    kb.button(text="📸 Instagram", url=INSTAGRAM_URL)
    kb.adjust(1, 2)
    return kb.as_markup()


def roast_keyboard():
    kb = InlineKeyboardBuilder()
    kb.button(text="🔥 Yana tahlil", callback_data="do_roast")
    kb.button(text="🧠 MIYA.EXE ochish", web_app=WebAppInfo(url=MINI_APP_URL))
    kb.button(text="📢 Kanal", url=CHANNEL_URL)
    kb.button(text="📸 Instagram", url=INSTAGRAM_URL)
    kb.adjust(2, 2)
    return kb.as_markup()


# ── /start ────────────────────────────────────────────────────
@dp.message(CommandStart())
async def cmd_start(message: types.Message, command: CommandObject = None):
    # Referral: havola /start ref<UID> ko'rinishida keladi
    payload = command.args if command else None
    if payload and payload.startswith("ref"):
        await record_referral(payload[3:], str(message.from_user.id))
    name = message.from_user.first_name or "Do'stim"
    text = (
        f"<b>Salom, {name}! 👋</b>\n\n"
        "🧠 <b>MIYA.EXE</b> ga xush kelibsiz!\n\n"
        "Bu yerda siz:\n"
        "😂 <b>AI tahlili</b> — kulgili va haqiqiy\n"
        "🧠 <b>IQ test</b> — miyangizni sinang\n"
        "🎮 <b>5 ta o'yin</b> — ball yig'ing\n"
        "🧪 <b>Ha/Yo'q</b> — ilmiy faktlar\n"
        "⚡ <b>Bugungi savol</b> — har kuni yangi\n\n"
        "<i>Tayyor bo'lsangiz — bosing! 👇</i>"
    )
    await message.answer(text, parse_mode="HTML", reply_markup=mini_app_keyboard())


# ── /myref — o'z referral soningni ko'rish (+ KVDB jonli tekshiruvi) ──
@dp.message(Command("myref"))
async def cmd_myref(message: types.Message):
    uid = str(message.from_user.id)
    if not KVDB_BUCKET or not KVDB_SECRET:
        await message.answer("⚠️ Referral ombori hozircha sozlanmagan. "
                             "Tez orada tuzatamiz!")
        return
    async with aiohttp.ClientSession() as session:
        rec = await _kv_get(session, f"ref:{uid}")
    cnt  = rec.get("count", 0) if isinstance(rec, dict) else 0
    need = 5
    if cnt >= need:
        txt = (f"👥 Siz <b>{cnt}/{need}</b> do'st chaqirdingiz!\n"
               "✅ Sovg'a qur'asiga kirdingiz 🎉")
    else:
        txt = (f"👥 Siz <b>{cnt}/{need}</b> do'st chaqirdingiz.\n"
               f"Yana <b>{need - cnt}</b> ta chaqiring → sovg'a qur'asiga kirasiz!\n\n"
               "<i>Havolangizni app ichidagi «Do'st chaqir» bo'limidan oling.</i>")
    await message.answer(txt, parse_mode="HTML", reply_markup=mini_app_keyboard())


# ── /roast ────────────────────────────────────────────────────
@dp.message(Command("roast"))
async def cmd_roast(message: types.Message):
    msg = await message.answer("🔍 <i>Tahlil qilinmoqda...</i>", parse_mode="HTML")
    await asyncio.sleep(2)
    roast = random.choice(ROASTLAR)
    fakt  = random.choice(FAKTLAR)
    await msg.edit_text(
        f"🎯 <b>Tahlil natijasi:</b>\n\n"
        f"<i>{roast}</i>\n\n"
        f"{fakt}",
        parse_mode="HTML",
        reply_markup=roast_keyboard()
    )


# ── /iq ───────────────────────────────────────────────────────
@dp.message(Command("iq"))
async def cmd_iq(message: types.Message):
    await message.answer(
        "🧠 <b>IQ Test</b>\n\n"
        "Bu testdan <b>97% odam yiqilgan</b>.\n"
        "5 savol. Birinchi instinktingizga isoning.\n\n"
        "<i>Tayyor bo'lsangiz app ni oching:</i>",
        parse_mode="HTML",
        reply_markup=mini_app_keyboard("🧠 IQ Testni boshlash")
    )


# ── /daily ────────────────────────────────────────────────────
@dp.message(Command("daily"))
async def cmd_daily(message: types.Message):
    await message.answer(
        "⚡ <b>Bugungi savol tayyor!</b>\n\n"
        "Har kuni yangi psixologik savol.\n"
        "Javob bering — ball yig'ing — streak saqlang.\n\n"
        "<i>Faqat 1 ta javob. Halol bo'ling!</i>",
        parse_mode="HTML",
        reply_markup=mini_app_keyboard("⚡ Bugungi savolga javob berish")
    )


# ── /games ────────────────────────────────────────────────────
@dp.message(Command("games"))
async def cmd_games(message: types.Message):
    await message.answer(
        "🎮 <b>O'yinlar</b>\n\n"
        "⚡ Reflex testi\n"
        "🧩 Xotira o'yini\n"
        "🎰 Baxt g'ildiragi\n"
        "🔢 Tez hisob\n"
        "🤔 Ha yoki Yo'q\n\n"
        "<i>Har o'yin uchun ball yig'asiz!</i>",
        parse_mode="HTML",
        reply_markup=mini_app_keyboard("🎮 O'yinlarni ochish")
    )


# ── /help ─────────────────────────────────────────────────────
@dp.message(Command("help"))
async def cmd_help(message: types.Message):
    await message.answer(
        "📚 <b>Komandalar:</b>\n\n"
        "/start — Bosh sahifaga o'tish\n"
        "/roast — AI tahlil\n"
        "/iq — IQ Test\n"
        "/daily — Bugungi savol\n"
        "/games — O'yinlar\n"
        "/myref — Nechta do'st chaqirganingiz\n\n"
        "Savollar uchun: @miya_exe_support",
        parse_mode="HTML"
    )


# ── Callback: do_roast ────────────────────────────────────────
@dp.callback_query(F.data == "do_roast")
async def cb_roast(callback: types.CallbackQuery):
    await callback.answer("Tahlil qilinmoqda...", show_alert=False)
    roast = random.choice(ROASTLAR)
    fakt  = random.choice(FAKTLAR)
    await callback.message.edit_text(
        f"🎯 <b>Tahlil natijasi:</b>\n\n"
        f"<i>{roast}</i>\n\n"
        f"{fakt}",
        parse_mode="HTML",
        reply_markup=roast_keyboard()
    )


# ── Inline mode ───────────────────────────────────────────────
@dp.inline_query()
async def inline_handler(inline_query: types.InlineQuery):
    roast = random.choice(ROASTLAR)
    fakt  = random.choice(FAKTLAR)
    results = [
        types.InlineQueryResultArticle(
            id="1",
            title="😂 MIYA.EXE tahlili",
            description=roast[:80] + "...",
            input_message_content=types.InputTextMessageContent(
                message_text=(
                    f"🎯 <b>MIYA.EXE tahlili:</b>\n\n"
                    f"<i>{roast}</i>\n\n"
                    f"{fakt}\n\n"
                    f"<a href='{MINI_APP_URL}'>🧠 O'zingizni tekshiring!</a>"
                ),
                parse_mode="HTML"
            )
        )
    ]
    await inline_query.answer(results, cache_time=1)


# ── Boshqa xabarlar ───────────────────────────────────────────
@dp.message()
async def any_message(message: types.Message):
    await message.answer(
        "🧠 MIYA.EXE ga xush kelibsiz!\n"
        "Quyidagi tugmani bosing:",
        reply_markup=mini_app_keyboard()
    )


# ── Ishga tushirish ───────────────────────────────────────────
async def main():
    print("MIYA.EXE Bot ishga tushdi!")
    print(f"   Mini App: {MINI_APP_URL}")
    if KVDB_BUCKET and KVDB_SECRET:
        print(f"   KVDB: ✅ ON (bucket: {KVDB_BUCKET[:6]}…) — referral ishlaydi")
    else:
        print("   KVDB: ❌ OFF — REFERRAL SAQLANMAYDI! Railway → Variables ga "
              "KVDB_BUCKET va KVDB_SECRET qo'shing (Vercel'dagi bilan AYNAN bir xil).")
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
