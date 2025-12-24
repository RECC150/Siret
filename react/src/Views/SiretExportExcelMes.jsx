import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx-js-style';
import { motion } from 'framer-motion';
import axiosClient from '../axios-client';

export default function SiretExportExcelMes(){
    const params = new URLSearchParams(window.location.search);
    const year = params.get('year');
    const month = params.get('month');
    const qParam = (params.get('q') || '').trim();
    const clasifParam = (params.get('clasif') || '').trim();
    const enteIdsParam = (params.get('enteIds') || '').trim();
    const enteIdsSet = useMemo(() => {
        if(!enteIdsParam) return null;
        const parts = enteIdsParam.split('-').map(p => Number(p)).filter(n => !isNaN(n));
        return new Set(parts);
    }, [enteIdsParam]);

    // Data
    const [compliances, setCompliances] = useState([]);
    const [entes, setEntes] = useState([]);
    const [entesActivos, setEntesActivos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // UI
    const [sidebarVisible, setSidebarVisible] = useState(true);

    useEffect(() => {
        if (!year || !month) return;
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const [compRes, entesRes, activosRes] = await Promise.all([
                    axiosClient.get(`/compliances`),
                    axiosClient.get(`/entes`),
                    axiosClient.get(`/entes-activos?year=${encodeURIComponent(year)}`)
                ]);
                const compData = compRes.data;
                const entesData = entesRes.data;
                const activosData = activosRes.data;

                setCompliances(Array.isArray(compData) ? compData.filter(c => String(c.year) === String(year) && c.month === month) : []);
                setEntes(Array.isArray(entesData) ? entesData : []);
                setEntesActivos(Array.isArray(activosData) ? activosData : []);
            } catch (e) {
                console.error(e);
                setError('No se pudieron cargar los datos.');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [year, month]);

    // Calcular estadísticas del mes
    const monthStats = useMemo(() => {
        const counts = { cumplio: 0, parcial: 0, no: 0 };
        compliances.forEach(c => {
            const s = (c.status || '').toLowerCase();
            if (s === 'cumplio') counts.cumplio++;
            else if (s === 'parcial') counts.parcial++;
            else if (s === 'no') counts.no++;
        });
        const total = counts.cumplio + counts.parcial + counts.no;
        const ic = total > 0 ? ((counts.cumplio / total) * 100).toFixed(1) : '0.0';
        return { ic, total, cumplio: counts.cumplio, parcial: counts.parcial, no: counts.no };
    }, [compliances]);

    // Construir tabla de entes con sus estados
    const entesTable = useMemo(() => {
        const activesSet = new Set(entesActivos.map(e => Number(e.ente_id)));
        const statusByEnte = new Map();
        compliances.forEach(c => {
            statusByEnte.set(Number(c.ente_id), (c.status || '').toLowerCase());
        });
        let list = entes.filter(e => activesSet.has(Number(e.id))).map(e => ({
            id: e.id,
            ente: e.title || '',
            clasificacion: e.classification || 'Sin clasificación',
            status: statusByEnte.get(Number(e.id)) || null
        }));
        // Aplicar filtro por IDs si vienen
        if(enteIdsSet && enteIdsSet.size){
            list = list.filter(r => enteIdsSet.has(Number(r.id)));
        } else {
            // Si no hay lista explícita, aplicar búsqueda y clasificación si se enviaron
            if(qParam){
                const qLower = qParam.toLowerCase();
                list = list.filter(r => r.ente.toLowerCase().includes(qLower));
            }
            if(clasifParam && clasifParam !== 'Todos'){
                list = list.filter(r => r.clasificacion === clasifParam);
            }
        }
        return list.sort((a,b) => a.ente.localeCompare(b.ente));
    }, [entes, entesActivos, compliances, enteIdsSet, qParam, clasifParam]);

    // Colores institucionales (match Excel export)
    const COLORS = {
        cumplio: '#217346', // verde excel
        parcial: '#ffd966', // amarillo excel
        no: '#dc3545'       // rojo
    };

    const sidebarWidth = 260;
    const sidebarStyle = {
        position: 'fixed', top: 0, left: 0, bottom: 0,
        width: sidebarVisible ? sidebarWidth : 0,
        background: 'linear-gradient(135deg,#217346 0%, #13492f 100%)',
        color: '#fff',
        overflow: 'hidden', transition: 'width .3s', zIndex: 900,
        display: 'flex', flexDirection: 'column', padding: sidebarVisible ? '24px 16px' : '0'
    };
    const innerSidebarStyle = { flex: 1, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' };
    const contentStyle = { marginLeft: sidebarVisible ? sidebarWidth : 0, transition: 'margin-left .3s', padding: 32, minHeight: '100vh', background: '#ffffff' };
    const btnStyle = { background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 16px', cursor: 'pointer', fontWeight: 700, fontSize: 14 };
    const toggleBtnStyle = { position: 'fixed', bottom: 20, left: sidebarVisible ? (sidebarWidth + 10) : 10, background: 'linear-gradient(135deg,#217346 0%, #13492f 100%)', color: '#fff', border: 'none', borderRadius: '50%', width: 50, height: 50, fontSize: 22, fontWeight: 700, cursor: 'pointer', zIndex: 1200, boxShadow: '0 4px 12px rgba(0,0,0,.3)' };

    const hideNavbarStyle = `
    .navbar { display: none !important; }
  `;

    return (
        <div style={{ fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', background: '#f8f9fa' }}>
            <style>{hideNavbarStyle}</style>
            <motion.button
                style={toggleBtnStyle}
                onClick={() => setSidebarVisible(s => !s)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                {sidebarVisible ? '‹' : '›'}
            </motion.button>
            <motion.aside
                style={sidebarStyle}
                initial={{ x: -40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
            >
                {sidebarVisible && (
                    <div style={innerSidebarStyle}>
                        <h2 style={{ margin: 0, fontWeight: 800, letterSpacing: .5 }}>Exportación Excel</h2>
                        <p style={{ margin: '4px 0 0', opacity: .9, fontSize: 16, fontWeight: 700 }}>{month || '—'} {year || '—'}</p>
                        {(!year || !month) && <p style={{ fontSize: 12, background: 'rgba(220,53,69,.15)', padding: '6px 8px', borderRadius: 6, fontWeight: 600 }}>Faltan parámetros year y/o month.</p>}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: .98 }} onClick={() => window.history.back()} style={{ ...btnStyle, background: '#13492f' }}>
                                ← Regresar
                            </motion.button>
                                                        <motion.button
                                                            whileHover={{ scale: 1.02 }}
                                                            whileTap={{ scale: .98 }}
                                                            onClick={() => {
                                                                // Datos con diseño similar a SiretExportExcel
                                                                const aoa = [
                                                                    [`${month} ${year}`, '', ''],
                                                                    [`IC: ${monthStats.ic}% | Entes: ${entesTable.length}`, '', ''],
                                                                    [`Cumplió: ${monthStats.cumplio} | No cumplió: ${monthStats.parcial} | No presentó: ${monthStats.no}`, '', ''],
                                                                    [],
                                                                    ['Ente','Clasificación','Estado']
                                                                ];
                                                                entesTable.forEach(r => {
                                                                    let letter='';
                                                                    if(r.status==='cumplio') letter='C';
                                                                    else if(r.status==='parcial') letter='P';
                                                                    else if(r.status==='no') letter='N';
                                                                    aoa.push([r.ente, r.clasificacion, letter]);
                                                                });

                                                                const wb = XLSX.utils.book_new();
                                                                const ws = XLSX.utils.aoa_to_sheet(aoa);

                                                                // Merges para filas 0-2 (A:C) y fila 3 vacía (A:C) y título leyenda no (estilo año)
                                                                ws['!merges'] = [
                                                                    { s:{ r:0, c:0 }, e:{ r:0, c:2 } },
                                                                    { s:{ r:1, c:0 }, e:{ r:1, c:2 } },
                                                                    { s:{ r:2, c:0 }, e:{ r:2, c:2 } },
                                                                    { s:{ r:3, c:0 }, e:{ r:3, c:2 } }
                                                                ];

                                                                const baseBorder = { style:'thin', color:{ rgb:'FF2C3E50' } };
                                                                const styleForStatus = (rgb) => ({
                                                                    fill:{ patternType:'solid', fgColor:{ rgb } },
                                                                    alignment:{ horizontal:'center', vertical:'center' },
                                                                    border:{ top:baseBorder, right:baseBorder, bottom:baseBorder, left:baseBorder }
                                                                });
                                                                const headerStyle = {
                                                                    font:{ bold:true },
                                                                    alignment:{ horizontal:'center', vertical:'center' },
                                                                    border:{ top:baseBorder, right:baseBorder, bottom:baseBorder, left:baseBorder },
                                                                    fill:{ patternType:'solid', fgColor:{ rgb:'FFEBF1EE' } }
                                                                };
                                                                const mergedDarkStyle = {
                                                                    font:{ bold:true, color:{ rgb:'FFFFFFFF' } },
                                                                    alignment:{ horizontal:'center', vertical:'center' },
                                                                    border:{ top:baseBorder, right:baseBorder, bottom:baseBorder, left:baseBorder },
                                                                    fill:{ patternType:'solid', fgColor:{ rgb:'FF217346' } }
                                                                };
                                                                const mergedDarkStyle2 = {
                                                                    font:{ bold:true, color:{ rgb:'FFFFFFFF' } },
                                                                    alignment:{ horizontal:'center', vertical:'center' },
                                                                    border:{ top:baseBorder, right:baseBorder, bottom:baseBorder, left:baseBorder },
                                                                    fill:{ patternType:'solid', fgColor:{ rgb:'FF2C3E50' } }
                                                                };
                                                                const statsStyle = {
                                                                    font:{ bold:true, color:{ rgb:'FF2C3E50' } },
                                                                    alignment:{ horizontal:'center', vertical:'center' },
                                                                    border:{ top:baseBorder, right:baseBorder, bottom:baseBorder, left:baseBorder },
                                                                    fill:{ patternType:'solid', fgColor:{ rgb:'FFF8F9FA' } }
                                                                };

                                                                // Aplicar estilos merges
                                                                if(ws['A1']) ws['A1'].s = mergedDarkStyle2; // titulo
                                                                if(ws['A2']) ws['A2'].s = mergedDarkStyle2; // IC y entes
                                                                if(ws['A3']) ws['A3'].s = statsStyle; // resumen estadísticas
                                                                if(ws['A4']) ws['A4'].s = { font:{}, alignment:{}, border:{ top:baseBorder, right:baseBorder, bottom:baseBorder, left:baseBorder } }; // fila vacía

                                                                // Encabezado (fila 5 en Excel => index 4 en 0-based aoa)
                                                                ['A5','B5','C5'].forEach(addr => { if(ws[addr]) ws[addr].s = headerStyle; });

                                                                // Estados coloreados con letras visibles
                                                                const lastRow = aoa.length;
                                                                for(let r=6; r<=lastRow; r++){ // desde primera fila de datos
                                                                    const addr = `C${r}`;
                                                                    const cell = ws[addr];
                                                                    if(!cell) continue;
                                                                    const v = (cell.v||'').toUpperCase();
                                                                    let color=null;
                                                                    if(v==='C') color='FF217346';
                                                                    else if(v==='P') color='FFFFD966';
                                                                    else if(v==='N') color='FFDC3545';
                                                                    if(color){
                                                                        cell.s = styleForStatus(color);
                                                                        cell.s.font = { bold: true, color: { rgb: v === 'P' ? 'FF000000' : 'FFFFFFFF' } };
                                                                    } else {
                                                                        cell.s = { border:{ top:baseBorder, right:baseBorder, bottom:baseBorder, left:baseBorder }, alignment:{ horizontal:'center', vertical:'center' } };
                                                                    }
                                                                }
                                                                // Bordes y alineación columnas A y B
                                                                for(let r=6; r<=lastRow; r++){
                                                                    ['A','B'].forEach(col => {
                                                                        const addr = `${col}${r}`;
                                                                        const cell = ws[addr];
                                                                        if(cell){
                                                                            cell.s = { ...(cell.s||{}), border:{ top:baseBorder, right:baseBorder, bottom:baseBorder, left:baseBorder }, alignment:{ horizontal:'left', vertical:'center' } };
                                                                        }
                                                                    });
                                                                }

                                                                // Anchos solicitados (Excel col width 64.88 -> ~chars; also wpx):
                                                                ws['!cols'] = [
                                                                    { wch:64.88, wpx:524 },
                                                                    { wch:54.38, wpx:440 },
                                                                    { wch:12, wpx:120 }
                                                                ];

                                                                XLSX.utils.book_append_sheet(wb, ws, 'Mes');
                                                                XLSX.writeFile(wb, `Cumplimiento_${year}_${month}.xlsx`);
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
                {!loading && !error && year && month && (
                    <motion.div initial={{ scale: .98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: .35 }} style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.08)', padding: 32 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 32 }}>
                            <tbody>
                                {/* Fila 0: Título mes y año */}
                                <tr>
                                    <td colSpan={3} style={{
                                        border: '1px solid #2c3e50',
                                        padding: '8px 12px',
                                        background: 'linear-gradient(135deg, #2c3e50, #34495e)',
                                        color: '#fff',
                                        fontWeight: 700,
                                        textAlign: 'center',
                                        letterSpacing: '.5px'
                                    }}>
                                        {month} {year}
                                    </td>
                                </tr>
                                {/* Fila 1: IC y cantidad de entes */}
                                <tr>
                                    <td colSpan={3} style={{
                                        border: '1px solid #2c3e50',
                                        padding: '6px 10px',
                                        background: 'linear-gradient(135deg, #2c3e50, #34495e)',
                                        color: '#fff',
                                        fontWeight: 700,
                                        textAlign: 'center',
                                        fontSize: 11
                                    }}>
                                        IC: {monthStats.ic}%  |  Entes: {entesTable.length}
                                    </td>
                                </tr>
                                {/* Fila 2: Totales por estado combinados en una celda */}
                                <tr>
                                    <td colSpan={3} style={{
                                        border: '1px solid #2c3e50',
                                        padding: '8px 12px',
                                        textAlign: 'center',
                                        fontWeight: 600,
                                        fontSize: 11,
                                        background: '#f8f9fa'
                                    }}>
                                        Cumplió: {monthStats.cumplio}  |  No cumplió: {monthStats.parcial}  |  No presentó: {monthStats.no}
                                    </td>
                                </tr>
                                {/* Header tabla final simple */}
                                <tr>
                                    <td style={{ border:'1px solid #2c3e50', padding:'8px 10px', fontWeight:700, background:'#ffffff' }}>Ente</td>
                                    <td style={{ border:'1px solid #2c3e50', padding:'8px 10px', fontWeight:700, background:'#ffffff' }}>Clasificación</td>
                                    <td style={{ border:'1px solid #2c3e50', padding:'8px 10px', fontWeight:700, textAlign:'center', background:'#ffffff' }}>Estado</td>
                                </tr>
                                {/* Filas de datos */}
                                {entesTable.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} style={{ border:'1px solid #2c3e50', padding:30, textAlign:'center', color:'#6c757d' }}>No hay entes para mostrar</td>
                                    </tr>
                                ) : (
                                    entesTable.map(row => {
                                        let cellBg = 'transparent';
                                        if (row.status === 'cumplio') cellBg = COLORS.cumplio;
                                        else if (row.status === 'parcial') cellBg = COLORS.parcial;
                                        else if (row.status === 'no') cellBg = COLORS.no;
                                        return (
                                            <tr key={row.id}>
                                                <td style={{ border:'1px solid #2c3e50', padding:'6px 8px', fontWeight:500 }}>{row.ente}</td>
                                                <td style={{ border:'1px solid #2c3e50', padding:'6px 8px', color:'#444' }}>{row.clasificacion}</td>
                                                <td style={{ border:'1px solid #2c3e50', padding:'6px 8px', textAlign:'center', background: cellBg }}></td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </motion.div>
                )}
            </motion.main>
        </div>
    );
}
