import React, { useState, useEffect, useCallback, useRef } from 'react';
import { initDB, ops, opLogs, dirs, intl, ptDB, rems, journalDB, exportAllData } from './db.js';
import Icon, { priIcon, catIcon } from './Icons.jsx';
import { Modal, Inp, Btn, Empty, AddBtn, PC, SC, CC, quotes, fd, mt, gr, milDate, MOODS } from './UI.jsx';
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

async function scheduleDebriefNotification() {
  try {
    // Her gün 22:00'da bildirim
    const now = new Date();
    const target = new Date();
    target.setHours(22, 0, 0, 0);

    // Eğer bugün 22:00 geçtiyse, yarın için ayarla
    if (now >= target) {
      target.setDate(target.getDate() + 1);
    }

    const cryptoCode = generateCryptoCode();

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

// ================ STEALTH SCREEN ================
function StealthScreen({ onExit }) {
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
      position: 'fixed', inset: 0, background: '#0a0e14',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999
    }}>
      <div style={{
        fontFamily: "'Orbitron', sans-serif",
        fontSize: 72,
        color: '#e8e6e3',
        fontWeight: 800,
        letterSpacing: 8,
        animation: 'pulse 4s ease infinite'
      }}>
        {formatTime(time)}
      </div>

      <div style={{
        fontFamily: "'Orbitron', sans-serif",
        fontSize: 12,
        color: '#6b7280',
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
        <Icon name="eye" size={24} color="#6b7280" />
      </button>
    </div>
  );
}

function AccessScreen({ onSuccess }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);
  const [lockTime, setLockTime] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (locked && lockTime > 0) {
      const t = setInterval(() => setLockTime(v => v - 1), 1000);
      return () => clearInterval(t);
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
    if (VALID_CODES.includes(normalized)) {
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

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#0a0e14',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      animation: error ? 'shake 0.4s ease' : 'none',
      zIndex: 9999
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: error ? 'rgba(196, 69, 54, 0.15)' : 'transparent',
        transition: 'background 0.2s ease',
        pointerEvents: 'none'
      }} />

      <div style={{ textAlign: 'center', zIndex: 1 }}>
        <div style={{
          fontFamily: "'Orbitron', sans-serif",
          fontSize: 11,
          color: '#6b7280',
          letterSpacing: 4,
          marginBottom: 8
        }}>WAR ROOM</div>

        <h1 style={{
          fontFamily: "'Orbitron', sans-serif",
          fontSize: 24,
          color: '#d4a843',
          letterSpacing: 3,
          marginBottom: 40,
          fontWeight: 800
        }}>CALLSIGN GİR</h1>

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
              background: '#111318',
              border: `2px solid ${error ? '#c44536' : locked ? '#6b7280' : '#d4a843'}`,
              borderRadius: 12,
              color: '#e8e6e3',
              fontSize: 18,
              fontFamily: "'JetBrains Mono', monospace",
              textAlign: 'center',
              letterSpacing: 4,
              outline: 'none',
              transition: 'border-color 0.2s ease'
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
              background: locked || !code.trim() ? '#1e2028' : 'linear-gradient(135deg, #d4a843, #b8912e)',
              border: 'none',
              borderRadius: 12,
              color: locked || !code.trim() ? '#6b7280' : '#0a0e14',
              fontFamily: "'Orbitron', sans-serif",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 2,
              cursor: locked || !code.trim() ? 'not-allowed' : 'pointer'
            }}
          >
            {locked ? `KİLİTLİ (${lockTime}s)` : 'ONAYLA'}
          </button>
        </form>

        {error && (
          <div style={{
            marginTop: 20,
            fontFamily: "'Orbitron', sans-serif",
            fontSize: 10,
            color: '#c44536',
            letterSpacing: 2,
            animation: 'fadeIn 0.2s ease'
          }}>
            ERİŞİM REDDEDİLDİ — CALLSIGN GEÇERSİZ
          </div>
        )}

        {!error && attempts > 0 && !locked && (
          <div style={{
            marginTop: 20,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            color: '#6b7280'
          }}>
            {3 - attempts} deneme hakkı kaldı
          </div>
        )}
      </div>
    </div>
  );
}

// ================ BRIEFING SCREEN ================
function Briefing({ data, reload, nav, onStealth }) {
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
            <div style={{ fontSize: 11, color: '#6b7280', fontFamily: "'JetBrains Mono',monospace", letterSpacing: 1, marginBottom: 4 }}>{milDate()}</div>
            <h1 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 22, color: '#e8e6e3', margin: '4px 0 0', fontWeight: 800, letterSpacing: 1 }}>{gr()}</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <button onClick={onStealth} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, marginTop: 8, opacity: 0.5 }}>
              <Icon name="eyeOff" size={20} color="#6b7280" />
            </button>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 28, fontWeight: 700, color: '#d4a843', letterSpacing: 2, marginTop: 4 }}>{mt()}</div>
          </div>
        </div>
      </div>

      {/* Quote */}
      <div key={qi} style={{ background: 'linear-gradient(135deg,#d4a84310,#d4a84305)', borderRadius: 14, padding: '14px 16px', marginBottom: 20, border: '1px solid #d4a84318', display: 'flex', gap: 12, alignItems: 'flex-start', animation: 'fadeQuote 8s ease infinite' }}>
        <div style={{ flexShrink: 0, marginTop: 2 }}><Icon name="quote" size={14} color="#d4a84366" /></div>
        <div style={{ fontSize: 12, color: '#d4a843cc', lineHeight: 1.6, fontStyle: 'italic' }}>{quotes[qi]}</div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
        {[{ l: 'AKTİF\nOPERASYON', v: ao, c: '#4a9d5b' }, { l: 'BEKLEYEN\nDİREKTİF', v: pd, c: '#d4a843' }, { l: 'BUGÜN\nTAMAMLANAN', v: ct, c: '#5b8fd4' }].map((s, i) =>
          <div key={i} style={{ background: '#111318', borderRadius: 14, padding: '16px 12px', border: '1px solid #1e2028', textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.c, fontFamily: "'Orbitron',sans-serif" }}>{s.v}</div>
            <div style={{ fontSize: 9, color: '#6b7280', marginTop: 4, fontFamily: "'Orbitron',sans-serif", letterSpacing: 1, whiteSpace: 'pre-line', lineHeight: 1.4 }}>{s.l}</div>
          </div>
        )}
      </div>

      {/* Mood Tracker - Last 7 Days */}
      {data.journal.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, justifyContent: 'center' }}>
          <span style={{ fontSize: 9, color: '#6b7280', fontFamily: "'Orbitron',sans-serif", letterSpacing: 1 }}>RUH HALİ</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {last7Days.map((mood, i) => (
              <div key={i} style={{
                width: 12, height: 12, borderRadius: '50%',
                background: mood ? MOODS[mood]?.color : '#1e2028',
                border: mood ? 'none' : '1px solid #2a2d35'
              }} />
            ))}
          </div>
        </div>
      )}

      {/* Quick Note */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 16,
        background: noteSaved ? '#4a9d5b15' : 'transparent',
        borderRadius: 12, padding: noteSaved ? 2 : 0,
        transition: 'all 0.2s ease'
      }}>
        <input
          value={quickNote}
          onChange={e => setQuickNote(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && saveQuickNote()}
          placeholder="Hızlı not yaz..."
          style={{
            flex: 1, padding: '12px 14px', background: '#111318',
            border: '1px solid #1e2028', borderRadius: 10,
            color: '#e8e6e3', fontSize: 13, outline: 'none'
          }}
        />
        <button onClick={saveQuickNote} style={{
          background: 'linear-gradient(135deg,#d4a843,#b8912e)',
          border: 'none', borderRadius: 10, padding: '0 14px', cursor: 'pointer'
        }}>
          <Icon name="send" size={16} color="#0a0e14" />
        </button>
      </div>

      {/* Weekly Report */}
      {(weekDirs.length > 0 || weekPT > 0 || weekJournal > 0) && (
        <div style={{
          background: 'linear-gradient(135deg,#d4a84308,#d4a84303)',
          borderRadius: 14, padding: '14px 16px', marginBottom: 16,
          border: '1px solid #d4a84320'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Icon name="chart" size={14} color="#d4a843" />
            <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 10, color: '#d4a843', letterSpacing: 2 }}>HAFTALIK KARNE</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 11 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9ca3af' }}>
              <span>Tamamlanan direktif</span>
              <span style={{ color: '#4a9d5b', fontWeight: 600, fontFamily: "'JetBrains Mono',monospace" }}>{weekDirs.length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9ca3af' }}>
              <span>Antrenman günü</span>
              <span style={{ color: '#d4a843', fontWeight: 600, fontFamily: "'JetBrains Mono',monospace" }}>{weekPT}/7</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9ca3af' }}>
              <span>Günlük yazma</span>
              <span style={{ color: '#5b8fd4', fontWeight: 600, fontFamily: "'JetBrains Mono',monospace" }}>{weekJournal}/7</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#9ca3af' }}>
              <span>Mood</span>
              <span style={{ marginLeft: 'auto', display: 'flex', gap: 2 }}>
                {moodCount.GOOD > 0 && <span style={{ color: '#4a9d5b' }}>🟢{moodCount.GOOD}</span>}
                {moodCount.NEUTRAL > 0 && <span style={{ color: '#d4a843' }}>🟡{moodCount.NEUTRAL}</span>}
                {moodCount.TOUGH > 0 && <span style={{ color: '#c44536' }}>🔴{moodCount.TOUGH}</span>}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Reminders */}
      {upRem.length > 0 && (
        <div style={{ background: 'linear-gradient(135deg,#5b8fd415,#5b8fd408)', borderRadius: 14, padding: '14px 16px', marginBottom: 16, border: '1px solid #5b8fd425' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Icon name="bell" size={14} color="#5b8fd4" />
            <span style={{ fontSize: 10, color: '#5b8fd4', fontFamily: "'Orbitron',sans-serif", letterSpacing: 2 }}>HATIRLATICILAR</span>
          </div>
          {upRem.slice(0, 3).map(r => (
            <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #1e2028' }}>
              <span style={{ fontSize: 12, color: '#e8e6e3' }}>{r.title}</span>
              <button onClick={() => dismissRem(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}><Icon name="check" size={14} color="#4a9d5b" /></button>
            </div>
          ))}
        </div>
      )}

      {/* Critical Alert */}
      {cr.length > 0 && (
        <div style={{ background: 'linear-gradient(135deg,#2a0a0a,#1a0505)', borderRadius: 14, padding: '14px 16px', marginBottom: 16, border: '1px solid #c4453644', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Icon name="alert" size={20} color="#c44536" />
          <div>
            <div style={{ fontSize: 10, color: '#c44536', fontFamily: "'Orbitron',sans-serif", letterSpacing: 2, marginBottom: 2 }}>KRİTİK UYARI</div>
            <div style={{ fontSize: 13, color: '#e8e6e3' }}>{cr.length} kritik direktif bekliyor</div>
          </div>
        </div>
      )}

      {empty ? <Empty icon="target" title="KOMUTA MERKEZİ HAZIR" sub={"Operasyonlarını ve direktiflerini ekleyerek\nkomuta merkezini aktifleştir."} /> : (
        <>
          {/* Active Operations */}
          {data.operations.filter(o => o.status === 'ACTIVE').length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h2 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 12, color: '#d4a843', letterSpacing: 2, margin: 0 }}>OPERASYON DURUMU</h2>
                <button onClick={() => nav('operations')} style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 11, cursor: 'pointer', fontFamily: "'JetBrains Mono',monospace", display: 'flex', alignItems: 'center', gap: 4 }}>TÜMÜ <Icon name="arrow" size={12} color="#6b7280" /></button>
              </div>
              {data.operations.filter(o => o.status === 'ACTIVE').map(op => (
                <div key={op.id} style={{ background: '#111318', borderRadius: 14, padding: '14px 16px', border: '1px solid #1e2028', marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: op.color }} /><span style={{ fontSize: 14, fontWeight: 600 }}>{op.name}</span></div>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: op.color, fontWeight: 700 }}>{op.progress}%</span>
                  </div>
                  <div style={{ height: 4, background: '#1e2028', borderRadius: 2, overflow: 'hidden' }}>
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
                <h2 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 12, color: '#d4a843', letterSpacing: 2, margin: 0 }}>ÖNCELİKLİ DİREKTİFLER</h2>
                <button onClick={() => nav('directives')} style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 11, cursor: 'pointer', fontFamily: "'JetBrains Mono',monospace", display: 'flex', alignItems: 'center', gap: 4 }}>TÜMÜ <Icon name="arrow" size={12} color="#6b7280" /></button>
              </div>
              {td.map(d => {
                const p = PC[d.priority]; const op = data.operations.find(o => o.id === d.operation_id);
                return (
                  <div key={d.id} onClick={() => toggle(d.id)} style={{ background: '#111318', borderRadius: 12, padding: '12px 14px', border: '1px solid #1e2028', marginBottom: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, borderLeft: '3px solid ' + p.color }}>
                    <div style={{ width: 22, height: 22, borderRadius: 6, border: '2px solid ' + p.color + '33', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: d.done ? p.color : 'transparent' }}>{d.done && <Icon name="check" size={12} color="#fff" />}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: d.done ? '#6b7280' : '#e8e6e3', textDecoration: d.done ? 'line-through' : 'none' }}>{d.title}</div>
                      <div style={{ fontSize: 10, color: '#6b7280', marginTop: 3, display: 'flex', gap: 8, alignItems: 'center' }}>
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
function Operations({ data, reload }) {
  const [show, setShow] = useState(false);
  const [detail, setDetail] = useState(null);
  const [edit, setEdit] = useState(null);
  const [f, sf] = useState({ name: '', description: '', status: 'PLANNING', progress: 0, color: '#d4a843' });
  const [comment, setComment] = useState('');
  const [detailLogs, setDetailLogs] = useState([]);
  const colors = ['#d4a843', '#4a9d5b', '#c44536', '#5b8fd4', '#9b59b6', '#e67e22', '#1abc9c'];

  const loadLogs = async (opId) => { const l = await opLogs.getByOp(opId); setDetailLogs(l); };

  const openAdd = () => { setEdit(null); sf({ name: '', description: '', status: 'PLANNING', progress: 0, color: '#d4a843' }); setShow(true); };
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
          <h1 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 20, color: '#e8e6e3', margin: 0, letterSpacing: 1 }}>OPERASYONLAR</h1>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4, fontFamily: "'JetBrains Mono',monospace" }}>{data.operations.length} operasyon</div>
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
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#6b7280' }}>({items.length})</span>
              </div>
              {items.map(op => {
                const dc = data.directives.filter(d => d.operation_id === op.id && !d.done).length;
                return (
                  <div key={op.id} onClick={() => openDetail(op)} style={{ background: '#111318', borderRadius: 16, padding: '18px 16px', border: '1px solid #1e2028', marginBottom: 10, cursor: 'pointer', borderLeft: '4px solid ' + op.color }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div><div style={{ fontSize: 16, fontWeight: 700 }}>{op.name}</div><div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{op.description}</div></div>
                      <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 18, fontWeight: 800, color: op.color }}>{op.progress}%</span>
                    </div>
                    <div style={{ height: 6, background: '#1e2028', borderRadius: 3, overflow: 'hidden', marginBottom: 10 }}>
                      <div style={{ height: '100%', width: op.progress + '%', background: `linear-gradient(90deg,${op.color}66,${op.color})`, borderRadius: 3 }} />
                    </div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 10, color: '#6b7280', fontFamily: "'JetBrains Mono',monospace", alignItems: 'center' }}>
                      <span>{dc} direktif</span><span>•</span><span style={{ color: cfg.color }}>{cfg.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}

      {/* Add/Edit Modal */}
      <Modal isOpen={show} onClose={() => setShow(false)} title={edit ? 'OPERASYON DÜZENLE' : 'YENİ OPERASYON'}>
        <Inp label="OPERASYON ADI" value={f.name} onChange={v => sf(x => ({ ...x, name: v }))} placeholder="Operasyon adı..." />
        <Inp label="AÇIKLAMA" value={f.description} onChange={v => sf(x => ({ ...x, description: v }))} placeholder="Kısa açıklama..." multiline />
        <Inp label="DURUM" value={f.status} onChange={v => sf(x => ({ ...x, status: v }))} options={Object.entries(SC).map(([k, v]) => ({ value: k, label: v.label }))} />
        <Inp label="İLERLEME (%)" type="number" value={f.progress} onChange={v => sf(x => ({ ...x, progress: Math.min(100, Math.max(0, v)) }))} />
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 11, color: '#6b7280', marginBottom: 8, fontFamily: "'Orbitron',sans-serif", letterSpacing: 1 }}>RENK KODU</label>
          <div style={{ display: 'flex', gap: 8 }}>{colors.map(c =>
            <div key={c} onClick={() => sf(x => ({ ...x, color: c }))} style={{ width: 32, height: 32, borderRadius: 8, background: c, cursor: 'pointer', border: f.color === c ? '2px solid #e8e6e3' : '2px solid transparent' }} />
          )}</div>
        </div>
        <Btn label={edit ? 'GÜNCELLE' : 'OPERASYON OLUŞTUR'} onClick={save} icon="check" />
        {edit && <div style={{ marginTop: 10 }}><Btn label="SİL" onClick={() => del(edit.id)} variant="danger" icon="trash" /></div>}
      </Modal>

      {/* Detail Modal */}
      <Modal isOpen={!!detail} onClose={() => { setDetail(null); setComment(''); }} title="OPERASYON DETAY">
        {detailOp && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#e8e6e3' }}>{detailOp.name}</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{detailOp.description}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 24, fontWeight: 800, color: detailOp.color }}>{detailOp.progress}%</div>
                <div style={{ fontSize: 10, color: SC[detailOp.status]?.color, fontFamily: "'Orbitron',sans-serif", letterSpacing: 1 }}>{SC[detailOp.status]?.label}</div>
              </div>
            </div>
            <div style={{ height: 6, background: '#1e2028', borderRadius: 3, overflow: 'hidden', marginBottom: 20 }}>
              <div style={{ height: '100%', width: detailOp.progress + '%', background: `linear-gradient(90deg,${detailOp.color}66,${detailOp.color})`, borderRadius: 3 }} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button onClick={() => openEdit(detailOp)} style={{ flex: 1, padding: 10, borderRadius: 10, background: '#1e2028', border: 'none', color: '#d4a843', fontSize: 11, fontFamily: "'Orbitron',sans-serif", letterSpacing: 1, cursor: 'pointer' }}>DÜZENLE</button>
              <button onClick={() => del(detailOp.id)} style={{ padding: '10px 16px', borderRadius: 10, background: '#c4453620', border: 'none', cursor: 'pointer' }}><Icon name="trash" size={14} color="#c44536" /></button>
            </div>

            {/* Timeline */}
            <div style={{ borderTop: '1px solid #1e2028', paddingTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Icon name="timeline" size={14} color="#d4a843" />
                <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 11, color: '#d4a843', letterSpacing: 2 }}>ZAMAN ÇİZELGESİ</span>
              </div>

              {/* Add comment input */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <input value={comment} onChange={e => setComment(e.target.value)} placeholder="Yorum ekle..." onKeyDown={e => e.key === 'Enter' && addLog()} style={{ flex: 1, padding: '10px 14px', background: '#0a0e14', border: '1px solid #1e2028', borderRadius: 10, color: '#e8e6e3', fontSize: 13, outline: 'none' }} />
                <button onClick={addLog} style={{ background: 'linear-gradient(135deg,#d4a843,#b8912e)', border: 'none', borderRadius: 10, padding: '0 14px', cursor: 'pointer' }}><Icon name="plus" size={16} color="#0a0e14" /></button>
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
                    background: detailOp.color, border: '2px solid #111318'
                  }} />
                  <div style={{ fontSize: 10, color: '#6b7280', fontFamily: "'JetBrains Mono',monospace", marginBottom: 2 }}>
                    {new Date(detailOp.created_at).toLocaleString('tr-TR')}
                  </div>
                  <div style={{ fontSize: 12, color: '#9ca3af', fontStyle: 'italic' }}>
                    Operasyon oluşturuldu
                  </div>
                </div>

                {/* Log entries (chronological - oldest first) */}
                {[...detailLogs].sort((a, b) => a.created_at - b.created_at).map(log => (
                  <div key={log.id} style={{ position: 'relative', marginBottom: 16 }}>
                    <div style={{
                      position: 'absolute', left: -15, top: 4,
                      width: 6, height: 6, borderRadius: '50%',
                      background: '#6b7280'
                    }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 10, color: '#6b7280', fontFamily: "'JetBrains Mono',monospace", marginBottom: 2 }}>
                          {new Date(log.created_at).toLocaleString('tr-TR')}
                        </div>
                        <div style={{ fontSize: 13, color: '#e8e6e3', lineHeight: 1.5 }}>{log.text}</div>
                      </div>
                      <button onClick={() => delLog(log.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, flexShrink: 0 }}>
                        <Icon name="x" size={12} color="#6b728044" />
                      </button>
                    </div>
                  </div>
                ))}

                {detailLogs.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '20px 0', color: '#6b7280', fontSize: 12 }}>
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
function Directives({ data, reload }) {
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
          <h1 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 20, color: '#e8e6e3', margin: 0, letterSpacing: 1 }}>DİREKTİFLER</h1>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4, fontFamily: "'JetBrains Mono',monospace" }}>{data.directives.filter(d => !d.done).length} bekleyen</div>
        </div>
        <AddBtn onClick={() => setShow(true)} />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
        {[{ key: 'ALL', label: 'TÜMÜ', color: '#e8e6e3' }, ...Object.entries(PC).map(([k, v]) => ({ key: k, label: v.label, color: v.color })), { key: 'DONE', label: 'TAMAM', color: '#6b7280' }].map(x =>
          <button key={x.key} onClick={() => setFilter(x.key)} style={{ padding: '8px 14px', borderRadius: 20, border: '1px solid', borderColor: filter === x.key ? x.color : '#1e2028', background: filter === x.key ? x.color + '15' : 'transparent', color: filter === x.key ? x.color : '#6b7280', fontFamily: "'Orbitron',sans-serif", fontSize: 9, letterSpacing: 1, cursor: 'pointer', whiteSpace: 'nowrap' }}>{x.label}</button>
        )}
      </div>

      {fl.length === 0 ? <Empty icon="diamond" title={data.directives.length === 0 ? 'DİREKTİF YOK' : 'SONUÇ YOK'} sub={data.directives.length === 0 ? "İlk direktifini oluşturmak için\n+ butonuna dokun." : "Bu filtreyle eşleşen direktif yok."} /> :
        fl.map(d => {
          const p = PC[d.priority]; const op = data.operations.find(o => o.id === d.operation_id);
          const hasRem = data.reminders.some(r => r.directive_id === d.id && !r.dismissed);
          return (
            <div key={d.id} style={{ background: '#111318', borderRadius: 14, padding: '14px 16px', border: '1px solid #1e2028', marginBottom: 8, borderLeft: '3px solid ' + (d.done ? '#6b728044' : p.color), opacity: d.done ? .6 : 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div onClick={() => toggle(d.id)} style={{ width: 24, height: 24, borderRadius: 7, cursor: 'pointer', border: '2px solid ' + (d.done ? '#4a9d5b' : p.color) + '40', background: d.done ? '#4a9d5b' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{d.done && <Icon name="check" size={13} color="#fff" />}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: d.done ? '#6b7280' : '#e8e6e3', textDecoration: d.done ? 'line-through' : 'none' }}>{d.title}</div>
                  <div style={{ fontSize: 10, color: '#6b7280', marginTop: 4, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: p.color }}><Icon name={priIcon[d.priority]} size={10} color={p.color} />{p.label}</span>
                    {op && <span style={{ color: op.color }}>{op.name}</span>}
                    {d.due && <span>{fd(d.due)}</span>}
                    {hasRem && <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}><Icon name="bell" size={10} color="#5b8fd4" /></span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  {!d.done && <button onClick={() => { setRemFor(d); setRemShow(true); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><Icon name="bell" size={14} color={hasRem ? '#5b8fd4' : '#6b728044'} /></button>}
                  <button onClick={() => del(d.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><Icon name="x" size={14} color="#6b728044" /></button>
                </div>
              </div>
            </div>
          );
        })}

      <Modal isOpen={show} onClose={() => setShow(false)} title="YENİ DİREKTİF">
        <Inp label="DİREKTİF" value={f.title} onChange={v => sf(x => ({ ...x, title: v }))} placeholder="Görev tanımını gir..." />
        <Inp label="ÖNCELİK" value={f.priority} onChange={v => sf(x => ({ ...x, priority: v }))} options={Object.entries(PC).map(([k, v]) => ({ value: k, label: v.label }))} />
        <Inp label="OPERASYON" value={f.operationId} onChange={v => sf(x => ({ ...x, operationId: v }))} options={[{ value: '', label: '— Bağımsız —' }, ...data.operations.map(o => ({ value: o.id, label: o.name }))]} />
        <Inp label="TERMİN TARİHİ" type="date" value={f.due} onChange={v => sf(x => ({ ...x, due: v }))} />
        <Btn label="DİREKTİF OLUŞTUR" onClick={save} icon="check" />
      </Modal>

      <Modal isOpen={remShow} onClose={() => setRemShow(false)} title="HATIRLATICI OLUŞTUR">
        {remFor && (
          <div>
            <div style={{ background: '#0a0e14', borderRadius: 10, padding: 12, marginBottom: 16, border: '1px solid #1e2028' }}>
              <div style={{ fontSize: 10, color: '#6b7280', fontFamily: "'Orbitron',sans-serif", letterSpacing: 1, marginBottom: 4 }}>DİREKTİF</div>
              <div style={{ fontSize: 14, color: '#e8e6e3' }}>{remFor.title}</div>
            </div>
            <Inp label="TARİH" type="date" value={remForm.date} onChange={v => setRemForm(x => ({ ...x, date: v }))} />
            <Inp label="SAAT" type="time" value={remForm.time} onChange={v => setRemForm(x => ({ ...x, time: v }))} />
            <Btn label="HATIRLATICI KAYDET" onClick={saveRem} icon="bell" />
          </div>
        )}
      </Modal>
    </div>
  );
}

// ================ INTEL SCREEN ================
function Intel({ data, reload }) {
  const [show, setShow] = useState(false);
  const [f, sf] = useState({ title: '', content: '', category: 'IDEA' });
  const [exp, setExp] = useState(null);

  const save = async () => { if (!f.title.trim()) return; await intl.add(f); setShow(false); sf({ title: '', content: '', category: 'IDEA' }); reload(); };
  const del = async (id) => { await intl.delete(id); reload(); };

  return (
    <div style={{ padding: '0 16px 120px' }}>
      <div style={{ paddingTop: 20, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 20, color: '#e8e6e3', margin: 0, letterSpacing: 1 }}>İSTİHBARAT</h1>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4, fontFamily: "'JetBrains Mono',monospace" }}>{data.intel.length} kayıt</div>
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
            <div key={item.id} onClick={() => setExp(expanded ? null : item.id)} style={{ background: '#111318', borderRadius: 14, padding: '14px 16px', border: '1px solid #1e2028', marginBottom: 10, cursor: 'pointer', borderLeft: '3px solid ' + cat.color }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <Icon name={catIcon[item.category]} size={12} color={cat.color} />
                    <span style={{ fontSize: 9, color: cat.color, fontFamily: "'Orbitron',sans-serif", letterSpacing: 1 }}>{cat.label}</span>
                    <span style={{ fontSize: 10, color: '#6b7280', fontFamily: "'JetBrains Mono',monospace" }}>{new Date(item.created_at).toLocaleDateString('tr-TR')}</span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{item.title}</div>
                  {expanded && item.content && <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 10, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{item.content}</div>}
                </div>
                <button onClick={e => { e.stopPropagation(); del(item.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><Icon name="x" size={14} color="#6b728044" /></button>
              </div>
            </div>
          );
        })}

      <Modal isOpen={show} onClose={() => setShow(false)} title="YENİ İSTİHBARAT">
        <Inp label="BAŞLIK" value={f.title} onChange={v => sf(x => ({ ...x, title: v }))} placeholder="Başlık gir..." />
        <Inp label="İÇERİK" value={f.content} onChange={v => sf(x => ({ ...x, content: v }))} placeholder="Detayları yaz..." multiline />
        <Inp label="KATEGORİ" value={f.category} onChange={v => sf(x => ({ ...x, category: v }))} options={Object.entries(CC).map(([k, v]) => ({ value: k, label: v.label }))} />
        <Btn label="KAYDET" onClick={save} icon="check" />
      </Modal>
    </div>
  );
}

// ================ JOURNAL SCREEN ================
function Journal({ data, reload }) {
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
    is_debrief: false, debrief_good: '', debrief_improve: '', debrief_tomorrow: ''
  });

  const openAdd = (isDebrief = false) => {
    sf({
      title: '', content: '', mood: 'NEUTRAL',
      is_debrief: isDebrief, debrief_good: '', debrief_improve: '', debrief_tomorrow: ''
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
      media: JSON.stringify(media)
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
          <h1 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 20, color: '#e8e6e3', margin: 0, letterSpacing: 1 }}>GÜNLÜK</h1>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4, fontFamily: "'JetBrains Mono',monospace" }}>{data.journal.length} kayıt</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => openAdd(true)} style={{
            background: '#1e2028', border: 'none', padding: '10px 14px',
            borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
          }}>
            <Icon name="clock" size={14} color="#5b8fd4" />
            <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, color: '#5b8fd4', letterSpacing: 1 }}>DEBRİEF</span>
          </button>
          <AddBtn onClick={() => openAdd(false)} />
        </div>
      </div>

      {sortedDates.length === 0 ? (
        <Empty icon="book" title="GÜNLÜK BOŞ" sub={"Günlük düşüncelerini ve deneyimlerini\nburaya kaydet."} />
      ) : (
        sortedDates.map(dateStr => (
          <div key={dateStr} style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 10, color: '#6b7280', letterSpacing: 2, marginBottom: 10 }}>
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
                  background: '#111318', borderRadius: 14, padding: '14px 16px',
                  border: '1px solid #1e2028', marginBottom: 10, cursor: 'pointer',
                  borderLeft: `3px solid ${mood.color}`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 14 }}>{mood.emoji}</span>
                        <span style={{ fontSize: 10, color: mood.color, fontFamily: "'Orbitron',sans-serif", letterSpacing: 1 }}>
                          {j.is_debrief ? 'DEBRİEF' : mood.label}
                        </span>
                        <span style={{ fontSize: 10, color: '#6b7280', fontFamily: "'JetBrains Mono',monospace" }}>
                          {new Date(j.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {(photoCount > 0 || audioCount > 0 || videoCount > 0) && (
                          <span style={{ fontSize: 10, color: '#6b7280' }}>
                            {photoCount > 0 && `📷${photoCount} `}
                            {audioCount > 0 && `🎤${audioCount} `}
                            {videoCount > 0 && `🎥${videoCount}`}
                          </span>
                        )}
                      </div>
                      {j.title && <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: '#e8e6e3' }}>{j.title}</div>}

                      {!expanded && j.content && (
                        <div style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.5 }}>
                          {j.content.slice(0, 80)}{j.content.length > 80 ? '...' : ''}
                        </div>
                      )}

                      {expanded && (
                        <>
                          {j.content && <div style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: 12 }}>{j.content}</div>}

                          {j.is_debrief && (
                            <div style={{ borderTop: '1px solid #1e2028', paddingTop: 12, marginTop: 8 }}>
                              {j.debrief_good && (
                                <div style={{ marginBottom: 10 }}>
                                  <div style={{ fontSize: 9, color: '#4a9d5b', fontFamily: "'Orbitron',sans-serif", letterSpacing: 1, marginBottom: 4 }}>NE İYİ GİTTİ</div>
                                  <div style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1.5 }}>{j.debrief_good}</div>
                                </div>
                              )}
                              {j.debrief_improve && (
                                <div style={{ marginBottom: 10 }}>
                                  <div style={{ fontSize: 9, color: '#d4a843', fontFamily: "'Orbitron',sans-serif", letterSpacing: 1, marginBottom: 4 }}>NE GELİŞTİRİLMELİ</div>
                                  <div style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1.5 }}>{j.debrief_improve}</div>
                                </div>
                              )}
                              {j.debrief_tomorrow && (
                                <div>
                                  <div style={{ fontSize: 9, color: '#5b8fd4', fontFamily: "'Orbitron',sans-serif", letterSpacing: 1, marginBottom: 4 }}>YARIN ÖNCELİK</div>
                                  <div style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1.5 }}>{j.debrief_tomorrow}</div>
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
      <Modal isOpen={show} onClose={() => setShow(false)} title={debrief ? 'GÜNLÜK DEBRİEF' : 'YENİ GÜNLÜK GİRİŞİ'}>
        {/* Mood Selection */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 11, color: '#6b7280', marginBottom: 8, fontFamily: "'Orbitron',sans-serif", letterSpacing: 1 }}>RUH HALİ</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {Object.entries(MOODS).map(([key, mood]) => (
              <button
                key={key}
                onClick={() => sf(x => ({ ...x, mood: key }))}
                style={{
                  flex: 1, padding: '12px 8px', borderRadius: 10,
                  background: f.mood === key ? mood.color + '20' : '#0a0e14',
                  border: `2px solid ${f.mood === key ? mood.color : '#1e2028'}`,
                  cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4
                }}
              >
                <span style={{ fontSize: 20 }}>{mood.emoji}</span>
                <span style={{ fontSize: 9, color: f.mood === key ? mood.color : '#6b7280', fontFamily: "'Orbitron',sans-serif", letterSpacing: 1 }}>{mood.label}</span>
              </button>
            ))}
          </div>
        </div>

        <Inp label="BAŞLIK (OPSİYONEL)" value={f.title} onChange={v => sf(x => ({ ...x, title: v }))} placeholder="Günün özeti..." />

        {debrief ? (
          <>
            <Inp label="BUGÜN NE İYİ GİTTİ?" value={f.debrief_good} onChange={v => sf(x => ({ ...x, debrief_good: v }))} placeholder="Başarılar, olumlu anlar..." multiline />
            <Inp label="NE GELİŞTİRİLMELİ?" value={f.debrief_improve} onChange={v => sf(x => ({ ...x, debrief_improve: v }))} placeholder="Öğrenilen dersler..." multiline />
            <Inp label="YARIN ÖNCELİK NE?" value={f.debrief_tomorrow} onChange={v => sf(x => ({ ...x, debrief_tomorrow: v }))} placeholder="Yarın odaklanılacak konular..." multiline />
          </>
        ) : null}

        <Inp label="SERBEST YAZI" value={f.content} onChange={v => sf(x => ({ ...x, content: v }))} placeholder="Düşüncelerini yaz..." multiline />

        {/* Media buttons */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 11, color: '#6b7280', marginBottom: 8, fontFamily: "'Orbitron',sans-serif", letterSpacing: 1 }}>MEDYA EKLE</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={takePhoto} style={{
              flex: 1, padding: '12px 8px', borderRadius: 10,
              background: '#0a0e14', border: '1px solid #1e2028',
              cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4
            }}>
              <Icon name="camera" size={20} color="#d4a843" />
              <span style={{ fontSize: 9, color: '#6b7280', fontFamily: "'Orbitron',sans-serif" }}>FOTOĞRAF</span>
            </button>

            <button
              onClick={recording ? stopRecording : startRecording}
              style={{
                flex: 1, padding: '12px 8px', borderRadius: 10,
                background: recording ? '#c4453620' : '#0a0e14',
                border: `1px solid ${recording ? '#c44536' : '#1e2028'}`,
                cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4
              }}
            >
              <Icon name="mic" size={20} color={recording ? '#c44536' : '#5b8fd4'} />
              <span style={{ fontSize: 9, color: recording ? '#c44536' : '#6b7280', fontFamily: "'Orbitron',sans-serif" }}>
                {recording ? `${Math.floor(recordingTime / 60)}:${(recordingTime % 60).toString().padStart(2, '0')}` : 'SES'}
              </span>
            </button>
          </div>
        </div>

        {/* Media preview */}
        {media.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, color: '#6b7280', marginBottom: 8, fontFamily: "'Orbitron',sans-serif", letterSpacing: 1 }}>
              EKLENEN MEDYA ({media.length})
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {media.map((m, i) => (
                <div key={i} style={{
                  position: 'relative', width: 60, height: 60,
                  borderRadius: 8, overflow: 'hidden', background: '#1e2028'
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
                      <Icon name="mic" size={20} color="#5b8fd4" />
                      <span style={{ fontSize: 8, color: '#6b7280', marginTop: 2 }}>
                        {m.duration ? `${Math.floor(m.duration / 60)}:${(m.duration % 60).toString().padStart(2, '0')}` : 'SES'}
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => removeMedia(i)}
                    style={{
                      position: 'absolute', top: 2, right: 2,
                      width: 18, height: 18, borderRadius: '50%',
                      background: '#c44536', border: 'none',
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

        <Btn label={debrief ? 'DEBRİEF KAYDET' : 'GÜNLÜK KAYDET'} onClick={save} icon="check" />
      </Modal>
    </div>
  );
}

// ================ PT SCREEN ================
function PT({ data, reload }) {
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
        <h1 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 20, color: '#e8e6e3', margin: 0, letterSpacing: 1 }}>FİZİKSEL HAZIRLIK</h1>
        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4, fontFamily: "'JetBrains Mono',monospace" }}>Antrenman Günlüğü</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 24 }}>
        {[
          { l: 'HAFTALIK\nGÜN', v: ud, c: '#4a9d5b', m: '/ 7' },
          { l: 'BUGÜN\nANTRENMAN', v: tw.length, c: '#d4a843', m: '' },
          { l: 'TOPLAM\nSÜRE', v: totalDuration, c: '#5b8fd4', m: 'dk' }
        ].map((s, i) =>
          <div key={i} style={{ background: '#111318', borderRadius: 14, padding: '16px 12px', border: '1px solid #1e2028', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.c, fontFamily: "'Orbitron',sans-serif" }}>{s.v}<span style={{ fontSize: 10, color: '#6b7280' }}> {s.m}</span></div>
            <div style={{ fontSize: 9, color: '#6b7280', marginTop: 4, fontFamily: "'Orbitron',sans-serif", letterSpacing: 1, whiteSpace: 'pre-line', lineHeight: 1.3 }}>{s.l}</div>
          </div>
        )}
      </div>

      <div style={{ background: '#111318', borderRadius: 16, padding: '18px 16px', border: '1px solid #1e2028', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Icon name="dumbbell" size={14} color="#d4a843" />
          <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 11, color: '#d4a843', letterSpacing: 2 }}>ANTRENMAN KAYDET</span>
        </div>
        <Inp label="BAŞLIK" value={f.title} onChange={v => sf(x => ({ ...x, title: v }))} placeholder="Göğüs + Triceps, 5km Koşu, Kickboks..." />
        <Inp label="SÜRE (DK)" type="number" value={f.duration} onChange={v => sf(x => ({ ...x, duration: v }))} placeholder="45" />
        <Inp label="DETAY" value={f.content} onChange={v => sf(x => ({ ...x, content: v }))} placeholder="Ne yaptın, nasıl gitti..." multiline />
        <Btn label="ANTRENMAN KAYDET" onClick={save} icon="check" />
      </div>

      {sortedDates.length === 0 ? <Empty icon="dumbbell" title="ANTRENMAN YOK" sub="İlk antrenmanını kaydetmek için\nyukarıdaki formu doldur." /> :
        sortedDates.slice(0, 7).map(dateStr => (
          <div key={dateStr} style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 10, color: '#6b7280', letterSpacing: 2, marginBottom: 10 }}>
              {formatDate(dateStr)}
            </div>
            {grouped[dateStr].map(w => {
              const expanded = exp === w.id;
              return (
                <div key={w.id} onClick={() => setExp(expanded ? null : w.id)} style={{
                  background: '#111318', borderRadius: 12, padding: '12px 14px',
                  border: '1px solid #1e2028', marginBottom: 8, cursor: 'pointer'
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#e8e6e3' }}>{w.title}</div>
                      <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4, fontFamily: "'JetBrains Mono',monospace" }}>
                        {w.duration ? w.duration + ' dk' : ''}
                        {!expanded && w.content && <span> — {w.content.slice(0, 40)}{w.content.length > 40 ? '...' : ''}</span>}
                      </div>
                      {expanded && w.content && (
                        <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 10, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{w.content}</div>
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

// ================ MAIN APP ================
export default function App() {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [screen, setScreen] = useState('briefing');
  const [stealthMode, setStealthMode] = useState(false);
  const [data, setData] = useState({ operations: [], directives: [], intel: [], pt: [], reminders: [], journal: [] });
  const [ver, setVer] = useState(0);

  const reload = useCallback(async () => {
    const [o, d, i, p, r, j] = await Promise.all([
      ops.getAll(), dirs.getAll(), intl.getAll(), ptDB.getAll(), rems.getAll(), journalDB.getAll()
    ]);
    setData({ operations: o, directives: d, intel: i, pt: p, reminders: r, journal: j });
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
    return <AccessScreen onSuccess={() => setAuthenticated(true)} />;
  }

  // Stealth mode screen
  if (stealthMode) {
    return (
      <StealthScreen
        onExit={() => {
          setStealthMode(false);
          setAuthenticated(false); // Require code again
        }}
      />
    );
  }

  const nav = [
    { key: 'briefing', icon: 'grid', label: 'BRİFİNG' },
    { key: 'operations', icon: 'hex', label: 'OPERASYON' },
    { key: 'directives', icon: 'diamond', label: 'DİREKTİF' },
    { key: 'intel', icon: 'search', label: 'İSTİHBARAT' },
    { key: 'journal', icon: 'book', label: 'GÜNLÜK' },
    { key: 'pt', icon: 'dumbbell', label: 'FİZİKSEL' },
  ];

  const screens = {
    briefing: <Briefing data={data} reload={reload} nav={setScreen} onStealth={() => setStealthMode(true)} />,
    operations: <Operations data={data} reload={reload} />,
    directives: <Directives data={data} reload={reload} />,
    intel: <Intel data={data} reload={reload} />,
    journal: <Journal data={data} reload={reload} />,
    pt: <PT data={data} reload={reload} />,
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#0a0e14', color: '#e8e6e3', position: 'relative' }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, maxWidth: 480, margin: '0 auto', backgroundImage: 'radial-gradient(circle at 50% 0%,#d4a84308 0%,transparent 50%)' }} />
      <div style={{ position: 'relative', zIndex: 1, height: '100vh', overflow: 'auto', WebkitOverflowScrolling: 'touch', paddingTop: 'env(safe-area-inset-top, 20px)' }}>{screens[screen]}</div>
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, zIndex: 100 }}>
        <div style={{ background: 'linear-gradient(180deg,transparent,#0a0e14ee 30%)', paddingTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', background: '#111318f5', backdropFilter: 'blur(20px)', borderTop: '1px solid #1e2028', padding: '8px 2px', paddingBottom: 'calc(8px + env(safe-area-inset-bottom,0px))', margin: '0 8px', borderRadius: '16px 16px 0 0' }}>
            {nav.map(item =>
              <button key={item.key} onClick={() => setScreen(item.key)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '4px 4px', minWidth: 48, opacity: screen === item.key ? 1 : .35 }}>
                <Icon name={item.icon} size={18} color={screen === item.key ? '#d4a843' : '#6b7280'} />
                <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 6, letterSpacing: 1, color: screen === item.key ? '#d4a843' : '#6b7280' }}>{item.label}</span>
                {screen === item.key && <div style={{ width: 12, height: 2, borderRadius: 1, background: '#d4a843', marginTop: 1 }} />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
