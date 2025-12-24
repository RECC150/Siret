import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import * as XLSX from 'xlsx-js-style';
import axiosClient from '../axios-client';

// Componente de exportación a Excel con vista previa HTML
export default function SiretExportExcel(){
	const params = new URLSearchParams(window.location.search);
	const year = params.get('year');

	// Datos base
	const [compliances, setCompliances] = useState([]);
	const [entes, setEntes] = useState([]);
	const [entesActivos, setEntesActivos] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	// Export / preview
	const [excelReady, setExcelReady] = useState(false);
	const [excelUrl, setExcelUrl] = useState(null);
	// previewData: [{ name, type, aoa }]
	const [previewData, setPreviewData] = useState([]);

    // UI
    const [sidebarVisible, setSidebarVisible] = useState(true);
    const [generando, setGenerando] = useState(false);

	useEffect(() => {
		if (!year) return;
		const load = async () => {
			setLoading(true); setError(null);
			try {
				const [compRes, entesRes, activosRes] = await Promise.all([
				axiosClient.get(`/compliances`),
				axiosClient.get(`/entes`),
				axiosClient.get(`/entes-activos?year=${year}`)
				]);
				const compData = compRes.data;
				const entesData = entesRes.data;
				const activosData = activosRes.data;
                setCompliances(Array.isArray(compData) ? compData.filter(c => String(c.year) === String(year)) : []);
                setEntes(Array.isArray(entesData) ? entesData : []);
                setEntesActivos(Array.isArray(activosData) ? activosData : []);
            } catch (e) {
                console.error(e);
                setError('No se pudieron cargar los datos.');
            } finally { setLoading(false); }
        };
        load();
    }, [year]);

    // Generar preview automáticamente cuando los datos estén listos
    useEffect(() => {
        if (!loading && !error && year && compliances.length > 0 && entes.length > 0 && entesActivos.length > 0 && !generando) {
            setGenerando(true);
            generarPreview();
        }
    }, [loading, error, year, compliances, entes, entesActivos]);	const monthsOrder = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
	const monthsShort = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

    // Estadísticas por mes globales
    const monthStats = useMemo(() => {
        const map = {};
        monthsOrder.forEach(m => { map[m] = { cumplio:0, parcial:0, no:0, total:0 }; });
        compliances.forEach(c => {
            const m = c.month; const status = (c.status || '').toLowerCase();
            if (!map[m]) return;
            if (status === 'cumplio') map[m].cumplio++; else if (status === 'parcial') map[m].parcial++; else if (status === 'no') map[m].no++;
            map[m].total++;
        });
        return map;
    }, [compliances]);

    // Matriz entes vs meses (solo activos)
    const entesTable = useMemo(() => {
        const activosIds = new Set(entesActivos.map(e => e.ente_id));
        return entes.filter(e => activosIds.has(e.id)).map(ente => {
            const row = { ente: ente.title, classification: ente.classification };
            monthsShort.forEach((ms, idx) => {
                const monthName = monthsOrder[idx];
                const comp = compliances.find(c => c.ente_id === ente.id && c.month === monthName);
                row[ms] = comp ? (comp.status || '').toLowerCase() : null;
            });
            return row;
        });
    }, [entes, compliances, entesActivos, monthsOrder, monthsShort]);

	// Agrupar por clasificación
	const entesPorClasificacion = useMemo(() => {
		const grupos = {};
		entesTable.forEach(r => {
			const c = r.classification || 'Sin clasificación';
			if (!grupos[c]) grupos[c] = [];
			grupos[c].push(r);
		});
		return grupos;
	}, [entesTable]);

	// IC por clasificación
	const icPorClasificacion = useMemo(() => {
		const res = {};
		Object.keys(entesPorClasificacion).forEach(cl => {
			const rows = entesPorClasificacion[cl];
			let cumplidos = 0, posibles = 0;
			rows.forEach(row => {
				monthsShort.forEach(ms => { const st = row[ms]; if (st) posibles++; if (st === 'cumplio') cumplidos++; });
			});
			res[cl] = {
				ic: posibles ? ((cumplidos / posibles) * 100).toFixed(2) : '0.00',
				cantidadEntes: rows.length
			};
		});
		return res;
	}, [entesPorClasificacion, monthsShort]);

	// IC global
	const indiceGlobal = useMemo(() => {
		let cumplidos = 0, posibles = 0;
		entesTable.forEach(row => {
			monthsShort.forEach(ms => { const st = row[ms]; if (st) posibles++; if (st === 'cumplio') cumplidos++; });
		});
		return posibles ? ((cumplidos / posibles) * 100).toFixed(2) : '0.00';
	}, [entesTable, monthsShort]);

	const globalPercents = useMemo(() => {
		let verde=0, amarillo=0, rojo=0, total=0;
		Object.values(monthStats).forEach(st => { verde+=st.cumplio; amarillo+=st.parcial; rojo+=st.no; total+=st.total; });
		const pct = (v)=> total? ((v/total)*100).toFixed(2):'0.00';
		return { verde: pct(verde), amarillo: pct(amarillo), rojo: pct(rojo) };
	}, [monthStats]);

	const cantidadEntesActivos = entesActivos.length;

    // Generar workbook y preview
	const generarPreview = () => {
		setExcelReady(false); setExcelUrl(null); setPreviewData([]);
		const wb = XLSX.utils.book_new();

		// Helpers de estilos para Excel: celdas vacías pero coloreadas según estado
		const colorARGB = {
			C: 'FF217346', // verde Excel
			P: 'FFFFD966', // amarillo Excel
			N: 'FFDC3545'  // rojo
		};
		const baseBorder = { style: 'thin', color: { rgb: 'FF2C3E50' } };
        const styleFor = (rgb) => ({
            fill: { patternType: 'solid', fgColor: { rgb } },
            alignment: { horizontal: 'center', vertical: 'center' },
            border: { top: baseBorder, right: baseBorder, bottom: baseBorder, left: baseBorder }
        });
        const headerStyle = {
            font: { bold: true },
            alignment: { horizontal: 'center', vertical: 'center' },
            border: { top: baseBorder, right: baseBorder, bottom: baseBorder, left: baseBorder },
            fill: { patternType: 'solid', fgColor: { rgb: 'FFEBF1EE' } }
        };
        const icStyle = {
            alignment: { horizontal: 'center', vertical: 'center' },
            border: { top: baseBorder, right: baseBorder, bottom: baseBorder, left: baseBorder },
            fill: { patternType: 'solid', fgColor: { rgb: 'FFECEFF1' } },
            font: { bold: true }
        };
        const applyStatusStyles = (ws, aoa, startRow, monthsCount) => {
            for (let r = startRow; r < aoa.length - 1; r++) { // hasta antes de la fila IC
                for (let c = 1; c <= monthsCount; c++) { // columnas de meses
                    const addr = XLSX.utils.encode_cell({ r, c });
                    const cell = ws[addr];
                    if (!cell) continue;
                    const v = (cell.v || '').toString().toUpperCase();
                    if (v === 'C' || v === 'P' || v === 'N') {
                        // Mantener la letra visible en la celda
                        cell.s = styleFor(colorARGB[v]);
                        cell.s.font = { bold: true, color: { rgb: v === 'P' ? 'FF000000' : 'FFFFFFFF' } };
                    } else {
                        // bordes aun si está vacío
                        cell.s = { ...(cell.s||{}), border: { top: baseBorder, right: baseBorder, bottom: baseBorder, left: baseBorder } };
                    }
                }
            }
        };
        const applyHeaderAndIc = (ws, headerRowIndex, icColIndex, monthsCount) => {
            // Encabezados: desde col 0 hasta icColIndex
            for (let c = 0; c <= icColIndex; c++) {
                const addr = XLSX.utils.encode_cell({ r: headerRowIndex, c });
                const cell = ws[addr];
                if (cell) cell.s = { ...(cell.s||{}), ...headerStyle };
            }
            // Columna IC para todas las filas de datos
            const range = XLSX.utils.decode_range(ws['!ref']);
            for (let r = headerRowIndex + 1; r <= range.e.r; r++) {
                const addr = XLSX.utils.encode_cell({ r, c: icColIndex });
                const cell = ws[addr];
                if (cell) cell.s = { ...(cell.s||{}), ...icStyle };
            }
        };		// Hoja General (todos activos)
		const generalAOA = [
			['TABLA GENERAL DE CUMPLIMIENTO - ENTES ACTIVOS', `Año: ${year}`],
			[],
			['LEYENDA: Verde = Cumplió; Amarillo = No cumplió; Rojo = No presentó'],
			[],
			['Ente', ...monthsShort, 'IC']
		];
		entesTable.forEach(r => {
			let cumplidos = 0; let posibles = 0; const line=[r.ente];
			monthsShort.forEach(ms => {
				const st = r[ms]; let cell='';
				if(st){ posibles++; if(st==='cumplio'){ cumplidos++; cell='C'; } else if(st==='parcial'){ cell='P'; } else if(st==='no'){ cell='N'; } }
				line.push(cell);
			});
			const icEnte = posibles? ((cumplidos/posibles)*100).toFixed(2):'0.00';
			line.push(`${icEnte}%`);
			generalAOA.push(line);
		});
		// Fila IC por mes global
		const icRowGlobal = ['IC'];
		monthsShort.forEach(ms => {
			let cum=0,pos=0; entesTable.forEach(r => { const st=r[ms]; if(st){ pos++; if(st==='cumplio') cum++; } });
			icRowGlobal.push(pos? ((cum/pos)*100).toFixed(2)+'%':'0.00%');
		});
		icRowGlobal.push(indiceGlobal+'%');
		generalAOA.push(icRowGlobal);

		// Resumen Estadístico (PRIMERA HOJA)
		const resumenAOA = [
			['AUDITORÍA SUPERIOR DEL ESTADO DE BAJA CALIFORNIA SUR'],
			['SISTEMA DE INFORMACIÓN DE REPORTES DE CUMPLIMIENTO'],
			[`Año: ${year}`],
			[],
			['RESUMEN ESTADÍSTICO'],
			[`IC Global: ${indiceGlobal}%`],
			[`Cumplió: ${globalPercents.verde}%`],
			[`Parcial: ${globalPercents.amarillo}%`],
			[`No Presentó: ${globalPercents.rojo}%`],
			[`Entes activos: ${cantidadEntesActivos}`],
			[],
			['RESUMEN'],
			['Clasificación','Cumplió','No Cumplió','No Presentó','IC']
		];
		// Por cada clasificación calcular totales
		Object.keys(entesPorClasificacion).forEach(cl => {
			const rows = entesPorClasificacion[cl];
			let cumplio=0, parcial=0, no=0;
			rows.forEach(row => {
				monthsShort.forEach(ms => {
					const st = row[ms];
					if(st === 'cumplio') cumplio++;
					else if(st === 'parcial') parcial++;
					else if(st === 'no') no++;
				});
			});
			const ic = icPorClasificacion[cl].ic;
			resumenAOA.push([cl, cumplio, parcial, no, `${ic}%`]);
		});
		const wsResumen = XLSX.utils.aoa_to_sheet(resumenAOA);
		// Aplicar estilos a encabezados: fila 0, 4, 11
		const headerStyleWhite = {
			font: { bold: true, color: { rgb: 'FFFFFFFF' } },
			alignment: { horizontal: 'center', vertical: 'center' },
			fill: { patternType: 'solid', fgColor: { rgb: 'FF217346' } },
			border: { top: baseBorder, right: baseBorder, bottom: baseBorder, left: baseBorder }
		};
		const rangeResumen = XLSX.utils.decode_range(wsResumen['!ref']);
		const maxColResumen = rangeResumen.e.c;
		// Merge y estilo para filas 0, 1, 2, 4, 11
		[0, 1, 2, 4, 11].forEach(rowIdx => {
			for(let c=0; c <= maxColResumen; c++){
				const addr = XLSX.utils.encode_cell({r:rowIdx, c});
				if(wsResumen[addr]) wsResumen[addr].s = headerStyleWhite;
			}
		});
		// Merge cells para que los encabezados abarquen todas las columnas
		wsResumen['!merges'] = [
			{ s: { r: 0, c: 0 }, e: { r: 0, c: maxColResumen } },
			{ s: { r: 1, c: 0 }, e: { r: 1, c: maxColResumen } },
			{ s: { r: 2, c: 0 }, e: { r: 2, c: maxColResumen } },
			{ s: { r: 4, c: 0 }, e: { r: 4, c: maxColResumen } },
			{ s: { r: 11, c: 0 }, e: { r: 11, c: maxColResumen } }
		];
		// Encabezado de la tabla en fila 12
		for(let c=0; c <= maxColResumen; c++){
			const addr = XLSX.utils.encode_cell({r:12, c});
			if(wsResumen[addr]) wsResumen[addr].s = headerStyle;
		}
		// Ajustar ancho de columna A
		wsResumen['!cols'] = [{ wch: 62.86 }];
		XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

		const wsGeneral = XLSX.utils.aoa_to_sheet(generalAOA);
        applyStatusStyles(wsGeneral, generalAOA, 5, monthsShort.length);
        // Header en fila 4 (0-based): 'Ente', meses, 'IC'
        applyHeaderAndIc(wsGeneral, 4, monthsShort.length + 1, monthsShort.length);
		// Merge para título (fila 0) y leyenda (fila 2)
		const rangeGeneral = XLSX.utils.decode_range(wsGeneral['!ref']);
		const maxColGeneral = rangeGeneral.e.c;
		wsGeneral['!merges'] = [
			{ s: { r: 0, c: 0 }, e: { r: 0, c: maxColGeneral } },
			{ s: { r: 2, c: 0 }, e: { r: 2, c: maxColGeneral } }
		];
		// Ajustar ancho de columna A
		wsGeneral['!cols'] = [{ wch: 62.86 }];
        XLSX.utils.book_append_sheet(wb, wsGeneral, 'General');		// Sheets por clasificación
		const clasifSheets = [];
		const usedSheetNames = new Set(['General', 'Resumen']);
		Object.keys(entesPorClasificacion).forEach((cl, idx) => {
			const rows = entesPorClasificacion[cl];
			const { ic, cantidadEntes } = icPorClasificacion[cl];
			const aoa = [
				[cl],
				[`IC: ${ic}%`,`Entes: ${cantidadEntes}`],
				[],
				['LEYENDA: Verde = Cumplió; Amarillo = No cumplió; Rojo = No presentó'],
				[],
				['Ente', ...monthsShort, 'IC']
			];
			rows.forEach(r => {
				let cCum=0, cPos=0; const line=[r.ente];
				monthsShort.forEach(ms => { const st=r[ms]; let cell=''; if(st){ cPos++; if(st==='cumplio'){ cCum++; cell='C'; } else if(st==='parcial') cell='P'; else if(st==='no') cell='N'; } line.push(cell); });
				const icEnte = cPos? ((cCum/cPos)*100).toFixed(2):'0.00'; line.push(`${icEnte}%`); aoa.push(line);
			});
			const icRow=['IC'];
			monthsShort.forEach(ms => {
				let cum=0,pos=0; rows.forEach(r => { const st=r[ms]; if(st){ pos++; if(st==='cumplio') cum++; } });
				icRow.push(pos? ((cum/pos)*100).toFixed(2)+'%':'0.00%');
			});
			icRow.push(ic+'%'); aoa.push(icRow);
			const ws = XLSX.utils.aoa_to_sheet(aoa);
			applyStatusStyles(ws, aoa, 6, monthsShort.length);
			// Header en fila 5 (0-based) y columna IC
			applyHeaderAndIc(ws, 5, monthsShort.length + 1, monthsShort.length);
			// Merge para título (fila 0), IC/Entes (fila 1) y leyenda (fila 3)
			const rangeClasif = XLSX.utils.decode_range(ws['!ref']);
			const maxColClasif = rangeClasif.e.c;
			ws['!merges'] = [
				{ s: { r: 0, c: 0 }, e: { r: 0, c: maxColClasif } },
				{ s: { r: 1, c: 0 }, e: { r: 1, c: maxColClasif } },
				{ s: { r: 3, c: 0 }, e: { r: 3, c: maxColClasif } }
			];
			// Ajustar ancho de columna A
			ws['!cols'] = [{ wch: 62.86 }];

			// Generar nombre único para la hoja
			let sheetName = cl.substring(0,30);
			let counter = 1;
			while(usedSheetNames.has(sheetName)) {
				const suffix = ` (${counter})`;
				sheetName = cl.substring(0, 30 - suffix.length) + suffix;
				counter++;
			}
			usedSheetNames.add(sheetName);

			XLSX.utils.book_append_sheet(wb, ws, sheetName);
			clasifSheets.push({ name: sheetName, type:'clasificacion', aoa, meta: { ic, cantidadEntes } });
		});

		// Escribir blob
		const wbout = XLSX.write(wb, { bookType:'xlsx', type:'array' });
		const blob = new Blob([wbout], { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
		const url = URL.createObjectURL(blob);
        setExcelUrl(url);
        setExcelReady(true);
		// Mostrar primero el Resumen, luego la General y después clasificaciones
		setPreviewData([
			{ name:'Resumen', type:'resumen', aoa: resumenAOA },
			{ name:'General', type:'general', aoa: generalAOA },
			...clasifSheets
		]);
    };

    const handleDescargar = () => {
        if(!excelUrl) return;
        const a=document.createElement('a');
        a.href=excelUrl; a.download=`cumplimientos_${year}.xlsx`; a.click();
    };

	// Colores institucionales (match PDF)
	const COLORS = {
		cumplio: '#217346', // verde excel
		parcial: '#ffd966', // amarillo excel-ish
		no: '#dc3545'       // rojo
	};

	// Render helper for AOA -> table with color cells when letters C/P/N
	const renderAOATable = (sheet) => {
		const aoa = sheet.aoa;
		const isMatrix = sheet.type === 'general' || sheet.type === 'clasificacion';
		return (
			<table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, marginBottom:32 }}>
				<tbody>
					{aoa.map((row,i) => {
						// Determinar si esta fila debe ocupar todas las columnas (merge)
						let colSpan = 1;
						let shouldMerge = false;

						// Para Resumen: filas 0,1,2,4,5,6,7,8,9,11 ocupan todo el ancho
						if(sheet.type==='resumen' && (i===0||i===1||i===2||i===4||i===5||i===6||i===7||i===8||i===9||i===11)){
							shouldMerge = true;
							colSpan = 5; // 5 columnas: Clasificación, Cumplió, No Cumplió, No Presentó, IC
						}
						// Para General: fila 0 (título) y fila 2 (leyenda) ocupan todo el ancho
						if(sheet.type==='general' && (i===0||i===2)){
							shouldMerge = true;
							colSpan = 14; // 1 ente + 12 meses + 1 IC
						}
						// Para Clasificaciones: filas 0 (título), 1 (IC/Entes), 3 (leyenda) ocupan todo el ancho
						if(sheet.type==='clasificacion' && (i===0||i===1||i===3)){
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
										background: sheet.type==='resumen' && (i===0||i===1||i===2||i===4||i===11) ? 'linear-gradient(135deg,#217346,#13492f)' :
													sheet.type==='general' && i===0 ? 'linear-gradient(135deg,#2c3e50,#34495e)' :
													sheet.type==='clasificacion' && (i===0||i===1) ? 'linear-gradient(135deg,#2c3e50,#34495e)' :
													'transparent',
										color: (sheet.type==='resumen' && (i===0||i===1||i===2||i===4||i===11)) ||
											   (sheet.type==='general' && i===0) ||
											   (sheet.type==='clasificacion' && (i===0||i===1)) ? '#fff' : '#222',
										fontWeight: 700,
										textAlign: 'center'
									}}>{row[0]}</td>
								) : (
									// Renderizar celdas normales
									row.map((cell,j) => {
										let bg='transparent'; let color='#222'; let fontWeight=400;
										if(i===0 && row.length<6){ bg='linear-gradient(135deg,#2c3e50,#34495e)'; color='#fff'; fontWeight=700; }
										if(isMatrix && i===2){ /* header row after empty line */ }
										// Detect header for matrices
										if(isMatrix && i===2 || (isMatrix && i===0 && row.length>6)){ fontWeight=700; }
										// Status coloring (CON letras visibles)
										if(isMatrix && i>2){
											if(cell && typeof cell === 'string'){
												const v = cell.toUpperCase();
												if(v==='C'){ bg=COLORS.cumplio; color='#fff'; fontWeight=700; }
												else if(v==='P'){ bg=COLORS.parcial; color='#000'; fontWeight=700; }
												else if(v==='N'){ bg=COLORS.no; color='#fff'; fontWeight=700; }
											}
											// Si no hay valor, mantener transparente
										}
										// IC row detection (last row starts with IC)
										if(isMatrix && i===aoa.length-1 && row[0]==='IC'){ bg=j===0? '#2c3e50':'#34495e'; color='#fff'; fontWeight=700; }
										// Resumen tabla header fila 12
										if(sheet.type==='resumen' && i===12){ fontWeight=700; bg='#EBFLEE'; }
										return (
											<td key={j} style={{
												border:'1px solid #2c3e50',
												padding:'6px 8px',
												background:bg,
												color,
												fontWeight,
												textAlign: (isMatrix && i>=2 && j>0)? 'center':'left'
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
						<p style={{ margin:'4px 0 0', opacity:.9, fontSize:16, fontWeight:700 }}>Año {year || '—'} - General</p>
                        {!year && <p style={{ fontSize:12, background:'rgba(220,53,69,.15)', padding:'6px 8px', borderRadius:6, fontWeight:600 }}>Falta parámetro year.</p>}
						<div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                            <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:.98 }} onClick={()=>window.history.back()} style={{ ...btnStyle, background:'#13492f' }}>
                                ← Regresar
                            </motion.button>
                            <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:.98 }} disabled={!excelReady} onClick={handleDescargar} style={{ ...btnStyle, opacity: !excelReady? .5:1 }}>
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
                    <h3 style={{ marginTop:0, fontWeight:800, color:'#2c3e50', letterSpacing:.5 }}>Exportación Excel {year && `(${year})`}</h3>
                    {loading && <p style={{ color:'#6c757d' }}>Cargando datos...</p>}
                    {error && <p style={{ color:'#dc3545', fontWeight:600 }}>{error}</p>}
                    {!loading && !error && year && (
                        <>
                            {!excelReady && <p style={{ color:'#6c757d' }}>Generando vista previa...</p>}
							{excelReady && previewData.length>0 && (
								<div style={{ overflowX:'auto' }}>
									{previewData.map((s,idx)=>(
										<div key={s.name} style={{ marginBottom:48 }}>
											<h5 style={{ margin:'0 0 12px', fontSize:16, fontWeight:800, color:'#217346', letterSpacing:.5 }}>
												{idx+1}. {s.name}
												{s.type==='clasificacion' && s.meta ? (
													<span style={{ marginLeft:8, fontSize:13, fontWeight:700, color:'#2c3e50' }}>
														IC: {s.meta.ic}% · Entes: {s.meta.cantidadEntes}
													</span>
												) : null}
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
