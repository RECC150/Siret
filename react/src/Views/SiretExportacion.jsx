import React, { useEffect, useMemo, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Label } from 'recharts';
import ASEBCS from '../assets/asebcs.jpg';

// Componentes de gráfico consistentes con CumplimientosMesAnio
const monthAbbr = {
  'Enero': 'Ene', 'Febrero': 'Feb', 'Marzo': 'Mar', 'Abril': 'Abr', 'Mayo': 'May', 'Junio': 'Jun',
  'Julio': 'Jul', 'Agosto': 'Ago', 'Septiembre': 'Sep', 'Octubre': 'Oct', 'Noviembre': 'Nov', 'Diciembre': 'Dic'
};

function CustomXAxisTick(props) {
  const { x, y, payload } = props;
  const label = monthAbbr[payload.value] || String(payload.value).slice(0, 3);
  return (
    <g transform={`translate(${x},${y + 12})`}>
      <text x={0} y={0} textAnchor="middle" fill="#6c757d" fontSize={12}>{label}</text>
    </g>
  );
}

// Custom label centrado para mostrar los años seleccionados
function CustomYearsLabel(props) {
  const { viewBox, enabledYears } = props;
  if (!viewBox) return null;

  const yearsSelected = Object.keys(enabledYears || {}).filter(k => enabledYears[k]).map(k => k).sort((a, b) => a - b);
  const yearsText = yearsSelected.join(' | ');
  const x = viewBox.x + viewBox.width / 2;
  const y = viewBox.y + viewBox.height + 30;

  return (
    <text x={x} y={y} textAnchor="middle" fill="#6c757d" fontSize={11} fontWeight="500">
      {yearsText}
    </text>
  );
}

const abbrToFull = Object.fromEntries(Object.keys(monthAbbr).map(k => [ (monthAbbr[k] || k).toLowerCase(), k ]));

const tipoLabels = {
  cumplio: 'Cumplió',
  parcial: 'No Cumplió',
  no: 'No presentó',
};
const tipoColors = {
  cumplio: '#28a745',
  parcial: '#ffc107',
  no: '#dc3545',
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

export default function SiretExportacion(){
  const [compliances, setCompliances] = useState([]);
  const [entes, setEntes] = useState([]);
  const [clasificaciones, setClasificaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('años');
  const [entesSearch, setEntesSearch] = useState('');
  const [entesClasifFilter, setEntesClasifFilter] = useState('Todos');
  const [selectedEnte, setSelectedEnte] = useState(null);
  const [enteExportYear, setEnteExportYear] = useState("");
  const [enteExportMonth, setEnteExportMonth] = useState("");
  const [activeSection, setActiveSection] = useState('indicadores');
  const [enabledYears, setEnabledYears] = useState({});
  const [displayYears, setDisplayYears] = useState([]);
  const [addedMonthsByYear, setAddedMonthsByYear] = useState({});
  const [completedYears, setCompletedYears] = useState(new Set());
  const [newlyAddedYear, setNewlyAddedYear] = useState(null);
  const [showEntesModal, setShowEntesModal] = useState(false);
  const [entesModalYear, setEntesModalYear] = useState(null);
  const [entesActivosByYear, setEntesActivosByYear] = useState({});
  // Modal Mes
  const [showMonthModal, setShowMonthModal] = useState(false);
  const [monthModalYear, setMonthModalYear] = useState(null);
  const [monthModalMonth, setMonthModalMonth] = useState(null);
  const [monthModalSearchName, setMonthModalSearchName] = useState('');
  const [monthModalClasif, setMonthModalClasif] = useState('');

  const apiBase = `${window.location.protocol}//${window.location.hostname}/siret/api`;

  useEffect(()=>{
    const load = async () => {
      setLoading(true);
      try {
        const [cRes, eRes, clRes] = await Promise.all([
          fetch(apiBase + '/compliances.php'),
          fetch(apiBase + '/entes.php'),
          fetch(apiBase + '/clasificaciones.php')
        ]);
        const [cJson, eJson, clJson] = await Promise.all([cRes.json(), eRes.json(), clRes.json()]);
        setCompliances(Array.isArray(cJson) ? cJson : []);
        setEntes(Array.isArray(eJson) ? eJson : []);
        setClasificaciones(Array.isArray(clJson) ? clJson : []);
        const years = (Array.isArray(cJson) ? cJson.map(r=>String(r.year)).filter(Boolean) : []);
        const uniqueYears = Array.from(new Set(years)).sort((a,b)=>Number(b)-Number(a));
        setDisplayYears(uniqueYears);
      } catch(err){ console.error(err); } finally { setLoading(false); }
    };
    load();
  }, [apiBase]);

  // Cargar entes activos para todos los años disponibles
  useEffect(() => {
    if (!displayYears.length) return;
    displayYears.forEach(year => {
      const key = String(year);
      if (entesActivosByYear[key]) return; // ya cargado
      const load = async () => {
        try {
          const res = await fetch(`${apiBase}/entes_activos.php?year=${encodeURIComponent(year)}`);
          const json = await res.json();
          const setIds = new Set((json || []).map(r => Number(r.ente_id)));
          setEntesActivosByYear(prev => ({ ...prev, [key]: setIds }));
        } catch(e){ console.error(e); }
      };
      load();
    });
  }, [displayYears, apiBase, entesActivosByYear]);

  const latestYear = useMemo(()=>{
    if (!displayYears.length) return null;
    return displayYears.reduce((acc, y) => Number(y) > Number(acc) ? y : acc, displayYears[0]);
  }, [displayYears]);

  const monthCountFor = (year) => {
    const existingMonths = compliances.filter(c => String(c.year) === String(year)).map(c => c.month);
    if (existingMonths.length) return existingMonths.length;
    return (addedMonthsByYear[year] || []).length;
  };

  useEffect(() => {
    if (!displayYears.length) return;
    const latest = displayYears.reduce((acc, y) => Number(y) > Number(acc) ? y : acc, displayYears[0]);
    const newCompleted = new Set([...completedYears]);
    displayYears.forEach(y => {
      if (y !== latest) {
        if (monthCountFor(y) === 12) newCompleted.add(y);
      }
    });
    setCompletedYears(newCompleted);
  }, [displayYears, compliances]);

  // Helpers para modal de ENTE
  const computeICForEnteYear = (ente, year) => {
    const items = (ente?.compliances || compliances.filter(c => Number(c.ente_id) === Number(ente?.id)))
      .filter(c => c.year === Number(year));
    if (!items.length) return null;
    const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const monthsTranscurridos = months.filter(m => items.some(c => c.month === m)).length || 12;
    const cumplidos = items.filter(c => (c.status || '').toLowerCase() === 'cumplio').length;
    const ic = monthsTranscurridos > 0 ? Math.round((cumplidos / monthsTranscurridos) * 100) : null;
    return ic;
  };

  const getStatusForMonthYear = (ente, month, year) => {
    const list = (ente?.compliances || compliances.filter(c => Number(c.ente_id) === Number(ente?.id)))
      .filter(c => c.month === month && c.year === Number(year));
    return list[0]?.status || null;
  };

  const statusColor = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'cumplio') return '#28a745';
    if (s === 'parcial') return '#ffc107';
    if (s === 'no') return '#dc3545';
    return '#e9ecef';
  };

  const buildBarDataForEnte = (ente) => {
    if (!ente) return [];
    const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const yearsArr = (Object.keys(enabledYears).length
      ? Object.keys(enabledYears).filter(y => enabledYears[y]).map(y => parseInt(y, 10))
      : Array.from(new Set((ente.compliances || []).map(c => c.year))).sort((a, b) => a - b)
    );

    return months.map(m => {
      const row = { month: (monthAbbr[m] || m.slice(0,3)).toLowerCase() };
      yearsArr.forEach(y => {
        const comps = (ente.compliances || []).filter(c => c.year === y && c.month === m);
        const counts = { cumplio: 0, parcial: 0, no: 0 };
        comps.forEach(c => {
          const s = (c.status || '').toString().toLowerCase();
          if (s === 'cumplio') counts.cumplio++;
          else if (s === 'parcial' || s === 'partial') counts.parcial++;
          else counts.no++;
        });
        row[`${y}_cumplio`] = counts.cumplio ? 1.5 : 0;
        row[`${y}_parcial`] = counts.parcial ? 0.9 : 0;
        row[`${y}_no`] = counts.no ? 0.5 : 0;
      });
      return row;
    });
  };

  const toggleYear = (y) => {
    const current = { ...enabledYears };
    const currentlySelected = Object.keys(current).filter(k => current[k]).length;
    const isEnabling = !current[y];
    if (isEnabling && currentlySelected >= 3) {
      try { window.alert('Puede seleccionar hasta 3 años como máximo.'); } catch (e) { /* ignore */ }
      return;
    }
    if (!isEnabling) {
      if (currentlySelected <= 1) return;
    }
    current[y] = !current[y];
    setEnabledYears(current);
  };

  const openEnteModal = (ente) => {
    const enriched = {
      ...ente,
      compliances: compliances.filter(c => Number(c.ente_id) === Number(ente.id))
    };
    const yearsArr = Array.from(new Set(enriched.compliances.map(c => c.year))).sort((a,b)=>b-a);
    const defaults = {};
    yearsArr.forEach((y, idx) => { defaults[y] = idx < 3; });
    setEnabledYears(defaults);
    setActiveSection('graficas');
    setSelectedEnte(enriched);

    // Inicializar selects de exportación (por defecto: último año y último mes con dato)
    if (yearsArr.length) {
      const defaultYear = String(yearsArr[0]);
      setEnteExportYear(defaultYear);
      const monthsOrder = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
      const itemsForYear = enriched.compliances.filter(c => String(c.year) === defaultYear);
      const monthsWithData = monthsOrder.filter(m => itemsForYear.some(c => c.month === m));
      setEnteExportMonth(monthsWithData.length ? monthsWithData[monthsWithData.length - 1] : 'Enero');
    } else {
      setEnteExportYear("");
      setEnteExportMonth("");
    }
    try { document.body.style.overflow = 'hidden'; } catch (e) {}
  };
  const closeEnteModal = () => {
    setSelectedEnte(null);
    try { document.body.style.overflow = ''; } catch (e) {}
  };

  const calculateYearStats = (year) => {
    const yearCompliances = compliances.filter(c => String(c.year) === String(year));
    const uniqueMonths = [...new Set(yearCompliances.map(c => c.month))];
    const monthsWithCompliance = new Map();
    uniqueMonths.forEach(month => {
      const monthData = yearCompliances.filter(c => c.month === month);
      const statusCount = { cumplio: 0, parcial: 0, no: 0 };
      monthData.forEach(c => {
        const status = (c.status || '').toLowerCase();
        if (status === 'cumplio') statusCount.cumplio++;
        else if (status === 'parcial') statusCount.parcial++;
        else if (status === 'no') statusCount.no++;
      });
      monthsWithCompliance.set(month, statusCount);
    });
    let totalGreen = 0, totalYellow = 0, totalRed = 0;
    monthsWithCompliance.forEach(counts => {
      totalGreen += counts.cumplio;
      totalYellow += counts.parcial;
      totalRed += counts.no;
    });
    const totalRecords = totalGreen + totalYellow + totalRed;
    const greenPercent = totalRecords > 0 ? ((totalGreen / totalRecords) * 100).toFixed(1) : '0.0';
    const yellowPercent = totalRecords > 0 ? ((totalYellow / totalRecords) * 100).toFixed(1) : '0.0';
    const redPercent = totalRecords > 0 ? ((totalRed / totalRecords) * 100).toFixed(1) : '0.0';
    const ic = greenPercent;
    return { ic, greenPercent, yellowPercent, redPercent };
  };

  const openEntesModal = (year) => {
    setEntesModalYear(String(year));
    setShowEntesModal(true);
  };

  // Calcula porcentajes del mes (verde/amarillo/rojo) y total
  const calculateMonthStats = (year, month) => {
    const records = compliances.filter(c => String(c.year) === String(year) && c.month === month);
    const counts = { cumplio:0, parcial:0, no:0 };
    records.forEach(c => {
      const s = (c.status||'').toLowerCase();
      if(s==='cumplio') counts.cumplio++; else if(s==='parcial') counts.parcial++; else if(s==='no') counts.no++;
    });
    const total = counts.cumplio + counts.parcial + counts.no;
    const pct = v => total>0? ((v/total)*100).toFixed(1) : '0.0';
    return { total, cumplio: pct(counts.cumplio), parcial: pct(counts.parcial), no: pct(counts.no) };
  };

  // Versión filtrada por entes visibles en el modal (búsqueda + clasificación)
  const calculateMonthStatsFiltered = (year, month, searchName, clasif) => {
    const currentActivesSet = entesActivosByYear[String(year)] || new Set();
    let filteredEntes = (entes || []).filter(e => currentActivesSet.has(Number(e.id)));
    if (searchName && searchName.trim()) {
      const q = searchName.trim().toLowerCase();
      filteredEntes = filteredEntes.filter(e => (e.title || '').toLowerCase().includes(q));
    }
    if (clasif && clasif !== 'Todos') {
      filteredEntes = filteredEntes.filter(e => (e.classification || '') === clasif);
    }
    const filteredIds = new Set(filteredEntes.map(e => Number(e.id)));
    const records = compliances.filter(c => String(c.year) === String(year) && c.month === month && filteredIds.has(Number(c.ente_id)));
    const counts = { cumplio:0, parcial:0, no:0 };
    records.forEach(c => {
      const s = (c.status||'').toLowerCase();
      if(s==='cumplio') counts.cumplio++; else if(s==='parcial') counts.parcial++; else if(s==='no') counts.no++;
    });
    const total = counts.cumplio + counts.parcial + counts.no;
    const pct = v => total>0? ((v/total)*100).toFixed(1) : '0.0';
    return { total, cumplio: pct(counts.cumplio), parcial: pct(counts.parcial), no: pct(counts.no) };
  };

  // Lista de IDs filtrados actualmente en el modal del mes
  const filteredMonthEnteIds = useMemo(() => {
    if(!monthModalYear || !monthModalMonth) return [];
    const currentActivesSet = entesActivosByYear[String(monthModalYear)] || new Set();
    let list = (entes || []).filter(e => currentActivesSet.has(Number(e.id)));
    if (monthModalSearchName && monthModalSearchName.trim()) {
      const q = monthModalSearchName.trim().toLowerCase();
      list = list.filter(e => (e.title || '').toLowerCase().includes(q));
    }
    if (monthModalClasif && monthModalClasif !== 'Todos') {
      list = list.filter(e => (e.classification || '') === monthModalClasif);
    }
    return list.map(e => Number(e.id));
  }, [monthModalYear, monthModalMonth, monthModalSearchName, monthModalClasif, entes, entesActivosByYear]);

  const openMonthModal = (year, month) => {
    setMonthModalYear(String(year));
    setMonthModalMonth(month);
    setMonthModalSearchName('');
    setMonthModalClasif('');
    setShowMonthModal(true);
    try { document.body.style.overflow = 'hidden'; } catch (e) {}
  };

  const closeMonthModal = () => {
    setShowMonthModal(false);
    try { document.body.style.overflow = ''; } catch (e) {}
  };

  const handleExportPDFYear = (year) => {
    alert(`Exportar PDF del año ${year} (próximamente)`);
  };
  const handleExportExcelYear = (year) => {
    alert(`Exportar Excel del año ${year} (próximamente)`);
  };

  return (
    <div className="container py-4">
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark fixed-top">
        <div className="container-fluid">
          <a className="navbar-brand d-flex align-items-center" href="#">
            <img src={ASEBCS} alt="Logo SIRET" width="80" height="40" className="me-2" />
            SIRET
          </a>
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav ms-auto">
              <li className="nav-item"><a className="nav-link" href="/SiretEntes">Entes</a></li>
              <li className="nav-item"><a className="nav-link" href="/SiretClasificaciones">Clasificaciones</a></li>
              <li className="nav-item"><a className="nav-link" href="/SiretCumplimientos">Cumplimientos</a></li>
              <li className="nav-item"><a className="nav-link active" href="/SiretExportacion">Exportar</a></li>
            </ul>
          </div>
        </div>
      </nav>

      <header className="text-white text-center py-5" style={{ background: 'linear-gradient(135deg, #681b32 0%, #200b07 100%)', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <h1 style={{ fontWeight: 700, marginBottom: 8 }}>SIRET</h1>
        <p className="lead" style={{ marginBottom: 0, opacity: 0.95 }}>Sistema de Registro de Cumplimientos</p>
      </header>

      <div style={{ width: '100%', marginTop: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, padding: '8px', background: '#f8f9fa', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <button
            type="button"
            className="btn"
            onClick={() => setViewMode('años')}
            style={{
              flex: 1,
              padding: '12px 20px',
              background: viewMode === 'años' ? 'linear-gradient(135deg, #681b32 0%, #200b07 100%)' : '#fff',
              color: viewMode === 'años' ? '#fff' : '#681b32',
              border: viewMode === 'años' ? 'none' : '2px solid #681b32',
              borderRadius: '8px',
              fontWeight: 600,
              transition: 'all 0.3s ease',
              boxShadow: viewMode === 'años' ? '0 4px 6px rgba(104, 27, 50, 0.3)' : 'none'
            }}
            aria-pressed={viewMode === 'años'}
            title="Mostrar años"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style={{ marginRight: 8, verticalAlign: 'middle' }}>
              <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
            </svg>
            Años
          </button>

          <button
            type="button"
            className="btn"
            onClick={() => setViewMode('entes')}
            style={{
              flex: 1,
              padding: '12px 20px',
              background: viewMode === 'entes' ? 'linear-gradient(135deg, #681b32 0%, #200b07 100%)' : '#fff',
              color: viewMode === 'entes' ? '#fff' : '#681b32',
              border: viewMode === 'entes' ? 'none' : '2px solid #681b32',
              borderRadius: '8px',
              fontWeight: 600,
              transition: 'all 0.3s ease',
              boxShadow: viewMode === 'entes' ? '0 4px 6px rgba(104, 27, 50, 0.3)' : 'none'
            }}
            aria-pressed={viewMode === 'entes'}
            title="Ver entes"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style={{ marginRight: 8, verticalAlign: 'middle' }}>
              <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/>
            </svg>
            Entes
          </button>
        </div>
      </div>

      {viewMode === 'años' && (
      <section id="exportacion" style={{ marginTop: 16, marginBottom: 32 }}>
        <hr className="linea mb-4" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontWeight: 700, color: '#681b32', margin: 0 }}>Exportación</h2>
        </div>

        {displayYears.length === 0 && (
          <div className="card card-body mb-3" style={{ border: 'none', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <p style={{ margin: 0, color: '#6c757d' }}>No hay años disponibles.</p>
          </div>
        )}

        {displayYears.map((year) => {
          const collapseId = `yearExport_${year}`;
          const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
          const existingMonths = new Set(
            compliances
              .filter(c => String(c.year) === String(year))
              .map(c => c.month)
          );
          const monthCount = existingMonths.size;
          const isComplete = monthCount >= 12;
          const isLatest = latestYear === year;
          return (
            <div className="cumplimiento-item mb-3" key={year}>
              <button
                type="button"
                className="w-100"
                data-bs-toggle="collapse"
                data-bs-target={`#${collapseId}`}
                aria-expanded="false"
                aria-controls={collapseId}
                style={{
                  background: 'linear-gradient(135deg, #681b32 0%, #200b07 100%)',
                  color: '#fff',
                  fontWeight: 600,
                  padding: '14px 18px',
                  borderRadius: '10px',
                  boxShadow: '0 3px 8px rgba(104, 27, 50, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: 'none',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/>
                  </svg>
                  Año {year}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {completedYears.has(year) && (
                    <span style={{
                      background: '#198754',
                      padding: '4px 12px',
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: '0.5px'
                    }}>COMPLETADO</span>
                  )}
                  <span style={{
                    background: 'rgba(255,255,255,0.2)',
                    padding: '4px 12px',
                    borderRadius: 20,
                    fontSize: 13,
                    fontWeight: 600
                  }}>
                    {monthCount}/12
                  </span>
                  <span style={{
                    background: 'rgba(255,255,255,0.25)',
                    padding: '4px 10px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 600
                  }}>
                    {(() => {
                      const activesSet = entesActivosByYear[String(year)] || new Set();
                      return activesSet.size;
                    })()} Entes
                  </span>
                  <span style={{
                    background: 'rgba(255,255,255,0.3)',
                    padding: '4px 10px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 700
                  }}>
                    IC: {calculateYearStats(year).ic}%
                  </span>

                </div>
              </button>
              <div className="collapse" id={collapseId}>
                <div className="card card-body" style={{ border: 'none', borderRadius: '0 0 10px 10px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginTop: 8 }}>
                  {(() => {
                    const monthsOrder = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
                    const stagedMonths = addedMonthsByYear[year] || [];
                    const combinedSet = new Set([...(existingMonths || new Set()), ...stagedMonths]);
                    let displayMonths;
                    if (!isLatest) {
                      displayMonths = Array.from(existingMonths);
                    } else {
                      displayMonths = Array.from(combinedSet);
                    }
                    displayMonths.sort((a,b) => monthsOrder.indexOf(a) - monthsOrder.indexOf(b));
                    return (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                          <h6 style={{ fontWeight: 600, margin: 0, color: '#200b07', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                              <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                            </svg>
                            Meses disponibles
                            {(() => {
                              const stats = calculateYearStats(year);
                              return (
                                <span style={{ display: 'flex', gap: 6, marginLeft: 12, fontSize: 12 }}>
                                  <span style={{ background: '#28a745', color: '#fff', padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>
                                    Cumplió: {stats.greenPercent}%
                                  </span>
                                  <span style={{ background: '#ffc107', color: '#000', padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>
                                    No cumplió: {stats.yellowPercent}%
                                  </span>
                                  <span style={{ background: '#dc3545', color: '#fff', padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>
                                    No presentó: {stats.redPercent}%
                                  </span>
                                </span>
                              );
                            })()}
                          </h6>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <a
                              href={`/ExportPDF?year=${encodeURIComponent(year)}`}
                              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 10px rgba(220,53,69,0.45)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(220,53,69,0.35)'; }}
                              style={{
                                background: 'linear-gradient(135deg, #dc3545 0%, #b02a37 100%)',
                                color: '#fff',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: 8,
                                fontWeight: 600,
                                fontSize: 13,
                                cursor: 'pointer',
                                boxShadow: '0 2px 6px rgba(220,53,69,0.35)',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                textDecoration: 'none'
                              }}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                                <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
                              </svg>
                              Exportar PDF
                            </a>
                            <a
                              href={`/ExportExcel?year=${encodeURIComponent(year)}`}
                              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 10px rgba(20,83,45,0.45)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(20,83,45,0.35)'; }}
                              style={{
                                background: 'linear-gradient(135deg, #14532d 0%, #0f3d21 100%)',
                                color: '#fff',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: 8,
                                fontWeight: 600,
                                fontSize: 13,
                                cursor: 'pointer',
                                boxShadow: '0 2px 6px rgba(20,83,45,0.35)',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                textDecoration: 'none'
                              }}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                                <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
                              </svg>
                              Exportar Excel
                            </a>
                          </div>
                        </div>
                        {displayMonths.length === 0 ? (
                          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#6c757d' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" viewBox="0 0 16 16" style={{ opacity: 0.3, marginBottom: 12 }}>
                              <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/>
                            </svg>
                            <p style={{ margin: 0, fontSize: 14 }}>No hay meses agregados aún.</p>
                          </div>
                        ) : (
                          <div className="row g-3">
                            {displayMonths.map((mes) => (
                              <div className="col-6 col-md-3" key={mes}>
                                <div className="month-chip" style={{
                                    background: '#fff',
                                    border: '2px solid #e9ecef',
                                    borderRadius: 10,
                                    padding: '12px 10px',
                                    textAlign: 'center',
                                    fontWeight: 600,
                                    fontSize: 14,
                                    color: '#681b32',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    opacity: 1
                                  }}
                                  onMouseEnter={(e)=>{ e.currentTarget.style.background = 'linear-gradient(135deg, #681b32 0%, #200b07 100%)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 10px rgba(104,27,50,0.25)'; }}
                                  onMouseLeave={(e)=>{ e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#681b32'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'; }}
                                  title={`Editar: ${mes} ${year}`}
                                  onClick={() => { openMonthModal(year, mes, false); }}
                                  >
                                  {mes}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          );
        })}
      </section>
      )}

      {viewMode === 'entes' && (
        <section id="entes" style={{ marginTop: 16, marginBottom: 32 }}>
          <hr className="linea mb-4" />
          <h2 style={{ fontWeight: 700, color: '#681b32', marginBottom: 24 }}>Entes</h2>
          <div className="card mb-3" style={{ border: 'none', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <div className="card-body" style={{ padding: '24px' }}>
              <h6 style={{ marginBottom: 16, color: '#681b32', fontWeight: 600, fontSize: '16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                </svg>
                Filtros de búsqueda
              </h6>
              <div className="row g-3 align-items-end">
                <div className="col-md-6">
                  <label htmlFor="entes-search" className="form-label" style={{ fontWeight: 500, color: '#495057' }}>Ente</label>
                  <input
                    id="entes-search"
                    type="text"
                    className="form-control"
                    placeholder="Buscar ente"
                    value={entesSearch}
                    onChange={(e)=>setEntesSearch(e.target.value)}
                    style={{ borderRadius: '8px', padding: '10px 14px' }}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label" style={{ fontWeight: 500, color: '#495057' }}>Clasificación</label>
                  <select
                    className="form-select"
                    value={entesClasifFilter}
                    onChange={e=>setEntesClasifFilter(e.target.value)}
                    style={{ borderRadius: '8px', padding: '10px 14px' }}
                  >
                    <option value="Todos">Todas las clasificaciones</option>
                    {clasificaciones.map(c => (<option key={c.id} value={c.name || c.title}>{c.name || c.title}</option>))}
                  </select>
                </div>
              </div>
            </div>
          </div>
          <div className="card card-body" style={{ border: 'none', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            {(() => {
              const term = (entesSearch || '').trim().toLowerCase();
              const list = entes
                .slice()
                .filter(e => {
                  const matchName = !term || (e.title || '').toLowerCase().includes(term);
                  const matchClasif = entesClasifFilter === 'Todos' || (e.classification || '') === entesClasifFilter;
                  return matchName && matchClasif;
                })
                .sort((a,b)=>{
                  const c = (a.classification||'').localeCompare(b.classification||'');
                  if (c!==0) return c;
                  return (a.title||'').localeCompare(b.title||'');
                });
              if (!list.length) {
                return (<div style={{ padding: 20, textAlign: 'center', color: '#6c757d' }}>No hay entes disponibles.</div>);
              }
              return (
                <div className="list-group">
                  {list.map(e => (
                    <div key={e.id} className="list-group-item list-group-item-action d-flex align-items-center">
                      <div style={{ width: 96, height: 96, flex: '0 0 96px' }} className="me-3 d-flex align-items-center justify-content-center">
                        <img src={ASEBCS} alt={e.title} style={{ maxWidth: '88px', maxHeight: '88px' }} />
                      </div>
                      <div className="flex-grow-1">
                        <h5 className="mb-1" style={{ margin: 0 }}>{e.title}</h5>
                        <p className="mb-1" style={{ marginTop: 4 }}>
                          <small className="text-white px-2 py-1 rounded" style={{ background: 'linear-gradient(to right, #681b32, #200b07)' }}>
                            {e.classification || 'Sin clasificación'}
                          </small>
                        </p>
                      </div>
                      <div className="text-end" style={{ minWidth: 180 }}>
                        <button className="btn btn-sm btn-magenta" onClick={() => openEnteModal(e)}>Ver detalle</button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </section>
      )}

      {showMonthModal && (
        <div className="modal-backdrop" style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(4px)', zIndex:2500, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div className="modal-content" style={{ width:'95%', maxWidth:1100, maxHeight:'90vh', background:'#fff', borderRadius:12, overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 10px 40px rgba(0,0,0,0.25)' }}>
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #681b32 0%, #200b07 100%)', color: '#fff', padding: 20, paddingLeft: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:20, marginBottom:2 }}>{monthModalMonth}</div>
                  <div style={{ opacity:0.9, fontSize:13 }}>Año {monthModalYear}</div>
                </div>


              {/* Search and Filter Inputs */}
              <div style={{ display:'flex', gap:8 }}>
                <input
                    type="text"
                    placeholder="Buscar por nombre"
                    value={monthModalSearchName}
                    onChange={e=>setMonthModalSearchName(e.target.value)}
                    style={{
                      borderRadius: 6,
                      border: '1px solid #dee2e6',
                      background: '#440D1E',
                      color: '#fff',
                      padding: '9px 14px',
                      outline: 'none',
                      fontSize: 14,
                      minWidth: 220
                    }}
                  />
                  <select
                    value={monthModalClasif}
                    onChange={e=>setMonthModalClasif(e.target.value)}
                    style={{
                      borderRadius: 6,
                      border: '1px solid #dee2e6',
                      background: '#440D1E',
                      color: '#fff',
                      padding: '9px 14px',
                      outline: 'none',
                      fontSize: 14,
                      minWidth: 200,
                      cursor: 'pointer'
                    }}
                  >
                    <option value="Todos">Todas las clasificaciones</option>
                    {clasificaciones.map(c => (
                      <option key={c.id} value={c.name || c.title}>{c.name || c.title}</option>
                    ))}
                  </select>
              </div>
            </div>
            </div>
            {/* Body */}
            <div style={{ padding:20, background:'linear-gradient(to bottom, #ffffff 0%, #f8f9fa 100%)', overflowY:'auto', display:'flex', gap:20 }}>
              {/* Donut Chart */}
              <div style={{ width:300, flexShrink:0, position:'sticky', top:20, alignSelf:'flex-start' }}>
                <div style={{ background:'#fff', borderRadius:12, padding:20, boxShadow:'0 2px 8px rgba(0,0,0,0.08)', display:'flex', flexDirection:'column' }}>
                  {(() => {
                    const s = calculateMonthStatsFiltered(monthModalYear, monthModalMonth, monthModalSearchName, monthModalClasif);
                    const total = parseInt(s.total);
                    const verde = parseFloat(s.cumplio);
                    const amarillo = parseFloat(s.parcial);
                    const rojo = parseFloat(s.no);

                    // Calculate SVG donut segments
                    const size = 200;
                    const strokeWidth = 38;
                    const radius = (size - strokeWidth) / 2;
                    const circumference = 2 * Math.PI * radius;

                    const verdeOffset = 0;
                    const verdeDash = (verde / 100) * circumference;
                    const amarilloOffset = verdeDash;
                    const amarilloDash = (amarillo / 100) * circumference;
                    const rojoOffset = verdeDash + amarilloDash;
                    const rojoDash = (rojo / 100) * circumference;

                    return (
                      <>
                        <div style={{ display:'flex', justifyContent:'center', alignItems:'center', paddingTop:10, paddingBottom:10 }}>
                          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                            <g transform={`rotate(-90 ${size/2} ${size/2})`}>
                              {/* Background circle */}
                              <circle
                                cx={size/2}
                                cy={size/2}
                                r={radius}
                                fill="none"
                                stroke="#f1f3f5"
                                strokeWidth={strokeWidth}
                              />
                              {/* Verde segment */}
                              {verde > 0 && (
                                <circle
                                  cx={size/2}
                                  cy={size/2}
                                  r={radius}
                                  fill="none"
                                  stroke="#28a745"
                                  strokeWidth={strokeWidth}
                                  strokeDasharray={`${verdeDash} ${circumference}`}
                                  strokeDashoffset={-verdeOffset}
                                  strokeLinecap="butt"
                                />
                              )}
                              {/* Amarillo segment */}
                              {amarillo > 0 && (
                                <circle
                                  cx={size/2}
                                  cy={size/2}
                                  r={radius}
                                  fill="none"
                                  stroke="#ffc107"
                                  strokeWidth={strokeWidth}
                                  strokeDasharray={`${amarilloDash} ${circumference}`}
                                  strokeDashoffset={-amarilloOffset}
                                  strokeLinecap="butt"
                                />
                              )}
                              {/* Rojo segment */}
                              {rojo > 0 && (
                                <circle
                                  cx={size/2}
                                  cy={size/2}
                                  r={radius}
                                  fill="none"
                                  stroke="#dc3545"
                                  strokeWidth={strokeWidth}
                                  strokeDasharray={`${rojoDash} ${circumference}`}
                                  strokeDashoffset={-rojoOffset}
                                  strokeLinecap="butt"
                                />
                              )}
                            </g>
                          </svg>
                        </div>
                        {/* Legend at bottom left */}
                        <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:16 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <div style={{ width:16, height:16, borderRadius:4, background:'#28a745' }} />
                            <span style={{ fontSize:12, fontWeight:600, color:'#495057' }}>Cumplió: {verde.toFixed(1)}%</span>
                          </div>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <div style={{ width:16, height:16, borderRadius:4, background:'#ffc107' }} />
                            <span style={{ fontSize:12, fontWeight:600, color:'#495057' }}>No cumplió: {amarillo.toFixed(1)}%</span>
                          </div>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <div style={{ width:16, height:16, borderRadius:4, background:'#dc3545' }} />
                            <span style={{ fontSize:12, fontWeight:600, color:'#495057' }}>No presentó: {rojo.toFixed(1)}%</span>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Table */}
              <div style={{ flex:1, minWidth:0 }}>
                <table className="table table-sm" style={{ borderCollapse:'collapse', background:'#fff', borderRadius:8, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,0.05)' }}>
                  <thead>
                    <tr style={{ background:'linear-gradient(135deg, #681b32 0%, #200b07 100%)', color:'#fff' }}>
                      <th style={{ padding:'14px 16px', borderBottom:'none', fontWeight:600, width:'65%' }}>Ente</th>
                      <th style={{ padding:'14px 16px', borderBottom:'none', textAlign:'center', fontWeight:600, width:'35%' }}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const currentActivesSet = entesActivosByYear[String(monthModalYear)] || new Set();
                      const statusByEnte = new Map();
                      compliances.forEach(c => {
                        if (String(c.year) === String(monthModalYear) && String(c.month) === String(monthModalMonth)) {
                          statusByEnte.set(Number(c.ente_id), (c.status || '').toLowerCase());
                        }
                      });

                      let filtered = (entes || [])
                        .filter(e => currentActivesSet.has(Number(e.id)))
                        .sort((a,b) => {
                          const ca = (a.classification || '').localeCompare(b.classification || '');
                          if (ca !== 0) return ca;
                          return (a.title || '').localeCompare(b.title || '');
                        });

                      // Apply filters
                      if (monthModalSearchName.trim()) {
                        const search = monthModalSearchName.toLowerCase();
                        filtered = filtered.filter(e => (e.title || '').toLowerCase().includes(search));
                      }
                      if (monthModalClasif && monthModalClasif !== 'Todos') {
                        filtered = filtered.filter(e => (e.classification || '') === monthModalClasif);
                      }

                      if (!filtered.length) {
                        return (
                          <tr><td colSpan={2} style={{ padding:30, textAlign:'center', color:'#6c757d' }}>No hay entes para mostrar</td></tr>
                        );
                      }

                      return filtered.map((e) => {
                        const enteId = Number(e.id);
                        const status = statusByEnte.get(enteId) || '';
                        const bgColor = status === 'cumplio' ? '#28a745' : status === 'parcial' ? '#ffc107' : status === 'no' ? '#dc3545' : '#e9ecef';
                        const textColor = status === 'cumplio' || status === 'no' ? '#fff' : status === 'parcial' ? '#000' : '#495057';
                        const label = status === 'cumplio' ? 'Cumplió' : status === 'parcial' ? 'No cumplió' : status === 'no' ? 'No presentó' : 'Sin registro';

                        return (
                          <tr key={enteId} style={{ transition:'background 0.2s ease' }} onMouseEnter={(ev) => ev.currentTarget.style.background = '#f8f9fa'} onMouseLeave={(ev) => ev.currentTarget.style.background = '#fff'}>
                            <td style={{ padding:'14px 16px', borderBottom:'1px solid #e9ecef' }}>
                              <div>
                                <div style={{ fontWeight:600 }}>{e.title}</div>
                                <div style={{ fontSize:12, color:'#6c757d', marginTop:2 }}>{e.classification || 'Sin clasificación'}</div>
                              </div>
                            </td>
                            <td style={{ padding:'14px 16px', borderBottom:'1px solid #e9ecef', textAlign:'center' }}>
                              <span style={{ background:bgColor, color:textColor, padding:'6px 14px', borderRadius:16, fontWeight:700, fontSize:13 }}>{label}</span>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding:16, background:'#f8f9fa', borderTop:'1px solid #e9ecef', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ display:'flex', gap:10 }}>
                <a
                  href={`/ExportPDFMes?year=${encodeURIComponent(monthModalYear)}&month=${encodeURIComponent(monthModalMonth)}&q=${encodeURIComponent(monthModalSearchName)}&clasif=${encodeURIComponent(monthModalClasif || '')}&enteIds=${encodeURIComponent(filteredMonthEnteIds.join('-'))}`}
                  style={{
                    background:'linear-gradient(135deg, #dc3545 0%, #b02a37 100%)',
                    color:'#fff',
                    border:'none',
                    padding:'10px 20px',
                    fontWeight:600,
                    borderRadius:8,
                    fontSize:14,
                    cursor:'pointer',
                    boxShadow:'0 2px 6px rgba(220,53,69,0.35)',
                    transition:'all 0.2s ease',
                    display:'flex',
                    alignItems:'center',
                    gap:8,
                    textDecoration:'none'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 10px rgba(220,53,69,0.45)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(220,53,69,0.35)'; }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                    <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
                  </svg>
                  Exportar PDF
                </a>
                <a
                  href={`/ExportExcelMes?year=${encodeURIComponent(monthModalYear)}&month=${encodeURIComponent(monthModalMonth)}&q=${encodeURIComponent(monthModalSearchName)}&clasif=${encodeURIComponent(monthModalClasif || '')}&enteIds=${encodeURIComponent(filteredMonthEnteIds.join('-'))}`}
                  style={{
                    background:'linear-gradient(135deg, #14532d 0%, #0f3d21 100%)',
                    color:'#fff',
                    border:'none',
                    padding:'10px 20px',
                    fontWeight:600,
                    borderRadius:8,
                    fontSize:14,
                    cursor:'pointer',
                    boxShadow:'0 2px 6px rgba(20,83,45,0.35)',
                    transition:'all 0.2s ease',
                    display:'flex',
                    alignItems:'center',
                    gap:8,
                    textDecoration:'none'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 10px rgba(20,83,45,0.45)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(20,83,45,0.35)'; }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                    <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
                  </svg>
                  Exportar Excel
                </a>
              </div>
              <button
                className="btn"
                onClick={closeMonthModal}
                style={{
                  background:'linear-gradient(135deg, #681b32 0%, #200b07 100%)',
                  color:'#fff',
                  border:'none',
                  padding:'10px 24px',
                  fontWeight:600,
                  borderRadius:8,
                  boxShadow:'0 2px 6px rgba(104, 27, 50, 0.3)',
                  transition:'all 0.2s ease',
                  cursor:'pointer'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 10px rgba(104, 27, 50, 0.4)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(104, 27, 50, 0.3)'; }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedEnte && (
        <div onClick={(e) => { if (e.target === e.currentTarget) closeEnteModal(); }} role="dialog" aria-modal="true" style={{ position: 'fixed', left: 0, top: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2600 }}>
          <div style={{ width: '95%', maxWidth: 1100, maxHeight: '90vh', background: '#fff', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 40px rgba(0,0,0,0.25)' }} onClick={(e)=>e.stopPropagation()}>
            <div style={{ background: 'linear-gradient(135deg, #681b32 0%, #200b07 100%)', color: '#fff', padding: 20, paddingLeft: 24, flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <h5 style={{ margin: 0, fontWeight: 700, fontSize: 20 }}>{selectedEnte.title}</h5>
                  <div style={{ opacity: 0.9, fontSize: 13, marginTop: 2 }}>{selectedEnte.classification || 'Sin clasificación'}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-sm"
                    onClick={() => setActiveSection('indicadores')}
                    style={{
                      background: activeSection === 'indicadores' ? '#fff' : 'transparent',
                      color: activeSection === 'indicadores' ? '#681b32' : '#fff',
                      border: activeSection === 'indicadores' ? 'none' : '1px solid rgba(255,255,255,0.5)',
                      fontWeight: 600
                    }}
                  >
                    Indicadores
                  </button>
                  <button
                    className="btn btn-sm"
                    onClick={() => setActiveSection('graficas')}
                    style={{
                      background: activeSection === 'graficas' ? '#fff' : 'transparent',
                      color: activeSection === 'graficas' ? '#681b32' : '#fff',
                      border: activeSection === 'graficas' ? 'none' : '1px solid rgba(255,255,255,0.5)',
                      fontWeight: 600
                    }}
                  >
                    Gráficas
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', marginLeft: 8 }}>
                  <small style={{ opacity: 0.9 }}>IC = (Número de meses que cumplió / Número de meses transcurridos) * 100</small>
                </div>
              </div>
            </div>

            <div style={{ padding: 20, background: 'linear-gradient(to bottom, #ffffff 0%, #f8f9fa 100%)', overflowY: 'auto', flex: 1 }}>
            {activeSection === 'indicadores' && (
              <div className="card card-body mb-3">
                <h6>Indicadores de Cumplimiento</h6>
                {/* Selectores de años */}
                <div style={{ background: '#fff', padding: 12, borderRadius: 8, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                  {(() => {
                    const yearsArr = (Array.from(new Set((selectedEnte.compliances || []).map(c => c.year))).sort((a, b) => b - a));
                    const selectedCount = yearsArr.filter(y => enabledYears[y] ?? false).length;
                    return (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                        {yearsArr.map(y => {
                          const checked = enabledYears[y] ?? false;
                          const disabled = !checked && selectedCount >= 3;
                          return (
                            <label key={y} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: disabled ? 'not-allowed' : 'pointer', padding: '6px 10px', borderRadius: 6, background: checked ? 'linear-gradient(135deg, #681b32 0%, #200b07 100%)' : '#f8f9fa', border: '1px solid #e9ecef', opacity: disabled ? 0.5 : 1, color: checked ? '#fff' : '#495057' }}>
                              <input type="checkbox" checked={checked} disabled={disabled} onChange={() => toggleYear(y)} />
                              <span style={{ fontWeight: checked ? 700 : 500 }}>{y}</span>
                            </label>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th style={{ minWidth: 120 }}>Año</th>
                        {(Array.from(new Set((selectedEnte.compliances || []).map(c => c.year))).sort((a, b) => b - a))
                          .filter(y => enabledYears[y] ?? true)
                          .map(y => <th key={y} className="text-center">{y}</th>)
                        }
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ background: '#f8f9fa', fontWeight: 700 }}>
                        <td>IC</td>
                        {(Array.from(new Set((selectedEnte.compliances || []).map(c => c.year))).sort((a, b) => b - a))
                          .filter(y => enabledYears[y] ?? true)
                          .map(y => {
                            const ic = computeICForEnteYear(selectedEnte, y);
                            return (
                              <td key={y} className="text-center">{ic !== null ? `${ic}%` : '-'}</td>
                            );
                          })}
                      </tr>

                      {['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'].map((mName) => {
                        const yearsToShow = (Array.from(new Set((selectedEnte.compliances || []).map(c => c.year))).sort((a, b) => b - a)).filter(y => enabledYears[y] ?? true);
                        if (yearsToShow.length === 0) return null;
                        return (
                          <tr key={mName}>
                            <td><strong>{mName}</strong></td>
                            {yearsToShow.map(y => {
                              const status = getStatusForMonthYear(selectedEnte, mName, y);
                              const color = statusColor(status);
                              return (
                                <td key={String(y)} className="text-center" style={{ verticalAlign: 'middle', minWidth: 80 }}>
                                  {status ? (
                                    <div title={`${status}`} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 14, background: color, color: '#fff', fontSize: 12, fontWeight: 700 }}>
                                      {status[0].toUpperCase()}
                                    </div>
                                  ) : (
                                    <div title="Sin dato" style={{ display: 'inline-block', width: 16, height: 16, borderRadius: 8, background: '#e9ecef' }} />
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeSection === 'graficas' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <div style={{ background: '#fff', padding: 16, borderRadius: 8, marginBottom: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                  {(() => {
                    const yearsArr = (Array.from(new Set((selectedEnte.compliances || []).map(c => c.year))).sort((a, b) => b - a));
                    const selectedCount = yearsArr.filter(y => enabledYears[y] ?? false).length;
                    return (
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          {yearsArr.map(y => {
                            const checked = enabledYears[y] ?? false;
                            const disabled = !checked && selectedCount >= 3;
                            return (
                              <label key={y} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: disabled ? 'not-allowed' : 'pointer', padding: '6px 10px', borderRadius: 6, background: checked ? 'linear-gradient(135deg, #681b32 0%, #200b07 100%)' : '#f8f9fa', border: '1px solid #e9ecef', opacity: disabled ? 0.5 : 1, color: checked ? '#fff' : '#495057' }}>
                                <input type="checkbox" checked={checked} disabled={disabled} onChange={() => toggleYear(y)} />
                                <span style={{ fontWeight: checked ? 700 : 500 }}>{y}</span>
                              </label>
                            );
                          })}
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          {yearsArr.filter(y => enabledYears[y] ?? false).map(y => {
                            const ic = computeICForEnteYear(selectedEnte, y);
                            return (
                              <div key={y} style={{ background: 'linear-gradient(135deg, #681b32 0%, #200b07 100%)', color: '#fff', padding: '6px 12px', borderRadius: 8, fontWeight: 700, fontSize: 13 }}>
                                IC {y} = {ic !== null ? `${ic}%` : '-'}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
                <div style={{ width: '100%', height: 320, background: '#fff', border: '1px solid #e9ecef', borderRadius: 12 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={buildBarDataForEnte(selectedEnte)}
                      margin={{ top: 10, right: 30, left: -30, bottom: 40 }}
                      barCategoryGap="20%"
                      barGap={1}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={<CustomXAxisTick />}>
                        <Label content={<CustomYearsLabel enabledYears={enabledYears} />} position="bottom" />
                      </XAxis>
                      <YAxis
                        domain={[0, 2]}
                        allowDecimals={false}
                        axisLine={false}
                        tick={false}
                      />
                      <Tooltip content={<CustomBarTooltip />} />
                      {(Array.from(new Set((selectedEnte.compliances || []).map(c => c.year))).sort()).map((y) => {
                        const enabled = enabledYears[y] ?? true;
                        if (!enabled) return null;
                        const keyBase = String(y);
                        const colors = { cumplio: '#28a745', parcial: '#ffc107', no: '#dc3545' };
                        return (
                          <React.Fragment key={keyBase}>
                            <Bar
                              dataKey={`${keyBase}_no`}
                              stackId={keyBase}
                              fill={colors.no}
                              stroke="#991b1b"
                              strokeWidth={1.8}
                              fillOpacity={0.98}
                              radius={[6, 6, 0, 0]}
                            />
                            <Bar
                              dataKey={`${keyBase}_parcial`}
                              stackId={keyBase}
                              fill={colors.parcial}
                              stroke="#B59B05"
                              strokeWidth={1.8}
                              fillOpacity={0.98}
                              radius={[6, 6, 0, 0]}
                            />
                            <Bar
                              dataKey={`${keyBase}_cumplio`}
                              stackId={keyBase}
                              fill={colors.cumplio}
                              stroke="#277A3A"
                              strokeWidth={1.8}
                              fillOpacity={0.98}
                              radius={[6, 6, 0, 0]}
                            />
                          </React.Fragment>
                        );
                      })}
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div style={{ width: '100%', maxHeight: 340, overflowY: 'auto', marginTop: 6 }}>
                  <h6 style={{ marginTop: 6, position: 'sticky', background: '#fff', zIndex: 6, padding: '16px 0' }}>Cumplimientos por año</h6>
                  {(() => {
                    const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
                    const yearsSelected = Object.keys(enabledYears).filter(y => enabledYears[y]).map(y => parseInt(y, 10)).sort((a, b) => b - a);
                    if (yearsSelected.length === 0) return <div className="text-muted">No hay años seleccionados.</div>;
                    const groups = yearsSelected.map(y => {
                      const items = (selectedEnte.compliances || []).filter(c => c.year === y);
                      const ordered = months.map(mn => items.find(it => it.month === mn)).filter(Boolean);
                      return { year: y, items: ordered };
                    });

                    const getBadgeVariant = (status) => {
                      const s = (status || '').toString().toLowerCase();
                      if (!s) return 'bg-secondary';
                      if (s === 'cumplio') return 'bg-success';
                      if (s === 'parcial' || s === 'partial') return 'bg-warning text-dark';
                      if (s === 'no' || s === 'nocumple' || s === 'n') return 'bg-danger';
                      return 'bg-secondary';
                    };

                    return (
                      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(1, yearsSelected.length)}, 1fr)`, gap: 12 }}>
                        {groups.map(g => (
                          <div key={g.year} className="p-2 rounded" style={{marginTop: 6, background: '#fff', border: '1px solid #e9ecef' }}>
                            <div style={{background: '#fff', borderBottom: '1px solid #eef', marginTop: 12, position: 'sticky', top: 0, zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                              <strong>{g.year}</strong>
                              <small className="text-muted">{g.items.length} meses</small>
                            </div>
                            {g.items.length === 0 ? (
                              <div className="text-muted">No hay registros para este año.</div>
                            ) : (
                              <ul className="list-group list-group-flush">
                                {g.items.map((c, idx) => (
                                  <li key={idx} className="list-group-item d-flex justify-content-between align-items-center">
                                    <div><strong>{c.month}</strong></div>
                                    <span className={`badge ${getBadgeVariant(c.status)}`}>{tipoLabels[c.status]}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
            </div>

            <div style={{ padding: 16, background: '#f8f9fa', borderTop: '1px solid #e9ecef', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexShrink: 0 }}>
              {selectedEnte && (
                <div style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
                  {(() => {
                    const yearsSelected = Object.keys(enabledYears).filter(y => enabledYears[y]).map(y => parseInt(y, 10)).sort((a, b) => b - a);
                    const yearsParam = yearsSelected.join('-');
                    const canExport = yearsSelected.length > 0;
                    return (
                      <>
                        <a
                          href={canExport ? `/ExportPDFEnte?years=${encodeURIComponent(yearsParam)}&enteIds=${encodeURIComponent(String(selectedEnte.id))}` : '#'}
                          style={{
                            background:'linear-gradient(135deg, #dc3545 0%, #b02a37 100%)',
                            color:'#fff',
                            border:'none',
                            padding:'8px 14px',
                            fontWeight:600,
                            borderRadius:8,
                            fontSize:13,
                            cursor:'pointer',
                            boxShadow:'0 2px 6px rgba(220,53,69,0.35)',
                            transition:'all 0.2s ease',
                            display:'flex',
                            alignItems:'center',
                            gap:6,
                            textDecoration:'none',
                            pointerEvents: canExport ? 'auto' : 'none',
                            opacity: canExport ? 1 : 0.6
                          }}
                          title={canExport ? 'Exportar PDF' : 'Seleccione al menos un año'}
                          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 10px rgba(220,53,69,0.45)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(220,53,69,0.35)'; }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                            <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
                          </svg>
                          Exportar PDF
                        </a>
                        <a
                          href={canExport ? `/ExportExcelEnte?years=${encodeURIComponent(yearsParam)}&enteIds=${encodeURIComponent(String(selectedEnte.id))}` : '#'}
                          style={{
                            background:'linear-gradient(135deg, #14532d 0%, #0f3d21 100%)',
                            color:'#fff',
                            border:'none',
                            padding:'8px 14px',
                            fontWeight:600,
                            borderRadius:8,
                            fontSize:13,
                            cursor:'pointer',
                            boxShadow:'0 2px 6px rgba(20,83,45,0.35)',
                            transition:'all 0.2s ease',
                            display:'flex',
                            alignItems:'center',
                            gap:6,
                            textDecoration:'none',
                            pointerEvents: canExport ? 'auto' : 'none',
                            opacity: canExport ? 1 : 0.6
                          }}
                          title={canExport ? 'Exportar Excel' : 'Seleccione al menos un año'}
                          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 10px rgba(20,83,45,0.45)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(20,83,45,0.35)'; }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                            <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
                          </svg>
                          Exportar Excel
                        </a>
                      </>
                    );
                  })()}
                </div>
              )}
              <button
                className="btn"
                onClick={closeEnteModal}
                style={{
                  background: 'linear-gradient(135deg, #681b32 0%, #200b07 100%)',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 24px',
                  fontWeight: 600,
                  borderRadius: 8,
                  boxShadow: '0 2px 6px rgba(104, 27, 50, 0.3)',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 10px rgba(104, 27, 50, 0.4)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(104, 27, 50, 0.3)'; }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
