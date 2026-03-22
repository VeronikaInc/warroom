import React, { useState, useEffect, useCallback, useRef } from 'react';
import { initDB, ops, opLogs, dirs, intl, ptDB, rems, journalDB, exportAllData, importData, settingsDB, protocolDB } from './db.js';
import Icon, { priIcon, catIcon } from './Icons.jsx';
import { Modal, Inp, Btn, Empty, AddBtn, PC, SC, CC, quotes, fd, mt, gr, milDate, MOODS } from './UI.jsx';
import { THEMES, DEFAULT_THEME } from './themes.js';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

// ================ CRYPTO NOTIFICATIONS ================
const CRYPTO_MESSAGES = [
  'Görev hatırlatması aktif',
  'Operasyon güncellemesi mevcut',
  'Direktif zaman aşımı yaklaşıyor',
  'Brifing güncellendi',
  'Komuta merkezi bildirimi'
];

function generateCryptoCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 3; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function getCryptoMessage() {
  return CRYPTO_MESSAGES[Math.floor(Math.random() * CRYPTO_MESSAGES.length)];
}

async function scheduleNotification(id, title, body, scheduledAt, realContent = null) {
  try {
    // Kriptolu format
    const cryptoCode = generateCryptoCode();
    const cryptoBody = `WR-${cryptoCode}: ${getCryptoMessage()}`;

    await LocalNotifications.schedule({
      notifications: [{
        id: id,
        title: 'War Room',
        body: cryptoBody,
        schedule: { at: new Date(scheduledAt) },
        sound: 'default',
        extra: { realContent: realContent || body }
      }]
    });
    return true;
  } catch (err) {
    console.warn('LocalNotifications not available:', err);
    return false;
  }
}

async function scheduleDebriefNotification(hour = 22, minute = 0) {
  try {
    const now = new Date();
    const target = new Date();
    target.setHours(hour, minute, 0, 0);

    // Eğer hedef saat geçtiyse, yarın için ayarla
    if (now >= target) {
      target.setDate(target.getDate() + 1);
    }

    const cryptoCode = generateCryptoCode();

    // Önce mevcut debrief bildirimini iptal et
    try { await LocalNotifications.cancel({ notifications: [{ id: 999999 }] }); } catch (_) {}

    await LocalNotifications.schedule({
      notifications: [{
        id: 999999, // Sabit ID for debrief
        title: 'War Room',
        body: `WR-${cryptoCode}: Günlük brifing güncellendi`,
        schedule: {
          at: target,
          every: 'day'
        },
        sound: 'default',
        extra: { type: 'debrief', realContent: 'Günlük debrief zamanı' }
      }]
    });
    return true;
  } catch (err) {
    console.warn('Debrief notification failed:', err);
    return false;
  }
}

async function requestNotificationPermission() {
  try {
    const result = await LocalNotifications.requestPermissions();
    return result.display === 'granted';
  } catch (err) {
    // Fallback to web notifications
    if ('Notification' in window && Notification.permission === 'default') {
      const result = await Notification.requestPermission();
      return result === 'granted';
    }
    return false;
  }
}

// ================ ACCESS SCREEN (CALLSIGN) ================
const VALID_CODES = ['kemal', 'leyla'];

function AccessScreen({ onSuccess, theme, settings }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);
  const [lockTime, setLockTime] = useState(0);
  const inputRef = useRef(null);

  const t = theme || THEMES[DEFAULT_THEME];

  useEffect(() => {
    if (locked && lockTime > 0) {
      const interval = setInterval(() => setLockTime(v => v - 1), 1000);
      return () => clearInterval(interval);
    } else if (locked && lockTime === 0) {
      setLocked(false);
      setAttempts(0);
    }
  }, [locked, lockTime]);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (locked) return;

    const normalized = code.toLowerCase().trim();
    const customCallsign = settings?.callsign?.toLowerCase().trim();
    const valid = customCallsign ? normalized === customCallsign : VALID_CODES.includes(normalized);

    if (valid) {
      onSuccess();
    } else {
      setError(true);
      setAttempts(a => a + 1);
      setTimeout(() => setError(false), 600);
      setCode('');
      if (attempts + 1 >= 3) {
        setLocked(true);
        setLockTime(30);
      }
    }
  };

  const isKAM = t.isKAM;
  const displayName = settings?.displayName || 'KOMUTAN';
  const errorMsg = isKAM ? 'ERİŞİM REDDEDİLDİ — PROTOKOL AKTIF' : 'ERİŞİM REDDEDİLDİ — CALLSIGN GEÇERSİZ';
  const btnLabel = isKAM ? 'ERİŞİM İZNİ VER' : 'ONAYLA';

  return (
    <div style={{
      position: 'fixed', inset: 0, background: t.bg,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      animation: error ? 'shake 0.4s ease' : 'none',
      zIndex: 9999,
      boxShadow: isKAM ? `inset 0 0 120px ${t.accentGlow}` : 'none'
    }}>
      {/* Background glow overlay on error */}
      <div style={{
        position: 'absolute', inset: 0,
        background: error ? `${t.red}18` : 'transparent',
        transition: 'background 0.2s ease',
        pointerEvents: 'none'
      }} />

      <div style={{ textAlign: 'center', zIndex: 1 }}>
        {isKAM ? (
          <>
            <div style={{
              fontFamily: t.fontDisplay,
              fontSize: 52,
              color: t.accent,
              fontWeight: 900,
              letterSpacing: 12,
              marginBottom: 4,
              animation: 'kamPulse 2s ease infinite',
              textShadow: `0 0 40px ${t.accent}, 0 0 80px ${t.accentGlow}`
            }}>K.A.M</div>
            <div style={{
              fontFamily: t.fontDisplay,
              fontSize: 10,
              color: t.textMuted,
              letterSpacing: 4,
              marginBottom: 32
            }}>KİMLİK DOĞRULAMA SİSTEMİ</div>
            <div style={{
              fontFamily: t.fontDisplay,
              fontSize: 14,
              color: t.accent,
              letterSpacing: 3,
              marginBottom: 32,
              textShadow: `0 0 20px ${t.accent}`
            }}>HOŞ GELDİN BAŞKAN</div>
          </>
        ) : (
          <>
            <div style={{
              fontFamily: t.fontDisplay,
              fontSize: 11,
              color: t.textMuted,
              letterSpacing: 4,
              marginBottom: 8
            }}>WAR ROOM</div>
            <h1 style={{
              fontFamily: t.fontDisplay,
              fontSize: 24,
              color: t.accent,
              letterSpacing: 3,
              marginBottom: displayName ? 12 : 40,
              fontWeight: 800
            }}>{t.accessTitle}</h1>
            {displayName && (
              <div style={{
                fontFamily: t.fontDisplay,
                fontSize: 14,
                color: t.accent,
                letterSpacing: 2,
                marginBottom: 32,
                opacity: 0.85
              }}>HOŞ GELDİN {displayName}</div>
            )}
          </>
        )}

        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="password"
            value={code}
            onChange={e => setCode(e.target.value)}
            disabled={locked}
            placeholder={locked ? `${lockTime}s bekle...` : '••••••••'}
            style={{
              width: 220,
              padding: '16px 20px',
              background: t.bgCard,
              border: `2px solid ${error ? t.red : locked ? t.textMuted : t.accent}`,
              borderRadius: 12,
              color: t.textPrimary,
              fontSize: 18,
              fontFamily: t.fontMono,
              textAlign: 'center',
              letterSpacing: 4,
              outline: 'none',
              transition: 'border-color 0.2s ease',
              boxShadow: isKAM && !error ? `0 0 20px ${t.accentGlow}` : 'none'
            }}
          />

          <button
            type="submit"
            disabled={locked || !code.trim()}
            style={{
              display: 'block',
              width: 220,
              marginTop: 16,
              padding: '14px 20px',
              background: locked || !code.trim() ? t.border : `linear-gradient(135deg, ${t.accent}, ${t.accentDark})`,
              border: 'none',
              borderRadius: 12,
              color: locked || !code.trim() ? t.textMuted : t.bg,
              fontFamily: t.fontDisplay,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 2,
              cursor: locked || !code.trim() ? 'not-allowed' : 'pointer'
            }}
          >
            {locked ? `KİLİTLİ (${lockTime}s)` : btnLabel}
          </button>
        </form>

        {error && (
          <div style={{
            marginTop: 20,
            fontFamily: t.fontDisplay,
            fontSize: 10,
            color: t.red,
            letterSpacing: 2,
            animation: 'fadeIn 0.2s ease'
          }}>
            {errorMsg}
          </div>
        )}

        {!error && attempts > 0 && !locked && (
          <div style={{
            marginTop: 20,
            fontFamily: t.fontMono,
            fontSize: 10,
            color: t.textMuted
          }}>
            {3 - attempts} deneme hakkı kaldı
          </div>
        )}
      </div>
    </div>
  );
}

// ================ STEALTH SCREEN ================
function StealthScreen({ onExit, theme }) {
  const th = theme || THEMES[DEFAULT_THEME];
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const formatTime = (d) => {
    return d.toTimeString().slice(0, 5);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: th.bg,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999
    }}>
      <div style={{
        fontFamily: "'Orbitron', sans-serif",
        fontSize: 72,
        color: th.textPrimary,
        fontWeight: 800,
        letterSpacing: 8,
        animation: 'pulse 4s ease infinite'
      }}>
        {formatTime(time)}
      </div>

      <div style={{
        fontFamily: "'Orbitron', sans-serif",
        fontSize: 12,
        color: th.textMuted,
        letterSpacing: 6,
        marginTop: 20
      }}>
        STANDBY
      </div>

      <button
        onClick={onExit}
        style={{
          position: 'fixed',
          bottom: 40,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 16,
          opacity: 0.3
        }}
      >
        <Icon name="eye" size={24} color={th.textMuted} />
      </button>
    </div>
  );
}

// ================ BRIEFING SCREEN ================
function Briefing({ data, reload, nav, onStealth, theme, onSettingsOpen }) {
  const th = theme || THEMES[DEFAULT_THEME];
  const [qi, setQi] = useState(0);
  const [quickNote, setQuickNote] = useState('');
  const [noteSaved, setNoteSaved] = useState(false);
  useEffect(() => { const t = setInterval(() => setQi(i => (i + 1) % quotes.length), 8000); return () => clearInterval(t); }, []);

  const ao = data.operations.filter(o => o.status === 'ACTIVE').length;
  const pd = data.directives.filter(d => !d.done).length;
  const today = new Date().toDateString();
  const ct = data.directives.filter(d => d.done && new Date(d.completed_at).toDateString() === today).length;
  const cr = data.directives.filter(d => !d.done && d.priority === 'CRITICAL');
  const td = data.directives.filter(d => !d.done).sort((a, b) => {
    const o = { CRITICAL: 0, HIGH: 1, STANDARD: 2, LOW: 3 };
    return o[a.priority] - o[b.priority];
  }).slice(0, 5);
  const upRem = data.reminders.filter(r => !r.dismissed && new Date(r.datetime) <= new Date());
  const empty = data.operations.length === 0 && data.directives.length === 0;

  // Last 7 days mood dots
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayStr = d.toDateString();
    const entry = data.journal.find(j => new Date(j.created_at).toDateString() === dayStr);
    last7Days.push(entry ? entry.mood : null);
  }

  // Weekly report (only show on Sunday or always show last 7 days summary)
  const now = new Date();
  const weekStart = new Date(now.getTime() - 7 * 864e5);
  const weekDirs = data.directives.filter(d => d.done && d.completed_at >= weekStart.getTime());
  const weekPT = [...new Set(data.pt.filter(p => p.created_at >= weekStart.getTime()).map(p => new Date(p.created_at).toDateString()))].length;
  const weekJournal = [...new Set(data.journal.filter(j => j.created_at >= weekStart.getTime()).map(j => new Date(j.created_at).toDateString()))].length;
  const moodCount = { GOOD: 0, NEUTRAL: 0, TOUGH: 0 };
  data.journal.filter(j => j.created_at >= weekStart.getTime()).forEach(j => { if (moodCount[j.mood] !== undefined) moodCount[j.mood]++; });

  const toggle = async (id) => { await dirs.toggle(id); reload(); };
  const dismissRem = async (id) => { await rems.dismiss(id); reload(); };

  const saveQuickNote = async () => {
    if (!quickNote.trim()) return;
    await intl.add({ title: quickNote, content: '', category: 'NOTE' });
    setQuickNote('');
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 1500);
    reload();
  };

  return (
    <div style={{ padding: '0 16px 120px' }}>
      <div style={{ paddingTop: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 11, color: th.textMuted, fontFamily: "'JetBrains Mono',monospace", letterSpacing: 1, marginBottom: 4 }}>{milDate()}</div>
            <h1 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 22, color: th.textPrimary, margin: '4px 0 0', fontWeight: 800, letterSpacing: 1 }}>{gr()}</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <button onClick={onStealth} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, marginTop: 8, opacity: 0.5 }}>
              <Icon name="eyeOff" size={20} color={th.textMuted} />
            </button>
            <button onClick={onSettingsOpen} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, marginTop: 8, opacity: 0.5 }}>
              <Icon name="settings" size={20} color={th.textMuted} />
            </button>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 28, fontWeight: 700, color: th.accent, letterSpacing: 2, marginTop: 4 }}>{mt()}</div>
          </div>
        </div>
      </div>

      {/* Quote */}
      <div key={qi} style={{ background: `linear-gradient(135deg,${th.accentGlow},${th.accentGlow}80)`, borderRadius: 14, padding: '14px 16px', marginBottom: 20, border: `1px solid ${th.accent}18`, display: 'flex', gap: 12, alignItems: 'flex-start', animation: 'fadeQuote 8s ease infinite' }}>
        <div style={{ flexShrink: 0, marginTop: 2 }}><Icon name="quote" size={14} color={`${th.accent}66`} /></div>
        <div style={{ fontSize: 12, color: `${th.accent}cc`, lineHeight: 1.6, fontStyle: 'italic' }}>{quotes[qi]}</div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
        {[{ l: 'AKTİF\nOPERASYON', v: ao, c: th.green }, { l: 'BEKLEYEN\nDİREKTİF', v: pd, c: th.accent }, { l: 'BUGÜN\nTAMAMLANAN', v: ct, c: th.blue }].map((s, i) =>
          <div key={i} style={{ background: th.bgCard, borderRadius: 14, padding: '16px 12px', border: `1px solid ${th.border}`, textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.c, fontFamily: "'Orbitron',sans-serif" }}>{s.v}</div>
            <div style={{ fontSize: 9, color: th.textMuted, marginTop: 4, fontFamily: "'Orbitron',sans-serif", letterSpacing: 1, whiteSpace: 'pre-line', lineHeight: 1.4 }}>{s.l}</div>
          </div>
        )}
      </div>

      {/* Mood Tracker - Last 7 Days */}
      {data.journal.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, justifyContent: 'center' }}>
          <span style={{ fontSize: 9, color: th.textMuted, fontFamily: "'Orbitron',sans-serif", letterSpacing: 1 }}>RUH HALİ</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {last7Days.map((mood, i) => (
              <div key={i} style={{
                width: 12, height: 12, borderRadius: '50%',
                background: mood ? MOODS[mood]?.color : th.border,
                border: mood ? 'none' : `1px solid ${th.borderHover}`
              }} />
            ))}
          </div>
        </div>
      )}

      {/* Quick Note */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 16,
        background: noteSaved ? `${th.green}15` : 'transparent',
        borderRadius: 12, padding: noteSaved ? 2 : 0,
        transition: 'all 0.2s ease'
      }}>
        <input
          value={quickNote}
          onChange={e => setQuickNote(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && saveQuickNote()}
          placeholder="Hızlı not yaz..."
          style={{
            flex: 1, padding: '12px 14px', background: th.bgCard,
            border: `1px solid ${th.border}`, borderRadius: 10,
            color: th.textPrimary, fontSize: 13, outline: 'none'
          }}
        />
        <button onClick={saveQuickNote} style={{
          background: `linear-gradient(135deg,${th.accent},${th.accentDark})`,
          border: 'none', borderRadius: 10, padding: '0 14px', cursor: 'pointer'
        }}>
          <Icon name="send" size={16} color={th.bg} />
        </button>
      </div>

      {/* Weekly Report */}
      {(weekDirs.length > 0 || weekPT > 0 || weekJournal > 0) && (
        <div style={{
          background: `linear-gradient(135deg,${th.accentGlow},${th.accentGlow}40)`,
          borderRadius: 14, padding: '14px 16px', marginBottom: 16,
          border: `1px solid ${th.accent}20`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Icon name="chart" size={14} color={th.accent} />
            <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 10, color: th.accent, letterSpacing: 2 }}>HAFTALIK KARNE</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 11 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: th.textSecondary }}>
              <span>Tamamlanan direktif</span>
              <span style={{ color: th.green, fontWeight: 600, fontFamily: "'JetBrains Mono',monospace" }}>{weekDirs.length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: th.textSecondary }}>
              <span>Antrenman günü</span>
              <span style={{ color: th.accent, fontWeight: 600, fontFamily: "'JetBrains Mono',monospace" }}>{weekPT}/7</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: th.textSecondary }}>
              <span>Günlük yazma</span>
              <span style={{ color: th.blue, fontWeight: 600, fontFamily: "'JetBrains Mono',monospace" }}>{weekJournal}/7</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: th.textSecondary }}>
              <span>Mood</span>
              <span style={{ marginLeft: 'auto', display: 'flex', gap: 2 }}>
                {moodCount.GOOD > 0 && <span style={{ color: th.green }}>🟢{moodCount.GOOD}</span>}
                {moodCount.NEUTRAL > 0 && <span style={{ color: th.accent }}>🟡{moodCount.NEUTRAL}</span>}
                {moodCount.TOUGH > 0 && <span style={{ color: th.red }}>🔴{moodCount.TOUGH}</span>}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Reminders */}
      {upRem.length > 0 && (
        <div style={{ background: `linear-gradient(135deg,${th.blue}15,${th.blue}08)`, borderRadius: 14, padding: '14px 16px', marginBottom: 16, border: `1px solid ${th.blue}25` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Icon name="bell" size={14} color={th.blue} />
            <span style={{ fontSize: 10, color: th.blue, fontFamily: "'Orbitron',sans-serif", letterSpacing: 2 }}>HATIRLATICILAR</span>
          </div>
          {upRem.slice(0, 3).map(r => (
            <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: `1px solid ${th.border}` }}>
              <span style={{ fontSize: 12, color: th.textPrimary }}>{r.title}</span>
              <button onClick={() => dismissRem(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}><Icon name="check" size={14} color={th.green} /></button>
            </div>
          ))}
        </div>
      )}

      {/* Critical Alert */}
      {cr.length > 0 && (
        <div style={{ background: `linear-gradient(135deg,${th.red}15,${th.red}08)`, borderRadius: 14, padding: '14px 16px', marginBottom: 16, border: `1px solid ${th.red}44`, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Icon name="alert" size={20} color={th.red} />
          <div>
            <div style={{ fontSize: 10, color: th.red, fontFamily: "'Orbitron',sans-serif", letterSpacing: 2, marginBottom: 2 }}>KRİTİK UYARI</div>
            <div style={{ fontSize: 13, color: th.textPrimary }}>{cr.length} kritik direktif bekliyor</div>
          </div>
        </div>
      )}

      {empty ? <Empty icon="target" title="KOMUTA MERKEZİ HAZIR" sub={"Operasyonlarını ve direktiflerini ekleyerek\nkomuta merkezini aktifleştir."} /> : (
        <>
          {/* Active Operations */}
          {data.operations.filter(o => o.status === 'ACTIVE').length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h2 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 12, color: th.accent, letterSpacing: 2, margin: 0 }}>OPERASYON DURUMU</h2>
                <button onClick={() => nav('operations')} style={{ background: 'none', border: 'none', color: th.textMuted, fontSize: 11, cursor: 'pointer', fontFamily: "'JetBrains Mono',monospace", display: 'flex', alignItems: 'center', gap: 4 }}>TÜMÜ <Icon name="arrow" size={12} color={th.textMuted} /></button>
              </div>
              {data.operations.filter(o => o.status === 'ACTIVE').map(op => (
                <div key={op.id} style={{ background: th.bgCard, borderRadius: 14, padding: '14px 16px', border: `1px solid ${th.border}`, marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: op.color }} /><span style={{ fontSize: 14, fontWeight: 600 }}>{op.name}</span></div>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: op.color, fontWeight: 700 }}>{op.progress}%</span>
                  </div>
                  <div style={{ height: 4, background: th.border, borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: op.progress + '%', background: `linear-gradient(90deg,${op.color}88,${op.color})`, borderRadius: 2 }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Priority Directives */}
          {td.length > 0 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h2 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 12, color: th.accent, letterSpacing: 2, margin: 0 }}>ÖNCELİKLİ DİREKTİFLER</h2>
                <button onClick={() => nav('directives')} style={{ background: 'none', border: 'none', color: th.textMuted, fontSize: 11, cursor: 'pointer', fontFamily: "'JetBrains Mono',monospace", display: 'flex', alignItems: 'center', gap: 4 }}>TÜMÜ <Icon name="arrow" size={12} color={th.textMuted} /></button>
              </div>
              {td.map(d => {
                const p = PC[d.priority]; const op = data.operations.find(o => o.id === d.operation_id);
                return (
                  <div key={d.id} onClick={() => toggle(d.id)} style={{ background: th.bgCard, borderRadius: 12, padding: '12px 14px', border: `1px solid ${th.border}`, marginBottom: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, borderLeft: '3px solid ' + p.color }}>
                    <div style={{ width: 22, height: 22, borderRadius: 6, border: '2px solid ' + p.color + '33', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: d.done ? p.color : 'transparent' }}>{d.done && <Icon name="check" size={12} color="#fff" />}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: d.done ? th.textMuted : th.textPrimary, textDecoration: d.done ? 'line-through' : 'none' }}>{d.title}</div>
                      <div style={{ fontSize: 10, color: th.textMuted, marginTop: 3, display: 'flex', gap: 8, alignItems: 'center' }}>
                        {op && <span style={{ color: op.color }}>{op.name}</span>}
                        {d.due && <span>{fd(d.due)}</span>}
                      </div>
                    </div>
                    <div style={{ flexShrink: 0 }}><Icon name={priIcon[d.priority]} size={12} color={p.color} /></div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ================ OPERATIONS SCREEN ================
function Operations({ data, reload, theme }) {
  const th = theme || THEMES[DEFAULT_THEME];
  const [show, setShow] = useState(false);
  const [detail, setDetail] = useState(null);
  const [edit, setEdit] = useState(null);
  const [f, sf] = useState({ name: '', description: '', status: 'PLANNING', progress: 0, color: th.accent });
  const [comment, setComment] = useState('');
  const [detailLogs, setDetailLogs] = useState([]);
  const colors = ['#d4a843', '#4a9d5b', '#c44536', '#5b8fd4', '#9b59b6', '#e67e22', '#1abc9c'];

  const loadLogs = async (opId) => { const l = await opLogs.getByOp(opId); setDetailLogs(l); };

  const openAdd = () => { setEdit(null); sf({ name: '', description: '', status: 'PLANNING', progress: 0, color: th.accent }); setShow(true); };
  const openEdit = (op) => { setEdit(op); sf({ name: op.name, description: op.description, status: op.status, progress: op.progress, color: op.color }); setDetail(null); setShow(true); };
  const openDetail = async (op) => { setDetail(op); await loadLogs(op.id); };

  const save = async () => {
    if (!f.name.trim()) return;
    if (edit) { await ops.update(edit.id, f); }
    else { await ops.add(f); }
    setShow(false); reload();
  };

  const del = async (id) => { await ops.delete(id); setShow(false); setDetail(null); reload(); };

  const addLog = async () => {
    if (!comment.trim() || !detail) return;
    await opLogs.add(detail.id, comment);
    setComment('');
    await loadLogs(detail.id);
  };

  const delLog = async (logId) => {
    await opLogs.delete(logId);
    if (detail) await loadLogs(detail.id);
  };

  const detailOp = detail ? data.operations.find(o => o.id === detail.id) : null;

  return (
    <div style={{ padding: '0 16px 120px' }}>
      <div style={{ paddingTop: 20, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 20, color: th.textPrimary, margin: 0, letterSpacing: 1 }}>OPERASYONLAR</h1>
          <div style={{ fontSize: 11, color: th.textMuted, marginTop: 4, fontFamily: "'JetBrains Mono',monospace" }}>{data.operations.length} operasyon</div>
        </div>
        <AddBtn onClick={openAdd} />
      </div>

      {data.operations.length === 0 ? <Empty icon="hex" title="OPERASYON YOK" sub={"İlk operasyonunu oluşturmak için\n+ butonuna dokun."} /> :
        Object.entries(SC).map(([st, cfg]) => {
          const items = data.operations.filter(o => o.status === st);
          if (!items.length) return null;
          return (
            <div key={st} style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color }} />
                <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 10, color: cfg.color, letterSpacing: 2 }}>{cfg.label}</span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: th.textMuted }}>({items.length})</span>
              </div>
              {items.map(op => {
                const dc = data.directives.filter(d => d.operation_id === op.id && !d.done).length;
                return (
                  <div key={op.id} onClick={() => openDetail(op)} style={{ background: th.bgCard, borderRadius: 16, padding: '18px 16px', border: `1px solid ${th.border}`, marginBottom: 10, cursor: 'pointer', borderLeft: '4px solid ' + op.color }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div><div style={{ fontSize: 16, fontWeight: 700 }}>{op.name}</div><div style={{ fontSize: 12, color: th.textMuted, marginTop: 4 }}>{op.description}</div></div>
                      <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 18, fontWeight: 800, color: op.color }}>{op.progress}%</span>
                    </div>
                    <div style={{ height: 6, background: th.border, borderRadius: 3, overflow: 'hidden', marginBottom: 10 }}>
                      <div style={{ height: '100%', width: op.progress + '%', background: `linear-gradient(90deg,${op.color}66,${op.color})`, borderRadius: 3 }} />
                    </div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 10, color: th.textMuted, fontFamily: "'JetBrains Mono',monospace", alignItems: 'center' }}>
                      <span>{dc} direktif</span><span>•</span><span style={{ color: cfg.color }}>{cfg.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}

      {/* Add/Edit Modal */}
      <Modal isOpen={show} onClose={() => setShow(false)} title={edit ? 'OPERASYON DÜZENLE' : 'YENİ OPERASYON'} theme={th}>
        <Inp label="OPERASYON ADI" value={f.name} onChange={v => sf(x => ({ ...x, name: v }))} placeholder="Operasyon adı..." theme={th} />
        <Inp label="AÇIKLAMA" value={f.description} onChange={v => sf(x => ({ ...x, description: v }))} placeholder="Kısa açıklama..." multiline theme={th} />
        <Inp label="DURUM" value={f.status} onChange={v => sf(x => ({ ...x, status: v }))} options={Object.entries(SC).map(([k, v]) => ({ value: k, label: v.label }))} theme={th} />
        <Inp label="İLERLEME (%)" type="number" value={f.progress} onChange={v => sf(x => ({ ...x, progress: Math.min(100, Math.max(0, v)) }))} theme={th} />
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 11, color: th.textSecondary, marginBottom: 8, fontFamily: th.fontDisplay, letterSpacing: 1 }}>RENK KODU</label>
          <div style={{ display: 'flex', gap: 8 }}>{colors.map(c =>
            <div key={c} onClick={() => sf(x => ({ ...x, color: c }))} style={{ width: 32, height: 32, borderRadius: 8, background: c, cursor: 'pointer', border: f.color === c ? `2px solid ${th.textPrimary}` : '2px solid transparent' }} />
          )}</div>
        </div>
        <Btn label={edit ? 'GÜNCELLE' : 'OPERASYON OLUŞTUR'} onClick={save} icon="check" theme={th} />
        {edit && <div style={{ marginTop: 10 }}><Btn label="SİL" onClick={() => del(edit.id)} variant="danger" icon="trash" theme={th} /></div>}
      </Modal>

      {/* Detail Modal */}
      <Modal isOpen={!!detail} onClose={() => { setDetail(null); setComment(''); }} title="OPERASYON DETAY" theme={th}>
        {detailOp && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: th.textPrimary }}>{detailOp.name}</div>
                <div style={{ fontSize: 12, color: th.textMuted, marginTop: 4 }}>{detailOp.description}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: th.fontDisplay, fontSize: 24, fontWeight: 800, color: detailOp.color }}>{detailOp.progress}%</div>
                <div style={{ fontSize: 10, color: SC[detailOp.status]?.color, fontFamily: th.fontDisplay, letterSpacing: 1 }}>{SC[detailOp.status]?.label}</div>
              </div>
            </div>
            <div style={{ height: 6, background: th.border, borderRadius: 3, overflow: 'hidden', marginBottom: 20 }}>
              <div style={{ height: '100%', width: detailOp.progress + '%', background: `linear-gradient(90deg,${detailOp.color}66,${detailOp.color})`, borderRadius: 3 }} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button onClick={() => openEdit(detailOp)} style={{ flex: 1, padding: 10, borderRadius: 10, background: th.border, border: 'none', color: th.accent, fontSize: 11, fontFamily: th.fontDisplay, letterSpacing: 1, cursor: 'pointer' }}>DÜZENLE</button>
              <button onClick={() => del(detailOp.id)} style={{ padding: '10px 16px', borderRadius: 10, background: `${th.red}20`, border: 'none', cursor: 'pointer' }}><Icon name="trash" size={14} color={th.red} /></button>
            </div>

            {/* Timeline */}
            <div style={{ borderTop: `1px solid ${th.border}`, paddingTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Icon name="timeline" size={14} color={th.accent} />
                <span style={{ fontFamily: th.fontDisplay, fontSize: 11, color: th.accent, letterSpacing: 2 }}>ZAMAN ÇİZELGESİ</span>
              </div>

              {/* Add comment input */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <input value={comment} onChange={e => setComment(e.target.value)} placeholder="Yorum ekle..." onKeyDown={e => e.key === 'Enter' && addLog()} style={{ flex: 1, padding: '10px 14px', background: th.bg, border: `1px solid ${th.border}`, borderRadius: 10, color: th.textPrimary, fontSize: 13, outline: 'none' }} />
                <button onClick={addLog} style={{ background: `linear-gradient(135deg,${th.accent},${th.accentDark})`, border: 'none', borderRadius: 10, padding: '0 14px', cursor: 'pointer' }}><Icon name="plus" size={16} color={th.bg} /></button>
              </div>

              {/* Timeline view */}
              <div style={{ position: 'relative', paddingLeft: 20 }}>
                {/* Timeline line */}
                <div style={{
                  position: 'absolute', left: 5, top: 8, bottom: 8,
                  width: 2, background: detailOp.color + '40', borderRadius: 1
                }} />

                {/* Creation entry */}
                <div style={{ position: 'relative', marginBottom: 16 }}>
                  <div style={{
                    position: 'absolute', left: -17, top: 4,
                    width: 10, height: 10, borderRadius: '50%',
                    background: detailOp.color, border: `2px solid ${th.bgCard}`
                  }} />
                  <div style={{ fontSize: 10, color: th.textMuted, fontFamily: th.fontMono, marginBottom: 2 }}>
                    {new Date(detailOp.created_at).toLocaleString('tr-TR')}
                  </div>
                  <div style={{ fontSize: 12, color: th.textSecondary, fontStyle: 'italic' }}>
                    Operasyon oluşturuldu
                  </div>
                </div>

                {/* Log entries (chronological - oldest first) */}
                {[...detailLogs].sort((a, b) => a.created_at - b.created_at).map(log => (
                  <div key={log.id} style={{ position: 'relative', marginBottom: 16 }}>
                    <div style={{
                      position: 'absolute', left: -15, top: 4,
                      width: 6, height: 6, borderRadius: '50%',
                      background: th.textMuted
                    }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 10, color: th.textMuted, fontFamily: th.fontMono, marginBottom: 2 }}>
                          {new Date(log.created_at).toLocaleString('tr-TR')}
                        </div>
                        <div style={{ fontSize: 13, color: th.textPrimary, lineHeight: 1.5 }}>{log.text}</div>
                      </div>
                      <button onClick={() => delLog(log.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, flexShrink: 0 }}>
                        <Icon name="x" size={12} color={th.textMuted + '44'} />
                      </button>
                    </div>
                  </div>
                ))}

                {detailLogs.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '20px 0', color: th.textMuted, fontSize: 12 }}>
                    Henüz yorum eklenmedi.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ================ DIRECTIVES SCREEN ================
function Directives({ data, reload, theme }) {
  const th = theme || THEMES[DEFAULT_THEME];
  const [show, setShow] = useState(false);
  const [remShow, setRemShow] = useState(false);
  const [remFor, setRemFor] = useState(null);
  const [remForm, setRemForm] = useState({ date: '', time: '' });
  const [filter, setFilter] = useState('ALL');
  const [f, sf] = useState({ title: '', priority: 'STANDARD', operationId: '', due: '' });

  const toggle = async (id) => { await dirs.toggle(id); reload(); };
  const save = async () => {
    if (!f.title.trim()) return;
    await dirs.add(f);
    setShow(false); sf({ title: '', priority: 'STANDARD', operationId: '', due: '' }); reload();
  };
  const del = async (id) => { await dirs.delete(id); reload(); };
  const saveRem = async () => {
    if (!remForm.date) return;
    const dt = remForm.date + (remForm.time ? 'T' + remForm.time : 'T09:00');
    const remId = await rems.add({ title: remFor.title, directiveId: remFor.id, datetime: dt });

    // Schedule crypto notification
    const notifId = Math.floor(Math.random() * 900000) + 100000;
    await scheduleNotification(
      notifId,
      'War Room',
      remFor.title,
      new Date(dt).getTime(),
      remFor.title
    );

    setRemShow(false); setRemForm({ date: '', time: '' }); reload();
  };

  const fl = data.directives.filter(d => filter === 'ALL' ? true : filter === 'DONE' ? d.done : !d.done && d.priority === filter)
    .sort((a, b) => { if (a.done !== b.done) return a.done ? 1 : -1; const o = { CRITICAL: 0, HIGH: 1, STANDARD: 2, LOW: 3 }; return o[a.priority] - o[b.priority]; });

  return (
    <div style={{ padding: '0 16px 120px' }}>
      <div style={{ paddingTop: 20, marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 20, color: th.textPrimary, margin: 0, letterSpacing: 1 }}>DİREKTİFLER</h1>
          <div style={{ fontSize: 11, color: th.textMuted, marginTop: 4, fontFamily: "'JetBrains Mono',monospace" }}>{data.directives.filter(d => !d.done).length} bekleyen</div>
        </div>
        <AddBtn onClick={() => setShow(true)} />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
        {[{ key: 'ALL', label: 'TÜMÜ', color: th.textPrimary }, ...Object.entries(PC).map(([k, v]) => ({ key: k, label: v.label, color: v.color })), { key: 'DONE', label: 'TAMAM', color: th.textMuted }].map(x =>
          <button key={x.key} onClick={() => setFilter(x.key)} style={{ padding: '8px 14px', borderRadius: 20, border: '1px solid', borderColor: filter === x.key ? x.color : th.border, background: filter === x.key ? x.color + '15' : 'transparent', color: filter === x.key ? x.color : th.textMuted, fontFamily: "'Orbitron',sans-serif", fontSize: 9, letterSpacing: 1, cursor: 'pointer', whiteSpace: 'nowrap' }}>{x.label}</button>
        )}
      </div>

      {fl.length === 0 ? <Empty icon="diamond" title={data.directives.length === 0 ? 'DİREKTİF YOK' : 'SONUÇ YOK'} sub={data.directives.length === 0 ? "İlk direktifini oluşturmak için\n+ butonuna dokun." : "Bu filtreyle eşleşen direktif yok."} /> :
        fl.map(d => {
          const p = PC[d.priority]; const op = data.operations.find(o => o.id === d.operation_id);
          const hasRem = data.reminders.some(r => r.directive_id === d.id && !r.dismissed);
          return (
            <div key={d.id} style={{ background: th.bgCard, borderRadius: 14, padding: '14px 16px', border: `1px solid ${th.border}`, marginBottom: 8, borderLeft: '3px solid ' + (d.done ? '#6b728044' : p.color), opacity: d.done ? .6 : 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div onClick={() => toggle(d.id)} style={{ width: 24, height: 24, borderRadius: 7, cursor: 'pointer', border: '2px solid ' + (d.done ? th.green : p.color) + '40', background: d.done ? th.green : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{d.done && <Icon name="check" size={13} color="#fff" />}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: d.done ? th.textMuted : th.textPrimary, textDecoration: d.done ? 'line-through' : 'none' }}>{d.title}</div>
                  <div style={{ fontSize: 10, color: th.textMuted, marginTop: 4, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: p.color }}><Icon name={priIcon[d.priority]} size={10} color={p.color} />{p.label}</span>
                    {op && <span style={{ color: op.color }}>{op.name}</span>}
                    {d.due && <span>{fd(d.due)}</span>}
                    {hasRem && <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}><Icon name="bell" size={10} color={th.blue} /></span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  {!d.done && <button onClick={() => { setRemFor(d); setRemShow(true); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><Icon name="bell" size={14} color={hasRem ? th.blue : `${th.textMuted}44`} /></button>}
                  <button onClick={() => del(d.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><Icon name="x" size={14} color="#6b728044" /></button>
                </div>
              </div>
            </div>
          );
        })}

      <Modal isOpen={show} onClose={() => setShow(false)} title="YENİ DİREKTİF" theme={th}>
        <Inp label="DİREKTİF" value={f.title} onChange={v => sf(x => ({ ...x, title: v }))} placeholder="Görev tanımını gir..." theme={th} />
        <Inp label="ÖNCELİK" value={f.priority} onChange={v => sf(x => ({ ...x, priority: v }))} options={Object.entries(PC).map(([k, v]) => ({ value: k, label: v.label }))} theme={th} />
        <Inp label="OPERASYON" value={f.operationId} onChange={v => sf(x => ({ ...x, operationId: v }))} options={[{ value: '', label: '— Bağımsız —' }, ...data.operations.map(o => ({ value: o.id, label: o.name }))]} theme={th} />
        <Inp label="TERMİN TARİHİ" type="date" value={f.due} onChange={v => sf(x => ({ ...x, due: v }))} theme={th} />
        <Btn label="DİREKTİF OLUŞTUR" onClick={save} icon="check" theme={th} />
      </Modal>

      <Modal isOpen={remShow} onClose={() => setRemShow(false)} title="HATIRLATICI OLUŞTUR" theme={th}>
        {remFor && (
          <div>
            <div style={{ background: th.bg, borderRadius: 10, padding: 12, marginBottom: 16, border: `1px solid ${th.border}` }}>
              <div style={{ fontSize: 10, color: th.textMuted, fontFamily: th.fontDisplay, letterSpacing: 1, marginBottom: 4 }}>DİREKTİF</div>
              <div style={{ fontSize: 14, color: th.textPrimary }}>{remFor.title}</div>
            </div>
            <Inp label="TARİH" type="date" value={remForm.date} onChange={v => setRemForm(x => ({ ...x, date: v }))} theme={th} />
            <Inp label="SAAT" type="time" value={remForm.time} onChange={v => setRemForm(x => ({ ...x, time: v }))} theme={th} />
            <Btn label="HATIRLATICI KAYDET" onClick={saveRem} icon="bell" theme={th} />
          </div>
        )}
      </Modal>
    </div>
  );
}

// ================ INTEL SCREEN ================
function Intel({ data, reload, theme }) {
  const th = theme || THEMES[DEFAULT_THEME];
  const [show, setShow] = useState(false);
  const [f, sf] = useState({ title: '', content: '', category: 'IDEA' });
  const [exp, setExp] = useState(null);

  const save = async () => { if (!f.title.trim()) return; await intl.add(f); setShow(false); sf({ title: '', content: '', category: 'IDEA' }); reload(); };
  const del = async (id) => { await intl.delete(id); reload(); };

  return (
    <div style={{ padding: '0 16px 120px' }}>
      <div style={{ paddingTop: 20, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 20, color: th.textPrimary, margin: 0, letterSpacing: 1 }}>İSTİHBARAT</h1>
          <div style={{ fontSize: 11, color: th.textMuted, marginTop: 4, fontFamily: "'JetBrains Mono',monospace" }}>{data.intel.length} kayıt</div>
        </div>
        <AddBtn onClick={() => setShow(true)} />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {Object.entries(CC).map(([k, c]) => {
          const cnt = data.intel.filter(i => i.category === k).length;
          return <div key={k} style={{ padding: '8px 14px', borderRadius: 10, background: c.color + '10', border: '1px solid ' + c.color + '25', display: 'flex', alignItems: 'center', gap: 6 }}><Icon name={catIcon[k]} size={13} color={c.color} /><span style={{ fontSize: 10, color: c.color, fontFamily: "'Orbitron',sans-serif", letterSpacing: 1 }}>{c.label}</span><span style={{ fontSize: 12, color: c.color, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace" }}>{cnt}</span></div>;
        })}
      </div>

      {data.intel.length === 0 ? <Empty icon="search" title="İSTİHBARAT BOŞLUĞU" sub={"Fikirlerini, notlarını ve araştırmalarını\nburaya kaydet."} /> :
        data.intel.map(item => {
          const cat = CC[item.category]; const expanded = exp === item.id;
          return (
            <div key={item.id} onClick={() => setExp(expanded ? null : item.id)} style={{ background: th.bgCard, borderRadius: 14, padding: '14px 16px', border: `1px solid ${th.border}`, marginBottom: 10, cursor: 'pointer', borderLeft: '3px solid ' + cat.color }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <Icon name={catIcon[item.category]} size={12} color={cat.color} />
                    <span style={{ fontSize: 9, color: cat.color, fontFamily: "'Orbitron',sans-serif", letterSpacing: 1 }}>{cat.label}</span>
                    <span style={{ fontSize: 10, color: th.textMuted, fontFamily: "'JetBrains Mono',monospace" }}>{new Date(item.created_at).toLocaleDateString('tr-TR')}</span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{item.title}</div>
                  {expanded && item.content && <div style={{ fontSize: 13, color: th.textSecondary, marginTop: 10, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{item.content}</div>}
                </div>
                <button onClick={e => { e.stopPropagation(); del(item.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><Icon name="x" size={14} color="#6b728044" /></button>
              </div>
            </div>
          );
        })}

      <Modal isOpen={show} onClose={() => setShow(false)} title="YENİ İSTİHBARAT" theme={th}>
        <Inp label="BAŞLIK" value={f.title} onChange={v => sf(x => ({ ...x, title: v }))} placeholder="Başlık gir..." theme={th} />
        <Inp label="İÇERİK" value={f.content} onChange={v => sf(x => ({ ...x, content: v }))} placeholder="Detayları yaz..." multiline theme={th} />
        <Inp label="KATEGORİ" value={f.category} onChange={v => sf(x => ({ ...x, category: v }))} options={Object.entries(CC).map(([k, v]) => ({ value: k, label: v.label }))} theme={th} />
        <Btn label="KAYDET" onClick={save} icon="check" theme={th} />
      </Modal>
    </div>
  );
}

// ================ JOURNAL SCREEN ================
function Journal({ data, reload, theme }) {
  const th = theme || THEMES[DEFAULT_THEME];
  const [show, setShow] = useState(false);
  const [debrief, setDebrief] = useState(false);
  const [exp, setExp] = useState(null);
  const [media, setMedia] = useState([]);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const [f, sf] = useState({
    title: '', content: '', mood: 'NEUTRAL',
    is_debrief: false, debrief_good: '', debrief_improve: '', debrief_tomorrow: '',
    energy_level: 3, focus_score: 3, energy_drain: '', trigger: ''
  });

  const openAdd = (isDebrief = false) => {
    sf({
      title: '', content: '', mood: 'NEUTRAL',
      is_debrief: isDebrief, debrief_good: '', debrief_improve: '', debrief_tomorrow: '',
      energy_level: 3, focus_score: 3, energy_drain: '', trigger: ''
    });
    setMedia([]);
    setDebrief(isDebrief);
    setShow(true);
  };

  // Take photo
  const takePhoto = async () => {
    try {
      const image = await Camera.getPhoto({
        quality: 70,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Prompt, // Prompt user to choose camera or gallery
        width: 800
      });

      const newMedia = {
        type: 'photo',
        data: image.base64String,
        filename: `img_${Date.now()}.${image.format}`
      };
      setMedia(m => [...m, newMedia]);
    } catch (err) {
      console.warn('Camera error:', err);
    }
  };

  // Record video
  const recordVideo = async () => {
    try {
      // Capacitor Camera doesn't support video recording directly
      // We'll use the camera plugin's photo for now and note video as future enhancement
      const video = await Camera.getPhoto({
        quality: 70,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera
      });

      // For now, treat as photo since video requires additional setup
      const newMedia = {
        type: 'photo',
        data: video.base64String,
        filename: `vid_${Date.now()}.${video.format}`
      };
      setMedia(m => [...m, newMedia]);
    } catch (err) {
      console.warn('Video error:', err);
    }
  };

  // Voice recording using MediaRecorder API
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      const chunks = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result.split(',')[1];
          const newMedia = {
            type: 'audio',
            data: base64,
            filename: `voice_${Date.now()}.webm`,
            duration: recordingTime
          };
          setMedia(m => [...m, newMedia]);
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setRecording(true);
      setRecordingTime(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(t => {
          if (t >= 300) { // Max 5 minutes
            stopRecording();
            return t;
          }
          return t + 1;
        });
      }, 1000);
    } catch (err) {
      console.warn('Microphone error:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      clearInterval(recordingTimerRef.current);
      setRecording(false);
    }
  };

  const removeMedia = (index) => {
    setMedia(m => m.filter((_, i) => i !== index));
  };

  const save = async () => {
    if (!f.content.trim() && !f.debrief_good.trim() && !f.debrief_improve.trim() && media.length === 0) return;
    await journalDB.add({
      ...f,
      is_debrief: debrief,
      media: JSON.stringify(media),
      energy_level: f.energy_level,
      focus_score: f.focus_score,
      energy_drain: f.energy_drain,
      trigger: f.trigger
    });
    setShow(false);
    setMedia([]);
    reload();
  };

  const del = async (id) => {
    await journalDB.delete(id);
    reload();
  };

  // Group by date
  const grouped = {};
  data.journal.forEach(j => {
    const d = new Date(j.created_at).toDateString();
    if (!grouped[d]) grouped[d] = [];
    grouped[d].push(j);
  });
  const sortedDates = Object.keys(grouped).sort((a, b) => new Date(b) - new Date(a));

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    const todayStr = new Date().toDateString();
    const yesterday = new Date(Date.now() - 864e5).toDateString();
    if (dateStr === todayStr) return 'BUGÜN';
    if (dateStr === yesterday) return 'DÜN';
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }).toUpperCase();
  };

  return (
    <div style={{ padding: '0 16px 120px' }}>
      <div style={{ paddingTop: 20, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 20, color: th.textPrimary, margin: 0, letterSpacing: 1 }}>GÜNLÜK</h1>
          <div style={{ fontSize: 11, color: th.textMuted, marginTop: 4, fontFamily: "'JetBrains Mono',monospace" }}>{data.journal.length} kayıt</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => openAdd(true)} style={{
            background: th.border, border: 'none', padding: '10px 14px',
            borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
          }}>
            <Icon name="clock" size={14} color={th.blue} />
            <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, color: th.blue, letterSpacing: 1 }}>DEBRİEF</span>
          </button>
          <AddBtn onClick={() => openAdd(false)} />
        </div>
      </div>

      {sortedDates.length === 0 ? (
        <Empty icon="book" title="GÜNLÜK BOŞ" sub={"Günlük düşüncelerini ve deneyimlerini\nburaya kaydet."} />
      ) : (
        sortedDates.map(dateStr => (
          <div key={dateStr} style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 10, color: th.textMuted, letterSpacing: 2, marginBottom: 10 }}>
              {formatDate(dateStr)}
            </div>
            {grouped[dateStr].map(j => {
              const mood = MOODS[j.mood] || MOODS.NEUTRAL;
              const expanded = exp === j.id;
              const media = JSON.parse(j.media || '[]');
              const photoCount = media.filter(m => m.type === 'photo').length;
              const audioCount = media.filter(m => m.type === 'audio').length;
              const videoCount = media.filter(m => m.type === 'video').length;

              return (
                <div key={j.id} onClick={() => setExp(expanded ? null : j.id)} style={{
                  background: th.bgCard, borderRadius: 14, padding: '14px 16px',
                  border: `1px solid ${th.border}`, marginBottom: 10, cursor: 'pointer',
                  borderLeft: `3px solid ${mood.color}`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 14 }}>{mood.emoji}</span>
                        <span style={{ fontSize: 10, color: mood.color, fontFamily: "'Orbitron',sans-serif", letterSpacing: 1 }}>
                          {j.is_debrief ? 'DEBRİEF' : mood.label}
                        </span>
                        <span style={{ fontSize: 10, color: th.textMuted, fontFamily: "'JetBrains Mono',monospace" }}>
                          {new Date(j.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {(photoCount > 0 || audioCount > 0 || videoCount > 0) && (
                          <span style={{ fontSize: 10, color: th.textMuted }}>
                            {photoCount > 0 && `📷${photoCount} `}
                            {audioCount > 0 && `🎤${audioCount} `}
                            {videoCount > 0 && `🎥${videoCount}`}
                          </span>
                        )}
                      </div>
                      {j.title && <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: th.textPrimary }}>{j.title}</div>}

                      {!expanded && j.content && (
                        <div style={{ fontSize: 13, color: th.textSecondary, lineHeight: 1.5 }}>
                          {j.content.slice(0, 80)}{j.content.length > 80 ? '...' : ''}
                        </div>
                      )}

                      {expanded && (
                        <>
                          {j.content && <div style={{ fontSize: 13, color: th.textSecondary, lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: 12 }}>{j.content}</div>}

                          {j.is_debrief && (
                            <div style={{ borderTop: `1px solid ${th.border}`, paddingTop: 12, marginTop: 8 }}>
                              {j.debrief_good && (
                                <div style={{ marginBottom: 10 }}>
                                  <div style={{ fontSize: 9, color: th.green, fontFamily: "'Orbitron',sans-serif", letterSpacing: 1, marginBottom: 4 }}>NE İYİ GİTTİ</div>
                                  <div style={{ fontSize: 12, color: th.textSecondary, lineHeight: 1.5 }}>{j.debrief_good}</div>
                                </div>
                              )}
                              {j.debrief_improve && (
                                <div style={{ marginBottom: 10 }}>
                                  <div style={{ fontSize: 9, color: th.accent, fontFamily: "'Orbitron',sans-serif", letterSpacing: 1, marginBottom: 4 }}>NE GELİŞTİRİLMELİ</div>
                                  <div style={{ fontSize: 12, color: th.textSecondary, lineHeight: 1.5 }}>{j.debrief_improve}</div>
                                </div>
                              )}
                              {j.debrief_tomorrow && (
                                <div>
                                  <div style={{ fontSize: 9, color: th.blue, fontFamily: "'Orbitron',sans-serif", letterSpacing: 1, marginBottom: 4 }}>YARIN ÖNCELİK</div>
                                  <div style={{ fontSize: 12, color: th.textSecondary, lineHeight: 1.5 }}>{j.debrief_tomorrow}</div>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    <button onClick={e => { e.stopPropagation(); del(j.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                      <Icon name="x" size={14} color="#6b728044" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ))
      )}

      {/* Add Modal */}
      <Modal isOpen={show} onClose={() => setShow(false)} title={debrief ? 'GÜNLÜK DEBRİEF' : 'YENİ GÜNLÜK GİRİŞİ'} theme={th}>
        {/* Mood Selection */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 11, color: th.textSecondary, marginBottom: 8, fontFamily: th.fontDisplay, letterSpacing: 1 }}>RUH HALİ</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {Object.entries(MOODS).map(([key, mood]) => (
              <button
                key={key}
                onClick={() => sf(x => ({ ...x, mood: key }))}
                style={{
                  flex: 1, padding: '12px 8px', borderRadius: 10,
                  background: f.mood === key ? mood.color + '20' : th.bgInput,
                  border: `2px solid ${f.mood === key ? mood.color : th.border}`,
                  cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4
                }}
              >
                <span style={{ fontSize: 20 }}>{mood.emoji}</span>
                <span style={{ fontSize: 9, color: f.mood === key ? mood.color : th.textSecondary, fontFamily: th.fontDisplay, letterSpacing: 1 }}>{mood.label}</span>
              </button>
            ))}
          </div>
        </div>

        <Inp label="BAŞLIK (OPSİYONEL)" value={f.title} onChange={v => sf(x => ({ ...x, title: v }))} placeholder="Günün özeti..." theme={th} />

        {/* Enerji & Odak Skorları */}
        {[
          { label: 'ENERJİ SEVİYESİ', key: 'energy_level' },
          { label: 'ODAK KALİTESİ', key: 'focus_score' }
        ].map(({ label, key }) => (
          <div key={key}>
            <label style={{ display: 'block', fontSize: 11, color: th.textSecondary, marginBottom: 8, fontFamily: th.fontDisplay, letterSpacing: 1 }}>{label}</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {[1, 2, 3, 4, 5].map(n => (
                <div
                  key={n}
                  onClick={() => sf(x => ({ ...x, [key]: n }))}
                  style={{
                    width: 32, height: 32, borderRadius: 8, cursor: 'pointer',
                    background: n <= f[key] ? th.accent + '33' : th.bgInput,
                    border: `2px solid ${n <= f[key] ? th.accent : th.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  <span style={{ fontSize: 12, fontFamily: th.fontDisplay, color: n <= f[key] ? th.accent : th.textSecondary }}>{n}</span>
                </div>
              ))}
            </div>
          </div>
        ))}

        {!debrief && (
          <>
            <Inp label="ENERJİ TÜKETİCİ" value={f.energy_drain} onChange={v => sf(x => ({ ...x, energy_drain: v }))} placeholder="Bugün enerjimi ne tüketti?" theme={th} />
            <Inp label="TETİKLEYİCİ" value={f.trigger} onChange={v => sf(x => ({ ...x, trigger: v }))} placeholder="Bunu ne tetikledi?" theme={th} />
          </>
        )}

        {debrief ? (
          <>
            <Inp label="BUGÜN NE İYİ GİTTİ?" value={f.debrief_good} onChange={v => sf(x => ({ ...x, debrief_good: v }))} placeholder="Başarılar, olumlu anlar..." multiline theme={th} />
            <Inp label="NE GELİŞTİRİLMELİ?" value={f.debrief_improve} onChange={v => sf(x => ({ ...x, debrief_improve: v }))} placeholder="Öğrenilen dersler..." multiline theme={th} />
            <Inp label="YARIN ÖNCELİK NE?" value={f.debrief_tomorrow} onChange={v => sf(x => ({ ...x, debrief_tomorrow: v }))} placeholder="Yarın odaklanılacak konular..." multiline theme={th} />
          </>
        ) : null}

        <Inp label="SERBEST YAZI" value={f.content} onChange={v => sf(x => ({ ...x, content: v }))} placeholder="Düşüncelerini yaz..." multiline theme={th} />

        {/* Media buttons */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 11, color: th.textSecondary, marginBottom: 8, fontFamily: th.fontDisplay, letterSpacing: 1 }}>MEDYA EKLE</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={takePhoto} style={{
              flex: 1, padding: '12px 8px', borderRadius: 10,
              background: th.bg, border: `1px solid ${th.border}`,
              cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4
            }}>
              <Icon name="camera" size={20} color={th.accent} />
              <span style={{ fontSize: 9, color: th.textSecondary, fontFamily: th.fontDisplay }}>FOTOĞRAF</span>
            </button>

            <button
              onClick={recording ? stopRecording : startRecording}
              style={{
                flex: 1, padding: '12px 8px', borderRadius: 10,
                background: recording ? `${th.red}20` : th.bgInput,
                border: `1px solid ${recording ? th.red : th.border}`,
                cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4
              }}
            >
              <Icon name="mic" size={20} color={recording ? th.red : th.blue} />
              <span style={{ fontSize: 9, color: recording ? th.red : th.textSecondary, fontFamily: th.fontDisplay }}>
                {recording ? `${Math.floor(recordingTime / 60)}:${(recordingTime % 60).toString().padStart(2, '0')}` : 'SES'}
              </span>
            </button>
          </div>
        </div>

        {/* Media preview */}
        {media.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, color: th.textSecondary, marginBottom: 8, fontFamily: th.fontDisplay, letterSpacing: 1 }}>
              EKLENEN MEDYA ({media.length})
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {media.map((m, i) => (
                <div key={i} style={{
                  position: 'relative', width: 60, height: 60,
                  borderRadius: 8, overflow: 'hidden', background: th.border
                }}>
                  {m.type === 'photo' ? (
                    <img
                      src={`data:image/jpeg;base64,${m.data}`}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{
                      width: '100%', height: '100%',
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center'
                    }}>
                      <Icon name="mic" size={20} color={th.blue} />
                      <span style={{ fontSize: 8, color: th.textMuted, marginTop: 2 }}>
                        {m.duration ? `${Math.floor(m.duration / 60)}:${(m.duration % 60).toString().padStart(2, '0')}` : 'SES'}
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => removeMedia(i)}
                    style={{
                      position: 'absolute', top: 2, right: 2,
                      width: 18, height: 18, borderRadius: '50%',
                      background: th.red, border: 'none',
                      cursor: 'pointer', display: 'flex',
                      alignItems: 'center', justifyContent: 'center'
                    }}
                  >
                    <Icon name="x" size={10} color="#fff" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <Btn label={debrief ? 'DEBRİEF KAYDET' : 'GÜNLÜK KAYDET'} onClick={save} icon="check" theme={th} />
      </Modal>
    </div>
  );
}

// ================ PT SCREEN ================
function PT({ data, reload, theme }) {
  const th = theme || THEMES[DEFAULT_THEME];
  const [f, sf] = useState({ title: '', content: '', duration: '' });
  const [exp, setExp] = useState(null);
  const today = new Date().toDateString();
  const tw = data.pt.filter(w => new Date(w.created_at).toDateString() === today);
  const wk = data.pt.filter(w => new Date(w.created_at) >= new Date(Date.now() - 7 * 864e5));
  const ud = [...new Set(wk.map(w => new Date(w.created_at).toDateString()))].length;
  const totalDuration = tw.reduce((a, w) => a + (w.duration || 0), 0);

  const save = async () => {
    if (!f.title.trim()) return;
    await ptDB.add(f);
    sf({ title: '', content: '', duration: '' }); reload();
  };
  const del = async (id) => { await ptDB.delete(id); reload(); };

  // Group by date
  const grouped = {};
  data.pt.forEach(w => {
    const d = new Date(w.created_at).toDateString();
    if (!grouped[d]) grouped[d] = [];
    grouped[d].push(w);
  });
  const sortedDates = Object.keys(grouped).sort((a, b) => new Date(b) - new Date(a));

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    const todayStr = new Date().toDateString();
    const yesterday = new Date(Date.now() - 864e5).toDateString();
    if (dateStr === todayStr) return 'BUGÜN';
    if (dateStr === yesterday) return 'DÜN';
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }).toUpperCase();
  };

  return (
    <div style={{ padding: '0 16px 120px' }}>
      <div style={{ paddingTop: 20, marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 20, color: th.textPrimary, margin: 0, letterSpacing: 1 }}>FİZİKSEL HAZIRLIK</h1>
        <div style={{ fontSize: 11, color: th.textMuted, marginTop: 4, fontFamily: "'JetBrains Mono',monospace" }}>Antrenman Günlüğü</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 24 }}>
        {[
          { l: 'HAFTALIK\nGÜN', v: ud, c: th.green, m: '/ 7' },
          { l: 'BUGÜN\nANTRENMAN', v: tw.length, c: th.accent, m: '' },
          { l: 'TOPLAM\nSÜRE', v: totalDuration, c: th.blue, m: 'dk' }
        ].map((s, i) =>
          <div key={i} style={{ background: th.bgCard, borderRadius: 14, padding: '16px 12px', border: `1px solid ${th.border}`, textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.c, fontFamily: "'Orbitron',sans-serif" }}>{s.v}<span style={{ fontSize: 10, color: th.textMuted }}> {s.m}</span></div>
            <div style={{ fontSize: 9, color: th.textMuted, marginTop: 4, fontFamily: "'Orbitron',sans-serif", letterSpacing: 1, whiteSpace: 'pre-line', lineHeight: 1.3 }}>{s.l}</div>
          </div>
        )}
      </div>

      <div style={{ background: th.bgCard, borderRadius: 16, padding: '18px 16px', border: `1px solid ${th.border}`, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Icon name="dumbbell" size={14} color={th.accent} />
          <span style={{ fontFamily: th.fontDisplay, fontSize: 11, color: th.accent, letterSpacing: 2 }}>ANTRENMAN KAYDET</span>
        </div>
        <Inp label="BAŞLIK" value={f.title} onChange={v => sf(x => ({ ...x, title: v }))} placeholder="Göğüs + Triceps, 5km Koşu, Kickboks..." theme={th} />
        <Inp label="SÜRE (DK)" type="number" value={f.duration} onChange={v => sf(x => ({ ...x, duration: v }))} placeholder="45" theme={th} />
        <Inp label="DETAY" value={f.content} onChange={v => sf(x => ({ ...x, content: v }))} placeholder="Ne yaptın, nasıl gitti..." multiline theme={th} />
        <Btn label="ANTRENMAN KAYDET" onClick={save} icon="check" theme={th} />
      </div>

      {sortedDates.length === 0 ? <Empty icon="dumbbell" title="ANTRENMAN YOK" sub="İlk antrenmanını kaydetmek için\nyukarıdaki formu doldur." theme={th} /> :
        sortedDates.slice(0, 7).map(dateStr => (
          <div key={dateStr} style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 10, color: th.textMuted, letterSpacing: 2, marginBottom: 10 }}>
              {formatDate(dateStr)}
            </div>
            {grouped[dateStr].map(w => {
              const expanded = exp === w.id;
              return (
                <div key={w.id} onClick={() => setExp(expanded ? null : w.id)} style={{
                  background: th.bgCard, borderRadius: 12, padding: '12px 14px',
                  border: `1px solid ${th.border}`, marginBottom: 8, cursor: 'pointer'
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: th.textPrimary }}>{w.title}</div>
                      <div style={{ fontSize: 11, color: th.textMuted, marginTop: 4, fontFamily: "'JetBrains Mono',monospace" }}>
                        {w.duration ? w.duration + ' dk' : ''}
                        {!expanded && w.content && <span> — {w.content.slice(0, 40)}{w.content.length > 40 ? '...' : ''}</span>}
                      </div>
                      {expanded && w.content && (
                        <div style={{ fontSize: 13, color: th.textSecondary, marginTop: 10, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{w.content}</div>
                      )}
                    </div>
                    <button onClick={e => { e.stopPropagation(); del(w.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                      <Icon name="x" size={14} color="#6b728044" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
    </div>
  );
}

// ================ INTEL REPORT SCREEN ================
function IntelReport({ data, theme }) {
  const th = theme || THEMES[DEFAULT_THEME];
  const now = Date.now();
  const weekAgo = now - 7 * 864e5;
  const weekEntries = data.journal.filter(j => j.created_at >= weekAgo);

  const avgEnergy = weekEntries.length
    ? (weekEntries.reduce((s, j) => s + (Number(j.energy_level) || 3), 0) / weekEntries.length).toFixed(1)
    : '—';
  const avgFocus = weekEntries.length
    ? (weekEntries.reduce((s, j) => s + (Number(j.focus_score) || 3), 0) / weekEntries.length).toFixed(1)
    : '—';
  const moodCount = { GOOD: 0, NEUTRAL: 0, TOUGH: 0 };
  weekEntries.forEach(j => { if (moodCount[j.mood] !== undefined) moodCount[j.mood]++; });
  const journalDays = [...new Set(weekEntries.map(j => new Date(j.created_at).toDateString()))].length;

  const drainFreq = {};
  data.journal.forEach(j => {
    if (!j.energy_drain) return;
    j.energy_drain.split(',').map(s => s.trim()).filter(Boolean).forEach(d => {
      drainFreq[d] = (drainFreq[d] || 0) + 1;
    });
  });
  const topDrains = Object.entries(drainFreq).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const last14 = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayStr = d.toDateString();
    const entry = data.journal.find(j => new Date(j.created_at).toDateString() === dayStr && !j.is_debrief);
    const shortLabel = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }).toUpperCase();
    last14.push({ dayStr, entry, shortLabel });
  }

  const debriefs = data.journal.filter(j => j.is_debrief).sort((a, b) => b.created_at - a.created_at);

  return (
    <div style={{ padding: '0 16px 120px' }}>
      <div style={{ paddingTop: 20, marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 20, color: th.textPrimary, margin: 0, letterSpacing: 1 }}>İSTİHBARAT RAPORU</h1>
        <div style={{ fontSize: 11, color: th.textMuted, marginTop: 4, fontFamily: "'JetBrains Mono',monospace" }}>PATTERN ANALİZİ</div>
      </div>

      {/* BÖLÜM A: Haftalık Özet */}
      <div style={{ background: 'linear-gradient(135deg,#d4a84308,#d4a84303)', border: '1px solid #d4a84320', borderRadius: 16, padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
          <Icon name="chart" size={14} color={th.accent} />
          <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 10, color: th.accent, letterSpacing: 2 }}>HAFTALIK ÖZET</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <div style={{ fontSize: 9, color: th.textMuted, fontFamily: "'Orbitron',sans-serif", letterSpacing: 1, marginBottom: 4 }}>ORT. ENERJİ</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: th.accent, fontFamily: "'Orbitron',sans-serif" }}>{avgEnergy}</div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: th.textMuted, fontFamily: "'Orbitron',sans-serif", letterSpacing: 1, marginBottom: 4 }}>ORT. ODAK</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: th.blue, fontFamily: "'Orbitron',sans-serif" }}>{avgFocus}</div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: th.textMuted, fontFamily: "'Orbitron',sans-serif", letterSpacing: 1, marginBottom: 4 }}>GÜNLÜK YAZMA</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: th.green, fontFamily: "'Orbitron',sans-serif" }}>{journalDays}<span style={{ fontSize: 12, color: th.textMuted }}>/7</span></div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: th.textMuted, fontFamily: "'Orbitron',sans-serif", letterSpacing: 1, marginBottom: 4 }}>MOOD DAĞILIMI</div>
            <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
              {moodCount.GOOD > 0 && <span style={{ fontSize: 13, color: th.green }}>🟢{moodCount.GOOD}</span>}
              {moodCount.NEUTRAL > 0 && <span style={{ fontSize: 13, color: th.accent }}>🟡{moodCount.NEUTRAL}</span>}
              {moodCount.TOUGH > 0 && <span style={{ fontSize: 13, color: th.red }}>🔴{moodCount.TOUGH}</span>}
              {weekEntries.length === 0 && <span style={{ fontSize: 12, color: th.textMuted }}>—</span>}
            </div>
          </div>
        </div>
      </div>

      {/* BÖLÜM B: Enerji Tüketiciler */}
      <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 16, padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
          <Icon name="alert" size={14} color={th.accent} />
          <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 10, color: th.accent, letterSpacing: 2 }}>ENERJİ TÜKETİCİLER</span>
        </div>
        {topDrains.length === 0 ? (
          <Empty icon="search" title="VERİ YOK" sub={"Günlük girişlerinde enerji tüketici ekledikçe\nburada görünecek."} />
        ) : (
          topDrains.map(([drain, count]) => (
            <div key={drain} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${th.border}` }}>
              <span style={{ fontSize: 13, color: th.textPrimary }}>{drain}</span>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", color: th.accent, fontWeight: 700 }}>{count}x</span>
            </div>
          ))
        )}
      </div>

      {/* BÖLÜM C: 14 Günlük Trend */}
      <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 16, padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
          <Icon name="timeline" size={14} color={th.accent} />
          <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 10, color: th.accent, letterSpacing: 2 }}>14 GÜNLÜK TREND</span>
        </div>
        {last14.map(({ dayStr, entry, shortLabel }) => (
          <div key={dayStr} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', opacity: entry ? 1 : 0.3 }}>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: th.textMuted, minWidth: 44 }}>{shortLabel}</span>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: entry ? (MOODS[entry.mood]?.color || th.border) : th.border, flexShrink: 0 }} />
            <div style={{ display: 'flex', gap: 2 }}>
              {[1, 2, 3, 4, 5].map(n => (
                <div key={n} style={{ width: 8, height: 8, borderRadius: 2, background: entry && n <= (entry.energy_level || 0) ? th.accent : th.border }} />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 2 }}>
              {[1, 2, 3, 4, 5].map(n => (
                <div key={n} style={{ width: 8, height: 8, borderRadius: 2, background: entry && n <= (entry.focus_score || 0) ? th.blue : th.border }} />
              ))}
            </div>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: th.accent }} />
            <span style={{ fontSize: 9, color: th.textMuted, fontFamily: "'Orbitron',sans-serif" }}>ENERJİ</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: th.blue }} />
            <span style={{ fontSize: 9, color: th.textMuted, fontFamily: "'Orbitron',sans-serif" }}>ODAK</span>
          </div>
        </div>
      </div>

      {/* BÖLÜM D: Debrief Arşivi */}
      <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 16, padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
          <Icon name="book" size={14} color={th.accent} />
          <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 10, color: th.accent, letterSpacing: 2 }}>DEBRİEF ARŞİVİ</span>
        </div>
        {debriefs.length === 0 ? (
          <Empty icon="book" title="DEBRİEF YOK" theme={th} sub={"Günlük debrief girişlerin\nburada arşivlenir."} />
        ) : (
          debriefs.map(j => (
            <div key={j.id} style={{ background: th.bg, borderRadius: 12, padding: '12px 14px', marginBottom: 8, border: `1px solid ${th.border}`, borderLeft: `3px solid ${th.accent}66` }}>
              <div style={{ fontSize: 10, color: th.textMuted, fontFamily: th.fontMono, marginBottom: 6 }}>
                {new Date(j.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
              {j.debrief_tomorrow && (
                <>
                  <div style={{ fontSize: 9, color: th.accent, fontFamily: th.fontDisplay, letterSpacing: 1, marginBottom: 4 }}>YARININ ÖNCELİĞİ</div>
                  <div style={{ fontSize: 13, color: th.textPrimary, lineHeight: 1.5, marginBottom: 6 }}>{j.debrief_tomorrow}</div>
                </>
              )}
              {j.debrief_good && (
                <div style={{ fontSize: 11, color: `${th.green}99`, marginBottom: 2 }}>✓ {j.debrief_good}</div>
              )}
              {j.debrief_improve && (
                <div style={{ fontSize: 11, color: `${th.accent}99` }}>△ {j.debrief_improve}</div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ================ PROTOKOL SCREEN ================
function Protokol({ data, theme }) {
  const th = theme || THEMES[DEFAULT_THEME];

  const [form, setForm] = useState({
    kimlik_beyani:   data?.kimlik_beyani   || '',
    kimlik_cipasi:   data?.kimlik_cipasi   || '',
    dusme_protokolu: data?.dusme_protokolu || '',
    haftalik_hesap:  data?.haftalik_hesap  || '',
    vizyon_cipasi:   data?.vizyon_cipasi   || '',
  });
  const [editingKimlik, setEditingKimlik] = useState(false);
  const [editingVizyon, setEditingVizyon] = useState(false);
  const saveTimer = useRef(null);

  useEffect(() => () => clearTimeout(saveTimer.current), []);

  useEffect(() => {
    if (data) setForm({
      kimlik_beyani:   data.kimlik_beyani   || '',
      kimlik_cipasi:   data.kimlik_cipasi   || '',
      dusme_protokolu: data.dusme_protokolu || '',
      haftalik_hesap:  data.haftalik_hesap  || '',
      vizyon_cipasi:   data.vizyon_cipasi   || '',
    });
  }, [data]);

  const update = (field, value) => {
    const next = { ...form, [field]: value };
    setForm(next);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await protocolDB.save(next);
    }, 800);
  };

  const card = {
    background: th.bgCard,
    borderRadius: 14,
    padding: '14px 16px',
    border: '1px solid ' + th.border,
    marginBottom: 12,
  };

  const sectionLabel = {
    fontSize: 9,
    color: th.textMuted,
    fontFamily: th.fontDisplay,
    letterSpacing: 3,
    marginBottom: 10,
    borderBottom: '1px solid ' + th.border,
    paddingBottom: 6,
  };

  const textarea = {
    width: '100%',
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: th.textPrimary,
    fontSize: 14,
    lineHeight: 1.6,
    resize: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    minHeight: 72,
    padding: 0,
  };

  return (
    <div style={{ padding: '0 16px 140px' }}>
      <div style={{ padding: '20px 0 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Icon name="shield" size={18} color={th.accent} />
        <div>
          <div style={{ fontFamily: th.fontDisplay, fontSize: 16, color: th.accent, letterSpacing: 3, fontWeight: 700 }}>PROTOKOL</div>
          <div style={{ fontSize: 10, color: th.textMuted, letterSpacing: 1, marginTop: 2 }}>Kimlik & Vizyon Protokolü</div>
        </div>
      </div>

      <div style={sectionLabel}>KİMLİK BEYANI</div>
      <div style={{ ...card, marginBottom: 20, borderColor: th.accent + '44' }}>
        {editingKimlik ? (
          <textarea
            autoFocus
            value={form.kimlik_beyani}
            onChange={e => update('kimlik_beyani', e.target.value)}
            onBlur={() => setEditingKimlik(false)}
            placeholder="Kimliğini tanımla..."
            style={{ ...textarea, minHeight: 56 }}
          />
        ) : (
          <div onClick={() => setEditingKimlik(true)} style={{ cursor: 'text' }}>
            {form.kimlik_beyani
              ? <div style={{ fontSize: 16, color: th.textPrimary, lineHeight: 1.6, fontWeight: 600 }}>{form.kimlik_beyani}</div>
              : <div style={{ fontSize: 14, color: th.textMuted, fontStyle: 'italic' }}>Kimliğini tanımla... (dokunarak düzenle)</div>
            }
          </div>
        )}
      </div>

      <div style={{ ...sectionLabel, marginTop: 0 }}>PROTOKOLLER</div>

      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <Icon name="target" size={14} color={th.accent} />
          <div style={{ fontFamily: th.fontDisplay, fontSize: 11, color: th.accent, letterSpacing: 2 }}>KİMLİK ÇIPASI</div>
        </div>
        <div style={{ fontSize: 11, color: th.textMuted, marginBottom: 10, lineHeight: 1.5 }}>Günlük soru: Bugün kim olmayı seçiyorum?</div>
        <textarea
          value={form.kimlik_cipasi}
          onChange={e => update('kimlik_cipasi', e.target.value)}
          placeholder="Notlarını buraya yaz..."
          style={textarea}
        />
      </div>

      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <Icon name="alert" size={14} color={th.accent} />
          <div style={{ fontFamily: th.fontDisplay, fontSize: 11, color: th.accent, letterSpacing: 2 }}>DÜŞME PROTOKOLÜ</div>
        </div>
        <div style={{ fontSize: 11, color: th.textMuted, marginBottom: 10, lineHeight: 1.5 }}>Düştüğünde ne yaparsın? Adım adım yaz.</div>
        <textarea
          value={form.dusme_protokolu}
          onChange={e => update('dusme_protokolu', e.target.value)}
          placeholder="Kalkış protokolünü yaz..."
          style={textarea}
        />
      </div>

      <div style={{ ...card, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <Icon name="eye" size={14} color={th.accent} />
          <div style={{ fontFamily: th.fontDisplay, fontSize: 11, color: th.accent, letterSpacing: 2 }}>HAFTALIK HESAP</div>
        </div>
        <div style={{ fontSize: 11, color: th.textMuted, marginBottom: 10, lineHeight: 1.5 }}>Haftalık gözlem: Bu hafta hangi savaşı kazandım / kaybettim?</div>
        <textarea
          value={form.haftalik_hesap}
          onChange={e => update('haftalik_hesap', e.target.value)}
          placeholder="Bu haftanın muhasebesi..."
          style={textarea}
        />
      </div>

      <div style={{ ...sectionLabel, marginTop: 8 }}>VİZYON ÇIPASI</div>
      <div style={{ ...card, borderColor: th.accent + '66', textAlign: 'center', padding: '24px 20px' }}>
        {editingVizyon ? (
          <textarea
            autoFocus
            value={form.vizyon_cipasi}
            onChange={e => update('vizyon_cipasi', e.target.value)}
            onBlur={() => setEditingVizyon(false)}
            placeholder="Vizyonunu yaz..."
            style={{ ...textarea, textAlign: 'center', fontSize: 16, minHeight: 56 }}
          />
        ) : (
          <div onClick={() => setEditingVizyon(true)} style={{ cursor: 'text' }}>
            {form.vizyon_cipasi
              ? <div style={{ fontSize: 20, color: th.accent, lineHeight: 1.5, fontWeight: 700, letterSpacing: 1 }}>{form.vizyon_cipasi}</div>
              : <div style={{ fontSize: 14, color: th.textMuted, fontStyle: 'italic' }}>Vizyonunu yaz... (dokunarak düzenle)</div>
            }
          </div>
        )}
      </div>
    </div>
  );
}

// ================ SETTINGS SCREEN ================
function Settings({ theme, settings, onSave, onClose }) {
  const t = theme || THEMES[DEFAULT_THEME];
  const [form, setForm] = useState({
    callsign: settings?.callsign || '',
    displayName: settings?.displayName || 'KOMUTAN',
    theme: settings?.theme || DEFAULT_THEME,
    debriefHour: settings?.debriefHour ?? 22,
    debriefMinute: settings?.debriefMinute ?? 0,
    notificationsEnabled: settings?.notificationsEnabled ?? true,
  });

  const section = (label) => (
    <div style={{ fontSize: 9, color: t.textMuted, fontFamily: t.fontDisplay, letterSpacing: 3, marginBottom: 12, marginTop: 24, borderBottom: `1px solid ${t.border}`, paddingBottom: 6 }}>
      {label}
    </div>
  );

  const handleSave = async () => {
    const newSettings = { ...(settings || {}), ...form, id: 'user_settings', created_at: settings?.created_at || Date.now() };
    await settingsDB.save(newSettings);
    // Debrief bildirimini güncelle
    if (form.notificationsEnabled) {
      try { await scheduleDebriefNotification(form.debriefHour, form.debriefMinute); } catch (_) {}
    }
    onSave(newSettings);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        await importData(data);
        alert('Veri içe aktarıldı.');
      } catch (err) {
        alert('Geçersiz dosya.');
      }
    };
    input.click();
  };

  const handleExport = async () => {
    const data = await exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `warroom-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: t.bg, zIndex: 9999,
      overflowY: 'auto', WebkitOverflowScrolling: 'touch',
      paddingTop: 'env(safe-area-inset-top, 20px)',
      paddingBottom: 'calc(40px + env(safe-area-inset-bottom, 0px))'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 16px 0' }}>
        <div style={{ fontFamily: t.fontDisplay, fontSize: 16, color: t.accent, letterSpacing: 3, fontWeight: 700 }}>AYARLAR</div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <Icon name="x" size={22} color={t.textMuted} />
        </button>
      </div>

      <div style={{ padding: '0 16px' }}>
        {section('KİŞİSELLEŞTİRME')}

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: t.textSecondary, fontFamily: t.fontDisplay, letterSpacing: 2, marginBottom: 6 }}>ÇAĞRI İSMİ</div>
          <input
            type="password"
            value={form.callsign}
            onChange={e => setForm(f => ({ ...f, callsign: e.target.value }))}
            placeholder="Yeni şifre..."
            style={{ width: '100%', padding: '12px 14px', background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 10, color: t.textPrimary, fontSize: 14, fontFamily: t.fontMono, outline: 'none' }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: t.textSecondary, fontFamily: t.fontDisplay, letterSpacing: 2, marginBottom: 6 }}>KOMUTAN ÜNVANI</div>
          <input
            type="text"
            value={form.displayName}
            onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
            placeholder="KOMUTAN, BAŞKAN, AJAN..."
            style={{ width: '100%', padding: '12px 14px', background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 10, color: t.textPrimary, fontSize: 14, outline: 'none' }}
          />
          <div style={{ fontSize: 10, color: t.textMuted, marginTop: 4 }}>Giriş ekranında ve selamlama mesajlarında kullanılır</div>
        </div>

        {section('TEMA')}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 4 }}>
          {Object.values(THEMES).map(th => {
            const selected = form.theme === th.id;
            const isKAM = th.isKAM;
            return (
              <div
                key={th.id}
                onClick={() => setForm(f => ({ ...f, theme: th.id }))}
                style={{
                  background: th.bgCard,
                  border: `2px solid ${selected ? th.accent : isKAM ? '#cc000044' : t.border}`,
                  borderRadius: 12,
                  padding: '14px 12px',
                  cursor: 'pointer',
                  position: 'relative',
                  boxShadow: isKAM ? '0 0 12px #cc000015' : 'none',
                  transition: 'border-color 0.2s'
                }}
              >
                {isKAM && (
                  <div style={{ position: 'absolute', top: 6, right: 8, fontSize: 7, color: '#cc0000', fontFamily: th.fontDisplay, letterSpacing: 1, fontWeight: 700 }}>ÖZEL PROTOKOL</div>
                )}
                <div style={{ fontFamily: th.fontDisplay, fontSize: 11, color: selected ? th.accent : th.textPrimary, fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>{th.name}</div>
                <div style={{ fontSize: 10, color: th.textMuted, marginBottom: 10 }}>{th.description}</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', background: th.accent, border: `1px solid ${th.border}` }} />
                  <div style={{ width: 14, height: 14, borderRadius: '50%', background: th.bg, border: `1px solid ${th.border}` }} />
                  <div style={{ width: 14, height: 14, borderRadius: '50%', background: th.textPrimary, border: `1px solid ${th.border}` }} />
                </div>
              </div>
            );
          })}
        </div>

        {section('BİLDİRİMLER')}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 10, padding: '12px 14px' }}>
          <span style={{ fontSize: 13, color: t.textPrimary }}>GÜNLÜK DEBRİEF BİLDİRİMİ</span>
          <div
            onClick={() => setForm(f => ({ ...f, notificationsEnabled: !f.notificationsEnabled }))}
            style={{
              width: 44, height: 24, borderRadius: 12, cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
              background: form.notificationsEnabled ? t.accent : t.border
            }}
          >
            <div style={{
              position: 'absolute', top: 3, left: form.notificationsEnabled ? 23 : 3,
              width: 18, height: 18, borderRadius: '50%', background: form.notificationsEnabled ? t.bg : t.textMuted,
              transition: 'left 0.2s'
            }} />
          </div>
        </div>

        <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 10, padding: '12px 14px', marginBottom: 4 }}>
          <div style={{ fontSize: 10, color: t.textSecondary, fontFamily: t.fontDisplay, letterSpacing: 2, marginBottom: 10 }}>BİLDİRİM SAATİ</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              type="number" min={0} max={23}
              value={form.debriefHour}
              onChange={e => setForm(f => ({ ...f, debriefHour: Math.max(0, Math.min(23, Number(e.target.value))) }))}
              style={{ width: 60, padding: '8px', background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: 8, color: t.textPrimary, fontSize: 16, fontFamily: t.fontMono, textAlign: 'center', outline: 'none' }}
            />
            <span style={{ color: t.accent, fontFamily: t.fontMono, fontSize: 18 }}>:</span>
            <input
              type="number" min={0} max={59}
              value={String(form.debriefMinute).padStart(2, '0')}
              onChange={e => setForm(f => ({ ...f, debriefMinute: Math.max(0, Math.min(59, Number(e.target.value))) }))}
              style={{ width: 60, padding: '8px', background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: 8, color: t.textPrimary, fontSize: 16, fontFamily: t.fontMono, textAlign: 'center', outline: 'none' }}
            />
          </div>
        </div>

        {section('UYGULAMA')}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${t.border}` }}>
          <span style={{ fontSize: 12, color: t.textSecondary, fontFamily: t.fontDisplay, letterSpacing: 1 }}>VERSİYON</span>
          <span style={{ fontSize: 12, color: t.textMuted, fontFamily: t.fontMono }}>WAR ROOM v2.0</span>
        </div>

        <button onClick={handleExport} style={{ width: '100%', marginTop: 12, padding: '12px', background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 10, color: t.textPrimary, fontFamily: t.fontDisplay, fontSize: 11, letterSpacing: 2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Icon name="download" size={14} color={t.accent} /> VERİ DIŞA AKTAR
        </button>

        <button onClick={handleImport} style={{ width: '100%', marginTop: 8, padding: '12px', background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 10, color: t.textPrimary, fontFamily: t.fontDisplay, fontSize: 11, letterSpacing: 2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Icon name="upload" size={14} color={t.textSecondary} /> VERİ İÇE AKTAR
        </button>

        <button onClick={handleSave} style={{ width: '100%', marginTop: 20, padding: '16px', background: `linear-gradient(135deg, ${t.accent}, ${t.accentDark})`, border: 'none', borderRadius: 12, color: t.bg, fontFamily: t.fontDisplay, fontSize: 13, fontWeight: 700, letterSpacing: 2, cursor: 'pointer' }}>
          AYARLARI UYGULA
        </button>
      </div>
    </div>
  );
}

// ================ MAIN APP ================
export default function App() {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [screen, setScreen] = useState('briefing');
  const [stealthMode, setStealthMode] = useState(false);
  const [data, setData] = useState({ operations: [], directives: [], intel: [], pt: [], reminders: [], journal: [] });
  const [ver, setVer] = useState(0);
  const [settings, setSettings] = useState(null);
  const [protocol, setProtocol] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const theme = settings ? (THEMES[settings.theme] || THEMES[DEFAULT_THEME]) : THEMES[DEFAULT_THEME];

  const reload = useCallback(async () => {
    const [o, d, i, p, r, j, s, proto] = await Promise.all([
      ops.getAll(), dirs.getAll(), intl.getAll(), ptDB.getAll(), rems.getAll(), journalDB.getAll(), settingsDB.get(), protocolDB.get()
    ]);
    setData({ operations: o, directives: d, intel: i, pt: p, reminders: r, journal: j });
    setSettings(s);
    setProtocol(proto);
    setVer(v => v + 1);
  }, []);

  useEffect(() => {
    initDB().then(async () => {
      await reload();
      setReady(true);
      const splash = document.getElementById('splash');
      if (splash) { splash.classList.add('hide'); setTimeout(() => splash.remove(), 600); }
    });
  }, [reload]);

  // Reminder check
  useEffect(() => {
    if (!ready) return;
    const check = () => {
      const now = new Date();
      data.reminders.forEach(async (r) => {
        if (!r.dismissed && !r.notified && new Date(r.datetime) <= now) {
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('War Room', { body: r.title });
          }
          await rems.markNotified(r.id);
        }
      });
    };
    check();
    const t = setInterval(check, 30000);
    return () => clearInterval(t);
  }, [ready, data.reminders]);

  // Request notification permissions and schedule debrief
  useEffect(() => {
    const setupNotifications = async () => {
      const granted = await requestNotificationPermission();
      if (granted) {
        await scheduleDebriefNotification();
      }
    };
    setupNotifications();
  }, []);

  if (!ready) return null;

  // Show access screen if not authenticated
  if (!authenticated) {
    return (
      <AccessScreen
        theme={theme}
        settings={settings}
        onSuccess={() => {
          setAuthenticated(true);
          // İlk kurulum: callsign boşsa ayarlar ekranını aç
          if (!settings?.callsign) setShowSettings(true);
        }}
      />
    );
  }

  // Stealth mode screen
  if (stealthMode) {
    return (
      <StealthScreen
        theme={theme}
        onExit={() => {
          setStealthMode(false);
          setAuthenticated(false);
        }}
      />
    );
  }

  const mainNav = [
    { key: 'briefing', icon: 'grid', label: 'BRİFİNG' },
    { key: 'directives', icon: 'diamond', label: 'DİREKTİF' },
    { key: 'journal', icon: 'book', label: 'GÜNLÜK' },
    { key: 'report', icon: 'chart', label: 'RAPOR' },
  ];

  const moreNav = [
    { key: 'operations', icon: 'hex', label: 'OPERASYON' },
    { key: 'intel', icon: 'search', label: 'İSTİHBARAT' },
    { key: 'pt', icon: 'dumbbell', label: 'FİZİKSEL' },
    { key: 'protokol', icon: 'shield', label: 'PROTOKOL' },
    { key: '_settings', icon: 'settings', label: 'AYARLAR' },
  ];

  const inMore = moreNav.some(i => i.key === screen);

  const screens = {
    briefing: <Briefing data={data} reload={reload} nav={setScreen} onStealth={() => setStealthMode(true)} theme={theme} onSettingsOpen={() => setShowSettings(true)} />,
    operations: <Operations data={data} reload={reload} theme={theme} />,
    directives: <Directives data={data} reload={reload} theme={theme} />,
    intel: <Intel data={data} reload={reload} theme={theme} />,
    journal: <Journal data={data} reload={reload} theme={theme} />,
    report: <IntelReport data={data} theme={theme} />,
    pt: <PT data={data} reload={reload} theme={theme} />,
    protokol: <Protokol data={protocol} theme={theme} />,
  };

  const handleMoreNav = (key) => {
    if (key === '_settings') { setShowMoreMenu(false); setShowSettings(true); return; }
    setScreen(key);
    setShowMoreMenu(false);
  };

  const handleSettingsSave = (newSettings) => {
    setSettings(newSettings);
    // Tema değişimi anlık yansır, settings state'i güncellendiği için 
    // root bileşendeki 'theme' değişkeni de THEMES[newSettings.theme] olarak güncellenir.
    setShowSettings(false);
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: theme.bg, color: theme.textPrimary, position: 'relative' }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, maxWidth: 480, margin: '0 auto', backgroundImage: `radial-gradient(circle at 50% 0%,${theme.accentGlow} 0%,transparent 50%)` }} />
      <div style={{ position: 'relative', zIndex: 1, height: '100vh', overflow: 'auto', WebkitOverflowScrolling: 'touch', paddingTop: 'env(safe-area-inset-top, 20px)' }}>{screens[screen] || screens['briefing']}</div>

      {/* More menu overlay */}
      {showMoreMenu && (
        <div
          onClick={() => setShowMoreMenu(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 150 }}
        />
      )}

      {/* More menu panel */}
      {showMoreMenu && (
        <div style={{
          position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
          width: 'calc(100% - 32px)', maxWidth: 448, zIndex: 151,
          background: `${theme.bgCard}f2`, backdropFilter: 'blur(20px)',
          border: `1px solid ${theme.accent}44`, borderRadius: 16,
          padding: '8px 4px',
          boxShadow: `0 -4px 30px ${theme.accentGlow}`
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)' }}>
            {moreNav.map(item => (
              <button key={item.key} onClick={() => handleMoreNav(item.key)} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 4px',
                opacity: screen === item.key ? 1 : 0.7
              }}>
                <Icon name={item.icon} size={18} color={screen === item.key ? theme.accent : theme.textSecondary} />
                <span style={{ fontFamily: theme.fontDisplay, fontSize: 6, letterSpacing: 1, color: screen === item.key ? theme.accent : theme.textSecondary }}>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Navbar */}
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, zIndex: 100 }}>
        <div style={{ background: `linear-gradient(180deg,transparent,${theme.bg}ee 30%)`, paddingTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', background: `${theme.bgCard}f5`, backdropFilter: 'blur(20px)', borderTop: `1px solid ${theme.border}`, padding: '8px 2px', paddingBottom: 'calc(8px + env(safe-area-inset-bottom,0px))', margin: '0 8px', borderRadius: '16px 16px 0 0' }}>
            {mainNav.map(item => (
              <button key={item.key} onClick={() => { setScreen(item.key); setShowMoreMenu(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '4px 8px', minWidth: 56, opacity: screen === item.key ? 1 : 0.35 }}>
                <Icon name={item.icon} size={18} color={screen === item.key ? theme.accent : theme.textMuted} />
                <span style={{ fontFamily: theme.fontDisplay, fontSize: 6, letterSpacing: 1, color: screen === item.key ? theme.accent : theme.textMuted }}>{item.label}</span>
                {screen === item.key && <div style={{ width: 12, height: 2, borderRadius: 1, background: theme.accent, marginTop: 1 }} />}
              </button>
            ))}
            {/* More button */}
            <button onClick={() => setShowMoreMenu(m => !m)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '4px 8px', minWidth: 56, opacity: (showMoreMenu || inMore) ? 1 : 0.35 }}>
              <Icon name="moreH" size={18} color={(showMoreMenu || inMore) ? theme.accent : theme.textMuted} />
              <span style={{ fontFamily: theme.fontDisplay, fontSize: 6, letterSpacing: 1, color: (showMoreMenu || inMore) ? theme.accent : theme.textMuted }}>DAHA</span>
              {(showMoreMenu || inMore) && <div style={{ width: 12, height: 2, borderRadius: 1, background: theme.accent, marginTop: 1 }} />}
            </button>
          </div>
        </div>
      </div>

      {/* Settings modal */}
      {showSettings && (
        <Settings
          theme={theme}
          settings={settings}
          onSave={handleSettingsSave}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
