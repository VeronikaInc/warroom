import React from 'react';

const p = { fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' };

const I = {
  alert: (s,c) => <svg width={s} height={s} viewBox="0 0 24 24" {...p} stroke={c} strokeWidth={2}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1={12} y1={9} x2={12} y2={13}/><line x1={12} y1={17} x2={12.01} y2={17}/></svg>,
  up: (s,c) => <svg width={s} height={s} viewBox="0 0 24 24" {...p} stroke={c} strokeWidth={2.5}><polyline points="18 15 12 9 6 15"/></svg>,
  circle: (s,c) => <svg width={s} height={s} viewBox="0 0 24 24"><circle cx={12} cy={12} r={5} fill={c}/></svg>,
  circleO: (s,c) => <svg width={s} height={s} viewBox="0 0 24 24" {...p} stroke={c} strokeWidth={2}><circle cx={12} cy={12} r={5}/></svg>,
  bulb: (s,c) => <svg width={s} height={s} viewBox="0 0 24 24" {...p} stroke={c} strokeWidth={2}><path d="M9 18h6M10 22h4M12 2a7 7 0 014 12.7V17H8v-2.3A7 7 0 0112 2z"/></svg>,
  note: (s,c) => <svg width={s} height={s} viewBox="0 0 24 24" {...p} stroke={c} strokeWidth={2}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1={16} y1={13} x2={8} y2={13}/><line x1={16} y1={17} x2={8} y2={17}/></svg>,
  search: (s,c) => <svg width={s} height={s} viewBox="0 0 24 24" {...p} stroke={c} strokeWidth={2}><circle cx={11} cy={11} r={8}/><line x1={21} y1={21} x2={16.65} y2={16.65}/></svg>,
  signal: (s,c) => <svg width={s} height={s} viewBox="0 0 24 24" {...p} stroke={c} strokeWidth={2}><path d="M5.64 19.36A9 9 0 0118.36 4.64M2.1 12a10 10 0 0119.8 0M8.12 16.88A5 5 0 0115.88 7.12M12 12h.01"/></svg>,
  bell: (s,c) => <svg width={s} height={s} viewBox="0 0 24 24" {...p} stroke={c} strokeWidth={2}><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>,
  check: (s,c) => <svg width={s} height={s} viewBox="0 0 24 24" {...p} stroke={c} strokeWidth={3}><polyline points="20 6 9 17 4 12"/></svg>,
  plus: (s,c) => <svg width={s} height={s} viewBox="0 0 24 24" {...p} stroke={c} strokeWidth={2.5}><line x1={12} y1={5} x2={12} y2={19}/><line x1={5} y1={12} x2={19} y2={12}/></svg>,
  x: (s,c) => <svg width={s} height={s} viewBox="0 0 24 24" {...p} stroke={c} strokeWidth={2}><line x1={18} y1={6} x2={6} y2={18}/><line x1={6} y1={6} x2={18} y2={18}/></svg>,
  trash: (s,c) => <svg width={s} height={s} viewBox="0 0 24 24" {...p} stroke={c} strokeWidth={2}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>,
  msg: (s,c) => <svg width={s} height={s} viewBox="0 0 24 24" {...p} stroke={c} strokeWidth={2}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
  clock: (s,c) => <svg width={s} height={s} viewBox="0 0 24 24" {...p} stroke={c} strokeWidth={2}><circle cx={12} cy={12} r={10}/><polyline points="12 6 12 12 16 14"/></svg>,
  quote: (s,c) => <svg width={s} height={s} viewBox="0 0 24 24" fill={c}><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1zm12 0c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg>,
  target: (s,c) => <svg width={s} height={s} viewBox="0 0 24 24" {...p} stroke={c} strokeWidth={2}><circle cx={12} cy={12} r={10}/><circle cx={12} cy={12} r={6}/><circle cx={12} cy={12} r={2}/></svg>,
  hex: (s,c) => <svg width={s} height={s} viewBox="0 0 24 24" {...p} stroke={c} strokeWidth={2}><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>,
  diamond: (s,c) => <svg width={s} height={s} viewBox="0 0 24 24" {...p} stroke={c} strokeWidth={2}><path d="M12 2L2 12l10 10 10-10z"/></svg>,
  grid: (s,c) => <svg width={s} height={s} viewBox="0 0 24 24" {...p} stroke={c} strokeWidth={2}><rect x={3} y={3} width={7} height={7}/><rect x={14} y={3} width={7} height={7}/><rect x={3} y={14} width={7} height={7}/><rect x={14} y={14} width={7} height={7}/></svg>,
  dumbbell: (s,c) => <svg width={s} height={s} viewBox="0 0 24 24" {...p} stroke={c} strokeWidth={2}><path d="M6.5 6.5h11M6.5 17.5h11M3 10V6.5a1 1 0 011-1h1.5M3 14v3.5a1 1 0 001 1h1.5M21 10V6.5a1 1 0 00-1-1h-1.5M21 14v3.5a1 1 0 01-1 1h-1.5M6.5 5.5v13M17.5 5.5v13"/></svg>,
  arrow: (s,c) => <svg width={s} height={s} viewBox="0 0 24 24" {...p} stroke={c} strokeWidth={2}><line x1={5} y1={12} x2={19} y2={12}/><polyline points="12 5 19 12 12 19"/></svg>,
  download: (s,c) => <svg width={s} height={s} viewBox="0 0 24 24" {...p} stroke={c} strokeWidth={2}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>,
  upload: (s,c) => <svg width={s} height={s} viewBox="0 0 24 24" {...p} stroke={c} strokeWidth={2}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>,
  book: (s,c) => <svg width={s} height={s} viewBox="0 0 24 24" {...p} stroke={c} strokeWidth={2}><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>,
  eye: (s,c) => <svg width={s} height={s} viewBox="0 0 24 24" {...p} stroke={c} strokeWidth={2}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx={12} cy={12} r={3}/></svg>,
  eyeOff: (s,c) => <svg width={s} height={s} viewBox="0 0 24 24" {...p} stroke={c} strokeWidth={2}><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1={1} y1={1} x2={23} y2={23}/></svg>,
  camera: (s,c) => <svg width={s} height={s} viewBox="0 0 24 24" {...p} stroke={c} strokeWidth={2}><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx={12} cy={13} r={4}/></svg>,
  mic: (s,c) => <svg width={s} height={s} viewBox="0 0 24 24" {...p} stroke={c} strokeWidth={2}><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/></svg>,
  video: (s,c) => <svg width={s} height={s} viewBox="0 0 24 24" {...p} stroke={c} strokeWidth={2}><polygon points="23 7 16 12 23 17 23 7"/><rect x={1} y={5} width={15} height={14} rx={2} ry={2}/></svg>,
  send: (s,c) => <svg width={s} height={s} viewBox="0 0 24 24" {...p} stroke={c} strokeWidth={2}><line x1={22} y1={2} x2={11} y2={13}/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  timeline: (s,c) => <svg width={s} height={s} viewBox="0 0 24 24" {...p} stroke={c} strokeWidth={2}><circle cx={12} cy={4} r={2}/><circle cx={12} cy={12} r={2}/><circle cx={12} cy={20} r={2}/><line x1={12} y1={6} x2={12} y2={10}/><line x1={12} y1={14} x2={12} y2={18}/></svg>,
  chart: (s,c) => <svg width={s} height={s} viewBox="0 0 24 24" {...p} stroke={c} strokeWidth={2}><line x1={18} y1={20} x2={18} y2={10}/><line x1={12} y1={20} x2={12} y2={4}/><line x1={6} y1={20} x2={6} y2={14}/></svg>,
};

export default function Icon({ name, size = 16, color = 'currentColor' }) {
  return I[name] ? I[name](size, color) : null;
}

export const priIcon = { CRITICAL:'alert', HIGH:'up', STANDARD:'circle', LOW:'circleO' };
export const catIcon = { IDEA:'bulb', NOTE:'note', RESEARCH:'search', CONTACT:'signal' };
