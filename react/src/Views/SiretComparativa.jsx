import React, { useEffect, useMemo, useState } from 'react';
import ASEBCS from "../assets/asebcs.jpg";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Label,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export default function Comparativa() {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [viewMode, setViewMode] = useState('por-ente'); // 'por-ente' | 'por-mes-anio'

  const years = [2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035, 2036, 2037];
  const months = [
    'Todos', 'Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
  ];

  const containerRef = React.useRef(null);

  const [entesList, setEntesList] = useState([]);
  const [leftFilterName, setLeftFilterName] = useState('');
  const [leftFilterClass, setLeftFilterClass] = useState('');
  const [rightFilterName, setRightFilterName] = useState('');
  const [rightFilterClass, setRightFilterClass] = useState('');

  const [selectedLeft, setSelectedLeft] = useState(null);
  const [selectedRight, setSelectedRight] = useState(null);
  const [chartYearLeft, setChartYearLeft] = useState('Todos');
  const [chartYearRight, setChartYearRight] = useState('Todos');
  const [selectedMonthForChart, setSelectedMonthForChart] = useState('Todos');
  // default to the most recent up to 3 years
  const [selectedYearsForMonthChart, setSelectedYearsForMonthChart] = useState(() => years.slice(-3));
  // For per-ente comparisons: selected years per side (max 3, min 1)
  const [selectedYearsLeft, setSelectedYearsLeft] = useState([]);
  const [selectedYearsRight, setSelectedYearsRight] = useState([]);
  // For month/year chart: selected months (checkboxes 1..12). Empty means all.
  const [selectedMonthsForChart, setSelectedMonthsForChart] = useState(() => []);

  const entesListFallback = [
    { id: 1, title: 'Municipio de La Paz', classification: 'Municipios', compliances: [{ year:2025, month:'Enero', status:'cumplio'}] },
    { id: 2, title: 'Municipio de Los Cabos', classification: 'Municipios', compliances: [{ year:2025, month:'Enero', status:'parcial'}] },
  ];

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    let mounted = true;
    const apiUrl = `${window.location.protocol}//${window.location.hostname}/siret/api/entes.php`;
    fetch(apiUrl)
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(json => { if (!mounted) return; if (Array.isArray(json)) setEntesList(json); else setEntesList(entesListFallback); })
      .catch(()=> { if (mounted) setEntesList(entesListFallback); });
    return () => { mounted = false; };
  }, []);

  const classifications = useMemo(() => {
    const s = new Set();
    entesList.forEach(e => { if (e.classification) s.add(e.classification); });
    return Array.from(s);
  }, [entesList]);

  const filteredLeft = entesList.filter(e => {
    if (leftFilterClass && e.classification !== leftFilterClass) return false;
    if (leftFilterName && !e.title.toLowerCase().includes(leftFilterName.toLowerCase())) return false;
    return true;
  });
  const filteredRight = entesList.filter(e => {
    if (rightFilterClass && e.classification !== rightFilterClass) return false;
    if (rightFilterName && !e.title.toLowerCase().includes(rightFilterName.toLowerCase())) return false;
    return true;
  });

  // helpers to build bar data and compute IC (copied from CumplimientosMesAnio)
  const buildBarDataForEnte = (ente) => {
    if (!ente) return [];
    // años a considerar: if caller passes a specific list via ente.__yearsToUse (internal helper), use it
    const yearsArr = (ente && Array.isArray(ente.__yearsToUse) && ente.__yearsToUse.length)
      ? ente.__yearsToUse.slice().sort((a,b)=>a-b)
      : Array.from(new Set((ente.compliances || []).map(c => c.year))).sort((a, b) => a - b);
    const monthsOrder = months.filter(m=>m!=='Todos');
    return monthsOrder.map(m=>{
      const row = { month: m.slice(0,3).toLowerCase() };
      yearsArr.forEach(y=>{
        const comps = (ente.compliances||[]).filter(c=>c.year===y && c.month===m);
        const counts = { cumplio:0, parcial:0, no:0 };
        comps.forEach(c=>{ const s=(c.status||'').toString().toLowerCase(); if (s==='cumplio') counts.cumplio++; else if (s==='parcial' || s==='partial') counts.parcial++; else counts.no++; });
        // Map to small numeric heights so green doesn't reach the top
        row[`${y}_cumplio`] = counts.cumplio ? 1.5 : 0;
        row[`${y}_parcial`] = counts.parcial ? 0.9 : 0;
        row[`${y}_no`] = counts.no ? 0.5 : 0;
      });
      return row;
    });
  };

  // compute aggregated percentages (cumplio/parcial/no) for an ente across provided years
  const computePercentagesForEnte = (ente, yearsToUse) => {
    if (!ente) return { cumplio:0, parcial:0, no:0 };
    const years = Array.isArray(yearsToUse) && yearsToUse.length ? yearsToUse : Array.from(new Set((ente.compliances||[]).map(c=>c.year)));
    let totals = { cumplio:0, parcial:0, no:0 };
    years.forEach(y=>{
      (ente.compliances||[]).filter(c=>c.year===y).forEach(c=>{
        const s=(c.status||'').toString().toLowerCase(); if (s==='cumplio') totals.cumplio++; else if (s==='parcial'||s==='partial') totals.parcial++; else totals.no++;
      });
    });
    const sum = totals.cumplio + totals.parcial + totals.no || 1;
    return {
      cumplio: Math.round((totals.cumplio / sum) * 100),
      parcial: Math.round((totals.parcial / sum) * 100),
      no: Math.round((totals.no / sum) * 100),
    };
  };

  const computeICForEnteYear = (ente, y) => {
    const yearNum = parseInt(y,10);
    if (!ente || !ente.compliances) return null;
    const now = new Date();
    const currentYear = now.getFullYear();
    const monthsTranscurridos = yearNum === currentYear ? (now.getMonth()+1) : 12;
    if (monthsTranscurridos === 0) return null;
    const fulfilled = new Set();
    (ente.compliances||[]).forEach(c=>{
      if (c.year===yearNum){
        const s=(c.status||'').toString().toLowerCase();
        if (s==='cumplio' && c.month){
          const idx = months.indexOf(c.month);
          if (idx>=1 && idx<=monthsTranscurridos) fulfilled.add(c.month);
        }
      }
    });
    return Math.round((fulfilled.size / monthsTranscurridos) * 100);
  };

  // Custom XAxis tick: muestra solo el mes
  const CustomXAxisTick = ({ x, y, payload }) => {
    return (
      <g transform={`translate(${x},${y + 12})`}>
        <text x={0} y={0} textAnchor="middle" fill="#666" fontSize={12}>{payload.value}</text>
      </g>
    );
  };

  // Custom label centrado para mostrar los años seleccionados
  const CustomYearsLabel = (props) => {
    const { viewBox, selectedYears } = props;
    if (!viewBox) return null;

    const yearsText = (selectedYears || []).join(' | ');
    const x = viewBox.x + viewBox.width / 2;
    const y = viewBox.y + viewBox.height + 30;

    return (
      <text x={x} y={y} textAnchor="middle" fill="#666" fontSize={11} fontWeight="500">
        {yearsText}
      </text>
    );
  };

  // Toggle handlers for year selection with min 1 / max 3
  const toggleYearForMonthChart = (y) => {
    setSelectedYearsForMonthChart(prev => {
      const has = prev.includes(y);
      if (!has && prev.length >= 3) return prev; // don't add more than 3
      if (has && prev.length <= 1) return prev; // keep at least one
      return has ? prev.filter(v => v !== y) : [...prev, y];
    });
  };

  const toggleMonthForChart = (m) => {
    setSelectedMonthsForChart(prev => {
      const has = prev.includes(m);
      return has ? prev.filter(v => v !== m) : [...prev, m];
    });
  };

  // Per-side toggles and initializers
  useEffect(() => {
    if (!selectedLeft) return;
    const yearsAvailable = Array.from(new Set((selectedLeft.compliances||[]).map(c=>c.year))).sort((a,b)=>b-a);
    setSelectedYearsLeft(yearsAvailable.slice(0,3));
  }, [selectedLeft]);

  useEffect(() => {
    if (!selectedRight) return;
    const yearsAvailable = Array.from(new Set((selectedRight.compliances||[]).map(c=>c.year))).sort((a,b)=>b-a);
    setSelectedYearsRight(yearsAvailable.slice(0,3));
  }, [selectedRight]);

  const toggleYearLeft = (y) => {
    setSelectedYearsLeft(prev => {
      const has = prev.includes(y);
      if (!has && prev.length >= 3) return prev;
      if (has && prev.length <= 1) return prev;
      return has ? prev.filter(v=>v!==y) : [...prev, y];
    });
  };

  const toggleYearRight = (y) => {
    setSelectedYearsRight(prev => {
      const has = prev.includes(y);
      if (!has && prev.length >= 3) return prev;
      if (has && prev.length <= 1) return prev;
      return has ? prev.filter(v=>v!==y) : [...prev, y];
    });
  };

  // Funciones para exportar ente izquierdo
  const handleExportPDFLeft = () => {
    if (!selectedLeft) return;
    const yearsSelected = selectedYearsLeft.slice().sort((a, b) => b - a).join('-');
    const url = `/ExportPDFEnte?years=${encodeURIComponent(yearsSelected)}&enteIds=${encodeURIComponent(String(selectedLeft.id))}`;
    window.location.href = url;
  };

  const handleExportExcelLeft = () => {
    if (!selectedLeft) return;
    const yearsSelected = selectedYearsLeft.slice().sort((a, b) => b - a).join('-');
    const url = `/ExportExcelEnte?years=${encodeURIComponent(yearsSelected)}&enteIds=${encodeURIComponent(String(selectedLeft.id))}`;
    window.location.href = url;
  };

  // Funciones para exportar ente derecho
  const handleExportPDFRight = () => {
    if (!selectedRight) return;
    const yearsSelected = selectedYearsRight.slice().sort((a, b) => b - a).join('-');
    const url = `/ExportPDFEnte?years=${encodeURIComponent(yearsSelected)}&enteIds=${encodeURIComponent(String(selectedRight.id))}`;
    window.location.href = url;
  };

  const handleExportExcelRight = () => {
    if (!selectedRight) return;
    const yearsSelected = selectedYearsRight.slice().sort((a, b) => b - a).join('-');
    const url = `/ExportExcelEnte?years=${encodeURIComponent(yearsSelected)}&enteIds=${encodeURIComponent(String(selectedRight.id))}`;
    window.location.href = url;
  };

  // Compute aggregated IC for a year across all entes (average of per-ente ICs)
  const computeICForYearAcrossEntes = (y) => {
    const yearNum = parseInt(y,10);
    const now = new Date();
    const currentYear = now.getFullYear();
    const monthsTranscurridos = yearNum === currentYear ? (now.getMonth()+1) : 12;
    if (monthsTranscurridos === 0) return null;
    let accumPercent = 0;
    const n = entesList.length || 1;
    entesList.forEach(ente => {
      const fulfilled = new Set();
      (ente.compliances||[]).forEach(c => {
        if (c.year === yearNum){
          const s=(c.status||'').toString().toLowerCase();
          if (s==='cumplio' && c.month){
            const idx = months.indexOf(c.month);
            if (idx>=1 && idx<=monthsTranscurridos) fulfilled.add(c.month);
          }
        }
      });
      accumPercent += (fulfilled.size / monthsTranscurridos) * 100;
    });
    return Math.round(accumPercent / n);
  };

  // Aggregate percentages across entes for selected years & months (for bottom summary)
  const computeAggregatePercentages = (yearsToUse, monthsToUse) => {
    const yArr = Array.isArray(yearsToUse) && yearsToUse.length ? yearsToUse : years.slice();
    const mArr = Array.isArray(monthsToUse) && monthsToUse.length ? monthsToUse : months.filter(m=>m!=='Todos');
    const mAbbr = mArr.map(m => monthAbbr[m] || m.slice(0,3).toLowerCase());
    let totals = { cumplio:0, parcial:0, no:0 };
    entesList.forEach(ente => {
      (ente.compliances||[]).forEach(c => {
        const cMonthAbbr = monthAbbr[c.month] ? (monthAbbr[c.month] || '').toLowerCase() : ((c.month || '').slice(0,3) || '').toLowerCase();
        if (yArr.includes(c.year) && mAbbr.includes(cMonthAbbr) ){
          const s=(c.status||'').toString().toLowerCase(); if (s==='cumplio') totals.cumplio++; else if (s==='parcial' || s==='partial') totals.parcial++; else totals.no++;
        }
      });
    });
    const sum = totals.cumplio + totals.parcial + totals.no || 1;
    return {
      cumplio: Math.round((totals.cumplio / sum) * 100),
      parcial: Math.round((totals.parcial / sum) * 100),
      no: Math.round((totals.no / sum) * 100),
    };
  };

  // Custom tooltip similar to the one used in CumplimientosMesAnio modal
  const tipoLabels = { cumplio: 'Cumplió', parcial: 'Parcial', no: 'No cumplió' };
  const tipoColors = { cumplio: '#28a745', parcial: '#ffc107', no: '#dc3545' };
  const abbrToFull = {
    ene: 'Enero', feb: 'Febrero', mar: 'Marzo', abr: 'Abril', may: 'Mayo', jun: 'Junio',
    jul: 'Julio', ago: 'Agosto', sep: 'Septiembre', oct: 'Octubre', nov: 'Noviembre', dic: 'Diciembre'
  };

  const CustomBarTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;

    const validEntries = payload
      .filter(entry => entry.value > 0)
      .map(entry => {
        const [year, tipo] = entry.dataKey.split('_');
        return {
          year,
          tipo,
          label: tipoLabels[tipo] || tipo,
          color: tipoColors[tipo] || '#999',
        };
      });

    return (
      <div
        style={{
          backgroundColor: '#fff',
          border: '1px solid #ccc',
          padding: '10px',
          borderRadius: '6px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          transition: 'opacity 0.3s ease',
          animation: 'fadeIn 0.3s ease',
        }}
      >
        <strong style={{ display: 'block', marginBottom: '6px' }}>{abbrToFull[label] || (label && label.toString().toUpperCase()) || label}</strong>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {validEntries.map((entry, idx) => (
            <li
              key={idx}
              style={{
                color: entry.color,
                fontWeight: 'bold',
                marginBottom: '4px',
                transition: 'transform 0.2s ease',
              }}
            >
              {entry.year}: {entry.label}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  // month abbreviations
  const monthAbbr = {
    'Enero':'ene','Febrero':'feb','Marzo':'mar','Abril':'abr','Mayo':'may','Junio':'jun','Julio':'jul','Agosto':'ago','Septiembre':'sep','Octubre':'oct','Noviembre':'nov','Diciembre':'dic'
  };

  // Build aggregated data: for each month, for each selected year count cumplio/parcial/no
  const buildMonthYearBarData = (yearsToInclude, monthFilter = 'Todos') => {
    const monthsOrder = months.filter(m => m !== 'Todos');
    const filteredMonths = monthFilter === 'Todos' ? monthsOrder : [monthFilter];
    return filteredMonths.map(m => {
      const row = { month: monthAbbr[m] || m.slice(0,3).toLowerCase() };
      yearsToInclude.forEach(y => {
        const comps = [];
        (entesList || []).forEach(ente => {
          (ente.compliances || []).forEach(c => {
            if (c.year === y && c.month === m) comps.push(c);
          });
        });
        const counts = { cumplio: 0, parcial: 0, no: 0 };
        comps.forEach(c => { const s = (c.status||'').toString().toLowerCase(); if (s === 'cumplio') counts.cumplio++; else if (s === 'parcial' || s === 'partial') counts.parcial++; else counts.no++; });
        row[`${y}_cumplio`] = counts.cumplio;
        row[`${y}_parcial`] = counts.parcial;
        row[`${y}_no`] = counts.no;
      });
      return row;
    });
  };

  // Tooltip for month/year chart: show month and for each year the % per status (cumplio/parcial/no)
  const MonthYearTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;
    // group payload by year
    const byYear = {};
    payload.forEach(p => {
      const key = p.dataKey || p.name || '';
      const parts = key.split('_');
      const year = parts[0];
      const kind = parts[1];
      if (!byYear[year]) byYear[year] = { total: 0, parts: {} };
      const val = Number(p.value) || 0;
      byYear[year].parts[kind] = val;
      byYear[year].total += val;
    });

    return (
      <div className="card p-2" style={{ minWidth: 160 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>{label}</div>
        {Object.keys(byYear).map((y) => {
          const info = byYear[y];
          if (!info) return null;
          const t = info.total || 0;
          return (
            <div key={y} style={{ marginBottom: 6 }}>
              <div style={{ fontWeight: 700 }}>{y}</div>
              {['cumplio','parcial','no'].map(k => {
                const v = info.parts[k] || 0;
                const pct = t ? Math.round((v / t) * 100) : 0;
                const color = k === 'cumplio' ? '#28a745' : k === 'parcial' ? '#ffc107' : '#dc3545';
                return (
                  <div key={k} style={{ display: 'flex', gap: 8, alignItems: 'center', color: '#333' }}>
                    <div style={{ width: 10, height: 10, background: color, borderRadius: 3 }} />
                    <div style={{ fontSize: 13 }}>{k === 'cumplio' ? 'Cumplió' : k === 'parcial' ? 'Parcial' : 'No cumplió'}: {pct}%</div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div ref={containerRef} className="container-fluid px-0" style={{ background: '#f8f9fa', minHeight: '100vh' }}>
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes fadeOut {
          from {
            opacity: 1;
            transform: scale(1);
          }
          to {
            opacity: 0;
            transform: scale(0.95);
          }
        }

        .modal-backdrop {
          animation: fadeIn 0.2s ease-out;
        }

        .modal-backdrop.closing {
          animation: fadeOut 0.2s ease-out forwards;
        }

        .modal-content {
          animation: fadeIn 0.3s ease-out;
        }

        .modal-content.closing {
          animation: fadeOut 0.3s ease-out forwards;
        }

        .form-select {
          border: 1px solid #ddd !important;
          transition: all 0.3s ease;
        }

        .form-select:focus {
          border-color: #85435e !important;
          box-shadow: 0 0 5px rgba(194, 24, 91, 0.5) !important;
          background-color: #fff0f5 !important;
          color: #333 !important;
        }

        .form-select:hover {
          border-color: #85435e !important;
        }

        .form-control {
          border: 1px solid #ddd !important;
          transition: all 0.3s ease;
        }

        .form-control:focus {
          border-color: #85435e !important;
          box-shadow: 0 0 5px rgba(194, 24, 91, 0.5) !important;
          background-color: #fff0f5 !important;
          color: #333 !important;
        }

        .form-control:hover {
          border-color: #85435e !important;
        }
      `}</style>
      <div className="container py-5">
      <div style={{ width: '100%', marginTop: 0, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, padding: '8px', background: '#f8f9fa', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <button
            type="button"
            className="btn"
            onClick={() => setViewMode('por-ente')}
            style={{
              flex: 1,
              padding: '12px 20px',
              background: viewMode === 'por-ente' ? 'linear-gradient(135deg, #681b32 0%, #200b07 100%)' : '#fff',
              color: viewMode === 'por-ente' ? '#fff' : '#681b32',
              border: viewMode === 'por-ente' ? 'none' : '2px solid #681b32',
              borderRadius: '8px',
              fontWeight: 600,
              transition: 'all 0.3s ease',
              boxShadow: viewMode === 'por-ente' ? '0 4px 6px rgba(104, 27, 50, 0.3)' : 'none'
            }}
            aria-pressed={viewMode === 'por-ente'}
            title="Comparar por ente"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style={{ marginRight: 8, verticalAlign: 'middle' }}>
              <path d="M7 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1H7Zm4-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-5.784 6A2.238 2.238 0 0 1 5 13c0-1.355.68-2.75 1.936-3.72A6.325 6.325 0 0 0 5 9c-4 0-5 3-5 4s1 1 1 1h4.216ZM4.5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/>
            </svg>
            Por ente
          </button>

          <button
            type="button"
            className="btn"
            onClick={() => setViewMode('por-mes-anio')}
            style={{
              flex: 1,
              padding: '12px 20px',
              background: viewMode === 'por-mes-anio' ? 'linear-gradient(135deg, #681b32 0%, #200b07 100%)' : '#fff',
              color: viewMode === 'por-mes-anio' ? '#fff' : '#681b32',
              border: viewMode === 'por-mes-anio' ? 'none' : '2px solid #681b32',
              borderRadius: '8px',
              fontWeight: 600,
              transition: 'all 0.3s ease',
              boxShadow: viewMode === 'por-mes-anio' ? '0 4px 6px rgba(104, 27, 50, 0.3)' : 'none'
            }}
            aria-pressed={viewMode === 'por-mes-anio'}
            title="Comparar por mes y año"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style={{ marginRight: 8, verticalAlign: 'middle' }}>
              <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
              <path d="M8 13A5 5 0 1 1 8 3a5 5 0 0 1 0 10zm0 1A6 6 0 1 0 8 2a6 6 0 0 0 0 12z"/>
            </svg>
            Por mes y año
          </button>
        </div>
      </div>

      {viewMode === 'por-ente' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* First ente (top) */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="card" style={{ borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: 'none', padding: '24px', marginBottom: 0 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: '#440D1E' }}>Ente 1</h3>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <select value={leftFilterClass} onChange={e=>setLeftFilterClass(e.target.value)} className="form-select" style={{ borderRadius: '8px', padding: '12px 18px', fontSize: 15, border: '1px solid #ddd', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)' }}>
                  <option value="">Todas las clasificaciones</option>
                  {classifications.map(c=> <option key={c} value={c}>{c}</option>)}
                </select>
                <input list="entes-list-left" placeholder="Buscar por nombre" value={leftFilterName} onChange={e=>setLeftFilterName(e.target.value)} className="form-control" style={{ borderRadius: '8px', padding: '12px 18px', fontSize: 15, border: '1px solid #ddd', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)' }} />
                <datalist id="entes-list-left">{entesList.map((e,i)=>(<option key={i} value={e.title}/>))}</datalist>
              </div>

              <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #e9ecef', borderRadius: 8, padding: 12, background: '#f8f9fa' }}>
                {(!selectedLeft && filteredLeft.length === 0) && <div className="text-muted">No hay entes.</div>}
                {!selectedLeft && filteredLeft.sort((a,b)=> (a.id===selectedLeft?.id? -1 : 0)).map(e=> (
                  <div key={e.id} className="d-flex align-items-center justify-content-between p-3" style={{ borderBottom: '1px solid #e9ecef', background: '#fff', marginBottom: 8, borderRadius: 6 }}>
                    <div>
                      <div style={{ fontWeight: 700, color: '#440D1E' }}>{e.title}</div>
                      <div style={{ fontSize: 12, color: '#6c757d', marginTop: 4 }}>{e.classification}</div>
                    </div>
                    <div>
                      <button className="btn btn-sm" onClick={()=>setSelectedLeft(e)} style={{ background: 'linear-gradient(135deg, #681b32 0%, #200b07 100%)', color: '#fff', border: 'none', borderRadius: 6, padding: windowWidth < 426 ? '6px 10px' : '8px 16px', fontWeight: 600, fontSize: windowWidth < 424 ? 11 : 13, transition: 'all 0.3s ease', boxShadow: '0 2px 4px rgba(104, 27, 50, 0.2)' }}>Seleccionar</button>
                    </div>
                  </div>
                ))}

                {selectedLeft && (
                  <div className="p-3" style={{ background: '#fff0f5', borderRadius: 8, border: '2px solid #681b32' }}>
                    <div className="d-flex align-items-center justify-content-between">
                      <div>
                        <div style={{ fontWeight: 700, color: '#440D1E' }}>{selectedLeft.title}</div>
                        <div style={{ fontSize: 12, color: '#6c757d', marginTop: 4 }}>{selectedLeft.classification}</div>
                      </div>
                      <div>
                        <button className="btn btn-sm" onClick={()=>setSelectedLeft(null)} style={{ background: '#dc3545', color: '#fff', border: 'none', borderRadius: 6, padding: windowWidth < 426 ? '6px 10px' : '8px 16px', fontWeight: 600, fontSize: windowWidth < 424 ? 11 : 13 }}>Quitar</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Chart area for left selected */}
              {selectedLeft && (
                <div className="card" style={{ borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: 'none', padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h4 style={{ fontWeight: 600, color: '#440D1E', marginBottom: 0 }}>Gráfico de cumplimientos</h4>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        className="btn btn-sm"
                        onClick={handleExportPDFLeft}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 10px rgba(220,53,69,0.45)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(220, 53, 69, 0.2)'; }}
                        style={{
                          background: 'linear-gradient(135deg, #dc3545 0%, #b02a37 100%)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 6,
                          padding: windowWidth < 426 ? '6px 10px' : '8px 14px',
                          fontWeight: 600,
                          fontSize: windowWidth < 426 ? 11 : 13,
                          transition: 'all 0.3s ease',
                          boxShadow: '0 2px 4px rgba(220, 53, 69, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: windowWidth < 424 ? 3 : 6
                        }}
                      >
                        {windowWidth < 426 ? null : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                            <path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708l3-3z"/>
                          </svg>
                        )}
                        {windowWidth < 426 ? 'PDF' : 'Exportar PDF'}
                      </button>
                      <button
                        className="btn btn-sm"
                        onClick={handleExportExcelLeft}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 10px rgba(20,83,45,0.45)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(20, 83, 45, 0.2)'; }}
                        style={{
                          background: 'linear-gradient(135deg, #14532d 0%, #0f3d21 100%)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 6,
                          padding: windowWidth < 426 ? '6px 10px' : '8px 14px',
                          fontWeight: 600,
                          fontSize: windowWidth < 426 ? 11 : 13,
                          transition: 'all 0.3s ease',
                          boxShadow: '0 2px 4px rgba(20, 83, 45, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: windowWidth < 426 ? 3 : 6
                        }}
                      >
                        {windowWidth < 424 ? null : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                            <path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708l3-3z"/>
                          </svg>
                        )}
                        {windowWidth < 426 ? 'Excel' : 'Exportar Excel'}
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <label style={{ fontWeight: 600, color: '#495057', fontSize: 14, marginBottom: 0 }}>Selecciona años:</label>
                    {(Array.from(new Set((selectedLeft.compliances||[]).map(c=>c.year))).sort((a,b)=>b-a)).map(y => (
                      <label key={y} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 6, background: selectedYearsLeft.includes(y) ? 'linear-gradient(135deg, #681b32 0%, #200b07 100%)' : '#f0f0f0', color: selectedYearsLeft.includes(y) ? '#fff' : '#495057', fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.3s ease', border: 'none' }}>
                        <input type="checkbox" checked={selectedYearsLeft.includes(y)} onChange={() => toggleYearLeft(y)} style={{ cursor: 'pointer' }} />
                        <span>{y}</span>
                      </label>
                    ))}
                  </div>

                <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 16, padding: '12px', background: '#f8f9fa', borderRadius: 8 }}>
                  {(selectedYearsLeft || []).map(y => {
                    const ic = computeICForEnteYear(selectedLeft, y);
                    return <div key={y} style={{ background: '#fff', padding: '8px 12px', borderRadius: 6, fontWeight: 700, color: '#440D1E', fontSize: 13, border: '1px solid #e9ecef' }}>IC {y}: <span style={{ color: '#681b32' }}>{ic !== null ? `${ic}%` : '-'}</span></div>
                  })}
                </div>

                <div style={{ width: '100%', height: 320, background: '#fff', border: '1px solid #e9ecef', borderRadius: 12, marginTop: 16 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    {(() => {
                      const yearsAvailable = Array.from(new Set((selectedLeft.compliances||[]).map(c=>c.year))).sort();
                      const yearsToRender = (selectedYearsLeft && selectedYearsLeft.length) ? selectedYearsLeft.slice().sort() : yearsAvailable;
                      const enteForChart = { ...selectedLeft, __yearsToUse: yearsToRender };
                      const data = buildBarDataForEnte(enteForChart);
                      return (
                        <BarChart
                          data={data}
                          margin={{ top: 10, right: 30, left: -30, bottom: 40 }}
                          barCategoryGap="20%"
                          barGap={1}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" tick={<CustomXAxisTick />}>
                            <Label content={<CustomYearsLabel selectedYears={yearsToRender} />} position="bottom" />
                          </XAxis>
                          <YAxis
                            domain={[0, 2]}
                            allowDecimals={false}
                            axisLine={false}
                            tick={false}
                          />
                          <Tooltip content={<CustomBarTooltip />} />
                          {yearsToRender.map(y => (
                            <React.Fragment key={y}>
                              <Bar
                                dataKey={`${y}_no`}
                                stackId={String(y)}
                                fill="#dc3545"
                                stroke="#991b1b"
                                strokeWidth={1.8}
                                fillOpacity={0.98}
                                radius={[6, 6, 0, 0]}
                              />
                              <Bar
                                dataKey={`${y}_parcial`}
                                stackId={String(y)}
                                fill="#ffc107"
                                stroke="#B59B05"
                                strokeWidth={1.8}
                                fillOpacity={0.98}
                                radius={[6, 6, 0, 0]}
                              />
                              <Bar
                                dataKey={`${y}_cumplio`}
                                stackId={String(y)}
                                fill="#28a745"
                                stroke="#277A3A"
                                strokeWidth={1.8}
                                fillOpacity={0.98}
                                radius={[6, 6, 0, 0]}
                              />
                            </React.Fragment>
                          ))}
                        </BarChart>
                      );
                    })()}
                  </ResponsiveContainer>
                </div>

                <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 16, padding: '12px', background: '#f8f9fa', borderRadius: 8 }}>
                  {(() => {
                    const pct = computePercentagesForEnte(selectedLeft, selectedYearsLeft);
                    return (
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1 }}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <div style={{ width: 14, height: 14, background: '#28a745', borderRadius: 4 }} />
                          <div>
                            <div style={{ fontSize: 12, color: '#6c757d', marginBottom: 2 }}>Cumplió</div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: '#28a745' }}>{pct.cumplio}%</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <div style={{ width: 14, height: 14, background: '#ffc107', borderRadius: 4 }} />
                          <div>
                            <div style={{ fontSize: 12, color: '#6c757d', marginBottom: 2 }}>Parcial</div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: '#ffc107' }}>{pct.parcial}%</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <div style={{ width: 14, height: 14, background: '#dc3545', borderRadius: 4 }} />
                          <div>
                            <div style={{ fontSize: 12, color: '#6c757d', marginBottom: 2 }}>No cumplió</div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: '#dc3545' }}>{pct.no}%</div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
            </div>
          </div>

          {/* Second ente (bottom) */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="card" style={{ borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: 'none', padding: '24px', marginBottom: 0 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: '#440D1E' }}>Ente 2</h3>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <select value={rightFilterClass} onChange={e=>setRightFilterClass(e.target.value)} className="form-select" style={{ borderRadius: '8px', padding: '12px 18px', fontSize: 15, border: '1px solid #ddd', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)' }}>
                  <option value="">Todas las clasificaciones</option>
                  {classifications.map(c=> <option key={c} value={c}>{c}</option>)}
                </select>
                <input list="entes-list-right" placeholder="Buscar por nombre" value={rightFilterName} onChange={e=>setRightFilterName(e.target.value)} className="form-control" style={{ borderRadius: '8px', padding: '12px 18px', fontSize: 15, border: '1px solid #ddd', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)' }} />
                <datalist id="entes-list-right">{entesList.map((e,i)=>(<option key={i} value={e.title}/>))}</datalist>
              </div>

            <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #e9ecef', borderRadius: 8, padding: 12, background: '#f8f9fa' }}>
              {(!selectedRight && filteredRight.length === 0) && <div className="text-muted">No hay entes.</div>}
              {!selectedRight && filteredRight.sort((a,b)=> (a.id===selectedRight?.id? -1 : 0)).map(e=> (
                <div key={e.id} className="d-flex align-items-center justify-content-between p-3" style={{ borderBottom: '1px solid #e9ecef', background: '#fff', marginBottom: 8, borderRadius: 6 }}>
                  <div>
                    <div style={{ fontWeight: 700, color: '#440D1E' }}>{e.title}</div>
                    <div style={{ fontSize: 12, color: '#6c757d', marginTop: 4 }}>{e.classification}</div>
                  </div>
                  <div>
                    <button className="btn btn-sm" onClick={()=>setSelectedRight(e)} style={{ background: 'linear-gradient(135deg, #681b32 0%, #200b07 100%)', color: '#fff', border: 'none', borderRadius: 6, padding: windowWidth < 426 ? '6px 10px' : '8px 16px', fontWeight: 600, fontSize: windowWidth < 424 ? 11 : 13, transition: 'all 0.3s ease', boxShadow: '0 2px 4px rgba(104, 27, 50, 0.2)' }}>Seleccionar</button>
                  </div>
                </div>
              ))}

              {selectedRight && (
                <div className="p-3" style={{ background: '#fff0f5', borderRadius: 8, border: '2px solid #681b32' }}>
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <div style={{ fontWeight: 700, color: '#440D1E' }}>{selectedRight.title}</div>
                      <div style={{ fontSize: 12, color: '#6c757d', marginTop: 4 }}>{selectedRight.classification}</div>
                    </div>
                    <div>
                      <button className="btn btn-sm" onClick={()=>setSelectedRight(null)} style={{ background: '#dc3545', color: '#fff', border: 'none', borderRadius: 6, padding: windowWidth < 426 ? '6px 10px' : '8px 16px', fontWeight: 600, fontSize: windowWidth < 424 ? 11 : 13 }}>Quitar</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            </div>

            {/* Chart area for right selected */}
            {selectedRight && (
              <div className="card" style={{ borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: 'none', padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h4 style={{ fontWeight: 600, color: '#440D1E', marginBottom: 0 }}>Gráfico de cumplimientos</h4>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="btn btn-sm"
                      onClick={handleExportPDFRight}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 10px rgba(220,53,69,0.45)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(220, 53, 69, 0.2)'; }}
                      style={{
                        background: 'linear-gradient(135deg, #dc3545 0%, #b02a37 100%)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 6,
                        padding: windowWidth < 426 ? '6px 10px' : '8px 14px',
                        fontWeight: 600,
                        fontSize: windowWidth < 426 ? 11 : 13,
                        transition: 'all 0.3s ease',
                        boxShadow: '0 2px 4px rgba(220, 53, 69, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: windowWidth < 426 ? 3 : 6
                      }}
                    >
                      {windowWidth < 426 ? null : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                          <path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708l3-3z"/>
                        </svg>
                      )}
                      {windowWidth < 426 ? 'PDF' : 'Exportar PDF'}
                    </button>
                    <button
                      className="btn btn-sm"
                      onClick={handleExportExcelRight}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 10px rgba(20,83,45,0.45)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(20, 83, 45, 0.2)'; }}
                      style={{
                        background: 'linear-gradient(135deg, #14532d 0%, #0f3d21 100%)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 6,
                        padding: windowWidth < 426 ? '6px 10px' : '8px 14px',
                        fontWeight: 600,
                        fontSize: windowWidth < 426 ? 11 : 13,
                        transition: 'all 0.3s ease',
                        boxShadow: '0 2px 4px rgba(20, 83, 45, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: windowWidth < 426 ? 3 : 6
                      }}
                    >
                      {windowWidth < 426 ? null : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                          <path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708l3-3z"/>
                        </svg>
                      )}
                      {windowWidth < 426 ? 'Excel' : 'Exportar Excel'}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
                  <label style={{ fontWeight: 600, color: '#495057', fontSize: 14, marginBottom: 0 }}>Selecciona años:</label>
                  {(Array.from(new Set((selectedRight.compliances||[]).map(c=>c.year))).sort((a,b)=>b-a)).map(y => (
                    <label key={y} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 6, background: selectedYearsRight.includes(y) ? 'linear-gradient(135deg, #681b32 0%, #200b07 100%)' : '#f0f0f0', color: selectedYearsRight.includes(y) ? '#fff' : '#495057', fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.3s ease', border: 'none' }}>
                      <input type="checkbox" checked={selectedYearsRight.includes(y)} onChange={() => toggleYearRight(y)} style={{ cursor: 'pointer' }} />
                      <span>{y}</span>
                    </label>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, padding: '12px', background: '#f8f9fa', borderRadius: 8 }}>
                  {(selectedYearsRight || []).map(y => {
                    const ic = computeICForEnteYear(selectedRight, y);
                    return <div key={y} style={{ background: '#fff', padding: '8px 12px', borderRadius: 6, fontWeight: 700, color: '#440D1E', fontSize: 13, border: '1px solid #e9ecef' }}>IC {y}: <span style={{ color: '#681b32' }}>{ic !== null ? `${ic}%` : '-'}</span></div>
                  })}
                </div>

                <div style={{ width: '100%', height: 320, background: '#fff', border: '1px solid #e9ecef', borderRadius: 12, marginTop: 16 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    {(() => {
                      const yearsAvailable = Array.from(new Set((selectedRight.compliances||[]).map(c=>c.year))).sort();
                      const yearsToRender = (selectedYearsRight && selectedYearsRight.length) ? selectedYearsRight.slice().sort() : yearsAvailable;
                      const enteForChart = { ...selectedRight, __yearsToUse: yearsToRender };
                      const data = buildBarDataForEnte(enteForChart);
                      return (
                        <BarChart
                          data={data}
                          margin={{ top: 10, right: 30, left: -30, bottom: 40 }}
                          barCategoryGap="20%"
                          barGap={1}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" tick={<CustomXAxisTick />}>
                            <Label content={<CustomYearsLabel selectedYears={yearsToRender} />} position="bottom" />
                          </XAxis>
                          <YAxis
                            domain={[0, 2]}
                            allowDecimals={false}
                            axisLine={false}
                            tick={false}
                          />
                          <Tooltip content={<CustomBarTooltip />} />
                          {yearsToRender.map(y => (
                            <React.Fragment key={y}>
                              <Bar
                                dataKey={`${y}_no`}
                                stackId={String(y)}
                                fill="#dc3545"
                                stroke="#991b1b"
                                strokeWidth={1.8}
                                fillOpacity={0.98}
                                radius={[6, 6, 0, 0]}
                              />
                              <Bar
                                dataKey={`${y}_parcial`}
                                stackId={String(y)}
                                fill="#ffc107"
                                stroke="#B59B05"
                                strokeWidth={1.8}
                                fillOpacity={0.98}
                                radius={[6, 6, 0, 0]}
                              />
                              <Bar
                                dataKey={`${y}_cumplio`}
                                stackId={String(y)}
                                fill="#28a745"
                                stroke="#277A3A"
                                strokeWidth={1.8}
                                fillOpacity={0.98}
                                radius={[6, 6, 0, 0]}
                              />
                            </React.Fragment>
                          ))}
                        </BarChart>
                      );
                    })()}
                  </ResponsiveContainer>
                </div>

                <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 16, padding: '12px', background: '#f8f9fa', borderRadius: 8 }}>
                  {(() => {
                    const pct = computePercentagesForEnte(selectedRight, selectedYearsRight);
                    return (
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1 }}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <div style={{ width: 14, height: 14, background: '#28a745', borderRadius: 4 }} />
                          <div>
                            <div style={{ fontSize: 12, color: '#6c757d', marginBottom: 2 }}>Cumplió</div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: '#28a745' }}>{pct.cumplio}%</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <div style={{ width: 14, height: 14, background: '#ffc107', borderRadius: 4 }} />
                          <div>
                            <div style={{ fontSize: 12, color: '#6c757d', marginBottom: 2 }}>Parcial</div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: '#ffc107' }}>{pct.parcial}%</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <div style={{ width: 14, height: 14, background: '#dc3545', borderRadius: 4 }} />
                          <div>
                            <div style={{ fontSize: 12, color: '#6c757d', marginBottom: 2 }}>No cumplió</div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: '#dc3545' }}>{pct.no}%</div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {viewMode === 'por-mes-anio' && (
        <div className="card" style={{ borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: 'none', padding: '24px' }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: '#440D1E' }}>Comparación por mes y año</h3>
          <div className="row g-3" style={{ marginBottom: 16 }}>
            <div className="col-lg-3">
              <label className="form-label" style={{ fontWeight: 500, color: '#495057', fontSize: 14, marginBottom: 8 }}>Mes:</label>
              <select
                className="form-select"
                value={selectedMonthForChart}
                onChange={(e) => setSelectedMonthForChart(e.target.value)}
                style={{ borderRadius: '8px', padding: '12px 18px', fontSize: 15, border: '1px solid #ddd', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)' }}
              >
                {months.map((m, i) => (
                  <option key={i} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div className="col-lg-9">
              <label className="form-label" style={{ fontWeight: 500, color: '#495057', fontSize: 14, marginBottom: 8 }}>Años (máximo 3):</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {years.map((y) => (
                  <label key={y} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 6, background: selectedYearsForMonthChart.includes(y) ? 'linear-gradient(135deg, #681b32 0%, #200b07 100%)' : '#f0f0f0', color: selectedYearsForMonthChart.includes(y) ? '#fff' : '#495057', fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.3s ease', border: 'none' }}>
                    <input type="checkbox" checked={selectedYearsForMonthChart.includes(y)} onChange={() => toggleYearForMonthChart(y)} style={{ cursor: 'pointer' }} />
                    <span>{y}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button
              className="btn btn-sm"
              onClick={() => {
                const years = selectedYearsForMonthChart.join('-');
                const month = selectedMonthForChart;
                window.location.href = `/ExportPDFCom?years=${years}&month=${month}`;
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 10px rgba(220,53,69,0.45)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(220, 53, 69, 0.2)'; }}
              style={{
                background: 'linear-gradient(135deg, #dc3545 0%, #b02a37 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                padding: '8px 14px',
                fontWeight: 600,
                fontSize: 13,
                transition: 'all 0.3s ease',
                boxShadow: '0 2px 4px rgba(220, 53, 69, 0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                <path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708l3-3z"/>
              </svg>
              Exportar PDF
            </button>
            <button
              className="btn btn-sm"
              onClick={() => {
                const years = selectedYearsForMonthChart.join('-');
                const month = selectedMonthForChart;
                window.location.href = `/ExportExcelCom?years=${years}&month=${month}`;
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 10px rgba(20,83,45,0.45)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(20, 83, 45, 0.2)'; }}
              style={{
                background: 'linear-gradient(135deg, #14532d 0%, #0f3d21 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                padding: '8px 14px',
                fontWeight: 600,
                fontSize: 13,
                transition: 'all 0.3s ease',
                boxShadow: '0 2px 4px rgba(20, 83, 45, 0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                <path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708l3-3z"/>
              </svg>
              Exportar Excel
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: selectedMonthForChart === 'Todos' ? 'repeat(auto-fit, minmax(220px, 1fr))' : 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 16 }}>
            {(() => {
              const data = buildMonthYearBarData(selectedYearsForMonthChart, selectedMonthForChart);
              return data.map((monthData) => {
                // Calcular totales por año para este mes
                const yearStats = {};
                selectedYearsForMonthChart.forEach(y => {
                  const cumplio = monthData[`${y}_cumplio`] || 0;
                  const parcial = monthData[`${y}_parcial`] || 0;
                  const no = monthData[`${y}_no`] || 0;
                  const total = cumplio + parcial + no;
                  yearStats[y] = { cumplio, parcial, no, total };
                });

                // Crear datos para gráfica de dona agregada
                let totalCumplio = 0, totalParcial = 0, totalNo = 0;
                Object.values(yearStats).forEach(stat => {
                  totalCumplio += stat.cumplio;
                  totalParcial += stat.parcial;
                  totalNo += stat.no;
                });
                const grandTotal = totalCumplio + totalParcial + totalNo;
                const pieData = [
                  { name: 'Cumplió', value: totalCumplio, color: '#28a745' },
                  { name: 'No cumplió', value: totalParcial, color: '#ffc107' },
                  { name: 'No presentó', value: totalNo, color: '#dc3545' }
                ].filter(d => d.value > 0);

                // Custom tooltip para la dona que muestra desglose por año según el segmento
                const CustomDonutTooltip = ({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;

                  const status = payload[0].name; // 'Cumplió', 'No cumplió', o 'No presentó'

                  return (
                    <div className="card p-2" style={{ minWidth: 180, background: '#fff', border: '1px solid #ccc', borderRadius: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', padding: 10 }}>
                      <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 14 }}>{abbrToFull[monthData.month] || monthData.month}</div>
                      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, color: payload[0].payload.color }}>{status}</div>
                      {selectedYearsForMonthChart.map(y => {
                        const stat = yearStats[y];
                        if (!stat || stat.total === 0) return null;

                        // Obtener el valor específico según el estado del segmento
                        let count = 0;
                        if (status === 'Cumplió') count = stat.cumplio;
                        else if (status === 'No cumplió') count = stat.parcial;
                        else if (status === 'No presentó') count = stat.no;

                        if (count === 0) return null;

                        const percentage = stat.total > 0 ? Math.round((count / stat.total) * 100) : 0;

                        return (
                          <div key={y} style={{ marginBottom: 4 }}>
                            <div style={{ fontSize: 13, color: '#333' }}>
                              {y}: {percentage}% ({count}/{stat.total})
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                };

                // Calcular IC para este mes
                const calculateMonthIC = () => {
                  let totalCumplioCount = 0;
                  let totalEntesCount = 0;
                  selectedYearsForMonthChart.forEach(y => {
                    const stat = yearStats[y];
                    if (stat && stat.total > 0) {
                      totalCumplioCount += stat.cumplio;
                      totalEntesCount += stat.total;
                    }
                  });
                  return totalEntesCount > 0 ? Math.round((totalCumplioCount / totalEntesCount) * 100) : 0;
                };

                return (
                  <div key={monthData.month} className="p-2 rounded" style={{ background: '#fff', border: '1px solid #e9ecef' }}>
                    <h6 className="text-center" style={{ marginBottom: 6, fontSize: 15, fontWeight: 600 }}>
                      {abbrToFull[monthData.month] || monthData.month}
                    </h6>
                    <div style={{ position: 'relative', height: 180, isolation: 'isolate' }}>
                      {grandTotal > 0 && (
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none', zIndex: 1 }}>
                          <div style={{ fontSize: 28, fontWeight: 700, color: '#440D1E' }}>{calculateMonthIC()}%</div>
                          <div style={{ fontSize: 11, color: '#6c757d', marginTop: -2 }}>IC</div>
                        </div>
                      )}
                      <ResponsiveContainer width="100%" height="100%" style={{ position: 'relative', zIndex: 2 }}>
                        <PieChart>
                          <Pie
                            data={pieData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={48}
                            outerRadius={68}
                            paddingAngle={2}
                            isAnimationActive={true}
                          >
                            {pieData.map((entry, idx) => (
                              <Cell key={`cell-${idx}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomDonutTooltip />} wrapperStyle={{ zIndex: 9999 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                );
              });
            })()}
          </div>

          <div style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '12px', background: '#f8f9fa', borderRadius: 8 }}>
            {(() => {
              const pct = computeAggregatePercentages(selectedYearsForMonthChart, selectedMonthForChart === 'Todos' ? [] : [selectedMonthForChart]);
              return (
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <div style={{ width: 14, height: 14, background: '#28a745', borderRadius: 4 }} />
                    <div>
                      <div style={{ fontSize: 12, color: '#6c757d', marginBottom: 2 }}>Cumplió</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#28a745' }}>{pct.cumplio}%</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <div style={{ width: 14, height: 14, background: '#ffc107', borderRadius: 4 }} />
                    <div>
                      <div style={{ fontSize: 12, color: '#6c757d', marginBottom: 2 }}>No cumplió</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#ffc107' }}>{pct.parcial}%</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <div style={{ width: 14, height: 14, background: '#dc3545', borderRadius: 4 }} />
                    <div>
                      <div style={{ fontSize: 12, color: '#6c757d', marginBottom: 2 }}>No presentó</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#dc3545' }}>{pct.no}%</div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
