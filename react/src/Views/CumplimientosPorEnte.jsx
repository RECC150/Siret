import React, { useMemo, useState, useEffect, useRef } from 'react';
import styles from "./css/CumplimientosMesAnio.module.css";
import { useLocalStorage } from '../hooks/useLocalStorage';

import ASEBCS from "../assets/asebcs.jpg";
import a from "../assets/a.png";
// Añadido: Recharts para los pies y BarChart (reemplazo de AreaChart)
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Label
} from 'recharts';

export default function CumplimientosMesAnio() {
  // REEMPLAZO: cargar entes desde API (a partir de la tabla compliances)
  const [entesList, setEntesList] = useState([]);

  // ref al contenedor para mantener la vista centrada
  const containerRef = useRef(null);

  // Años y meses (necesarios para el formulario y la lógica)
  // Los años se calculan dinámicamente desde los datos cargados
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

  // Calcular años dinámicamente desde los entes cargados
  const years = useMemo(() => {
    const yearsSet = new Set();
    (entesList || []).forEach(ente => {
      (ente.compliances || []).forEach(c => {
        if (c.year) yearsSet.add(c.year);
      });
    });
    return Array.from(yearsSet).sort((a, b) => b - a); // descendente
  }, [entesList]);

  // Abreviaturas para los meses (usadas en Indicadores)
  const monthAbbr = {
    "Enero": "Ene", "Febrero": "Feb", "Marzo": "Mar", "Abril": "Abr",
    "Mayo": "May", "Junio": "Jun", "Julio": "Jul", "Agosto": "Ago",
    "Septiembre": "Sep", "Octubre": "Oct", "Noviembre": "Nov", "Diciembre": "Dic"
  };

  // Fallback mínimo (se usa si el PHP no responde)
  const entesListFallback = [
    {
      id: 1,
      title: 'Municipio de La Paz',
      img: ASEBCS,
      classification: 'Municipios',
      compliances: [{ year: 2025, month: 'Enero', status: 'cumplio' }]
    },
    {
      id: 2,
      title: 'Municipio de Los Cabos',
      img: ASEBCS,
      classification: 'Municipios',
      compliances: [{ year: 2025, month: 'Enero', status: 'parcial' }]
    }
  ];

  const [enteQuery, setEnteQuery] = useLocalStorage('cumplimientos_porEnte_enteQuery', '');
  const [year, setYear] = useLocalStorage('cumplimientos_mesAnio_year', null);
  const [month, setMonth] = useLocalStorage('cumplimientos_mesAnio_month', 'Todos');
  const [results, setResults] = useState([]);

  // Efecto: cuando los años cambien y el año guardado sea null, establecer el año al primero disponible (solo primera carga)
  useEffect(() => {
    if (years && years.length > 0 && year === null) {
      const firstYear = String(years[0]);
      setYear(firstYear);
    }
  }, [years, year, setYear]);


  // Nuevo: estado para tamaño de ventana responsivo
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  // Efecto: escuchar cambios en el tamaño de la ventana
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Control de vista (mostrar solo lista / graficas / indicadores / todo)
  const [viewMode, setViewMode] = useLocalStorage('cumplimientos_mesAnio_viewMode', 'lista');

  // Si viene con 'graficas' desde otra página, forzar 'lista' porque aquí no existe esa pestaña
  useEffect(() => {
    if (viewMode === 'graficas') {
      setViewMode('lista');
    }
  }, [viewMode, setViewMode]);


  // Nuevo: estado para modal / mes seleccionado
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [modalNameQuery, setModalNameQuery] = useLocalStorage('cumplimientos_mesAnio_modalNameQuery', '');
  const [modalClassFilter, setModalClassFilter] = useLocalStorage('cumplimientos_mesAnio_modalClassFilter', 'Todos');
  const [pieLoadedMonths, setPieLoadedMonths] = useState({});
  const openModal = (m) => {
    setSelectedMonth(m);
    try { document.body.style.overflow = 'hidden'; } catch (e) {}
    // NO reset modal search filters - mantener valores guardados
    // ensure pieLoaded flag for this month is reset so animation can run
    setPieLoadedMonths(prev => ({ ...prev, [m]: false }));
  };
  const closeModal = () => {
    closeModalWithAnimation('month', () => {
      setSelectedMonth(null);
      try {
        // restaurar sólo si no hay otro modal abierto
        if (!selectedEnte) document.body.style.overflow = '';
        else {
          /* si existe selectedEnte, mantener oculto */
        }
      } catch (e) {}
    });
  };

  const handlePieAnimationEnd = (monthKey) => {
    setPieLoadedMonths(prev => {
      if (prev && prev[monthKey]) return prev;
      return { ...prev, [monthKey]: true };
    });
  };

  // Nuevo: estado para hover sobre mini-gráfica
  const [hoveredMonth, setHoveredMonth] = useState(null);

  // Nuevo: modal por ente y sección activa
  const [selectedEnte, setSelectedEnte] = useState(null);
  const [activeSection, setActiveSection] = useLocalStorage('cumplimientos_mesAnio_activeSection', 'lista');

  // Nuevo: años habilitados para area chart (map year->bool). Se inicializa cuando se selecciona entidad.
  const [enabledYears, setEnabledYears] = useLocalStorage('cumplimientos_mesAnio_enabledYears', {});

  // Nuevo: estado para animación de cierre de modales
  const [closingModalIndex, setClosingModalIndex] = useState(null);

  // Helper para cerrar modal con animación
  const closeModalWithAnimation = (modalId, callback) => {
    setClosingModalIndex(modalId);
    setTimeout(() => {
      setClosingModalIndex(null);
      callback();
    }, 300);
  };

  // Nuevo: selectores para Indicadores generales (abajo de la lista)
  const [generalYear, setGeneralYear] = useState(year);
  const [generalMonthSelection, setGeneralMonthSelection] = useLocalStorage('cumplimientos_mesAnio_generalMonth', 'Todos');

  // Nuevo: calcular meses con datos para el año seleccionado entre los resultados
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

  // Sincronizar generalYear <-> year
  useEffect(() => {
    if (generalYear !== String(year)) {
      // if generalYear changed by user, update global year
      if (generalYear !== undefined && String(generalYear) !== String(year)) setYear(String(generalYear));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generalYear]);

  useEffect(() => {
    if (String(generalYear) !== String(year)) setGeneralYear(year);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  // Mantener la vista en el componente cuando cambien filtros año/mes
  useEffect(() => {
    if (containerRef.current) {
      try {
        containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (e) {
        /* ignore */
      }
    }
  }, [year, month]);

  const handleSearch = (ev) => {
    ev && ev.preventDefault();
    const q = enteQuery.trim().toLowerCase();
    let filtered = entesList.filter(e => {
      // Ente name filter
      if (q && !e.title.toLowerCase().includes(q)) return false;
      // Year/Month filter
      const yearNum = parseInt(year, 10);
      if (month === 'Todos') {
        // check if any compliance in that year
        return e.compliances.some(c => c.year === yearNum);
      } else {
        return e.compliances.some(c => c.year === yearNum && c.month === month);
      }
    });
    filtered.sort((a, b) => a.title.localeCompare(b.title));
    setResults(filtered);
  };

  // compute suggestion list of ente names
  const enteNames = useMemo(() => entesList.map(e => e.title), [entesList]);

  // helper: map compliance status to badge color
  // expected status values: 'cumplio' | 'parcial' | 'no'
  const getBadgeVariant = (status) => {
    const s = (status || '').toString().toLowerCase();
    if (!s) return 'bg-secondary';
    if (s === 'cumplio') return 'bg-success';
    if (s === 'parcial' || s === 'partial') return 'bg-warning text-dark';
    if (s === 'no' || s === 'nocumple' || s === 'n') return 'bg-danger';
    return 'bg-secondary';
  };

  // Nuevo: calcular meses que tienen información para el año seleccionado
  const monthsWithData = useMemo(() => {
    const y = parseInt(year, 10);
    const setMonths = new Set();
    entesList.forEach(ente => {
      (ente.compliances || []).forEach(c => {
        if (c.year === y && c.month) setMonths.add(c.month);
      });
    });
    // preservar orden de months[] (omitir "Todos")
    return months.filter(m => m !== 'Todos' && setMonths.has(m));
  }, [year, entesList]);

  // Nuevo: función que genera datos para el pie de un mes dado
  const getChartDataForMonth = (monthName) => {
    const y = parseInt(year, 10);
    const counts = { cumplio: 0, parcial: 0, no: 0 };
    entesList.forEach(ente => {
      (ente.compliances || []).forEach(c => {
        if (c.year === y && c.month === monthName) {
          const s = (c.status || '').toString().toLowerCase();
          if (s === 'cumplio') counts.cumplio++;
          else if (s === 'parcial' || s === 'partial') counts.parcial++;
          else if (s === 'no' || s === 'nocumple' || s === 'n') counts.no++;
        }
      });
    });
    const data = [];
    if (counts.cumplio) data.push({ name: 'Cumplió', value: counts.cumplio, color: '#28a745' });
    if (counts.parcial) data.push({ name: 'No Cumplió', value: counts.parcial, color: '#ffc107' });
    if (counts.no) data.push({ name: 'No presentó', value: counts.no, color: '#dc3545' });
    return data;
  };

  // Helper: map abbreviation back to full month name (used in tooltips)
  const abbrToFull = Object.fromEntries(Object.keys(monthAbbr).map(k => [ (monthAbbr[k] || k).toLowerCase(), k ]));

  // Nuevo: devuelve lista de entes (id, title, classification, status) para un mes/año
  const getEntitiesForMonth = (monthName) => {
    if (!monthName) return [];
    const y = parseInt(year, 10);
    const arr = [];
    entesList.forEach(ente => {
      (ente.compliances || []).forEach(c => {
        if (c.year === y && c.month === monthName) {
          arr.push({
            id: ente.id,
            title: ente.title,
            classification: ente.classification,
            status: c.status || 'Desconocido'
          });
        }
      });
    });
    return arr;
  };

  // Abrir modal del ente (desde botón "Ver detalle" en la lista)
  const openEnteModal = (ente) => {
    setSelectedEnte(ente);
    setActiveSection('graficas');
    // inicializar enabledYears con solo el año seleccionado en el buscador
    const yearsAvailable = Array.from(new Set((ente.compliances || []).map(c => c.year))).sort((a, b) => b - a);
    const obj = {};
    const selectedYear = parseInt(year, 10);
    // activar solo el año seleccionado en el filtro del buscador
    if (yearsAvailable.includes(selectedYear)) {
      obj[selectedYear] = true;
    } else if (yearsAvailable.length > 0) {
      // si el año seleccionado no existe en el ente, activar el primer año disponible
      obj[yearsAvailable[0]] = true;
    }
    // inicializar los otros años como false
    yearsAvailable.forEach(y => {
      if (!(y in obj)) {
        obj[y] = false;
      }
    });
    setEnabledYears(obj);
    try {
      // evitar scroll del fondo cuando el modal está abierto
      document.body.style.overflow = 'hidden';
    } catch (e) {
      // ignore (SSR or restricted)
    }
  };
  const closeEnteModal = () => {
    closeModalWithAnimation('ente', () => {
      setSelectedEnte(null);
      setActiveSection('graficas');
      setEnabledYears({});
      try {
        // restore body scroll only if month modal is not open
        if (!selectedMonth) document.body.style.overflow = '';
      } catch (e) {}
    });
  };

  // Construir datos para BarChart para un ente:
  // devuelve array de 12 meses [{ month:'Ene', '2025_cumplio':2, '2025_parcial':1, '2025_no':0, '2024_cumplio':... }, ...]
  const buildBarDataForEnte = (ente) => {
    if (!ente) return [];
    // años a considerar: los habilitados (enabledYears true) o todos los años del ente
    const yearsArr = (Object.keys(enabledYears).length
      ? Object.keys(enabledYears).filter(y => enabledYears[y]).map(y => parseInt(y, 10))
      : Array.from(new Set((ente.compliances || []).map(c => c.year))).sort((a, b) => a - b)
    );

    const monthsOrder = months.filter(m => m !== 'Todos');

    return monthsOrder.map(m => {
      const row = { month: (monthAbbr[m] || m.slice(0,3)).toLowerCase() }; // ena, feb...
      yearsArr.forEach(y => {
        const comps = (ente.compliances || []).filter(c => c.year === y && c.month === m);
        // contar por estado
        const counts = { cumplio: 0, parcial: 0, no: 0 };
        comps.forEach(c => {
          const s = (c.status || '').toString().toLowerCase();
          if (s === 'cumplio') counts.cumplio++;
          else if (s === 'parcial' || s === 'partial') counts.parcial++;
          else counts.no++;
        });
        // Valores ajustados para que la barra verde (cumplio) no suba hasta el tope
        // y quede un poco por encima de la barra amarilla.
        // No => 0.2 (piso), Parcial => 0.6 (medio), Cumplio => 0.9 (arriba pero por debajo del tope)
        row[`${y}_cumplio`] = counts.cumplio ? 1.5 : 0;
        row[`${y}_parcial`] = counts.parcial ? 0.9 : 0;
        row[`${y}_no`] = counts.no ? 0.5 : 0;
      });
      return row;
    });
  };

  // Toggle año en enabledYears (asegurar al menos uno activo)
  const toggleYear = (y) => {
    const current = { ...enabledYears };
    const currentlySelected = Object.keys(current).filter(k => current[k]).length;
    const isEnabling = !current[y];
    // si intentar activar y ya hay 3 seleccionados, bloquear
    if (isEnabling && currentlySelected >= 3) {
      try { window.alert('Puede seleccionar hasta 3 años como máximo.'); } catch (e) { /* ignore */ }
      return;
    }
    // si desactivando y sería 0, evitarlo
    if (!isEnabling) {
      if (currentlySelected <= 1) return; // no permitir desactivar último
    }
    current[y] = !current[y];
    setEnabledYears(current);
  };

  // Filtrar cumplimientos del ente según enabledYears
  const getFilteredCompliancesForEnte = (ente) => {
    if (!ente) return [];
    const yearsFilter = Object.keys(enabledYears).filter(y => enabledYears[y]).map(y => parseInt(y, 10));
    return (ente.compliances || []).filter(c => yearsFilter.includes(c.year));
  };

  // Funciones para exportar
  const handleExportPDF = () => {
    if (!selectedEnte) return;
    const yearsSelected = Object.keys(enabledYears).filter(y => enabledYears[y]).sort((a, b) => b - a).join('-');
    const url = `/ExportPDFEnte?years=${encodeURIComponent(yearsSelected)}&enteIds=${encodeURIComponent(String(selectedEnte.id))}`;
    window.location.href = url;
  };

  const handleExportExcel = () => {
    if (!selectedEnte) return;
    const yearsSelected = Object.keys(enabledYears).filter(y => enabledYears[y]).sort((a, b) => b - a).join('-');
    const url = `/ExportExcelEnte?years=${encodeURIComponent(yearsSelected)}&enteIds=${encodeURIComponent(String(selectedEnte.id))}`;
    window.location.href = url;
  };

  // Funciones para exportar desde la sección de gráficas
  const handleExportPDFGraphics = () => {
    const url = `/ExportPDF?year=${encodeURIComponent(String(year))}`;
    window.location.href = url;
  };

  const handleExportExcelGraphics = () => {
    const url = `/ExportExcel?year=${encodeURIComponent(String(year))}`;
    window.location.href = url;
  };

  // Funciones para exportar mes
  const handleExportPDFMonth = () => {
    if (!selectedMonth || !year) return;
    const allEntities = getEntitiesForMonth(selectedMonth) || [];
    const enteIds = allEntities
      .filter(e => {
        const byName = modalNameQuery ? e.title.toLowerCase().includes(modalNameQuery.toLowerCase()) : true;
        const byClass = (modalClassFilter && modalClassFilter !== 'Todos') ? e.classification === modalClassFilter : true;
        return byName && byClass;
      })
      .map(e => String(e.id))
      .join('-');
    const url = `/ExportPDFMes?year=${encodeURIComponent(String(year))}&month=${encodeURIComponent(String(selectedMonth))}&enteIds=${encodeURIComponent(enteIds)}`;
    window.location.href = url;
  };

  const handleExportExcelMonth = () => {
    if (!selectedMonth || !year) return;
    const allEntities = getEntitiesForMonth(selectedMonth) || [];
    const enteIds = allEntities
      .filter(e => {
        const byName = modalNameQuery ? e.title.toLowerCase().includes(modalNameQuery.toLowerCase()) : true;
        const byClass = (modalClassFilter && modalClassFilter !== 'Todos') ? e.classification === modalClassFilter : true;
        return byName && byClass;
      })
      .map(e => String(e.id))
      .join('-');
    const url = `/ExportExcelMes?year=${encodeURIComponent(String(year))}&month=${encodeURIComponent(String(selectedMonth))}&enteIds=${encodeURIComponent(enteIds)}`;
    window.location.href = url;
  };

  // perform search dynamically whenever inputs change (design-time dynamic behavior)
  useEffect(() => {
    // debounce could be added later; for design we call immediately
    handleSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, enteQuery]);

  // Nuevo: recalcular cuando cambien los datos cargados desde API
  useEffect(() => {
    handleSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entesList]);

  useEffect(() => {
    let mounted = true;
    // Usar URL absoluta apuntando a Laragon/Apache (puerto 80)
    const apiUrl = `${window.location.protocol}//${window.location.hostname}/siret/api/entes.php`;
    fetch(apiUrl)
      .then(res => {
        if (!res.ok) throw new Error('no-api');
        return res.json();
      })
      .then(json => {
        if (!mounted) return;
        if (Array.isArray(json)) {
          setEntesList(json);
        } else {
          setEntesList(entesListFallback);
        }
      })
      .catch(() => {
        // Si falla la petición, usamos los datos locales (fallback)
        if (mounted) setEntesList(entesListFallback);
      });
    return () => { mounted = false; };
  }, []);

  // helper: obtener estado para mes/año de un ente
  const getStatusForMonthYear = (ente, monthName, yearNum) => {
    if (!ente || !ente.compliances) return null;
    const c = ente.compliances.find(x => x.year === yearNum && x.month === monthName);
    return c ? (c.status || null) : null;
  };

  // map status a color para el círculo
  const statusColor = (status) => {
    const s = (status || '').toString().toLowerCase();
    if (s === 'cumplio') return '#28a745';
    if (s === 'parcial' || s === 'partial') return '#ffc107';
    if (s === 'no' || s === 'nocumple' || s === 'n') return '#dc3545';
    return '#6c757d'; // gris para desconocido
  };

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

// Custom XAxis tick: muestra solo el mes
const CustomXAxisTick = ({ x, y, payload, windowWidth }) => {
  // Responsivo: ajustar etiquetas de meses según tamaño de ventana
  const width = windowWidth || (typeof window !== 'undefined' ? window.innerWidth : 1024);
  const isMobile = width < 480;
  const isTablet = width < 769;

  let monthLabel = abbrToFull[payload.value] || (payload.value && payload.value.toString().toUpperCase()) || payload.value;

  // "Enero" -> "Ene" en tablet -> "E" en mobile
  if (isMobile && monthLabel.length > 1) {
    monthLabel = monthLabel[0]; // Solo primera letra
  } else if (isTablet && monthLabel.length > 3) {
    monthLabel = monthLabel.substring(0, 3); // Primeras 3 letras
  }

  const fontSize = isMobile ? 10 : isTablet ? 11 : 12;

  return (
    <g transform={`translate(${x},${y + 12})`}>
      <text x={0} y={0} textAnchor="middle" fill="#666" fontSize={fontSize}>{monthLabel}</text>
    </g>
  );
};// Custom label centrado para mostrar los años seleccionados
const CustomYearsLabel = (props) => {
  const { viewBox, enabledYears } = props;
  if (!viewBox) return null;

  const yearsSelected = Object.keys(enabledYears || {}).filter(k => enabledYears[k]).map(k => k).sort((a, b) => a - b);
  const yearsText = yearsSelected.join(' | ');
  const x = viewBox.x + viewBox.width / 2;
  const y = viewBox.y + viewBox.height + 30;

  return (
    <text x={x} y={y} textAnchor="middle" fill="#666" fontSize={11} fontWeight="500">
      {yearsText}
    </text>
  );
};

// Calcular IC para un ente y año: meses que cumplió / meses transcurridos (en %)
const computeICForEnteYear = (ente, y) => {
  const yearNum = parseInt(y, 10);
  if (!ente || !ente.compliances) return null;
  const now = new Date();
  const currentYear = now.getFullYear();
  const monthsTranscurridos = yearNum === currentYear ? (now.getMonth() + 1) : 12;
  if (monthsTranscurridos === 0) return null;
  const fulfilledMonths = new Set();
  (ente.compliances || []).forEach(c => {
    if (c.year === yearNum) {
      const s = (c.status || '').toString().toLowerCase();
      if (s === 'cumplio' && c.month) {
        const idx = months.indexOf(c.month); // months array defined above (includes 'Todos' at index 0)
        if (idx >= 1 && idx <= monthsTranscurridos) fulfilledMonths.add(c.month);
      }
    }
  });
  return Math.round((fulfilledMonths.size / monthsTranscurridos) * 100);
};
useEffect(() => {
    if (setActiveSection == 'graficas'){
        setViewMode('lista');
    }
}, [activeSection, setActiveSection]);
  return (
    <div ref={containerRef} className="container-fluid px-0" style={{ background: '#f8f9fa', minHeight: '100vh' }}>
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

      <header className="text-white text-center py-5" style={{ background: 'linear-gradient(135deg, #681b32 0%, #200b07 100%)', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <h1 style={{ fontWeight: 700, marginBottom: 8 }}>ASEBCS</h1>
        <p className="lead" style={{ marginBottom: 0, opacity: 0.95 }}>Cumplimientos por Ente</p>
      </header>

      <div className="container py-5">
      <div style={{ width: '100%', marginTop: 0, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, padding: '8px', background: '#f8f9fa', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <button
            type="button"
            className="btn"
            onClick={() => setViewMode('lista')}
            style={{
              flex: 1,
              padding: '12px 20px',
              background: viewMode === 'lista' ? 'linear-gradient(135deg, #681b32 0%, #200b07 100%)' : '#fff',
              color: viewMode === 'lista' ? '#fff' : '#681b32',
              border: viewMode === 'lista' ? 'none' : '2px solid #681b32',
              borderRadius: '8px',
              fontWeight: 600,
              transition: 'all 0.3s ease',
              boxShadow: viewMode === 'lista' ? '0 4px 6px rgba(104, 27, 50, 0.3)' : 'none'
            }}
            aria-pressed={viewMode === 'lista'}
            title="Mostrar solo la lista de entes"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style={{ marginRight: 8, verticalAlign: 'middle' }}>
              <path d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/>
            </svg>
            Lista
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => setViewMode('indicadores')}
            style={{
              flex: 1,
              padding: '12px 20px',
              background: viewMode === 'indicadores' ? 'linear-gradient(135deg, #681b32 0%, #200b07 100%)' : '#fff',
              color: viewMode === 'indicadores' ? '#fff' : '#681b32',
              border: viewMode === 'indicadores' ? 'none' : '2px solid #681b32',
              borderRadius: '8px',
              fontWeight: 600,
              transition: 'all 0.3s ease',
              boxShadow: viewMode === 'indicadores' ? '0 4px 6px rgba(104, 27, 50, 0.3)' : 'none'
            }}
            aria-pressed={viewMode === 'indicadores'}
            title="Mostrar solo los indicadores"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style={{ marginRight: 8, verticalAlign: 'middle' }}>
              <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588ZM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"/>
              <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
            </svg>
            Índice
          </button>
        </div>
      </div>

      {/* LISTA: mostrar solo si viewMode es 'lista' */}
      {viewMode === 'lista' && (
        <>
        <div className="card mb-3" style={{ border: 'none', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <div className="card-body" style={{ padding: '24px' }}>
            <h6 style={{ marginBottom: 16, color: '#681b32', fontWeight: 600, fontSize: '16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
              </svg>
              Filtros de búsqueda
            </h6>
            <form className={`row g-3 ${styles.busqueda}`} onSubmit={(e)=>e.preventDefault()}>
                        <div className="col-12 col-lg-10">
                          <label className="form-label">Ente</label>
                          <input
                            className="form-control"
                            list="entes-list"
                            placeholder="Buscar ente"
                            value={enteQuery}
                            onChange={e=>setEnteQuery(e.target.value)}
                            style={{ borderRadius: '8px', padding: '10px 14px', width: '100%' }}
                          />
                          <datalist id="entes-list">{(entesList||entesListFallback).map((e,i)=>(<option key={i} value={e.title} />))}</datalist>
                        </div>
                      </form>
          </div>
        </div>


          {results.length === 0 ? (
            <p>No se encontraron entidades que cumplan ese criterio.</p>
          ) : (
            <div className="list-group">
              {results.map(r => (
                <div key={r.id} className={`list-group-item ${styles.listGroupItem}`}>
                  <div className={styles.listGroupImage}><img src={r.img} alt={r.title} style={{maxWidth:88,maxHeight:88}} onError={(e) => {e.target.style.display = 'none';}}/></div>
                  <div className={styles.listGroupContent}>
                    <h5 className={`mb-1 ${styles.listGroupTitle}`} style={{fontWeight: 700, color: '#440D1E'}}>{r.title}</h5>
                    <p className="mb-1"><small style={{fontSize: 14, color: '#6c757d'}}>{r.classification}</small></p>
                    <div className={styles.listGroupBadges}>
                      {r.compliances.filter(c => c.year === parseInt(year, 10) && (month === 'Todos' ? true : c.month === month))
                        .map((c, i) => {
                          const variant = getBadgeVariant(c.status);
                          return (<span key={i} className={`badge ${variant} me-2`} title={tipoLabels[c.status]}>{c.month} {c.year}</span>);
                        })}
                    </div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <button className={`btn btn-sm btn-magenta ${styles.listGroupButton}`} onClick={() => openEnteModal(r)}>Ver detalle</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* Modal por ENTE con secciones (Indicadores / Gráficas) siempre renderizado si hay selectedEnte */}
          {selectedEnte && (
            <div className={`modal-backdrop${closingModalIndex === 'ente' ? ' closing' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) closeEnteModal(); }} role="dialog" aria-modal="true" style={{ position: 'fixed', left: 0, top: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2600 }}>
                <div className={`modal-content${closingModalIndex === 'ente' ? ' closing' : ''}`} style={{ width: '95%', maxWidth: 1100, maxHeight: '90vh', background: '#fff', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 40px rgba(0,0,0,0.25)' }} onClick={(e)=>e.stopPropagation()}>

                  {/* HEADER CON TÍTULO Y TABS */}
                  <div style={{ background: 'linear-gradient(135deg, #681b32 0%, #200b07 100%)', color: '#fff', padding: windowWidth < 768 ? '12px 16px' : 20, paddingLeft: windowWidth < 768 ? 16 : 24, flexShrink: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <div>
                        <h5 style={{ margin: 0, fontWeight: 700, fontSize: windowWidth < 768 ? 16 : 20 }}>{selectedEnte.title}</h5>
                        {windowWidth >= 768 && (
                          <div style={{ opacity: 0.9, fontSize: 13, marginTop: 2 }}>{selectedEnte.classification || 'Sin clasificación'}</div>
                        )}
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
                      {windowWidth >= 768 && (
                        <div style={{ display: 'flex', alignItems: 'center', marginLeft: 8 }}>
                          <small style={{ opacity: 0.9 }}>IC = (Número de meses que cumplió / Número de meses transcurridos) * 100</small>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* CONTENIDO DEL MODAL - SECCIONES */}
                  <div style={{ padding: 20, background: 'linear-gradient(to bottom, #ffffff 0%, #f8f9fa 100%)', overflowY: 'auto', flex: 1 }}>

                    {/* SECCIÓN INDICADORES */}
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

                    {/* SECCIÓN GRÁFICAS */}
                    {activeSection === 'graficas' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {/* Selectores de años y IC */}
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

                        {/* Gráfico de barras */}
                        <div style={{ width: '100%', height: 320, background: '#fff', border: '1px solid #e9ecef', borderRadius: 12 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={buildBarDataForEnte(selectedEnte)}
                              margin={{ top: 10, right: 30, left: -30, bottom: 40 }}
                              barCategoryGap="20%"
                              barGap={1}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="month" tick={<CustomXAxisTick windowWidth={windowWidth} />}>
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
                                const enabled = enabledYears[y] ?? false;
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

                        {/* Tabla de cumplimientos por año */}
                        <div style={{ width: '100%', maxHeight: 340, overflowY: 'auto', marginTop: 6 }}>
                          <h6 style={{ marginTop: 6, position: 'sticky', background: '#fff', zIndex: 6, padding: '16px 0' }}>Cumplimientos por año</h6>
                          {(() => {
                            const yearsSelected = Object.keys(enabledYears).filter(y => enabledYears[y]).map(y => parseInt(y, 10)).sort((a, b) => b - a);
                            if (yearsSelected.length === 0) return <div className="text-muted">No hay años seleccionados.</div>;
                            const groups = yearsSelected.map(y => {
                              const items = (selectedEnte.compliances || []).filter(c => c.year === y);
                              const ordered = months.filter(m => m !== 'Todos').map(mn => items.find(it => it.month === mn)).filter(Boolean);
                              return { year: y, items: ordered };
                            });

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

                  {/* FOOTER CON BOTONES DE EXPORTACIÓN Y CERRAR */}
                  <div style={{ padding: windowWidth < 480 ? 12 : 16, background: '#f8f9fa', borderTop: '1px solid #e9ecef', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, gap: 8, flexWrap: windowWidth < 480 ? 'wrap' : 'nowrap' }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <a
                        href="#"
                        onClick={(e) => { e.preventDefault(); handleExportPDF(); }}
                        style={{
                          background: 'linear-gradient(135deg, #dc3545 0%, #b02a37 100%)',
                          color: '#fff',
                          border: 'none',
                          padding: windowWidth < 480 ? '6px 10px' : '8px 14px',
                          fontWeight: 600,
                          borderRadius: 8,
                          fontSize: windowWidth < 480 ? 11 : 13,
                          cursor: 'pointer',
                          boxShadow: '0 2px 6px rgba(220,53,69,0.35)',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          gap: windowWidth < 480 ? 3 : 6,
                          textDecoration: 'none',
                          whiteSpace: 'nowrap'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 10px rgba(220,53,69,0.45)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(220,53,69,0.35)'; }}
                      >
                        {windowWidth < 480 ? null : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                            <path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708l3-3z"/>
                          </svg>
                        )}
                        {windowWidth < 480 ? 'PDF' : 'Exportar PDF'}
                      </a>
                      <a
                        href="#"
                        onClick={(e) => { e.preventDefault(); handleExportExcel(); }}
                        style={{
                          background: 'linear-gradient(135deg, #14532d 0%, #0f3d21 100%)',
                          color: '#fff',
                          border: 'none',
                          padding: windowWidth < 480 ? '6px 10px' : '8px 14px',
                          fontWeight: 600,
                          borderRadius: 8,
                          fontSize: windowWidth < 480 ? 11 : 13,
                          cursor: 'pointer',
                          boxShadow: '0 2px 6px rgba(20,83,45,0.35)',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          gap: windowWidth < 480 ? 3 : 6,
                          textDecoration: 'none',
                          whiteSpace: 'nowrap'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 10px rgba(20,83,45,0.45)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(20,83,45,0.35)'; }}
                      >
                        {windowWidth < 480 ? null : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                            <path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708l3-3z"/>
                          </svg>
                        )}
                        {windowWidth < 480 ? 'Excel' : 'Exportar Excel'}
                      </a>
                    </div>
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
        </>
      )}

      {/* Indicadores generales - mostrar solo si viewMode es 'indicadores' */}
      {viewMode === 'indicadores' && (
        <div className="card mb-3" style={{ border: 'none', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <div className="card-body" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', flex: 1, minWidth: 300 }}>
                <form className={`row g-3 ${styles.busqueda}`} onSubmit={(e)=>e.preventDefault()}>
                        <div className="col-12 col-lg-9">
                          <label className="form-label">Ente</label>
                          <input
                            className="form-control"
                            list="entes-list"
                            placeholder="Buscar ente"
                            value={enteQuery}
                            onChange={e=>setEnteQuery(e.target.value)}
                            style={{ borderRadius: '8px', padding: '10px 14px', width: '180%' }}
                          />
                          <datalist id="entes-list">{(entesList||entesListFallback).map((e,i)=>(<option key={i} value={e.title} />))}</datalist>
                        </div>
                      </form>
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <a
                  href={`/ExportPDF?year=${encodeURIComponent(String(generalYear))}`}
                  style={{
                    background: 'linear-gradient(135deg, #dc3545 0%, #b02a37 100%)',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 14px',
                    fontWeight: 600,
                    borderRadius: 8,
                    fontSize: 13,
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(220,53,69,0.35)',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    textDecoration: 'none'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 10px rgba(220,53,69,0.45)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(220,53,69,0.35)'; }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                    <path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708l3-3z"/>
                  </svg>
                  Exportar PDF
                </a>
                <a
                  href={`/ExportExcel?year=${encodeURIComponent(String(generalYear))}`}
                  style={{
                    background: 'linear-gradient(135deg, #14532d 0%, #0f3d21 100%)',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 14px',
                    fontWeight: 600,
                    borderRadius: 8,
                    fontSize: 13,
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(20,83,45,0.35)',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    textDecoration: 'none'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 10px rgba(20,83,45,0.45)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(20,83,45,0.35)'; }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                    <path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708l3-3z"/>
                  </svg>
                  Exportar Excel
                </a>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <small style={{ color: '#6c757d' }}>IC = (Número de meses que cumplió / Número de meses transcurridos) * 100</small>
            </div>          <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '700px', marginTop: 12, border: '1px solid #e9ecef', borderRadius: '8px', paddingBottom: 0 }}>
            <table className="table" style={{ marginBottom: 0, fontSize: '15px' }}>
              <thead style={{ position: 'sticky', top: '-1px', zIndex: 10, background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <tr>
                  <th style={{ minWidth: 260, fontWeight: 700, fontSize: '14px' }}>Ente</th>
                  { /* columnas: meses (según selección) -- usar abreviaturas y menos padding */ }
                  {(month === 'Todos' ? monthsWithData : [month]).filter(Boolean).map(m => (
                    <th key={m} className="text-center" style={{ paddingLeft: 12, paddingRight: 12, fontWeight: 700, fontSize: '14px', minWidth: 80 }}>{monthAbbr[m] || m.slice(0,3)}</th>
                  ))}
                  {/* Columna IC al final */}
                  <th className="text-center" style={{ paddingLeft: 12, paddingRight: 12, minWidth: 90, fontWeight: 700, fontSize: '14px' }}>IC</th>
                </tr>
              </thead>
              {(() => {
                const monthsToShow = (month === 'Todos' ? monthsWithData : [month]).filter(Boolean);
                if (monthsToShow.length === 0) return <tbody />;

                // preparar datos agregados para fila IC
                const totalEntes = (results || []).length;
                const cumplioCountPerMonth = {};
                monthsToShow.forEach(m => { cumplioCountPerMonth[m] = 0; });
                const icPerEnteList = (results || []).map(ente => {
                  const denom = monthsToShow.length;
                  let cumplioCount = 0;
                  monthsToShow.forEach(m => {
                    const s = getStatusForMonthYear(ente, m, parseInt(generalYear, 10));
                    if (s && s.toString().toLowerCase() === 'cumplio') {
                      cumplioCount++;
                      cumplioCountPerMonth[m] = (cumplioCountPerMonth[m] || 0) + 1;
                    }
                  });
                  return denom > 0 ? Math.round((cumplioCount / denom) * 100) : null;
                });

                const avgIC = icPerEnteList.filter(v => v !== null).length > 0
                  ? Math.round(icPerEnteList.reduce((s, v) => s + (v || 0), 0) / icPerEnteList.filter(v => v !== null).length)
                  : null;

                return (
                  <tbody>
                    {(results || []).map((ente) => (
                      <tr key={ente.id}>
                        <td style={{ verticalAlign: 'middle', paddingTop: 14, paddingBottom: 14 }}>
                          <div>
                            <p style={{ margin: 0, fontWeight: 700, whiteSpace: 'normal', maxWidth: 520, fontSize: '15px' }}>{ente.title}</p>
                            <p style={{ margin: 0, fontSize: 13, color: '#6c757d', marginTop: 3 }}>{ente.classification || 'Sin clasificación'}</p>
                          </div>
                        </td>

                        {monthsToShow.map(mName => {
                          const status = getStatusForMonthYear(ente, mName, parseInt(generalYear, 10));
                          const color = statusColor(status);
                          return (
                            <td key={mName} className="text-center" style={{ verticalAlign: 'middle', minWidth: 80, paddingLeft: 12, paddingRight: 12, paddingTop: 14, paddingBottom: 14 }}>
                              {status ? (
                                <div title={`${status}`} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 18, background: color, color: '#fff', fontSize: 13, fontWeight: 700 }}>
                                  {status[0].toUpperCase()}
                                </div>
                              ) : (
                                <div title="Sin dato" style={{ display: 'inline-block', width: 20, height: 20, borderRadius: 10, background: '#e9ecef' }} />
                              )}
                            </td>
                          );
                        })}

                        <td className="text-center" style={{ verticalAlign: 'middle', minWidth: 90, paddingTop: 14, paddingBottom: 14 }}>
                          {/* IC por ente (ya calculado arriba como parte de icPerEnteList) */}
                          {(() => {
                            const denom = monthsToShow.length;
                            const cumplioCount = monthsToShow.reduce((acc, m) => {
                              const s = getStatusForMonthYear(ente, m, parseInt(generalYear, 10));
                              return acc + (s && s.toString().toLowerCase() === 'cumplio' ? 1 : 0);
                            }, 0);
                            const icPercent = denom > 0 ? Math.round((cumplioCount / denom) * 100) : null;
                            return icPercent !== null ? (
                              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 52, padding: '6px 10px', borderRadius: 12, background: '#28a745', color: '#fff', fontWeight: 700, fontSize: '15px' }}>
                                {icPercent}%
                              </div>
                            ) : <span className="text-muted">-</span>;
                          })()}
                        </td>
                      </tr>
                    ))}

                    {/* Fila resumen IC por mes + promedio IC */}
                    <tr style={{ background: '#f8f9fa', fontWeight: 700, fontSize: '15px' }}>
                      <td style={{ paddingTop: 14, paddingBottom: 14, fontSize: '15px', fontWeight: 700 }}>IC</td>
                      {monthsToShow.map(mName => {
                        const cnt = cumplioCountPerMonth[mName] || 0;
                        const pct = totalEntes > 0 ? Math.round((cnt / totalEntes) * 100) : null;
                        return (
                          <td key={mName} className="text-center" style={{ verticalAlign: 'middle', paddingLeft: 12, paddingRight: 12, paddingTop: 14, paddingBottom: 14, fontSize: '15px', fontWeight: 700 }}>
                            {pct !== null ? `${pct}%` : '-'}
                          </td>
                        );
                      })}
                      <td className="text-center" style={{ paddingTop: 14, paddingBottom: 14, fontSize: '15px', fontWeight: 700 }}>{avgIC !== null ? `${avgIC}%` : '-'}</td>
                    </tr>
                  </tbody>
                );
              })()}
            </table>
          </div>
          </div>
        </div>
      )}

      {/* ...existing rest of component (gráficas, modales) ... */}
      </div>
      {/* Footer */}
      <footer className="bg-dark text-white text-center py-3">
        <small>
          © {new Date().getFullYear()} Auditoría Superior del Estado - Baja California Sur
        </small>
      </footer>
    </div>
  );
}
