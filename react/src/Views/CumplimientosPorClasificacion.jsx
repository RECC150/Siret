import React, { useMemo, useState, useEffect, useRef } from 'react';
import styles from "./css/CumplimientosMesAnio.module.css";

import ASEBCS from "../assets/asebcs.jpg";
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

export default function CumplimientosPorClasificacion() {
  const containerRef = useRef(null);

  const years = [2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035];
  const months = ["Todos","Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  const classifications = ["General", "Poder Legislativo, Ejecutivo, Judicial, Autónomos y Paraestatales", "Municipios y Organismos Operadores municipales", "Descentralizados y Desconcentrados", "Descentralizados y Desconcentrados (Educación)", "Descentralizados Municipales", "Fideicomisos"];

  // Datos de fallback (tu conjunto actual)
  const initialEntes = [
    { id:1, title: 'Municipio de La Paz', img: ASEBCS, classification: 'Municipios y Organismos Operadores municipales', compliances: [{year:2025, month:'Enero', status:'cumplio', classification: 'Municipios y Organismos Operadores municipales'},{year:2025, month:'Febrero', status:'parcial', classification: 'Municipios y Organismos Operadores municipales'},{year:2024, month:'Marzo', status:'no', classification: 'Municipios y Organismos Operadores municipales'}] },
    { id:2, title: 'Municipio de Los Cabos', img: ASEBCS, classification: 'Municipios y Organismos Operadores municipales', compliances: [{year:2025, month:'Enero', status:'parcial', classification: 'Municipios y Organismos Operadores municipales'},{year:2025, month:'Marzo', status:'cumplio', classification: 'Municipios y Organismos Operadores municipales'}] },
    { id:3, title: 'Congreso del Estado', img: ASEBCS, classification: 'Órganos Estatales', compliances: [{year:2024, month:'Marzo', status:'no', classification: 'Órganos Estatales'},{year:2023, month:'Febrero', status:'no', classification: 'Órganos Estatales'}] },
    { id:4, title: 'Institución Ejemplo', img: ASEBCS, classification: 'Organismos Desconocidos', compliances: [{year:2025, month:'Abril', status:'cumplio', classification: 'Organismos Desconocidos'}] },
  ];

  // estados principales
  const [entesList, setEntesList] = useState([]); // cargado desde API, fallback initialEntes
  const [results, setResults] = useState(initialEntes);
  const [enteQuery, setEnteQuery] = useState('');
  const [classification, setClassification] = useState('General');
  const [year, setYear] = useState('2025');
  const [month, setMonth] = useState('Todos');
  const [order, setOrder] = useState('title_asc');

  // vistas y modales
  const [viewMode, setViewMode] = useState('lista'); // 'lista' | 'graficas' | 'indicadores'
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [hoveredMonth, setHoveredMonth] = useState(null);
  const [selectedEnte, setSelectedEnte] = useState(null);
  const [activeSection, setActiveSection] = useState('graficas'); // 'indicadores'|'graficas'
  const [enabledYears, setEnabledYears] = useState({});
  const [closingModalIndex, setClosingModalIndex] = useState(null);

  const closeModalWithAnimation = (modalId, callback) => {
    setClosingModalIndex(modalId);
    setTimeout(() => {
      setClosingModalIndex(null);
      callback();
    }, 300);
  };

  // Estados para la sección "Indicadores" (evita ReferenceError)
  const [generalYear, setGeneralYear] = useState(year);
  const [generalMonthSelection, setGeneralMonthSelection] = useState('Todos');

  // Meses con datos para el año seleccionado en indicadores
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

  // Meses que se mostrarán en la tabla de indicadores (aplica selección)
  const generalMonthsToDisplay = (generalMonthSelection === 'Todos')
    ? generalMonthsWithData
    : (generalMonthSelection ? [generalMonthSelection] : []);

  // helpers
  const getBadgeVariant = (status) => {
    const s = (status || '').toString().toLowerCase();
    if (!s) return 'bg-secondary';
    if (s === 'cumplio') return 'bg-success';
    if (s === 'parcial' || s === 'partial') return 'bg-warning text-dark';
    if (s === 'no' || s === 'nocumple' || s === 'n') return 'bg-danger';
    return 'bg-secondary';
  };
  const statusColor = (status) => {
    const s = (status || '').toString().toLowerCase();
    if (s === 'cumplio') return '#28a745';
    if (s === 'parcial' || s === 'partial') return '#ffc107';
    if (s === 'no' || s === 'nocumple' || s === 'n') return '#dc3545';
    return '#6c757d';
  };

  // cargar entes desde API (fallback)
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

  // filtrado funcional (clasificación, nombre, año, mes)
  const handleSearch = (ev) => {
    ev && ev.preventDefault();
    const q = (enteQuery || '').trim().toLowerCase();
    const yNum = parseInt(year,10);
    const filtered = (entesList || []).filter(e => {
      if (q && !e.title.toLowerCase().includes(q)) return false;
      // comprobar si tiene al menos un compliance que cumpla filtros
      return (e.compliances || []).some(c => {
        if (c.year !== yNum) return false;
        if (month !== 'Todos' && c.month !== month) return false;
        if (classification !== 'General' && (c.classification || e.classification) !== classification) return false;
        return true;
      });
    }).sort((a,b) => {
      if (order === 'title_asc') return a.title.localeCompare(b.title);
      if (order === 'title_desc') return b.title.localeCompare(a.title);
      if (order === 'year_asc') {
        const ay = Math.min(...a.compliances.map(c=>c.year));
        const by = Math.min(...b.compliances.map(c=>c.year));
        return ay - by;
      }
      if (order === 'year_desc') {
        const ay = Math.max(...a.compliances.map(c=>c.year));
        const by = Math.max(...b.compliances.map(c=>c.year));
        return by - ay;
      }
      return 0;
    });
    setResults(filtered);
  };

  // recalc cuando cambian filtros o datos
  useEffect(() => {
    handleSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enteQuery, classification, year, month, order, entesList]);

  // meses con datos para el año seleccionado (para gráficos)
  const monthsWithData = useMemo(() => {
    const y = parseInt(year,10);
    const setM = new Set();
    (entesList || []).forEach(ente => {
      (ente.compliances || []).forEach(c => { if (c.year === y && c.month) setM.add(c.month); });
    });
    return months.filter(m => m !== 'Todos' && setM.has(m));
  }, [year, entesList, months]);

  const getChartDataForMonth = (monthName) => {
    const y = parseInt(year,10);
    const counts = { cumplio:0, parcial:0, no:0 };
    (entesList || []).forEach(ente => {
      (ente.compliances || []).forEach(c => {
        if (c.year === y && c.month === monthName) {
          const s = (c.status || '').toString().toLowerCase();
          if (s === 'cumplio') counts.cumplio++;
          else if (s === 'parcial' || s === 'partial') counts.parcial++;
          else counts.no++;
        }
      });
    });
    const data = [];
    if (counts.cumplio) data.push({ name:'Cumplió', value:counts.cumplio, color:'#28a745' });
    if (counts.parcial) data.push({ name:'Parcial', value:counts.parcial, color:'#ffc107' });
    if (counts.no) data.push({ name:'No', value:counts.no, color:'#dc3545' });
    return data;
  };

  const getEntitiesForMonth = (monthName) => {
    if (!monthName) return [];
    const y = parseInt(year,10);
    const arr = [];
    (entesList || []).forEach(ente => {
      (ente.compliances || []).forEach(c => {
        if (c.year === y && c.month === monthName) arr.push({ title:ente.title, classification: c.classification || ente.classification, status: c.status || 'Desconocido' });
      });
    });
    return arr;
  };

  // modal por ente
  const openEnteModal = (ente) => {
    setSelectedEnte(ente);
    setActiveSection('graficas');
    const yearsAvailable = Array.from(new Set((ente.compliances||[]).map(c=>c.year))).sort((a,b)=>b-a);
    const obj = {}; yearsAvailable.forEach(y=>obj[y]=true);
    setEnabledYears(obj);
  };
  const closeEnteModal = () => {
    closeModalWithAnimation('ente', () => {
      setSelectedEnte(null);
      setEnabledYears({});
      setActiveSection('graficas');
    });
  };
  const closeMonthModal = () => {
    closeModalWithAnimation('month', () => {
      setSelectedMonth(null);
    });
  };

  const buildAreaDataForEnte = (ente) => {
    if (!ente) return [];
    const monthsSet = new Set((ente.compliances||[]).map(c=>c.month));
    const monthsOrder = months.filter(m => m !== 'Todos' && monthsSet.has(m));
    const yearsArr = Array.from(new Set((ente.compliances||[]).map(c=>c.year))).sort();
    const statusMap = s => { const v=(s||'').toString().toLowerCase(); if (v==='cumplio') return 2; if (v==='parcial' || v==='partial') return 1; return 0; };
    return monthsOrder.map(mn => {
      const row = { month: mn };
      yearsArr.forEach(y => {
        const c = (ente.compliances||[]).find(x=>x.year===y && x.month===mn);
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

  const getStatusForMonthYear = (ente, mName, yNum) => {
    if (!ente) return null;
    const c = (ente.compliances||[]).find(x => x.year === yNum && x.month === mName);
    return c ? c.status : null;
  };

  // UI
  return (
    <div ref={containerRef} className="container-fluid px-0" style={{ paddingTop: '50px', background: '#f8f9fa', minHeight: '100vh' }}>
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

      <div className="mb-4 p-3 rounded bg-maroon text-white"><h2 className="mb-0">Buscar Cumplimientos por Clasificación de Entes</h2></div>

      {/* Vistas */}
      <div style={{width:'100%',marginBottom:12}}>
        <div style={{display:'flex',gap:8}}>
          <button className={`btn ${viewMode==='lista'?'btn-magenta':'btn-outline-secondary'}`} style={{flex:1}} onClick={()=>setViewMode('lista')}>Lista</button>
          <button className={`btn ${viewMode==='graficas'?'btn-magenta':'btn-outline-secondary'}`} style={{flex:1}} onClick={()=>setViewMode('graficas')}>Gráfica</button>
          <button className={`btn ${viewMode==='indicadores'?'btn-magenta':'btn-outline-secondary'}`} style={{flex:1}} onClick={()=>setViewMode('indicadores')}>Índice</button>
        </div>
      </div>

      <hr className="my-4" />

      {/* LISTA */}
      {viewMode === 'lista' && (
        <>
        <form id="busqueda" className={`row g-3 ${styles.busqueda}`} onSubmit={(e)=>e.preventDefault()}>
        <div className="col-md-3">
          <label htmlFor="clasifEnte" className="form-label" style={{ fontWeight: 500, color: '#495057' }}>Clasificación de Ente</label>
          <select id="clasifEnte" className="form-select" value={classification} onChange={e=>setClassification(e.target.value)} style={{ borderRadius: '8px', padding: '10px 14px' }}>
            {classifications.map(c=>(<option key={c} value={c}>{c}</option>))}
          </select>
        </div>

        <div className="col-md-3">
          <label htmlFor="ente" className="form-label" style={{ fontWeight: 500, color: '#495057' }}>Ente</label>
          <input id="ente" list="entes-list" className="form-control" value={enteQuery} onChange={e=>setEnteQuery(e.target.value)} placeholder="Buscar ente" style={{ borderRadius: '8px', padding: '10px 14px' }} />
          <datalist id="entes-list">{(entesList||initialEntes).map((e,i)=>(<option key={i} value={e.title}/>))}</datalist>
        </div>

        <div className="col-md-2">
          <label htmlFor="anio" className="form-label" style={{ fontWeight: 500, color: '#495057' }}>Año</label>
          <select id="anio" className="form-select" value={year} onChange={e=>setYear(e.target.value)} style={{ borderRadius: '8px', padding: '10px 14px' }}>{years.map(y=>(<option key={y} value={y}>{y}</option>))}</select>
        </div>

        <div className="col-md-2">
          <label htmlFor="mes" className="form-label" style={{ fontWeight: 500, color: '#495057' }}>Mes</label>
          <select id="mes" className="form-select" value={month} onChange={e=>setMonth(e.target.value)} style={{ borderRadius: '8px', padding: '10px 14px' }}>{months.map(m=>(<option key={m} value={m}>{m}</option>))}</select>
        </div>
      </form>
          {(results || []).length === 0 ? <p>No se encontraron entidades que cumplan ese criterio.</p> : (
            <div className="list-group">
              {results.map(r => (
                <div key={r.id} className="list-group-item list-group-item-action d-flex align-items-center">
                  <div style={{width:96,height:96,flex:'0 0 96px'}} className="me-3 d-flex align-items-center justify-content-center"><img src={r.img} alt={r.title} style={{maxWidth:88,maxHeight:88}} /></div>
                  <div className="flex-grow-1">
                    <h5 className="mb-1">{r.title}</h5>
                    <p className="mb-1"><small className="text-white px-2 py-1 rounded" style={{background:'linear-gradient(to right,#681b32,#200b07)'}}>{r.classification}</small></p>
                    <div>
                      {(r.compliances||[]).filter(c=>{
                        const matchesYear = c.year === parseInt(year,10);
                        const matchesMonth = month === 'Todos' || c.month === month;
                        const matchesClass = classification === 'General' || (c.classification || r.classification) === classification;
                        return matchesYear && matchesMonth && matchesClass;
                      }).map((c,i)=>(<span key={i} className={`badge ${getBadgeVariant(c.status)} me-2`}>{c.month} {c.year}</span>))}
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

      {/* GRAFICAS */}
      {viewMode === 'graficas' && (
        <>
        <form id="busqueda" className={`row g-3 ${styles.busqueda}`} onSubmit={(e)=>e.preventDefault()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h4 className="mb-0"></h4>
              <div>
                <button className="btn btn-sm btn-outline-primary" onClick={() => { /* export placeholder */ }}>Exportar gráfica</button>
              </div>
            </div>
        <div className="col-md-3">

          <label htmlFor="clasifEnte" className="form-label" style={{ fontWeight: 500, color: '#495057' }}>Clasificación de Ente</label>
          <select id="clasifEnte" className="form-select" value={classification} onChange={e=>setClassification(e.target.value)} style={{ borderRadius: '8px', padding: '10px 14px' }}>
            {classifications.map(c=>(<option key={c} value={c}>{c}</option>))}
          </select>
        </div>

        <div className="col-md-3">
          <label htmlFor="ente" className="form-label" style={{ fontWeight: 500, color: '#495057' }}>Ente</label>
          <input id="ente" list="entes-list" className="form-control" value={enteQuery} onChange={e=>setEnteQuery(e.target.value)} placeholder="Escribe nombre del ente (opcional)" style={{ borderRadius: '8px', padding: '10px 14px' }} />
          <datalist id="entes-list">{(entesList||initialEntes).map((e,i)=>(<option key={i} value={e.title}/>))}</datalist>
        </div>

        <div className="col-md-2">
          <label htmlFor="anio" className="form-label" style={{ fontWeight: 500, color: '#495057' }}>Año</label>
          <select id="anio" className="form-select" value={year} onChange={e=>setYear(e.target.value)} style={{ borderRadius: '8px', padding: '10px 14px' }}>{years.map(y=>(<option key={y} value={y}>{y}</option>))}</select>
        </div>

        <div className="col-md-2">
          <label htmlFor="mes" className="form-label" style={{ fontWeight: 500, color: '#495057' }}>Mes</label>
          <select id="mes" className="form-select" value={month} onChange={e=>setMonth(e.target.value)} style={{ borderRadius: '8px', padding: '10px 14px' }}>{months.map(m=>(<option key={m} value={m}>{m}</option>))}</select>
        </div>
      </form>
          {monthsWithData.length === 0 ? <p>No hay datos de cumplimientos para el año {year}.</p> : (
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:16}}>
              {monthsWithData.map(mn=>{
                const data = getChartDataForMonth(mn);
                const total = data.reduce((s,d)=>s+d.value,0);
                if (total===0) return null;
                return (
                  <div key={mn} className="p-2 rounded" style={{background:'#fff',border:'1px solid #e9ecef'}}>
                    <h6 className="text-center">{mn} {year}</h6>
                    <div style={{position:'relative',height:180}} onMouseEnter={()=>setHoveredMonth(mn)} onMouseLeave={()=>setHoveredMonth(null)}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={data} dataKey="value" nameKey="name" innerRadius={48} outerRadius={68} paddingAngle={2} label={({percent})=>`${(percent*100).toFixed(0)}%`}>
                            {data.map((entry,idx)=>(<Cell key={idx} fill={entry.color}/>))}
                          </Pie>
                          <Tooltip formatter={(v)=>[v,'Entes']}/>
                        </PieChart>
                      </ResponsiveContainer>
                      <div onClick={()=>setSelectedMonth(mn)} role="button" tabIndex={0} style={{position:'absolute',left:'50%',top:'50%',transform:'translate(-50%,-50%)',opacity: hoveredMonth===mn?1:0,cursor:'pointer',padding:'6px 10px',borderRadius:6,fontWeight:600}}>Ver</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* INDICADORES */}
      {viewMode === 'indicadores' && (
        <div className="card card-body my-4">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}>
            <div style={{display:'flex',gap:12,alignItems:'center'}}>
              <form id="busqueda" className={`row g-3 ${styles.busqueda}`} onSubmit={(e)=>e.preventDefault()}>
        <div className="col-md-3">
          <label htmlFor="clasifEnte" className="form-label" style={{ fontWeight: 500, color: '#495057' }}>Clasificación de Ente</label>
          <select id="clasifEnte" className="form-select" value={classification} onChange={e=>setClassification(e.target.value)} style={{ borderRadius: '8px', padding: '10px 14px' }}>
            {classifications.map(c=>(<option key={c} value={c}>{c}</option>))}
          </select>
        </div>

        <div className="col-md-3">
          <label htmlFor="ente" className="form-label" style={{ fontWeight: 500, color: '#495057' }}>Ente</label>
          <input id="ente" list="entes-list" className="form-control" value={enteQuery} onChange={e=>setEnteQuery(e.target.value)} placeholder="Escribe nombre del ente (opcional)" style={{ borderRadius: '8px', padding: '10px 14px' }} />
          <datalist id="entes-list">{(entesList||initialEntes).map((e,i)=>(<option key={i} value={e.title}/>))}</datalist>
        </div>

        <div className="col-md-2">
          <label htmlFor="anio" className="form-label" style={{ fontWeight: 500, color: '#495057' }}>Año</label>
          <select id="anio" className="form-select" value={year} onChange={e=>setYear(e.target.value)} style={{ borderRadius: '8px', padding: '10px 14px' }}>{years.map(y=>(<option key={y} value={y}>{y}</option>))}</select>
        </div>

        <div className="col-md-2">
          <label htmlFor="mes" className="form-label" style={{ fontWeight: 500, color: '#495057' }}>Mes</label>
          <select id="mes" className="form-select" value={month} onChange={e=>setMonth(e.target.value)} style={{ borderRadius: '8px', padding: '10px 14px' }}>{months.map(m=>(<option key={m} value={m}>{m}</option>))}</select>
        </div>
      </form>
            </div>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <div className="btn-group btn-group-sm me-2" role="group">
                <button className={`btn btn-sm ${order==='title_asc'?'btn-primary':'btn-outline-secondary'}`} onClick={()=>setOrder('title_asc')}>A → Z</button>
                <button className={`btn btn-sm ${order==='title_desc'?'btn-primary':'btn-outline-secondary'}`} onClick={()=>setOrder('title_desc')}>Z → A</button>
              </div>
              <button className="btn btn-sm btn-outline-primary">Exportar (pendiente)</button>
            </div>
          </div>

          <div style={{overflowX:'auto',marginTop:12}}>
            <table className="table table-sm">
              <thead>
                <tr><th style={{minWidth:220}}>Ente</th>{((month==='Todos')?monthsWithData:[month]).filter(Boolean).map(mn=>(<th key={mn} className="text-center">{mn}</th>))}</tr>
              </thead>
              <tbody>
                {(results||[]).map(ente=>{
                  const monthsToShow = ((month==='Todos')?monthsWithData:[month]).filter(Boolean);
                  if (monthsToShow.length===0) return null;
                  return (
                    <tr key={ente.id}>
                      <td style={{verticalAlign:'middle'}}>
                        <div style={{display:'flex',alignItems:'center',gap:12}}>
                          <img src={ASEBCS} alt={ente.title} style={{width:48,height:48,objectFit:'cover',borderRadius:6}}/>
                          <div><div style={{fontWeight:700}}>{ente.title}</div><div><small className="text-muted">{ente.classification}</small></div></div>
                        </div>
                      </td>
                      {monthsToShow.map(mn=>{
                        const status = getStatusForMonthYear(ente,mn,parseInt(generalYear,10));
                        const color = statusColor(status);
                        return <td key={mn} className="text-center" style={{verticalAlign:'middle',minWidth:100}}>{status ? <div title={status} style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:28,height:28,borderRadius:14,background:color,color:'#fff',fontSize:12,fontWeight:700}}>{status[0].toUpperCase()}</div> : <div title="Sin dato" style={{display:'inline-block',width:16,height:16,borderRadius:8,background:'#e9ecef'}}/>}</td>;
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
        <div className={`modal-backdrop${closingModalIndex === 'month' ? ' closing' : ''}`} style={{position:'fixed',left:0,top:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1050}}>
          <div className={`modal-content${closingModalIndex === 'month' ? ' closing' : ''}`} style={{width:'95%',maxWidth:1000,maxHeight:'90vh',overflow:'auto',background:'#fff',borderRadius:8,padding:20}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
              <h5 style={{margin:0}}>{selectedMonth} {year} — Detalle</h5>
              <button className="btn btn-sm btn-secondary" onClick={closeMonthModal}>Cerrar</button>
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
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal por ENTE */}
      {selectedEnte && (
        <div className={`modal-backdrop${closingModalIndex === 'ente' ? ' closing' : ''}`} style={{position:'fixed',left:0,top:0,right:0,bottom:0,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:2000}}>
          <div className={`modal-content${closingModalIndex === 'ente' ? ' closing' : ''}`} style={{width:'95%',maxWidth:1100,maxHeight:'92vh',overflow:'auto',background:'#fff',borderRadius:8,padding:18}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
              <h5 style={{margin:0}}>{selectedEnte.title} — Detalle</h5>
              <div>
                <button className="btn btn-sm btn-outline-primary me-2" onClick={()=>{}}>Exportar</button>
                <button className="btn btn-sm btn-secondary" onClick={closeEnteModal}>Cerrar</button>
              </div>
            </div>

            <div className="mb-3">
              <div style={{display:'flex',gap:8}}>
                <button className={`btn ${activeSection==='indicadores'?'btn-magenta':'btn-outline-secondary'}`} onClick={()=>setActiveSection('indicadores')}>Indicadores</button>
                <button className={`btn ${activeSection==='graficas'?'btn-magenta':'btn-outline-secondary'}`} onClick={()=>setActiveSection('graficas')}>Gráficas</button>
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
                      <YAxis domain={[0,2]} ticks={[0,1,2]} tickFormatter={v=> v===2 ? 'Cumplio' : v===1 ? 'Parcial' : 'No'} />
                      <Tooltip formatter={v => v===2 ? 'Cumplió' : v===1 ? 'Parcial' : 'No'} />
                      <Legend />
                      {(Array.from(new Set((selectedEnte.compliances||[]).map(c=>c.year))).sort()).map((y,idx)=>{
                        const key = String(y); const enabled = enabledYears[y] ?? true; const colors = ['#6ecf9a','#9bd0f5','#f6c16e','#d39ad3','#f6a8a8'];
                        return enabled ? <Area key={key} type="monotone" dataKey={key} name={key} stroke={colors[idx%colors.length]} fill={colors[idx%colors.length]} fillOpacity={0.4} /> : null;
                      })}
                    </AreaChart></ResponsiveContainer>
                  </div>
                </div>
                <div style={{flex:1,minWidth:260}}>
                  <h6>Cumplimientos</h6>
                  <ul className="list-group">
                    {getFilteredCompliancesForEnte(selectedEnte).length===0 && <li className="list-group-item">No hay cumplimientos para los años seleccionados.</li>}
                    {getFilteredCompliancesForEnte(selectedEnte).map((c,i)=>(<li key={i} className="list-group-item d-flex justify-content-between align-items-center"><div><div><strong>{c.month} {c.year}</strong></div><div><small className="text-muted">{selectedEnte.classification}</small></div></div><span className={`badge ${getBadgeVariant(c.status)}`}>{c.status}</span></li>))}
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
