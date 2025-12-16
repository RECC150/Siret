import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { motion } from 'framer-motion';

export default function SiretExportExcelEnteCom(){
  const params = new URLSearchParams(window.location.search);
  const yearsParam = (params.get('years') || '').trim();
  const enteIdsParam = (params.get('enteIds') || '').trim();

  const selectedYears = useMemo(() => {
    if (!yearsParam) return [];
    return yearsParam.split('-').map(p => Number(p)).filter(n => !isNaN(n)).sort((a,b)=>b-a);
  }, [yearsParam]);

  const enteIds = useMemo(() => {
    if (!enteIdsParam) return { left: null, right: null };
    const parts = enteIdsParam.split('-').map(p => Number(p)).filter(n => !isNaN(n));
    return { left: parts[0] ?? null, right: parts[1] ?? null };
  }, [enteIdsParam]);

  const selectedEnteIdLeft = enteIds.left;
  const selectedEnteIdRight = enteIds.right;

  // Data
  const [compliances, setCompliances] = useState([]);
  const [entes, setEntes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // UI
  const [sidebarVisible, setSidebarVisible] = useState(true);

  const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

  useEffect(() => {
    if (!selectedYears.length || (!selectedEnteIdLeft && !selectedEnteIdRight)) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [compRes, entesRes] = await Promise.all([
          fetch(`${apiBase}/compliances.php`),
          fetch(`${apiBase}/entes.php`)
        ]);
        const compData = await compRes.json();
        const entesData = await entesRes.json();
        setCompliances(Array.isArray(compData) ? compData : []);
        setEntes(Array.isArray(entesData) ? entesData : []);
      } catch (e) {
        console.error(e);
        setError('No se pudieron cargar los datos.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedYears, selectedEnteIdLeft, selectedEnteIdRight, apiBase]);

  const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  const getStatusForMonthYear = (enteId, month, year) => {
    const rec = (compliances || []).find(c => Number(c.ente_id) === Number(enteId) && String(c.month) === String(month) && Number(c.year) === Number(year));
    return (rec?.status || '').toLowerCase();
  };

  const computePercentagesForEnte = (enteId) => {
    if (!enteId) return { cumplio:0, parcial:0, no:0 };
    let totals = { cumplio:0, parcial:0, no:0 };
    selectedYears.forEach(y=>{
      (compliances||[]).filter(c=>Number(c.ente_id)===Number(enteId) && Number(c.year)===Number(y)).forEach(c=>{
        const s=(c.status||'').toString().toLowerCase();
        if (s==='cumplio') totals.cumplio++;
        else if (s==='parcial'||s==='partial') totals.parcial++;
        else totals.no++;
      });
    });
    const sum = totals.cumplio + totals.parcial + totals.no || 1;
    return {
      cumplio: Math.round((totals.cumplio / sum) * 100),
      parcial: Math.round((totals.parcial / sum) * 100),
      no: Math.round((totals.no / sum) * 100),
    };
  };

  const selectedEnteLeft = useMemo(() => (entes || []).find(e => Number(e.id) === Number(selectedEnteIdLeft)) || null, [entes, selectedEnteIdLeft]);
  const selectedEnteRight = useMemo(() => (entes || []).find(e => Number(e.id) === Number(selectedEnteIdRight)) || null, [entes, selectedEnteIdRight]);

  const sidebarWidth = 260;
  const sidebarStyle = {
    position: 'fixed', top: 0, left: 0, bottom: 0,
    width: sidebarVisible ? sidebarWidth : 0,
    background: 'linear-gradient(135deg,#217346 0%, #13492f 100%)',
    color: '#fff', overflow: 'hidden', transition: 'width .3s', zIndex: 900,
    display: 'flex', flexDirection: 'column', padding: sidebarVisible ? '24px 16px' : '0'
  };
  const innerSidebarStyle = { flex: 1, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' };
  const contentStyle = { marginLeft: sidebarVisible ? sidebarWidth : 0, transition: 'margin-left .3s', padding: 32, minHeight: '100vh', background: '#ffffff' };
  const btnStyle = { background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 16px', cursor: 'pointer', fontWeight: 700, fontSize: 14 };
  const toggleBtnStyle = { position: 'fixed', bottom: 20, left: sidebarVisible ? (sidebarWidth + 10) : 10, background: 'linear-gradient(135deg,#217346 0%, #13492f 100%)', color: '#fff', border: 'none', borderRadius: '50%', width: 50, height: 50, fontSize: 22, fontWeight: 700, cursor: 'pointer', zIndex: 1200, boxShadow: '0 4px 12px rgba(0,0,0,.3)' };

  return (
    <div style={{ fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', background: '#f8f9fa' }}>
      <motion.button style={toggleBtnStyle} onClick={() => setSidebarVisible(s => !s)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        {sidebarVisible ? '‹' : '›'}
      </motion.button>
      <motion.aside style={sidebarStyle} initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.4, ease: 'easeOut' }}>
        {sidebarVisible && (
          <div style={innerSidebarStyle}>
            <h2 style={{ margin: 0, fontWeight: 800, letterSpacing: .5 }}>Exportación Excel - Comparativa</h2>
            {selectedEnteLeft && <p style={{ margin: '4px 0 0', opacity: .9, fontSize: 14, fontWeight: 700 }}>{selectedEnteLeft.title}</p>}
            {selectedEnteRight && <p style={{ margin: '-8px 0 0', opacity: .9, fontSize: 14, fontWeight: 700 }}>{selectedEnteRight.title}</p>}
            <p style={{ margin: '-8px 0 0', opacity: .8, fontSize: 13 }}>Año: {selectedYears.length ? selectedYears.join(', ') : '—'}</p>
            {((!selectedEnteIdLeft && !selectedEnteIdRight) || !selectedYears.length) && <p style={{ fontSize: 12, background: 'rgba(220,53,69,.15)', padding: '6px 8px', borderRadius: 6, fontWeight: 600 }}>Faltan parámetros years y/o enteIds.</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: .98 }} onClick={() => window.history.back()} style={{ ...btnStyle, background: '#13492f' }}>← Regresar</motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: .98 }}
                onClick={() => {
                  if (!selectedEnteIdLeft || !selectedEnteIdRight || !selectedYears.length || !selectedEnteLeft || !selectedEnteRight) return;
                  const aoa = [];
                  aoa.push([`COMPARACIÓN: ${selectedEnteLeft.title} | ${selectedEnteRight.title}`]);
                  aoa.push([]);

                  // Headers: MES, Ente1, Ente2
                  aoa.push(['MES', selectedEnteLeft.title, selectedEnteRight.title]);

                  // Datos de meses
                  months.forEach((m) => {
                    const sLeft = getStatusForMonthYear(selectedEnteIdLeft, m, selectedYears[0]);
                    const sRight = getStatusForMonthYear(selectedEnteIdRight, m, selectedYears[0]);
                    aoa.push([m, sLeft || '-', sRight || '-']);
                  });

                  // Fila de IC
                  const pctLeftStats = computePercentagesForEnte(selectedEnteIdLeft);
                  const pctRightStats = computePercentagesForEnte(selectedEnteIdRight);
                  aoa.push(['IC TOTAL', `${pctLeftStats.cumplio}%`, `${pctRightStats.cumplio}%`]);

                  const wb = XLSX.utils.book_new();
                  const ws = XLSX.utils.aoa_to_sheet(aoa);
                  ws['!cols'] = [ { wch:18 }, { wch:25 }, { wch:25 } ];
                  XLSX.utils.book_append_sheet(wb, ws, 'Comparativa');
                  XLSX.writeFile(wb, `SIRET_comparativo_${selectedEnteIdLeft}-${selectedEnteIdRight}_${selectedYears.join('-')}.xlsx`);
                }}
                style={{ ...btnStyle, background: '#217346' }}
                disabled={loading || error || (!selectedEnteIdLeft && !selectedEnteIdRight) || !selectedYears.length}
              >
                Descargar Excel
              </motion.button>
            </div>
          </div>
        )}
      </motion.aside>
      <motion.main style={contentStyle} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .4 }}>
        {loading && (
          <motion.div initial={{ scale: .98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: .35 }} style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.08)', padding: 32, textAlign: 'center' }}>
            <p style={{ color: '#6c757d', margin: 0 }}>Cargando datos...</p>
          </motion.div>
        )}
        {error && (
          <motion.div initial={{ scale: .98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: .35 }} style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.08)', padding: 32 }}>
            <p style={{ color: '#dc3545', fontWeight: 600, margin: 0 }}>{error}</p>
          </motion.div>
        )}
        {!loading && !error && selectedYears.length && selectedEnteIdLeft && selectedEnteIdRight && selectedEnteLeft && selectedEnteRight && (
          <motion.div initial={{ scale: .98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: .35 }} style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.08)', padding: 32, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 32 }}>
              <tbody>
                <tr>
                  <td colSpan={3} style={{ border: '1px solid #2c3e50', padding: '8px 12px', background: 'linear-gradient(135deg, #2c3e50, #34495e)', color: '#fff', fontWeight: 700, textAlign: 'center', letterSpacing: '.5px' }}>
                    COMPARACIÓN: {selectedEnteLeft?.title || '—'} | {selectedEnteRight?.title || '—'}
                  </td>
                </tr>
                <tr>
                  <td style={{ border:'1px solid #2c3e50', padding:'8px 10px', fontWeight:700, background:'#ffffff' }}>MES</td>
                  <td style={{ border:'1px solid #2c3e50', padding:'8px 10px', fontWeight:700, textAlign:'center', background:'#ffffff' }}>{selectedEnteLeft?.title}</td>
                  <td style={{ border:'1px solid #2c3e50', padding:'8px 10px', fontWeight:700, textAlign:'center', background:'#ffffff' }}>{selectedEnteRight?.title}</td>
                </tr>
                {months.map(m => {
                  const sLeft = getStatusForMonthYear(selectedEnteIdLeft, m, selectedYears[0]);
                  const sRight = getStatusForMonthYear(selectedEnteIdRight, m, selectedYears[0]);
                  let cellBgLeft = 'transparent', cellBgRight = 'transparent';
                  if (sLeft === 'cumplio') cellBgLeft = '#217346';
                  else if (sLeft === 'parcial') cellBgLeft = '#ffd966';
                  else if (sLeft === 'no') cellBgLeft = '#dc3545';
                  if (sRight === 'cumplio') cellBgRight = '#217346';
                  else if (sRight === 'parcial') cellBgRight = '#ffd966';
                  else if (sRight === 'no') cellBgRight = '#dc3545';
                  return (
                    <tr key={m}>
                      <td style={{ border:'1px solid #2c3e50', padding:'6px 8px', fontWeight:500 }}>{m}</td>
                      <td style={{ border:'1px solid #2c3e50', padding:'6px 8px', textAlign:'center', background: cellBgLeft }}></td>
                      <td style={{ border:'1px solid #2c3e50', padding:'6px 8px', textAlign:'center', background: cellBgRight }}></td>
                    </tr>
                  );
                })}
                <tr>
                  <td style={{ border:'1px solid #2c3e50', padding:'8px 10px', fontWeight:700, background:'#2c3e50', color:'#fff' }}>IC TOTAL</td>
                  <td style={{ border:'1px solid #2c3e50', padding:'8px 10px', fontWeight:700, textAlign:'center', background:'#2c3e50', color:'#fff' }}>{computePercentagesForEnte(selectedEnteIdLeft).cumplio}%</td>
                  <td style={{ border:'1px solid #2c3e50', padding:'8px 10px', fontWeight:700, textAlign:'center', background:'#2c3e50', color:'#fff' }}>{computePercentagesForEnte(selectedEnteIdRight).cumplio}%</td>
                </tr>
              </tbody>
            </table>
          </motion.div>
        )}
      </motion.main>
    </div>
  );
}



