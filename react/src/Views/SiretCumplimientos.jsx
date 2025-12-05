import React, { useEffect, useMemo, useState } from 'react';
import ASEBCS from '../assets/asebcs.jpg';
import Toast from '../Components/Toast';

export default function SiretCumplimientos(){
  const [compliances, setCompliances] = useState([]);
  const [entes, setEntes] = useState([]);
  const [clasificaciones, setClasificaciones] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filterEnte, setFilterEnte] = useState('');
  const [filterClasificacion, setFilterClasificacion] = useState('');
  const [filterYear, setFilterYear] = useState('');

  useEffect(()=>{
    const load = async () => {
      setLoading(true);
      try {
        const base = `${window.location.protocol}//${window.location.hostname}/siret/api`;
        const [cRes, eRes, clRes] = await Promise.all([
          fetch(base + '/compliances.php'),
          fetch(base + '/entes.php'),
          fetch(base + '/clasificaciones.php')
        ]);
        const [cJson, eJson, clJson] = await Promise.all([cRes.json(), eRes.json(), clRes.json()]);
        setCompliances(Array.isArray(cJson) ? cJson : []);
        setEntes(Array.isArray(eJson) ? eJson : []);
        setClasificaciones(Array.isArray(clJson) ? clJson : []);
        // default year = max year found in compliances
        const years = (Array.isArray(cJson) ? cJson.map(r=>Number(r.year)).filter(Boolean) : []);
        const maxYear = years.length ? Math.max(...years) : new Date().getFullYear();
        setFilterYear(String(maxYear));
      } catch(err){
        console.error(err);
      } finally { setLoading(false); }
    };
    load();
  }, []);

  const years = useMemo(()=>{
    const s = new Set();
    compliances.forEach(r => { if (r.year) s.add(String(r.year)); });
    return Array.from(s).sort((a,b)=>Number(b)-Number(a));
  }, [compliances]);

  // Sincronizar displayYears con years
  useEffect(() => {
    setDisplayYears(years);
  }, [years]);

  const [viewMode, setViewMode] = useState('añadir'); // 'añadir' | 'editar' | 'importar'

  const [editEnteQuery, setEditEnteQuery] = useState('');
  const [editSelectedEnteId, setEditSelectedEnteId] = useState(null);
  const [editClasifFilter, setEditClasifFilter] = useState('Todos');
  const [editingEnte, setEditingEnte] = useState(null);
  const [tempCompliances, setTempCompliances] = useState({});
  const [toast, setToast] = useState(null);
  const [displayYears, setDisplayYears] = useState([]);
  const [newlyAddedYear, setNewlyAddedYear] = useState(null);
  const [addedMonthsByYear, setAddedMonthsByYear] = useState({}); // { '2025': ['Enero', 'Febrero', ...] }
  const [deletingYear, setDeletingYear] = useState(null);
  const [completedYears, setCompletedYears] = useState(new Set());
  const [showDeleteYearModal, setShowDeleteYearModal] = useState(false);
  const [yearToDelete, setYearToDelete] = useState(null);

  // Modal "Ver Entes" - gestión de activos
  const [showEntesModal, setShowEntesModal] = useState(false);
  const [entesModalYear, setEntesModalYear] = useState(null);
  const [entesActivosByYear, setEntesActivosByYear] = useState({}); // { '2025': Set([1,2]) }
  const [entesModalSearchName, setEntesModalSearchName] = useState('');
  const [entesModalClasif, setEntesModalClasif] = useState('Todos');
  const [entesModalFilter, setEntesModalFilter] = useState('todos'); // 'todos' | 'activos' | 'desactivados'
  const [loadingEnteId, setLoadingEnteId] = useState(null); // ID del ente que se está procesando

  // Modal "Captura por Mes" - guardar cumplimientos
  const [showMonthModal, setShowMonthModal] = useState(false);
  const [monthModalYear, setMonthModalYear] = useState(null);
  const [monthModalMonth, setMonthModalMonth] = useState('');
  const [monthModalSearchName, setMonthModalSearchName] = useState('');
  const [monthModalClasif, setMonthModalClasif] = useState('Todos');
  const [monthModalTemp, setMonthModalTemp] = useState({}); // { ente_id: status }
  const [monthModalSaving, setMonthModalSaving] = useState(false);
  const [monthModalReadOnly, setMonthModalReadOnly] = useState(false);
  const [showDeleteMonthModal, setShowDeleteMonthModal] = useState(false);
  const [deletingMonth, setDeletingMonth] = useState(false);
  // Vista Editar: mostrar sólo entes activos toggle
  const [showOnlyActiveEdit, setShowOnlyActiveEdit] = useState(false);

  // Base API (reutilizable)
  const apiBase = `${window.location.protocol}//${window.location.hostname}/siret/api`;

  const latestYear = useMemo(()=>{
    if (!displayYears.length) return null;
    return displayYears.reduce((acc, y) => Number(y) > Number(acc) ? y : acc, displayYears[0]);
  }, [displayYears]);

  const handleDeleteYear = async (year) => {
    setDeletingYear(year);
    try {
      // Intento de llamada DELETE (backend debe implementar esta acción)
      await fetch(`${apiBase}/compliances.php?year=${encodeURIComponent(year)}`, { method: 'DELETE' }).catch(()=>{});
      // Remover del estado local
      setCompliances(prev => prev.filter(c => String(c.year) !== String(year)));
      setDisplayYears(prev => prev.filter(y => y !== year));
      setAddedMonthsByYear(prev => { const clone = { ...prev }; delete clone[year]; return clone; });
      setCompletedYears(prev => { const next = new Set([...prev]); next.delete(year); return next; });
      setEntesActivosByYear(prev => { const clone = { ...prev }; delete clone[year]; return clone; });
      setToast({ message: `Año ${year} eliminado`, type: 'success' });
    } catch(err){
      console.error(err);
      setToast({ message: 'Error eliminando año', type: 'error' });
    } finally {
      setDeletingYear(null);
      setShowDeleteYearModal(false);
      setYearToDelete(null);
    }
  };

  const handleDeleteMonth = async () => {
    setDeletingMonth(true);
    try {
      // Eliminar cumplimientos de ese mes
      await fetch(`${apiBase}/compliances.php?year=${encodeURIComponent(monthModalYear)}&month=${encodeURIComponent(monthModalMonth)}`, { method: 'DELETE' }).catch(()=>{});
      // Remover del estado local
      setCompliances(prev => prev.filter(c => !(String(c.year) === String(monthModalYear) && c.month === monthModalMonth)));
      // Remover de meses agregados manualmente si existe
      setAddedMonthsByYear(prev => {
        const clone = { ...prev };
        if (clone[monthModalYear]) {
          clone[monthModalYear] = clone[monthModalYear].filter(m => m !== monthModalMonth);
        }
        return clone;
      });
      setToast({ message: `${monthModalMonth} eliminado`, type: 'success' });
      setShowDeleteMonthModal(false);
      setShowMonthModal(false);
      setMonthModalTemp({});
    } catch(err){
      console.error(err);
      setToast({ message: 'Error eliminando mes', type: 'error' });
    } finally {
      setDeletingMonth(false);
    }
  };

  // Cargar entes activos para el año del modal cuando abre
  useEffect(() => {
    if (!showEntesModal || !entesModalYear) return;
    const load = async () => {
      try {
        const res = await fetch(`${apiBase}/entes_activos.php?year=${encodeURIComponent(entesModalYear)}`);
        const json = await res.json();
        const setIds = new Set((json || []).map(r => Number(r.ente_id)));
        setEntesActivosByYear(prev => ({ ...prev, [String(entesModalYear)]: setIds }));
      } catch (e) { console.error(e); }
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showEntesModal, entesModalYear]);

  // Cargar entes activos para el modal de mes
  useEffect(() => {
    if (!showMonthModal || !monthModalYear) return;
    const load = async () => {
      try {
        const res = await fetch(`${apiBase}/entes_activos.php?year=${encodeURIComponent(monthModalYear)}`);
        const json = await res.json();
        const setIds = new Set((json || []).map(r => Number(r.ente_id)));
        setEntesActivosByYear(prev => ({ ...prev, [String(monthModalYear)]: setIds }));
      } catch (e) { console.error(e); }
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showMonthModal, monthModalYear]);

  const openEntesModal = (year) => {
    setEntesModalYear(String(year));
    setEntesModalSearchName('');
    setEntesModalClasif('Todos');
    setEntesModalFilter('todos');
    setShowEntesModal(true);
  };
  const openMonthModal = (year, month, readOnly = false) => {
    setMonthModalYear(String(year));
    setMonthModalMonth(month);
    setMonthModalSearchName('');
    setMonthModalClasif('Todos');
    setMonthModalTemp({});
    setShowMonthModal(true);
    setMonthModalReadOnly(readOnly);
  };

  const toggleEnteActivo = async (enteId, active) => {
    const y = String(entesModalYear);
    setLoadingEnteId(enteId);
    try {
      if (active) {
        await fetch(`${apiBase}/entes_activos.php`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ year: y, ente_id: enteId })
        });
        setEntesActivosByYear(prev => {
          const clone = { ...prev };
          const setIds = new Set(clone[y] || []);
          setIds.add(Number(enteId));
          clone[y] = setIds;
          return clone;
        });
      } else {
        await fetch(`${apiBase}/entes_activos.php?year=${encodeURIComponent(y)}&ente_id=${encodeURIComponent(enteId)}`, { method: 'DELETE' });
        setEntesActivosByYear(prev => {
          const clone = { ...prev };
          const setIds = new Set(clone[y] || []);
          setIds.delete(Number(enteId));
          clone[y] = setIds;
          return clone;
        });
      }
    } catch (e) {
      console.error(e);
      setToast({ message: 'No se pudo actualizar ente activo', type: 'error' });
    } finally {
      setLoadingEnteId(null);
    }
  };

  const currentActivesSet = entesActivosByYear[String(entesModalYear)] || new Set();

  // Función para contar meses para un año (BD o manual si es el último año y aún sin BD)
  const monthCountFor = (year) => {
    const existingMonths = compliances.filter(c => String(c.year) === String(year)).map(c => c.month);
    if (existingMonths.length) return existingMonths.length;
    return (addedMonthsByYear[year] || []).length;
  };

  // Calcular IC y porcentajes de cumplimiento para un año
  const calculateYearStats = (year) => {
    const monthsOrder = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const isLatest = String(year) === String(latestYear);

    // Obtener meses con datos
    const yearCompliances = compliances.filter(c => String(c.year) === String(year));
    const uniqueMonths = [...new Set(yearCompliances.map(c => c.month))];

    // Para el año más reciente, considerar solo meses transcurridos (hasta el mes actual en el calendario real)
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthIndex = now.getMonth(); // 0-11

    let elapsedMonthsCount = 12;
    if (isLatest && Number(year) === currentYear) {
      elapsedMonthsCount = currentMonthIndex + 1; // Enero = index 0, entonces +1
    } else if (isLatest) {
      // Si es el año más reciente pero no es el año actual del calendario, usar todos los meses agregados
      elapsedMonthsCount = uniqueMonths.length || 1;
    }

    // Contar cumplimientos por ente único en cada mes
    const monthsWithCompliance = new Map(); // mes -> { cumplio: count, parcial: count, no: count }

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

    // Calcular totales de verde, amarillo, rojo
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

    // IC es el porcentaje de cumplimientos verdes
    const ic = greenPercent;

    return {
      ic,
      greenPercent,
      yellowPercent,
      redPercent,
      totalGreen,
      totalYellow,
      totalRed
    };
  };

  // Calcular estadísticas (IC = % verde) para un ente en un año
  const calculateEnteStats = (enteId, year) => {
    const records = compliances.filter(c => String(c.year) === String(year) && String(c.ente_id) === String(enteId));
    let green = 0, yellow = 0, red = 0;
    records.forEach(r => {
      const s = (r.status || '').toLowerCase();
      if (s === 'cumplio') green++; else if (s === 'parcial') yellow++; else if (s === 'no' || s === 'nocumple') red++;
    });
    const total = green + yellow + red;
    const greenPercent = total > 0 ? ((green / total) * 100).toFixed(1) : '0.0';
    const yellowPercent = total > 0 ? ((yellow / total) * 100).toFixed(1) : '0.0';
    const redPercent = total > 0 ? ((red / total) * 100).toFixed(1) : '0.0';
    return { ic: greenPercent, greenPercent, yellowPercent, redPercent };
  };

  // Calcular estadísticas para un mes específico
  const calculateMonthStats = (year, month) => {
    const monthCompliances = compliances.filter(c =>
      String(c.year) === String(year) && String(c.month) === String(month)
    );

    let green = 0, yellow = 0, red = 0;
    monthCompliances.forEach(c => {
      const status = (c.status || '').toLowerCase();
      if (status === 'cumplio') green++;
      else if (status === 'parcial') yellow++;
      else if (status === 'no') red++;
    });

    const total = green + yellow + red;
    const greenPercent = total > 0 ? ((green / total) * 100).toFixed(1) : '0.0';
    const yellowPercent = total > 0 ? ((yellow / total) * 100).toFixed(1) : '0.0';
    const redPercent = total > 0 ? ((red / total) * 100).toFixed(1) : '0.0';

    // IC es el porcentaje de cumplimientos verdes
    const ic = greenPercent;

    return { ic, greenPercent, yellowPercent, redPercent };
  };

  // Marcar años completados (excepto el más reciente) cuando cargan datos
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayYears, compliances]);

  // Bloquear scroll cuando el modal está abierto
  useEffect(() => {
    if (editingEnte || showEntesModal || showDeleteYearModal || showMonthModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [editingEnte, showEntesModal, showDeleteYearModal, showMonthModal]);

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

  // Cargar entes activos para el año seleccionado en vista Editar (si no se han cargado)
  useEffect(() => {
    if (!filterYear) return;
    const key = String(filterYear);
    if (entesActivosByYear[key]) return; // ya cargado
    const load = async () => {
      try {
        const res = await fetch(`${apiBase}/entes_activos.php?year=${encodeURIComponent(filterYear)}`);
        const json = await res.json();
        const setIds = new Set((json || []).map(r => Number(r.ente_id)));
        setEntesActivosByYear(prev => ({ ...prev, [key]: setIds }));
      } catch(e){ console.error(e); }
    };
    load();
  }, [filterYear, apiBase, entesActivosByYear]);

  const displayed = compliances.filter(r => {
    if (filterEnte && String(r.ente_id) !== String(filterEnte)) return false;
    if (filterClasificacion && (r.classification || '') !== filterClasificacion) return false;
    if (filterYear && String(r.year) !== String(filterYear)) return false;
    return true;
  });

  return (
    <div className="container py-4">
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

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

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .modal-backdrop {
          animation: fadeIn 0.2s ease-out;
        }

        .modal-content {
          animation: fadeIn 0.3s ease-out;
        }

        .month-chip {
          animation: slideDown 0.3s ease-out;
        }
      `}</style>
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
              <li className="nav-item"><a className="nav-link active" href="/SiretCumplimientos">Cumplimientos</a></li>
              <li className="nav-item"><a className="nav-link" href="/SiretExportacion">Exportar</a></li>
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
            onClick={() => setViewMode('añadir')}
            style={{
              flex: 1,
              padding: '12px 20px',
              background: viewMode === 'añadir' ? 'linear-gradient(135deg, #681b32 0%, #200b07 100%)' : '#fff',
              color: viewMode === 'añadir' ? '#fff' : '#681b32',
              border: viewMode === 'añadir' ? 'none' : '2px solid #681b32',
              borderRadius: '8px',
              fontWeight: 600,
              transition: 'all 0.3s ease',
              boxShadow: viewMode === 'añadir' ? '0 4px 6px rgba(104, 27, 50, 0.3)' : 'none'
            }}
            aria-pressed={viewMode === 'añadir'}
            title="Añadir nuevo cumplimiento"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style={{ marginRight: 8, verticalAlign: 'middle' }}>
              <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
            </svg>
            Añadir
          </button>

          <button
            type="button"
            className="btn"
            onClick={() => setViewMode('editar')}
            style={{
              flex: 1,
              padding: '12px 20px',
              background: viewMode === 'editar' ? 'linear-gradient(135deg, #681b32 0%, #200b07 100%)' : '#fff',
              color: viewMode === 'editar' ? '#fff' : '#681b32',
              border: viewMode === 'editar' ? 'none' : '2px solid #681b32',
              borderRadius: '8px',
              fontWeight: 600,
              transition: 'all 0.3s ease',
              boxShadow: viewMode === 'editar' ? '0 4px 6px rgba(104, 27, 50, 0.3)' : 'none'
            }}
            aria-pressed={viewMode === 'editar'}
            title="Editar cumplimientos"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style={{ marginRight: 8, verticalAlign: 'middle' }}>
              <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/>
            </svg>
            Editar
          </button>

          <button
            type="button"
            className="btn"
            onClick={() => setViewMode('importar')}
            style={{
              flex: 1,
              padding: '12px 20px',
              background: viewMode === 'importar' ? 'linear-gradient(135deg, #681b32 0%, #200b07 100%)' : '#fff',
              color: viewMode === 'importar' ? '#fff' : '#681b32',
              border: viewMode === 'importar' ? 'none' : '2px solid #681b32',
              borderRadius: '8px',
              fontWeight: 600,
              transition: 'all 0.3s ease',
              boxShadow: viewMode === 'importar' ? '0 4px 6px rgba(104, 27, 50, 0.3)' : 'none'
            }}
            aria-pressed={viewMode === 'importar'}
            title="Importar cumplimientos"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style={{ marginRight: 8, verticalAlign: 'middle' }}>
              <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
              <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
            </svg>
            Importar
          </button>
        </div>
      </div>


      {viewMode === 'añadir' && (
        <section id="cumplimientos" style={{ marginTop: 16, marginBottom: 32 }}>
          <hr className="linea mb-4" />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h2 style={{ fontWeight: 700, color: '#681b32', margin: 0 }}>Añadir Cumplimientos</h2>
            <button
              onClick={() => {
                const currentYear = new Date().getFullYear();
                const maxYear = displayYears.length > 0 ? Math.max(...displayYears.map(y => Number(y))) : currentYear - 1;
                const newYear = String(maxYear + 1);
                if (!displayYears.includes(newYear)) {
                  // Marcar año previo como completado sólo ahora si tiene 12 meses
                  const previousLatest = displayYears.length ? String(maxYear) : null;
                  if (previousLatest) {
                    const prevCount = monthCountFor(previousLatest);
                    if (prevCount === 12) {
                      setCompletedYears(prev => new Set([...prev, previousLatest]));
                    }
                  }
                  setDisplayYears([newYear, ...displayYears]);
                  setNewlyAddedYear(newYear);
                  setTimeout(() => setNewlyAddedYear(null), 1000);
                  setToast({ message: `Año ${newYear} agregado exitosamente`, type: 'success' });
                }
              }}
              style={{
                background: 'linear-gradient(135deg, #681b32 0%, #200b07 100%)',
                color: '#fff',
                border: 'none',
                padding: '12px 24px',
                borderRadius: 10,
                fontWeight: 600,
                fontSize: 15,
                boxShadow: '0 3px 8px rgba(104, 27, 50, 0.3)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 5px 12px rgba(104, 27, 50, 0.4)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 3px 8px rgba(104, 27, 50, 0.3)'; }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
              </svg>
              Añadir Año
            </button>
          </div>

          {/* Años disponibles como secciones colapsables */}
          {displayYears.length === 0 && (
            <div className="card card-body mb-3" style={{ border: 'none', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
              <p style={{ margin: 0, color: '#6c757d' }}>No hay años disponibles.</p>
            </div>
          )}

          {displayYears.map((year) => {
            const collapseId = `yearCollapse_${year}`;
            const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
            const existingMonths = new Set(
              compliances
                .filter(c => String(c.year) === String(year))
                .map(c => c.month)
            );
            const monthCount = existingMonths.size;
            const isComplete = monthCount >= 12;
            const isNewYear = newlyAddedYear === year;
            const isLatest = true;
            return (
              <div
                className="cumplimiento-item mb-3"
                key={year}
                style={{
                  animation: isNewYear ? 'slideInDown 0.5s ease-out' : 'none'
                }}
              >
                <style>{`
                  @keyframes slideInDown {
                    from {
                      opacity: 0;
                      transform: translateY(-30px) scale(0.95);
                    }
                    to {
                      opacity: 1;
                      transform: translateY(0) scale(1);
                    }
                  }
                `}</style>
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
                    boxShadow: isNewYear ? '0 5px 15px rgba(104, 27, 50, 0.5)' : '0 3px 8px rgba(104, 27, 50, 0.3)',
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
                    <span
                      onClick={(e)=>{ e.stopPropagation(); setYearToDelete(year); setShowDeleteYearModal(true); }}
                      title="Eliminar año definitivamente"
                      style={{
                        background: 'linear-gradient(135deg, #dc3545 0%, #b02a37 100%)',
                        color: '#fff',
                        padding: '6px 12px',
                        borderRadius: 8,
                        fontWeight: 600,
                        fontSize: 12,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px rgba(220,53,69,0.3)'
                      }}
                      onMouseEnter={(e)=>{ e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 4px 10px rgba(220,53,69,0.4)'; }}
                      onMouseLeave={(e)=>{ e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 2px 6px rgba(220,53,69,0.3)'; }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                        <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                      </svg>
                      Eliminar
                    </span>
                  </div>
                </button>
                <div className="collapse" id={collapseId}>
                  <div className="card card-body" style={{ border: 'none', borderRadius: '0 0 10px 10px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginTop: 8 }}>
                    {(() => {
                      const monthsOrder = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
                      const stagedMonths = addedMonthsByYear[year] || [];
                      // Unir meses ya guardados en BD con los que están en staging (no guardados todavía)
                      const combinedSet = new Set([...(existingMonths || new Set()), ...stagedMonths]);
                      // Siguiente mes faltante en orden
                      const nextMonthName = monthsOrder.find(m => !combinedSet.has(m)) || null;

                      // Meses que se muestran
                      let displayMonths = Array.from(combinedSet);
                      // Orden cronológico
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
                                      Verde: {stats.greenPercent}%
                                    </span>
                                    <span style={{ background: '#ffc107', color: '#000', padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>
                                      Amarillo: {stats.yellowPercent}%
                                    </span>
                                    <span style={{ background: '#dc3545', color: '#fff', padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>
                                      Rojo: {stats.redPercent}%
                                    </span>
                                  </span>
                                );
                              })()}
                            </h6>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              {!!nextMonthName && (
                                <button
                                  onClick={() => {
                                    setAddedMonthsByYear(prev => ({
                                      ...prev,
                                      [year]: [...(prev[year] || []), nextMonthName]
                                    }));
                                    setToast({ message: `${nextMonthName} agregado`, type: 'success' });
                                  }}
                                  style={{
                                    background: 'linear-gradient(135deg, #681b32 0%, #200b07 100%)',
                                    color: '#fff',
                                    border: 'none',
                                    padding: '8px 16px',
                                    borderRadius: 8,
                                    fontWeight: 600,
                                    fontSize: 13,
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 6px rgba(104, 27, 50, 0.3)',
                                    transition: 'all 0.2s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6
                                  }}
                                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 10px rgba(104, 27, 50, 0.4)'; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(104, 27, 50, 0.3)'; }}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                                  </svg>
                                  {`Añadir ${nextMonthName}`}
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  openEntesModal(year);
                                }}
                                style={{
                                  background: 'linear-gradient(135deg, #0d6efd 0%, #0b5ed7 100%)',
                                  color: '#fff',
                                  border: 'none',
                                  padding: '8px 16px',
                                  borderRadius: 8,
                                  fontWeight: 600,
                                  fontSize: 13,
                                  cursor: 'pointer',
                                  boxShadow: '0 2px 6px rgba(13,110,253,0.3)',
                                  transition: 'all 0.2s ease',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6
                                }}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                                  <path d="M10.442 10.442a1 1 0 0 1-1.415 0L6.5 7.915l-1.528 1.529a1 1 0 1 1-1.415-1.415l2.236-2.236a1 1 0 0 1 1.415 0l2.236 2.236a1 1 0 0 1 0 1.415z"/>
                                  <path d="M12 5.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0z"/>
                                </svg>
                                Ver Entes
                              </button>
                            </div>
                          </div>
                          {displayMonths.length === 0 ? (
                            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#6c757d' }}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" viewBox="0 0 16 16" style={{ opacity: 0.3, marginBottom: 12 }}>
                                <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/>
                              </svg>
                              <p style={{ margin: 0, fontSize: 14 }}>No hay meses agregados aún.</p>
                              <p style={{ margin: 0, fontSize: 13, marginTop: 4 }}>Usa el botón "Añadir Enero" para comenzar.</p>
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
                          {displayMonths.length > 0 && (
                            <p style={{ marginTop: 20, fontSize: 13, color: '#6c757d' }}>
                              Selecciona un mes para preparar el registro.
                            </p>
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

      {viewMode === 'editar' && (
        <section style={{ marginTop: 16 }}>
          <div className="card mb-3" style={{ border: 'none', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <div className="card-body" style={{ padding: '24px' }}>
              <h6 style={{ marginBottom: 16, color: '#681b32', fontWeight: 600, fontSize: '16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                </svg>
                Filtros de búsqueda
              </h6>
              <div className="row g-3 align-items-end">
                <div className="col-md-5">
                  <label htmlFor="edit-ente" className="form-label" style={{ fontWeight: 500, color: '#495057' }}>Ente</label>
                  <input id="edit-ente" list="edit-entes-list" className="form-control" value={editEnteQuery} onChange={e=>{
                    const v = e.target.value || '';
                    setEditEnteQuery(v);
                    const match = (entes || []).find(x => String(x.title) === String(v));
                    if (match) setEditSelectedEnteId(match.id); else setEditSelectedEnteId(null);
                  }} placeholder="Buscar ente" style={{ borderRadius: '8px', padding: '10px 14px' }} />
                  <datalist id="edit-entes-list">{(entes||[]).map((e,i)=>(<option key={i} value={e.title}/>))}</datalist>
                </div>
                <div className="col-md-3">
                  <label className="form-label" style={{ fontWeight: 500, color: '#495057' }}>Clasificación</label>
                  <select className="form-select" value={editClasifFilter} onChange={e=>setEditClasifFilter(e.target.value)} style={{ borderRadius: '8px', padding: '10px 14px' }}>
                    <option value="Todos">Todos</option>
                    {clasificaciones.map(c => (<option key={c.id} value={c.name || c.title}>{c.name || c.title}</option>))}
                  </select>
                </div>
                <div className="col-md-2">
                  <label className="form-label" style={{ fontWeight: 500, color: '#495057' }}>Año</label>
                  <select className="form-select" value={filterYear} onChange={e=>setFilterYear(e.target.value)} style={{ borderRadius: '8px', padding: '10px 14px' }}>
                    {years.map(y => (<option key={y} value={y}>{y}</option>))}
                  </select>
                </div>

              </div>
            </div>
          </div>

          {loading ? <p>Cargando...</p> : (
            <div>
              <div style={{
                position: 'sticky',
                top: '76px',
                background: 'linear-gradient(135deg, #681b32 0%, #200b07 100%)',
                color: 'white',
                padding: '16px 20px',
                borderRadius: '8px',
                marginBottom: '16px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.15)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                zIndex: 9
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/>
                  </svg>
                  <h5 style={{ margin: 0, fontWeight: 600 }}>Año {filterYear}</h5>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {(() => {
                    const activeSet = entesActivosByYear[String(filterYear)] || new Set();
                    const complianceSet = new Set(
                      compliances.filter(c => String(c.year) === String(filterYear)).map(c => Number(c.ente_id))
                    );
                    const yearEntesCount = new Set([...activeSet, ...complianceSet]).size;
                    const stats = calculateYearStats(filterYear);
                    return (
                      <>
                        <span style={{
                          background: 'rgba(255,255,255,0.2)',
                          padding: '4px 10px',
                          borderRadius: 14,
                          fontSize: 12,
                          fontWeight: 600
                        }}>{yearEntesCount} Entes</span>
                        <span style={{
                          background: 'rgba(255,255,255,0.3)',
                          padding: '4px 10px',
                          borderRadius: 14,
                          fontSize: 12,
                          fontWeight: 700
                        }}>IC: {stats.ic}%</span>
                      </>
                    );
                  })()}
                </div>
              </div>

              <table className="table table-sm" style={{ borderCollapse: 'collapse', background: '#fff', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(135deg, #681b32 0%, #200b07 100%)', color: '#fff' }}>
                    <th style={{ borderBottom: 'none', padding: '14px 16px', fontWeight: 600 }}>Ente</th>
                    <th style={{ borderBottom: 'none', padding: '14px 16px', fontWeight: 600 }}>Meses</th>
                    <th style={{ borderBottom: 'none', textAlign: 'center', padding: '14px 16px', fontWeight: 600, width: 80 }}>IC</th>
                    <th style={{ borderBottom: 'none', textAlign: 'center', padding: '14px 16px', fontWeight: 600 }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const activeSet = entesActivosByYear[String(filterYear)] || new Set();
                    const complianceSet = new Set(
                      compliances.filter(c => String(c.year) === String(filterYear)).map(c => Number(c.ente_id))
                    );
                    const filteredEntes = entes.filter(ente => {
                      if (editSelectedEnteId && String(ente.id) !== String(editSelectedEnteId)) return false;
                      if (editEnteQuery && !(ente.title||'').toLowerCase().includes(editEnteQuery.toLowerCase())) return false;
                      if (editClasifFilter !== 'Todos' && (ente.classification || '') !== editClasifFilter) return false;
                      const isActive = activeSet.has(Number(ente.id));
                      const hasCompliance = complianceSet.has(Number(ente.id));
                      return isActive || hasCompliance; // union
                    });

                    if (filteredEntes.length === 0) {
                      return (<tr><td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" viewBox="0 0 16 16" style={{ opacity: 0.5, marginBottom: 12 }}>
                          <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                          <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                        </svg>
                        <div>No hay registros que coincidan con los filtros.</div>
                      </td></tr>);
                    }

                    return filteredEntes.map(ente => {
                      const isActive = activeSet.has(Number(ente.id));
                      const hasCompliance = complianceSet.has(Number(ente.id));
                      const monthsOrder = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
                      const abbr = {Enero:'Ene',Febrero:'Feb',Marzo:'Mar',Abril:'Abr',Mayo:'May',Junio:'Jun',Julio:'Jul',Agosto:'Ago',Septiembre:'Sep',Octubre:'Oct',Noviembre:'Nov',Diciembre:'Dic'};
                      const compliancesForEnte = compliances.filter(c => String(c.year) === String(filterYear) && Number(c.ente_id) === Number(ente.id));
                      const monthsData = new Map();
                      compliancesForEnte.forEach(c => {
                        if (c.month) monthsData.set(c.month, (c.status || '').toLowerCase());
                      });
                      const uniqueMonths = Array.from(monthsData.keys()).sort((a,b)=>monthsOrder.indexOf(a)-monthsOrder.indexOf(b));

                      // Calcular IC del ente
                      let greenCount = 0;
                      compliancesForEnte.forEach(c => {
                        if ((c.status || '').toLowerCase() === 'cumplio') greenCount++;
                      });
                      const totalRecords = compliancesForEnte.length;
                      const enteIC = totalRecords > 0 ? ((greenCount / totalRecords) * 100).toFixed(1) : '0.0';

                      return (
                        <tr key={ente.id} style={{ transition: 'background 0.2s ease', cursor: 'pointer' }} onMouseEnter={(e) => e.currentTarget.style.background = '#f8f9fa'} onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}>
                          <td style={{ borderBottom: '1px solid #e9ecef', padding: '16px' }}>
                            <div>
                              <div style={{ fontWeight: 600 }}>{ente.title}</div>
                              <div style={{ fontSize: 12, color: '#6c757d', marginTop: 2 }}>{ente.classification || 'Sin clasificación'}</div>
                            </div>
                          </td>

                          <td style={{ borderBottom: '1px solid #e9ecef', padding: '12px 16px' }}>
                            {uniqueMonths.length === 0 ? (
                              <span style={{ fontSize: 12, color: '#6c757d' }}>Sin meses</span>
                            ) : (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {uniqueMonths.map(m => {
                                  const status = monthsData.get(m);
                                  const bgColor = status === 'cumplio' ? '#28a745' : status === 'parcial' ? '#ffc107' : status === 'no' ? '#dc3545' : '#f1f3f5';
                                  const textColor = status === 'cumplio' || status === 'no' ? '#fff' : status === 'parcial' ? '#000' : '#495057';
                                  return (
                                    <span key={m} style={{
                                      background: bgColor,
                                      color: textColor,
                                      padding: '3px 8px',
                                      borderRadius: 12,
                                      fontSize: 12,
                                      fontWeight: 600,
                                      border: status ? 'none' : '1px solid #e9ecef'
                                    }}>{abbr[m] || m}</span>
                                  );
                                })}
                              </div>
                            )}
                          </td>
                          <td style={{ borderBottom: '1px solid #e9ecef', textAlign: 'center', padding: '16px' }}>
                            <span style={{
                              background: '#e9ecef',
                              color: '#200b07',
                              padding: '4px 10px',
                              borderRadius: 12,
                              fontSize: 12,
                              fontWeight: 700
                            }}>{enteIC}%</span>
                          </td>
                          <td style={{ borderBottom: '1px solid #e9ecef', textAlign: 'center', padding: '16px' }}>
                            <button className="btn btn-sm" onClick={()=>setEditingEnte(ente)} style={{ background: 'linear-gradient(to right, #681b32, #200b07)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 500, boxShadow: '0 2px 4px rgba(104, 27, 50, 0.2)', transition: 'transform 0.2s ease' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'} title="Editar">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style={{ marginRight: 6, verticalAlign: 'middle' }}>
                                <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/>
                              </svg>
                              Editar
                            </button>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {showDeleteYearModal && yearToDelete && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content" style={{ width: '90%', maxWidth: 520, background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ background: 'linear-gradient(135deg, #dc3545 0%, #b02a37 100%)', color: '#fff', padding: '22px 26px', position: 'relative' }}>
              <h5 style={{ margin: 0, fontWeight: 700, fontSize: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M8.982 1.566a1.5 1.5 0 0 0-1.964 0L.165 7.233a.5.5 0 0 0-.11.638l5.852 7.387A1.5 1.5 0 0 0 7.226 16h1.549a1.5 1.5 0 0 0 1.319-.742l5.852-7.387a.5.5 0 0 0-.11-.638l-6.853-5.667z"/>
                </svg>
                Eliminar Año {yearToDelete}
              </h5>
            </div>
            <div style={{ padding: '26px', flex: 1, background: 'linear-gradient(to bottom,#ffffff,#f8f9fa)' }}>
              <p style={{ margin: 0, color: '#495057', lineHeight: 1.5 }}>
                Esta acción <strong>eliminará definitivamente</strong> todos los cumplimientos registrados para el año <strong>{yearToDelete}</strong>.
                No habrá forma de recuperarlos (no es un borrado lógico). Confirma que realmente deseas proceder.
              </p>
              <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#6c757d' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style={{ flexShrink: 0 }}>
                    <path d="M8 0a8 8 0 1 0 8 8A8.009 8.009 0 0 0 8 0Zm.93 12.588a.641.641 0 0 1-.641.642h-.001a.641.641 0 0 1-.641-.642V7.051a.641.641 0 0 1 .641-.641h.001a.641.641 0 0 1 .641.641Zm-.93-7.176A.93.93 0 1 1 8 3.753a.93.93 0 0 1 0 1.859Z"/>
                  </svg>
                  <span>Se recomienda exportar antes de realizar esta operación.</span>
                </div>
              </div>
            </div>
            <div style={{ padding: '18px 24px', background: '#f8f9fa', borderTop: '1px solid #e9ecef', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                onClick={() => { if (!deletingYear) { setShowDeleteYearModal(false); setYearToDelete(null); } }}
                style={{
                  background: '#fff', border: '2px solid #dee2e6', color: '#495057', padding: '10px 22px', fontWeight: 600, borderRadius: 8,
                  cursor: 'pointer', transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e)=>{ e.currentTarget.style.background='#f8f9fa'; e.currentTarget.style.borderColor='#ced4da'; }}
                onMouseLeave={(e)=>{ e.currentTarget.style.background='#fff'; e.currentTarget.style.borderColor='#dee2e6'; }}
                disabled={!!deletingYear}
              >Cancelar</button>
              <button
                onClick={() => { if (!deletingYear) handleDeleteYear(yearToDelete); }}
                style={{
                  background: 'linear-gradient(135deg,#dc3545 0%,#b02a37 100%)', border: 'none', color: '#fff', padding: '10px 26px', fontWeight: 600,
                  borderRadius: 8, cursor: 'pointer', boxShadow: '0 3px 8px rgba(220,53,69,0.35)', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: 8
                }}
                onMouseEnter={(e)=>{ e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 6px 14px rgba(220,53,69,0.45)'; }}
                onMouseLeave={(e)=>{ e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 3px 8px rgba(220,53,69,0.35)'; }}
                disabled={!!deletingYear}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                  <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                </svg>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ver Entes: administración de entes activos y captura rápida por mes */}
      {showEntesModal && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 2500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content" style={{ width: '95%', maxWidth: 1100, maxHeight: '90vh', background: '#fff', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 40px rgba(0,0,0,0.25)' }}>
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #681b32 0%, #200b07 100%)', color: '#fff', padding: 18, paddingLeft: 22, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', flex: 1 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 18 }}>Entes activos</div>
                  <div style={{ opacity: 0.9 }}>Año {entesModalYear}</div>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    type = "text"
                    placeholder="Buscar por nombre"
                    value={entesModalSearchName}

                    onChange={e=>setEntesModalSearchName(e.target.value)}
                    style={{ borderRadius: 8, minWidth: 180, border: '1px solid rgba(255,255,255,0.3)', background: '#440D1E', color: '#fff', padding: '8px 12px', outline: 'none' }}
                  />
                  <select
                    value={entesModalClasif}
                    onChange={e=>setEntesModalClasif(e.target.value)}
                    style={{ borderRadius: 8, minWidth: 180, border: '1px solid rgba(255,255,255,0.3)', background: '#440D1E', color: '#fff', padding: '8px 12px', outline: 'none' }}
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
            <div style={{ padding: 20, background: 'linear-gradient(to bottom, #ffffff,#f8f9fa)', overflowY: 'auto' }}>
              <table className="table table-sm" style={{ borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(135deg, #681b32 0%, #200b07 100%)', color: '#fff' }}>
                    <th style={{ padding: '14px 16px', borderBottom: 'none', fontWeight: 600 }}>Ente</th>
                    <th style={{ padding: '14px 16px', borderBottom: 'none', fontWeight: 600 }}>Clasificación</th>
                    <th style={{ padding: '14px 16px', borderBottom: 'none', textAlign: 'center', fontWeight: 600, width: 100 }}>Activo</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const filtered = (entes || [])
                      .filter(e => !entesModalSearchName || (e.title || '').toLowerCase().includes(entesModalSearchName.toLowerCase()))
                      .filter(e => entesModalClasif === 'Todos' || (e.classification || '') === entesModalClasif)
                      .filter(e => {
                        const isActive = currentActivesSet.has(Number(e.id));
                        if (entesModalFilter === 'activos') return isActive;
                        if (entesModalFilter === 'desactivados') return !isActive;
                        return true; // todos
                      })
                      .sort((a,b) => {
                        const ca = (a.classification || '').localeCompare(b.classification || '');
                        if (ca !== 0) return ca;
                        return (a.title || '').localeCompare(b.title || '');
                      });

                    if (!filtered.length) {
                      return (
                        <tr><td colSpan={3} style={{ padding: 30, textAlign: 'center', color: '#6c757d' }}>No hay entes para mostrar</td></tr>
                      );
                    }

                    return filtered.map((e) => {
                      const enteId = Number(e.id);
                      const isActive = currentActivesSet.has(enteId);
                      const isLoading = loadingEnteId === enteId;
                      return (
                        <tr
                          key={enteId}
                          onClick={() => { if (!isLoading) toggleEnteActivo(enteId, !isActive); }}
                          style={{
                            background: isActive ? 'rgba(199, 21, 133, 0.12)' : '#fff',
                            color: '#212529',
                            cursor: isLoading ? 'wait' : 'pointer',
                            transition: 'background 0.2s ease, opacity 0.2s ease',
                            opacity: isLoading ? 0.6 : 1
                          }}
                        >
                          <td style={{ padding: '14px 16px', borderBottom: '1px solid #e9ecef', fontWeight: 500 }}>
                            {isLoading ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 16, height: 16, border: '2px solid #681b32', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }}></div>
                                <span>{e.title}</span>
                              </div>
                            ) : e.title}
                          </td>
                          <td style={{ padding: '14px 16px', borderBottom: '1px solid #e9ecef', opacity: isActive ? 0.9 : 0.7 }}>
                            {e.classification || 'Sin clasificación'}
                          </td>
                          <td style={{ padding: '14px 16px', borderBottom: '1px solid #e9ecef', textAlign: 'center' }}>
                            {isLoading ? (
                              <div style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid #681b32', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }}></div>
                            ) : (
                              <input
                                type="checkbox"
                                checked={isActive}
                                onChange={(ev) => {
                                  ev.stopPropagation();
                                  toggleEnteActivo(enteId, ev.target.checked);
                                }}
                                style={{
                                  cursor: 'pointer',
                                  width: 18,
                                  height: 18
                                }}
                              />
                            )}
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div style={{ padding: 16, background: '#f8f9fa', borderTop: '1px solid #e9ecef', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                <div style={{ display: 'flex', flexDirection: 'row', gap: 10, background: '#fff', padding: '8px 10px', borderRadius: 8, border: '1px solid #dee2e6' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '4px 8px', borderRadius: 6, background: entesModalFilter === 'todos' ? '#e9ecef' : 'transparent', transition: 'all 0.2s' }}>
                        <input type="radio" name="entesFilter" value="todos" checked={entesModalFilter === 'todos'} onChange={e=>setEntesModalFilter(e.target.value)} style={{ cursor: 'pointer' }} />
                        <span style={{ fontSize: 13, fontWeight: 500, color: '#495057' }}>Todos</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '4px 8px', borderRadius: 6, background: entesModalFilter === 'activos' ? '#e9ecef' : 'transparent', transition: 'all 0.2s' }}>
                        <input type="radio" name="entesFilter" value="activos" checked={entesModalFilter === 'activos'} onChange={e=>setEntesModalFilter(e.target.value)} style={{ cursor: 'pointer' }} />
                        <span style={{ fontSize: 13, fontWeight: 500, color: '#495057' }}>Activos</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '4px 8px', borderRadius: 6, background: entesModalFilter === 'desactivados' ? '#e9ecef' : 'transparent', transition: 'all 0.2s' }}>
                        <input type="radio" name="entesFilter" value="desactivados" checked={entesModalFilter === 'desactivados'} onChange={e=>setEntesModalFilter(e.target.value)} style={{ cursor: 'pointer' }} />
                        <span style={{ fontSize: 13, fontWeight: 500, color: '#495057' }}>Desactivados</span>
                    </label>
                </div>
              <button
                className="btn"
                onClick={()=>{ setShowEntesModal(false); }}
                style={{
                  background: 'linear-gradient(135deg, #681b32 0%, #200b07 100%)',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 24px',
                  fontWeight: 600,
                  borderRadius: 8,
                  boxShadow: '0 2px 6px rgba(104, 27, 50, 0.3)',
                  transition: 'all 0.2s ease'
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

      {/* Modal Captura por Mes: guardar cumplimientos por mes */}
      {showMonthModal && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 2500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content" style={{ width: '95%', maxWidth: 1100, maxHeight: '90vh', background: '#fff', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 40px rgba(0,0,0,0.25)' }}>
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #681b32 0%, #200b07 100%)', color: '#fff', padding: 20, paddingLeft: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 4 }}>{monthModalMonth}</div>
                  <div style={{ opacity: 0.9, fontSize: 14 }}>Año {monthModalYear}</div>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
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
                    <option value="Todos">Todos</option>
                    {clasificaciones.map(c => (
                      <option key={c.id} value={c.name || c.title}>{c.name || c.title}</option>
                    ))}
                  </select>
                </div>
              </div>
              {!monthModalReadOnly && (
                <button
                  onClick={() => { setShowMonthModal(false); setShowDeleteMonthModal(true); }}
                  style={{
                    background: 'linear-gradient(135deg, #dc3545 0%, #b02a37 100%)',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: 8,
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(220,53,69,0.3)',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 10px rgba(220,53,69,0.4)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(220,53,69,0.3)'; }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                    <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                  </svg>
                  Eliminar mes
                </button>
              )}
            </div>

            {/* Body */}
            <div style={{ padding: 20, background: 'linear-gradient(to bottom, #ffffff 0%, #f8f9fa 100%)', overflowY: 'auto' }}>
              <table className="table table-sm" style={{ borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(135deg, #681b32 0%, #200b07 100%)', color: '#fff' }}>
                    <th style={{ padding: '14px 16px', borderBottom: 'none', fontWeight: 600 }}>Ente</th>
                    <th style={{ padding: '14px 16px', borderBottom: 'none', textAlign: 'center', fontWeight: 600, width: 120 }}>Verde</th>
                    <th style={{ padding: '14px 16px', borderBottom: 'none', textAlign: 'center', fontWeight: 600, width: 120 }}>Amarillo</th>
                    <th style={{ padding: '14px 16px', borderBottom: 'none', textAlign: 'center', fontWeight: 600, width: 120 }}>Rojo</th>
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

                    const filtered = (entes || [])
                      .filter(e => currentActivesSet.has(Number(e.id)))
                      .filter(e => !monthModalSearchName || (e.title || '').toLowerCase().includes(monthModalSearchName.toLowerCase()))
                      .filter(e => monthModalClasif === 'Todos' || (e.classification || '') === monthModalClasif)
                      .sort((a,b) => {
                        const ca = (a.classification || '').localeCompare(b.classification || '');
                        if (ca !== 0) return ca;
                        return (a.title || '').localeCompare(b.title || '');
                      });

                    if (!filtered.length) {
                      return (
                        <tr><td colSpan={4} style={{ padding: 30, textAlign: 'center', color: '#6c757d' }}>No hay entes activos para mostrar</td></tr>
                      );
                    }

                    return filtered.map((e) => {
                      const enteId = Number(e.id);
                      const original = statusByEnte.get(enteId) || '';
                      const current = monthModalTemp[enteId] ?? original;

                      return (
                        <tr key={enteId} style={{ transition: 'background 0.2s ease' }} onMouseEnter={(ev) => ev.currentTarget.style.background = '#f8f9fa'} onMouseLeave={(ev) => ev.currentTarget.style.background = '#fff'}>
                          <td style={{ padding: '14px 16px', borderBottom: '1px solid #e9ecef' }}>
                            <div>
                              <div style={{ fontWeight: 600 }}>{e.title}</div>
                              <div style={{ fontSize: 12, color: '#6c757d', marginTop: 2 }}>{e.classification || 'Sin clasificación'}</div>
                            </div>
                          </td>
                          {['cumplio','parcial','no'].map((opt) => (
                            <td key={opt} style={{ padding: '14px 16px', borderBottom: '1px solid #e9ecef', textAlign: 'center' }}>
                              <button
                                className="btn btn-sm"
                                onClick={() => !monthModalReadOnly && setMonthModalTemp(prev => ({ ...prev, [enteId]: opt }))}
                                disabled={monthModalReadOnly}
                                style={{
                                  background: current === opt ? (opt==='cumplio' ? '#28a745' : opt==='parcial' ? '#ffc107' : '#dc3545') : '#fff',
                                  border: current === opt ? `3px solid ${opt==='cumplio' ? '#28a745' : opt==='parcial' ? '#ffc107' : '#dc3545'}` : '2px solid #AEB3B7',
                                  color: current === opt ? '#fff' : (opt==='cumplio' ? '#28a745' : opt==='parcial' ? '#ffc107' : '#dc3545'),
                                  width: 42,
                                  height: 42,
                                  borderRadius: '50%',
                                  cursor: monthModalReadOnly ? 'not-allowed' : 'pointer',
                                  transition: 'all 0.2s ease',
                                  boxShadow: current === opt ? '0 2px 6px rgba(0,0,0,0.2)' : 'none',
                                  transform: current === opt ? 'scale(1.05)' : 'scale(1)',
                                  opacity: monthModalReadOnly ? 0.6 : 1
                                }}
                                onMouseEnter={(ev) => { if (current !== opt && !monthModalReadOnly) { ev.currentTarget.style.transform = 'scale(1.1)'; ev.currentTarget.style.background = opt === 'cumplio' ? '#28a74550' : opt === 'parcial' ? '#ffc10750' : '#dc354550'; } }}
                                onMouseLeave={(ev) => { if (current !== opt && !monthModalReadOnly) { ev.currentTarget.style.transform = 'scale(1)'; ev.currentTarget.style.background = '#fff'; } }}
                              />
                            </td>
                          ))}
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div style={{ padding: 16, background: '#f8f9fa', borderTop: '1px solid #e9ecef', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                {(() => {
                  const stats = calculateMonthStats(monthModalYear, monthModalMonth);
                  return (
                    <>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#200b07', background: '#e9ecef', padding: '6px 12px', borderRadius: 8 }}>
                        IC: {stats.ic}%
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#fff', background: '#28a745', padding: '6px 10px', borderRadius: 8 }}>
                        Verde: {stats.greenPercent}%
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#000', background: '#ffc107', padding: '6px 10px', borderRadius: 8 }}>
                        Amarillo: {stats.yellowPercent}%
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#fff', background: '#dc3545', padding: '6px 10px', borderRadius: 8 }}>
                        Rojo: {stats.redPercent}%
                      </span>
                    </>
                  );
                })()}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  className="btn"
                  onClick={()=>{ setShowMonthModal(false); setMonthModalTemp({}); setMonthModalReadOnly(false); }}
                  style={{
                    background: '#fff',
                    color: '#6c757d',
                    border: '2px solid #dee2e6',
                    padding: '10px 24px',
                    fontWeight: 600,
                    borderRadius: 8,
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#f8f9fa'; e.currentTarget.style.borderColor = '#adb5bd'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#dee2e6'; }}
                >
                  {monthModalReadOnly ? 'Cerrar' : 'Cancelar'}
                </button>
              {!monthModalReadOnly && (
              <button
                className="btn"
                disabled={monthModalSaving}
                onClick={async ()=>{
                  try {
                    setMonthModalSaving(true);
                    const activesSet = entesActivosByYear[String(monthModalYear)] || new Set();
                    const statusByEnte = new Map();
                    compliances.forEach(c => {
                      if (String(c.year) === String(monthModalYear) && String(c.month) === String(monthModalMonth)) {
                        statusByEnte.set(Number(c.ente_id), (c.status || '').toLowerCase());
                      }
                    });
                    const visibleEntes = (entes || [])
                      .filter(e => activesSet.has(Number(e.id)))
                      .filter(e => !monthModalSearchName || (e.title || '').toLowerCase().includes(monthModalSearchName.toLowerCase()))
                      .filter(e => monthModalClasif === 'Todos' || (e.classification || '') === monthModalClasif);
                    const missing = visibleEntes.filter(e => {
                      const enteId = Number(e.id);
                      const original = statusByEnte.get(enteId) || '';
                      const current = monthModalTemp[enteId] ?? original;
                      return !current;
                    });
                    if (missing.length > 0) {
                      setToast({ message: `Faltan ${missing.length} ente(s) por seleccionar estado`, type: 'warning' });
                      setMonthModalSaving(false);
                      return;
                    }
                    const updates = Object.entries(monthModalTemp).map(([ente_id, status]) => ({
                      ente_id,
                      year: monthModalYear,
                      month: monthModalMonth,
                      status
                    }));

                    if (updates.length === 0) {
                      setToast({ message: 'No hay cambios para guardar', type: 'warning' });
                      return;
                    }

                    const res = await fetch(`${apiBase}/compliance_update.php`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ updates })
                    });
                    const json = await res.json();

                    if (json && json.success) {
                      setToast({ message: 'Cumplimientos guardados exitosamente', type: 'success' });
                      // Recargar compliances
                      const cRes = await fetch(`${apiBase}/compliances.php`);
                      const cJson = await cRes.json();
                      setCompliances(Array.isArray(cJson) ? cJson : []);
                      setMonthModalTemp({});
                      setShowMonthModal(false);
                    } else {
                      setToast({ message: 'Error al guardar: ' + (json.message || 'Error desconocido'), type: 'error' });
                    }
                  } catch (e) {
                    console.error(e);
                    setToast({ message: 'Error al guardar los cambios', type: 'error' });
                  } finally {
                    setMonthModalSaving(false);
                  }
                }}
                style={{
                  background: 'linear-gradient(135deg, #681b32 0%, #200b07 100%)',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 28px',
                  fontWeight: 600,
                  borderRadius: 8,
                  boxShadow: '0 2px 6px rgba(104, 27, 50, 0.3)',
                  transition: 'all 0.2s ease',
                  opacity: monthModalSaving ? 0.7 : 1,
                  cursor: monthModalSaving ? 'not-allowed' : 'pointer'
                }}
                onMouseEnter={(e) => { if (!monthModalSaving) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 10px rgba(104, 27, 50, 0.4)'; }}}
                onMouseLeave={(e) => { if (!monthModalSaving) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(104, 27, 50, 0.3)'; }}}
              >
                {monthModalSaving ? 'Guardando...' : 'Guardar Cumplimientos'}
              </button>
              )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para eliminar mes */}
      {showDeleteMonthModal && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content" style={{ width: '90%', maxWidth: 520, background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ background: 'linear-gradient(135deg, #dc3545 0%, #b02a37 100%)', color: '#fff', padding: '22px 26px', position: 'relative' }}>
              <h5 style={{ margin: 0, fontWeight: 700, fontSize: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M8.982 1.566a1.5 1.5 0 0 0-1.964 0L.165 7.233a.5.5 0 0 0-.11.638l5.852 7.387A1.5 1.5 0 0 0 7.226 16h1.549a1.5 1.5 0 0 0 1.319-.742l5.852-7.387a.5.5 0 0 0-.11-.638l-6.853-5.667z"/>
                </svg>
                Eliminar {monthModalMonth} {monthModalYear}
              </h5>
            </div>
            <div style={{ padding: '26px', flex: 1, background: 'linear-gradient(to bottom,#ffffff,#f8f9fa)' }}>
              <p style={{ margin: 0, color: '#495057', lineHeight: 1.5 }}>
                Esta acción <strong>eliminará definitivamente</strong> todos los cumplimientos registrados para <strong>{monthModalMonth}</strong> del año <strong>{monthModalYear}</strong>.
                No habrá forma de recuperarlos (no es un borrado lógico). Confirma que realmente deseas proceder.
              </p>
              <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#6c757d' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style={{ flexShrink: 0 }}>
                    <path d="M8 0a8 8 0 1 0 8 8A8.009 8.009 0 0 0 8 0Zm.93 12.588a.641.641 0 0 1-.641.642h-.001a.641.641 0 0 1-.641-.642V7.051a.641.641 0 0 1 .641-.641h.001a.641.641 0 0 1 .641.641Zm-.93-7.176A.93.93 0 1 1 8 3.753a.93.93 0 0 1 0 1.859Z"/>
                  </svg>
                  <span>Se recomienda exportar antes de realizar esta operación.</span>
                </div>
              </div>
            </div>
            <div style={{ padding: '18px 24px', background: '#f8f9fa', borderTop: '1px solid #e9ecef', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                onClick={() => { if (!deletingMonth) setShowDeleteMonthModal(false); }}
                style={{
                  background: '#fff', border: '2px solid #dee2e6', color: '#495057', padding: '10px 22px', fontWeight: 600, borderRadius: 8,
                  cursor: 'pointer', transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e)=>{ e.currentTarget.style.background='#f8f9fa'; e.currentTarget.style.borderColor='#ced4da'; }}
                onMouseLeave={(e)=>{ e.currentTarget.style.background='#fff'; e.currentTarget.style.borderColor='#dee2e6'; }}
                disabled={!!deletingMonth}
              >Cancelar</button>
              <button
                onClick={() => { if (!deletingMonth) handleDeleteMonth(); }}
                style={{
                  background: 'linear-gradient(135deg,#dc3545 0%,#b02a37 100%)', border: 'none', color: '#fff', padding: '10px 26px', fontWeight: 600,
                  borderRadius: 8, cursor: 'pointer', boxShadow: '0 3px 8px rgba(220,53,69,0.35)', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: 8
                }}
                onMouseEnter={(e)=>{ e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 6px 14px rgba(220,53,69,0.45)'; }}
                onMouseLeave={(e)=>{ e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 3px 8px rgba(220,53,69,0.35)'; }}
                disabled={!!deletingMonth}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                  <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                </svg>
                {deletingMonth ? 'Eliminando...' : 'Eliminar definitivamente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de edición de cumplimientos */}
      {editingEnte && (
        <div className="modal-backdrop" style={{ position: 'fixed', left: 0, top: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div className="modal-content" style={{ width: '90%', maxWidth: 900, background: '#fff', borderRadius: 12, maxHeight: '90vh', overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 40px rgba(0,0,0,0.25)' }}>
            {/* Encabezado sticky */}
            <div style={{ position: 'sticky', top: 0, background: 'linear-gradient(135deg, #681b32 0%, #200b07 100%)', color: '#fff', zIndex: 10, padding: 24, paddingBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
              <div>
                <h5 style={{ margin: 0, marginBottom: 6, fontSize: 20, fontWeight: 700 }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 16 16" style={{ marginRight: 10, verticalAlign: 'middle' }}>
                    <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/>
                  </svg>
                  {editingEnte.title}
                </h5>
                <small style={{ opacity: 0.9, fontSize: 13 }}>{editingEnte.classification}</small>
              </div>
              <div>
                <h5 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16" style={{ marginRight: 8, verticalAlign: 'middle' }}>
                    <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/>
                  </svg>
                  Año {filterYear}
                </h5>
              </div>
            </div>

            {/* Tabla de cumplimientos */}
            <div style={{ padding: 28, paddingTop: 24, flex: 1, overflowY: 'auto', background: 'linear-gradient(to bottom, #ffffff 0%, #f8f9fa 100%)' }}>
              <table className="table table-sm" style={{ borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(135deg, #681b32 0%, #200b07 100%)', color: '#fff' }}>
                    <th style={{ borderBottom: 'none', padding: '14px 16px', fontWeight: 600 }}>Mes</th>
                    <th style={{ borderBottom: 'none', textAlign: 'center', padding: '14px 16px', fontWeight: 600 }}>Cumplió</th>
                    <th style={{ borderBottom: 'none', textAlign: 'center', padding: '14px 16px', fontWeight: 600 }}>Parcial</th>
                    <th style={{ borderBottom: 'none', textAlign: 'center', padding: '14px 16px', fontWeight: 600 }}>No cumplió</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    // Filtrar solo los meses que tienen cumplimientos para este ente en este año
                    const monthsOrder = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
                    const entesMonths = compliances
                      .filter(c => String(c.ente_id) === String(editingEnte.id) && String(c.year) === String(filterYear))
                      .map(c => c.month)
                      .filter(Boolean);
                    const uniqueMonths = Array.from(new Set(entesMonths)).sort((a, b) => monthsOrder.indexOf(a) - monthsOrder.indexOf(b));

                    if (uniqueMonths.length === 0) {
                      return (
                        <tr>
                          <td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" viewBox="0 0 16 16" style={{ opacity: 0.3, marginBottom: 12 }}>
                              <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/>
                            </svg>
                            <div>Este ente no tiene meses registrados en {filterYear}</div>
                          </td>
                        </tr>
                      );
                    }

                    return uniqueMonths.map(mes => {
                      const compliance = compliances.find(c =>
                        String(c.ente_id) === String(editingEnte.id) &&
                        String(c.year) === String(filterYear) &&
                        c.month === mes
                      );
                      const originalStatus = compliance?.status?.toLowerCase() || '';
                      const tempKey = `${editingEnte.id}_${filterYear}_${mes}`;
                      const currentStatus = tempCompliances[tempKey] || originalStatus;

                      const handleStatusChange = (newStatus) => {
                        setTempCompliances(prev => ({
                          ...prev,
                          [tempKey]: newStatus
                        }));
                      };

                      return (
                        <tr key={mes} style={{ transition: 'background 0.2s ease' }} onMouseEnter={(e) => e.currentTarget.style.background = '#f8f9fa'} onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}>
                          <td style={{ borderBottom: '1px solid #e9ecef', padding: '14px 16px', fontWeight: 500 }}>{mes}</td>
                          <td style={{ borderBottom: '1px solid #e9ecef', textAlign: 'center', padding: '14px 16px' }}>
                            <button
                            className="btn btn-sm"
                            onClick={() => handleStatusChange('cumplio')}
                            style={{
                              background: currentStatus === 'cumplio' ? '#28a745' : '#fff',
                              border: currentStatus === 'cumplio' ? '3px solid #28a745' : '2px solid #AEB3B7',
                              color: currentStatus === 'cumplio' ? '#fff' : '#28a745',
                              width: 42,
                              height: 42,
                              borderRadius: '50%',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              boxShadow: currentStatus === 'cumplio' ? '0 3px 8px rgba(40, 167, 69, 0.3)' : 'none',
                              transform: currentStatus === 'cumplio' ? 'scale(1.1)' : 'scale(1)'
                            }}
                            onMouseEnter={(e) => currentStatus !== 'cumplio' && (e.currentTarget.style.background = '#28a74550')}
                            onMouseLeave={(e) => currentStatus !== 'cumplio' && (e.currentTarget.style.background = '#fff')}
                          />
                        </td>
                        <td style={{ borderBottom: '1px solid #e9ecef', textAlign: 'center', padding: '14px 16px' }}>
                          <button
                            className="btn btn-sm"
                            onClick={() => handleStatusChange('parcial')}
                            style={{
                              background: currentStatus === 'parcial' ? '#ffc107' : '#fff',
                              border: currentStatus === 'parcial' ? '3px solid #ffc107' : '2px solid #AEB3B7',
                              color: currentStatus === 'parcial' ? '#fff' : '#ffc107',
                              width: 42,
                              height: 42,
                              borderRadius: '50%',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              boxShadow: currentStatus === 'parcial' ? '0 3px 8px rgba(255, 193, 7, 0.3)' : 'none',
                              transform: currentStatus === 'parcial' ? 'scale(1.1)' : 'scale(1)'
                            }}
                            onMouseEnter={(e) => currentStatus !== 'parcial' && (e.currentTarget.style.background = '#ffc10750')}
                            onMouseLeave={(e) => currentStatus !== 'parcial' && (e.currentTarget.style.background = '#fff')}
                          />
                        </td>
                        <td style={{ borderBottom: '1px solid #e9ecef', textAlign: 'center', padding: '14px 16px' }}>
                          <button
                            className="btn btn-sm"
                            onClick={() => handleStatusChange('no')}
                            style={{
                              background: currentStatus === 'no' || currentStatus === 'nocumple' ? '#dc3545' : '#fff',
                              border: (currentStatus === 'no' || currentStatus === 'nocumple') ? '3px solid #dc3545' : '2px solid #AEB3B7',
                              color: (currentStatus === 'no' || currentStatus === 'nocumple') ? '#fff' : '#dc3545',
                              width: 42,
                              height: 42,
                              borderRadius: '50%',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              boxShadow: (currentStatus === 'no' || currentStatus === 'nocumple') ? '0 3px 8px rgba(220, 53, 69, 0.3)' : 'none',
                              transform: (currentStatus === 'no' || currentStatus === 'nocumple') ? 'scale(1.1)' : 'scale(1)'
                            }}
                            onMouseEnter={(e) => currentStatus !== 'no' && currentStatus !== 'nocumple' && (e.currentTarget.style.background = '#dc354550')}
                            onMouseLeave={(e) => currentStatus !== 'no' && currentStatus !== 'nocumple' && (e.currentTarget.style.background = '#fff')}
                          />
                        </td>
                      </tr>
                    );
                    });
                  })()}
                </tbody>
              </table>
            </div>

            {/* Botones de acción sticky + Indicadores */}
            <div style={{ position: 'sticky', bottom: 0, background: '#f8f9fa', zIndex: 10, padding: 20, paddingTop: 18, borderTop: '1px solid #e9ecef', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              {(() => {
                const stats = calculateEnteStats(editingEnte.id, filterYear);
                return (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ background: '#e9ecef', color: '#200b07', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700 }}>IC: {stats.ic}%</span>
                    <span style={{ background: '#28a745', color: '#fff', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>Verde: {stats.greenPercent}%</span>
                    <span style={{ background: '#ffc107', color: '#000', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>Amarillo: {stats.yellowPercent}%</span>
                    <span style={{ background: '#dc3545', color: '#fff', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>Rojo: {stats.redPercent}%</span>
                  </div>
                );
              })()}
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn" onClick={()=>{ setEditingEnte(null); setTempCompliances({}); }} style={{ background: '#fff', color: '#6c757d', border: '2px solid #dee2e6', padding: '10px 24px', fontWeight: 600, borderRadius: 8, transition: 'all 0.2s ease' }} onMouseEnter={(e) => { e.currentTarget.style.background = '#f8f9fa'; e.currentTarget.style.borderColor = '#adb5bd'; }} onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#dee2e6'; }}>
                  Cancelar
                </button>
                <button className="btn" onClick={async ()=>{
                try {
                  const base = `${window.location.protocol}//${window.location.hostname}/siret/api`;
                  const updates = [];

                  for (const key in tempCompliances) {
                    const [ente_id, year, month] = key.split('_');
                    const status = tempCompliances[key];
                    updates.push({ ente_id, year, month, status });
                  }

                  if (updates.length === 0) {
                    setToast({ message: 'No hay cambios para guardar', type: 'warning' });
                    setEditingEnte(null);
                    return;
                  }

                  const response = await fetch(`${base}/compliance_update.php`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ updates })
                  });

                  const result = await response.json();

                  if (result.success) {
                    setToast({ message: 'Cambios guardados exitosamente', type: 'success' });
                    // Recargar cumplimientos
                    const cRes = await fetch(`${base}/compliances.php`);
                    const cJson = await cRes.json();
                    setCompliances(Array.isArray(cJson) ? cJson : []);
                    setTempCompliances({});
                    setEditingEnte(null);
                  } else {
                    setToast({ message: 'Error al guardar: ' + (result.message || 'Error desconocido'), type: 'error' });
                  }
                } catch (error) {
                  console.error('Error:', error);
                  setToast({ message: 'Error al guardar los cambios', type: 'error' });
                }
              }} style={{ background: 'linear-gradient(135deg, #681b32 0%, #200b07 100%)', color: '#fff', border: 'none', padding: '10px 28px', fontWeight: 600, borderRadius: 8, boxShadow: '0 3px 8px rgba(104, 27, 50, 0.3)', transition: 'all 0.2s ease' }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 5px 12px rgba(104, 27, 50, 0.4)'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 3px 8px rgba(104, 27, 50, 0.3)'; }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style={{ marginRight: 8, verticalAlign: 'middle' }}>
                  <path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/>
                </svg>
                Guardar Cambios
              </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {viewMode === 'importar' && (
        <section style={{ marginTop: 16 }}>
          <div className="card card-body mb-3">
            <h5>Importar Cumplimientos</h5>
            <p>Formulario para importar cumplimientos desde archivo (próximamente)</p>
          </div>
        </section>
      )}
    </div>
  );
}
