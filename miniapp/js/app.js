/* ============================================================
   MIYA.EXE — To'liq App Logikasi
   ============================================================ */

const tg = window.Telegram?.WebApp;
if (tg) {
  tg.expand();
  tg.setHeaderColor?.('#f8fafc');
  tg.setBackgroundColor?.('#f8fafc');
}

/* ── Foydalanuvchi ID ── */
function genUID() {
  return 'u_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/* ── Firebase orqali sync (fon rejimida) ── */
async function syncToBackend() {
  try {
    const uid = tg?.initDataUnsafe?.user?.id?.toString() || ls.get('uid') || genUID();
    ls.set('uid', uid);
    await fbSaveUser(uid, {
      name:   S.name,
      xp:     xpTotal(),
      level:  S.level,
      streak: S.streak,
      roasts: S.roasts,
      games:  S.games,
      iq:     S.iq,
    });
  } catch { /* Firebase yo'q — muammo emas */ }
}

/* ── Reytingni olish ── */
async function fetchLeaderboard() {
  return await fbGetLeaderboard();
}

/* ── LocalStorage yordamchilari ── */
const ls = {
  get: (k) => { try { return localStorage.getItem('miya_' + k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem('miya_' + k, v); } catch {} }
};

/* ── Foydalanuvchi holati ── */
const S = {
  name:      tg?.initDataUnsafe?.user?.first_name || "Do'stim",
  xp:        +(ls.get('xp'))      || 0,
  level:     +(ls.get('level'))   || 1,
  streak:    +(ls.get('streak'))  || 0,
  roasts:    +(ls.get('roasts'))  || 0,
  iq:        +(ls.get('iq'))      || 0,
  lastDaily: ls.get('daily')      || '',
  badges:    JSON.parse(ls.get('badges') || '[]'),
  games:     +(ls.get('games'))   || 0,
  hayoyo:    +(ls.get('hayoyo'))  || 0,
};

function save() {
  ls.set('xp',     S.xp);
  ls.set('level',  S.level);
  ls.set('streak', S.streak);
  ls.set('roasts', S.roasts);
  ls.set('iq',     S.iq);
  ls.set('daily',  S.lastDaily);
  ls.set('badges', JSON.stringify(S.badges));
  ls.set('games',  S.games);
  ls.set('hayoyo', S.hayoyo);
}

/* ── XP iqtisodi (ANCHA QIYIN) ──
   Har daraja oldingisidan 150 XP ko'proq talab qiladi.
   1→2: 150, 2→3: 300, 3→4: 450 ... (avval hammasi 100 edi). */
function xpNeeded(level) {
  return level * 150;
}
/* Reytingdagi UMUMIY ball (to'plangan barcha XP, monoton) */
function xpTotal() {
  let sum = S.xp;
  for (let l = 1; l < S.level; l++) sum += xpNeeded(l);
  return sum;
}

function addXP(n) {
  S.xp += n;
  const need = xpNeeded(S.level);
  if (S.xp >= need) {
    S.xp -= need;
    S.level++;
    haptic('medium');
    showToast(`🎉 ${S.level}-darajaga o'tdingiz!`);
  }
  save();
  updateTopbar();
  checkBadges();
  syncToBackend(); // Backend ga yuboramiz (fon rejimida)
}

function haptic(type) {
  tg?.HapticFeedback?.impactOccurred(type);
}

/* ── Topbar yangilash ── */
function updateTopbar() {
  const totalXP = xpTotal();
  document.querySelectorAll('.h-xp-val').forEach(e => e.textContent = totalXP + ' XP');
  document.querySelectorAll('.h-lvl-val').forEach(e => e.textContent = S.level + '-D');
  const el1 = $('h-xp'); if (el1) el1.textContent = totalXP + ' XP';
  const el2 = $('h-lvl'); if (el2) el2.textContent = S.level + '-D';
}

/* ── Ekranlar ── */
function goTo(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const sc = $(id);
  if (sc) sc.classList.add('active');
  document.querySelectorAll('.nb').forEach(b => b.classList.remove('active'));
  const nb = document.querySelector(`.nb[data-sc="${id}"]`);
  if (nb) nb.classList.add('active');
  if (id === 'home')    renderHome();
  if (id === 'profile') renderProfile();
  if (id === 'daily')   renderDaily();
  if (id === 'iq')      iqReset();
  if (id === 'rating')  renderRating();
}

/* ══════════════════════════════════════
   BOOT
══════════════════════════════════════ */
const BOOT_STEPS = [
  'Miya skaneri yoqilmoqda...',
  "Qiziqarli ma'lumotlar yuklanmoqda...",
  "O'yinlar tayyorlanmoqda...",
  'Barcha tizimlar tayyor! ✅'
];

async function boot() {
  const wrap = $('boot-steps'), fill = $('boot-fill');
  wrap.innerHTML = '';
  for (let i = 0; i < BOOT_STEPS.length; i++) {
    await sleep(i === 0 ? 200 : 230 + Math.random() * 150);
    const d = document.createElement('div');
    d.className = 'boot-step' + (i === BOOT_STEPS.length - 1 ? ' ok' : '');
    d.innerHTML = `<span class="dot"></span><span>${BOOT_STEPS[i]}</span>`;
    wrap.appendChild(d);
    requestAnimationFrame(() => d.classList.add('show'));
    fill.style.width = ((i + 1) / BOOT_STEPS.length * 100) + '%';
  }
  await sleep(500);
  goTo('home');
  addXP(5);
  showWelcome();
}

/* ── Xush kelibsiz oynasi (faqat birinchi kirishda) ── */
function showWelcome() {
  if (ls.get('seen_intro')) return;     // ko'rgan bo'lsa — chiqarmaymiz
  const ov = $('welcome');
  if (ov) ov.classList.add('open');
}
function closeWelcome() {
  haptic('light');
  ls.set('seen_intro', '1');
  $('welcome')?.classList.remove('open');
}

/* ══════════════════════════════════════
   BOSH SAHIFA
══════════════════════════════════════ */
function renderHome() {
  updateTopbar();
  const pct = Math.min(100, 30 + S.xp % 100);
  const nameEl = $('h-name');
  if (nameEl) nameEl.textContent = S.name;
  const brainEl = $('h-brain');
  if (brainEl) brainEl.textContent = pct + '%';
  const barEl = $('h-bar');
  if (barEl) barEl.style.width = pct + '%';

  const statuses = [
    `Bugun ${S.streak} kunlik streak! 💪`,
    `${S.roasts} ta tahlil qildingiz 😄`,
    `${S.level}-darajadasiz. Zo'r!`,
    `${S.hayoyo} ta Ha/Yo'q o'ynadingiz 🧪`,
  ];
  const statusEl = $('h-status');
  if (statusEl) statusEl.textContent = statuses[Math.floor(Date.now() / 6000) % statuses.length];
}

/* ══════════════════════════════════════
   REYTING — faqat haqiqiy o'yinchilar
══════════════════════════════════════ */
async function renderRating() {
  const myXP  = xpTotal();
  const myUID = ls.get('uid') || '';

  // Avval yuklanmoqda ko'rsatamiz
  const listEl = $('leader-list');
  if (listEl) listEl.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text3)">⏳ Yuklanmoqda...</div>';

  // Backend dan haqiqiy data olishga urinamiz
  const realData = await fetchLeaderboard();

  // Faqat HAQIQIY kirgan odamlar
  const EMOJIS = ['😎','🌸','🦁','💫','🔥','⭐','🎯','🌺','💪','🎀','🧠','🌟','⚡','🚀','🎮','👑','🎲','🌈','🍀','🦊'];
  let players = (realData || []).map((p, i) => ({
    nom:  p.name,
    em:   EMOJIS[i % EMOJIS.length],
    xp:   p.xp,
    lvl:  p.level,
    isMe: p.user_id === myUID,
  }));

  // O'zimizni qo'shamiz (hali serverga yetib bormagan bo'lishi mumkin)
  if (!players.some(p => p.isMe)) {
    players.push({ nom: S.name, em: '👤', xp: myXP, lvl: S.level, isMe: true });
  } else {
    // Bor bo'lsa, eng yangi XP bilan yangilaymiz
    const me = players.find(p => p.isMe);
    me.xp = myXP; me.lvl = S.level; me.em = '👤';
  }
  players.sort((a, b) => b.xp - a.xp);

  const myIdx    = players.findIndex(p => p.isMe);
  const myRankEl = $('my-rank-num');
  const myNameEl = $('my-rank-name');
  const myXpEl   = $('my-rank-xp');
  const chipEl   = $('rating-total-chip');
  if (myRankEl) myRankEl.textContent = `#${myIdx + 1}`;
  if (myNameEl) myNameEl.textContent = S.name;
  if (myXpEl)   myXpEl.textContent   = `${myXP} XP • ${S.level}-daraja`;
  if (chipEl)   chipEl.textContent   = `${players.length} o'yinchi`;

  if (!listEl) return;
  listEl.innerHTML = '';
  players.slice(0, 15).forEach((p, i) => {
    const d = document.createElement('div');
    d.className = `leader-item${i===0?' top1':i===1?' top2':i===2?' top3':''}${p.isMe?' me':''}`;
    const medal = i===0?'🥇':i===1?'🥈':i===2?'🥉':`#${i+1}`;
    d.innerHTML = `
      <div class="leader-rank${i===0?' gold':i===1?' silver':i===2?' bronze':''}">${medal}</div>
      <div class="leader-avatar">${p.em}</div>
      <div class="leader-info">
        <div class="leader-name">${p.nom}${p.isMe?' <span style="color:var(--purple);font-size:11px">(Siz)</span>':''}</div>
        <div class="leader-xp">${p.lvl}-daraja</div>
      </div>
      <div class="leader-score">
        <div class="leader-pts">${p.xp}</div>
        <div class="leader-lbl">XP</div>
      </div>`;
    listEl.appendChild(d);
  });

  // Agar o'yinchi top 15 dan tashqarida bo'lsa alohida ko'rsatish
  if (myIdx >= 15) {
    const sep = document.createElement('div');
    sep.style.cssText = 'text-align:center;padding:8px;font-size:12px;color:var(--text3)';
    sep.textContent = '• • •';
    listEl.appendChild(sep);
    const d = document.createElement('div');
    d.className = 'leader-item me';
    d.innerHTML = `
      <div class="leader-rank">#${myIdx+1}</div>
      <div class="leader-avatar">👤</div>
      <div class="leader-info">
        <div class="leader-name">${S.name} <span style="color:var(--purple);font-size:11px">(Siz)</span></div>
        <div class="leader-xp">${S.level}-daraja</div>
      </div>
      <div class="leader-score">
        <div class="leader-pts">${myXP}</div>
        <div class="leader-lbl">XP</div>
      </div>`;
    listEl.appendChild(d);
  }

  // Kam o'yinchi bo'lsa — do'st chaqirishga undash
  if (players.length < 5) {
    const hint = document.createElement('div');
    hint.style.cssText = 'text-align:center;padding:20px 16px;margin-top:8px;color:var(--text2);font-size:13px;line-height:1.6;background:var(--purple-pale);border-radius:14px;';
    hint.innerHTML = "🚀 Hali kam o'yinchi bor!<br><b style='color:var(--purple)'>Do'stlaringizni chaqiring</b> va birinchi bo'ling.";
    listEl.appendChild(hint);
  }
}

/* ══════════════════════════════════════
   ROAST
══════════════════════════════════════ */
const ROASTLAR = [
  { m: "Siz motivatsiya videolarini saqlab qo'yasiz, lekin hech qachon qayta ko'rmaysiz.", f: "💡 Tadqiqot: Reja tuzish miyaga ish qilgandek his beradi. Shuning uchun reja tuzib to'xtaymiz." },
  { m: "Miyangiz 'ertaga boshlayman' rejimida uzoq vaqtdan beri ishlayapti. Bu yangi rekord.", f: "💡 Prokrastinatsiya dangasalik emas — bu hissiy muammo. Faqat 2 daqiqa boshlang." },
  { m: "Siz kitob sotib olasiz, 3 sahifa o'qiysiz, keyin javon bezagi bo'ladi.", f: "💡 O'rtacha inson kuniga 4.5 soat ekranga qaraydi, kitobga esa 17 daqiqa." },
  { m: "Telefoningiz sizni hammadan ko'proq ko'radi. U allaqachon charchagan.", f: "💡 Telefonni faqat 1 soat kamroq ishlatish o'zini yaxshi his qilishni oshiradi." },
  { m: "Soat 2 da uxlaysiz, soat 7 da 'bugun sog'lom yashaman' deb o'ylaysiz. Umid yashaydi!", f: "💡 Uyqu kamchiligi diqqatni 30% pasaytiradi. 7-8 soat uyqu — eng yaxshi dori." },
  { m: "Notificationlarni o'chirding, lekin o'zing har 5 daqiqada telefon ko'rding.", f: "💡 Telefon yonida tursa ham, diqqat 20% kamayadi." },
  { m: "'Hamma narsani tartibga solaman' deb papka yaratding, ichiga hech narsa qo'ymading.", f: "💡 Boshlash eng qiyin qism. Faqat birinchi kichik qadamni qo'ying." },
  { m: "Reels ko'rib 'men ham shunday qilaman' deysiz. Keyin yana reels ko'rasiz.", f: "💡 Qisqa videolar miyaning mukofot tizimini haddan ziyod ishlatadi." },
  { m: "Hamma bilan rozi bo'lasiz, keyin yolg'iz 'aslida unday emas' deb o'ylaysiz.", f: "💡 'Yo'q' deyish — o'z-o'zini hurmat qilishning eng muhim ko'rinishi." },
  { m: "Ro'yxat tuzasiz, yo'qotasiz, yangi ro'yxat tuzasiz. Bu jarayon abadiy.", f: "💡 Yozish xotirani 40% mustahkamlaydi. Ro'yxat tuzish foydali — bajarish yanada foydali!" },
  { m: "Bugun dam olaman, ertadan boshlayman — bu gapni necha marta aytgansiz? Miyangiz sanamoqda.", f: "💡 Dam olish muhim! Lekin reja bilan dam olish miyaga farqli ta'sir qiladi." },
  { m: "Telefon ekranini 50 marta ko'rasiz, har safar 'yangi narsa yo'q' deb yopasiz. Ammo yana ochasiz.", f: "💡 Bu 'variable reward' deyiladi — xuddi slot mashina kabi. Miya yangi narsa bo'lishi mumkin deb umid qiladi." },
];

let roastTarixi = JSON.parse(ls.get('rtarixi') || '[]');

function doRoast() {
  const btn  = $('roast-btn');
  const idle = $('roast-idle');
  const load = $('roast-load');
  const res  = $('roast-res');
  if (!btn) return;
  haptic('light');
  btn.style.display  = 'none';
  if (idle) idle.style.display = 'none';
  if (load) load.classList.add('show');
  if (res)  res.classList.remove('show');

  const steps = [
    "Ma'lumotlar to'planmoqda...",
    "Xatti-harakatlar o'rganilmoqda...",
    'Tahlil yakunlanmoqda...',
    'Natija tayyorlanmoqda...'
  ];
  let i = 0;
  const ltxt = $('load-txt');
  if (ltxt) ltxt.textContent = steps[0];
  const iv = setInterval(() => { i++; if (i < steps.length && ltxt) ltxt.textContent = steps[i]; }, 850);

  setTimeout(() => {
    clearInterval(iv);
    if (load) load.classList.remove('show');
    btn.style.display = 'block';
    const r = ROASTLAR[Math.floor(Math.random() * ROASTLAR.length)];
    const rt = $('roast-text'), rf = $('roast-fact');
    if (rt) rt.textContent = r.m;
    if (rf) rf.innerHTML = r.f;
    if (res) res.classList.add('show');
    roastTarixi.unshift(r.m);
    if (roastTarixi.length > 5) roastTarixi.pop();
    ls.set('rtarixi', JSON.stringify(roastTarixi));
    S.roasts++;
    addXP(10);
    badge('roast1');
    renderRoastTarixi();
    haptic('medium');
    showToast('😂 Tahlil tugadi! +10 XP');
  }, 3600);
}

function renderRoastTarixi() {
  const el = $('roast-hist');
  if (!el) return;
  el.innerHTML = '';
  roastTarixi.slice(1).forEach(t => {
    const d = document.createElement('div');
    d.className = 'hist-item';
    d.textContent = t;
    el.appendChild(d);
  });
}

function shareRoast() {
  const t = $('roast-text')?.textContent || '';
  haptic('light');
  if (tg?.switchInlineQuery) { tg.switchInlineQuery(t); return; }
  if (navigator.share) {
    navigator.share({ text: `😂 MIYA.EXE tahlili:\n"${t}"\n\nSiz ham tekshiring: @miya_exe_bot` });
    return;
  }
  navigator.clipboard?.writeText(`😂 MIYA.EXE tahlili:\n"${t}"\n\n@miya_exe_bot da tekshiring!`)
    .then(() => showToast('📋 Nusxalandi!'));
}

/* ══════════════════════════════════════
   IQ TEST
══════════════════════════════════════ */
// Barcha savollar havzasi — har safar 5 tasi random tanlanadi
// 60+ savol — 3 daraja qiyinlik (har safar 2 oson + 2 o'rta + 1 qiyin random tanlanadi)
const IQ_HAVZA = {
  oson: [
    { s: "12 oy ichida 28 kun bor oy nechta?",                                        t: ["1 ta", "4 ta", "12 ta", "2 ta"], c: 2 },
    { s: "Sovuq bo'lganda odamlar nima kiyadi?",                                       t: ["Ko'ylak", "Shim", "Palto", "Sandal"], c: 2 },
    { s: "Bir fermada 10 ta qo'y bor edi. 9 tasi qochdi. Nechta qoldi?",              t: ["1", "0", "9", "10"], c: 0 },
    { s: "Agar siz 3-o'rinda yugursangiz va 2-o'rindagini o'tsangiz — qaysi o'rindasiz?", t: ["1-o'rin", "2-o'rin", "3-o'rin", "4-o'rin"], c: 1 },
    { s: "Qaysi so'z to'g'ri yozilgan?",                                               t: ["Psixologiya", "Psixalogiya", "Psihologiya", "Psixologıya"], c: 0 },
    { s: "Bir kunda necha soat bor?",                                                   t: ["12", "24", "48", "36"], c: 1 },
    { s: "Qaysi hayvon eng katta?",                                                     t: ["Fil", "Karkidon", "Hippo", "Ko'k kit"], c: 3 },
    { s: "3 × 3 × 3 = ?",                                                              t: ["9", "27", "18", "81"], c: 1 },
    { s: "Inson tanasida nechta suyak bor (katta odam)?",                              t: ["100", "155", "206", "300"], c: 2 },
    { s: "Qaysi planeta quyoshga eng yaqin?",                                           t: ["Venera", "Merkuriy", "Yer", "Mars"], c: 1 },
    { s: "1 kilometrda necha metr bor?",                                                t: ["100", "500", "1000", "10000"], c: 2 },
    { s: "O'zbekistonning poytaxti qaysi shahar?",                                      t: ["Samarqand", "Buxoro", "Toshkent", "Namangan"], c: 2 },
    { s: "5 + 7 = ?",                                                                   t: ["10", "11", "12", "13"], c: 2 },
    { s: "Bir haftada necha kun bor?",                                                  t: ["5", "6", "7", "8"], c: 2 },
    { s: "Qaysi rang qizil va sariq aralashmasidan hosil bo'ladi?",                     t: ["Yashil", "To'q sariq", "Binafsha", "Jigarrang"], c: 1 },
    { s: "Bir yilda nechta fasl bor?",                                                  t: ["2", "3", "4", "5"], c: 2 },
    { s: "10 - 4 = ?",                                                                  t: ["5", "6", "7", "4"], c: 1 },
    { s: "Quyosh qaysi tomondan chiqadi?",                                              t: ["G'arb", "Sharq", "Shimol", "Janub"], c: 1 },
    { s: "Muz erisa nimaga aylanadi?",                                                  t: ["Bug'", "Suv", "Tuz", "Havo"], c: 1 },
    { s: "Qaysi mevaning rangi odatda sariq?",                                          t: ["Olma", "Banan", "Uzum", "Olcha"], c: 1 },
  ],
  orta: [
    { s: "2 + 2 × 2 = ?",                                                              t: ["8", "6", "4", "12"], c: 1 },
    { s: "Miya to'liq yetilishi necha yoshda tugaydi?",                                 t: ["18", "21", "25", "30"], c: 2 },
    { s: "Qaysi raqam qatorga to'g'ri kelmaydi? 2, 4, 8, 15, 32",                     t: ["4", "8", "15", "32"], c: 2 },
    { s: "Agar kalamush 3 sekundda bir chuqur qazisa, 3 kalamush 9 sekundda nechta qazadi?", t: ["9", "3", "27", "6"], c: 0 },
    { s: "Qaysi son qatorga to'g'ri kelmaydi? 1, 4, 9, 16, 20, 25",                   t: ["9", "16", "20", "25"], c: 2 },
    { s: "5 × 5 + 5 ÷ 5 = ?",                                                          t: ["26", "25", "30", "51"], c: 0 },
    { s: "Inson ko'zi qancha rang farqlay oladi?",                                      t: ["1 million", "10 million", "100 ming", "500 ming"], c: 1 },
    { s: "3, 6, 11, 18, 27 — keyingi son?",                                            t: ["36", "38", "40", "35"], c: 2 },
    { s: "Agar bugun chorshanba bo'lsa, 100 kundan keyin qaysi kun?",                   t: ["Dushanba", "Shanba", "Juma", "Payshanba"], c: 1 },
    { s: "Qaysi so'z boshqacha? Quyosh, Oy, Yulduz, Dunyo",                            t: ["Quyosh", "Oy", "Yulduz", "Dunyo"], c: 3 },
    { s: "2, 3, 5, 7, 11, 13 — keyingi son? (tub sonlar qatori)",                      t: ["14", "15", "17", "19"], c: 2 },
    { s: "Bitta gugurt cho'pi bilan qanday geometrik shakl hosil qilish mumkin?",       t: ["Uchburchak", "To'rtburchak", "Nuqta", "Chiziq"], c: 3 },
    { s: "Agar A>B va B>C bo'lsa, A va C orasida qanday munosabat?",                   t: ["A<C", "A=C", "A>C", "Aniqlab bo'lmaydi"], c: 2 },
    { s: "Tovuq 6 kunda 6 tuxum qo'ysa, 12 tovuq 12 kunda nechta tuxum qo'yadi?",     t: ["72", "12", "144", "24"], c: 2 },
    { s: "Qancha 9 bor 100 dan kichik 9 ga bo'linadigan sonlarda?",                    t: ["9", "10", "11", "12"], c: 2 },
    { s: "100 ning yarmi qancha?",                                                     t: ["25", "50", "75", "40"], c: 1 },
    { s: "12 × 12 = ?",                                                                t: ["124", "144", "121", "132"], c: 1 },
    { s: "2, 4, 6, 8 — keyingi son?",                                                  t: ["9", "10", "11", "12"], c: 1 },
    { s: "Uchburchak burchaklari yig'indisi necha gradus?",                            t: ["90", "180", "270", "360"], c: 1 },
    { s: "Suv necha gradusda qaynaydi (dengiz sathida)?",                              t: ["50°C", "90°C", "100°C", "120°C"], c: 2 },
    { s: "1, 2, 4, 8, 16 — keyingi son?",                                              t: ["24", "30", "32", "20"], c: 2 },
    { s: "3 ta qalam 6 ming so'm bo'lsa, 5 ta qalam necha pul?",                       t: ["8 ming", "10 ming", "12 ming", "9 ming"], c: 1 },
    { s: "Qaysi son qatorga to'g'ri kelmaydi? 3, 6, 9, 13, 15",                        t: ["6", "9", "13", "15"], c: 2 },
  ],
  qiyin: [
    { s: "Ko'l yuzasida nilufar guli bor. Har kuni ikki barobarlaydi. 30 kunda to'ladi. Qachon yarmi to'lgan?", t: ["15-kuni", "29-kuni", "10-kuni", "20-kuni"], c: 1 },
    { s: "Agar 5 ta mashina 5 daqiqada 5 ta detal yasasa, 100 mashina 100 daqiqada nechta yasaydi?",            t: ["100", "500", "10000", "1000"], c: 2 },
    { s: "Tovuq va yarim tovuq 1.5 kunda 1.5 tuxum qo'ysa, 6 tovuq 6 kunda nechta tuxum qo'yadi?",            t: ["6", "9", "12", "18"], c: 0 },
    { s: "Agar 1 + 1 = 2, 2 + 2 = 8, 3 + 3 = 18 bo'lsa, 4 + 4 = ?",                  t: ["32", "16", "24", "64"], c: 0 },
    { s: "Bir odamda 2 ona bor. Bu qanday mumkin?",                                     t: ["Mumkin emas", "Biologik va o'gay onasi", "Opa-singil", "Ikkinchi nikoh"], c: 1 },
    { s: "Birinchi bo'lish uchun quvib o'tish kerak. Qancha odamni quvib o'tish kerak?", t: ["1 ta", "2 ta", "Hammani", "Hech kimni"], c: 0 },
    { s: "Qaysi raqam bir xil yoziladigan bo'lsa ham soni o'zgarmaydi (o'ng-chap)?",    t: ["6", "8", "0", "9"], c: 1 },
    { s: "Agar 5 ta do'stingiz bor bo'lsa va har biri boshqa 5 ta do'st bilan salom berse, jami nechta salom?", t: ["25", "30", "20", "15"], c: 1 },
    { s: "Qora rangdagi qora mushuk, qora zina, qora xonada. Deraza, eshik, yorug'lik yo'q. Mushuk qayerda?",   t: ["Ko'rinmaydi", "Zinada", "Xonada", "Qochib ketgan"], c: 2 },
    { s: "Son qatorida: 1, 1, 2, 3, 5, 8, 13 — keyingi son?",                          t: ["18", "20", "21", "24"], c: 2 },
    { s: "Agar barmoqlaringizni yozsangiz — 5 ta bor. Ikki qo'lda hammasi nechta? (boshqacha o'ylang)",          t: ["10", "5", "9", "8"], c: 0 },
    { s: "Bir piyolaga suv to'ldirdingiz. Endi u yarim bo'sh yoki yarim to'lami?",       t: ["Yarim bo'sh", "Yarim to'la", "Ikkalasi ham to'g'ri", "Farqi yo'q"], c: 2 },
    { s: "Bir g'isht 1 kg va yarim g'isht keladi. G'isht necha kg?",                    t: ["1.5 kg", "2 kg", "2.5 kg", "3 kg"], c: 1 },
    { s: "5 kishi bir marta qo'l berib ko'rishsa, jami necha marta qo'l beriladi?",     t: ["10", "15", "20", "25"], c: 0 },
    { s: "Qatorda: 2, 6, 12, 20, 30 — keyingi son?",                                   t: ["38", "40", "42", "36"], c: 2 },
    { s: "Tovuqni 100 ga oldim, 110 ga sotdim, 120 ga qayta oldim, 130 ga sotdim. Foydam?", t: ["10 so'm", "20 so'm", "0 so'm", "30 so'm"], c: 1 },
    { s: "Yarim sham 1 soatda yonib tugasa, butun sham necha soatda tugaydi?",          t: ["1 soat", "1.5 soat", "2 soat", "4 soat"], c: 2 },
    { s: "Bitta nasos hovuzni 6 soatda to'ldiradi. Ikkita bir xil nasos-chi?",          t: ["2 soat", "3 soat", "6 soat", "12 soat"], c: 1 },
    { s: "Qo'ng'iroq 6 marta jiringlashi 30 soniya bo'lsa, 12 marta-chi?",              t: ["60", "66", "72", "55"], c: 1 },
    { s: "12 ta tangadan bittasi yengilroq. Tarozida eng kam necha marta o'lchaymiz?",  t: ["2", "3", "4", "6"], c: 1 },
  ],
};

// Har safar 2 oson + 2 o'rta + 1 qiyin = 5 savol, aralashtirilib
let IQ_SAVOLLAR = [];

const IQ_NATIJALAR = [
  { min: 0, max: 1, ball: 68,  tag: "Hmm... 🤔",    desc: "Miyangiz hali uyg'onmagan. Suv iching va yana urinib ko'ring!" },
  { min: 2, max: 2, ball: 89,  tag: "Oddiy 😊",     desc: "O'rtacha. Internetdagi aksariyat odamlar siz bilan bir xil." },
  { min: 3, max: 3, ball: 112, tag: "Yaxshi! 👍",   desc: "Miyangiz yaxshi ishlayapti. Rivojlanish yo'lidasiz!" },
  { min: 4, max: 4, ball: 127, tag: "Zo'r! 🔥",     desc: "Top 12% ga kirasiz. Zo'r natija!" },
  { min: 5, max: 5, ball: 141, tag: "Dahshat! 🚀",  desc: "Yoki juda aqllisiz, yoki omadingiz keldi. Ikkalasi ham yaxshi!" },
];

const IQ_FAKTLAR = [
  "IQ testi aqlingizni emas — test qilish qobiliyatingizni o'lchaydi.",
  "Einstein maktabda past baho olgan. Stanford universiteti asoschilaridan biri kollej bitirmagan.",
  "Miya plastik — yangi narsalar o'rganish uni kuchaytiradi.",
  "Hissiy intellekt (EQ) akademik IQ dan ko'ra hayotda muvaffaqiyatni ko'proq belgilaydi.",
];

let iqJavoblar = [], iqHozir = 0;

function iqReset() {
  iqJavoblar = []; iqHozir = 0;
  const start = $('iq-start'), q = $('iq-questions'), r = $('iq-result');
  if (start) start.style.display = 'block';
  if (q) q.classList.remove('show');
  if (r) r.classList.remove('show');
  const prev = $('iq-prev');
  if (prev) prev.textContent = S.iq || '?';
}

function iqBoshlash() {
  haptic('light');
  iqJavoblar = []; iqHozir = 0;
  // 2 oson + 2 o'rta + 1 qiyin, aralashtirilib
  const shuffle = arr => [...arr].sort(() => Math.random() - 0.5);
  IQ_SAVOLLAR = [
    ...shuffle(IQ_HAVZA.oson).slice(0, 2),
    ...shuffle(IQ_HAVZA.orta).slice(0, 2),
    ...shuffle(IQ_HAVZA.qiyin).slice(0, 1),
  ].sort(() => Math.random() - 0.5);
  const start = $('iq-start'), q = $('iq-questions'), r = $('iq-result');
  if (start) start.style.display = 'none';
  if (r) r.classList.remove('show');
  if (q) q.classList.add('show');
  iqSavol();
}

function iqSavol() {
  const qData = IQ_SAVOLLAR[iqHozir];
  const prog  = $('iq-prog');
  const qnum  = $('iq-qnum');
  const qtext = $('iq-qtext');
  const opts  = $('iq-opts');
  if (prog)  prog.style.width = (iqHozir / IQ_SAVOLLAR.length * 100) + '%';
  if (qnum)  qnum.textContent = `${iqHozir + 1} / ${IQ_SAVOLLAR.length} savol`;
  if (qtext) qtext.textContent = qData.s;
  if (!opts) return;
  opts.innerHTML = '';
  qData.t.forEach((o, i) => {
    const btn = document.createElement('button');
    btn.className = 'q-opt';
    btn.innerHTML = `<span class="q-let">${String.fromCharCode(65 + i)}</span><span>${o}</span>`;
    btn.onclick = () => iqTanlash(i, btn);
    opts.appendChild(btn);
  });
}

function iqTanlash(i, btn) {
  haptic('light');
  document.querySelectorAll('#iq-opts .q-opt').forEach(b => b.onclick = null);
  const correct = i === IQ_SAVOLLAR[iqHozir].c;
  btn.classList.add(correct ? 'sel' : 'wrong');
  if (!correct) {
    const allOpts = document.querySelectorAll('#iq-opts .q-opt');
    if (allOpts[IQ_SAVOLLAR[iqHozir].c]) allOpts[IQ_SAVOLLAR[iqHozir].c].classList.add('sel');
  }
  iqJavoblar.push(correct ? 1 : 0);
  setTimeout(() => {
    iqHozir++;
    if (iqHozir < IQ_SAVOLLAR.length) iqSavol();
    else iqNatija();
  }, 650);
}

function iqNatija() {
  const togri = iqJavoblar.reduce((a, b) => a + b, 0);
  const n = IQ_NATIJALAR.find(r => togri >= r.min && togri <= r.max) || IQ_NATIJALAR[2];
  const qWrap = $('iq-questions'), rWrap = $('iq-result');
  if (qWrap) qWrap.classList.remove('show');
  if (rWrap) rWrap.classList.add('show');
  const prog = $('iq-prog');
  if (prog) prog.style.width = '100%';

  const scoreEl = $('iq-score');
  if (scoreEl) {
    let cur = 0;
    const iv = setInterval(() => {
      cur += 3;
      if (cur >= n.ball) { cur = n.ball; clearInterval(iv); }
      scoreEl.textContent = cur;
    }, 18);
  }
  const tagEl  = $('iq-tag');
  const descEl = $('iq-desc');
  const factEl = $('iq-fact');
  if (tagEl)  tagEl.textContent  = n.tag;
  if (descEl) descEl.textContent = n.desc;
  if (factEl) factEl.textContent = IQ_FAKTLAR[Math.floor(Math.random() * IQ_FAKTLAR.length)];
  S.iq = n.ball;
  addXP(15);
  badge('iq1');
  haptic('medium');
  showToast(`🧠 ${n.ball} ball! +15 XP`);
}

/* ══════════════════════════════════════
   BUGUNGI SAVOL
══════════════════════════════════════ */
const SAVOLLAR = [
  { tur: "PSIXOLOGIYA",       s: "Do'stingiz kech soat 11 da 'salom' yozdi. Siz nima qilasiz?",           j: ["Darhol javob beraman", "Ko'raman, ertaga yozaman", "Ko'rmaganman qilaman", "1 soat kutib yozaman"],              f: "Muloqot sifati do'stlik sifatini belgilaydi. Vaqtida javob berish e'tiborning nishoni.",                     xp: 15 },
  { tur: "HAYOT SAVOLI",      s: "Bugun nechta qaroringizni o'zingiz qabul qildingiz?",                    j: ["0-1 ta", "2-3 ta", "4-5 ta", "Sanagan emasman"],                                                                f: "O'rtacha inson kuniga 35,000 ta qaror qabul qiladi. Ko'pchiligi avtomatik va ongsiz.",                       xp: 12 },
  { tur: "O'Z-O'ZINI BILISH", s: "Yangi narsa o'rganmoqchi bo'ldingiz, lekin boshlamadingiz. Sabab?",     j: ["Vaqt yo'q", "Qayerdan boshlashni bilmayman", "Yolg'iz uddalab bo'lmaydi", "Shunchaki qo'ymadim"],               f: "2 daqiqalik qoida: har qanday ishni faqat 2 daqiqa boshlang. Miya to'xtatishga qarshilik qiladi.",          xp: 12 },
  { tur: "IJTIMOIY PSIXOLOGIYA",s:"Guruhda hammaning fikri bir xil. Siz nima qilasiz?",                   j: ["Qo'shilaman", "Rozi bo'lmasam ham indamayman", "O'z fikrimi aytaman", "Kuzataman"],                             f: "Guruh bosimi tufayli odamlar noto'g'ri qarorga qo'shiladi. Mustaqil fikr — eng katta kuch.",                 xp: 18 },
  { tur: "MIYA TESTI",        s: "Stress paytida birinchi nima qilasiz?",                                  j: ["Telefon olaman", "Biror narsani yeyman", "Yolg'iz qolib o'ylayman", "Kimgadir gapiraman"],                     f: "4-7-8 nafas texnikasi: 4 nafas ol, 7 tut, 8 chiqar. Bu miyani 2 daqiqada tinchlantiradi.",                   xp: 15 },
  { tur: "HAYOT FALSAFASI",   s: "'Muvaffaqiyat' deganda birinchi nima esingizga keladi?",                 j: ["Boylik va pul", "Xotirjamlik va tinchlik", "Tan olinish", "Erkinlik"],                                         f: "75,000$ dan yuqori daromad xursandchilikni oshirmaydi. Do'stlar va sog'liq — asosiy omillar.",                xp: 12 },
  { tur: "KUZATUV",           s: "Bugun o'zingizga eng kamida bitta yaxshi gap aytdingizmi?",              j: ["Ha, aytdim", "Yo'q, aytmadim", "Unchalik emas", "Fikr ham qilmadim"],                                         f: "O'z-o'ziga ijobiy munosabat — zarurat. Har kuni 1 ta o'zingizni maqtang — miya buni sevinadi!",               xp: 10 },
  { tur: "ODATLAR",            s: "Ertalab uyg'ongach birinchi nima qilasiz?",             j: ["Telefonni olaman", "Suv ichaman", "Cho'zilaman yoki mashq", "Yana uxlayman"],                                  f: "Ertalabki birinchi 20 daqiqa kun kayfiyatini belgilaydi. Telefonsiz boshlash diqqatni oshiradi.",            xp: 12 },
  { tur: "DIQQAT",             s: "Bir ishga qancha vaqt uzluksiz diqqat qarata olasiz?",   j: ["10 daqiqagacha", "25 daqiqacha", "1 soatcha", "Diqqatim tez bo'linadi"],                                       f: "Pomodoro texnikasi: 25 daqiqa ishlab, 5 daqiqa dam oling. Miya bo'laklarga bo'lingan ishni osonroq qabul qiladi.", xp: 14 },
  { tur: "MUNOSABAT",          s: "Yaqin do'stingiz bilan oxirgi marta qachon gaplashdingiz?", j: ["Bugun", "Shu hafta", "Bu oy", "Ancha bo'ldi"],                                                            f: "Ijtimoiy aloqalar uzoq umr ko'rishning eng kuchli omillaridan biri — ko'pincha sog'liqdan ham muhimroq.",     xp: 12 },
  { tur: "SOG'LIQ",            s: "Bugun necha stakan suv ichdingiz?",                      j: ["0-1 ta", "2-4 ta", "5-7 ta", "8 va undan ko'p"],                                                              f: "Miya 75% suvdan iborat. Yengil suvsizlik ham diqqat va kayfiyatni pasaytiradi.",                              xp: 10 },
  { tur: "O'SISH",             s: "Oxirgi marta qulay zonangizdan qachon chiqdingiz?",      j: ["Bugun", "Yaqinda", "Eslayolmayman", "Chiqishga qo'rqaman"],                                                    f: "Miya yangi tajribalardan o'sadi. Kichik noqulaylik — rivojlanish belgisi.",                                  xp: 16 },
  { tur: "MINNATDORCHILIK",    s: "Bugun nimadan minnatdorsiz?",                            j: ["Sog'lig'imdan", "Yaqinlarimdan", "Kichik bir narsadan", "Hali o'ylamadim"],                                    f: "Har kuni 3 ta minnatdorchilik yozish bir necha hafta ichida baxt darajasini sezilarli oshiradi.",            xp: 12 },
  { tur: "EKRAN VAQTI",        s: "Bugun telefonda taxminan qancha vaqt o'tkazdingiz?",     j: ["1 soatdan kam", "1-3 soat", "3-5 soat", "5 soatdan ko'p"],                                                     f: "O'rtacha odam kuniga ~4 soat ekranga qaraydi. Atigi 1 soat kamaytirish ham xotirjamlikni oshiradi.",         xp: 12 },
  { tur: "MAQSAD",             s: "Hozir hayotingizdagi eng muhim 1 ta maqsad aniqmi?",     j: ["Ha, juda aniq", "Taxminan bor", "Bir nechta, chalkash", "Yo'q"],                                               f: "Aniq va yozilgan maqsad amalga oshish ehtimolini oshiradi — miyaga yo'nalish beradi.",                       xp: 15 },
];

function renderDaily() {
  const idx = new Date().getDate() % SAVOLLAR.length;
  const ch  = SAVOLLAR[idx];
  const bugun    = new Date().toDateString();
  const bajarildi = S.lastDaily === bugun;

  const typeEl  = $('d-type');
  const qEl     = $('d-q');
  const chipEl  = $('d-xp-chip');
  const strVal  = $('streak-val');
  const strNote = $('streak-note');
  if (typeEl) typeEl.textContent = ch.tur;
  if (qEl)    qEl.textContent    = ch.s;
  if (chipEl) chipEl.textContent = `+${ch.xp} ball`;
  if (strVal) strVal.textContent = S.streak;
  if (strNote) strNote.textContent = S.streak >= 3 ? '🔥 Ajoyib ketmoqda!' : 'Har kuni javob bering!';

  const optsEl = $('d-opts');
  if (!optsEl) return;
  optsEl.innerHTML = '';
  ch.j.forEach((o, i) => {
    const btn = document.createElement('button');
    btn.className = 'd-opt' + (bajarildi ? ' sel' : '');
    btn.innerHTML = `<span class="d-num">${i + 1}</span><span>${o}</span>`;
    if (!bajarildi) btn.onclick = () => dailyJavob(btn, ch);
    else btn.disabled = true;
    optsEl.appendChild(btn);
  });

  const factEl   = $('d-fact');
  const factText = $('d-fact-text');
  if (bajarildi) {
    if (factEl)   factEl.classList.add('show');
    if (factText) factText.textContent = ch.f;
  } else {
    if (factEl) factEl.classList.remove('show');
  }
}

function dailyJavob(btn, ch) {
  haptic('medium');
  const bugun = new Date().toDateString();
  document.querySelectorAll('.d-opt').forEach(b => { b.onclick = null; b.disabled = true; });
  btn.classList.add('sel');
  S.lastDaily = bugun;
  S.streak++;
  addXP(ch.xp);
  if (S.streak >= 3) badge('streak3');
  if (S.streak >= 5) badge('daily5');
  const factEl   = $('d-fact');
  const factText = $('d-fact-text');
  const strVal   = $('streak-val');
  const strNote  = $('streak-note');
  if (factEl)   factEl.classList.add('show');
  if (factText) factText.textContent = ch.f;
  if (strVal)   strVal.textContent   = S.streak;
  if (strNote)  strNote.textContent  = S.streak >= 3 ? '🔥 Ajoyib ketmoqda!' : 'Ertaga ham qaytib keling!';
  showToast(`+${ch.xp} ball qozonildi! 🎉`);
  save();
}

/* ══════════════════════════════════════
   PROFIL
══════════════════════════════════════ */
const BADGE_LIST = [
  { id: 'roast1',  nom: '😂 Birinchi tahlil'  },
  { id: 'iq1',     nom: '🧠 IQ test qilindi'  },
  { id: 'streak3', nom: '⚡ 3 kun ketma-ket'   },
  { id: 'xp100',   nom: '💎 100 ball'          },
  { id: 'secret',  nom: '🔮 Yashirin kod'      },
  { id: 'level3',  nom: '🚀 3-Daraja'          },
  { id: 'gamer',   nom: "🎮 O'yinchi"          },
  { id: 'daily5',  nom: '📅 5 kun ketma-ket'   },
  { id: 'hayoyo5', nom: '🧪 Ha/Yo\'q ustasi'   },
  { id: 'reflex_master', nom: '⚡ Reflex ustasi' },
];

const DARAJALAR = ['', 'Yangi boshlovchi', 'Qiziquvchan', 'Fikrlovchi', 'Tajribali', 'Ustoz', 'MIYA PRIME'];

function renderProfile() {
  const need = xpNeeded(S.level);
  const pct  = Math.min(100, Math.round(S.xp / need * 100));
  const nameEl  = $('p-name');
  const titleEl = $('p-title');
  const xpEl    = $('p-xp');
  const xpmEl   = $('p-xpmax');
  const barEl   = $('p-bar');
  const roastEl = $('s-roast');
  const iqEl    = $('s-iq');
  const strEl   = $('s-streak');
  if (nameEl)  nameEl.textContent  = S.name;
  if (titleEl) titleEl.textContent = `${S.level}-Daraja • ${DARAJALAR[Math.min(S.level, 6)]}`;
  if (xpEl)    xpEl.textContent    = S.xp;
  if (xpmEl)   xpmEl.textContent   = need;
  if (barEl)   barEl.style.width   = pct + '%';
  if (roastEl) roastEl.textContent = S.roasts;
  if (iqEl)    iqEl.textContent    = S.iq || '—';
  if (strEl)   strEl.textContent   = S.streak;

  const bWrap = $('badges-wrap');
  if (bWrap) {
    bWrap.innerHTML = '';
    BADGE_LIST.forEach(b => {
      const d = document.createElement('div');
      d.className = 'badge-pill' + (S.badges.includes(b.id) ? ' got' : '');
      d.textContent = b.nom;
      bWrap.appendChild(d);
    });
  }
}

function badge(id) {
  if (S.badges.includes(id)) return;
  S.badges.push(id);
  const b = BADGE_LIST.find(x => x.id === id);
  if (b) showToast(`🏅 Yangi sovrin: ${b.nom}`);
  save();
}

function checkBadges() {
  if (xpTotal() >= 100) badge('xp100');
  if (S.level >= 3) badge('level3');
}

function secretKod() {
  const inp = $('secret-inp');
  if (!inp) return;
  const v = inp.value.trim().toUpperCase();
  const KODLAR = { 'MIYA2025': 'secret', 'GLITCH': 'secret', 'NPC404': 'secret', 'CHAOS': 'secret' };
  if (KODLAR[v]) {
    badge(KODLAR[v]);
    addXP(25);
    showToast('✅ Kod qabul qilindi! +25 XP');
    inp.value = '';
    haptic('medium');
  } else {
    showToast("❌ Noto'g'ri kod");
    haptic('light');
  }
}

/* ══════════════════════════════════════
   O'YINLAR — Modal boshqaruv
══════════════════════════════════════ */
function openGame(nom) {
  const m = $(`modal-${nom}`);
  if (!m) return;
  haptic('light');
  m.classList.add('open');
  if (nom === 'reflex')   reflexReset();
  if (nom === 'memory')   xotiraReset();
  if (nom === 'roulette') ruletkaReset();
  if (nom === 'math')     hisobReset();
  if (nom === 'npc')      npcReset();
  if (nom === 'hayoyo')   hayoyoReset();
  if (nom === 'stroop')   stroopReset();
  if (nom === 'find')     findReset();
  if (nom === 'tap')      tapReset();
  if (nom === 'target')   targetReset();
}

function closeGame(nom) {
  const m = $(`modal-${nom}`);
  if (m) m.classList.remove('open');
  // Ishlab turgan o'yin taymerlarini to'xtatamiz (XP/toast modal yopiq holda chiqmasin)
  if (nom === 'stroop') stroopStop();
  if (nom === 'find')   findStop();
  if (nom === 'tap')    tapStop();
  if (nom === 'target') targetStop();
}

/* ── 1. REFLEX O'YINI ── */
let rxHolat = 'idle', rxTimer = null, rxStart = 0;

// Survival rejim: har raund target vaqt qisqaradi, ulgurmasang tugaydi
let rxRaund = 0, rxTarget = 0, rxYutgan = [];

function reflexReset() {
  rxHolat = 'idle';
  clearTimeout(rxTimer);
  rxRaund = 0; rxYutgan = [];
  const circle  = $('reflex-circle');
  const resEl   = $('reflex-res');
  const btn     = $('reflex-btn');
  const subEl   = $('reflex-sub');
  if (circle) { circle.className = 'reflex-circle'; circle.textContent = "Tayyor bo'ling"; circle.onclick = null; }
  if (resEl)  resEl.style.display = 'none';
  if (btn)    { btn.style.display = 'block'; btn.textContent = '⚡ Boshlash'; }
  if (subEl)  subEl.textContent = "Har raund tezroq bo'ling! Ulgurmasangiz — tugaysiz.";
}

function reflexBoshlash() {
  clearTimeout(rxTimer);
  rxRaund++;
  // Target vaqt: 1-raund 600ms, har raundda 40ms qisqaradi (min 220ms)
  rxTarget = Math.max(220, 600 - (rxRaund - 1) * 40);
  const circle = $('reflex-circle'), btn = $('reflex-btn'), resEl = $('reflex-res'), subEl = $('reflex-sub');
  if (!circle) return;
  if (btn)   btn.style.display   = 'none';
  if (resEl) resEl.style.display = 'none';
  if (subEl) subEl.textContent = `Raund ${rxRaund} • Nishon: ${rxTarget}ms dan tez`;
  rxHolat = 'wait';
  circle.className   = 'reflex-circle wait';
  circle.textContent = 'Kutib turing...';

  circle.onclick = () => {
    if (rxHolat === 'wait') {
      clearTimeout(rxTimer);
      haptic('light');
      reflexTugadi(`Juda erta bosding! 😅`, true);
    }
  };

  rxTimer = setTimeout(() => {
    if (rxHolat !== 'wait') return;
    rxHolat = 'go';
    haptic('medium');
    circle.className   = 'reflex-circle go';
    circle.textContent = 'BOS! 🟢';
    rxStart = Date.now();
    circle.onclick = reflexBos;
  }, 1200 + Math.random() * 3000);
}

function reflexBos() {
  const ms = Date.now() - rxStart;
  rxHolat  = 'done';
  const circle = $('reflex-circle');
  if (circle) { circle.onclick = null; }

  if (ms <= rxTarget) {
    // Yutdi — keyingi raund
    rxYutgan.push(ms);
    haptic('medium');
    if (circle) { circle.className = 'reflex-circle go'; circle.textContent = `${ms}ms ✓`; }
    showToast(`✓ Raund ${rxRaund} o'tdi! ${ms}ms`);
    const btn = $('reflex-btn');
    if (btn) { btn.style.display = 'block'; btn.textContent = `▶ Raund ${rxRaund + 1}`; }
  } else {
    // Sekin — o'yin tugadi
    haptic('light');
    reflexTugadi(`Sekin bosding: ${ms}ms (nishon: ${rxTarget}ms)`, false);
  }
}

function reflexTugadi(sabab, erta) {
  rxHolat = 'gameover';
  clearTimeout(rxTimer);
  const circle = $('reflex-circle'), msEl = $('reflex-ms'), verdEl = $('reflex-verdict');
  const resEl = $('reflex-res'), btn = $('reflex-btn'), subEl = $('reflex-sub');
  const raundlar = rxYutgan.length;
  const ortacha = raundlar ? Math.round(rxYutgan.reduce((a,b)=>a+b,0) / raundlar) : 0;
  if (circle) { circle.className = 'reflex-circle'; circle.onclick = null; circle.textContent = `${raundlar} raund`; }
  if (msEl)   msEl.textContent   = `${raundlar} raund`;
  if (verdEl) verdEl.textContent = raundlar >= 8 ? '🏆 Afsona!' : raundlar >= 6 ? '⚡ Ajoyib reflex!' : raundlar >= 4 ? '🔥 Yaxshi!' : raundlar >= 2 ? '👍 Yomon emas' : '🐢 Mashq qiling!';
  if (subEl)  subEl.textContent  = sabab + (ortacha ? ` • o'rtacha ${ortacha}ms` : '');
  if (resEl)  resEl.style.display = 'block';
  if (btn)    { btn.style.display = 'block'; btn.textContent = '↩ Qaytadan'; }
  const xp = raundlar * 2;
  S.games++; addXP(xp); badge('gamer');
  if (raundlar >= 8) badge('reflex_master');
  showToast(`⚡ ${raundlar} raund! +${xp} XP`);
  // Keyingi "Boshlash" reset qilsin
  rxRaund = 0; rxYutgan = [];
}

/* ── 2. XOTIRA O'YINI ── */
let xD = 1, xSeq = [], xUser = [], xPhase = 'idle';

function xotiraReset() {
  xD = 1; xSeq = []; xUser = []; xPhase = 'idle';
  const lvlEl = $('mem-lvl'), subEl = $('mem-sub'), btn = $('mem-btn');
  if (lvlEl) lvlEl.textContent = '1-Daraja';
  if (subEl) subEl.textContent = 'Yongan katakchalarni eslab qoling';
  if (btn)   { btn.style.display = 'block'; btn.textContent = '🧩 Boshlash'; }
  buildMemGrid();
}

function buildMemGrid() {
  const el = $('mem-grid');
  if (!el) return;
  // Daraja 5+ dan 4x4 (16 katak), 1-4 daraja 3x3 (9 katak)
  const size = xD >= 5 ? 4 : 3;
  const total = size * size;
  el.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
  el.innerHTML = '';
  for (let i = 0; i < total; i++) {
    const d = document.createElement('div');
    d.className   = 'mem-cell';
    d.dataset.idx = i;
    d.onclick     = () => { if (xPhase === 'input') xotiraBos(i); };
    el.appendChild(d);
  }
}

async function xotiraBoshlash() {
  const btn = $('mem-btn');
  if (btn) btn.style.display = 'none';
  xSeq = []; xUser = [];
  const gridSize = xD >= 5 ? 16 : 9;
  const seqLen = Math.min(xD + 2, xD >= 5 ? 10 : 7);
  for (let i = 0; i < seqLen; i++) xSeq.push(Math.floor(Math.random() * gridSize));
  xPhase = 'show';
  const subEl = $('mem-sub');
  if (subEl) subEl.textContent = 'Eslab qoling...';
  buildMemGrid();
  const cells = document.querySelectorAll('#mem-grid .mem-cell');

  for (const idx of xSeq) {
    await sleep(380);
    if (cells[idx]) cells[idx].classList.add('lit');
    await sleep(480);
    if (cells[idx]) cells[idx].classList.remove('lit');
  }
  await sleep(350);
  xPhase = 'input';
  if (subEl) subEl.textContent = 'Endi bosing!';
}

async function xotiraBos(i) {
  const cells = document.querySelectorAll('#mem-grid .mem-cell');
  xUser.push(i);
  const step = xUser.length - 1;
  haptic('light');

  if (i === xSeq[step]) {
    if (cells[i]) cells[i].classList.add('sel');
    if (xUser.length === xSeq.length) {
      await sleep(400);
      xD++;
      haptic('medium');
      const lvlEl = $('mem-lvl'), subEl = $('mem-sub'), btn = $('mem-btn');
      if (lvlEl) lvlEl.textContent = `${xD}-Daraja`;
      if (subEl) subEl.textContent = `✓ To'g'ri! ${xD}-darajaga o'tdingiz`;
      S.games++; addXP(xD * 2); badge('gamer');
      showToast(`🧩 Daraja ${xD}! +${xD * 2} XP`);
      buildMemGrid();
      setTimeout(xotiraBoshlash, 900);
    }
  } else {
    if (cells[i]) cells[i].classList.add('bad');
    xPhase = 'idle';
    haptic('light');
    const subEl = $('mem-sub'), btn = $('mem-btn');
    if (subEl) subEl.textContent = `Noto'g'ri! ${xD - 1}-daraja yetdingiz`;
    if (btn)   { btn.style.display = 'block'; btn.textContent = '↩ Qaytadan'; }
    S.games++; addXP(xD > 2 ? 6 : 3); badge('gamer');
    showToast(`🧩 ${xD - 1}-daraja yetdingiz!`);
    xD = 1;
    const lvlEl = $('mem-lvl');
    if (lvlEl) lvlEl.textContent = '1-Daraja';
  }
}

/* ── 3. RULETKA ── */
const RULETKA = [
  { em: '💧', n: 'Suv iching!',         t: "Hozir 2 stakan suv iching. Miya 75% suvdan iborat." },
  { em: '🚶', n: 'Yurib keling!',        t: "5 daqiqa yuring — xona ichida bo'lsa ham. Miya qon kerak." },
  { em: '😮‍💨', n: 'Nafas turing!',      t: "4 nafas ol, 7 soniya tut, 8 soniya chiqar. 3 marta. Miyangiz tinchlaydi." },
  { em: '✍️', n: 'Yozing!',              t: "Hozir 3 yaxshi narsa yozing: bugun nima yaxshi bo'ldi?" },
  { em: '🤝', n: 'Aloqa qiling!',        t: "Uzoq vaqt gaplashmagan birovga bugun 'salom' yozing." },
  { em: '🎯', n: '1 ishni bajaring!',    t: "Bugun faqat 1 ta muhim ishni bajaring. Faqat 1 ta — shu yetarli." },
  { em: '📵', n: 'Telefon dam olsin!',   t: "Keyingi 1 soat telefonni qo'ying. Qo'lingizni band qiling." },
  { em: '🌟', n: 'Omad siz bilan!',      t: "Bugun siz OMADLI FOYDALANUVCHI siz! +8 bonus XP berildi!", bonus: 8 },
  { em: '😂', n: 'Kuldiruvchi topshiriq!', t: "Yaqin do'stingizga bugun biror kulgili narsa yuboring!" },
  { em: '🌈', n: "O'zingizni maqtang!",  t: "Bugun o'z-o'zingizga: 'Men bugun yaxshi ish qildim' deng." },
];

let rlAylandi = false;

function ruletkaReset() {
  rlAylandi = false;
  const wheel = $('roulette-wheel'), res = $('roulette-res'), btn = $('roulette-btn');
  if (wheel) wheel.style.transform = 'rotate(0deg)';
  if (res)   res.classList.remove('show');
  if (btn)   btn.textContent = '🎰 Aylantirish';
}

function ruletkaAylan() {
  if (rlAylandi) return;
  rlAylandi = true;
  haptic('medium');
  const wheel = $('roulette-wheel');
  if (wheel) {
    const deg = 1080 + Math.floor(Math.random() * 360);
    wheel.style.transform = `rotate(${deg}deg)`;
  }
  setTimeout(() => {
    const r = RULETKA[Math.floor(Math.random() * RULETKA.length)];
    const em = $('rr-em'), title = $('rr-title'), text = $('rr-text'), res = $('roulette-res'), btn = $('roulette-btn');
    if (em)    em.textContent    = r.em;
    if (title) title.textContent = r.n;
    if (text)  text.textContent  = r.t;
    if (res)   res.classList.add('show');
    const xp = r.bonus || 5;
    addXP(xp); badge('gamer'); S.games++;
    haptic('medium');
    showToast(`🎰 ${r.n} +${xp} XP`);
    if (btn) btn.textContent = '↩ Qaytadan';
    setTimeout(() => { rlAylandi = false; }, 500);
  }, 3100);
}

/* ── 4. TEZ HISOB ── */
let hSavollar = [], hHozir = 0, hTogri = 0, hTimer = null;

function hisobReset() {
  clearInterval(hTimer);
  const titleEl  = $('math-title');
  const subEl    = $('math-sub');
  const exprEl   = $('math-expr');
  const timerEl  = $('math-timer');
  const optsEl   = $('math-opts');
  const resEl    = $('math-result');
  const btn      = $('math-btn');
  if (titleEl) titleEl.textContent = '🔢 Tez hisob';
  if (subEl)   subEl.textContent   = '10 ta misol • 3 soniya har biriga';
  if (exprEl)  exprEl.textContent  = '?';
  if (timerEl) timerEl.style.width = '100%';
  if (optsEl)  optsEl.innerHTML    = '';
  if (resEl)   resEl.style.display = 'none';
  if (btn)     { btn.style.display = 'block'; btn.textContent = '🔢 Boshlash'; }
}

function hisobYarat(qadim) {
  // Savol raqamiga qarab qiyinlik oshadi
  const daraja = Math.floor(qadim / 3); // 0-2: oson, 3-5: o'rta, 6-7: qiyin, 8-9: juda qiyin
  let a, b, j, ifoda;

  if (daraja <= 1) {
    // Oson: oddiy qo'shish/ayirish
    const ops = ['+', '-'];
    const op = ops[rnd(0,1)];
    a = rnd(1, 20); b = rnd(1, 20);
    if (op === '-' && b > a) [a, b] = [b, a];
    j = op === '+' ? a + b : a - b;
    ifoda = `${a} ${op} ${b}`;
  } else if (daraja <= 3) {
    // O'rta: ko'paytirish
    const ops = ['+', '-', '×'];
    const op = ops[rnd(0,2)];
    if (op === '×') { a = rnd(2, 12); b = rnd(2, 12); j = a * b; }
    else if (op === '+') { a = rnd(10, 50); b = rnd(10, 50); j = a + b; }
    else { a = rnd(20, 60); b = rnd(1, 20); j = a - b; }
    ifoda = `${a} ${op} ${b}`;
  } else if (daraja <= 5) {
    // Qiyin: aralashtirish
    a = rnd(2, 15); b = rnd(2, 10); const c = rnd(1, 5);
    j = a * b + c;
    ifoda = `${a}×${b}+${c}`;
  } else {
    // Juda qiyin: ikki amal
    a = rnd(10, 30); b = rnd(2, 9); const d = rnd(5, 20);
    const op = rnd(0,1) ? '+' : '-';
    j = op === '+' ? a * b + d : a * b - d;
    ifoda = `${a}×${b}${op === '+' ? '+' : '−'}${d}`;
  }

  const noto = new Set();
  const spread = daraja <= 2 ? 5 : daraja <= 4 ? 10 : 20;
  while (noto.size < 3) {
    const w = j + (Math.random() > 0.5 ? 1 : -1) * rnd(1, spread);
    if (w !== j && w > 0) noto.add(w);
  }
  return { ifoda: `${ifoda} = ?`, javob: j, tanlov: [...noto, j].sort(() => Math.random() - 0.5) };
}

function hisobBoshlash() {
  clearInterval(hTimer);
  const btn = $('math-btn'), resEl = $('math-result');
  if (btn)   btn.style.display   = 'none';
  if (resEl) resEl.style.display = 'none';
  hSavollar = Array.from({ length: 10 }, (_, i) => hisobYarat(i));
  hHozir = 0; hTogri = 0;
  hisobKorsat();
}

function hisobKorsat() {
  if (hHozir >= hSavollar.length) { hisobTugat(); return; }
  const q = hSavollar[hHozir];
  const subEl  = $('math-sub');
  const exprEl = $('math-expr');
  const optsEl = $('math-opts');
  if (subEl)  subEl.textContent  = `${hHozir + 1} / ${hSavollar.length}`;
  if (exprEl) exprEl.textContent = q.ifoda;
  if (optsEl) {
    optsEl.innerHTML = '';
    q.tanlov.forEach(o => {
      const btn = document.createElement('button');
      btn.className  = 'math-opt';
      btn.textContent = o;
      btn.onclick    = () => hisobTanla(o === q.javob, btn);
      optsEl.appendChild(btn);
    });
  }
  clearInterval(hTimer);
  let t = 30;
  const timerEl = $('math-timer');
  if (timerEl) timerEl.style.width = '100%';
  hTimer = setInterval(() => {
    t--;
    if (timerEl) timerEl.style.width = (t / 30 * 100) + '%';
    if (t <= 0) { clearInterval(hTimer); hisobTanla(false, null); }
  }, 100);
}

function hisobTanla(togri, btn) {
  clearInterval(hTimer);
  haptic('light');
  document.querySelectorAll('#math-opts .math-opt').forEach(b => b.onclick = null);
  if (btn) btn.classList.add(togri ? 'correct' : 'wrong');
  if (togri) hTogri++;
  hHozir++;
  setTimeout(hisobKorsat, 420);
}

function hisobTugat() {
  clearInterval(hTimer);
  const optsEl   = $('math-opts');
  const exprEl   = $('math-expr');
  const timerEl  = $('math-timer');
  const resEl    = $('math-result');
  const scoreEl  = $('math-score');
  const verdEl   = $('math-verdict');
  const titleEl  = $('math-title');
  if (optsEl)  optsEl.innerHTML     = '';
  if (exprEl)  exprEl.textContent   = '';
  if (timerEl) timerEl.style.width  = '0%';
  if (resEl)   resEl.style.display  = 'block';
  if (scoreEl) scoreEl.textContent  = hTogri;
  if (verdEl)  verdEl.textContent   = hTogri >= 9 ? '🏆 Dahshat!' : hTogri >= 7 ? "🔥 Zo'r!" : hTogri >= 5 ? '👍 Yaxshi urinish' : '💪 Mashq qiling!';
  if (titleEl) titleEl.textContent  = `${hTogri}/10 to'g'ri`;
  haptic('medium');
  S.games++; addXP(hTogri * 2); badge('gamer');
  showToast(`🔢 ${hTogri}/10 to'g'ri! +${hTogri * 2} XP`);
}

/* ── 5. NPC TESTI ── */
const NPC_SAVOLLAR = [
  { s: "Tushlikda nima yeyishingizni kim hal qiladi?",                    j: ["Doim o'zim", "Ko'proq nima bo'lsa — o'sha", "Do'stlardan so'rayman", "Kecha nima yesam — shu"] },
  { s: "Yangi kino chiqdi. Siz nima qilasiz?",                           j: ["O'zim qarab ko'raman", "Rating ko'raman, yaxshi bo'lsa ko'raman", "Do'stlar ko'rsa — ko'raman", "Vaqt yo'q deb qo'yman"] },
  { s: "Sizga yoqmagan narsani kimdir iltimos qildi. Siz:",              j: ["Muloyimlik bilan 'yo'q' deyaman", "Ha deyaman, lekin ichim g'ashlanadi", "Bahona qilaman", "Doim rozi bo'laman"] },
  { s: "Biror narsaga o'z fikringiz bor, lekin hamma boshqacha deyapti:", j: ["O'z fikrimi aytaman", "Shubhalanib qolaman", "Jim qolaman", "Hammalarga qo'shilaman"] },
  { s: "Sevimli musiqangiz qanday?",                                      j: ["Aniq bir uslubim bor", "Kayfiyatga qarab turlicha", "Nima trend bo'lsa — o'sha", "Hali aniqlamadim"] },
];

const NPC_NATIJALAR = [
  { em: '🤖', t: '100% NPC',      d: "Siz ko'p narsada boshqalarga qarab harakat qilasiz. O'z ovozingizga ko'proq quloq soling!" },
  { em: '👤', t: 'Qisman NPC',    d: "Ba'zan o'zingiz, ba'zan boshqalar ta'sirida. Ko'pchilik shunday. Muhimi — buni bilish." },
  { em: '✨', t: 'Haqiqiy odam!', d: "Siz o'z fikri va pozitsiyasi bor odamsiz. NPC belgilari topilmadi. Davom eting!" },
  { em: '🧬', t: 'Noyob odam',   d: "Siz sistemaga to'g'ri kelmaysiz. Bu juda yaxshi — aksariyat ajoyib odamlar shunday bo'lgan." },
];

let npcJavoblar = [], npcHozir = 0;

function npcReset() {
  npcJavoblar = []; npcHozir = 0;
  const intro = $('npc-intro'), qWrap = $('npc-q-wrap'), res = $('npc-result'), btn = $('npc-btn'), em = $('npc-em');
  if (intro) intro.style.display  = 'block';
  if (qWrap) qWrap.style.display  = 'none';
  if (res)   res.style.display    = 'none';
  if (em)    em.textContent       = '🤖';
  if (btn)   { btn.style.display  = 'block'; btn.textContent = '🤖 Tekshirish'; }
}

function npcBoshlash() {
  const intro = $('npc-intro'), qWrap = $('npc-q-wrap'), btn = $('npc-btn');
  if (intro) intro.style.display = 'none';
  if (btn)   btn.style.display   = 'none';
  if (qWrap) qWrap.style.display = 'block';
  npcSavol();
}

function npcSavol() {
  const q    = NPC_SAVOLLAR[npcHozir];
  const num  = $('npc-num'), qText = $('npc-q'), opts = $('npc-opts');
  if (num)   num.textContent   = `${npcHozir + 1}/${NPC_SAVOLLAR.length} savol`;
  if (qText) qText.textContent = q.s;
  if (!opts) return;
  opts.innerHTML = '';
  q.j.forEach((o, i) => {
    const btn = document.createElement('button');
    btn.className = 'q-opt';
    btn.innerHTML = `<span class="q-let">${String.fromCharCode(65 + i)}</span><span>${o}</span>`;
    btn.onclick   = () => {
      npcJavoblar.push(i);
      btn.classList.add('sel');
      haptic('light');
      document.querySelectorAll('#npc-opts .q-opt').forEach(b => b.onclick = null);
      setTimeout(() => { npcHozir++; npcHozir < NPC_SAVOLLAR.length ? npcSavol() : npcNatija(); }, 550);
    };
    opts.appendChild(btn);
  });
}

function npcNatija() {
  const qWrap = $('npc-q-wrap'), res = $('npc-result'), btn = $('npc-btn');
  if (qWrap) qWrap.style.display = 'none';
  if (res)   res.style.display   = 'block';
  const score = npcJavoblar.reduce((a, v) => a + v, 0);
  const pct   = score / (NPC_SAVOLLAR.length * 3);
  const n     = pct < 0.25 ? NPC_NATIJALAR[2] : pct < 0.5 ? NPC_NATIJALAR[3] : pct < 0.75 ? NPC_NATIJALAR[1] : NPC_NATIJALAR[0];
  const emEl  = $('npc-res-em'), titleEl = $('npc-res-title'), descEl = $('npc-res-desc');
  if (emEl)    emEl.textContent    = n.em;
  if (titleEl) titleEl.textContent = n.t;
  if (descEl)  descEl.textContent  = n.d;
  if (btn)     { btn.style.display = 'block'; btn.textContent = '↩ Qaytadan'; }
  haptic('medium');
  S.games++; addXP(10); badge('gamer');
  showToast(`🤖 ${n.t}! +10 XP`);
}

/* ── 6. HA YOKI YO'Q (True/False) ── */
const HAYOYO_FAKTLAR = [
  // Ilm va miya
  { f: "Inson miyasi faqat 10% ishlaydi",                                       j: false, izoh: "Bu mif! Miya deyarli 100% ishlaydi — turli qismlari navbatlashib faol bo'ladi." },
  { f: "Uyqu paytida miya tozalanadi",                                           j: true,  izoh: "To'g'ri! 'Glimfatik tizim' orqali zaharli moddalar chiqariladi. Shuning uchun yetarli uyqusiz miya eslab qola olmaydi." },
  { f: "Kulish uchun 43 ta muskul kerak, jilmayish uchun 17 ta",                j: false, izoh: "Noto'g'ri! Aksincha — jilmayish uchun kam muskul kerak. Ba'zi tadqiqotlar bu sonlarni turlicha keltiradi." },
  { f: "Inson ko'zi 10 million rang farqlay oladi",                              j: true,  izoh: "To'g'ri! Ko'z 10 million nuansni (tusni) ajratadi — bu har qanday kameradan ko'proq." },
  { f: "Prokrastinatsiya — bu dangasalik",                                       j: false, izoh: "Noto'g'ri! Bu hissiy tartibsizlik — miya noqulay vazifadan qochadi. Dangasalik emas." },
  { f: "Miya og'riqni his qilmaydi",                                             j: true,  izoh: "To'g'ri! Miyada og'riq retseptorlari yo'q. Bosh og'rig'i miyani o'rab turgan to'qimalardan keladi." },
  { f: "O'rtacha inson kuniga 70,000 ta fikr o'ylaydi",                         j: true,  izoh: "To'g'ri! Va ularning 80% salbiy, 95% i kecha ham bo'lgan fikrlar." },
  { f: "Musiqa o'rganish bolalar IQ sini oshiradi",                              j: true,  izoh: "To'g'ri! Miya ikkala yarim sharini birlashtiruvchi corpus callosum kuchayadi." },
  { f: "Katta odamlar ham yangi neyronlar o'stirishi mumkin",                    j: true,  izoh: "To'g'ri! Bu 'neyrogenez' deyiladi. Sport, o'rganish va uyqu uni tezlashtiradi." },
  { f: "Birinchi taassurot 7 soniyada shakllanadi",                              j: true,  izoh: "To'g'ri! Miya 7 soniyada odamni baholaydi. Iltifot va ko'z aloqasi hal qiluvchi." },
  // Tabiat va fizika
  { f: "Sof suv har doim 0°C da muzlaydi",                                      j: false, izoh: "Noto'g'ri! Sof suv -48°C gacha suyuq qolishi mumkin — bu 'superkooling' hodisasi." },
  { f: "Chaqmoq hech qachon bir joyga ikki marta tushmaydi",                    j: false, izoh: "Noto'g'ri! Chaqmoq ko'pincha bir joyga qayta-qayta tushadi — baland binolar va minoralarga har yili necha marta uradi." },
  { f: "Quyosh nurining Yerga yetishi uchun 8 daqiqa kerak",                    j: true,  izoh: "To'g'ri! Yorug'lik sekundiga 300,000 km — Quyoshdan Yerga 8 daqiqa 20 soniya ketadi." },
  { f: "Suv issiqligi o'tkazmaydi",                                              j: false, izoh: "Noto'g'ri! Suv issiqlikni yaxshi o'tkazadi — shuning uchun sovuq suvda tez muzlaysiz." },
  { f: "Yer quyosh atrofida aylanganda tezligi o'zgarmaydi",                    j: false, izoh: "Noto'g'ri! Yer quyoshga yaqin bo'lgan paytda (yanvar) tezroq aylanadi — Kepler qonuni." },
  // Psixologiya
  { f: "Inson bir vaqtda ikkita ishni baravar bajara oladi",                     j: false, izoh: "Noto'g'ri! Miya bir vaqtda bitta ishni bajaradi — multitasking aslida tez almashinuvdir." },
  { f: "Xotira surat kabi aniq saqlanadi",                                       j: false, izoh: "Noto'g'ri! Xotira har eslaganda qayta quriladi va o'zgarishi mumkin — u videokamera emas." },
  { f: "Yolg'onchi ko'zlarini chapga qaratadi",                                  j: false, izoh: "Noto'g'ri! Bu mif. Ko'z harakati yolg'onni aniqlamaydi — tadqiqotlar buni isbotlagan." },
  { f: "Ijobiy fikrlash salomatlikka ta'sir qiladi",                             j: true,  izoh: "To'g'ri! Optimistlar yurak xastaligi riskini 35% kamaytiradi va uzoqroq yashaydi." },
  { f: "Inson uyqusiz ko'pi bilan 3 kun yashay oladi",                                       j: false, izoh: "Noto'g'ri! Rekord — 11 kun uyqusiz turish. Lekin 3-4 kundayoq gallyutsinatsiyalar boshlanadi." },
  // Qiziq faktlar
  { f: "Inson terisining tashqi qatlami umr davomida ~1000 marta yangilanadi",                   j: true,  izoh: "To'g'ri! Tashqi teri qatlami har 2-4 haftada yangilanadi — bu umr davomida ~1000 martaga to'g'ri keladi." },
  { f: "Baliqlar hech qachon uxlamaydi",                                         j: false, izoh: "Noto'g'ri! Baliqlar uxlaydi — lekin ko'zlari yumilmaydi. Ko'pchiligi juda sekin suzib dam oladi." },
  { f: "O'rgimchak hasharot hisoblanadi",                                        j: false, izoh: "Noto'g'ri! O'rgimchak — araknid (8 oyoqli). Hasharotlar 6 oyoqli." },
  { f: "Inson tishi umr davomida faqat 2 marta o'sadi (sut va doimiy)",       j: true,  izoh: "To'g'ri! Shuning uchun doimiy tishlarni asrash juda muhim — uchinchi martasi yo'q." },
  { f: "Yiqilish tushida odamlar hech qachon yerga tegmaydi",                    j: false, izoh: "Noto'g'ri! Ko'p odamlar tushda yerga tegib, uyg'onib ketishlarini aytishadi." },
  // O'zbekiston va madaniyat
  { f: "Samarqand O'zbekistonning poytaxti bo'lgan",                            j: true,  izoh: "To'g'ri! Amir Temur davrida va keyinchalik Samarqand poytaxt bo'lgan." },
  { f: "O'zbekiston Markaziy Osiyoning eng ko'p aholili davlati",               j: true,  izoh: "To'g'ri! 37+ million aholi bilan O'zbekiston Markaziy Osiyoning eng aholi ko'p davlati." },
  { f: "Registon maydoni 3 ta madrasadan iborat",                               j: true,  izoh: "To'g'ri! Ulug'bek, Sherdor va Tillakori madrasalari — Ulug'bek madrasasi 15-asrda, qolgan ikkitasi 17-asrda qurilgan." },
  // Qo'shimcha faktlar — yangi savollar
  { f: "Asal hech qachon buzilmaydi",                                            j: true,  izoh: "To'g'ri! Past namlik va tabiiy kislotalik tufayli asal yillab saqlanadi — Misr piramidalaridan topilgani hali yeyishga yaroqli bo'lgan." },
  { f: "Sakkizoyoqning uchta yuragi bor",                                        j: true,  izoh: "To'g'ri! Ikkitasi jabralarga, bittasi esa butun tanaga qon haydaydi." },
  { f: "Banan botanika nuqtai nazaridan reza meva (yagoda) hisoblanadi",         j: true,  izoh: "To'g'ri! Botanikada banan — reza meva, qulupnay esa emas." },
  { f: "Yashin kanali Quyosh yuzasidan ham issiqroq",                            j: true,  izoh: "To'g'ri! Yashin ~30 000°C gacha qiziydi, Quyosh yuzasi esa atigi ~5500°C." },
  { f: "Ko'rshapalak — ucha oladigan yagona sutemizuvchi",                       j: true,  izoh: "To'g'ri! Boshqa 'uchar' hayvonlar (masalan, uchar sincap) faqat sirpanadi, haqiqatda uchmaydi." },
  { f: "Tuyaning o'rkachida suv saqlanadi",                                      j: false, izoh: "Noto'g'ri! O'rkachda yog' saqlanadi — u energiya zaxirasi vazifasini bajaradi." },
  { f: "Kosmik bo'shliqda ovoz tarqalmaydi",                                     j: true,  izoh: "To'g'ri! Ovozga muhit (havo) kerak. Kosmos deyarli bo'shliq, shuning uchun u yerda sukunat hukmron." },
  { f: "Qizil rang buqani g'azablantiradi",                                      j: false, izoh: "Noto'g'ri! Buqalar ranglarni yaxshi ajratmaydi — ularni matoning harakati qo'zg'atadi." },
  { f: "Buyuk Xitoy devori kosmosdan oddiy ko'z bilan ko'rinadi",                j: false, izoh: "Noto'g'ri! Devor juda tor — kosmosdan oddiy ko'z bilan ko'rinmaydi. Bu mashhur mif." },
  { f: "Akulaning suyagi yo'q, skeleti tog'aydan iborat",                        j: true,  izoh: "To'g'ri! Tog'ay skelet akulani yengil va tezkor qiladi." },
  { f: "Ba'zi chumolilar o'z vaznidan o'nlab marta og'ir yukni ko'tara oladi",   j: true,  izoh: "To'g'ri! Ayrim turlari o'z vaznidan 50 baravargacha og'ir yukni ko'tarishi mumkin." },
  { f: "Yer yuzasining yarmidan ko'pi suv bilan qoplangan",                      j: true,  izoh: "To'g'ri! Yer yuzasining qariyb 71% i suv bilan qoplangan." },
  { f: "Oydagi tortishish kuchi Yerdagidan kuchliroq",                           j: false, izoh: "Noto'g'ri! Oyda tortishish ~6 baravar kuchsizroq — shuning uchun u yerda yengil sakraysiz." },
  { f: "Asalni ishchi arilar tayyorlaydi, ona ari emas",                         j: true,  izoh: "To'g'ri! Ona ari faqat tuxum qo'yadi; asalni ishchi arilar ishlab chiqaradi." },
  { f: "Inson yuragi bir kunda taxminan 100 000 marta uradi",                    j: true,  izoh: "To'g'ri! O'rtacha yurak daqiqasiga ~70 marta, kuniga ~100 000 marta uradi." },
  { f: "Barmoq izlari noyob — hatto egizaklarda ham har xil bo'ladi",            j: true,  izoh: "To'g'ri! Bir xil egizaklarda DNK bir xil bo'lsa-da, barmoq izlari har xil bo'ladi." },
  { f: "Asalarilar bir-biriga maxsus raqs orqali xabar beradi",                  j: true,  izoh: "To'g'ri! 'Silkinish raqsi' orqali ari gulning yo'nalishi va masofasini bildiradi." },
  { f: "Tovush yorug'likdan tezroq tarqaladi",                                   j: false, izoh: "Noto'g'ri! Yorug'lik ancha tez — shuning uchun chaqmoqni momaqaldiroqdan oldin ko'rasiz." },
];

let hhIndex = 0, hhTogri = 0, hhSavollar = [];

function hayoyoReset() {
  hhIndex = 0; hhTogri = 0;
  hhSavollar = [...HAYOYO_FAKTLAR].sort(() => Math.random() - 0.5).slice(0, 10);
  const playEl = $('hayoyo-play'), resEl = $('hayoyo-result');
  if (playEl) playEl.style.display = 'block';
  if (resEl)  resEl.style.display  = 'none';
  const haBtn  = $('hayoyo-ha'),  yoqBtn = $('hayoyo-yoq');
  if (haBtn)  { haBtn.disabled = false;  haBtn.classList.remove('correct','wrong'); }
  if (yoqBtn) { yoqBtn.disabled = false; yoqBtn.classList.remove('correct','wrong'); }
  const fb = $('hayoyo-feedback');
  if (fb) { fb.textContent = 'Javob bering...'; fb.className = 'hayoyo-feedback neutral'; }
  hayoyoSavol();
}

function hayoyoSavol() {
  const q = hhSavollar[hhIndex];
  const prog  = $('hayoyo-prog');
  const qnum  = $('hayoyo-qnum');
  const score = $('hayoyo-score-live');
  const ftext = $('hayoyo-text');
  const fb    = $('hayoyo-feedback');
  const haBtn = $('hayoyo-ha'), yoqBtn = $('hayoyo-yoq');
  if (prog)  prog.style.width    = (hhIndex / hhSavollar.length * 100) + '%';
  if (qnum)  qnum.textContent    = `${hhIndex + 1} / ${hhSavollar.length}`;
  if (score) score.textContent   = `${hhTogri} ✓`;
  if (ftext) ftext.textContent   = q.f;
  if (fb)    { fb.textContent = 'Javob bering...'; fb.className = 'hayoyo-feedback neutral'; }
  if (haBtn)  { haBtn.disabled = false;  haBtn.classList.remove('correct','wrong'); }
  if (yoqBtn) { yoqBtn.disabled = false; yoqBtn.classList.remove('correct','wrong'); }
}

function hayoyoJavob(javob) {
  haptic('light');
  const q     = hhSavollar[hhIndex];
  const togri = javob === q.j;
  if (togri) hhTogri++;
  const haBtn = $('hayoyo-ha'), yoqBtn = $('hayoyo-yoq');
  const fb    = $('hayoyo-feedback'), score = $('hayoyo-score-live');
  if (haBtn)  haBtn.disabled  = true;
  if (yoqBtn) yoqBtn.disabled = true;
  // To'g'ri javobni ko'rsatish
  if (q.j === true)  { if (haBtn)  haBtn.classList.add('correct'); }
  else               { if (yoqBtn) yoqBtn.classList.add('correct'); }
  // Tanlangan javobni belgilash
  if (javob === true  && !togri && haBtn)  haBtn.classList.add('wrong');
  if (javob === false && !togri && yoqBtn) yoqBtn.classList.add('wrong');
  if (fb)    { fb.textContent = (togri ? '✅ ' : '❌ ') + q.izoh; fb.className = 'hayoyo-feedback ' + (togri ? 'correct' : 'wrong'); }
  if (score) score.textContent = `${hhTogri} ✓`;
  setTimeout(() => { hhIndex++; hhIndex < hhSavollar.length ? hayoyoSavol() : hayoyoNatija(); }, 1500);
}

function hayoyoNatija() {
  const playEl = $('hayoyo-play'), resEl = $('hayoyo-result');
  const scEl   = $('hayoyo-final-score'), verdEl = $('hayoyo-verdict');
  const vsubEl = $('hayoyo-verdict-sub'), emEl   = $('hayoyo-res-emoji');
  const prog   = $('hayoyo-prog');
  if (playEl) playEl.style.display = 'none';
  if (resEl)  resEl.style.display  = 'block';
  if (prog)   prog.style.width     = '100%';
  if (scEl)   scEl.textContent     = `${hhTogri} / ${hhSavollar.length}`;
  const verd = hhTogri >= 9 ? { em: '🏆', t: 'Ilm ustasi!',        s: "Siz faktlarni zo'r bilasiz!" }
             : hhTogri >= 7 ? { em: '🔥', t: "Zo'r bilimdonsiz!",  s: 'Bir oz yana o\'rganing!' }
             : hhTogri >= 5 ? { em: '👍', t: 'Yaxshi urinish!',    s: "Ko'proq o'qing." }
             :                { em: '💪', t: 'Mashq qiling!',       s: "Ilm — kuch!" };
  if (emEl)   emEl.textContent   = verd.em;
  if (verdEl) verdEl.textContent = verd.t;
  if (vsubEl) vsubEl.textContent = verd.s;
  haptic('medium');
  S.games++; S.hayoyo++;
  addXP(hhTogri * 2); badge('gamer');
  if (S.hayoyo >= 5) badge('hayoyo5');
  showToast(`🧪 ${hhTogri}/${hhSavollar.length} to'g'ri! +${hhTogri * 2} XP`);
}

/* ══════════════════════════════════════
   TOAST
══════════════════════════════════════ */
let toastTimer;
function showToast(msg) {
  const el = $('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}

/* ══════════════════════════════════════
   YORDAMCHILAR
══════════════════════════════════════ */
function $(id) { return document.getElementById(id); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function rnd(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }

/* ══════════════════════════════════════
   ISHGA TUSHIRISH
══════════════════════════════════════ */
/* ══════════════════════════════════════
   YANGI O'YIN 1: RANG TESTI (Stroop)
   So'z emas — uning rangini tanlang. Xato/vaqt tugasa — o'yin tugaydi.
══════════════════════════════════════ */
const STROOP_RANGLAR = [
  { n: "QIZIL",       c: '#ef4444' },
  { n: "KO'K",        c: '#3b82f6' },
  { n: "YASHIL",      c: '#22c55e' },
  { n: "SARIQ",       c: '#eab308' },
  { n: "BINAFSHA",    c: '#a855f7' },
  { n: "TO'Q SARIQ",  c: '#f97316' },
];
let stTimer = null, stScore = 0, stActive = false, stInk = null;

function stroopStop() { clearTimeout(stTimer); stTimer = null; stActive = false; }
function stroopReset() {
  stroopStop();
  stScore = 0;
  const sc = $('stroop-score'), res = $('stroop-result'), btn = $('stroop-btn'),
        word = $('stroop-word'), opts = $('stroop-opts'), tf = $('stroop-timer');
  if (sc)   sc.textContent = '0';
  if (res)  res.style.display = 'none';
  if (btn)  { btn.style.display = 'block'; btn.textContent = '🎨 Boshlash'; }
  if (word) { word.textContent = 'Tayyormisiz?'; word.style.color = 'var(--text)'; }
  if (opts) opts.innerHTML = '';
  if (tf)   { tf.style.transition = 'none'; tf.style.width = '100%'; }
}
function stroopBoshlash() {
  haptic('light');
  stScore = 0; stActive = true;
  const sc = $('stroop-score'), res = $('stroop-result'), btn = $('stroop-btn');
  if (sc)  sc.textContent = '0';
  if (res) res.style.display = 'none';
  if (btn) btn.style.display = 'none';
  stroopSavol();
}
function stroopSavol() {
  if (!stActive) return;
  const word = $('stroop-word'), opts = $('stroop-opts'), tf = $('stroop-timer');
  const textColor = STROOP_RANGLAR[Math.floor(Math.random() * STROOP_RANGLAR.length)];
  let ink = STROOP_RANGLAR[Math.floor(Math.random() * STROOP_RANGLAR.length)];
  if (textColor === ink) ink = STROOP_RANGLAR[(STROOP_RANGLAR.indexOf(ink) + 1) % STROOP_RANGLAR.length];
  stInk = ink;
  if (word) { word.textContent = textColor.n; word.style.color = ink.c; }
  const choices = [ink];
  while (choices.length < 4) {
    const r = STROOP_RANGLAR[Math.floor(Math.random() * STROOP_RANGLAR.length)];
    if (!choices.includes(r)) choices.push(r);
  }
  choices.sort(() => Math.random() - 0.5);
  if (opts) {
    opts.innerHTML = '';
    choices.forEach(col => {
      const b = document.createElement('button');
      b.className = 'stroop-swatch';
      b.style.background = col.c;
      b.onclick = () => stroopTanla(col);
      opts.appendChild(b);
    });
  }
  const tlim = Math.max(900, 2200 - stScore * 60);
  if (tf) {
    tf.style.transition = 'none'; tf.style.width = '100%';
    void tf.offsetWidth;
    tf.style.transition = `width ${tlim}ms linear`;
    tf.style.width = '0%';
  }
  clearTimeout(stTimer);
  stTimer = setTimeout(() => stroopTugadi('⏰ Vaqt tugadi!'), tlim);
}
function stroopTanla(col) {
  if (!stActive) return;
  if (col === stInk) {
    stScore++;
    haptic('light');
    const sc = $('stroop-score'); if (sc) sc.textContent = stScore;
    stroopSavol();
  } else {
    stroopTugadi("❌ Noto'g'ri rang!");
  }
}
function stroopTugadi(sabab) {
  stroopStop();
  const res = $('stroop-result'), fin = $('stroop-final'), verd = $('stroop-verdict'),
        word = $('stroop-word'), opts = $('stroop-opts'), btn = $('stroop-btn');
  if (word) word.textContent = '🎨';
  if (opts) opts.innerHTML = '';
  if (fin)  fin.textContent = stScore;
  if (verd) verd.textContent = `${sabab} • ` + (stScore >= 20 ? '🏆 Ajoyib!' : stScore >= 12 ? "🔥 Zo'r!" : stScore >= 6 ? '👍 Yaxshi' : 'Mashq qiling!');
  if (res)  res.style.display = 'block';
  if (btn)  btn.style.display = 'none';
  const xp = Math.max(1, Math.floor(stScore / 2));
  S.games++; addXP(xp); badge('gamer');
  haptic('medium');
  showToast(`🎨 ${stScore} ball! +${xp} XP`);
}

/* ══════════════════════════════════════
   YANGI O'YIN 2: TOPQIRLIK (boshqacha emojini top)
══════════════════════════════════════ */
const FIND_JUFT = [
  ['😀','😃'], ['🙂','🙃'], ['😺','😸'], ['🌕','🌝'], ['🔵','🟣'],
  ['🟠','🟡'], ['⭐','🌟'], ['🐶','🐺'], ['🍎','🍏'], ['😎','🤓'],
  ['👻','💀'], ['🌸','🌺'], ['🔥','✨'], ['😄','😁'], ['🤍','🩶'],
];
let fdTimer = null, fdScore = 0, fdActive = false;

function findStop() { clearTimeout(fdTimer); fdTimer = null; fdActive = false; }
function findReset() {
  findStop();
  fdScore = 0;
  const info = $('find-info'), res = $('find-result'), btn = $('find-btn'),
        grid = $('find-grid'), tf = $('find-timer');
  if (info) info.textContent = 'Raund 1';
  if (res)  res.style.display = 'none';
  if (btn)  { btn.style.display = 'block'; btn.textContent = '🔍 Boshlash'; }
  if (grid) grid.innerHTML = '';
  if (tf)   { tf.style.transition = 'none'; tf.style.width = '100%'; }
}
function findBoshlash() {
  haptic('light');
  fdScore = 0; fdActive = true;
  const res = $('find-result'), btn = $('find-btn');
  if (res) res.style.display = 'none';
  if (btn) btn.style.display = 'none';
  findRaund();
}
function findRaund() {
  if (!fdActive) return;
  const info = $('find-info'), grid = $('find-grid'), tf = $('find-timer');
  if (info) info.textContent = `Raund ${fdScore + 1}`;
  const size = Math.min(6, 3 + Math.floor(fdScore / 2));
  const total = size * size;
  const oddIdx = Math.floor(Math.random() * total);
  const juft = FIND_JUFT[Math.floor(Math.random() * FIND_JUFT.length)];
  const flip = Math.random() < 0.5;
  const base = flip ? juft[0] : juft[1];
  const odd  = flip ? juft[1] : juft[0];
  if (grid) {
    grid.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
    grid.style.maxWidth = (size * 50) + 'px';
    grid.style.fontSize = (size >= 5 ? 20 : 26) + 'px';
    grid.innerHTML = '';
    for (let i = 0; i < total; i++) {
      const c = document.createElement('div');
      c.className = 'find-cell';
      c.textContent = (i === oddIdx) ? odd : base;
      c.onclick = () => findTanla(i === oddIdx, c);
      grid.appendChild(c);
    }
  }
  const tlim = Math.max(1600, 5000 - fdScore * 250);
  if (tf) {
    tf.style.transition = 'none'; tf.style.width = '100%';
    void tf.offsetWidth;
    tf.style.transition = `width ${tlim}ms linear`;
    tf.style.width = '0%';
  }
  clearTimeout(fdTimer);
  fdTimer = setTimeout(() => findTugadi('⏰ Vaqt tugadi!'), tlim);
}
function findTanla(togri, cell) {
  if (!fdActive) return;
  if (togri) {
    fdScore++;
    haptic('light');
    if (cell) cell.classList.add('good');
    clearTimeout(fdTimer);
    setTimeout(findRaund, 200);
  } else {
    if (cell) cell.classList.add('bad');
    findTugadi("❌ Noto'g'ri!");
  }
}
function findTugadi(sabab) {
  findStop();
  const res = $('find-result'), fin = $('find-final'), verd = $('find-verdict'), btn = $('find-btn');
  if (fin)  fin.textContent = fdScore;
  if (verd) verd.textContent = `${sabab} • ` + (fdScore >= 12 ? "🏆 Burgut ko'z!" : fdScore >= 7 ? "🔥 Zo'r!" : fdScore >= 3 ? '👍 Yaxshi' : 'Mashq qiling!');
  if (res)  res.style.display = 'block';
  if (btn)  btn.style.display = 'none';
  const xp = Math.max(1, fdScore);
  S.games++; addXP(xp); badge('gamer');
  haptic('medium');
  showToast(`🔍 ${fdScore} raund! +${xp} XP`);
}

/* ══════════════════════════════════════
   YANGI O'YIN 3: TEZ TAP (5 soniyada ko'p bos)
══════════════════════════════════════ */
let tapTimer = null, tapN = 0, tapActive = false;

function tapStop() { clearInterval(tapTimer); tapTimer = null; tapActive = false; }
function tapReset() {
  tapStop();
  tapN = 0;
  const cnt = $('tap-count'), tm = $('tap-time'), pad = $('tap-pad'),
        res = $('tap-result'), btn = $('tap-btn');
  if (cnt) cnt.textContent = '0';
  if (tm)  tm.textContent = '5.0s';
  if (pad) pad.disabled = true;
  if (res) res.style.display = 'none';
  if (btn) { btn.style.display = 'block'; btn.textContent = '👆 Boshlash'; }
}
function tapBoshlash() {
  haptic('light');
  tapN = 0; tapActive = true;
  const cnt = $('tap-count'), tm = $('tap-time'), pad = $('tap-pad'),
        res = $('tap-result'), btn = $('tap-btn');
  if (cnt) cnt.textContent = '0';
  if (res) res.style.display = 'none';
  if (btn) btn.style.display = 'none';
  if (pad) pad.disabled = false;
  let left = 5.0;
  if (tm) tm.textContent = left.toFixed(1) + 's';
  clearInterval(tapTimer);
  tapTimer = setInterval(() => {
    left = Math.round((left - 0.1) * 10) / 10;
    if (tm) tm.textContent = Math.max(0, left).toFixed(1) + 's';
    if (left <= 0) tapTugadi();
  }, 100);
}
function tapBos() {
  if (!tapActive) return;
  tapN++;
  const cnt = $('tap-count'); if (cnt) cnt.textContent = tapN;
  haptic('light');
}
function tapTugadi() {
  tapStop();
  const pad = $('tap-pad'), res = $('tap-result'), fin = $('tap-final'),
        verd = $('tap-verdict'), btn = $('tap-btn');
  if (pad) pad.disabled = true;
  if (fin) fin.textContent = tapN;
  if (verd) verd.textContent = `${tapN} marta • ` + (tapN >= 50 ? '🏆 Chaqmoq!' : tapN >= 35 ? '🔥 Tez!' : tapN >= 20 ? '👍 Yaxshi' : '🐢 Sekinroq');
  if (res) res.style.display = 'block';
  if (btn) { btn.style.display = 'block'; btn.textContent = '↩ Qaytadan'; }
  const xp = Math.max(1, Math.floor(tapN / 12));
  S.games++; addXP(xp); badge('gamer');
  haptic('medium');
  showToast(`👆 ${tapN} marta! +${xp} XP`);
}

/* ══════════════════════════════════════
   YANGI O'YIN 4: NISHONGA OL (tez bos, ulgurmasang tugaydi)
══════════════════════════════════════ */
let tgTimer = null, tgScore = 0, tgActive = false;

function targetStop() {
  clearTimeout(tgTimer); tgTimer = null; tgActive = false;
  const a = $('target-area'); if (a) a.innerHTML = '';
}
function targetReset() {
  targetStop();
  tgScore = 0;
  const sc = $('target-score'), res = $('target-result'), btn = $('target-btn');
  if (sc)  sc.textContent = '0';
  if (res) res.style.display = 'none';
  if (btn) { btn.style.display = 'block'; btn.textContent = '🎯 Boshlash'; }
}
function targetBoshlash() {
  haptic('light');
  tgScore = 0; tgActive = true;
  const sc = $('target-score'), res = $('target-result'), btn = $('target-btn');
  if (sc)  sc.textContent = '0';
  if (res) res.style.display = 'none';
  if (btn) btn.style.display = 'none';
  targetSpawn();
}
function targetSpawn() {
  if (!tgActive) return;
  const area = $('target-area');
  if (!area) return;
  area.innerHTML = '';
  const dot = document.createElement('div');
  dot.className = 'target-dot';
  dot.textContent = '🎯';
  const aw = area.clientWidth || 300, ah = area.clientHeight || 280, sz = 56;
  dot.style.left = Math.random() * Math.max(0, aw - sz) + 'px';
  dot.style.top  = Math.random() * Math.max(0, ah - sz) + 'px';
  dot.onclick = () => {
    if (!tgActive) return;
    tgScore++;
    haptic('light');
    const sc = $('target-score'); if (sc) sc.textContent = tgScore;
    clearTimeout(tgTimer);
    targetSpawn();
  };
  area.appendChild(dot);
  const life = Math.max(480, 1100 - tgScore * 35);
  clearTimeout(tgTimer);
  tgTimer = setTimeout(() => targetTugadi('⏰ Ulgurmadingiz!'), life);
}
function targetTugadi(sabab) {
  targetStop();
  const res = $('target-result'), fin = $('target-final'), verd = $('target-verdict'), btn = $('target-btn');
  if (fin)  fin.textContent = tgScore;
  if (verd) verd.textContent = `${sabab} • ` + (tgScore >= 20 ? '🏆 Snayper!' : tgScore >= 12 ? "🔥 Zo'r!" : tgScore >= 6 ? '👍 Yaxshi' : 'Mashq qiling!');
  if (res)  res.style.display = 'block';
  if (btn)  btn.style.display = 'none';
  const xp = Math.max(1, Math.floor(tgScore / 2));
  S.games++; addXP(xp); badge('gamer');
  haptic('medium');
  showToast(`🎯 ${tgScore} ball! +${xp} XP`);
}

window.addEventListener('DOMContentLoaded', () => {
  renderRoastTarixi();

  /* Navbar */
  document.querySelectorAll('.nb').forEach(btn => {
    btn.addEventListener('click', () => goTo(btn.dataset.sc));
  });

  /* Xush kelibsiz oynasi */
  $('welcome-start')?.addEventListener('click', closeWelcome);

  /* Bosh sahifa cardlari */
  $('c-roast')?.addEventListener('click',   () => goTo('roast'));
  $('c-iq')?.addEventListener('click',      () => goTo('iq'));
  $('c-games')?.addEventListener('click',   () => goTo('games'));
  $('c-hayoyo')?.addEventListener('click',  () => openGame('hayoyo'));
  $('c-daily')?.addEventListener('click',   () => goTo('daily'));

  /* Profil — XP chip yoki level chip bosib kirish */
  $('h-xp')?.addEventListener('click',  () => goTo('profile'));
  $('h-lvl')?.addEventListener('click', () => goTo('profile'));
  $('h-name')?.addEventListener('click',() => goTo('profile'));

  /* Roast */
  $('roast-btn')?.addEventListener('click',   doRoast);
  $('roast-share')?.addEventListener('click', shareRoast);

  /* IQ */
  $('iq-start-btn')?.addEventListener('click', iqBoshlash);
  $('iq-retake')?.addEventListener('click',    iqReset);

  /* Profil */
  $('secret-go')?.addEventListener('click', secretKod);
  $('secret-inp')?.addEventListener('keydown', e => { if (e.key === 'Enter') secretKod(); });

  /* Reflex */
  $('reflex-btn')?.addEventListener('click', reflexBoshlash);

  /* Xotira */
  $('mem-btn')?.addEventListener('click', () => {
    xotiraReset();
    setTimeout(xotiraBoshlash, 200);
  });

  /* Ruletka */
  $('roulette-btn')?.addEventListener('click', ruletkaAylan);

  /* Hisob */
  $('math-btn')?.addEventListener('click',   hisobBoshlash);
  $('math-retry')?.addEventListener('click', hisobReset);

  /* NPC */
  $('npc-btn')?.addEventListener('click', () => {
    if ($('npc-result')?.style.display === 'block') npcReset();
    else npcBoshlash();
  });

  /* Ha/Yo'q — HTML da onclick="hayoyoJavob(true/false)" va onclick="hayoyoReset()" bor */

  /* Yangi o'yinlar */
  $('stroop-btn')?.addEventListener('click',   stroopBoshlash);
  $('stroop-retry')?.addEventListener('click', stroopBoshlash);
  $('find-btn')?.addEventListener('click',     findBoshlash);
  $('find-retry')?.addEventListener('click',   findBoshlash);
  $('tap-btn')?.addEventListener('click',      tapBoshlash);
  $('tap-pad')?.addEventListener('click',      tapBos);
  $('target-btn')?.addEventListener('click',   targetBoshlash);
  $('target-retry')?.addEventListener('click', targetBoshlash);

  /* Boot */
  goTo('boot');
  boot();
});
