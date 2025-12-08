import React, { useMemo, useState, useEffect, useRef } from 'react';
import styles from "./css/CumplimientosMesAnio.module.css";

import ASEBCS from "../assets/asebcs.jpg";
// Añadido: Recharts para pies y AreaChart
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';

export default function CumplimientosPorEnte() {
  const containerRef = useRef(null);

  const years = [2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035];
  const months = [
    "Todos",
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre"
  ];

  // Mock data (mantener)
  const initialEntes = [
    { id:1, title: 'Municipio de La Paz', img: ASEBCS, classification: 'Municipios y Organismos Operadores municipales', compliances: [{year:2025, month:'Enero', status:'cumplio'},{year:2025, month:'Febrero', status:'parcial'},{year:2024, month:'Marzo', status:'no'}] },
    { id:2, title: 'Municipio de Los Cabos', img: ASEBCS, classification: 'Municipios y Organismos Operadores municipales', compliances: [{year:2025, month:'Enero', status:'parcial'},{year:2025, month:'Marzo', status:'cumplio'}] },
    { id:3, title: 'Congreso del Estado', img: ASEBCS, classification: 'Órganos Estatales', compliances: [{year:2024, month:'Marzo', status:'no'},{year:2023, month:'Febrero', status:'no'}] },
    { id:4, title: 'Institución Ejemplo', img: ASEBCS, classification: 'Organismos Desconocidos', compliances: [{year:2025, month:'Abril', status:'cumplio'}] },
  ];

  const [entesList, setEntesList] = useState([]); // ahora cargamos desde API; usamos initialEntes como fallback si falla
  const [enteQuery, setEnteQuery] = useState('');
  const [order, setOrder] = useState('title_asc');
  const [results, setResults] = useState(initialEntes);

  // vistas y filtros
  const [viewMode, setViewMode] = useState('lista'); // 'lista' | 'graficas' | 'indicadores'
  const [year, setYear] = useState(String(years[0])); // string for selects

  // rango meses para lista/graficas
  const [fromMonth, setFromMonth] = useState('Todos');
  const [toMonth, setToMonth] = useState('Todos');

  // rango para indicadores generales (separado)
  const [generalFromMonth, setGeneralFromMonth] = useState('Todos');
  const [generalToMonth, setGeneralToMonth] = useState('Todos');
  const [generalYear, setGeneralYear] = useState(String(years[0]));

  // modales / interacciones
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [hoveredMonth, setHoveredMonth] = useState(null);

  const [selectedEnte, setSelectedEnte] = useState(null);
  const [activeSection, setActiveSection] = useState('graficas'); // 'indicadores'|'graficas'
  const [enabledYears, setEnabledYears] = useState({});

  // helpers meses rango
  const monthIndex = (m) => {
    if (!m || m === 'Todos') return null;
    return months.indexOf(m);
  };
  const getMonthsInRange = (fromM, toM) => {
    if (!fromM || !toM || fromM === 'Todos' || toM === 'Todos') return null;
    const fi = monthIndex(fromM), ti = monthIndex(toM);
    if (fi === -1 || ti === -1 || ti < fi) return null;
    return months.slice(fi, ti + 1);
  };
  const monthsRange = getMonthsInRange(fromMonth, toMonth);
  const generalMonthsRange = getMonthsInRange(generalFromMonth, generalToMonth);

  // badge helper
  const getBadgeVariant = (status) => {
    const s = (status || '').toString().toLowerCase();
    if (!s) return 'bg-secondary';
    if (s === 'cumplio') return 'bg-success';
    if (s === 'parcial' || s === 'partial') return 'bg-warning text-dark';
    if (s === 'no' || s === 'nocumple' || s === 'n') return 'bg-danger';
    return 'bg-secondary';
  };

  // status color
  const statusColor = (status) => {
    const s = (status || '').toString().toLowerCase();
    if (s === 'cumplio') return '#28a745';
    if (s === 'parcial' || s === 'partial') return '#ffc107';
    if (s === 'no' || s === 'nocumple' || s === 'n') return '#dc3545';
    return '#6c757d';
  };

  // construir meses con datos para año seleccionado (para gráficas)
  const monthsWithData = useMemo(() => {
    const y = parseInt(year, 10);
    const setM = new Set();
    entesList.forEach(ente => {
      (ente.compliances || []).forEach(c => {
        if (c.year === y && c.month) setM.add(c.month);
      });
    });
    return months.filter(m => m !== 'Todos' && setM.has(m));
  }, [year, entesList]);

  // meses mostrados aplicando rango
  const monthsToDisplay = monthsRange ? monthsWithData.filter(m => monthsRange.includes(m)) : monthsWithData;

  // months for indicadores
  const generalMonthsWithData = useMemo(() => {
    const y = parseInt(generalYear, 10);
    const setM = new Set();
    (results || []).forEach(ente => {
      (ente.compliances || []).forEach(c => {
        if (c.year === y && c.month) setM.add(c.month);
      });
    });
    return months.filter(m => m !== 'Todos' && setM.has(m));
  }, [generalYear, results, months]);
  const generalMonthsToDisplay = generalMonthsRange ? generalMonthsWithData.filter(m => generalMonthsRange.includes(m)) : generalMonthsWithData;

  // búsqueda / filtrado por rango
  const handleSearch = (ev) => {
    ev && ev.preventDefault();
    const q = (enteQuery || '').trim().toLowerCase();
    const yearNum = parseInt(year, 10);
    const range = monthsRange; // null => any month of year
    let filtered = entesList.filter(e => {
      if (q && !e.title.toLowerCase().includes(q)) return false;
      if (!range) return e.compliances.some(c => c.year === yearNum);
      return e.compliances.some(c => c.year === yearNum && range.includes(c.month));
    });

    filtered.sort((a,b) => {
      if (order.startsWith('title')) {
        return order.endsWith('asc') ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title);
      }
      const maxYear = items => (items.compliances && items.compliances.length) ? Math.max(...items.compliances.map(c=>c.year)) : -Infinity;
      const ay = maxYear(a), by = maxYear(b);
      if (ay === by) return a.title.localeCompare(b.title);
      return order.endsWith('asc') ? ay - by : by - ay;
    });

    setResults(filtered);
  };

  useEffect(() => { handleSearch(); /* eslint-disable-next-line */ }, [enteQuery, order, year, fromMonth, toMonth, entesList]);

  // chart data for a month
  const getChartDataForMonth = (monthName) => {
    const y = parseInt(year, 10);
    const counts = { cumplio:0, parcial:0, no:0 };
    entesList.forEach(ente => {
      (ente.compliances||[]).forEach(c => {
        if (c.year === y && c.month === monthName) {
          const s = (c.status||'').toString().toLowerCase();
          if (s === 'cumplio') counts.cumplio++;
          else if (s === 'parcial' || s === 'partial') counts.parcial++;
          else counts.no++;
        }
      });
    });
    const data = [];
    if (counts.cumplio) data.push({ name:'Cumplió', value: counts.cumplio, color:'#28a745' });
    if (counts.parcial) data.push({ name:'Parcial', value: counts.parcial, color:'#ffc107' });
    if (counts.no) data.push({ name:'No', value: counts.no, color:'#dc3545' });
    return data;
  };

  const getEntitiesForMonth = (monthName) => {
    if (!monthName) return [];
    const y = parseInt(year, 10);
    const arr = [];
    entesList.forEach(ente => {
      (ente.compliances||[]).forEach(c => {
        if (c.year === y && c.month === monthName) {
          arr.push({ title: ente.title, classification: ente.classification, status: c.status || 'Desconocido' });
        }
      });
    });
    return arr;
  };

  // Entity modal helpers
  const openEnteModal = (ente) => {
    setSelectedEnte(ente);
    setActiveSection('graficas');
    const yearsAvailable = Array.from(new Set((ente.compliances||[]).map(c=>c.year))).sort((a,b)=>b-a);
    const obj = {};
    yearsAvailable.forEach(y => obj[y] = true);
    setEnabledYears(obj);
  };
  const closeEnteModal = () => { setSelectedEnte(null); setEnabledYears({}); setActiveSection('graficas'); };

  const buildAreaDataForEnte = (ente) => {
    if (!ente) return [];
    const monthsSet = new Set((ente.compliances||[]).map(c=>c.month));
    const monthsOrder = months.filter(m => m !== 'Todos' && monthsSet.has(m));
    const yearsArr = Array.from(new Set((ente.compliances||[]).map(c=>c.year))).sort();
    const statusMap = (s) => {
      const v = (s||'').toString().toLowerCase();
      if (v==='cumplio') return 2;
      if (v==='parcial' || v==='partial') return 1;
      return 0;
    };
    return monthsOrder.map(m => {
      const row = { month: m };
      yearsArr.forEach(y => {
        const c = (ente.compliances||[]).find(x => x.year === y && x.month === m);
        row[String(y)] = c ? statusMap(c.status) : 0;
      });
      return row;
    });
  };

  const toggleYear = (y) => {
    const keys = Object.keys(enabledYears);
    const newState = { ...enabledYears, [y]: !enabledYears[y] };
    if (!newState[y]) {
      const remaining = keys.filter(k => newState[k]).length;
      if (remaining === 0) return;
    }
    setEnabledYears(newState);
  };

  const getFilteredCompliancesForEnte = (ente) => {
    if (!ente) return [];
    const yearsFilter = Object.keys(enabledYears).filter(y=>enabledYears[y]).map(y=>parseInt(y,10));
    return (ente.compliances||[]).filter(c => yearsFilter.includes(c.year));
  };

  const getStatusForMonthYear = (ente, monthName, yearNum) => {
    if (!ente || !ente.compliances) return null;
    const c = ente.compliances.find(x => x.year === yearNum && x.month === monthName);
    return c ? c.status : null;
  };

  // Cargar entes desde API (fallback a initialEntes si falla)
  useEffect(() => {
    let mounted = true;
    const apiUrl = `${window.location.protocol}//${window.location.hostname}/siret/api/entes.php`;
    fetch(apiUrl)
      .then(res => {
        if (!res.ok) throw new Error('no-api');
        return res.json();
      })
      .then(json => {
        if (!mounted) return;
        if (Array.isArray(json) && json.length > 0) setEntesList(json);
        else setEntesList(initialEntes);
      })
      .catch(() => {
        if (mounted) setEntesList(initialEntes);
      });
    return () => { mounted = false; };
  }, []);

  // UI
  return (
    <div ref={containerRef} className="container py-4">
      {/* Navbar */}
            <nav className="navbar navbar-expand-lg navbar-dark bg-dark fixed-top">
              <div className="container-fluid">
                <a className="navbar-brand d-flex align-items-center" href="#">
                  <img src={ASEBCS} alt="Logo SIRET" width="80" height="40" className="me-2" />
                  ASEBCS
                </a>
                <button
                  className="navbar-toggler"
                  type="button"
                  data-bs-toggle="collapse"
                  data-bs-target="#navbarNav"
                  aria-controls="navbarNav"
                  aria-expanded="false"
                  aria-label="Toggle navigaltion"
                >
                  <span className="navbar-toggler-icon" />
                </button>
                <div className="collapse navbar-collapse" id="navbarNav">
                  <ul className="navbar-nav ms-auto">
                    <li className="nav-item">
                      <a className="nav-link" href="/inicio">Inicio</a>
                    </li>
                    <li className="nav-item dropdown">
                      <a
                        className="nav-link dropdown-toggle active"
                        href="#"
                        id="cumplimientosDropdown"
                        role="button"
                        data-bs-toggle="dropdown"
                        aria-expanded="false"
                      >
                        Cumplimientos
                      </a>
                      <ul className="dropdown-menu dropdown-menu-end" aria-labelledby="cumplimientosDropdown">
                        <li><a className="dropdown-item" href="/cumplimientos/mes-anio">Por mes y año</a></li>
                        <li><a className="dropdown-item" href="/cumplimientos/por-ente">Por ente</a></li>
                        <li><a className="dropdown-item" href="/cumplimientos/por-clasificacion">Por clasificación de entes</a></li>
                        <li><a className="dropdown-item" href="/comparativa">Comparativa</a></li>
                      </ul>
                    </li>
                  </ul>
                </div>
              </div>
            </nav>

      <div className="mb-4 p-3 rounded bg-maroon text-white"><h2 className="mb-0">Buscar Cumplimientos por Ente</h2></div>

      {/* view buttons */}
      <div style={{ width:'100%', marginBottom:12 }}>
        <div style={{ display:'flex', gap:8 }}>
          <button className={`btn ${viewMode==='lista' ? 'btn-magenta' : 'btn-outline-secondary'}`} style={{flex:1}} onClick={() => setViewMode('lista')}>Lista</button>
          <button className={`btn ${viewMode==='indicadores' ? 'btn-magenta' : 'btn-outline-secondary'}`} style={{flex:1}} onClick={() => setViewMode('indicadores')}>Índice</button>
        </div>
      </div>

      {/* LISTA */}
      {viewMode === 'lista' && (
        <>
          <form className={`row g-3 ${styles.busqueda}`} onSubmit={(e)=>e.preventDefault()}>
            <div className="col-md-3">
              <label className="form-label">Buscar</label>
              <input className="form-control" placeholder="Buscar ente" value={enteQuery} onChange={e=>setEnteQuery(e.target.value)} />
            </div>
            <div>
              <div className="btn-group btn-group-sm" role="group">
                <button className={`btn btn-sm ${order==='title_asc' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={()=>setOrder('title_asc')}>A → Z</button>
                <button className={`btn btn-sm ${order==='title_desc' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={()=>setOrder('title_desc')}>Z → A</button>
              </div>
            </div>
          </form>

          <div style={{height:12}} />

          {results.length === 0 ? (<p>No se encontraron entidades.</p>) : (
            <div className="list-group">
              {results.map(r=>(
                <div key={r.id} className="list-group-item d-flex align-items-center">
                  <div style={{width:96,height:96,flex:'0 0 96px'}} className="me-3 d-flex align-items-center justify-content-center"><img src={r.img} alt={r.title} style={{maxWidth:88,maxHeight:88}}/></div>
                  <div className="flex-grow-1">
                    <h5 className="mb-1">{r.title}</h5>
                    <p className="mb-1"><small className="text-white px-2 py-1 rounded" style={{background:'linear-gradient(to right,#681b32,#200b07)'}}>{r.classification}</small></p>
                    <div>
                      {r.compliances.filter(c => {
                        if (c.year !== parseInt(year,10)) return false;
                        if (!monthsRange) return true;
                        return monthsRange.includes(c.month);
                      }).map((c,i)=>(<span key={i} className={`badge ${getBadgeVariant(c.status)} me-2`} title={c.status}>{c.month} {c.year}</span>))}
                    </div>
                  </div>
                  <div className="text-end" style={{minWidth:120}}>
                    <button className="btn btn-sm btn-magenta" onClick={()=>openEnteModal(r)}>Ver detalle</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}


      {/* INDICADORES */}
      {viewMode === 'indicadores' && (
        <div className="card card-body my-4">
          <div style={{display:'flex',gap:12,alignItems:'center',flexWrap:'wrap',justifyContent:'space-between'}}>
            <div style={{display:'flex',gap:12,alignItems:'center'}}>
              <div className="col-md-6">
                <label className="form-label">Buscar</label>
                <input
                  className="form-control"
                  placeholder="Buscar ente"
                  value={enteQuery}
                  onChange={e=>setEnteQuery(e.target.value)}
                  style={{ width: '400px' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div className="btn-group btn-group-sm" role="group">
                <button className={`btn btn-sm ${order==='title_asc' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={()=>setOrder('title_asc')}>A → Z</button>
                <button className={`btn btn-sm ${order==='title_desc' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={()=>setOrder('title_desc')}>Z → A</button>
              </div>
              <button className="btn btn-sm btn-outline-primary">Exportar (pendiente)</button>
            </div>
          </div>

          <div style={{overflowX:'auto',marginTop:12}}>
            <table className="table table-sm">
              <thead>
                <tr>
                  <th style={{minWidth:220}}>Ente</th>
                  {generalMonthsToDisplay.map(m=> (<th key={m} className="text-center">{m}</th>))}
                </tr>
              </thead>
              <tbody>
                {(results||[]).map(ente=>{
                  const monthsToShow = generalMonthsToDisplay.filter(Boolean);
                  if (monthsToShow.length===0) return null;
                  return (
                    <tr key={ente.id}>
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:12}}>
                          <img src={ASEBCS} alt={ente.title} style={{width:48,height:48,objectFit:'cover',borderRadius:6}}/>
                          <div><div style={{fontWeight:700}}>{ente.title}</div><div><small className="text-muted">{ente.classification}</small></div></div>
                        </div>
                      </td>
                      {monthsToShow.map(mName=>{
                        const status = getStatusForMonthYear(ente,mName,parseInt(generalYear,10));
                        const color = statusColor(status);
                        return (
                          <td key={mName} className="text-center" style={{verticalAlign:'middle',minWidth:100}}>
                            {status ? <div title={status} style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:28,height:28,borderRadius:14,background:color,color:'#fff',fontSize:12,fontWeight:700}}>{status[0].toUpperCase()}</div> : <div title="Sin dato" style={{display:'inline-block',width:16,height:16,borderRadius:8,background:'#e9ecef'}}/>}
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

      {/* Modal mes */}
      {selectedMonth && (
        <div style={{position:'fixed',left:0,top:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1050}}>
          <div style={{width:'95%',maxWidth:1000,maxHeight:'90vh',overflow:'auto',background:'#fff',borderRadius:8,padding:20}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
              <h5 style={{margin:0}}>{selectedMonth} {year} — Detalle</h5>
              <button className="btn btn-sm btn-secondary" onClick={()=>setSelectedMonth(null)}>Cerrar</button>
            </div>

            <div style={{display:'flex',gap:16,flexWrap:'wrap'}}>
              <div style={{flex:'0 0 340px',height:340,background:'#fafafa',padding:8,borderRadius:6}}>
                <ResponsiveContainer width="100%" height="100%"><PieChart>
                  <Pie data={getChartDataForMonth(selectedMonth)} dataKey="value" nameKey="name" innerRadius={70} outerRadius={110} paddingAngle={2} label={({percent})=>`${(percent*100).toFixed(0)}%`}>
                    {getChartDataForMonth(selectedMonth).map((entry,idx)=>(<Cell key={idx} fill={entry.color}/>))}
                  </Pie>
                  <Tooltip formatter={(v)=>[v,'Entes']}/>
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart></ResponsiveContainer>
              </div>

              <div style={{flex:1,minWidth:260}}>
                <h6>Entes ({getEntitiesForMonth(selectedMonth).length})</h6>
                <ul className="list-group">
                  {getEntitiesForMonth(selectedMonth).map((e,i)=>(
                    <li key={i} className="list-group-item d-flex justify-content-between align-items-start">
                      <div><div><strong>{e.title}</strong></div><div><small className="text-muted">{e.classification}</small></div></div>
                      <span className={`badge ${getBadgeVariant(e.status)}`}>{e.status}</span>
                    </li>
                  ))}
                  {getEntitiesForMonth(selectedMonth).length===0 && <li className="list-group-item">No hay entes para este mes.</li>}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal por ENTE */}
      {selectedEnte && (
        <div style={{position:'fixed',left:0,top:0,right:0,bottom:0,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:2000}}>
          <div style={{width:'95%',maxWidth:1100,maxHeight:'92vh',overflow:'auto',background:'#fff',borderRadius:8,padding:18}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
              <h5 style={{margin:0}}>{selectedEnte.title} — Detalle</h5>
              <div>
                <button className="btn btn-sm btn-outline-primary me-2" onClick={()=>{}}>Exportar</button>
                <button className="btn btn-sm btn-secondary" onClick={closeEnteModal}>Cerrar</button>
              </div>
            </div>

            <div className="mb-3">
              <div style={{display:'flex',gap:8}}>
                <button className={`btn ${activeSection==='indicadores' ? 'btn-magenta' : 'btn-outline-secondary'}`} onClick={()=>setActiveSection('indicadores')}>Indicadores</button>
                <button className={`btn ${activeSection==='graficas' ? 'btn-magenta' : 'btn-outline-secondary'}`} onClick={()=>setActiveSection('graficas')}>Gráficas</button>
              </div>
            </div>

            {/* Indicadores: tabla meses x años con círculos de estado */}
            {activeSection === 'indicadores' && (
              <div className="card card-body mb-3">
                <h6>Indicadores de Cumplimiento</h6>

                    {/* toggles de años (reutiliza enabledYears) */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                  {(Array.from(new Set((selectedEnte.compliances || []).map(c => c.year))).sort((a, b) => b - a)).map(y => (
                    <label key={y} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '4px 8px', borderRadius: 6, background: enabledYears[y] ? '#f8f9fa' : 'transparent' }}>
                      <input type="checkbox" checked={enabledYears[y] ?? true} onChange={() => toggleYear(y)} />
                      <span>{y}</span>
                    </label>
                  ))}
                </div>

                    {/* Tabla: meses en filas, años en columnas (solo años habilitados) */}
                <div style={{ overflowX: 'auto' }}>
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th style={{ minWidth: 120 }}>Mes</th>
                        {(Array.from(new Set((selectedEnte.compliances || []).map(c => c.year))).sort((a, b) => b - a))
                          .filter(y => enabledYears[y] ?? true)
                          .map(y => <th key={y} className="text-center">{y}</th>)
                        }
                      </tr>
                    </thead>
                    <tbody>
                      {months.filter(m => m !== 'Todos').map((mName) => {
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

            {activeSection==='graficas' && (
              <div style={{display:'flex',gap:16,alignItems:'flex-start',flexWrap:'wrap'}}>
                <div style={{flex:'0 0 640px',minWidth:300}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:8}}>
                    {(Array.from(new Set((selectedEnte.compliances||[]).map(c=>c.year))).sort((a,b)=>b-a)).map(y=>(
                      <label key={y} style={{display:'inline-flex',alignItems:'center',gap:6,cursor:'pointer',padding:'4px 8px',borderRadius:6,background: enabledYears[y] ? '#f8f9fa' : 'transparent' }}>
                        <input type="checkbox" checked={enabledYears[y] ?? true} onChange={()=>toggleYear(y)} />
                        <span>{y}</span>
                      </label>
                    ))}
                  </div>

                  <div style={{height:320,background:'#fff',border:'1px solid #e9ecef',padding:8,borderRadius:6}}>
                    <ResponsiveContainer width="100%" height="100%"><AreaChart data={buildAreaDataForEnte(selectedEnte)} margin={{top:10,right:30,left:0,bottom:0}}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis domain={[0,2]} ticks={[0,1,2]} tickFormatter={v => v===2 ? 'Cumplio' : v===1 ? 'Parcial' : 'No'} />
                      <Tooltip formatter={v => v===2 ? 'Cumplió' : v===1 ? 'Parcial':'No'} />
                      <Legend />
                      {(Array.from(new Set((selectedEnte.compliances||[]).map(c=>c.year))).sort()).map((y,idx)=>{
                        const key = String(y); const enabled = enabledYears[y] ?? true;
                        const colors = ['#6ecf9a','#9bd0f5','#f6c16e','#d39ad3','#f6a8a8'];
                        return enabled ? <Area key={key} type="monotone" dataKey={key} name={key} stroke={colors[idx%colors.length]} fill={colors[idx%colors.length]} fillOpacity={0.4} /> : null;
                      })}
                    </AreaChart></ResponsiveContainer>
                  </div>
                </div>

                <div style={{flex:1,minWidth:260}}>
                  <h6>Cumplimientos</h6>
                  <ul className="list-group">
                    {getFilteredCompliancesForEnte(selectedEnte).length===0 && <li className="list-group-item">No hay cumplimientos para los años seleccionados.</li>}
                    {getFilteredCompliancesForEnte(selectedEnte).map((c,i)=>(
                      <li key={i} className="list-group-item d-flex justify-content-between align-items-center">
                        <div><div><strong>{c.month} {c.year}</strong></div><div><small className="text-muted">{selectedEnte.classification}</small></div></div>
                        <span className={`badge ${getBadgeVariant(c.status)}`}>{c.status}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
