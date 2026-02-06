import React, { useState, useEffect, useCallback } from 'react';
import { initDB, ops, opLogs, dirs, intl, ptDB, rems, exportAllData } from './db.js';
import Icon, { priIcon, catIcon } from './Icons.jsx';
import { Modal, Inp, Btn, Empty, AddBtn, PC, SC, CC, quotes, fd, mt, gr, milDate } from './UI.jsx';

// ================ BRIEFING SCREEN ================
function Briefing({ data, reload, nav }) {
  const [qi, setQi] = useState(0);
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

  const toggle = async (id) => { await dirs.toggle(id); reload(); };
  const dismissRem = async (id) => { await rems.dismiss(id); reload(); };

  return (
    <div style={{ padding: '0 16px 120px' }}>
      <div style={{ paddingTop: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 11, color: '#6b7280', fontFamily: "'JetBrains Mono',monospace", letterSpacing: 1, marginBottom: 4 }}>{milDate()}</div>
            <h1 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 22, color: '#e8e6e3', margin: '4px 0 0', fontWeight: 800, letterSpacing: 1 }}>{gr()}</h1>
          </div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 28, fontWeight: 700, color: '#d4a843', letterSpacing: 2, marginTop: 4 }}>{mt()}</div>
        </div>
      </div>

      {/* Quote */}
      <div key={qi} style={{ background: 'linear-gradient(135deg,#d4a84310,#d4a84305)', borderRadius: 14, padding: '14px 16px', marginBottom: 20, border: '1px solid #d4a84318', display: 'flex', gap: 12, alignItems: 'flex-start', animation: 'fadeQuote 8s ease infinite' }}>
        <div style={{ flexShrink: 0, marginTop: 2 }}><Icon name="quote" size={14} color="#d4a84366" /></div>
        <div style={{ fontSize: 12, color: '#d4a843cc', lineHeight: 1.6, fontStyle: 'italic' }}>{quotes[qi]}</div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
        {[{ l: 'AKTİF\nOPERASYON', v: ao, c: '#4a9d5b' }, { l: 'BEKLEYEN\nDİREKTİF', v: pd, c: '#d4a843' }, { l: 'BUGÜN\nTAMAMLANAN', v: ct, c: '#5b8fd4' }].map((s, i) =>
          <div key={i} style={{ background: '#111318', borderRadius: 14, padding: '16px 12px', border: '1px solid #1e2028', textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.c, fontFamily: "'Orbitron',sans-serif" }}>{s.v}</div>
            <div style={{ fontSize: 9, color: '#6b7280', marginTop: 4, fontFamily: "'Orbitron',sans-serif", letterSpacing: 1, whiteSpace: 'pre-line', lineHeight: 1.4 }}>{s.l}</div>
          </div>
        )}
      </div>

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

            {/* Logs */}
            <div style={{ borderTop: '1px solid #1e2028', paddingTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Icon name="msg" size={14} color="#d4a843" />
                <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 11, color: '#d4a843', letterSpacing: 2 }}>GÜNLÜK / YORUMLAR</span>
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <input value={comment} onChange={e => setComment(e.target.value)} placeholder="Yorum ekle..." onKeyDown={e => e.key === 'Enter' && addLog()} style={{ flex: 1, padding: '10px 14px', background: '#0a0e14', border: '1px solid #1e2028', borderRadius: 10, color: '#e8e6e3', fontSize: 13, outline: 'none' }} />
                <button onClick={addLog} style={{ background: 'linear-gradient(135deg,#d4a843,#b8912e)', border: 'none', borderRadius: 10, padding: '0 14px', cursor: 'pointer' }}><Icon name="plus" size={16} color="#0a0e14" /></button>
              </div>
              {detailLogs.map(log => (
                <div key={log.id} style={{ background: '#0a0e14', borderRadius: 10, padding: '10px 12px', marginBottom: 8, border: '1px solid #1e2028' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontSize: 13, color: '#e8e6e3', lineHeight: 1.5, flex: 1 }}>{log.text}</div>
                    <button onClick={() => delLog(log.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, flexShrink: 0 }}><Icon name="x" size={12} color="#6b728044" /></button>
                  </div>
                  <div style={{ fontSize: 10, color: '#6b7280', marginTop: 6, fontFamily: "'JetBrains Mono',monospace" }}>{new Date(log.created_at).toLocaleString('tr-TR')}</div>
                </div>
              ))}
              {detailLogs.length === 0 && <div style={{ textAlign: 'center', padding: '20px 0', color: '#6b7280', fontSize: 12 }}>Henüz yorum eklenmedi.</div>}
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
    await rems.add({ title: remFor.title, directiveId: remFor.id, datetime: dt });
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

// ================ PT SCREEN ================
function PT({ data, reload }) {
  const [f, sf] = useState({ exercise: '', sets: '', reps: '', weight: '', notes: '' });
  const today = new Date().toDateString();
  const tw = data.pt.filter(w => new Date(w.created_at).toDateString() === today);
  const wk = data.pt.filter(w => new Date(w.created_at) >= new Date(Date.now() - 7 * 864e5));
  const ud = [...new Set(wk.map(w => new Date(w.created_at).toDateString()))].length;

  const save = async () => {
    if (!f.exercise.trim()) return;
    await ptDB.add(f);
    sf({ exercise: '', sets: '', reps: '', weight: '', notes: '' }); reload();
  };
  const del = async (id) => { await ptDB.delete(id); reload(); };

  return (
    <div style={{ padding: '0 16px 120px' }}>
      <div style={{ paddingTop: 20, marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 20, color: '#e8e6e3', margin: 0, letterSpacing: 1 }}>FİZİKSEL HAZIRLIK</h1>
        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4, fontFamily: "'JetBrains Mono',monospace" }}>Antrenman Günlüğü</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 24 }}>
        {[{ l: 'HAFTALIK\nGÜN', v: ud, c: '#4a9d5b', m: '/ 7' }, { l: 'BUGÜN\nEGZERSİZ', v: tw.length, c: '#d4a843', m: '' }, { l: 'TOPLAM\nHACİM', v: tw.reduce((a, w) => a + (w.sets * w.reps * w.weight), 0).toLocaleString(), c: '#5b8fd4', m: 'kg' }].map((s, i) =>
          <div key={i} style={{ background: '#111318', borderRadius: 14, padding: '16px 12px', border: '1px solid #1e2028', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.c, fontFamily: "'Orbitron',sans-serif" }}>{s.v}<span style={{ fontSize: 10, color: '#6b7280' }}> {s.m}</span></div>
            <div style={{ fontSize: 9, color: '#6b7280', marginTop: 4, fontFamily: "'Orbitron',sans-serif", letterSpacing: 1, whiteSpace: 'pre-line', lineHeight: 1.3 }}>{s.l}</div>
          </div>
        )}
      </div>

      <div style={{ background: '#111318', borderRadius: 16, padding: '18px 16px', border: '1px solid #1e2028', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}><Icon name="dumbbell" size={14} color="#d4a843" /><span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 11, color: '#d4a843', letterSpacing: 2 }}>HIZLI EGZERSİZ EKLE</span></div>
        <Inp label="EGZERSİZ" value={f.exercise} onChange={v => sf(x => ({ ...x, exercise: v }))} placeholder="Bench Press, Squat..." />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <Inp label="SET" type="number" value={f.sets} onChange={v => sf(x => ({ ...x, sets: v }))} placeholder="4" />
          <Inp label="TEKRAR" type="number" value={f.reps} onChange={v => sf(x => ({ ...x, reps: v }))} placeholder="12" />
          <Inp label="KG" type="number" value={f.weight} onChange={v => sf(x => ({ ...x, weight: v }))} placeholder="80" />
        </div>
        <Inp label="NOT" value={f.notes} onChange={v => sf(x => ({ ...x, notes: v }))} placeholder="İsteğe bağlı..." />
        <Btn label="EGZERSİZ KAYDET" onClick={save} icon="check" />
      </div>

      <h2 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 12, color: '#d4a843', letterSpacing: 2, marginBottom: 14 }}>BUGÜNÜN GÜNLÜĞÜ</h2>
      {tw.length === 0 ? <Empty icon="dumbbell" title="ANTRENMAN YOK" sub="Bugün henüz egzersiz kaydedilmedi." /> :
        tw.map(w =>
          <div key={w.id} style={{ background: '#111318', borderRadius: 12, padding: '12px 14px', border: '1px solid #1e2028', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div><div style={{ fontSize: 14, fontWeight: 600 }}>{w.exercise}</div><div style={{ fontSize: 11, color: '#6b7280', marginTop: 3, fontFamily: "'JetBrains Mono',monospace" }}>{w.sets}x{w.reps} @ {w.weight}kg{w.notes ? ' — ' + w.notes : ''}</div></div>
            <button onClick={() => del(w.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><Icon name="x" size={14} color="#6b728044" /></button>
          </div>
        )}
    </div>
  );
}

// ================ MAIN APP ================
export default function App() {
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState('briefing');
  const [data, setData] = useState({ operations: [], directives: [], intel: [], pt: [], reminders: [] });
  const [ver, setVer] = useState(0);

  const reload = useCallback(async () => {
    const [o, d, i, p, r] = await Promise.all([ops.getAll(), dirs.getAll(), intl.getAll(), ptDB.getAll(), rems.getAll()]);
    setData({ operations: o, directives: d, intel: i, pt: p, reminders: r });
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

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  if (!ready) return null;

  const nav = [
    { key: 'briefing', icon: 'grid', label: 'BRİFİNG' },
    { key: 'operations', icon: 'hex', label: 'OPERASYON' },
    { key: 'directives', icon: 'diamond', label: 'DİREKTİF' },
    { key: 'intel', icon: 'search', label: 'İSTİHBARAT' },
    { key: 'pt', icon: 'dumbbell', label: 'FİZİKSEL' },
  ];

  const screens = {
    briefing: <Briefing data={data} reload={reload} nav={setScreen} />,
    operations: <Operations data={data} reload={reload} />,
    directives: <Directives data={data} reload={reload} />,
    intel: <Intel data={data} reload={reload} />,
    pt: <PT data={data} reload={reload} />,
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#0a0e14', color: '#e8e6e3', position: 'relative' }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, maxWidth: 480, margin: '0 auto', backgroundImage: 'radial-gradient(circle at 50% 0%,#d4a84308 0%,transparent 50%)' }} />
      <div style={{ position: 'relative', zIndex: 1, height: '100vh', overflow: 'auto', WebkitOverflowScrolling: 'touch', paddingTop: 'env(safe-area-inset-top, 20px)' }}>{screens[screen]}</div>
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, zIndex: 100 }}>
        <div style={{ background: 'linear-gradient(180deg,transparent,#0a0e14ee 30%)', paddingTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', background: '#111318f5', backdropFilter: 'blur(20px)', borderTop: '1px solid #1e2028', padding: '10px 4px', paddingBottom: 'calc(10px + env(safe-area-inset-bottom,0px))', margin: '0 8px', borderRadius: '16px 16px 0 0' }}>
            {nav.map(item =>
              <button key={item.key} onClick={() => setScreen(item.key)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '4px 8px', minWidth: 56, opacity: screen === item.key ? 1 : .35 }}>
                <Icon name={item.icon} size={20} color={screen === item.key ? '#d4a843' : '#6b7280'} />
                <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 7, letterSpacing: 1.5, color: screen === item.key ? '#d4a843' : '#6b7280' }}>{item.label}</span>
                {screen === item.key && <div style={{ width: 16, height: 2, borderRadius: 1, background: '#d4a843', marginTop: 1 }} />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
