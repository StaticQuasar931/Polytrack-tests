const q0='7f2a',q1='b19e',q2='d44c',q3='9a01';
  const p0='c3e7',p1='8a14';

  let firestorePromise = null;
  let rankingsSpawnedOnce = window.__polytrackRankingsAnimated === true;
  let rankingsButtonRef = null;
  let localUploadCounter = Number(localStorage.getItem('polytrack-upload-counter') || '0') || 0;
  let nativeMenuButtonsAnimating = false;
  let lastRankedSpawnAt = 0;
  let mainButtonsWereVisible = false;
  let mainButtonsShownAt = 0;
  const GUEST_ID_KEY = 'polytrack-guest-account-id';
  function randomGuestSuffix(){
    try {
      if (window.crypto?.getRandomValues) {
        const buf = new Uint8Array(8);
        window.crypto.getRandomValues(buf);
        return Array.from(buf, (b)=>b.toString(16).padStart(2,'0')).join('');
      }
    } catch {}
    return Math.random().toString(36).slice(2, 12);
  }
  function getOrCreateGuestAccountId(){
    const existing = localStorage.getItem(GUEST_ID_KEY);
    if (existing && /^[a-zA-Z0-9_.:-]{6,128}$/.test(existing)) return existing;
    const created = `guest-${Date.now().toString(36)}-${randomGuestSuffix()}`.slice(0, 128);
    localStorage.setItem(GUEST_ID_KEY, created);
    return created;
  }
  const guestAccountId = getOrCreateGuestAccountId();
  const PROFILE_MAP_KEY = 'polytrack-profile-id-map-v1';
  const LAST_ACTIVE_NAME_KEY = 'polytrack-last-active-name';
  const LAST_ACTIVE_COLORS_KEY = 'polytrack-last-active-colors';
  const PROFILE_NAME_WORD_A = ['swift','neon','alpha','turbo','sonic','pixel','nova','lucky','sunny','frost','ember','quantum','crystal','midnight','solar','lunar','hyper','ultra','aero','rapid','vivid','thunder','cosmic','silver','golden','shadow','arc','vector','iron','onyx','starlit','cobalt','ripple','granite','jungle','desert','arctic','magenta','scarlet','violet','teal','sable','amber','jade','ivory','obsidian','cinder','stellar','orbital','zen','rogue','prime','apex','summit','embered','misty','horizon','aurora','glitch','byte','laser','prism','halo','north','south','east','west','tempo','axle','torque','nitro','clutch','summoner','phantom','eclipse','cyclone','monsoon','titan','pegasus','raven','falcon','lynx','otter','comfy','bouncy','cheery','zippy','daring','brisk','fuzzy','mellow','witty','snappy'];
  const PROFILE_NAME_WORD_B = ['racer','drift','pulse','track','echo','comet','storm','shift','vault','spark','dash','glide','runner','rocket','flare','nexus','voyage','blaze','orbit','flux','drive','streak','zenith','quartz','radar','pilot','charger','phantom','matrix','engine','jumper','hopper','sprinter','raider','seeker','keeper','walker','slider','cruiser','strider','booster','chaser','panther','falcon','otter','fox','rhino','yak','wizard','knight','samurai','sage','ranger','captain','doctor','baron','duke','rookie','veteran','legend','maverick','stomper','breaker','spirit','beacon','anchor','vector','module','kernel','vortex','quasar','galaxy','planet','meteor','asteroid','volcano','tsunami','whirl','tempest','charge','vertex','pixel','bit','byte','gear','piston','engineer','driver','rider','climber','surfer','skater','sniper','ace'];
  const DEFAULT_NAME_BLOCKLIST = ["admin","moderator","owner","staff","support","system","dev","developer","verified","helper","official","security","abuse","abuser","anal","anus","arse","arsehole","ass","assbag","assclown","assface","assfuck","assfucker","asshat","asshole","assholes","asslicker","asswipe","ballsack","bastard","bastards","beaner","bitch","bitches","bitchy","blowjob","blowjobs","bollock","bollocks","boner","boob","boobs","booty","brothel","bullshit","buttfuck","butthole","cameltoe","chink","clit","clitoris","cock","cocks","coon","crap","cum","cumming","cunt","cunts","dick","dicks","dildo","dildos","dipshit","doggystyle","douche","douchebag","dyke","fag","faggot","faggots","feck","fellatio","fingerbang","fuck","fucked","fucker","fuckers","fuckface","fucking","fuckoff","fuckwit","fuk","gangbang","gaylord","genitals","gook","handjob","hardcore","hentai","hitler","hoe","hoes","horny","incest","jackass","jerkoff","jizz","kike","kkk","kunt","lesbo","lesbian","loli","masturbate","masturbation","milf","motherfucker","motherfucking","muff","nazi","nazism","negro","nigga","nigger","niggers","nipple","nipples","nutjob","orgasm","orgy","pedo","pedophile","penis","piss","pissed","pisser","playboy","poon","poop","porn","porno","pornhub","prostitute","pussy","queef","queer","raped","raper","rapist","rape","retard","rimjob","scrotum","sex","sexy","shit","shits","shitty","shota","sissy","skank","slut","sluts","smegma","spic","spunk","strapon","suck","sucks","testicle","threesome","tit","tits","titties","titty","tranny","twat","vag","vagina","vibrator","virgin","voyeur","wank","wanker","whore","whores","wtf","xxx","xrated","yaoi","zoophile","zoophilia","alqaeda","isis","terrorist","swastika","1488","molest","molester","underage","childporn","cp","suicide","killyourself","kys","racist","racism","whitepower","wetback","spick","gimp","cripple","idiot","moron","stupid","dumbass","shithead","cumshot","cumslut","deepthroat","fisting","gangrape","gfy","goatse","groomer","hooker","hotsex","humping","jackoff","motherfucker","nutsack","pecker","peehole","peeing","pussylicking","rectum","scat","semen","sexcam","sexchat","sexworker","shemale","slapper","sodomize","sodomy","tard","teabagging","towelhead","tubgirl","unclefucker","upskirt","urethra","urine","vulva","wigger","willy","yid"];
  let dynamicNameBlocklistPromise = null;

  function readProfileMap(){
    try {
      const raw = localStorage.getItem(PROFILE_MAP_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      return {
        byName: parsed?.byName && typeof parsed.byName === 'object' ? parsed.byName : {},
        bySignature: parsed?.bySignature && typeof parsed.bySignature === 'object' ? parsed.bySignature : {}
      };
    } catch { return { byName:{}, bySignature:{} }; }
  }

  function writeProfileMap(map){
    try { localStorage.setItem(PROFILE_MAP_KEY, JSON.stringify(map)); } catch {}
  }

  function normalizedNameKey(value){
    return String(value || '').trim().toLowerCase().slice(0, 40);
  }

  function makeProfileSignature(payload){
    const colors = String(payload?.carColors || payload?.CarColors || '').trim();
    const carId = String(payload?.car || payload?.carId || payload?.carName || '').trim();
    const sig = [colors, carId].filter(Boolean).join('|').slice(0, 120);
    return sig || '';
  }

  function makeGeneratedProfileId(){
    return `guest-${Date.now().toString(36)}-${randomGuestSuffix()}`.slice(0, 128);
  }

  function makeRandomCarColors(){
    const rand = ()=>Math.floor(Math.random()*256).toString(16).padStart(2,'0');
    return `${rand()}${rand()}${rand()}${rand()}${rand()}${rand()}${rand()}${rand()}${rand()}${rand()}${rand()}${rand()}`.slice(0,24);
  }
  function getOrCreateInitialCarColors(){
    const existing = String(localStorage.getItem(LAST_ACTIVE_COLORS_KEY) || '').replace(/[^0-9a-fA-F]/g,'').slice(0,24);
    if (existing.length >= 24) return existing;
    const created = makeRandomCarColors();
    try { localStorage.setItem(LAST_ACTIVE_COLORS_KEY, created); } catch {}
    return created;
  }

  function resolveProfileAccountId(payload, suggestedId){
    const suggested = String(suggestedId || '').slice(0, 128);
    const signature = makeProfileSignature(payload);
    const map = readProfileMap();
    if (suggested) {
      if (signature) {
        map.bySignature[signature] = suggested;
        writeProfileMap(map);
      }
      return suggested;
    }
    if (signature && map.bySignature[signature]) return map.bySignature[signature];
    const generated = makeGeneratedProfileId();
    if (signature) {
      map.bySignature[signature] = generated;
      writeProfileMap(map);
    }
    return generated;
  }

  const BRAND_FP = `${q0}${q1}${q2}${q3}`;
  const WARN_FP = `${p0}${p1}`;
  const TOTAL_TRACKS = 47;
  const LOG_PREFIX='[polytrack-data]';
  const log=(type,msg,data)=>{
    const rec={ts:Date.now(),type,msg,data:data||null};
    const arr=window.__polytrackDataLog||[]; arr.push(rec); if(arr.length>200) arr.shift(); window.__polytrackDataLog=arr;
    const fn=type==='error'?console.error:type==='warn'?console.warn:console.info; fn(LOG_PREFIX,msg,data||'');
  };

  function getUiLanguage(){
    const raw = String((navigator.languages && navigator.languages[0]) || navigator.language || 'en').toLowerCase();
    return raw.split('-')[0] || 'en';
  }
  const I18N = {
    ranked: { en:'Ranked', es:'Clasificado', fr:'Classé', de:'Rangliste', it:'Classifica', pt:'Ranqueado', ru:'Рейтинг', tr:'Sıralama', pl:'Ranking', nl:'Gerangschikt', sv:'Rankad', no:'Rangert', da:'Rangeret', fi:'Sijoitettu', cs:'Hodnocený', hu:'Rangsorolt', ro:'Clasament', uk:'Рейтинг', ja:'ランク', ko:'랭크', zh:'排位' },
    overallTitle: { en:'Overall Rankings', es:'Clasificación Global', fr:'Classement Global', de:'Gesamtrangliste', it:'Classifica Generale', pt:'Classificação Geral', ru:'Общий рейтинг', tr:'Genel Sıralama', pl:'Ranking Ogólny', ja:'総合ランキング', ko:'종합 랭킹', zh:'总排行榜' },
    help: { en:'Help', es:'Ayuda', fr:'Aide', de:'Hilfe', it:'Aiuto', pt:'Ajuda', ru:'Помощь', tr:'Yardım', pl:'Pomoc', ja:'ヘルプ', ko:'도움말', zh:'帮助' },
    close: { en:'Close', es:'Cerrar', fr:'Fermer', de:'Schließen', it:'Chiudi', pt:'Fechar', ru:'Закрыть', tr:'Kapat', pl:'Zamknij', ja:'閉じる', ko:'닫기', zh:'关闭' },
    loading: { en:'Loading rankings…', es:'Cargando clasificación…', fr:'Chargement du classement…', de:'Lade Rangliste…', it:'Caricamento classifica…', pt:'Carregando classificação…', ru:'Загрузка рейтинга…', tr:'Sıralama yükleniyor…', ja:'ランキングを読み込み中…', ko:'랭킹 불러오는 중…', zh:'正在加载排行榜…' },
    placeholderNote: { en:'Showing placeholder names and placeholder scores until real race data is available.', es:'Mostrando nombres y puntajes de ejemplo hasta que haya datos reales.', fr:'Affichage d’exemples tant que les données réelles ne sont pas disponibles.', de:'Platzhalter werden angezeigt, bis echte Renndaten verfügbar sind.', it:'Mostra dati di esempio finché non sono disponibili dati reali.', pt:'Mostrando dados de exemplo até haver dados reais.', ru:'Показаны примерные данные до появления реальных результатов.', tr:'Gerçek veriler gelene kadar örnek veriler gösteriliyor.', ja:'実データが揃うまでサンプルを表示しています。', ko:'실제 데이터가 생길 때까지 예시를 표시합니다.', zh:'在真实数据可用前显示示例数据。' },
    overallSub: { en:'Ranked score across all tracks. Lower is better. Progress shows tracks played out of 47.', es:'Puntuación clasificada en todas las pistas. Menor es mejor. El progreso muestra pistas jugadas de 47.', fr:'Score classé sur toutes les pistes. Plus bas est meilleur. Progression: pistes jouées sur 47.', de:'Ranglistenwert über alle Strecken. Niedriger ist besser. Fortschritt zeigt gespielte Strecken von 47.', it:'Punteggio classificato su tutte le piste. Più basso è meglio. Progresso: piste giocate su 47.', pt:'Pontuação ranqueada em todas as pistas. Menor é melhor. Progresso: pistas jogadas de 47.' },
    helpBody: { en:'Need help? Contact us via Google Forms or email.', es:'¿Necesitas ayuda? Contáctanos por Google Forms o correo.', fr:'Besoin d\'aide ? Contactez-nous via Google Forms ou email.', de:'Hilfe benötigt? Kontaktiere uns via Google Forms oder E-Mail.', it:'Serve aiuto? Contattaci tramite Google Forms o email.', pt:'Precisa de ajuda? Fale conosco via Google Forms ou email.' },
    helpSmall: { en:'Refresh after updates, keep storage enabled, and verify network access if rankings do not update.', es:'Actualiza después de cambios, mantén el almacenamiento habilitado y verifica la red si no actualiza.', fr:'Actualisez après les changements, gardez le stockage activé et vérifiez le réseau si besoin.', de:'Nach Updates neu laden, Speicher aktiviert lassen und Netzwerkzugriff prüfen, falls es nicht aktualisiert.', it:'Aggiorna dopo le modifiche, mantieni lo storage attivo e verifica la rete se non aggiorna.', pt:'Recarregue após atualizações, mantenha o armazenamento ativo e verifique a rede se não atualizar.' },
    unofficialLine1: { en:'This is an unofficial community recreation made by Static.', es:'Esta es una recreación comunitaria no oficial hecha por Static.', fr:'Ceci est une recréation communautaire non officielle réalisée par Static.', de:'Dies ist eine inoffizielle Community-Neuauflage von Static.' },
    unofficialLine2: { en:'Play the official version at', es:'Juega la versión oficial en', fr:'Jouez à la version officielle sur', de:'Spiele die offizielle Version auf' },
    moreGames: { en:'More Unblocked Games by Static', es:'Más juegos desbloqueados de Static', fr:'Plus de jeux débloqués par Static', de:'Mehr unblockierte Spiele von Static' }
  };
  function tr(key){
    const lang = getUiLanguage();
    const table = I18N[key] || {};
    return table[lang] || table.en || key;
  }
  function tRankedWord(){ return tr('ranked'); }
  function tRankingsTitle(){ return tr('overallTitle'); }
  function normalizeCarColorId(colors){
    const fallback = 'ffffff8ec7ff28346a212b58';
    const cleaned = String(colors || '').replace(/[^0-9a-fA-F]/g,'').toLowerCase();
    return (cleaned + fallback).slice(0, 24);
  }
  function cleanCarId(value){
    return String(value || '').replace(/[^a-zA-Z0-9_.:-]/g, '').slice(0, 64);
  }
  function cleanUserId(value){
    return String(value || '').replace(/[^a-zA-Z0-9_.:-]/g, '').slice(0, 128);
  }
  function carModelPreview(colors, carId='', userId=''){
    const colorId = normalizeCarColorId(colors);
    const safeCarId = cleanCarId(carId);
    const safeUserId = cleanUserId(userId);
    return `<span class="overall-car-model image-container" data-carcolorid="${colorId}" data-carid="${safeCarId}" data-userid="${safeUserId}" title="carcolorid ${colorId}"><img class="show" src="images/car_thumbnail_placeholder.png" alt="car"/><img alt="car render"/></span>`;
  }
  const overallCarRenderCache = new Map();
  function getCarThumbRenderer(){
    if (typeof BT === 'function') return BT;
    if (typeof window.BT === 'function') return window.BT;
    return null;
  }
  function hydrateOverallCarModels(root){
    if (!root) return;
    const renderThumb = getCarThumbRenderer();
    if (!renderThumb) return;
    const nodes = Array.from(root.querySelectorAll('.overall-car-model.image-container'));
    nodes.forEach((node)=>{
      const colorId = normalizeCarColorId(node.dataset.carcolorid || '');
      const carId = cleanCarId(node.dataset.carid || '');
      const key = `${colorId}|${carId}`;
      const imgs = node.querySelectorAll('img');
      const placeholder = imgs[0];
      const rendered = imgs[1];
      if (!placeholder || !rendered) return;
      node.dataset.renderKey = key;
      const cached = overallCarRenderCache.get(key);
      if (cached) {
        rendered.src = cached;
        placeholder.classList.remove('show');
        rendered.classList.add('show');
        return;
      }
      Promise.resolve(renderThumb(colorId, carId || null)).then((src)=>{
        if (!src || node.dataset.renderKey !== key) return;
        overallCarRenderCache.set(key, src);
        rendered.src = src;
        placeholder.classList.remove('show');
        rendered.classList.add('show');
      }).catch(()=>{});
    });
  }


  function isLocalApiCapableHost(){
    const host = String(window.location.hostname || '').toLowerCase();
    return host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local');
  }

  function safePositiveInt(value, fallback=1){
    const n = Number(value);
    return Number.isSafeInteger(n) && n >= 1 ? n : fallback;
  }
  function escapeHtml(value){
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  const REPLAY_FIELD_RE = /(replay|recording|ghost)/i;
  function normalizeReplayPayloadString(value){
    const src = String(value || '');
    if (!src) return '';
    if (src.includes(' ') && !src.includes('\n') && /^[A-Za-z0-9+/=_\-\s]+$/.test(src)) {
      return src.replace(/ /g, '+');
    }
    return src;
  }
  function parseFormEncodedPayload(text){
    const out = {};
    const body = String(text || '');
    if (!body) return out;
    for (const pair of body.split('&')) {
      if (!pair) continue;
      const eqIdx = pair.indexOf('=');
      const rawKey = eqIdx >= 0 ? pair.slice(0, eqIdx) : pair;
      const rawVal = eqIdx >= 0 ? pair.slice(eqIdx + 1) : '';
      let key = rawKey;
      try { key = decodeURIComponent(rawKey.replace(/\+/g, '%20')); } catch {}
      const preservePlus = REPLAY_FIELD_RE.test(key);
      const prepared = preservePlus ? rawVal.replace(/\+/g, '%2B') : rawVal.replace(/\+/g, '%20');
      let val = rawVal;
      try { val = decodeURIComponent(prepared); } catch {}
      out[key] = preservePlus ? normalizeReplayPayloadString(val) : val;
    }
    return out;
  }

  const RECORDING_STORE_KEY = 'polytrack-recording-store-v1';
  function safeRecordingId(value){
    const n = Number(value);
    return Number.isSafeInteger(n) && n >= 1 ? n : null;
  }
  function hashToSafeInt(input){
    const src = String(input || '');
    let h = 2166136261;
    for (let i = 0; i < src.length; i++) {
      h ^= src.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return Math.abs(h >>> 0) % 2147483000 + 1;
  }
  function buildRecordingId(row, fallbackRank){
    const replayData = normalizeReplayPayloadString(String(row?.replay || row?.recording || row?.replayData || ''));
    if (!replayData) return null;
    const explicitId = safeRecordingId(row?.uploadId || row?.id);
    if (explicitId) return explicitId;
    return hashToSafeInt(`${row?.accountId||''}|${row?.trackId||''}|${row?.createdAt||fallbackRank||0}|${row?.replayHash||replayData||''}`);
  }
  function writeRecordingStore(id, payload){
    if (!id || !payload) return;
    try {
      const raw = localStorage.getItem(RECORDING_STORE_KEY);
      const data = raw ? JSON.parse(raw) : {};
      data[String(id)] = {
        recording: normalizeReplayPayloadString(String(payload.recording || payload.replay || payload.replayData || '')),
        frames: safePositiveInt(payload.frames || payload.numberOfFrames || payload.raceTimeFrames || 1, 1),
        verifiedState: Number.isFinite(Number(payload.verifiedState)) ? Number(payload.verifiedState) : 0,
        carColors: String(payload.carColors || payload.CarColors || 'ffffff8ec7ff28346a212b58').slice(0, 64),
        updatedAt: Date.now()
      };
      const keys = Object.keys(data);
      if (keys.length > 800) {
        keys.sort((a,b)=>Number(data[b]?.updatedAt||0)-Number(data[a]?.updatedAt||0));
        for (const k of keys.slice(800)) delete data[k];
      }
      localStorage.setItem(RECORDING_STORE_KEY, JSON.stringify(data));
    } catch {}
  }
  function readRecordingStore(ids){
    try {
      const raw = localStorage.getItem(RECORDING_STORE_KEY);
      const data = raw ? JSON.parse(raw) : {};
      return ids.map((id)=>{
        const rec = data[String(id)];
        if (!rec || typeof rec.recording !== 'string' || !rec.recording) return null;
        return {
          recording: normalizeReplayPayloadString(rec.recording),
          verifiedState: Number.isFinite(Number(rec.verifiedState)) ? Number(rec.verifiedState) : 0,
          frames: safePositiveInt(rec.frames, 1),
          carColors: String(rec.carColors || 'ffffff8ec7ff28346a212b58').slice(0, 64)
        };
      });
    } catch {
      return ids.map(()=>null);
    }
  }

  const LOCAL_RACE_STORE_KEY = 'polytrack-local-race-results-v1';
  function readLocalRaceRows(){
    try {
      const raw = localStorage.getItem(LOCAL_RACE_STORE_KEY);
      const rows = raw ? JSON.parse(raw) : [];
      return Array.isArray(rows) ? rows : [];
    } catch { return []; }
  }
  function writeLocalRaceRows(rows){
    try { localStorage.setItem(LOCAL_RACE_STORE_KEY, JSON.stringify(rows.slice(0, 5000))); } catch {}
  }
  function addLocalRaceRow(row){
    const rows = readLocalRaceRows();
    rows.unshift(row);
    writeLocalRaceRows(rows);
  }

  function enrichLegacyLeaderboardEntries(entries){
    if (!Array.isArray(entries)) return [];
    return entries.map((entry, idx)=>{
      const rank = safePositiveInt(entry?.rank || entry?.position || idx + 1, idx + 1);
      const derivedFrames = Math.max(1, Math.round((Number(entry?.timeMs || 0) || 0) * 0.06));
      const frames = safePositiveInt(entry?.time?.numberOfFrames || entry?.frames || entry?.raceTimeFrames || derivedFrames || 1, 1);
      const userId = String(entry?.userId || entry?.accountId || entry?.id || `user-${rank}`);
      const recordingId = buildRecordingId(entry, rank);
      return {
        id: Number.isSafeInteger(Number(entry?.id)) ? Number(entry.id) : recordingId,
        userId,
        accountId: userId,
        name: String(entry?.name || getLastKnownName(userId) || 'Guest').slice(0, 24),
        carColors: normalizeCarColorId(entry?.carColors || 'ffffff8ec7ff28346a212b58'),
        carColorId: normalizeCarColorId(entry?.carColorId || entry?.carColors || 'ffffff8ec7ff28346a212b58'),
        carId: cleanCarId(entry?.carId || ''),
        verifiedState: Number.isFinite(Number(entry?.verifiedState)) ? Number(entry.verifiedState) : 0,
        rank,
        position: rank,
        frames,
        time: { numberOfFrames: frames },
        timeMs: Number(entry?.timeMs || Math.round((frames*1000)/60)) || Math.round((frames*1000)/60)
      };
    });
  }

  let lastMirrorSig = '';
  let lastMirrorAt = 0;

  function sanitizeDisplayName(value){
    const n = String(value || '').trim().slice(0, 24);
    return n || 'Guest';
  }

  function normalizeNameForCheck(v){
    return String(v || '').toLowerCase().replace(/[^a-z0-9Ѐ-ӿ぀-ヿ一-鿿]+/g, '');
  }

  async function getNameBlocklist(){
    if (dynamicNameBlocklistPromise) return dynamicNameBlocklistPromise;
    dynamicNameBlocklistPromise = (async ()=>{
      const base = new Set(DEFAULT_NAME_BLOCKLIST.map(normalizeNameForCheck).filter(Boolean));
      try {
        const res = await fetch('https://raw.githubusercontent.com/StaticQuasar931/Statics-Live-Chat-2.0/codex/fix-app-logic-and-stability-issues-vd8oso/name-blocklist.js', { cache: 'no-store' });
        if (res.ok) {
          const text = await res.text();
          const matches = text.match(/"([^"\\]{2,})"|'([^'\\]{2,})'/g) || [];
          for (const item of matches) {
            const raw = item.slice(1, -1);
            const normalized = normalizeNameForCheck(raw);
            if (normalized.length >= 2) base.add(normalized);
          }
        }
      } catch {}
      return Array.from(base);
    })();
    return dynamicNameBlocklistPromise;
  }

  function makeFallbackName(seed){
    const hash = Math.abs(Array.from(String(seed || Date.now())).reduce((acc, ch)=>((acc * 33) ^ ch.charCodeAt(0)) >>> 0, 5381));
    const a = PROFILE_NAME_WORD_A[hash % PROFILE_NAME_WORD_A.length];
    const b = PROFILE_NAME_WORD_B[(Math.floor(hash / 13)) % PROFILE_NAME_WORD_B.length];
    return `${a}${b}`.slice(0, 24);
  }

  async function enforceSafeDisplayName(value, accountId=''){
    const clean = sanitizeDisplayName(value);
    const blocklist = await getNameBlocklist();
    const normalized = normalizeNameForCheck(clean);
    const blocked = blocklist.some((w)=>w && normalized.includes(w));
    if (!blocked) return clean;
    return makeFallbackName(accountId || clean) || 'Guest';
  }

  function getLastKnownName(accountId){
    try {
      const raw = localStorage.getItem('polytrack-profile-last-names-v1');
      const map = raw ? JSON.parse(raw) : {};
      return String(map?.[accountId] || '').slice(0,24);
    } catch { return ''; }
  }

  function setLastKnownName(accountId, name){
    try {
      const raw = localStorage.getItem('polytrack-profile-last-names-v1');
      const map = raw ? JSON.parse(raw) : {};
      map[accountId] = sanitizeDisplayName(name);
      localStorage.setItem('polytrack-profile-last-names-v1', JSON.stringify(map));
    } catch {}
  }

  function loadScript(src){
    return new Promise((resolve,reject)=>{
      const existing = document.querySelector(`script[data-ext-src="${src}"]`);
      if (existing){
        if (existing.dataset.loaded==='1') return resolve();
        existing.addEventListener('load', resolve, { once:true });
        existing.addEventListener('error', reject, { once:true });
        return;
      }
      const script = document.createElement('script');
      script.async = true;
      script.src = src;
      script.dataset.extSrc = src;
      script.onload = () => { script.dataset.loaded = '1'; resolve(); };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async function resolveFirebaseConfig(){
    if (window.__polytrackFirebaseConfig) return window.__polytrackFirebaseConfig;
    if (window.POLYTRACK_FIREBASE_CONFIG && window.POLYTRACK_FIREBASE_CONFIG.projectId) {
      window.__polytrackFirebaseConfig = window.POLYTRACK_FIREBASE_CONFIG;
      return window.__polytrackFirebaseConfig;
    }
    try {
      const res = await fetch('./firebase-config.json', { cache: 'no-store' });
      if (res.ok) {
        const cfg = await res.json();
        if (cfg && cfg.projectId && cfg.apiKey && cfg.appId) {
          window.__polytrackFirebaseConfig = cfg;
          return cfg;
        }
      }
    } catch {}
    window.__polytrackFirebaseConfig = FIREBASE_CONFIG;
    return window.__polytrackFirebaseConfig;
  }

  async function db(){
    if (firestorePromise) return firestorePromise;
    firestorePromise = (async ()=>{
      await loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
      await loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js');
      await loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js');
      const cfg = await resolveFirebaseConfig();
      const app = window.firebase.apps?.length ? window.firebase.app() : window.firebase.initializeApp(cfg);
      if (window.firebase?.auth) {
        const auth = app.auth();
        if (!auth.currentUser) {
          try {
            await auth.signInAnonymously();
            log('info','[FB100] Signed in anonymously for Firestore access');
          } catch (error) {
            log('warn','Anonymous auth unavailable; enable Firebase Anonymous Auth for cloud writes', String(error && (error.message || error)));
          }
        }
      }
      const fire = app.firestore();
      try {
        fire.settings({ experimentalAutoDetectLongPolling: true, useFetchStreams: false, merge: true });
      } catch {}
      return fire;
    })();
    return firestorePromise;
  }

  async function ensureFirestoreBootstrap(){
    try {
      const d = await db();
      await d.collection('system').doc('bootstrap').set({
        projectId: (window.__polytrackFirebaseConfig?.projectId || FIREBASE_CONFIG.projectId),
        runtime: MARKER,
        updatedAt: Date.now(),
        source: window.location.origin
      }, { merge: true });
      const overallRef = d.collection('leaderboards_overall').doc('main');
      const snap = await overallRef.get();
      if (!snap.exists) {
        await overallRef.set({ entries: [], updatedAt: Date.now(), seededBy: MARKER }, { merge: true });
      }
      log('info','[FB101] Firestore bootstrap ready');
    } catch (error) {
      const msg = String(error && (error.message || error));
      if (/Missing or insufficient permissions/i.test(msg)) {
        log('error','Firestore bootstrap denied by security rules (enable anonymous auth + publish compatible Firestore rules)', msg);
      } else {
        log('error','Firestore bootstrap failed', msg);
      }
    }
  }

  function ensureStyles(){
    if (document.getElementById('polytrack-ext-style')) return;
    const style = document.createElement('style');
    style.id = 'polytrack-ext-style';
    style.textContent = `
      #overallLeaderboardPanel{display:none;position:fixed;inset:0;z-index:10001;background:rgba(13,17,37,.96);backdrop-filter: blur(4px);padding:18px;overflow-y:auto;color:var(--text-color,#fff);font-family:ForcedSquare,Arial,sans-serif}
      .overall-shell{max-width:1320px;max-height:min(92vh,1080px);overflow-y:auto;margin:0 auto;background:linear-gradient(180deg,var(--surface-color,#28346a),var(--surface-secondary-color,#212b58));border:2px solid rgba(255,255,255,.16);box-shadow:0 12px 36px rgba(0,0,0,.45)}
      .overall-top{display:flex;justify-content:space-between;align-items:center;padding:20px 24px;border-bottom:2px solid rgba(255,255,255,.14)}
      .overall-top h2{margin:0;font-size:44px;font-weight:normal;color:#8ec7ff;letter-spacing:.6px}
      .overall-sub{margin:0;padding:0 24px 16px;color:rgba(255,255,255,.86);font-size:24px;line-height:1.35}
      #closeOverallLeaderboard,#overallHelpBtn{cursor:pointer;transition:transform .12s ease, filter .12s ease, box-shadow .12s ease}
      #closeOverallLeaderboard:hover,#overallHelpBtn:hover{transform:translateY(-1px);filter:brightness(1.08);box-shadow:0 0 12px rgba(142,199,255,.25)}
      .overall-action-btn{min-width:110px;font-size:20px;line-height:34px}
      .overall-action-btn:hover{transform:translateY(-2px);filter:brightness(1.06)}
      #overallLeaderboardList{padding:0 14px 14px;display:flex;flex-direction:column;gap:10px}
      #overallHelpPopup{display:none;position:absolute;inset:0;background:rgba(9,13,30,.78);backdrop-filter:blur(2px);align-items:center;justify-content:center;z-index:3}
      .overall-help-card{max-width:920px;background:linear-gradient(180deg,#24305f,#1a244b);border:1px solid rgba(255,255,255,.2);padding:24px 26px;box-shadow:0 12px 28px rgba(0,0,0,.4)}
      .overall-help-card h3{margin:0 0 12px;font-size:40px;color:#9ed5ff;font-weight:normal}
      .overall-help-card p{margin:0 0 12px;font-size:24px;color:rgba(255,255,255,.94);line-height:1.45}
      .overall-help-card .small{font-size:18px;color:rgba(255,255,255,.74)}
      .overall-help-actions{display:flex;justify-content:flex-end;margin-top:8px}
      #overallHelpClose{cursor:pointer;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.08);color:#fff;padding:8px 14px;font-size:18px}
      .overall-entry{display:grid;grid-template-columns:96px minmax(280px,1.45fr) minmax(210px,1fr) minmax(260px,1fr);gap:10px;align-items:center;padding:14px;background:var(--surface-tertiary-color,#192042);border:1px solid rgba(255,255,255,.1);opacity:0;transform:translateY(8px);animation:overallEntryIn .26s ease forwards}
      .overall-entry.top-1{border-color:rgba(255,231,128,.95);background:linear-gradient(90deg,rgba(255,231,128,.35),rgba(70,56,18,.42));transform-origin:center;box-shadow:0 0 0 1px rgba(255,233,160,.45),0 8px 20px rgba(0,0,0,.25)}
      .overall-entry.top-2{border-color:rgba(205,221,255,.9);background:linear-gradient(90deg,rgba(205,221,255,.22),rgba(45,56,88,.35))}
      .overall-entry.top-3{border-color:rgba(255,191,120,.9);background:linear-gradient(90deg,rgba(255,191,120,.2),rgba(78,46,22,.32))}
      .overall-rank{width:88px;text-align:center;font-size:30px;color:#82beff}
      .overall-entry.top-1 .overall-rank{font-size:36px;color:#ffeeb0}
      .overall-car-model{width:98px;height:44px;border-radius:8px;display:inline-flex;align-items:flex-end;justify-content:center;margin-right:10px;border:1px solid rgba(255,255,255,.3);vertical-align:middle;box-shadow:inset 0 0 14px rgba(0,0,0,.35);overflow:hidden;position:relative;background:rgba(4,9,22,.45)}
      .overall-car-model > img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .14s ease}
      .overall-car-model > img.show{opacity:1}
      .overall-name{font-size:28px;padding:0 10px;white-space:normal;overflow-wrap:anywhere;display:flex;align-items:center}
      .overall-mid{min-width:210px;text-align:center}
      .overall-move{font-size:22px;font-weight:bold}
      .overall-move.up{color:#7CFF8A}
      .overall-move.down{color:#FF7C7C}
      .overall-move.flat{color:#A8A8A8}
      .overall-best{font-size:15px;color:rgba(210,230,255,.82)}
      .overall-stats{text-align:right;min-width:250px}
      .overall-score{font-size:32px;color:#6fe1ff}
      .overall-races{font-size:17px;color:rgba(255,255,255,.78)}
      .staticFunPill{animation:staticGlowPulse 1.8s ease-in-out infinite}.staticFunHover{transition:transform .16s ease, filter .16s ease, box-shadow .16s ease}
      .staticFunHover:hover{transform:translateY(-2px) scale(1.05);filter:brightness(1.18);box-shadow:0 0 18px rgba(255,255,255,0.20),0 0 30px rgba(0,255,255,0.18)}
      .staticFunText{display:inline-block;white-space:nowrap;perspective:600px;animation:staticFloat 2.2s ease-in-out infinite}
      .staticFunChar{display:inline-block;will-change:transform,filter;transform-style:preserve-3d;animation:staticWave 1.6s ease-in-out infinite;background:linear-gradient(90deg,#66f,#6ff,#6f6,#ff6,#f6f,#66f);background-size:300% 100%;background-position:0% 50%;-webkit-background-clip:text;background-clip:text;color:transparent;animation-name:staticWave,staticSheen;animation-duration:1.6s,2.4s;animation-timing-function:ease-in-out,ease-in-out;animation-iteration-count:infinite,infinite}
      #polytrackHelpPanel{display:none;position:fixed;z-index:10002;right:18px;top:18px;max-width:380px;background:rgba(17,22,45,.96);border:1px solid rgba(255,255,255,.2);padding:14px 14px 10px;box-shadow:0 10px 30px rgba(0,0,0,.45)}
      #polytrackHelpPanel h3{margin:0 0 8px;font-size:24px;color:#9ad0ff;font-weight:normal}
      #polytrackHelpPanel p{margin:0 0 8px;font-size:16px;line-height:1.3;color:rgba(255,255,255,.86)}
      #polytrackHelpPanel .help-small{font-size:14px;color:rgba(255,255,255,.62)}
      #polytrackHelpPanel a{color:#b7e2ff}
      #polytrackHelpClose{margin-top:4px;border:1px solid rgba(255,255,255,.24);background:rgba(255,255,255,.08);color:#fff;padding:5px 10px;cursor:pointer}
      @keyframes staticGlowPulse{0%{box-shadow:0 0 0 rgba(255,255,255,0.0),0 0 10px rgba(0,255,255,0.12)}50%{box-shadow:0 0 14px rgba(255,255,255,0.18),0 0 22px rgba(255,0,255,0.18)}100%{box-shadow:0 0 0 rgba(255,255,255,0.0),0 0 10px rgba(0,255,255,0.12)}}
      @keyframes staticSheen{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
      @keyframes staticFloat{0%{transform:translateY(0) scale(1)}50%{transform:translateY(-1px) scale(1.01)}100%{transform:translateY(0) scale(1)}}
      @keyframes staticWave{0%{transform:translateZ(0) rotateY(0deg)}50%{transform:translateZ(14px) rotateY(10deg)}100%{transform:translateZ(0) rotateY(0deg)}}
      @keyframes overallEntryIn{to{opacity:1;transform:translateY(0)}}
    `;
    document.head.appendChild(style);
  }

  function setUnofficialMessage(){
    const warning = document.querySelector('.menu .warning-message');
    if (!warning) return;
    const lang = getUiLanguage();
    const existingLink = warning.querySelector('a[href="https://www.kodub.com/games/polytrack"]');
    const existingText = warning.textContent || '';
    if (warning.dataset.k === WARN_FP && warning.dataset.lang === lang && existingLink && existingText) return;
    warning.dataset.k = WARN_FP;
    warning.dataset.lang = lang;
    warning.className = 'warning-message official-link';
    warning.innerHTML = '';
    const line1 = document.createElement('div');
    line1.textContent = tr('unofficialLine1');
    const line2 = document.createElement('div');
    line2.append(`${tr('unofficialLine2')} `);
    const link = document.createElement('a');
    link.href = 'https://www.kodub.com/games/polytrack';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'kodub.com';
    line2.appendChild(link);
    warning.appendChild(line1);
    warning.appendChild(line2);
  }

  function ensurePersistentInfoBranding(){
    const info = document.querySelector('.menu .info');
    if (!info) return;
    const lang = getUiLanguage();
    if (info.dataset.fp === BRAND_FP && info.dataset.lang === lang && info.querySelector('.staticFunPill')) return;
    info.dataset.fp = BRAND_FP;
    info.dataset.lang = lang;
    info.innerHTML = '';
    const promo = document.createElement('a');
    promo.href = 'https://sites.google.com/view/staticquasar931/gm3z';
    promo.target = '_blank';
    promo.rel = 'noopener noreferrer';
    promo.setAttribute('aria-label','More Unblocked Games by Static');
    promo.className = 'staticFunHover staticFunPill';
    promo.style.cssText = 'display:inline-block;cursor:pointer;pointer-events:auto;user-select:text;font-family:Arial,sans-serif;font-size:22px;font-weight:900;letter-spacing:1px;text-decoration:none;padding:7px 14px;border-radius:12px;border:1px solid rgba(255,255,255,.18);background:rgba(0,0,0,.18);text-shadow:0 0 10px rgba(255,255,255,.2);position:relative;z-index:5;filter:none;backdrop-filter:none;';
    const label=tr('moreGames');
    const textWrap=document.createElement('span');
    textWrap.className='staticFunText';
    textWrap.style.pointerEvents='none';
    for(let i=0;i<label.length;i++){
      const ch=document.createElement('span');
      ch.className='staticFunChar';
      ch.textContent=label[i]===' '?' ':label[i];
      ch.style.animationDelay=`${(i*0.045).toFixed(3)}s, ${(i*0.035).toFixed(3)}s`;
      ch.style.pointerEvents='none';
      textWrap.appendChild(ch);
    }
    promo.appendChild(textWrap);

    const version = document.createElement('a');
    version.href = 'https://www.kodub.com';
    version.target = '_blank';
    version.rel = 'noopener noreferrer';
    version.textContent = 'kodub.com - Version 0.5.2';

    const credit = document.createElement('a');
    credit.href = 'https://opengameart.org/content/sci-fi-theme-1';
    credit.target = '_blank';
    credit.rel = 'noopener noreferrer';
    credit.textContent = 'OpenGameArt.org "Sci-fi Theme" by Maou (CC-BY 4.0)';

    const privacy = document.createElement('a');
    privacy.href = 'https://www.kodub.com/privacy/polytrack';
    privacy.target = '_blank';
    privacy.rel = 'noopener noreferrer';
    privacy.textContent = 'Privacy Policy';

    info.appendChild(promo);
    info.appendChild(version);
    info.appendChild(credit);
    info.appendChild(document.createElement('br'));
    info.appendChild(privacy);
    const container = document.querySelector('.main-buttons-container');
    const rankingsOpen = document.getElementById('overallLeaderboardPanel')?.style?.display === 'block';
    const visible = !!(container && getComputedStyle(container).display !== 'none');
    info.style.display = (visible && !rankingsOpen) ? '' : 'none';
  }

  function ensurePanel(){
    if (document.getElementById('overallLeaderboardPanel')) return;
    const panel = document.createElement('div');
    panel.id = 'overallLeaderboardPanel';
    panel.innerHTML = `<div class="overall-shell" style="position:relative"><div class="overall-top"><h2>${tRankingsTitle()}</h2><div style="display:flex;gap:8px"><button id="overallHelpBtn" class="button overall-action-btn" type="button">${tr('help')}</button><button id="closeOverallLeaderboard" class="button overall-action-btn" type="button">${tr('close')}</button></div></div><p class="overall-sub">${tr('overallSub')}</p><div id="overallLeaderboardList"></div><div id="overallHelpPopup"><div class="overall-help-card"><h3>${tRankingsTitle()} · ${tr('help')}</h3><p>${tr('helpBody')} <a href="mailto:StaticQuasar931Games@gmail.com" style="color:#b7e2ff">StaticQuasar931Games@gmail.com</a>.</p><p class="small">${tr('helpSmall')}</p><div class="overall-help-actions"><button id="overallHelpClose" class="overall-action-btn" type="button">${tr('close')}</button></div></div></div></div>`;
    document.body.appendChild(panel);
    panel.addEventListener('click', (event)=>{ if (event.target === panel) panel.style.display='none'; });
    panel.querySelector('#closeOverallLeaderboard').addEventListener('click', ()=>{ panel.style.display='none'; });
    panel.querySelector('#overallHelpBtn').addEventListener('click', ()=>{
      const pop = panel.querySelector('#overallHelpPopup');
      if (pop) pop.style.display = 'flex';
    });
    panel.querySelector('#overallHelpClose').addEventListener('click', ()=>{
      const pop = panel.querySelector('#overallHelpPopup');
      if (pop) pop.style.display = 'none';
    });
    panel.addEventListener('keydown', (event)=>{
      if (event.key === 'Escape') {
        const pop = panel.querySelector('#overallHelpPopup');
        if (pop && pop.style.display !== 'none') { pop.style.display='none'; event.preventDefault(); return; }
        panel.style.display='none';
        event.preventDefault();
      }
    });
  }

  function normalizeEntries(entries){
    if (!Array.isArray(entries)) return [];
    return entries.map((entry, i) => ({
      rank: Number(entry.rank || i + 1),
      userId: String(entry.userId || entry.accountId || `overall-${i+1}`),
      name: String(entry.name || 'Unknown'),
      score: Math.max(1.000001, Number(entry.score ?? entry.averageRank ?? 1.000001) || 1.000001),
      raceCount: Number(entry.raceCount || 0),
      totalTracks: Number(entry.totalTracks || TOTAL_TRACKS) || TOTAL_TRACKS,
      carColors: normalizeCarColorId(entry.carColors || 'ffffff8ec7ff28346a212b58'),
      carId: String(entry.carId || '').slice(0, 64),
      carColorId: normalizeCarColorId(entry.carColors || 'ffffff8ec7ff28346a212b58'),
      bestTrackId: String(entry.bestTrackId || ''),
      bestTrackRank: Number(entry.bestTrackRank || 0) || 0,
      movement: Number(entry.movement || 0) || 0
    })).sort((a,b)=>a.rank-b.rank).slice(0, 50);
  }


  function computeTrackTopEntries(rows, trackId, limit=10){
    const bestByUser = new Map();
    for (const row of rows) {
      if (String(row.trackId || '') !== String(trackId || '')) continue;
      const userId = String(row.accountId || row.userId || '').slice(0, 128);
      if (!userId) continue;
      const parsedFrames = safePositiveInt(row.frames || row.raceTimeFrames || row.time?.numberOfFrames || 0, 0);
      const parsedTimeMs = Number(row.timeMs || 0);
      const timeMs = Number.isFinite(parsedTimeMs) && parsedTimeMs > 0 ? parsedTimeMs : (parsedFrames > 0 ? Math.round((parsedFrames * 1000) / 60) : 0);
      if (!Number.isFinite(timeMs) || timeMs <= 0) continue;
      const prev = bestByUser.get(userId);
      if (!prev || timeMs < prev.timeMs) {
        bestByUser.set(userId, {
          accountId: userId,
          userId,
          name: sanitizeDisplayName(row.name || getLastKnownName(userId) || 'Guest'),
          timeMs,
          raceTimeFrames: Number(row.raceTimeFrames || 0) || null,
          frames: safePositiveInt(parsedFrames || Math.round((timeMs * 60) / 1000), 1),
          verifiedState: Number.isFinite(Number(row.verifiedState)) ? Number(row.verifiedState) : 0,
          replayHash: row.replayHash || null,
          carId: row.carId || null,
          carColors: normalizeCarColorId(row.carColors || ''),
          createdAt: Number(row.createdAt || 0),
          id: buildRecordingId(row, bestByUser.size + 1)
        });
      }
    }
    return Array.from(bestByUser.values())
      .sort((a,b)=>a.timeMs-b.timeMs)
      .slice(0, limit)
      .map((entry, idx)=>({ rank: idx+1, ...entry }));
  }

  async function hydrateDisplayNames(entries){
    const out = enrichLegacyLeaderboardEntries(entries).map((entry)=>({ ...entry, id: safeRecordingId(entry.id) || safeRecordingId(entry.uploadId) || null }));
    try {
      const d = await db();
      await Promise.all(out.slice(0, 100).map(async (entry)=>{
        const id = String(entry.userId || entry.accountId || '').slice(0, 128);
        if (!id) return;
        const snap = await d.collection('profiles_public').doc(id).get();
        const profile = snap.data() || {};
        const n = sanitizeDisplayName(profile.name || getLastKnownName(id) || entry.name || 'Guest');
        entry.name = n;
        setLastKnownName(id, n);
      }));
    } catch {}
    return out;
  }

  async function getTrackEntries(trackId, limit=10){
    let entries = [];
    try {
      const d = await db();
      const doc = await d.collection('leaderboards_track').doc(String(trackId)).get();
      const data = doc.data() || {};
      entries = Array.isArray(data.entries) ? data.entries : [];
      const snap = await d.collection('race_results').orderBy('createdAt','desc').limit(3000).get();
      const cloudRows = snap.docs.map((x)=>x.data() || {});
      const computed = computeTrackTopEntries(cloudRows, trackId, Math.max(100, limit));
      if (computed.length) entries = computed;
      if (entries.length) {
        d.collection('leaderboards_track').doc(String(trackId)).set({ trackId: String(trackId), entries, updatedAt: Date.now() }, { merge:true }).catch(()=>{});
      }
    } catch {
      const localRows = readLocalRaceRows().filter((row)=>String(row.trackId||'')===String(trackId||''));
      entries = computeTrackTopEntries(localRows, trackId, Math.max(100, limit));
    }
    const ranked = entries
      .sort((a,b)=>Number(a.timeMs||Infinity)-Number(b.timeMs||Infinity))
      .map((entry, idx)=>({ ...entry, rank: idx + 1, position: idx + 1 }));
    const hydrated = await hydrateDisplayNames(ranked);
    return hydrated.slice(0, limit);
  }

  function computeOverallFromRaceRows(rows){
    const bestByTrackAndUser = new Map();
    for (const row of rows) {
      const userId = String(row.accountId || row.userId || '').slice(0, 128);
      const trackId = String(row.trackId || '').slice(0, 80);
      if (!userId || !trackId) continue;
      const parsedFrames = safePositiveInt(row.frames || row.raceTimeFrames || row.time?.numberOfFrames || 0, 0);
      const parsedTimeMs = Number(row.timeMs || 0);
      const timeMs = Number.isFinite(parsedTimeMs) && parsedTimeMs > 0 ? parsedTimeMs : (parsedFrames > 0 ? Math.round((parsedFrames * 1000) / 60) : 0);
      if (!Number.isFinite(timeMs) || timeMs <= 0) continue;
      const key = `${trackId}::${userId}`;
      const prev = bestByTrackAndUser.get(key);
      if (!prev || timeMs < prev.timeMs) {
        bestByTrackAndUser.set(key, {
          userId,
          name: String(row.name || 'Guest').slice(0,24),
          trackId,
          timeMs,
          createdAt: Number(row.createdAt || 0),
          id: buildRecordingId(row, bestByTrackAndUser.size + 1),
          carId: row.carId || null,
          carColors: normalizeCarColorId(row.carColors || '')
        });
      }
    }

    const tracks = new Map();
    for (const row of bestByTrackAndUser.values()) {
      if (!tracks.has(row.trackId)) tracks.set(row.trackId, []);
      tracks.get(row.trackId).push(row);
    }

    const userAgg = new Map();
    for (const [trackId, entries] of tracks.entries()) {
      entries.sort((a,b)=>a.timeMs-b.timeMs);
      entries.forEach((entry, idx)=>{
        const rank = idx + 1;
        const cur = userAgg.get(entry.userId) || { userId: entry.userId, name: entry.name, carColors: entry.carColors || null, carId: entry.carId || null, rankSum:0, tracks:new Set(), bestTrackId:null, bestTrackRank:9999 };
        cur.name = entry.name || cur.name;
        cur.carColors = normalizeCarColorId(entry.carColors || cur.carColors || '');
        cur.carId = entry.carId || cur.carId;
        cur.rankSum += rank;
        cur.tracks.add(trackId);
        if (rank < cur.bestTrackRank) { cur.bestTrackRank = rank; cur.bestTrackId = trackId; }
        userAgg.set(entry.userId, cur);
      });
    }

    const totalTracks = Math.max(TOTAL_TRACKS, tracks.size || 1);
    const out = Array.from(userAgg.values()).map((u)=>{
      const played = u.tracks.size;
      const avgRank = u.rankSum / Math.max(played, 1);
      const coverage = Math.min(1, played / totalTracks);
      const fieldWeight = 1 - Math.min(0.25, coverage * 0.12);
      const trackDepthBonus = 1 / (1 + Math.log2(1 + played));
      const uidTiebreak = ((String(u.userId).split('').reduce((acc, ch)=>acc + ch.charCodeAt(0), 0) % 997) + 1) / 1000000;
      const score = Math.max(1.000001, 1 + (Math.max(0, avgRank - 1) * fieldWeight) + (trackDepthBonus * 0.2) + uidTiebreak);
      return { userId: u.userId, name: getLastKnownName(u.userId) || u.name, carId: String(u.carId || '').slice(0,64) || null, carColors: normalizeCarColorId(u.carColors || 'ffffff8ec7ff28346a212b58'), carColorId: normalizeCarColorId(u.carColors || 'ffffff8ec7ff28346a212b58'), score, raceCount: played, totalTracks, bestTrackId: u.bestTrackId || null, bestTrackRank: Number(u.bestTrackRank || 0) || 0 };
    }).sort((a,b)=>a.score-b.score || b.raceCount-a.raceCount || String(a.userId).localeCompare(String(b.userId)))
      .slice(0,50)
      .map((row, idx)=>({ rank: idx + 1, ...row }));
    return out;
  }

  function annotateOverallMovement(entries){
    let prevMap = {};
    try { prevMap = JSON.parse(localStorage.getItem('polytrack-overall-prev-ranks-v1') || '{}') || {}; } catch {}
    const out = entries.map((e)=>{
      const prev = Number(prevMap[e.userId] || e.rank);
      return { ...e, movement: prev - e.rank };
    });
    try {
      const next = {};
      for (const e of out) next[e.userId] = e.rank;
      localStorage.setItem('polytrack-overall-prev-ranks-v1', JSON.stringify(next));
    } catch {}
    return out;
  }

  async function hydrateOverallProfiles(entries){
    const out = normalizeEntries(entries || []);
    if (!out.length) return out;
    try {
      const d = await db();
      await Promise.all(out.slice(0, 80).map(async (entry)=>{
        const id = String(entry.userId || entry.accountId || '').slice(0, 128);
        if (!id) return;
        const snap = await d.collection('profiles_public').doc(id).get();
        const profile = snap.data() || {};
        if (profile.name) {
          entry.name = sanitizeDisplayName(profile.name || entry.name || 'Guest');
          setLastKnownName(id, entry.name);
        }
        if (profile.carColors) {
          entry.carColors = normalizeCarColorId(profile.carColors);
          entry.carColorId = entry.carColors;
        }
        if (!entry.carId && profile.carId) entry.carId = String(profile.carId).slice(0, 64);
      }));
    } catch {}
    return out.map((entry)=>({
      ...entry,
      carColors: normalizeCarColorId(entry.carColors),
      carColorId: normalizeCarColorId(entry.carColors)
    }));
  }

  async function fetchOverallEntries(){
    let cloudRows = [];
    let direct = [];
    try {
      const d = await db();
      const snap = await d.collection('leaderboards_overall').doc('main').get();
      const data = snap.data() || {};
      direct = normalizeEntries(data.entries || []);
      const racesSnap = await d.collection('race_results').orderBy('createdAt','desc').limit(5000).get();
      cloudRows = racesSnap.docs.map((doc)=>doc.data() || {});
      const computed = normalizeEntries(computeOverallFromRaceRows(cloudRows));
      const best = computed.length ? computed : direct;
      if (computed.length) {
        d.collection('leaderboards_overall').doc('main').set({ entries: computed, updatedAt: Date.now(), seededBy: MARKER }, { merge: true }).catch(()=>{});
      }
      const hydrated = await hydrateOverallProfiles(best);
      return annotateOverallMovement(hydrated);
    } catch (error) {
      if (isLocalApiCapableHost()) {
        try {
          const res = await fetch('/api/overall-leaderboard', { cache: 'no-store' });
          if (res.ok) {
            const data = await res.json();
            const hydrated = await hydrateOverallProfiles(data.entries || []);
            return annotateOverallMovement(hydrated);
          }
        } catch {}
      }
      const localRows = readLocalRaceRows();
      if (localRows.length) {
        const hydrated = await hydrateOverallProfiles(computeOverallFromRaceRows(localRows));
        return annotateOverallMovement(hydrated);
      }
      console.warn('Failed to load overall leaderboard:', error);
      return direct || [];
    }
  }

  function movementMarkup(value){
    const movement = Number(value || 0) || 0;
    if (movement > 0) return `<span class="overall-move up">&#9650; +${movement}</span>`;
    if (movement < 0) return `<span class="overall-move down">&#9660; ${Math.abs(movement)}</span>`;
    return '<span class="overall-move flat">&#9679; 0</span>';
  }

  function bestTrackMarkup(entry){
    const bestRank = Number(entry?.bestTrackRank || 0) || 0;
    const bestTrackId = String(entry?.bestTrackId || '');
    if (bestRank > 0 && bestTrackId) {
      return `Best #${bestRank} - ${escapeHtml(bestTrackId.slice(0, 10))}`;
    }
    return 'Best track: N/A';
  }

  function renderEntryRow(entry, index, showTopHint=false){
    const normalized = normalizeEntries([entry]);
    const row = normalized.length ? normalized[0] : { rank: index + 1, name: 'Guest', score: 1.000001, raceCount: 0, totalTracks: TOTAL_TRACKS, carColorId: normalizeCarColorId('') };
    const rank = Number(row?.rank || index + 1) || (index + 1);
    const score = Number(row?.score || 1.000001) || 1.000001;
    const races = Number(row?.raceCount || 0) || 0;
    const totalTracks = Number(row?.totalTracks || TOTAL_TRACKS) || TOTAL_TRACKS;
    const safeName = escapeHtml(row?.name || 'Guest');
    const safeColorId = normalizeCarColorId(row?.carColorId || row?.carColors || '');
    const safeCarId = cleanCarId(row?.carId || '');
    const safeUserId = cleanUserId(row?.userId || row?.accountId || '');
    const best = bestTrackMarkup(row);
    const move = movementMarkup(row?.movement || 0);
    const extra = showTopHint ? '<div style="font-size:13px;color:rgba(225,225,225,.9);margin-top:2px;">This could be you</div>' : '';
    return `<div class="overall-entry ${rank===1?'top-1':rank===2?'top-2':rank===3?'top-3':''}" data-carcolorid="${safeColorId}" style="animation-delay:${(index*0.04).toFixed(2)}s"><span class="overall-rank">#${rank}</span><span class="overall-name">${carModelPreview(safeColorId, safeCarId, safeUserId)}${safeName}${extra}</span><div class="overall-mid">${move}<div class="overall-best">${best}</div></div><div class="overall-stats"><div class="overall-score">${score.toFixed(3)}</div><div class="overall-races">${races}/${totalTracks} tracks</div></div></div>`;
  }

  function renderEntries(entries){
    const listEl = document.getElementById('overallLeaderboardList');
    if (!listEl) return;
    if (!entries.length){
      const placeholders = [
        { rank:1, name:'Placeholder Driver', carColors:'8ec7ff', score:1.000, raceCount:12, totalTracks:47 },
        { rank:2, name:'Sample Racer', carColors:'ff9f43', score:1.012, raceCount:11, totalTracks:47 },
        { rank:3, name:'Demo Pilot', carColors:'7bed9f', score:1.026, raceCount:10, totalTracks:47 },
        { rank:4, name:'Test Chassis', carColors:'70a1ff', score:1.040, raceCount:9, totalTracks:47 },
        { rank:5, name:'Ghost Entry', carColors:'eccc68', score:1.052, raceCount:8, totalTracks:47 }
      ];
      listEl.innerHTML = `<div class="overall-entry"><span class="overall-name">${tr('placeholderNote')}</span></div>${placeholders.map((entry,index)=>renderEntryRow(entry, index, entry.rank===1)).join('')}`;
      hydrateOverallCarModels(listEl);
      return;
    }
    listEl.innerHTML = entries.map((entry,index)=>renderEntryRow(entry, index, false)).join('');
    hydrateOverallCarModels(listEl);
  }

  async function openPanel(){
    const panel = document.getElementById('overallLeaderboardPanel');
    const listEl = document.getElementById('overallLeaderboardList');
    if (!panel || !listEl) return;
    panel.style.display='block';
    listEl.innerHTML = `<div class="overall-entry"><span class="overall-name">${tr('loading')}</span></div>`;
    renderEntries(await fetchOverallEntries());
  }

  function nextUploadId(){
    localUploadCounter += 1;
    localStorage.setItem('polytrack-upload-counter', String(localUploadCounter));
    return localUploadCounter;
  }

  function parseTarget(target){
    try { return new URL(String(target || ''), window.location.href); }
    catch { return null; }
  }

  function makeUserPayload(){
    const stickyName = sanitizeDisplayName(localStorage.getItem(LAST_ACTIVE_NAME_KEY) || 'Guest');
    const stickyColors = getOrCreateInitialCarColors();
    const stickyAccountId = String(localStorage.getItem('polytrack-active-account-id') || guestAccountId || '').slice(0,128);
    const accountId = resolveProfileAccountId({ name: stickyName, nickname: stickyName, carColors: stickyColors, accountId: stickyAccountId }, stickyAccountId);
    return {
      id: 1,
      Id: 1,
      userId: accountId,
      accountId,
      userTokenHash: accountId,
      tokenHash: accountId,
      name: stickyName,
      nickname: stickyName,
      carColors: stickyColors,
      CarColors: stickyColors,
      isVerifier:false,
      IsVerifier:false,
      total:1,
      Total:1,
      uploadId:null
    };
  }

  function makeLeaderboardPayload(method, entries=[], position=1, previousPosition=1, forcedUploadId=null, forcedUserEntryId=null, forcedUserEntry=null){
    const normalizedEntries = enrichLegacyLeaderboardEntries(entries);
    const pos = safePositiveInt(position, 1);
    const prevPos = safePositiveInt(previousPosition, pos);
    const isPost = String(method).toUpperCase() === 'POST';
    const displayPos = isPost ? prevPos : pos;
    const resolvedUploadId = isPost ? (safeRecordingId(forcedUploadId) || nextUploadId()) : null;
    const explicitUser = forcedUserEntry && typeof forcedUserEntry === 'object' ? forcedUserEntry : null;
    const sourceUser = explicitUser || normalizedEntries.find((e)=>String(e.accountId||e.userId||'')===String(forcedUserEntryId||'')) || null;
    const base = {
      entries: normalizedEntries,
      Entries: normalizedEntries,
      total: Math.max(1, normalizedEntries.length || 1),
      Total: Math.max(1, normalizedEntries.length || 1),
      position: displayPos,
      Position: displayPos,
      newPosition: pos,
      NewPosition: pos,
      oldPosition: prevPos,
      OldPosition: prevPos,
      previousPosition: prevPos,
      PreviousPosition: prevPos,
      positionChange: displayPos - pos,
      uploadId: resolvedUploadId,
      success: true,
      verifiedState: 0,
      entry: sourceUser || normalizedEntries[0] || null,
      userEntry: null
    };
    if (sourceUser) {
      const sourceId = safeRecordingId(sourceUser.id) || safeRecordingId(sourceUser.uploadId) || resolvedUploadId;
      base.userEntry = { id: sourceId, position: displayPos, newPosition: pos, frames: sourceUser.frames || sourceUser.time?.numberOfFrames || 1 };
    } else if (resolvedUploadId) {
      base.userEntry = { id: resolvedUploadId, position: displayPos, newPosition: pos, frames: 1 };
    }
    return base;
  }

  function shouldMock(urlObj){
    if (!urlObj) return false;
    const path = urlObj.pathname;
    const isLegacyPath = path === '/user' || path === '/leaderboard' || path === '/recordings';
    if (!isLegacyPath) return false;
    const host = String(urlObj.host || '').toLowerCase();
    if (host === window.location.host.toLowerCase()) return true;
    return host === 'vps.kodub.com' || host.endsWith('.kodub.com') || host === 'kodub.com';
  }

  async function mockPayload(urlObj, method, body){
    log('info','[NET100] mock request',{path:urlObj.pathname,method:String(method||'GET').toUpperCase()});
    if (urlObj.pathname === '/user') {
      if (String(method).toUpperCase() === 'POST') {
        log('info','[NET201] /user POST intercepted');
        const payload = parsePayload(body) || {};
        const accountId = resolveProfileAccountId(payload, String(payload.userTokenHash || payload.userId || payload.accountId || guestAccountId || '').slice(0,128));
        const safeName = await enforceSafeDisplayName(payload.name || payload.nickname || localStorage.getItem(LAST_ACTIVE_NAME_KEY) || 'Guest', accountId);
        const safeColors = String(payload.carColors || payload.CarColors || localStorage.getItem(LAST_ACTIVE_COLORS_KEY) || '0,0,0,0,0,0').slice(0,64);
        try {
          localStorage.setItem(LAST_ACTIVE_NAME_KEY, safeName);
          localStorage.setItem(LAST_ACTIVE_COLORS_KEY, safeColors);
        } catch {}
        setLastKnownName(accountId, safeName);
        try { localStorage.setItem('polytrack-active-account-id', accountId); } catch {}
        try {
          const rows = readLocalRaceRows();
          let changed = false;
          for (const row of rows) {
            if (String(row.accountId||row.userId||'') === String(accountId)) {
              row.name = safeName;
              row.carColors = safeColors;
              changed = true;
            }
          }
          if (changed) writeLocalRaceRows(rows);
        } catch {}
        try {
          const d = await db();
          const nowTs = Date.now();
          log('info','[FB202] profiles_public.set start',{accountId});
          await d.collection('profiles_public').doc(accountId).set({ accountId, name: safeName, carColors: safeColors, updatedAt: nowTs }, { merge: true });
          log('info','[FB202] profiles_public.set ok',{accountId});
          try {
            const rs = await d.collection('race_results').orderBy('createdAt','desc').limit(5000).get();
            const rows = rs.docs.map((x)=>x.data()||{}).filter((r)=>String(r.accountId||r.userId||'')===String(accountId));
            const trackIds = Array.from(new Set(rows.map((r)=>String(r.trackId||'')).filter(Boolean)));
            for (const tid of trackIds) {
              const trackSnap = await d.collection('race_results').orderBy('createdAt','desc').limit(5000).get();
              const trackRows = trackSnap.docs.map((x)=>x.data()||{}).filter((r)=>String(r.trackId||'')===String(tid));
              const top = computeTrackTopEntries(trackRows, tid, 100);
              if (top.length) await d.collection('leaderboards_track').doc(tid).set({ trackId: tid, entries: top, updatedAt: nowTs }, { merge: true });
            }
            const allSnap = await d.collection('race_results').orderBy('createdAt','desc').limit(5000).get();
            const overallEntries = normalizeEntries(computeOverallFromRaceRows(allSnap.docs.map((x)=>x.data()||{})));
            await d.collection('leaderboards_overall').doc('main').set({ entries: overallEntries, updatedAt: nowTs, seededBy: MARKER }, { merge: true });
            log('info','[FB206] profile rename propagated',{accountId,trackCount:trackIds.length});
          } catch (propErr) {
            log('warn','[FB406] profile propagation skipped', String(propErr && (propErr.message || propErr)));
          }
        } catch (err) { log('warn','[FB402] profiles_public.set failed', String(err && (err.message || err))); }
      }
      return makeUserPayload();
    }
    if (urlObj.pathname === '/leaderboard') {
      const hinted = parsePayload(body) || {};
      const trackId = String(urlObj.searchParams.get('trackId') || hinted.trackId || '').slice(0,80);
      if (!trackId) return makeLeaderboardPayload(method);
      let mirrorMeta = null;
      const amount = Math.min(100, Number(urlObj.searchParams.get('amount') || 20) || 20);
      const scanLimit = Math.max(200, amount);
      let preEntries = [];
      if (String(method).toUpperCase() === 'POST') {
        preEntries = await getTrackEntries(trackId, scanLimit).catch(()=>[]);
        log('info','[NET202] /leaderboard POST intercepted',{trackId});
        try { mirrorMeta = await mirrorRaceResult(urlObj.toString(), body); } catch {}
      }
      const accountId = resolveProfileAccountId(hinted, String(urlObj.searchParams.get('userTokenHash') || hinted.userTokenHash || hinted.userId || hinted.accountId || mirrorMeta?.accountId || localStorage.getItem('polytrack-active-account-id') || guestAccountId));
      const entries = await getTrackEntries(trackId, amount).catch(()=>[]);
      const fullEntries = amount >= scanLimit ? entries : await getTrackEntries(trackId, scanLimit).catch(()=>entries);
      const mine = fullEntries.find((e)=>String(e.accountId||'')===String(accountId||''));
      const prevMine = preEntries.find((e)=>String(e.accountId||'')===String(accountId||''));
      const fallbackPos = Math.max(1, fullEntries.length + 1);
      const myPos = mine ? safePositiveInt(mine?.rank || mine?.position || fallbackPos, fallbackPos) : fallbackPos;
      const prevPos = prevMine ? safePositiveInt(prevMine?.rank || prevMine?.position || myPos, myPos) : myPos;
      return makeLeaderboardPayload(method, entries, myPos, prevPos, mirrorMeta?.uploadId || null, accountId, mine);
    }

    if (urlObj.pathname === '/recordings') {
      if (String(method).toUpperCase() === 'POST') {
        const payload = parsePayload(body) || {};
        const recId = safeRecordingId(payload.recordingId || payload.id || payload.uploadId) || nextUploadId();
        const recData = normalizeReplayPayloadString(String(payload.recording || payload.replay || payload.replayData || payload.data || ''));
        const frames = safePositiveInt(payload.frames || payload.numberOfFrames || payload.raceTimeFrames || 1, 1);
        const recColors = String(payload.carColors || payload.CarColors || localStorage.getItem(LAST_ACTIVE_COLORS_KEY) || '').slice(0,64) || null;
        writeRecordingStore(recId, { recording: recData, frames, verifiedState: Number(payload.verifiedState||0)||0, carColors: recColors || undefined });
        log('info','[FB211] recordings POST normalized',{recordingId:recId,frames,bytes:recData.length,carColors:recColors});
        try {
          const d = await db();
          const q = await d.collection('race_results').where('uploadId','==',recId).limit(10).get();
          await Promise.all((q.docs||[]).map((doc)=>doc.ref.set({ replay: recData, raceTimeFrames: frames, carColors: recColors || doc.data()?.carColors || null }, { merge:true })));
          log('info','[FB212] recordings POST upserted',{recordingId:recId,matched:(q.docs||[]).length});
        } catch (error) {
          log('warn','[FB412] recordings POST firestore upsert failed', String(error && (error.message || error)));
        }
        return { success:true, recordingId:recId };
      }
      const ids = String(urlObj.searchParams.get('recordingIds') || '').split(',').map((x)=>safeRecordingId(x)).filter(Boolean);
      const fromLocal = readRecordingStore(ids);
      if (ids.length && fromLocal.some((x)=>x)) return fromLocal;
      try {
        const d = await db();
        const snaps = await Promise.all(ids.map((id)=>d.collection('race_results').where('uploadId','==',id).limit(1).get()));
        return snaps.map((snap)=>{
          const row = snap?.docs?.[0]?.data?.() || null;
          if (!row || !String(row.replay || '')) return null;
          return {
            recording: normalizeReplayPayloadString(String(row.replay || '')),
            verifiedState: Number.isFinite(Number(row.verifiedState)) ? Number(row.verifiedState) : 0,
            frames: safePositiveInt(row.frames || row.raceTimeFrames || Math.round((Number(row.timeMs||0) * 60) / 1000), 1),
            carColors: String(row.carColors || 'ffffff8ec7ff28346a212b58').slice(0,64)
          };
        });
      } catch (error) {
        log('warn','[FB407] recordings lookup failed', String(error && (error.message || error)));
        return ids.map(()=>null);
      }
    }

    return { ok: true };
  }

  function parsePayload(raw){
    if (!raw) return null;
    if (typeof raw === 'object' && !(raw instanceof ArrayBuffer) && !(raw instanceof Uint8Array)) {
      if (typeof FormData !== 'undefined' && raw instanceof FormData) {
        const out = {};
        for (const [k,v] of raw.entries()) out[k] = typeof v === 'string' ? v : String(v);
        for (const key of Object.keys(out)) if (REPLAY_FIELD_RE.test(key)) out[key] = normalizeReplayPayloadString(out[key]);
        return out;
      }
      if (raw instanceof URLSearchParams) {
        const out = {};
        for (const [k,v] of raw.entries()) out[k] = REPLAY_FIELD_RE.test(k) ? normalizeReplayPayloadString(v) : v;
        return out;
      }
      const out = { ...raw };
      for (const key of Object.keys(out)) if (REPLAY_FIELD_RE.test(key)) out[key] = normalizeReplayPayloadString(out[key]);
      return out;
    }
    try {
      const decoded = typeof raw === 'string' ? raw : new TextDecoder().decode(raw);
      if (decoded.includes('=') && !decoded.trim().startsWith('{')) {
        const form = parseFormEncodedPayload(decoded);
        if (Object.keys(form).length) return form;
      }
      const json = JSON.parse(decoded);
      if (json && typeof json === 'object') {
        for (const key of Object.keys(json)) if (REPLAY_FIELD_RE.test(key)) json[key] = normalizeReplayPayloadString(json[key]);
      }
      return json;
    } catch { return null; }
  }

  async function mirrorRaceResult(url, body){
    const payload = parsePayload(body); if (!payload) return;
    const hintedAccountId = String(payload.userTokenHash || payload.userId || payload.tokenHash || payload.accountId || localStorage.getItem('polytrack-active-account-id') || guestAccountId || '').slice(0,128);
    const accountId = resolveProfileAccountId(payload, hintedAccountId);
    const trackId = String(payload.trackId || '').slice(0,80);
    let name = sanitizeDisplayName(payload.name || payload.nickname || localStorage.getItem(LAST_ACTIVE_NAME_KEY) || 'Player');
    const known = getLastKnownName(accountId);
    if ((!name || name === 'Deleted') && known) name = known;
    name = await enforceSafeDisplayName(name, accountId);
    setLastKnownName(accountId, name);
    try { localStorage.setItem('polytrack-active-account-id', accountId); } catch {}
    const directFrames = safePositiveInt(payload.frames || payload.numberOfFrames || payload.raceTimeFrames || payload.time?.numberOfFrames || 0, 0);
    const maybeTimeMs = Number(payload.timeMs || 0);
    const maybeTime = Number(payload.time || 0);
    const maybeTotal = Number(payload.total || 0);
    const heuristicFrames = directFrames || ((Number.isSafeInteger(maybeTime) && maybeTime > 0 && maybeTime < 20000) ? maybeTime : 0) || ((Number.isSafeInteger(maybeTotal) && maybeTotal > 0 && maybeTotal < 20000) ? maybeTotal : 0);
    const frames = safePositiveInt(heuristicFrames || (Number.isFinite(maybeTimeMs) && maybeTimeMs > 0 ? Math.round((maybeTimeMs * 60) / 1000) : 0) || (Number.isFinite(maybeTime) && maybeTime > 0 ? Math.round((maybeTime * 60) / 1000) : 0), 0);
    const timeMs = Number.isFinite(maybeTimeMs) && maybeTimeMs > 0
      ? maybeTimeMs
      : (Number.isFinite(maybeTime) && maybeTime > 60000
          ? maybeTime
          : (Number.isFinite(maybeTotal) && maybeTotal > 60000
              ? maybeTotal
              : (frames > 0 ? Math.round((frames * 1000) / 60) : 0)));
    const replayData = normalizeReplayPayloadString(payload.replay || payload.replayData || payload.recording || payload.recordingData || payload.ghost || payload.ghostData || payload?.data?.replay || payload?.data?.recording || '');
    const replaySig = String(payload.replayHash || payload.uploadId || '').slice(0,128);
    const carColors = String(payload.carColors || payload.CarColors || localStorage.getItem(LAST_ACTIVE_COLORS_KEY) || '').slice(0,64) || null;
    const mirrorSig = `${accountId}|${trackId}|${timeMs}|${frames}|${replaySig}`;
    if (mirrorSig === lastMirrorSig && Date.now() - lastMirrorAt < 4000) {
      log('info','Skipped duplicate race mirror',{accountId,trackId,timeMs});
      return { accountId, trackId, uploadId: safeRecordingId(payload.uploadId) || null, timeMs, frames, name, carColors };
    }
    if (!accountId || !trackId || !Number.isFinite(timeMs) || timeMs <= 0 || !Number.isSafeInteger(frames) || frames <= 0) {
      log('warn','Skipped race mirror due to invalid payload',{accountId:!!accountId,trackId:!!trackId,timeMs});
      return { accountId, trackId, uploadId: null, timeMs, frames, name, carColors };
    }
    const createdAt = Date.now();
    const uploadId = safeRecordingId(payload.uploadId) || nextUploadId();
    const carId = String(payload.car || payload.carId || payload.carName || '').slice(0,64) || null;
    log('info','[FB210] mirror payload normalized',{accountId,trackId,timeMs,frames,uploadId,name,carColors,hasReplay:!!replayData,replayBytes:String(replayData||'').length});
        addLocalRaceRow({ accountId, userId: accountId, trackId, name, timeMs, frames, raceTimeFrames: frames, uploadId, replayHash: replaySig || null, replay: replayData || null, carId, carColors, createdAt, verifiedState: Number(payload.verifiedState || 0) || 0 });
    writeRecordingStore(uploadId, { recording: replayData || '', frames, verifiedState: Number(payload.verifiedState||0)||0, carColors: carColors || undefined });
    try {
      const d = await db();
            lastMirrorSig = mirrorSig;
      lastMirrorAt = Date.now();
      log('info','[FB201] race_results.add start',{trackId,accountId,uploadId});
      await d.collection('race_results').add({
        accountId,
        trackId,
        name,
        timeMs,
        replay: replayData || null,
        replayHash: replaySig || null,
        carId,
        carColors,
        raceTimeFrames: frames,
        uploadId,
        verified: Boolean(payload.isVerified ?? payload.verified ?? false),
        createdAt,
        source: String(url || '').slice(0,500)
      });
      log('info','[FB202] profiles_public.set start',{accountId});
      await d.collection('profiles_public').doc(accountId).set({
        accountId,
        name,
        carId,
        carColors,
        updatedAt: createdAt
      }, { merge: true });
      try {
        localStorage.setItem(LAST_ACTIVE_NAME_KEY, name);
        if (carColors) localStorage.setItem(LAST_ACTIVE_COLORS_KEY, carColors);
      } catch {}
      const trackSnap = await d.collection('race_results').orderBy('createdAt','desc').limit(3000).get();
      const trackRows = trackSnap.docs.map((x)=>x.data() || {});
      const topEntries = computeTrackTopEntries(trackRows, trackId, 100);
      log('info','[FB203] leaderboards_track.set start',{trackId,entries:topEntries.length});
      await d.collection('leaderboards_track').doc(String(trackId)).set({ trackId: String(trackId), entries: topEntries, updatedAt: createdAt }, { merge: true });
      const allSnap = await d.collection('race_results').orderBy('createdAt','desc').limit(2500).get();
      const allRows = allSnap.docs.map((x)=>x.data() || {});
      const overallEntries = normalizeEntries(computeOverallFromRaceRows(allRows));
      if (overallEntries.length) {
        log('info','[FB204] leaderboards_overall.set start',{entries:overallEntries.length});
        await d.collection('leaderboards_overall').doc('main').set({ entries: overallEntries, updatedAt: createdAt, seededBy: MARKER }, { merge: true });
      }
      log('info','[FB205] system.last_race_ingest.set start',{trackId,accountId,timeMs});
      await d.collection('system').doc('last_race_ingest').set({ accountId, trackId, timeMs, updatedAt: createdAt }, { merge: true });
      log('info','[FB299] Race mirrored to Firestore',{accountId,trackId,timeMs,name,uploadId});
      return { accountId, trackId, uploadId, timeMs, frames, name, carColors };

    } catch (error) {
      if (!isLocalApiCapableHost()) {
        log('warn','Firestore write blocked; using local-only cached race data', {
          firestoreError: String(error && (error.message || error)),
          trackId,
          accountId
        });
        return { accountId, trackId, uploadId, timeMs, frames, name, carColors };
      }
      try {
        const res = await fetch('/api/race-result', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trackId, accountId, userId: accountId, name, timeMs, frames })
        });
        if (res.ok) {
          log('info','Race mirror API fallback accepted',{status:res.status,trackId,accountId});
        } else {
          log('warn','Race mirror API fallback rejected',{status:res.status,trackId,accountId});
        }
      return { accountId, trackId, uploadId, timeMs, frames, name, carColors };
      } catch (fallbackError) {
        log('error','Race mirror failed in both Firestore and API fallback', {
          firestoreError: String(error && (error.message || error)),
          fallbackError: String(fallbackError && (fallbackError.message || fallbackError)),
          trackId,
          accountId
        });
      }
    }
    return { accountId, trackId, uploadId, timeMs, frames, name, carColors };
  }


  function hookLegacyNetworking(){
    const originalFetch = window.fetch.bind(window);
    window.fetch = async function(url, options={}){
      const method = String(options.method || 'GET').toUpperCase();
      const rawUrl = typeof url === 'string' ? url : String(url || '');
      const urlObj = parseTarget(rawUrl);
      if (shouldMock(urlObj)) {
        log('info','[NET101] fetch mock intercept',{url:rawUrl,method});
        const payload = await mockPayload(urlObj, method, options.body);
        return new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return originalFetch(url, options);
    };

    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function(method, url, ...rest){
      this.__extMethod = String(method || 'GET').toUpperCase();
      this.__extUrl = String(url || '');
      this.__extUrlObj = parseTarget(this.__extUrl);
      this.__extMock = shouldMock(this.__extUrlObj);
      this.__extMockDynamic = this.__extMock && (this.__extUrlObj?.pathname === '/user' || this.__extUrlObj?.pathname === '/leaderboard' || this.__extUrlObj?.pathname === '/recordings');
      if (this.__extMock && !this.__extMockDynamic) {
        const payload = JSON.stringify(makeUserPayload());
        this.__extBlobUrl = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
        return originalOpen.call(this, 'GET', this.__extBlobUrl, ...rest);
      }
      return originalOpen.call(this, method, url, ...rest);
    };
    XMLHttpRequest.prototype.send = function(body){
      if (this.__extMockDynamic) {
        log('info','[NET102] xhr dynamic mock intercept',{url:this.__extUrl,method:this.__extMethod});
        mockPayload(this.__extUrlObj, this.__extMethod, body).then((payload)=>{
          this.__extBlobUrl = URL.createObjectURL(new Blob([JSON.stringify(payload)], { type: 'application/json' }));
          originalOpen.call(this, 'GET', this.__extBlobUrl, true);
          this.addEventListener('loadend', () => { if (this.__extBlobUrl) URL.revokeObjectURL(this.__extBlobUrl); }, { once: true });
          originalSend.call(this, null);
        }).catch(()=>{
          originalSend.call(this, body);
        });
        return;
      }
      if (this.__extMock) {
        this.addEventListener('loadend', () => { if (this.__extBlobUrl) URL.revokeObjectURL(this.__extBlobUrl); }, { once: true });
        return originalSend.call(this, null);
      }
      return originalSend.call(this, body);
    };
  }
  function triggerRankedButtonSpawn(button){
    if (!button || !button.isConnected) return;
    const now = Date.now();
    if (now - lastRankedSpawnAt < 220) return;
    lastRankedSpawnAt = now;
    button.classList.remove('button-spawn');
    void button.offsetWidth;
    button.classList.add('button-spawn');
    setTimeout(()=>{ try { button.classList.remove('button-spawn'); } catch {} }, 760);
  }

  function syncRankingsButtonAnimation(button, container){
    if (!button || !container) return;
    const containerVisible = getComputedStyle(container).display !== 'none' && getComputedStyle(container).visibility !== 'hidden';
    if (containerVisible && !mainButtonsWereVisible) {
      mainButtonsWereVisible = true;
      mainButtonsShownAt = Date.now();
      nativeMenuButtonsAnimating = false;
      rankingsSpawnedOnce = false;
    } else if (!containerVisible) {
      mainButtonsWereVisible = false;
      nativeMenuButtonsAnimating = false;
      return;
    }
    const nativeButtons = Array.from(container.querySelectorAll('button.button-image')).filter((el)=>el.id !== 'injectedRankingsBtn');
    const active = nativeButtons.some((el)=>{
      if (el.classList.contains('button-spawn')) return true;
      const style = getComputedStyle(el);
      const anim = String(style.animationName || '').toLowerCase();
      const state = String(style.animationPlayState || '').toLowerCase();
      return (anim.includes('button-spawn') || anim.includes('buttonspawn')) && state !== 'paused';
    });
    if (active && !nativeMenuButtonsAnimating) {
      nativeMenuButtonsAnimating = true;
      setTimeout(()=>triggerRankedButtonSpawn(button), 60);
      rankingsSpawnedOnce = true;
      window.__polytrackRankingsAnimated = true;
      return;
    }
    if (!active) nativeMenuButtonsAnimating = false;
    const age = Date.now() - mainButtonsShownAt;
    if (!rankingsSpawnedOnce && age >= 0 && age <= 650) {
      triggerRankedButtonSpawn(button);
      rankingsSpawnedOnce = true;
      window.__polytrackRankingsAnimated = true;
    }
  }

  function injectRankingsButton(){
    const container = document.querySelector('.main-buttons-container');
    if (!container) return;
    let button = document.getElementById('injectedRankingsBtn') || rankingsButtonRef;
    if (button && button.parentElement !== container) container.appendChild(button);
    if (!button) {
      button = document.createElement('button');
      button.id = 'injectedRankingsBtn';
      button.className = 'button button-image';
      const existing = container.querySelectorAll('button.button-image');
      button.style.animationDelay = (0.3 + existing.length * 0.1).toFixed(1) + 's';
      container.appendChild(button);
      button.addEventListener('click', (event)=>{ event.preventDefault(); event.stopPropagation(); openPanel(); });
      rankingsButtonRef = button;
    }
    button.innerHTML = `<img src="images/trophy.svg"><p>${tRankedWord()}</p>`;
    button.style.pointerEvents = 'auto';
    button.style.zIndex = '5';
    button.style.order = '999';
    syncRankingsButtonAnimation(button, container);
  }

  function install(){
    ensureStyles();
    ensurePanel();
    hookLegacyNetworking();
    ensureFirestoreBootstrap();
    injectRankingsButton();
    setUnofficialMessage();
    ensurePersistentInfoBranding();
  }

  function hideVerifiedOnlyToggle(){
    const candidates = Array.from(document.querySelectorAll('label,button,div,span'));
    for (const el of candidates) {
      const text = (el.textContent || '').trim().toLowerCase();
      if (text === 'verified only' || text.includes('verified only')) {
        el.style.display = 'none';
      }
    }
  }

  function reconcileUI(){
    injectRankingsButton();
    setUnofficialMessage();
    ensurePersistentInfoBranding();
    hideVerifiedOnlyToggle();
  }


  function isElementVisible(el){
    return !!(el && el.isConnected && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden');
  }

  function isStartMenuHotkeyContext(){
    const menu = document.querySelector('.menu');
    if (!isElementVisible(menu)) return false;
    const container = document.querySelector('.main-buttons-container');
    if (!isElementVisible(container)) return false;
    const play = Array.from(container.querySelectorAll('button')).find((b)=>/play/i.test((b.textContent||'').trim()));
    if (!isElementVisible(play)) return false;
    const profileInputOpen = !!document.querySelector('.profile-menu input:focus, .profile input:focus, input[type="text"]:focus');
    if (profileInputOpen) return false;
    const overlayCandidates = Array.from(document.querySelectorAll('.settings,.settings-menu,.popup,.dialog,[role="dialog"]'));
    if (overlayCandidates.some((el)=>isElementVisible(el))) return false;
    return true;
  }

  let reconcileScheduled = false;
  const observer = new MutationObserver(() => {
    if (reconcileScheduled) return;
    reconcileScheduled = true;
    requestAnimationFrame(() => {
      reconcileScheduled = false;
      reconcileUI();
    });
  });

  function boot(){
    install();
    observer.observe(document.body || document.documentElement, { childList:true, subtree:true });
    setInterval(reconcileUI, 7000);
    window.addEventListener('keydown', (event)=>{
      if (event.key === 'Escape') {
        const panel = document.getElementById('overallLeaderboardPanel');
        const help = document.getElementById('overallHelpPopup');
        if (help && help.style.display !== 'none') { help.style.display='none'; event.preventDefault(); return; }
        if (panel && panel.style.display === 'block') { panel.style.display='none'; event.preventDefault(); return; }
      }
      if ([' ','Spacebar'].includes(event.key)) {
        if (isStartMenuHotkeyContext()) {
          const play = Array.from(document.querySelectorAll('.main-buttons-container button')).find((b)=>/play/i.test((b.textContent||'').trim()));
          if (play) { play.click(); event.preventDefault(); }
        }
      }
      if (['e','r','l','E','R','L'].includes(event.key)) {
        if (isStartMenuHotkeyContext()) {
          const rb = document.getElementById('injectedRankingsBtn');
          if (rb) { rb.click(); event.preventDefault(); }
        }
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
})();
/* polytrack-extension-inline-v33 */