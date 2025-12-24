import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import * as XLSX from 'xlsx-js-style';
import axiosClient from '../axios-client';

// Componente de exportación a Excel con vista previa HTML
export default function SiretExportExcel(){
	const params = new URLSearchParams(window.location.search);
	const yearsParam = params.get('years'); // "2033-2034-2035"
	const monthsParam = params.get('months'); // "Todos" o "Enero-Febrero-Marzo"
	const years = yearsParam ? yearsParam.split('-').map(y => parseInt(y, 10)) : [];
	const selectedMonths = monthsParam && monthsParam !== 'Todos' ? monthsParam.split('-') : [];

	// Datos base
	const [excelUrl, setExcelUrl] = useState(null);
	const [previewData, setPreviewData] = useState([]);
	const [error, setError] = useState(null);

    // UI
    const [sidebarVisible, setSidebarVisible] = useState(true);

	useEffect(() => {
		if (years.length === 0) return;
		setError(null);

		const load = async () => {
			try {
				const [compRes, entesRes] = await Promise.all([
				axiosClient.get(`/compliances`),
				axiosClient.get(`/entes`)
				]);
				const compData = compRes.data;
				const entesData = entesRes.data;

				// Filtrar cumplimientos por años seleccionados
				let filtered = Array.isArray(compData)
					? compData.filter(c => years.includes(parseInt(c.year, 10)))
					: [];

				// Si se seleccionaron meses específicos, filtrar también por meses
				if (selectedMonths.length > 0) {
					filtered = filtered.filter(c => selectedMonths.includes(c.month));
				}

				// Generar Excel con los datos cargados
				generarExcel(filtered, Array.isArray(entesData) ? entesData : []);
            } catch (e) {
                console.error(e);
                setError('No se pudieron cargar los datos.');
            }
        };
        load();
    }, [years, selectedMonths]);

	const monthsOrder = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
	const monthsShort = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

    // Generar workbook (recibe datos como parámetros)
	const generarExcel = (compliancesData, entesData) => {
		setExcelUrl(null);
		setPreviewData([]);

		const wb = XLSX.utils.book_new();

		// ===== HOJA RESUMEN =====
		// Agrupar datos por año y clasificación
		const resumenPorAno = {};
		years.forEach(year => {
			const compYear = compliancesData.filter(c => parseInt(c.year, 10) === year);
			const entesIdsYear = new Set(compYear.map(c => c.ente_id));
			const entesActivosYear = entesData.filter(e => entesIdsYear.has(e.id));

			// Agrupar por clasificación
			const clasificaciones = {};
			entesActivosYear.forEach(ente => {
				const cl = ente.classification || 'Sin clasificación';
				if (!clasificaciones[cl]) {
					clasificaciones[cl] = { cumplio: 0, parcial: 0, no: 0, total: 0 };
				}

				// Contar registros por status
				const entePorStatus = compYear.filter(c => c.ente_id === ente.id);
				entePorStatus.forEach(comp => {
					const st = (comp.status || '').toLowerCase();
					if (st === 'cumplio') clasificaciones[cl].cumplio++;
					else if (st === 'parcial') clasificaciones[cl].parcial++;
					else if (st === 'no') clasificaciones[cl].no++;
					clasificaciones[cl].total++;
				});
			});

			resumenPorAno[year] = { clasificaciones, entesActivos: entesActivosYear.length, compYear };
		});

		// Para cada año, crear hoja de resumen
		years.forEach(year => {
			const yearData = resumenPorAno[year];
			const { clasificaciones, entesActivos, compYear } = yearData;

			// Estadísticas globales
			let totalCumplio = 0, totalParcial = 0, totalNo = 0, totalRegistros = 0;
			Object.values(clasificaciones).forEach(cl => {
				totalCumplio += cl.cumplio;
				totalParcial += cl.parcial;
				totalNo += cl.no;
				totalRegistros += cl.total;
			});

			const icGlobal = totalRegistros > 0 ? ((totalCumplio / totalRegistros) * 100).toFixed(2) : '0.00';
			const pctCumplio = totalRegistros > 0 ? ((totalCumplio / totalRegistros) * 100).toFixed(2) : '0.00';
			const pctParcial = totalRegistros > 0 ? ((totalParcial / totalRegistros) * 100).toFixed(2) : '0.00';
			const pctNo = totalRegistros > 0 ? ((totalNo / totalRegistros) * 100).toFixed(2) : '0.00';

			// Construir AOA para resumen
			const resumenAOA = [
				['AUDITORÍA SUPERIOR DEL ESTADO DE BAJA CALIFORNIA SUR'],
				['SISTEMA DE INFORMACIÓN DE REPORTES DE CUMPLIMIENTO'],
				[`Año: ${year}`],
				[],
				['RESUMEN ESTADÍSTICO'],
				[`IC Global: ${icGlobal}%`],
				[`Cumplió: ${pctCumplio}%`],
				[`Parcial: ${pctParcial}%`],
				[`No Presentó: ${pctNo}%`],
				[`Entes activos: ${entesActivos}`],
				[],
				['RESUMEN'],
				['Clasificación', 'Cumplió', 'No Cumplió', 'No Presentó', 'IC']
			];

			// Agregar filas por clasificación
			Object.entries(clasificaciones).forEach(([cl, stats]) => {
				const ic = stats.total > 0 ? ((stats.cumplio / stats.total) * 100).toFixed(2) : '0.00';
				resumenAOA.push([cl, stats.cumplio, stats.parcial, stats.no, `${ic}%`]);
			});

			// Crear hoja
			const wsResumen = XLSX.utils.aoa_to_sheet(resumenAOA);
			XLSX.utils.book_append_sheet(wb, wsResumen, `Resumen ${year}`);
		});

		// ===== HOJAS DE GENERAL POR AÑO =====
		const yearSheets = [];
		const usedSheetNames = new Set();
		years.forEach(year => usedSheetNames.add(`Resumen ${year}`));

		years.forEach((year) => {
			const compliancesYear = compliancesData.filter(c => parseInt(c.year, 10) === year);

			// Obtener entes activos en este año
			const entesIdsYear = new Set(compliancesYear.map(c => c.ente_id));
			const entesActivos = entesData.filter(e => entesIdsYear.has(e.id));
			const cantidadEntesAno = entesActivos.length;

			const yearAOA = [
				['TABLA GENERAL DE CUMPLIMIENTO - ENTES ACTIVOS', `Año: ${year}`],
				[`Entes activos: ${cantidadEntesAno}`],
				[],
				['LEYENDA: Verde = Cumplió; Amarillo = Parcial; Rojo = No presentó'],
				[],
				['Ente', ...monthsShort, 'IC']
			];

			entesActivos.forEach(ente => {
				let cumplidos = 0;
				let posibles = 0;
				const line = [ente.title];

				monthsShort.forEach((ms, idx) => {
					const monthName = monthsOrder[idx];
					const comp = compliancesYear.find(c => c.ente_id === ente.id && c.month === monthName);
					const status = comp ? (comp.status || '').toLowerCase() : null;
					let cell = '';

					if(status) {
						posibles++;
						if(status === 'cumplio') {
							cumplidos++;
							cell = 'C';
						} else if(status === 'parcial') {
							cell = 'P';
						} else if(status === 'no') {
							cell = 'N';
						}
					}
					line.push(cell);
				});

				const icEnte = posibles ? ((cumplidos/posibles)*100).toFixed(2) : '0.00';
				line.push(`${icEnte}%`);
				yearAOA.push(line);
			});

			// Fila IC por mes
			const icRowYear = ['IC'];
			monthsShort.forEach((ms, idx) => {
				const monthName = monthsOrder[idx];
				let cum = 0, pos = 0;

				entesActivos.forEach(ente => {
					const comp = compliancesYear.find(c => c.ente_id === ente.id && c.month === monthName);
					const status = comp ? (comp.status || '').toLowerCase() : null;
					if(status) {
						pos++;
						if(status === 'cumplio') cum++;
					}
				});
				icRowYear.push(pos ? ((cum/pos)*100).toFixed(2)+'%' : '0.00%');
			});

			const totalRegYear = compliancesYear.length;
			const totalCumpYear = compliancesYear.filter(c => (c.status || '').toLowerCase() === 'cumplio').length;
			const icGlobalYear = totalRegYear > 0 ? ((totalCumpYear / totalRegYear) * 100).toFixed(2) : '0.00';
			icRowYear.push(icGlobalYear+'%');
			yearAOA.push(icRowYear);

			// Crear hoja
			const wsYear = XLSX.utils.aoa_to_sheet(yearAOA);
			wsYear['!cols'] = [{ wch: 62.86 }];

			let sheetName = `General ${year}`;
			let counter = 1;
			while(usedSheetNames.has(sheetName)) {
				sheetName = `General ${year} (${counter})`;
				counter++;
			}
			usedSheetNames.add(sheetName);

			XLSX.utils.book_append_sheet(wb, wsYear, sheetName);
			yearSheets.push({ name: sheetName, type:'year', aoa: yearAOA, year });
		});

		// Escribir blob
		const wbout = XLSX.write(wb, { bookType:'xlsx', type:'array' });
		const blob = new Blob([wbout], { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
		const url = URL.createObjectURL(blob);
        setExcelUrl(url);

		// Preview - Construir array con Resumen primero, luego General
		const previewSheets = [];
		years.forEach(year => {
			const yearData = resumenPorAno[year];
			const { clasificaciones, entesActivos, compYear } = yearData;

			// Estadísticas globales para resumen
			let totalCumplio = 0, totalParcial = 0, totalNo = 0, totalRegistros = 0;
			Object.values(clasificaciones).forEach(cl => {
				totalCumplio += cl.cumplio;
				totalParcial += cl.parcial;
				totalNo += cl.no;
				totalRegistros += cl.total;
			});

			const icGlobal = totalRegistros > 0 ? ((totalCumplio / totalRegistros) * 100).toFixed(2) : '0.00';
			const pctCumplio = totalRegistros > 0 ? ((totalCumplio / totalRegistros) * 100).toFixed(2) : '0.00';
			const pctParcial = totalRegistros > 0 ? ((totalParcial / totalRegistros) * 100).toFixed(2) : '0.00';
			const pctNo = totalRegistros > 0 ? ((totalNo / totalRegistros) * 100).toFixed(2) : '0.00';

			// AOA para resumen
			const resumenAOA = [
				['AUDITORÍA SUPERIOR DEL ESTADO DE BAJA CALIFORNIA SUR'],
				['SISTEMA DE INFORMACIÓN DE REPORTES DE CUMPLIMIENTO'],
				[`Año: ${year}`],
				[],
				['RESUMEN ESTADÍSTICO'],
				[`IC Global: ${icGlobal}%`],
				[`Cumplió: ${pctCumplio}%`],
				[`Parcial: ${pctParcial}%`],
				[`No Presentó: ${pctNo}%`],
				[`Entes activos: ${entesActivos}`],
				[],
				['RESUMEN'],
				['Clasificación', 'Cumplió', 'No Cumplió', 'No Presentó', 'IC']
			];

			// Agregar filas por clasificación
			Object.entries(clasificaciones).forEach(([cl, stats]) => {
				const ic = stats.total > 0 ? ((stats.cumplio / stats.total) * 100).toFixed(2) : '0.00';
				resumenAOA.push([cl, stats.cumplio, stats.parcial, stats.no, `${ic}%`]);
			});

			previewSheets.push({ name: `Resumen ${year}`, type:'resumen', aoa: resumenAOA, year });
		});

		// Agregar hojas General
		previewSheets.push(...yearSheets);
		setPreviewData(previewSheets);
    };

    const handleDescargar = () => {
        if(!excelUrl) return;
        const a=document.createElement('a');
        a.href=excelUrl; a.download=`cumplimientos_${years.join('-')}.xlsx`; a.click();
    };

	// Colores institucionales
	const COLORS = {
		cumplio: '#217346', // verde
		parcial: '#ffd966', // amarillo
		no: '#dc3545'       // rojo
	};

	// Render helper for AOA -> table with color cells when letters C/P/N
	const renderAOATable = (sheet) => {
		const aoa = sheet.aoa;
		const isMatrix = sheet.type === 'year';
		const isResumen = sheet.type === 'resumen';
		return (
			<table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, marginBottom:32 }}>
				<tbody>
					{aoa.map((row,i) => {
						// Determinar si esta fila debe ocupar todas las columnas (merge)
						let colSpan = 1;
						let shouldMerge = false;

					// Para Resumen: filas 0,1,2,4,5,6,7,8,9,11 ocupan todo el ancho
					if(isResumen && (i===0||i===1||i===2||i===4||i===5||i===6||i===7||i===8||i===9||i===11)){
						shouldMerge = true;
						colSpan = 5; // 5 columnas: Clasificación, Cumplió, No Cumplió, No Presentó, IC
					}
						// Para Year: fila 0 (título), 1 (cantidad entes), 3 (leyenda) ocupan todo el ancho
						if(isMatrix && (i===0||i===1||i===3)){
							shouldMerge = true;
							colSpan = 14; // 1 ente + 12 meses + 1 IC
						}

						return (
							<tr key={i}>
								{shouldMerge ? (
									// Renderizar una sola celda con colSpan
									<td colSpan={colSpan} style={{
								border:'1px solid #2c3e50',
								padding:'6px 8px',
								background: isResumen && (i===0||i===1||i===2||i===4||i===11) ? 'linear-gradient(135deg,#217346,#13492f)' :
											isResumen && (i===5||i===6||i===7||i===8||i===9) ? '#fff' :
											isMatrix && (i===0||i===1) ? 'linear-gradient(135deg,#2c3e50,#34495e)' :
											'transparent',
								color: (isResumen && (i===0||i===1||i===2||i===4||i===11)) ||
									   (isMatrix && (i===0||i===1)) ? '#fff' : '#222',
								fontWeight: 700,
								textAlign: 'center'
									}}>{row[0]}</td>
								) : (
									// Renderizar celdas normales
									row.map((cell,j) => {
										let bg='transparent'; let color='#222'; let fontWeight=400;

									// Header row styling para resumen (sin fondo verde)
									if(isResumen && i===12){ fontWeight=700; bg='transparent'; }
									// Header row styling para matrices
										if(isMatrix && i===5){ fontWeight=700; bg='#e8e8e8'; }

										// Status coloring para matrices (CON letras visibles)
										if(isMatrix && i>5){
											if(cell && typeof cell === 'string'){
												const v = cell.toUpperCase();
												if(v==='C'){ bg=COLORS.cumplio; color='#fff'; fontWeight=700; }
												else if(v==='P'){ bg=COLORS.parcial; color='#000'; fontWeight=700; }
												else if(v==='N'){ bg=COLORS.no; color='#fff'; fontWeight=700; }
											}
										}
										// IC row detection (last row starts with IC)
										if(isMatrix && i===aoa.length-1 && row[0]==='IC'){ bg='#2c3e50'; color='#fff'; fontWeight=700; }

									return (
										<td key={j} style={{
											border:'1px solid #2c3e50',
											padding:'6px 8px',
											background:bg,
											color,
											fontWeight,
											textAlign: (isMatrix && i>5 && j>0) || (isResumen && i>12 && j>0)? 'center':'left'
										}}>{cell}</td>
									);
									})
								)}
							</tr>
						);
					})}
				</tbody>
			</table>
		);
	};

	const sidebarWidth = 260;
	const sidebarStyle = {
		position:'fixed', top:0, left:0, bottom:0,
		width: sidebarVisible? sidebarWidth: 0,
		background:'linear-gradient(135deg,#217346 0%, #13492f 100%)',
		color:'#fff',
		overflow:'hidden', transition:'width .3s', zIndex:900,
		display:'flex', flexDirection:'column', padding: sidebarVisible? '24px 16px':'0'
	};
	const innerSidebarStyle = { flex:1, display:'flex', flexDirection:'column', gap:16, overflowY:'auto' };
	const contentStyle = { marginLeft: sidebarVisible? sidebarWidth:0, transition:'margin-left .3s', padding:32, minHeight:'100vh', background:'#ffffff' };
	const btnStyle = { background:'rgba(255,255,255,0.15)', color:'#fff', border:'none', borderRadius:8, padding:'12px 16px', cursor:'pointer', fontWeight:700, fontSize:14 };
	const toggleBtnStyle = { position:'fixed', bottom:20, left: sidebarVisible? (sidebarWidth+10): 10, background:'linear-gradient(135deg,#217346 0%, #13492f 100%)', color:'#fff', border:'none', borderRadius:'50%', width:50, height:50, fontSize:22, fontWeight:700, cursor:'pointer', zIndex:1200, boxShadow:'0 4px 12px rgba(0,0,0,.3)' };

    return (
        <div style={{ fontFamily:'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', background:'#f8f9fa' }}>
            <motion.button
                style={toggleBtnStyle}
                onClick={()=>setSidebarVisible(s=>!s)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                {sidebarVisible? '‹':'›'}
            </motion.button>
            <motion.aside
                style={sidebarStyle}
                initial={{ x: -40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
            >
                {sidebarVisible && (
                    <div style={innerSidebarStyle}>
                        <h2 style={{ margin:0, fontWeight:800, letterSpacing:.5 }}>Exportación Excel</h2>
						<p style={{ margin:'4px 0 0', opacity:.9, fontSize:16, fontWeight:700 }}>Años {years.length > 0 ? years.join(', ') : '—'} - General</p>
                        {years.length === 0 && <p style={{ fontSize:12, background:'rgba(220,53,69,.15)', padding:'6px 8px', borderRadius:6, fontWeight:600 }}>Falta parámetro years.</p>}
						<div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                            <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:.98 }} onClick={()=>window.history.back()} style={{ ...btnStyle, background:'#13492f' }}>
                                ← Regresar
                            </motion.button>
                            <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:.98 }} disabled={!excelUrl} onClick={handleDescargar} style={{ ...btnStyle, opacity: !excelUrl? .5:1 }}>
                                Descargar Excel
                            </motion.button>
                        </div>
                        <div style={{ marginTop:'auto', fontSize:10, opacity:.6 }}>
                            <p style={{ margin:0 }}>Nota: Los navegadores no renderizan .xlsx directamente; se muestra una conversión HTML manual.</p>
                        </div>
                    </div>
                )}
            </motion.aside>
            <motion.main style={contentStyle} initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:.4 }}>
                <motion.div initial={{ scale:.98, opacity:0 }} animate={{ scale:1, opacity:1 }} transition={{ duration:.35 }} style={{ background:'#fff', borderRadius:16, boxShadow:'0 2px 10px rgba(0,0,0,0.08)', padding:32 }}>
                    <h3 style={{ marginTop:0, fontWeight:800, color:'#2c3e50', letterSpacing:.5 }}>Exportación Excel {years.length > 0 && `(${years.join(', ')})`}</h3>
                    {error && <p style={{ color:'#dc3545', fontWeight:600 }}>{error}</p>}
                    {years.length > 0 && (
                        <>
							{previewData.length>0 && (
								<div style={{ overflowX:'auto' }}>
									{previewData.map((s,idx)=>(
										<div key={s.name} style={{ marginBottom:48 }}>
											<h5 style={{ margin:'0 0 12px', fontSize:16, fontWeight:800, color:'#217346', letterSpacing:.5 }}>
												{idx+1}. {s.name}
											</h5>
											{renderAOATable(s)}
										</div>
									))}
								</div>
							)}
                        </>
                    )}
                </motion.div>
            </motion.main>
        </div>
    );
}
