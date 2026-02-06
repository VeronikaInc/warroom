import React from 'react';
import Icon from './Icons.jsx';

export const PC = { CRITICAL:{color:'#ff3b3b',label:'KRİTİK'}, HIGH:{color:'#ff9500',label:'YÜKSEK'}, STANDARD:{color:'#4a9d5b',label:'STANDART'}, LOW:{color:'#6b7280',label:'DÜŞÜK'} };
export const SC = { ACTIVE:{color:'#4a9d5b',label:'AKTİF'}, PLANNING:{color:'#d4a843',label:'PLANLAMA'}, ON_HOLD:{color:'#ff9500',label:'BEKLEMEDE'}, COMPLETE:{color:'#6b7280',label:'TAMAMLANDI'} };
export const CC = { IDEA:{color:'#d4a843',label:'FİKİR'}, NOTE:{color:'#4a9d5b',label:'NOT'}, RESEARCH:{color:'#5b8fd4',label:'ARAŞTIRMA'}, CONTACT:{color:'#c44536',label:'İLETİŞİM'} };
export const MOODS = { GOOD:{color:'#4a9d5b',label:'İYİ',emoji:'🟢'}, NEUTRAL:{color:'#d4a843',label:'NORMAL',emoji:'🟡'}, TOUGH:{color:'#c44536',label:'ZOR GÜN',emoji:'🔴'} };

export const quotes = [
  "Zafer, 'Zafer benimdir' diyebilenindir. — Mustafa Kemal Atatürk",
  "Başarı, her gün tekrarlanan küçük çabaların toplamıdır.",
  "Strateji olmadan eylem, felaketin reçetesidir.",
  "Büyük işler küçük adımlarla başlar.",
  "Disiplin, motivasyonun bittiği yerde başlar.",
  "Planlarını gizli tut, sonuçlarını herkes görsün.",
  "Bir komutan kararsızlıktan daha tehlikeli bir düşman tanımaz.",
  "Bugünün hazırlığı, yarının zaferini belirler.",
  "Güçlü olan her zaman kazanmaz, ama kazanan her zaman güçlüdür.",
  "Zorluklar, seni savaşçı yapan ateştir.",
  "Hedefini gör, yolunu çiz, yürü.",
  "Bir karar ver ve ardından onu doğru karar yap.",
  "Her gece bir savaş planı yap, her sabah uygula.",
  "Savaş meydanında en tehlikeli silah, kararlılıktır.",
  "İmkansız, sadece henüz denenmemiş demektir.",
  "En karanlık gece bile şafaktan önce gelir.",
  "Başarısızlık, vazgeçenler için son duraktır.",
  "Yenilgi, yeniden denemenin başlangıcıdır.",
  "Fırtına ne kadar şiddetli olursa olsun, her zaman geçer.",
  "Sabrın sonu selamet değil, zaferdir.",
];

export function fd(s) { if(!s)return''; const d=new Date(s); const m=['OCA','ŞUB','MAR','NİS','MAY','HAZ','TEM','AĞU','EYL','EKİ','KAS','ARA']; return d.getDate()+' '+m[d.getMonth()]; }
export function mt() { return new Date().toTimeString().slice(0,5).replace(':',''); }
export function gr() { const h=new Date().getHours(); return h<6?'Gece nöbeti aktif':h<12?'Günaydın Komutan':h<17?'İyi günler Komutan':h<21?'İyi akşamlar Komutan':'Gece vardiyası'; }
export function milDate() { const n=new Date(); const d=['PAZAR','PAZARTESİ','SALI','ÇARŞAMBA','PERŞEMBE','CUMA','CUMARTESİ']; const m=['OCAK','ŞUBAT','MART','NİSAN','MAYIS','HAZİRAN','TEMMUZ','AĞUSTOS','EYLÜL','EKİM','KASIM','ARALIK']; return d[n.getDay()]+' // '+n.getDate()+' '+m[n.getMonth()]+' '+n.getFullYear(); }

export function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;
  return (
    <div style={{ position:'fixed',inset:0,zIndex:1000,background:'rgba(0,0,0,0.85)',backdropFilter:'blur(8px)',display:'flex',alignItems:'flex-end',justifyContent:'center',animation:'fadeIn .2s ease' }} onClick={onClose}>
      <div style={{ background:'#111318',borderRadius:'20px 20px 0 0',width:'100%',maxWidth:480,maxHeight:'85vh',display:'flex',flexDirection:'column',borderTop:'1px solid #2a2d35',animation:'slideUp .3s ease' }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'20px 20px 0',flexShrink:0 }}>
          <h3 style={{ fontFamily:"'Orbitron',sans-serif",fontSize:14,color:'#d4a843',letterSpacing:2,margin:0 }}>{title}</h3>
          <button onClick={onClose} style={{ background:'none',border:'none',cursor:'pointer',padding:4 }}><Icon name="x" size={20} color="#6b7280"/></button>
        </div>
        <div style={{ overflow:'auto',padding:'16px 20px calc(100px + env(safe-area-inset-bottom, 0px))',flex:1,WebkitOverflowScrolling:'touch' }}>{children}</div>
      </div>
    </div>
  );
}

export function Inp({ label, value, onChange, type='text', placeholder, options, multiline }) {
  const bs = { width:'100%',padding:'12px 14px',background:'#0a0e14',border:'1px solid #1e2028',borderRadius:10,color:'#e8e6e3',fontSize:14,outline:'none',boxSizing:'border-box' };
  return (
    <div style={{ marginBottom:16 }}>
      <label style={{ display:'block',fontSize:11,color:'#6b7280',marginBottom:6,fontFamily:"'Orbitron',sans-serif",letterSpacing:1 }}>{label}</label>
      {options ? <select value={value} onChange={e=>onChange(e.target.value)} style={{...bs,appearance:'none'}}>{options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select> :
       multiline ? <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={{...bs,minHeight:80,resize:'vertical'}}/> :
       <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={bs}/>}
    </div>
  );
}

export function Btn({ label, onClick, variant='primary', icon }) {
  const styles = { primary:{background:'linear-gradient(135deg,#d4a843,#b8912e)',color:'#0a0e14'}, danger:{background:'linear-gradient(135deg,#c44536,#a3362a)',color:'#fff'}, ghost:{background:'transparent',color:'#d4a843'} };
  return (
    <button onClick={onClick} style={{ ...(styles[variant]),padding:'14px 20px',borderRadius:12,border:variant==='ghost'?'1px solid #d4a84444':'none',fontFamily:"'Orbitron',sans-serif",fontSize:11,fontWeight:700,letterSpacing:2,cursor:'pointer',width:'100%',marginTop:4,display:'flex',alignItems:'center',justifyContent:'center',gap:8 }}>
      {icon && <Icon name={icon} size={14} color={variant==='primary'?'#0a0e14':variant==='danger'?'#fff':'#d4a843'}/>}{label}
    </button>
  );
}

export function Empty({ icon, title, sub }) {
  return (
    <div style={{ textAlign:'center',padding:'50px 20px',color:'#6b7280' }}>
      <div style={{ marginBottom:12,opacity:.4 }}><Icon name={icon} size={44} color="#d4a843"/></div>
      <div style={{ fontFamily:"'Orbitron',sans-serif",fontSize:11,letterSpacing:2,color:'#d4a843',marginBottom:8 }}>{title}</div>
      <div style={{ fontSize:13,lineHeight:1.6,whiteSpace:'pre-line' }}>{sub}</div>
    </div>
  );
}

export function AddBtn({ onClick }) {
  return <button onClick={onClick} style={{ background:'linear-gradient(135deg,#d4a843,#b8912e)',border:'none',width:42,height:42,borderRadius:12,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}><Icon name="plus" size={20} color="#0a0e14"/></button>;
}
