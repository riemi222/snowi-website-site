/* Snowi 預約表單（index.html／en.html 共用）
 * 選課程 → 選人數 → 出現每位學員欄位 → 日期 → 即時估價 → 聯絡資料 → 送出 → thanks.html
 * 價格規則和後端 snowi-backend/pricing.js 一致（以後端為準）。
 */
(function () {
  const API = 'https://snowi-backend-production.up.railway.app';
  const EN = (document.documentElement.lang || '').toLowerCase().startsWith('en');
  const L = (zh, en) => (EN ? en : zh);
  const root = document.getElementById('snowi-booking');
  if (!root) return;

  // ---------- 價格 ----------
  const PRICES = {
    low:  { 1: { 3: 55000, 4: 70000, 6: 98000 },  2: { 3: 65000, 4: 80000, 6: 108000 }, 3: { 3: 75000, 4: 90000, 6: 119000 },  4: { 3: 85000, 4: 100000, 6: 140000 } },
    peak: { 1: { 3: 65000, 4: 90000, 6: 118000 }, 2: { 3: 75000, 4: 100000, 6: 128000 }, 3: { 3: 85000, 4: 110000, 6: 138000 }, 4: { 3: 95000, 4: 120000, 6: 148000 } },
  };
  const PEAK = [['2026-12-23', '2027-01-03'], ['2027-02-03', '2027-02-15'], ['2027-02-26', '2027-03-02'], ['2027-04-02', '2027-04-06']];
  const OPEN = '2026-12-01';
  const COURSES = {
    adult6:  { h: 6, zh: '一日S彎課', en: 'One-Day S-Turn', szh: '大人新手・6小時', sen: 'Adult beginners · 6 hrs', adults: true, kids: true },
    kid6:    { h: 6, zh: '兒童牽手到放手', en: 'Kids Hand-Hold to Let-Go', szh: '只限1對1・6小時', sen: '1-on-1 only · 6 hrs', adults: false, kids: true },
    family6: { h: 6, zh: '家庭同場課', en: 'Family Group', szh: '一對二・大人＋小孩', sen: '1:2 · adult + child', adults: true, kids: true },
    try3:    { h: 3, zh: '3小時體驗', en: '3-Hour Taster', szh: '先試試看', sen: 'Try it first', adults: true, kids: true },
    second4: { h: 4, zh: '4小時鞏固課', en: '4-Hour Day Two', szh: '上過一日課的人', sen: 'After a full day', adults: true, kids: true },
    adv6:    { h: 6, zh: '進階嚮導', en: 'Advanced Guide', szh: '粉雪／公園・6小時', sen: 'Powder / park · 6 hrs', adults: true, kids: true },
  };
  // [id, 中文, 英文, 西部價目等級(null＝自家價目表), 有成果保證]
  const RESORTS = [['tomamu', '星野TOMAMU', 'Hoshino TOMAMU', null, 1], ['furano', '富良野', 'Furano', null, 0], ['asahikawa', '旭川', 'Asahikawa', null, 1],
    ['teine', '手稻', 'Sapporo Teine', 'a', 0], ['kokusai', '札幌國際', 'Sapporo Kokusai', 'a', 0], ['onze', 'Onze 暑寒別', 'Onze', 'a', 0],
    ['hirafu', '二世谷 Hirafu', 'Niseko Hirafu', 'b', 0], ['annupuri', '二世谷 Annupuri', 'Niseko Annupuri', 'b', 0], ['rusutsu', '留壽都', 'Rusutsu', 'b', 0], ['kiroro', '喜樂樂 Kiroro', 'Kiroro', 'c', 0]];
  // 西部雪場（合作學校）：一位教練一天；1–2 人基礎價，3–4 人每多 1 人 +5,000；西部旺季每天 +5,000
  const WEST = { a: { 6: 75000, 3: 52000 }, b: { 6: 85000, 3: 58000 }, c: { 6: 95000, 3: 68000 } };
  const WPEAK = [['2026-12-23', '2027-01-05'], ['2027-02-03', '2027-02-15'], ['2027-04-02', '2027-04-06']];
  const LEVELS = [['none', '完全沒滑過', 'Never skied'], ['once', '滑過1–2次', '1–2 times'], ['turns', '會轉彎', 'Can turn'], ['adv', '中高階', 'Intermediate+']];
  const isPeak = d => PEAK.some(([a, b]) => d >= a && d <= b);
  const addDay = (d, n) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
  const pairs = n => Array.from({ length: Math.ceil(n / 2) }, (_, i) => (i < Math.floor(n / 2) ? 2 : 1));
  const groups = n => { if (n <= 0) return []; const g = Math.ceil(n / 4), b = Math.floor(n / g), e = n % g; return Array.from({ length: g }, (_, i) => b + (i < e ? 1 : 0)); };
  const yen = n => '¥' + Number(n || 0).toLocaleString('en-US');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const md = d => { const [, m, dd] = d.split('-'); return `${+m}/${+dd}`; };

  const resortOf = () => RESORTS.find(r => r[0] === S.resort) || RESORTS[0];
  function quote() {
    const c = COURSES[S.course]; if (!c || !S.start) return null;
    const R = resortOf(), tier = R[3];
    if (tier && !WEST[tier][c.h]) return { error: 'no' + c.h };
    const A = S.adults, K = S.kids; const lines = []; let total = 0;
    const gs = S.course === 'kid6' ? Array(K).fill(1) : S.course === 'family6' ? pairs(A + K) : groups(A + K);
    for (let i = 0; i < S.days; i++) {
      const d = addDay(S.start, i);
      const pk = tier ? WPEAK.some(([a, b]) => d >= a && d <= b) : isPeak(d), T = PRICES[pk ? 'peak' : 'low'];
      const parts = gs.map(r => ({ r, p: tier ? WEST[tier][c.h] + Math.max(0, r - 2) * 5000 + (pk ? 5000 : 0) : T[r][c.h] }));
      const t = parts.reduce((s, x) => s + x.p, 0); total += t; lines.push({ d, pk, parts, t });
    }
    return { total, lines };
  }
  // 成果保證：符合就顯示提醒；接近但不符合時說明原因
  function gInfo() {
    const R = resortOf(), okResort = R[4] === 1;
    if (S.course === 'adult6') {
      if (!S.adults) return null;
      if (!okResort) return { ok: false, t: L(`${R[1]}不適用成果保證（保證只在星野TOMAMU、旭川）。`, `The guarantee isn't available at ${R[2]} (TOMAMU and Asahikawa only).`) };
      if (S.adults + S.kids > 2) return { ok: false, t: L('1對3以上不適用「大人一日S彎保證」（只限1對1、1對2）。', 'The One-Day S-Turn Guarantee is for 1:1 or 1:2 only.') };
      return { ok: true, t: L('✓ 這個預約適用「大人一日S彎保證」：第一天上完6小時，還不能在初級滑道連續轉彎，加送3小時免費課程，可以排在這趟旅程任何一天，排不進去就保留到下一季。', "✓ This booking qualifies for the One-Day S-Turn Guarantee: complete the 6 hours and still can't link turns on a beginner run after your first 6 hours? We add 3 free hours on any day of your trip, or next season if your trip has no room.") };
    }
    if (S.course === 'kid6') {
      if (!okResort) return { ok: false, t: L(`${R[1]}不適用成果保證（保證只在星野TOMAMU、旭川）。`, `The guarantee isn't available at ${R[2]} (TOMAMU and Asahikawa only).`) };
      const kids = S.members.filter(m => m.kind === 'kid' && m.age !== '');
      if (kids.some(m => +m.age >= 10)) return { ok: true, t: L('✓ 10歲以上的孩子適用「牽手到放手保證」：上完6小時還不能自己滑行和煞車，加送3小時免費課程，可以排在這趟旅程任何一天，或保留到下一季。', "✓ Children 10+ qualify for the Hand-Hold to Let-Go Guarantee: can't glide and stop on their own after 6 hours? We add 3 free hours on any day of your trip, or next season.") };
      if (kids.length) return { ok: false, t: L('「牽手到放手保證」適用10歲以上的孩子，3–9歲可以上課但不適用保證。', 'The guarantee applies to children 10+. Ages 3–9 are welcome but not covered.') };
    }
    return null;
  }
  const gBox = () => { const g = gInfo(); return g ? `<div class="bk-g${g.ok ? '' : ' no'}">${g.t}</div>` : ''; };


  // ---------- 狀態 ----------
  const KEY = 'snowi-booking-v1';
  let S = {}; try { S = JSON.parse(sessionStorage.getItem(KEY) || '{}'); } catch (_) {}
  S = Object.assign({ course: 'adult6', adults: 0, kids: 0, members: [], start: '', days: 1, slot: 'am', advType: 'park', resort: 'tomamu', teachLang: EN ? 'English' : '中文', transfer: false, coach: '', name: '', email: '', contact: '', note: '', optin: true }, S);
  if (!RESORTS.some(r => r[0] === S.resort)) S.resort = 'tomamu';
  const save = () => { try { sessionStorage.setItem(KEY, JSON.stringify(S)); } catch (_) {} };
  function syncMembers() {
    const want = [...Array(S.adults).fill('adult'), ...Array(S.kids).fill('kid')];
    const old = { adult: S.members.filter(m => m.kind === 'adult'), kid: S.members.filter(m => m.kind === 'kid') };
    const used = { adult: 0, kid: 0 };
    S.members = want.map(k => old[k][used[k]++] || { kind: k, age: '', board: '', level: 'none', rent: null, height: '', weight: '', shoe: '' });
  }
  function fixCounts() {
    const c = COURSES[S.course];
    if (!c.adults) S.adults = 0;
    S.adults = Math.max(0, Math.min(12, S.adults)); S.kids = Math.max(0, Math.min(8, S.kids));
    syncMembers();
  }

  // ---------- 畫面 ----------
  const style = document.createElement('style');
  style.textContent = `
  #snowi-booking{margin-top:2.4rem;text-align:left;font-family:'Noto Sans TC','DM Sans',sans-serif}
  #snowi-booking .bk-sec{background:rgba(255,255,255,.035);border:1px solid var(--line);border-radius:18px;padding:1.3rem;margin-bottom:1rem}
  #snowi-booking .bk-h{font-weight:900;font-size:1.05rem;color:var(--snow);margin:0 0 .25rem;display:flex;gap:.6rem;align-items:center}
  #snowi-booking .bk-h .n{width:1.7rem;height:1.7rem;border-radius:50%;background:var(--accent);color:var(--deep);display:grid;place-items:center;font-size:.85rem;flex:none}
  #snowi-booking .bk-sub{font-size:.85rem;color:var(--muted);margin:0 0 1rem}
  #snowi-booking .bk-courses{display:grid;grid-template-columns:repeat(3,1fr);gap:.6rem}
  @media(max-width:640px){#snowi-booking .bk-courses{grid-template-columns:1fr 1fr}}
  #snowi-booking .bk-course{font:inherit;text-align:left;cursor:pointer;background:var(--deep);border:1.5px solid var(--line);border-radius:14px;padding:.85rem .9rem;color:var(--snow)}
  #snowi-booking .bk-course b{display:block;font-size:.95rem}#snowi-booking .bk-course span{display:block;font-size:.75rem;color:var(--muted);margin-top:.15rem}
  #snowi-booking .bk-course.on{border-color:var(--accent-bright);background:rgba(91,158,201,.16)}
  #snowi-booking .bk-count{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:.8rem}
  #snowi-booking .bk-step{display:flex;align-items:center;justify-content:space-between;background:var(--deep);border:1px solid var(--line);border-radius:14px;padding:.7rem .9rem}
  #snowi-booking .bk-step label{font-size:.92rem;color:var(--ice);flex:1;min-width:0;margin:0}#snowi-booking .bk-step small{display:block;font-size:.72rem;color:var(--muted)}
  #snowi-booking .bk-step .ctl{display:flex;align-items:center;gap:.7rem}
  #snowi-booking .bk-step button{width:2.1rem;height:2.1rem;border-radius:50%;border:1px solid var(--accent);background:none;color:var(--accent-bright);font-size:1.15rem;cursor:pointer;line-height:1}
  #snowi-booking .bk-step button:disabled{opacity:.3;cursor:default}#snowi-booking .bk-step .v{min-width:1.4rem;text-align:center;font-weight:700;font-size:1.1rem}
  #snowi-booking .bk-hint{font-size:.85rem;color:var(--accent-bright);margin:.8rem 0 0}
  #snowi-booking .bk-mem{background:var(--deep);border:1px solid var(--line);border-radius:14px;padding:.9rem;margin-bottom:.7rem}
  #snowi-booking .bk-mem .t{font-weight:700;font-size:.9rem;margin-bottom:.6rem;color:var(--snow)}
  #snowi-booking .bk-row{display:grid;grid-template-columns:repeat(3,1fr);gap:.6rem;margin-bottom:.6rem}
  @media(max-width:600px){#snowi-booking .bk-row{grid-template-columns:1fr 1fr}}
  #snowi-booking .bk-row.two{grid-template-columns:1fr 1fr}
  #snowi-booking .fld{display:flex;flex-direction:column;gap:.3rem}#snowi-booking .fld>span{font-size:.75rem;color:var(--muted)}
  #snowi-booking input,#snowi-booking select,#snowi-booking textarea{width:100%;margin:0}
  #snowi-booking input[type=date]{color-scheme:dark}
  #snowi-booking .seg{display:flex;gap:.4rem}#snowi-booking .seg button{flex:1;font:inherit;font-size:.85rem;padding:.65rem .4rem;border-radius:10px;border:1px solid var(--line);background:none;color:var(--ice);cursor:pointer}
  #snowi-booking .seg button.on{background:var(--accent);border-color:var(--accent);color:var(--deep);font-weight:700}
  #snowi-booking .bk-est{border-color:rgba(125,189,232,.45)}
  #snowi-booking .bk-est .l{display:flex;justify-content:space-between;gap:1rem;font-size:.86rem;color:var(--ice);padding:.35rem 0;border-bottom:1px dashed var(--line)}
  #snowi-booking .bk-est .tot{display:flex;justify-content:space-between;font-weight:900;font-size:1.25rem;margin-top:.7rem;color:var(--snow)}
  #snowi-booking .bk-est .dep{display:flex;justify-content:space-between;font-size:.88rem;color:var(--accent-bright);margin-top:.2rem}
  #snowi-booking .bk-est .note{font-size:.75rem;color:var(--muted);margin-top:.6rem}
  #snowi-booking .bk-g.no{background:rgba(212,169,106,.12);color:var(--warm)}
  #snowi-booking .bk-g{font-size:.82rem;background:rgba(91,158,201,.12);border-radius:10px;padding:.6rem .8rem;margin-top:.7rem;color:var(--ice)}
  #snowi-booking .chk{display:flex;gap:.6rem;align-items:flex-start;font-size:.88rem;color:var(--ice);cursor:pointer;margin:.4rem 0}
  #snowi-booking .chk input{width:1.1rem;height:1.1rem;flex:none;margin-top:.2rem;accent-color:var(--accent)}
  #snowi-booking .err{color:#ff9fae;font-size:.85rem;margin:.6rem 0 0;min-height:1.2em}
  #snowi-booking .bad{border-color:#ff9fae!important}
  #snowi-booking .bk-submit{width:100%;margin-top:.6rem}
  #snowi-booking .hp{position:absolute;left:-9999px}`;
  document.head.appendChild(style);

  function courseSec() {
    return `<div class="bk-sec"><div class="bk-h"><span class="n">1</span>${L('選課程', 'Choose a course')}</div>
      <div class="bk-courses">${Object.entries(COURSES).map(([k, c]) => `<button type="button" class="bk-course${S.course === k ? ' on' : ''}" data-c="${k}"><b>${EN ? c.en : c.zh}</b><span>${EN ? c.sen : c.szh}</span></button>`).join('')}</div>
      ${S.course === 'adv6' ? `<div style="margin-top:.8rem" class="seg" data-k="advType"><button type="button" data-v="park" class="${S.advType === 'park' ? 'on' : ''}">${L('公園 Park', 'Park')}</button><button type="button" data-v="powder" class="${S.advType === 'powder' ? 'on' : ''}">${L('粉雪／樹林嚮導', 'Powder / trees')}</button></div><p class="bk-sub" style="margin:.5rem 0 0">${L('需具備綠線上能順暢 S Turn 的能力', 'You need to link smooth S-turns on a green run')}</p>` : ''}</div>`;
  }
  function stepper(k, label, sub, min) {
    const v = S[k];
    return `<div class="bk-step"><label>${label}<small>${sub}</small></label><div class="ctl"><button type="button" data-dec="${k}" ${v <= min ? 'disabled' : ''}>−</button><span class="v">${v}</span><button type="button" data-inc="${k}">＋</button></div></div>`;
  }
  function countSec() {
    const c = COURSES[S.course];
    const kidSub = S.course === 'kid6' ? L('3歲以上・每位小孩1位教練', '3+ yrs · 1 instructor each') : S.course === 'family6' ? L('3歲以上', '3+ yrs') : L('12歲以下', '12 and under');
    return `<div class="bk-sec"><div class="bk-h"><span class="n">2</span>${L('上課人數', 'How many students?')}</div>
      <p class="bk-sub">${L('選好人數後，下面會出現每一位學員要填的資料。', 'Pick the numbers and a short form appears for each student.')}</p>
      <div class="bk-count">${c.adults ? stepper('adults', L('大人', 'Adults'), L('13歲以上', '13+ yrs'), 0) : ''}${stepper('kids', L('小孩', 'Children'), kidSub, 0)}</div>
      ${S.course === 'kid6' ? `<p class="bk-hint">${L('大人也要一起上課的話，請選「家庭同場課」（一對二）。', 'If an adult wants lessons too, choose the Family Group course (1:2).')}</p>` : ''}
      ${S.course === 'family6' && (!S.adults || !S.kids) ? `<p class="bk-hint">${L('家庭同場課需要大人和小孩各至少 1 位。', 'The Family Group course needs at least 1 adult and 1 child.')}</p>` : ''}
      ${S.adults + S.kids > 4 && !['kid6', 'family6'].includes(S.course) ? `<p class="bk-hint">${L('超過 4 位會分成多組、由多位教練上課。', 'More than 4 students are split into groups with more instructors.')}</p>` : ''}
      ${S.course === 'family6' && S.adults + S.kids > 2 ? `<p class="bk-hint">${L('家庭同場課每2人一組、各有一位教練。', 'Family Group lessons are 2 students per instructor; larger families get more instructors.')}</p>` : ''}
      <div id="bk-g1">${gBox()}</div></div>`;
  }
  function memberCard(m, i) {
    const idx = S.members.slice(0, i).filter(x => x.kind === m.kind).length + 1;
    const t = m.kind === 'kid' ? L(`小孩 ${idx}`, `Child ${idx}`) : L(`大人 ${idx}`, `Adult ${idx}`);
    return `<div class="bk-mem" data-i="${i}"><div class="t">${t}</div>
      <div class="bk-row">
        <label class="fld"><span>${L('年齡', 'Age')}</span><input type="number" inputmode="numeric" min="${m.kind === 'kid' ? 3 : 13}" max="99" data-m="age" value="${esc(m.age)}"></label>
        <div class="fld"><span>${L('單板／雙板', 'Ski or snowboard')}</span><div class="seg" data-mk="board"><button type="button" data-v="ski" class="${m.board === 'ski' ? 'on' : ''}">${L('雙板', 'Ski')}</button><button type="button" data-v="sb" class="${m.board === 'sb' ? 'on' : ''}">${L('單板', 'Board')}</button></div></div>
        <label class="fld"><span>${L('程度', 'Level')}</span><select data-m="level">${LEVELS.map(l => `<option value="${l[0]}"${m.level === l[0] ? ' selected' : ''}>${EN ? l[2] : l[1]}</option>`).join('')}</select></label>
      </div>
      <div class="fld"><span>${L('要幫你代訂雪具嗎？', 'Need rental gear arranged?')}</span><div class="seg" data-mk="rent"><button type="button" data-v="1" class="${m.rent === true ? 'on' : ''}">${L('要', 'Yes')}</button><button type="button" data-v="0" class="${m.rent === false ? 'on' : ''}">${L('不用，自己帶', 'No, I have gear')}</button></div></div>
      ${m.rent ? `<div class="bk-row" style="margin:.6rem 0 0">
        <label class="fld"><span>${L('身高 cm', 'Height cm')}</span><input type="number" inputmode="numeric" data-m="height" value="${esc(m.height)}"></label>
        <label class="fld"><span>${L('體重 kg', 'Weight kg')}</span><input type="number" inputmode="numeric" data-m="weight" value="${esc(m.weight)}"></label>
        <label class="fld"><span>${L('鞋子 cm', 'Shoe cm')}</span><input type="number" inputmode="decimal" step="0.5" data-m="shoe" value="${esc(m.shoe)}"></label></div>` : ''}
    </div>`;
  }
  function detailSec() {
    const minD = (() => { const t = new Date(Date.now() + 9 * 3600e3 + 86400e3).toISOString().slice(0, 10); return t > OPEN ? t : OPEN; })();
    return `<div class="bk-sec"><div class="bk-h"><span class="n">3</span>${L('學員資料', 'About each student')}</div>
      <p class="bk-sub">${L('用來安排教練和雪具。', 'So we can match an instructor and gear.')}</p>${S.members.map(memberCard).join('')}</div>
      <div class="bk-sec"><div class="bk-h"><span class="n">4</span>${L('日期和地點', 'Dates and resort')}</div>
      <div class="bk-row two">
        <label class="fld"><span>${L('第一天上課日期', 'First lesson date')}</span><input type="date" data-k="start" min="${minD}" max="2027-05-06" value="${esc(S.start)}"></label>
        <label class="fld"><span>${L('連續上課天數', 'Days in a row')}</span><select data-k="days">${[1, 2, 3, 4, 5, 6, 7].map(n => `<option value="${n}"${S.days === n ? ' selected' : ''}>${n} ${L('天', n > 1 ? 'days' : 'day')}</option>`).join('')}</select></label>
      </div>
      ${S.course === 'try3' ? `<div class="fld" style="margin-bottom:.6rem"><span>${L('時段', 'Time')}</span><div class="seg" data-k="slot"><button type="button" data-v="am" class="${S.slot !== 'pm' ? 'on' : ''}">${L('上午 9:00–12:00', 'AM 9:00–12:00')}</button><button type="button" data-v="pm" class="${S.slot === 'pm' ? 'on' : ''}">${L('下午 13:00–16:00', 'PM 13:00–16:00')}</button></div></div>` : ''}
      <div class="bk-row two">
        <label class="fld"><span>${L('雪場', 'Resort')}</span><select data-k="resort"><optgroup label="${L('星野TOMAMU・富良野・旭川', 'TOMAMU · Furano · Asahikawa')}">${RESORTS.filter(r => !r[3]).map(r => `<option value="${r[0]}"${S.resort === r[0] ? ' selected' : ''}>${EN ? r[2] : r[1]}</option>`).join('')}</optgroup><optgroup label="${L('北海道西部（合作學校）', 'Western Hokkaido (partner schools)')}">${RESORTS.filter(r => r[3]).map(r => `<option value="${r[0]}"${S.resort === r[0] ? ' selected' : ''}>${EN ? r[2] : r[1]}</option>`).join('')}</optgroup></select></label>
        <label class="fld"><span>${L('教學語言', 'Teaching language')}</span><select data-k="teachLang">${[['中文', '中文 Chinese'], ['English', 'English'], ['日本語', '日本語 Japanese'], ['中英雙語', '中英雙語 Chinese + English']].map(o => `<option value="${o[0]}"${S.teachLang === o[0] ? ' selected' : ''}>${EN ? o[1] : o[0] === 'English' ? '英文' : o[0] === '日本語' ? '日文' : o[0]}</option>`).join('')}</select></label>
      </div>
      <p class="bk-sub" style="margin:-.2rem 0 .6rem">${L('不是連續上課的話，請在備註寫上每一天的日期。', 'Not consecutive days? Write the dates in the note.')}</p>
      <div class="bk-row two">
        <label class="fld"><span>${L('指定教練（選填）', 'Preferred instructor (optional)')}</span><input type="text" data-k="coach" value="${esc(S.coach)}"></label>
        <label class="chk" style="align-self:end"><input type="checkbox" data-k="transfer" ${S.transfer ? 'checked' : ''}> ${L('需要機場接送包車', 'I need an airport transfer')}</label>
      </div></div>`;
  }
  function estSec() {
    const q = quote();
    if (q && q.error) return `<div class="bk-sec bk-est"><div class="bk-h">${L('估價', 'Estimate')}</div><p class="bk-hint" style="margin:0">${L('西部雪場（合作學校）只有3小時和6小時課程，請改選其他課程或雪場。', 'Western resorts (partner schools) offer 3- and 6-hour lessons only. Please choose another course or resort.')}</p></div>`;
    if (!q) return `<div class="bk-sec bk-est"><div class="bk-h">${L('估價', 'Estimate')}</div><p class="bk-sub" style="margin:0">${L('選好日期後會自動算出價格。', 'Pick a date and the price appears here.')}</p>${gBox()}</div>`;
    const R = resortOf();
    return `<div class="bk-sec bk-est"><div class="bk-h">${L('估價', 'Estimate')}</div>
      ${q.lines.map(l => `<div class="l"><span>${md(l.d)}${l.pk ? L('（旺季）', ' (peak)') : ''}</span><span>${l.parts.map(p => '1:' + p.r + ' ' + yen(p.p)).join(' ＋ ')}</span></div>`).join('')}
      <div class="tot"><span>${L('總額', 'Total')}</span><span>${yen(q.total)}</span></div>
      <div class="dep"><span>${L('確認有教練後付 50% 訂金', '50% deposit once we confirm')}</span><span>${yen(Math.round(q.total / 2))}</span></div>
      <p class="note">${R[3] ? L('西部雪場由合作學校上課，價格為合作學校價目表。', 'Western resorts are taught by partner schools at their rates. ') : ''}${L('只含課程費（不含雪票、裝備），整組價格、含稅。送出後不用先付款，我們確認教練排班後才會寄訂金連結。', 'Lesson fee only (no lift tickets or gear), per group, tax included. Nothing to pay now: we send the deposit link after confirming your instructor.')}</p>
      ${gBox()}</div>`;
  }

  function contactSec() {
    return `<div class="bk-sec"><div class="bk-h"><span class="n">5</span>${L('聯絡資料', 'Your details')}</div>
      <div class="bk-row two">
        <label class="fld"><span>${L('代表人姓名', 'Your name')}</span><input type="text" data-k="name" autocomplete="name" value="${esc(S.name)}"></label>
        <label class="fld"><span>Email</span><input type="email" data-k="email" autocomplete="email" value="${esc(S.email)}"></label>
      </div>
      <label class="fld" style="margin-bottom:.6rem"><span>${L('LINE／WhatsApp／WeChat ID（選填）', 'WhatsApp number (optional)')}</span><input type="text" data-k="contact" value="${esc(S.contact)}"></label>
      <label class="fld"><span>${L('備註（身體狀況、不連續的日期、其他需求）', 'Notes (health, non-consecutive dates, anything else)')}</span><textarea data-k="note" rows="3">${esc(S.note)}</textarea></label>
      <label class="chk"><input type="checkbox" data-k="optin" ${S.optin ? 'checked' : ''}> ${L('有開放預約或優惠時，用 Email 通知我', 'Email me when new dates or deals open')}</label>
      <input class="hp" type="text" name="website" tabindex="-1" autocomplete="off" id="bk-hp">
      <p class="err" id="bk-err"></p>
      <button type="button" class="btn-primary bk-submit" id="bk-send">${L('送出預約（不用先付款）→', 'Send booking request (no payment yet) →')}</button>
      <p class="form-note" style="text-align:center">${L('送出後會收到確認信，我們通常 48 小時內確認教練。', "You'll get a confirmation email. We usually confirm your instructor within 48 hours.")}</p></div>`;
  }

  function render() {
    fixCounts();
    const has = S.adults + S.kids > 0 && !(S.course === 'family6' && (!S.adults || !S.kids));
    root.innerHTML = courseSec() + countSec() + (has ? detailSec() + `<div id="bk-est">${estSec()}</div>` + contactSec() : `<p class="bk-hint" style="text-align:center">${L('↑ 先選人數，就會出現下一步。', '↑ Pick the number of students to continue.')}</p>`);
    save();
  }
  const refreshEst = () => { const e = document.getElementById('bk-est'); if (e) e.innerHTML = estSec(); save(); };

  root.addEventListener('click', e => {
    const c = e.target.closest('[data-c]'); if (c) { S.course = c.dataset.c; if (S.course === 'kid6' && !S.kids) S.kids = 1; if (S.course === 'family6') { S.adults = Math.max(1, S.adults); S.kids = Math.max(1, S.kids); } return render(); }
    const inc = e.target.closest('[data-inc]'); if (inc) { S[inc.dataset.inc]++; return render(); }
    const dec = e.target.closest('[data-dec]'); if (dec) { S[dec.dataset.dec]--; return render(); }
    const sb = e.target.closest('.seg button'); if (sb) {
      const seg = sb.parentElement, v = sb.dataset.v;
      if (seg.dataset.k) { S[seg.dataset.k] = v; return render(); }
      const m = S.members[+sb.closest('.bk-mem').dataset.i];
      if (seg.dataset.mk === 'rent') m.rent = v === '1'; else m[seg.dataset.mk] = v;
      return render();
    }
    if (e.target.id === 'bk-send') send();
  });
  root.addEventListener('input', e => {
    const t = e.target;
    if (t.dataset.m) { S.members[+t.closest('.bk-mem').dataset.i][t.dataset.m] = t.value; t.classList.remove('bad'); if (t.dataset.m === 'age') { const g1 = document.getElementById('bk-g1'); if (g1) g1.innerHTML = gBox(); refreshEst(); } return save(); }
    if (t.dataset.k) {
      const k = t.dataset.k;
      S[k] = t.type === 'checkbox' ? t.checked : k === 'days' ? +t.value : t.value;
      t.classList.remove('bad');
      if (k === 'start' || k === 'days' || k === 'resort') { refreshEst(); const g1 = document.getElementById('bk-g1'); if (g1) g1.innerHTML = gBox(); } else save();
    }
  });
  root.addEventListener('change', e => { if (e.target.dataset.m === 'level' || e.target.dataset.k === 'resort' || e.target.dataset.k === 'teachLang') save(); if (e.target.dataset.k === 'days') refreshEst(); });

  function send() {
    const err = document.getElementById('bk-err'); err.textContent = '';
    const bad = []; const mark = sel => { const el = root.querySelector(sel); if (el) el.classList.add('bad'); };
    S.members.forEach((m, i) => {
      const card = `.bk-mem[data-i="${i}"] `;
      const minAge = m.kind === 'kid' ? 3 : 13;
      if (!m.age || +m.age < minAge) { bad.push(L('年齡', 'age')); mark(card + '[data-m="age"]'); }
      if (!m.board) { bad.push(L('單板／雙板', 'ski or snowboard')); mark(card + '[data-mk="board"]'); }
      if (m.rent === null || m.rent === undefined) { bad.push(L('是否代訂雪具', 'rental gear')); mark(card + '[data-mk="rent"]'); }
      if (m.rent) ['height', 'weight', 'shoe'].forEach(f => { if (!m[f]) { bad.push(L('身高／體重／鞋子', 'height / weight / shoe')); mark(card + `[data-m="${f}"]`); } });
    });
    if (!S.start) { bad.push(L('上課日期', 'lesson date')); mark('[data-k="start"]'); }
    const q0 = quote(); if (q0 && q0.error) { bad.push(L('課程和雪場（西部雪場沒有4小時課程）', 'course or resort (no 4-hour lessons at western resorts)')); mark('[data-k="resort"]'); }
    if (!S.name.trim()) { bad.push(L('姓名', 'name')); mark('[data-k="name"]'); }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(S.email.trim())) { bad.push('Email'); mark('[data-k="email"]'); }
    if (bad.length) { err.textContent = L('請填寫：', 'Please fill in: ') + [...new Set(bad)].join(L('、', ', ')); const f = root.querySelector('.bad'); if (f) f.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    const btn = document.getElementById('bk-send'); btn.disabled = true; btn.textContent = L('送出中…', 'Sending…');
    const payload = {
      lang: EN ? 'en' : 'zh', course: S.course, advType: S.advType, slot: S.slot,
      members: S.members.map(m => ({ kind: m.kind, age: +m.age, board: m.board, level: m.level, rent: !!m.rent, height: +m.height || 0, weight: +m.weight || 0, shoe: +m.shoe || 0 })),
      start: S.start, days: S.days, resort: S.resort, teachLang: S.teachLang, transfer: S.transfer, coach: S.coach,
      name: S.name.trim(), email: S.email.trim(), contact: S.contact, note: S.note, optin: S.optin,
      website: (document.getElementById('bk-hp') || {}).value || '',
    };
    fetch(API + '/snowi/lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(() => { try { sessionStorage.removeItem(KEY); localStorage.setItem('snowi-email', payload.email); } catch (_) {} location.href = 'thanks.html' + (EN ? '?lang=en' : ''); })
      .catch(() => { btn.disabled = false; btn.textContent = L('送出預約（不用先付款）→', 'Send booking request (no payment yet) →'); err.innerHTML = L('送出時發生問題，請再試一次，或直接聯繫 <a href="mailto:snowisnowjp@gmail.com">snowisnowjp@gmail.com</a>。', 'Something went wrong. Please try again or email <a href="mailto:snowisnowjp@gmail.com">snowisnowjp@gmail.com</a>.'); });
  }

  // 課程卡片、hero 卡片用：選好課程（可選擇是否捲到預約區）
  window.SnowiBooking = {
    select(course, scroll) {
      if (!COURSES[course]) return;
      S.course = course;
      if (course === 'kid6' && !S.kids) S.kids = 1;
      if (course === 'family6') { S.adults = Math.max(1, S.adults); S.kids = Math.max(1, S.kids); }
      render();
      if (scroll !== false) document.getElementById('booking').scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
  };
  render();
})();
