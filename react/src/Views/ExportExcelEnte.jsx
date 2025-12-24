import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx-js-style';
import { motion } from 'framer-motion';
import axiosClient from '../axios-client';

export default function SiretExportExcelEnte(){
  const params = new URLSearchParams(window.location.search);
  const yearsParam = (params.get('years') || '').trim();
  const enteIdsParam = (params.get('enteIds') || '').trim();
  const selectedYears = useMemo(() => {
    if (!yearsParam) return [];
    return yearsParam.split('-').map(p => Number(p)).filter(n => !isNaN(n)).sort((a,b)=>b-a);
  }, [yearsParam]);
  const selectedEnteId = useMemo(() => {
    if (!enteIdsParam) return null;
    const parts = enteIdsParam.split('-').map(p => Number(p)).filter(n => !isNaN(n));
    return parts.length ? parts[0] : null;
  }, [enteIdsParam]);

  // Data
  const [compliances, setCompliances] = useState([]);
  const [entes, setEntes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // UI
  const [sidebarVisible, setSidebarVisible] = useState(true);

  useEffect(() => {
    if (!selectedYears.length || !selectedEnteId) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [compRes, entesRes] = await Promise.all([
          axiosClient.get(`/compliances`),
          axiosClient.get(`/entes`)
        ]);
        const compData = compRes.data;
        const entesData = entesRes.data;
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
  }, [selectedYears, selectedEnteId]);

  const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const getStatusForMonthYear = (enteId, month, year) => {
    const rec = (compliances || []).find(c => Number(c.ente_id) === Number(enteId) && String(c.month) === String(month) && Number(c.year) === Number(year));
    return (rec?.status || '').toLowerCase();
  };
  const selectedEnte = useMemo(() => (entes || []).find(e => Number(e.id) === Number(selectedEnteId)) || null, [entes, selectedEnteId]);

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
            <h2 style={{ margin: 0, fontWeight: 800, letterSpacing: .5 }}>Exportación Excel</h2>
            <p style={{ margin: '4px 0 0', opacity: .9, fontSize: 16, fontWeight: 700 }}>Años: {selectedYears.length ? selectedYears.join(', ') : '—'}</p>
            {(!selectedEnteId || !selectedYears.length) && <p style={{ fontSize: 12, background: 'rgba(220,53,69,.15)', padding: '6px 8px', borderRadius: 6, fontWeight: 600 }}>Faltan parámetros years y/o enteIds.</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: .98 }} onClick={() => window.history.back()} style={{ ...btnStyle, background: '#13492f' }}>← Regresar</motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: .98 }}
                onClick={() => {
                  if (!selectedEnteId || !selectedYears.length) return;
                  const aoa = [];
                  aoa.push(['CUMPLIMIENTOS POR AÑO DEL ENTE', selectedEnte ? selectedEnte.title : '—']);
                  aoa.push([`Años: ${selectedYears.join(', ')}`, '']);
                  aoa.push([]);
                  const headerRow = ['Mes', ...selectedYears.map(y => String(y))];
                  aoa.push(headerRow);
                  months.forEach(m => {
                    const row = [m];
                    selectedYears.forEach(y => {
                      const s = getStatusForMonthYear(selectedEnteId, m, y);
                      let letter = '';
                      if (s==='cumplio') letter='C'; else if (s==='parcial') letter='P'; else if (s==='no') letter='N';
                      row.push(letter);
                    });
                    aoa.push(row);
                  });

                  const wb = XLSX.utils.book_new();
                  const ws = XLSX.utils.aoa_to_sheet(aoa);
                  ws['!merges'] = [ { s:{ r:0, c:0 }, e:{ r:0, c:1 } } ];
                  const baseBorder = { style:'thin', color:{ rgb:'FF2C3E50' } };
                  const styleForStatus = (rgb) => ({ fill:{ patternType:'solid', fgColor:{ rgb } }, alignment:{ horizontal:'center', vertical:'center' }, border:{ top:baseBorder, right:baseBorder, bottom:baseBorder, left:baseBorder } });
                  const headerStyle = { font:{ bold:true }, alignment:{ horizontal:'center', vertical:'center' }, border:{ top:baseBorder, right:baseBorder, bottom:baseBorder, left:baseBorder }, fill:{ patternType:'solid', fgColor:{ rgb:'FFEBF1EE' } } };
                  const mergedDarkStyle2 = { font:{ bold:true, color:{ rgb:'FFFFFFFF' } }, alignment:{ horizontal:'center', vertical:'center' }, border:{ top:baseBorder, right:baseBorder, bottom:baseBorder, left:baseBorder }, fill:{ patternType:'solid', fgColor:{ rgb:'FF2C3E50' } } };

                  if(ws['A1']) ws['A1'].s = mergedDarkStyle2;
                  if(ws['B1']) ws['B1'].s = mergedDarkStyle2;
                  const headerAddr = XLSX.utils.encode_cell({ r:3, c:0 }); // 'A4'
                  const headerEndAddr = XLSX.utils.encode_cell({ r:3, c:selectedYears.length });
                  const headerCols = ['A4', ...Array.from({length:selectedYears.length}, (_,i)=>XLSX.utils.encode_cell({ r:3, c:i+1 }))];
                  headerCols.forEach(addr => { if(ws[addr]) ws[addr].s = headerStyle; });

                  // Color cells for statuses with letters visible
                  for(let r=5; r<=4+months.length; r++){
                    for(let c=1; c<=selectedYears.length; c++){
                      const addr = XLSX.utils.encode_cell({ r:r-1, c:c });
                      const cell = ws[addr];
                      if(!cell) continue;
                      const v = (cell.v||'').toUpperCase();
                      let color=null;
                      if(v==='C') color='FF217346'; else if(v==='P') color='FFFFD966'; else if(v==='N') color='FFDC3545';
                      if(color){
                        cell.s = styleForStatus(color);
                        cell.s.font = { bold: true, color: { rgb: v === 'P' ? 'FF000000' : 'FFFFFFFF' } };
                      } else {
                        cell.s = { border:{ top:baseBorder, right:baseBorder, bottom:baseBorder, left:baseBorder }, alignment:{ horizontal:'center', vertical:'center' } };
                      }
                    }
                    const mesCell = XLSX.utils.encode_cell({ r:r-1, c:0 });
                    if(ws[mesCell]) ws[mesCell].s = { ...(ws[mesCell].s||{}), border:{ top:baseBorder, right:baseBorder, bottom:baseBorder, left:baseBorder } };
                  }

                  ws['!cols'] = [ { wch:18 }, ...selectedYears.map(()=>({ wch:12 })) ];
                  XLSX.utils.book_append_sheet(wb, ws, 'Por Ente');
                  XLSX.writeFile(wb, `Cumplimientos_ente_${selectedEnteId}_${selectedYears.join('-')}.xlsx`);
                }}
                style={{ ...btnStyle, background: '#217346' }}
              >
                Descargar Excel
              </motion.button>
            </div>
            <div style={{ marginTop: 'auto', fontSize: 10, opacity: .6 }}>
              <p style={{ margin: 0 }}>Nota: Los navegadores no renderizan .xlsx directamente; se muestra una conversión HTML manual.</p>
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
        {!loading && !error && selectedYears.length && selectedEnteId && (
          <motion.div initial={{ scale: .98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: .35 }} style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.08)', padding: 32 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 32 }}>
              <tbody>
                <tr>
                  <td colSpan={selectedYears.length+1} style={{ border: '1px solid #2c3e50', padding: '8px 12px', background: 'linear-gradient(135deg, #2c3e50, #34495e)', color: '#fff', fontWeight: 700, textAlign: 'center', letterSpacing: '.5px' }}>
                    {selectedEnte ? selectedEnte.title : '—'}
                  </td>
                </tr>
                <tr>
                  <td colSpan={selectedYears.length+1} style={{ border: '1px solid #2c3e50', padding: '6px 10px', background: 'linear-gradient(135deg, #2c3e50, #34495e)', color: '#fff', fontWeight: 700, textAlign: 'center', fontSize: 11 }}>
                    Años: {selectedYears.join(', ')}
                  </td>
                </tr>
                <tr>
                  <td style={{ border:'1px solid #2c3e50', padding:'8px 10px', fontWeight:700, background:'#ffffff' }}>Mes</td>
                  {selectedYears.map(y => (
                    <td key={y} style={{ border:'1px solid #2c3e50', padding:'8px 10px', fontWeight:700, textAlign:'center', background:'#ffffff' }}>{y}</td>
                  ))}
                </tr>
                {months.map(m => (
                  <tr key={m}>
                    <td style={{ border:'1px solid #2c3e50', padding:'6px 8px', fontWeight:500 }}>{m}</td>
                    {selectedYears.map(y => {
                      const s = getStatusForMonthYear(selectedEnteId, m, y);
                      let cellBg = 'transparent';
                      if (s === 'cumplio') cellBg = '#217346';
                      else if (s === 'parcial') cellBg = '#ffd966';
                      else if (s === 'no') cellBg = '#dc3545';
                      return (
                        <td key={`${m}-${y}`} style={{ border:'1px solid #2c3e50', padding:'6px 8px', textAlign:'center', background: cellBg }}></td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}
      </motion.main>
    </div>
  );
}
