import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import jsPDF from 'jspdf';
import asebcsLogo from '../assets/asebcs.jpg';

export default function SiretExportPDF(){
  const params = new URLSearchParams(window.location.search);
  const yearsParam = params.get('years'); // "2033-2034-2035"
  const monthParam = params.get('month'); // "Todos" o nombre del mes
  const years = yearsParam ? yearsParam.split('-').map(y => parseInt(y, 10)) : [];
  const month = monthParam || 'Todos';

  const [compliances, setCompliances] = useState([]);
  const [entes, setEntes] = useState([]);
  const [error, setError] = useState(null);
  const [pdfReady, setPdfReady] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [progress, setProgress] = useState(0);
  const [sidebarVisible, setSidebarVisible] = useState(true);

  const apiBase = `${window.location.protocol}//${window.location.hostname}/siret/api`;

  useEffect(() => {
    if (years.length === 0) return;
    const load = async () => {
      setError(null);
      try {
        const [compRes, entesRes] = await Promise.all([
          fetch(`${apiBase}/compliances.php`),
          fetch(`${apiBase}/entes.php`)
        ]);
        const compData = await compRes.json();
        const entesData = await entesRes.json();

        // Filtrar cumplimientos por años seleccionados
        let filtered = Array.isArray(compData)
          ? compData.filter(c => years.includes(parseInt(c.year, 10)))
          : [];

        // Si se seleccionó un mes específico, filtrar también por mes
        if (month && month !== 'Todos') {
          filtered = filtered.filter(c => c.month === month);
        }

        setCompliances(filtered);
        setEntes(Array.isArray(entesData) ? entesData : []);
      } catch (e) {
        setError('No se pudieron cargar los datos.');
        console.error(e);
      }
    };
    load();
  }, [years, month, apiBase]);

  const monthsOrder = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const monthsShort = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

  // Colores institucionales
  const COLORS = {
    cumple: '#2d5016',      // Verde oscuro
    noCumple: '#ffd700',    // Amarillo
    noPresento: '#dc3545'   // Rojo
  };

  // Calcular stats por mes para las gráficas
  const monthStats = useMemo(() => {
    const map = {};
    monthsOrder.forEach(m => { map[m] = { cumplio:0, parcial:0, no:0, total:0 }; });
    compliances.forEach(c => {
      const m = c.month;
      const status = (c.status || '').toLowerCase();
      if (!map[m]) return;
      if (status === 'cumplio') map[m].cumplio++;
      else if (status === 'parcial') map[m].parcial++;
      else if (status === 'no') map[m].no++;
      map[m].total++;
    });
    return map;
  }, [compliances]);

  // Construir matriz de entes x meses para la tabla
  const entesTable = useMemo(() => {
    // Usar todos los entes (no filtrar por activos)
    return entes.map(ente => {
      const row = { ente: ente.title, classification: ente.classification };
      monthsShort.forEach((ms, idx) => {
        const monthName = monthsOrder[idx];
        const comp = compliances.find(c => c.ente_id === ente.id && c.month === monthName);
        const status = comp ? (comp.status || '').toLowerCase() : null;
        row[ms] = status; // 'cumplio', 'parcial', 'no', o null
      });
      return row;
    });
  }, [entes, compliances]);

  // Agrupar entes por clasificación
  const entesPorClasificacion = useMemo(() => {
    const grupos = {};
    entesTable.forEach(row => {
      const clasificacion = row.classification || 'Sin clasificación';
      if (!grupos[clasificacion]) {
        grupos[clasificacion] = [];
      }
      grupos[clasificacion].push(row);
    });
    return grupos;
  }, [entesTable]);

  // Calcular stats por mes y por clasificación
  const monthStatsPorClasificacion = useMemo(() => {
    const result = {};
    Object.keys(entesPorClasificacion).forEach(clasificacion => {
      const entesDeClasificacion = entesPorClasificacion[clasificacion];
      const entesIds = entes.filter(e => e.classification === clasificacion).map(e => e.id);
      const compliancesClasif = compliances.filter(c => entesIds.includes(c.ente_id));

      const map = {};
      monthsOrder.forEach(m => { map[m] = { cumplio:0, parcial:0, no:0, total:0 }; });
      compliancesClasif.forEach(c => {
        const m = c.month;
        const status = (c.status || '').toLowerCase();
        if (!map[m]) return;
        if (status === 'cumplio') map[m].cumplio++;
        else if (status === 'parcial') map[m].parcial++;
        else if (status === 'no') map[m].no++;
        map[m].total++;
      });
      result[clasificacion] = map;
    });
    return result;
  }, [entesPorClasificacion, entes, compliances]);

  // Calcular IC por clasificación
  const icPorClasificacion = useMemo(() => {
    const result = {};
    // Alinear con Excel: IC = cumplio / posibles (meses con algún registro) usando solo entes activos por clasificación
    Object.keys(entesPorClasificacion).forEach(clasificacion => {
      const rows = entesPorClasificacion[clasificacion];
      let cumplidos = 0;
      let posibles = 0;
      rows.forEach(row => {
        monthsShort.forEach(ms => {
          const st = row[ms];
          if (st) {
            posibles++;
            if (st === 'cumplio') cumplidos++;
          }
        });
      });
      result[clasificacion] = posibles ? ((cumplidos / posibles) * 100).toFixed(2) : '0.00';
    });
    return result;
  }, [entesPorClasificacion, monthsShort]);  // Calcular índice de cumplimiento (IC)
  const indiceGlobal = useMemo(() => {
    const totalRegistros = compliances.length;
    if (totalRegistros === 0) return 0;
    const totalCumplidos = compliances.filter(c => (c.status || '').toLowerCase() === 'cumplio').length;
    return ((totalCumplidos / totalRegistros) * 100).toFixed(2);
  }, [compliances]);

  const cantidadEntesActivos = useMemo(() => {
    return entes.length;
  }, [entes]);

  // Función para generar PDF con renderizado nativo
  const handleGenerarPdf = async () => {
    if (!years || years.length === 0) return;
    setGeneratingPdf(true);
    setProgress(0);
    try {
      const pdf = new jsPDF('landscape', 'pt', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 32;
      let yPos = margin;

      // Cargar logo ASEBCS
      const logoImg = new Image();
      logoImg.src = asebcsLogo;
      await new Promise((resolve, reject) => {
        logoImg.onload = resolve;
        logoImg.onerror = reject;
      });
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = logoImg.width;
      canvas.height = logoImg.height;
      ctx.drawImage(logoImg, 0, 0);
      const logoBase64 = canvas.toDataURL('image/jpeg');

      setProgress(5);

      // Función helper para dibujar segmento de pastel (pie chart)
      const drawPieSegment = (pdf, cx, cy, radius, startAngle, sweepAngle, fillColor) => {
        if (sweepAngle <= 0) return;
        const segments = Math.max(8, Math.ceil(sweepAngle / 10));
        const angleStep = sweepAngle / segments;

        pdf.setFillColor(...fillColor);
        for (let i = 0; i < segments; i++) {
          const a1 = startAngle + (i * angleStep);
          const a2 = a1 + angleStep;
          const x1 = cx + radius * Math.cos(a1 * Math.PI / 180);
          const y1 = cy + radius * Math.sin(a1 * Math.PI / 180);
          const x2 = cx + radius * Math.cos(a2 * Math.PI / 180);
          const y2 = cy + radius * Math.sin(a2 * Math.PI / 180);
          pdf.triangle(cx, cy, x1, y1, x2, y2, 'F');
        }
      };

      const clasificaciones = Object.keys(entesPorClasificacion);
      const totalSteps = 1 + years.length;
      let currentStep = 0;

      // ========== PRIMERA HOJA: Header + Gráficas generales ==========
      const logoColWidth = 95;
      const logoWidth = 70;
      const logoHeight = (logoImg.height / logoImg.width) * logoWidth;
      const logoCenterX = (logoColWidth / 2) - (logoWidth / 2);

      pdf.setFillColor(44, 62, 80);
      pdf.rect(0, 0, pageWidth, 90, 'F');
      pdf.addImage(logoBase64, 'JPEG', logoCenterX, 8, logoWidth, logoHeight);

      const titleColX = logoColWidth;
      const titleColWidth = pageWidth - logoColWidth;
      const centerCol2 = titleColX + (titleColWidth / 2);
      const col2LeftMargin = titleColX + 10;
      const col2RightMargin = pageWidth - 10;
      const col2MaxWidth = col2RightMargin - col2LeftMargin;

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(255, 255, 255);
      const yearsText = years.join(', ');
      const headerText1 = `GRÁFICAS DE CUMPLIMIENTO GENERAL DE INFORMES MENSUALES ENTREGADOS A LA AUDITORÍA SUPERIOR DEL ESTADO DE BAJA CALIFORNIA SUR ${yearsText}`;
      const lines1 = pdf.splitTextToSize(headerText1, col2MaxWidth);
      let textY = 18;
      lines1.forEach(line => {
        pdf.text(line, centerCol2, textY, { align: 'center' });
        textY += 12;
      });

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      const headerText2 = 'PLATAFORMA SIRET';
      const lines2 = pdf.splitTextToSize(headerText2, col2MaxWidth);
      lines2.forEach(line => {
        pdf.text(line, centerCol2, textY, { align: 'center' });
        textY += 10;
      });

      pdf.setFontSize(10);
      pdf.text(`IC: ${indiceGlobal}%`, margin, 82);
      pdf.setFont('helvetica', 'italic');
      pdf.text(`Actualizada al ${new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}`, pageWidth / 2, 82, { align: 'center' });
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Entes: ${cantidadEntesActivos}`, pageWidth - margin, 82, { align: 'right' });

      yPos = 110;

      // Grid de gráficas mensuales (donut charts) - Ajustado para abarcar toda la hoja
      const cols = 4;
      const rows = 3;
      const availableWidth = pageWidth - (margin * 2);
      const availableHeight = pageHeight - yPos - margin;
      const chartSize = Math.min((availableWidth / cols) * 0.85, (availableHeight / rows) * 0.85);
      const chartSpacingX = (availableWidth - (chartSize * cols)) / (cols + 1);
      const chartSpacingY = (availableHeight - (chartSize * rows)) / (rows + 1);
      const gridStartX = margin + chartSpacingX + (chartSize / 2);
      const gridStartY = yPos + chartSpacingY + (chartSize / 2);

      monthsOrder.forEach((m, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const cx = gridStartX + (col * (chartSize + chartSpacingX));
        const cy = gridStartY + (row * (chartSize + chartSpacingY));

        const stats = monthStats[m];
        const total = stats.cumplio + stats.parcial + stats.no;

        // Título del mes
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 0, 0);
        pdf.text(m, cx, cy - (chartSize / 2) - 10, { align: 'center' });

        if (total > 0) {
          // Orden: rojo (no), amarillo (parcial), verde (cumplio)
          // Comenzar desde 0 grados (derecha) para que rojo quede arriba-derecha
          const data = [
            { value: stats.no, color: [220, 53, 69], label: 'Rojo' },
            { value: stats.parcial, color: [255, 215, 0], label: 'Amarillo' },
            { value: stats.cumplio, color: [45, 80, 22], label: 'Verde' }
          ].filter(d => d.value > 0);

          const pieRadius = (chartSize / 2) * 0.55;
          let currentAngle = 0; // Comenzar desde 0 grados (derecha)

          // Dibujar segmentos de pastel
          data.forEach(d => {
            const sweepAngle = (d.value / total) * 360;
            drawPieSegment(pdf, cx, cy, pieRadius, currentAngle, sweepAngle, d.color);
            currentAngle += sweepAngle;
          });

          // Dibujar porcentajes FUERA de cada segmento
          currentAngle = 0;
          data.forEach((d, dIdx) => {
            const pct = ((d.value / total) * 100).toFixed(0);
            const sweepAngle = (d.value / total) * 360;
            const midAngle = currentAngle + (sweepAngle / 2);
            const labelRadius = pieRadius + 18; // Fuera del pastel
            const tx = cx + labelRadius * Math.cos(midAngle * Math.PI / 180);
            const ty = cy + labelRadius * Math.sin(midAngle * Math.PI / 180);

            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(0, 0, 0);
            pdf.text(`${pct}%`, tx, ty + 3, { align: 'center' });

            currentAngle += sweepAngle;
          });
        } else {
          pdf.setFontSize(9);
          pdf.setTextColor(108, 117, 125);
          pdf.text('0%', cx, cy + 3, { align: 'center' });
        }
      });

      currentStep++;
      setProgress(Math.round((currentStep / totalSteps) * 100));

      // ========== HOJAS POR AÑO (TABLA GENERAL + GRÁFICAS) ==========
      for (const year of years) {
        // ========== PÁGINA 1: TABLA GENERAL DEL AÑO ==========
        pdf.addPage();
        yPos = margin;

        // Filtrar datos por año
        const compYear = compliances.filter(c => parseInt(c.year, 10) === year);
        const entesIdsYear = new Set(compYear.map(c => c.ente_id));
        const entesActivosYear = entes.filter(e => entesIdsYear.has(e.id));

        // Calcular IC general del año
        let cumpliosYear = 0, posiblesYear = 0;
        compYear.forEach(c => {
          const status = (c.status || '').toLowerCase();
          if (status) {
            posiblesYear++;
            if (status === 'cumplio') cumpliosYear++;
          }
        });
        const icGeneralYear = posiblesYear > 0 ? ((cumpliosYear / posiblesYear) * 100).toFixed(1) : '0.0';

        // Header con IC, Año y Entes (formato original)
        pdf.setFillColor(44, 62, 80);
        pdf.roundedRect(margin, yPos, pageWidth - (margin * 2), 30, 4, 4, 'F');
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(255, 255, 255);
        pdf.text(`IC: ${icGeneralYear}%`, margin + 10, yPos + 19);
        pdf.text(`${year}`, pageWidth / 2, yPos + 19, { align: 'center' });
        pdf.text(`Entes: ${entesActivosYear.length}`, pageWidth - margin - 10, yPos + 19, { align: 'right' });
        yPos += 40;

        // Texto descriptivo
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        pdf.setTextColor(44, 62, 80);
        pdf.text('TABLAS DE CUMPLIMIENTO DE ENTREGA DE INFORMES MENSUALES', pageWidth / 2, yPos, { align: 'center' });
        yPos += 12;
        pdf.text('A LA AUDITORÍA SUPERIOR DEL ESTADO DE BAJA CALIFORNIA SUR', pageWidth / 2, yPos, { align: 'center' });
        yPos += 20;

        // Tabla General
        const usableWidth = pageWidth - (margin * 2);
        const col1Width = usableWidth * 0.25;
        const monthColWidthYear = (usableWidth - col1Width) / (monthsShort.length + 1);
        const minRowHeight = 16;
        const lineSpacing = 6;

        const drawTableHeaderYear = () => {
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(7);
          pdf.setFillColor(52, 73, 94);
          pdf.setTextColor(255, 255, 255);
          pdf.rect(margin, yPos, usableWidth, 18, 'F');
          pdf.setDrawColor(44, 62, 80);
          pdf.setLineWidth(0.5);
          pdf.rect(margin, yPos, col1Width, 18);
          pdf.text('ENTES', margin + 5, yPos + 12);

          monthsShort.forEach((ms, msIdx) => {
            const xCol = margin + col1Width + (msIdx * monthColWidthYear);
            pdf.rect(xCol, yPos, monthColWidthYear, 18);
            pdf.text(ms, xCol + (monthColWidthYear / 2), yPos + 12, { align: 'center' });
          });

          const icColX = margin + col1Width + (monthsShort.length * monthColWidthYear);
          pdf.rect(icColX, yPos, monthColWidthYear, 18);
          pdf.setFillColor(44, 62, 80);
          pdf.rect(icColX, yPos, monthColWidthYear, 18, 'F');
          pdf.text('IC', icColX + (monthColWidthYear / 2), yPos + 12, { align: 'center' });
          yPos += 18;
        };

        drawTableHeaderYear();

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(6);
        entesActivosYear.forEach((row, rowIdx) => {
          const enteLines = pdf.splitTextToSize(row.title, col1Width - 10);
          const rowHeight = Math.max(minRowHeight, enteLines.length * lineSpacing + 4);

          if (yPos + rowHeight + 5 > pageHeight - margin) {
            pdf.addPage();
            yPos = margin;
            drawTableHeaderYear();
          }

          const bgColor = rowIdx % 2 === 0 ? [255, 255, 255] : [248, 249, 250];
          pdf.setFillColor(...bgColor);
          pdf.rect(margin, yPos, usableWidth, rowHeight, 'F');

          pdf.setTextColor(44, 62, 80);
          pdf.setFont('helvetica', 'normal');
          pdf.setDrawColor(222, 226, 230);
          pdf.setLineWidth(0.5);
          pdf.rect(margin, yPos, col1Width, rowHeight);
          let textYPos = yPos + 8;
          enteLines.forEach(line => {
            pdf.text(line, margin + 5, textYPos, { align: 'left' });
            textYPos += lineSpacing;
          });

          monthsShort.forEach((ms, msIdx) => {
            const monthName = monthsOrder[msIdx];
            const comp = compYear.find(c => c.ente_id === row.id && c.month === monthName);
            const status = comp ? (comp.status || '').toLowerCase() : null;
            const xCol = margin + col1Width + (msIdx * monthColWidthYear);
            let cellColor = [255, 255, 255];
            if (status === 'cumplio') { cellColor = [45, 80, 22]; }
            else if (status === 'parcial') { cellColor = [255, 215, 0]; }
            else if (status === 'no') { cellColor = [220, 53, 69]; }
            pdf.setFillColor(...cellColor);
            pdf.rect(xCol, yPos, monthColWidthYear, rowHeight, 'FD');
          });

          // IC por ente
          let cumplidos = 0, posibles = 0;
          monthsShort.forEach((ms, idx) => {
            const monthName = monthsOrder[idx];
            const comp = compYear.find(c => c.ente_id === row.id && c.month === monthName);
            const status = comp ? (comp.status || '').toLowerCase() : null;
            if (status) {
              posibles++;
              if (status === 'cumplio') cumplidos++;
            }
          });
          const icEnte = posibles ? ((cumplidos / posibles) * 100).toFixed(2) : '0.00';
          const icColX = margin + col1Width + (monthsShort.length * monthColWidthYear);
          pdf.setFillColor(236, 240, 241);
          pdf.rect(icColX, yPos, monthColWidthYear, rowHeight, 'FD');
          pdf.setTextColor(44, 62, 80);
          pdf.setFont('helvetica', 'bold');
          pdf.text(`${icEnte}%`, icColX + (monthColWidthYear / 2), yPos + (rowHeight / 2) + 2, { align: 'center' });

          yPos += rowHeight;
        });

        // Fila IC por mes
        const icRowHeight = 16;
        if (yPos + icRowHeight + 5 > pageHeight - margin) {
          pdf.addPage();
          yPos = margin;
          drawTableHeaderYear();
        }

        pdf.setFillColor(44, 62, 80);
        pdf.rect(margin, yPos, usableWidth, icRowHeight, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(7);
        pdf.rect(margin, yPos, col1Width, icRowHeight, 'D');
        pdf.text('IC', margin + 5, yPos + 10);

        monthsShort.forEach((ms, msIdx) => {
          const monthName = monthsOrder[msIdx];
          let cum = 0, pos = 0;
          entesActivosYear.forEach(ente => {
            const comp = compYear.find(c => c.ente_id === ente.id && c.month === monthName);
            const status = comp ? (comp.status || '').toLowerCase() : null;
            if (status) {
              pos++;
              if (status === 'cumplio') cum++;
            }
          });
          const icMes = pos ? ((cum / pos) * 100).toFixed(2) : '0.00';
          const xCol = margin + col1Width + (msIdx * monthColWidthYear);
          pdf.rect(xCol, yPos, monthColWidthYear, icRowHeight, 'D');
          pdf.text(`${icMes}%`, xCol + (monthColWidthYear / 2), yPos + 10, { align: 'center' });
        });

        const icColX = margin + col1Width + (monthsShort.length * monthColWidthYear);
        pdf.setFillColor(26, 37, 47);
        pdf.rect(icColX, yPos, monthColWidthYear, icRowHeight, 'FD');
        let totalCumpYear = 0, totalRegYear = 0;
        entesActivosYear.forEach(ente => {
          monthsShort.forEach((ms, idx) => {
            const monthName = monthsOrder[idx];
            const comp = compYear.find(c => c.ente_id === ente.id && c.month === monthName);
            const status = comp ? (comp.status || '').toLowerCase() : null;
            if (status) {
              totalRegYear++;
              if (status === 'cumplio') totalCumpYear++;
            }
          });
        });
        const icGlobalYear = totalRegYear > 0 ? ((totalCumpYear / totalRegYear) * 100).toFixed(2) : '0.00';
        pdf.text(`${icGlobalYear}%`, icColX + (monthColWidthYear / 2), yPos + 10, { align: 'center' });

        currentStep++;
        setProgress(Math.round((currentStep / totalSteps) * 100));

        // ========== PÁGINA 2: GRÁFICAS DEL AÑO ==========
        pdf.addPage();
        yPos = margin;

        // Título
        pdf.setFillColor(236, 240, 241);
        pdf.roundedRect(margin, yPos, pageWidth - (margin * 2), 25, 3, 3, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.setTextColor(44, 62, 80);
        pdf.text(`Gráficas Año: ${year}`, pageWidth / 2, yPos + 16, { align: 'center' });
        yPos += 35;

        // Grid de gráficas mensuales
        const cols = 4;
        const rows = 3;
        const availableWidth = pageWidth - (margin * 2);
        const availableHeight = pageHeight - yPos - margin;
        const chartSize = Math.min((availableWidth / cols) * 0.85, (availableHeight / rows) * 0.85);
        const chartSpacingX = (availableWidth - (chartSize * cols)) / (cols + 1);
        const chartSpacingY = (availableHeight - (chartSize * rows)) / (rows + 1);
        const gridStartX = margin + chartSpacingX + (chartSize / 2);
        const gridStartY = yPos + chartSpacingY + (chartSize / 2);

        monthsOrder.forEach((m, idx) => {
          const col = idx % cols;
          const row = Math.floor(idx / cols);
          const cx = gridStartX + (col * (chartSize + chartSpacingX));
          const cy = gridStartY + (row * (chartSize + chartSpacingY));

          const monthName = m;
          let cumplio = 0, parcial = 0, no = 0;
          entesActivosYear.forEach(ente => {
            const comp = compYear.find(c => c.ente_id === ente.id && c.month === monthName);
            const status = comp ? (comp.status || '').toLowerCase() : null;
            if (status === 'cumplio') cumplio++;
            else if (status === 'parcial') parcial++;
            else if (status === 'no') no++;
          });
          const total = cumplio + parcial + no;

          // Título del mes
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(0, 0, 0);
          pdf.text(m, cx, cy - (chartSize / 2) - 8, { align: 'center' });

          if (total > 0) {
            const data = [
              { value: no, color: [220, 53, 69] },
              { value: parcial, color: [255, 215, 0] },
              { value: cumplio, color: [45, 80, 22] }
            ].filter(d => d.value > 0);

            const pieRadius = (chartSize / 2) * 0.55;
            let currentAngle = 0;

            data.forEach(d => {
              const sweepAngle = (d.value / total) * 360;
              drawPieSegment(pdf, cx, cy, pieRadius, currentAngle, sweepAngle, d.color);
              currentAngle += sweepAngle;
            });

            currentAngle = 0;
            data.forEach((d, dIdx) => {
              const pct = ((d.value / total) * 100).toFixed(0);
              const sweepAngle = (d.value / total) * 360;
              const midAngle = currentAngle + (sweepAngle / 2);
              const labelRadius = pieRadius + 16;
              const tx = cx + labelRadius * Math.cos(midAngle * Math.PI / 180);
              const ty = cy + labelRadius * Math.sin(midAngle * Math.PI / 180);
              pdf.setFontSize(9);
              pdf.setFont('helvetica', 'bold');
              pdf.setTextColor(0, 0, 0);
              pdf.text(`${pct}%`, tx, ty + 2, { align: 'center' });
              currentAngle += sweepAngle;
            });
          } else {
            pdf.setFontSize(9);
            pdf.setTextColor(108, 117, 125);
            pdf.text('0%', cx, cy + 2, { align: 'center' });
          }
        });

        currentStep++;
        setProgress(Math.round((currentStep / totalSteps) * 100));
      }

      setProgress(100);
      const blob = pdf.output('blob');
      const url = URL.createObjectURL(blob);
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      setPdfUrl(url);
      setPdfReady(true);
    } catch (e) {
      console.error('Error generando PDF:', e);
      alert('Error al generar el PDF');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleDescargarPdf = () => {
    if (!pdfUrl) return;
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `cumplimientos_${years.join('-')}.pdf`;
    link.click();
  };

  const containerStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    background: '#f8f9fa',
    overflow: 'hidden',
    zIndex: 1
  };
  const sidebarStyle = {
    width: sidebarVisible ? 260 : 0,
    background: 'linear-gradient(135deg, #681b32 0%, #200b07 100%)',
    color: '#fff',
    padding: sidebarVisible ? '24px 16px' : '0',
    boxShadow: '2px 0 8px rgba(0,0,0,0.15)',
    position: 'relative',
    overflow: 'hidden',
    height: '100vh',
    transition: 'all 0.3s ease'
  };
  const contentWrapperStyle = {
    flex: 1,
    padding: '0',
    overflowY: 'auto',
    height: '100vh',
    background: '#ffffff'
  };
  const titleStyle = {
    margin: 0,
    fontWeight: 800,
    letterSpacing: '0.5px'
  };
  const navItemStyle = {
    display: 'block',
    padding: '10px 12px',
    borderRadius: 8,
    color: '#fff',
    textDecoration: 'none',
    fontWeight: 600,
    opacity: 0.9
  };

  return (
    <div style={containerStyle}>
      <motion.aside
        style={sidebarStyle}
        initial={{ x: -40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <h2 style={titleStyle}>Exportación PDF</h2>
        <p style={{ marginTop: 4, opacity: 0.8 }}>Años {years.length > 0 ? years.join(', ') : '—'} - General</p>
        <div style={{ marginTop: 16 }}>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={()=>window.history.back()}
            style={{
              width: '100%',
              background: '#13492f',
              color: '#fff',
              border: 'none',
              padding: '12px',
              borderRadius: 8,
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: 14
            }}>
            ← Regresar
          </motion.button>
        </div>
        <div style={{ marginTop: 16, display:'flex', flexDirection:'column', gap: 8 }}>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={!years || years.length === 0 || generatingPdf}
            style={{
              width: '100%',
              background: pdfReady ? '#28a745' : '#dc3545',
              color: '#fff',
              border: 'none',
              padding: '12px',
              borderRadius: 8,
              fontWeight: 700,
              cursor: !years || years.length === 0 || generatingPdf ? 'not-allowed' : 'pointer',
              opacity: !years || years.length === 0 || generatingPdf ? 0.5 : 1,
              fontSize: 14
            }}
            onClick={handleGenerarPdf}
          >
            {generatingPdf ? 'Generando…' : pdfReady ? '✓ PDF Generado' : 'Generar PDF'}
          </motion.button>
          {pdfReady && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                width: '100%',
                background: '#0d6efd',
                color: '#fff',
                border: 'none',
                padding: '12px',
                borderRadius: 8,
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: 14
              }}
              onClick={handleDescargarPdf}
              transition={{ duration: 0.3 }}
            >
              ⬇ Descargar PDF
            </motion.button>
          )}
        </div>
      </motion.aside>
      <motion.main
        style={contentWrapperStyle}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        {/* Botón toggle para sidebar */}
        <button
          onClick={() => setSidebarVisible(!sidebarVisible)}
          style={{
            position: 'fixed',
            bottom: '20px',
            left: sidebarVisible ? '270px' : '10px',
            zIndex: 10000,
            background: 'linear-gradient(135deg, #681b32 0%, #200b07 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: '50%',
            width: '50px',
            height: '50px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            fontWeight: 'bold',
            transition: 'all 0.3s ease'
          }}
        >
          {sidebarVisible ? '‹' : '›'}
        </button>
        {(!years || years.length === 0) && (
          <div style={{ padding: 32 }}>
            <p style={{ color:'#dc3545', fontWeight:600 }}>Selecciona años desde la página anterior.</p>
          </div>
        )}
        {years && years.length > 0 && error && (
          <div style={{ padding: 32 }}>
            <p style={{ color:'#dc3545' }}>{error}</p>
          </div>
        )}
        {years && years.length > 0 && (
          <>
            {generatingPdf && (
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999
              }}>
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  style={{
                    background: '#fff',
                    padding: '40px',
                    borderRadius: '12px',
                    minWidth: '400px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
                  }}
                >
                  <h3 style={{ margin: '0 0 20px', textAlign: 'center', color: '#2c3e50' }}>
                    Generando PDF
                  </h3>
                  <div style={{
                    width: '100%',
                    height: '8px',
                    background: '#e0e0e0',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    marginBottom: '16px'
                  }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
                      style={{
                        height: '100%',
                        background: 'linear-gradient(90deg, #2d5016, #4CAF50)',
                        borderRadius: '4px'
                      }}
                    />
                  </div>
                  <p style={{ margin: 0, textAlign: 'center', color: '#6c757d', fontSize: '14px' }}>
                    {progress}% completado
                  </p>
                </motion.div>
              </div>
            )}
            {pdfUrl ? (
              <div style={{ height: '100vh', width: '100%', display: 'flex', flexDirection: 'column' }}>
                <iframe
                  src={pdfUrl}
                  style={{
                    flex: 1,
                    border: 'none',
                    width: '100%',
                    height: '100%'
                  }}
                  title="Vista previa PDF"
                />
              </div>
            ) : (
              <div style={{ padding: 32, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100%' }}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <div style={{
                    fontSize: 64,
                    marginBottom: 24,
                    color: '#681b32',
                    opacity: 0.3
                  }}>
                    📄
                  </div>
                  <h3 style={{
                    color: '#2c3e50',
                    fontWeight: 700,
                    marginBottom: 12,
                    fontSize: 24
                  }}>
                    Exportación PDF - {years.length > 0 ? years.join(', ') : '—'}
                  </h3>
                  {!generatingPdf && (
                    <p style={{
                      color: '#6c757d',
                      fontSize: 16,
                      marginBottom: 24,
                      maxWidth: 500,
                      margin: '0 auto'
                    }}>
                      Haz clic en "Generar PDF" en el panel lateral para crear y visualizar el documento
                    </p>
                  )}
                  {!years || years.length === 0 ? (
                    <p style={{
                      color: '#dc3545',
                      fontSize: 14,
                      background: '#ffe6e6',
                      padding: '12px 20px',
                      borderRadius: 8,
                      display: 'inline-block',
                      fontWeight: 600
                    }}>
                      ⚠ Faltan parámetros necesarios (año)
                    </p>
                  ) : null}
                </motion.div>
              </div>
            )}
          </>
        )}
      </motion.main>
    </div>
  );
}
