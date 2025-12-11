import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import jsPDF from 'jspdf';
import asebcsLogo from '../assets/asebcs.jpg';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

export default function SiretExportPDFEnte(){
  const params = new URLSearchParams(window.location.search);
  const yearsParam = params.get('years') || '';
  const enteIdsParam = params.get('enteIds') || '';

  // UI
  const [sidebarVisible, setSidebarVisible] = useState(true);

  // Data
  const [compliances, setCompliances] = useState([]);
  const [entes, setEntes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [progress, setProgress] = useState(0);

  const apiBase = `${window.location.protocol}//${window.location.hostname}/siret/api`;

  const sidebarWidth = 260;
  const containerStyle = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    display: 'flex', background: '#f8f9fa', overflow: 'hidden', zIndex: 1
  };
  const sidebarStyle = {
    width: sidebarVisible ? sidebarWidth : 0,
    background: 'linear-gradient(135deg, #681b32 0%, #200b07 100%)',
    color: '#fff', padding: sidebarVisible ? '24px 16px' : '0',
    boxShadow: '2px 0 8px rgba(0,0,0,0.15)', position: 'relative', overflow: 'hidden',
    height: '100vh', transition: 'all 0.3s ease', zIndex: 2000
  };
  const contentWrapperStyle = {
    flex: 1, padding: pdfUrl ? '0' : '32px', overflowY: 'auto', height: '100vh', background: '#ffffff', transition: 'margin-left .3s'
  };
  const titleStyle = { margin: 0, fontWeight: 800, letterSpacing: '0.5px' };
  const btnStyle = { background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 16px', cursor: 'pointer', fontWeight: 700, fontSize: 14 };
  const toggleBtnStyle = {
    position: 'fixed', bottom: 20, left: sidebarVisible ? '270px' : '10px',
    background: 'linear-gradient(135deg, #681b32 0%, #200b07 100%)', color: '#fff', border: 'none',
    borderRadius: '50%', width: 50, height: 50, fontSize: 24, fontWeight: 'bold', cursor: 'pointer',
    zIndex: 10000, boxShadow: '0 4px 12px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s ease'
  };

  // Parse selected years (take only the first/most recent year)
  const selectedYears = useMemo(() => {
    const raw = yearsParam.trim();
    if (!raw) return [];
    const years = raw.split('-').map(x => parseInt(x, 10)).filter(n => !isNaN(n)).sort((a,b)=>b-a);
    return years.length > 0 ? [years[0]] : []; // Solo el primer (más reciente) año
  }, [yearsParam]);

  // Parse selected ente ids (two entes for comparison)
  const [selectedEnteIds, selectedEnteIdLeft, selectedEnteIdRight] = useMemo(() => {
    const raw = (enteIdsParam || '').trim();
    if (!raw) return [[], null, null];
    const ids = raw.split('-').map(x => parseInt(x, 10)).filter(n => !isNaN(n));
    return [ids, ids[0] ?? null, ids[1] ?? null];
  }, [enteIdsParam]);

  // Load data
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if ((!selectedEnteIdLeft && !selectedEnteIdRight) || !selectedYears.length) { setLoading(false); return; }
      setLoading(true);
      try {
        const [cRes, eRes] = await Promise.all([
          fetch(apiBase + '/compliances.php'),
          fetch(apiBase + '/entes.php')
        ]);
        const [cJson, eJson] = await Promise.all([cRes.json(), eRes.json()]);
        if (!mounted) return;
        setCompliances(Array.isArray(cJson) ? cJson : []);
        setEntes(Array.isArray(eJson) ? eJson : []);
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [apiBase, selectedEnteIdLeft, selectedEnteIdRight, selectedYears]);

  const selectedEnteLeft = useMemo(() => {
    return (entes || []).find(e => Number(e.id) === Number(selectedEnteIdLeft)) || null;
  }, [entes, selectedEnteIdLeft]);

  const selectedEnteRight = useMemo(() => {
    return (entes || []).find(e => Number(e.id) === Number(selectedEnteIdRight)) || null;
  }, [entes, selectedEnteIdRight]);

  const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  const getStatusForMonthYear = (enteId, month, year) => {
    const rec = (compliances || []).find(c => Number(c.ente_id) === Number(enteId) && String(c.month) === String(month) && Number(c.year) === Number(year));
    return (rec?.status || '').toLowerCase();
  };

  const computePercentagesForEnte = (enteId, yearsToUse) => {
    if (!enteId) return { cumplio:0, parcial:0, no:0 };
    const years = Array.isArray(yearsToUse) && yearsToUse.length ? yearsToUse : [selectedYears[0]];
    let totals = { cumplio:0, parcial:0, no:0 };
    years.forEach(y=>{
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

  const summary = useMemo(() => {
    if (!selectedEnteIdLeft) return { g:0, y:0, r:0, total:0, ic:'0.0' };
    let g=0,y=0,r=0; let total=0;
    selectedYears.forEach(yv => {
      months.forEach(m => {
        const s = getStatusForMonthYear(selectedEnteIdLeft, m, yv);
        if (!s) return;
        total++;
        if (s==='cumplio') g++; else if (s==='parcial') y++; else if (s==='no') r++;
      });
    });
    const ic = total>0 ? ((g/total)*100).toFixed(1) : '0.0';
    return { g,y,r,total, ic };
  }, [selectedEnteIdLeft, selectedYears, compliances]);

  useEffect(() => () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl); }, [pdfUrl]);

  const handleGeneratePDF = async () => {
    if (!selectedEnteLeft) return;
    setGenerating(true);
    setProgress(0);
    try {
      const pdf = new jsPDF('p', 'pt', 'a4');
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

      setProgress(10);

      // Header con logo y título
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
      const headerText1 = `COMPARACIÓN: ${selectedEnteLeft.title.toUpperCase()} | ${selectedEnteRight?.title?.toUpperCase() || ''}`;
      const lines1 = pdf.splitTextToSize(headerText1, col2MaxWidth);
      let textY = 18;
      lines1.forEach(line => {
        pdf.text(line, centerCol2, textY, { align: 'center' });
        textY += 12;
      });

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      const headerText2 = `${selectedEnteLeft.classification || 'Sin clasificación'} | ${selectedEnteRight?.classification || 'Sin clasificación'}`;
      const lines2 = pdf.splitTextToSize(headerText2, col2MaxWidth);
      lines2.forEach(line => {
        pdf.text(line, centerCol2, textY, { align: 'center' });
        textY += 10;
      });

      pdf.setFontSize(7);
      const pctLeft = computePercentagesForEnte(selectedEnteIdLeft, selectedYears);
      const pctRight = computePercentagesForEnte(selectedEnteIdRight, selectedYears);
      pdf.text(`IC: ${pctLeft.cumplio}% | ${pctRight.cumplio}%`, margin, 82);
      pdf.setFont('helvetica', 'italic');
      pdf.text(`Actualizada al ${new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}`, pageWidth / 2, 82, { align: 'center' });
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Años: ${selectedYears.join(', ')}`, pageWidth - margin, 82, { align: 'right' });

      yPos = 100;
      setProgress(20);

      // Resumen porcentajes con badges
      const pctLeftStats = computePercentagesForEnte(selectedEnteIdLeft, selectedYears);
      const pctRightStats = computePercentagesForEnte(selectedEnteIdRight, selectedYears);

      pdf.setFillColor(248, 249, 250);
      pdf.rect(0, yPos, pageWidth, 220, 'F');

      // ENTE 1
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(44, 62, 80);
      pdf.text(selectedEnteLeft.title, margin, yPos + 15);

      const badgeY1 = yPos + 25;
      const badgeSpacing = 180;
      let badgeX = (pageWidth - (badgeSpacing * 3)) / 2;

      // Badge verde Ente 1
      pdf.setDrawColor(31, 122, 61);
      pdf.setLineWidth(2);
      pdf.roundedRect(badgeX, badgeY1, 160, 24, 3, 3, 'S');
      pdf.setFillColor(31, 122, 61);
      pdf.roundedRect(badgeX + 8, badgeY1 + 4, 16, 16, 2, 2, 'F');
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(31, 122, 61);
      pdf.text(`Cumplió: ${pctLeftStats.cumplio}%`, badgeX + 30, badgeY1 + 15);

      badgeX += badgeSpacing;
      // Badge amarillo Ente 1
      pdf.setDrawColor(242, 201, 76);
      pdf.roundedRect(badgeX, badgeY1, 160, 24, 3, 3, 'S');
      pdf.setFillColor(242, 201, 76);
      pdf.roundedRect(badgeX + 8, badgeY1 + 4, 16, 16, 2, 2, 'F');
      pdf.setTextColor(160, 121, 3);
      pdf.text(`No cumplió: ${pctLeftStats.parcial}%`, badgeX + 30, badgeY1 + 15);

      badgeX += badgeSpacing;
      // Badge rojo Ente 1
      pdf.setDrawColor(231, 76, 60);
      pdf.roundedRect(badgeX, badgeY1, 160, 24, 3, 3, 'S');
      pdf.setFillColor(231, 76, 60);
      pdf.roundedRect(badgeX + 8, badgeY1 + 4, 16, 16, 2, 2, 'F');
      pdf.setTextColor(231, 76, 60);
      pdf.text(`No presentó: ${pctLeftStats.no}%`, badgeX + 30, badgeY1 + 15);

      // ENTE 2
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(44, 62, 80);
      pdf.text(selectedEnteRight?.title || 'Ente 2', margin, yPos + 75);

      const badgeY2 = yPos + 85;
      badgeX = (pageWidth - (badgeSpacing * 3)) / 2;

      // Badge verde Ente 2
      pdf.setDrawColor(31, 122, 61);
      pdf.setLineWidth(2);
      pdf.roundedRect(badgeX, badgeY2, 160, 24, 3, 3, 'S');
      pdf.setFillColor(31, 122, 61);
      pdf.roundedRect(badgeX + 8, badgeY2 + 4, 16, 16, 2, 2, 'F');
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(31, 122, 61);
      pdf.text(`Cumplió: ${pctRightStats.cumplio}%`, badgeX + 30, badgeY2 + 15);

      badgeX += badgeSpacing;
      // Badge amarillo Ente 2
      pdf.setDrawColor(242, 201, 76);
      pdf.roundedRect(badgeX, badgeY2, 160, 24, 3, 3, 'S');
      pdf.setFillColor(242, 201, 76);
      pdf.roundedRect(badgeX + 8, badgeY2 + 4, 16, 16, 2, 2, 'F');
      pdf.setTextColor(160, 121, 3);
      pdf.text(`No cumplió: ${pctRightStats.parcial}%`, badgeX + 30, badgeY2 + 15);

      badgeX += badgeSpacing;
      // Badge rojo Ente 2
      pdf.setDrawColor(231, 76, 60);
      pdf.roundedRect(badgeX, badgeY2, 160, 24, 3, 3, 'S');
      pdf.setFillColor(231, 76, 60);
      pdf.roundedRect(badgeX + 8, badgeY2 + 4, 16, 16, 2, 2, 'F');
      pdf.setTextColor(231, 76, 60);
      pdf.text(`No presentó: ${pctRightStats.no}%`, badgeX + 30, badgeY2 + 15);

      // Gráfica de barras para ambos entes
      const chartY = yPos + 130;
      const chartWidth = pageWidth - (margin * 2);
      const chartHeight = 100;
      pdf.setFillColor(255, 255, 255);
      pdf.setDrawColor(233, 236, 239);
      pdf.setLineWidth(1);
      pdf.roundedRect(margin, chartY, chartWidth, chartHeight, 4, 4, 'FD');

      const barContainerY = chartY + 10;
      const barContainerHeight = 70;
      const monthWidth = chartWidth / months.length;

      months.forEach((m, idx) => {
        const barX = margin + (idx * monthWidth) + (monthWidth / 2) - 12;

        // Barra Ente 1
        const sLeft = getStatusForMonthYear(selectedEnteIdLeft, m, selectedYears[0]);
        const statusLeft = (sLeft || '').toLowerCase();
        let colorLeft = [233, 236, 239];
        let heightLeft = 0;
        if (statusLeft === 'cumplio') { colorLeft = [40, 167, 69]; heightLeft = 50; }
        else if (statusLeft === 'parcial') { colorLeft = [255, 193, 7]; heightLeft = 35; }
        else if (statusLeft === 'no') { colorLeft = [220, 53, 69]; heightLeft = 20; }
        if (heightLeft > 0) {
          pdf.setFillColor(...colorLeft);
          pdf.setDrawColor(0, 0, 0, 0.1);
          pdf.roundedRect(barX, barContainerY + (barContainerHeight - heightLeft), 8, heightLeft, 1.5, 1.5, 'FD');
        }

        // Barra Ente 2
        const sRight = getStatusForMonthYear(selectedEnteIdRight, m, selectedYears[0]);
        const statusRight = (sRight || '').toLowerCase();
        let colorRight = [233, 236, 239];
        let heightRight = 0;
        if (statusRight === 'cumplio') { colorRight = [40, 167, 69]; heightRight = 50; }
        else if (statusRight === 'parcial') { colorRight = [255, 193, 7]; heightRight = 35; }
        else if (statusRight === 'no') { colorRight = [220, 53, 69]; heightRight = 20; }
        if (heightRight > 0) {
          pdf.setFillColor(...colorRight);
          pdf.setDrawColor(0, 0, 0, 0.1);
          pdf.roundedRect(barX + 10, barContainerY + (barContainerHeight - heightRight), 8, heightRight, 1.5, 1.5, 'FD');
        }
      });

      // Labels de meses
      pdf.setFontSize(7);
      pdf.setTextColor(108, 117, 125);
      months.forEach((m, idx) => {
        pdf.text(m.slice(0, 3), margin + (idx * monthWidth) + (monthWidth / 2), chartY + 85, { align: 'center' });
      });

      // Leyenda de años
      pdf.setFontSize(7);
      pdf.setTextColor(73, 80, 87);
      pdf.setFont('helvetica', 'bold');
      const legendText = `Ente 1 | Ente 2 - ${selectedYears.join(', ')}`;
      pdf.text(legendText, pageWidth / 2, chartY + 95, { align: 'center' });

      yPos = chartY + chartHeight + 25;
      setProgress(40);

      // Tabla de meses con ambos entes
      const usableWidth = pageWidth - (margin * 2);
      const colMesWidth = usableWidth * 0.15;
      const colEnteWidth = (usableWidth - colMesWidth) / 2; // Solo Ente 1 y Ente 2

      const drawTableHeader = () => {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        pdf.setFillColor(52, 73, 94);
        pdf.setTextColor(255, 255, 255);
        pdf.rect(margin, yPos, usableWidth, 20, 'F');
        pdf.setDrawColor(44, 62, 80);
        pdf.setLineWidth(1);
        pdf.rect(margin, yPos, colMesWidth, 20);
        pdf.text('MES', margin + 5, yPos + 13);

        const colEnte1X = margin + colMesWidth;
        pdf.rect(colEnte1X, yPos, colEnteWidth, 20);
        const ente1Text = pdf.splitTextToSize(selectedEnteLeft.title, colEnteWidth - 10);
        pdf.text(ente1Text[0] || selectedEnteLeft.title, colEnte1X + 5, yPos + 13);

        const colEnte2X = colEnte1X + colEnteWidth;
        pdf.rect(colEnte2X, yPos, colEnteWidth, 20);
        const ente2Text = pdf.splitTextToSize(selectedEnteRight?.title || 'Ente 2', colEnteWidth - 10);
        pdf.text(ente2Text[0] || (selectedEnteRight?.title || 'Ente 2'), colEnte2X + 5, yPos + 13);

        yPos += 20;
      };

      // Fila de año (solo si hay múltiples años)
      if (selectedYears.length > 1) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        pdf.setFillColor(200, 210, 220);
        pdf.setTextColor(44, 62, 80);
        const yearRowHeight = 16;
        pdf.rect(margin, yPos, usableWidth, yearRowHeight, 'F');
        pdf.text(selectedYears.join(' | '), margin + 5, yPos + 11);
        yPos += yearRowHeight;
      }

      drawTableHeader();

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      months.forEach((m, idx) => {
        const rowHeight = 16;
        if (yPos + rowHeight + 5 > pageHeight - margin) {
          pdf.addPage();
          yPos = margin;
          drawTableHeader();
        }

        const bgColor = idx % 2 === 0 ? [255, 255, 255] : [248, 249, 250];
        pdf.setFillColor(...bgColor);
        pdf.rect(margin, yPos, usableWidth, rowHeight, 'F');

        pdf.setTextColor(44, 62, 80);
        pdf.setFont('helvetica', 'bold');
        pdf.setDrawColor(222, 226, 230);
        pdf.setLineWidth(0.5);
        pdf.rect(margin, yPos, colMesWidth, rowHeight);
        pdf.text(m, margin + 5, yPos + 11);

        // Ente 1
        const colEnte1X = margin + colMesWidth;
        const sLeft = getStatusForMonthYear(selectedEnteIdLeft, m, selectedYears[0]);
        let cellColorLeft = [255, 255, 255];
        if (sLeft === 'cumplio') cellColorLeft = [45, 80, 22];
        else if (sLeft === 'parcial') cellColorLeft = [255, 215, 0];
        else if (sLeft === 'no') cellColorLeft = [220, 53, 69];
        pdf.setFillColor(...cellColorLeft);
        pdf.rect(colEnte1X, yPos, colEnteWidth, rowHeight, 'FD');

        // Ente 2
        const colEnte2X = colEnte1X + colEnteWidth;
        const sRight = getStatusForMonthYear(selectedEnteIdRight, m, selectedYears[0]);
        let cellColorRight = [255, 255, 255];
        if (sRight === 'cumplio') cellColorRight = [45, 80, 22];
        else if (sRight === 'parcial') cellColorRight = [255, 215, 0];
        else if (sRight === 'no') cellColorRight = [220, 53, 69];
        pdf.setFillColor(...cellColorRight);
        pdf.rect(colEnte2X, yPos, colEnteWidth, rowHeight, 'FD');

        yPos += rowHeight;
      });

      // Fila de IC (resumen final)
      const icRowHeight = 16;
      if (yPos + icRowHeight + 5 > pageHeight - margin) {
        pdf.addPage();
        yPos = margin;
        drawTableHeader();
      }

      pdf.setFillColor(52, 73, 94);
      pdf.rect(margin, yPos, usableWidth, icRowHeight, 'F');
      pdf.setDrawColor(44, 62, 80);
      pdf.setLineWidth(1);

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(255, 255, 255);
      pdf.rect(margin, yPos, colMesWidth, icRowHeight);
      pdf.text('IC TOTAL', margin + 5, yPos + 11);

      // IC Ente 1
      const colEnte1X_ic = margin + colMesWidth;
      pdf.rect(colEnte1X_ic, yPos, colEnteWidth, icRowHeight);
      pdf.setTextColor(255, 255, 255);
      pdf.text(`${pctLeftStats.cumplio}%`, colEnte1X_ic + (colEnteWidth / 2), yPos + 11, { align: 'center' });

      // IC Ente 2
      const colEnte2X_ic = colEnte1X_ic + colEnteWidth;
      pdf.rect(colEnte2X_ic, yPos, colEnteWidth, icRowHeight);
      pdf.text(`${pctRightStats.cumplio}%`, colEnte2X_ic + (colEnteWidth / 2), yPos + 11, { align: 'center' });

      yPos += icRowHeight;

      setProgress(100);
      const blob = pdf.output('blob');
      const url = URL.createObjectURL(blob);
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      setPdfUrl(url);
    } catch (e) {
      console.error(e);
      alert('Error al generar el PDF: ' + e.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!pdfUrl) return;
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `SIRET_comparativo_${selectedEnteIdLeft}-${selectedEnteIdRight}_${selectedYears.join('-')}.pdf`;
    link.click();
  };

  const getStatusColor = (s) => {
    const v = (s || '').toLowerCase();
    if (v === 'cumplio') return '#2d5016';
    if (v === 'parcial') return '#ffd700';
    if (v === 'no') return '#dc3545';
    return '#ffffff';
  };

  return (
    <div style={containerStyle}>
      <motion.button style={toggleBtnStyle} onClick={() => setSidebarVisible(s => !s)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        {sidebarVisible ? '‹' : '›'}
      </motion.button>
      <motion.aside style={sidebarStyle} initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.4, ease: 'easeOut' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
          <h2 style={titleStyle}>Exportación PDF - Comparativa</h2>
          <p style={{ marginTop: 4, opacity: 0.9, fontWeight: 700, fontSize: 15 }}>{selectedEnteLeft ? selectedEnteLeft.title : '—'}</p>
          <p style={{ marginTop: -8, opacity: 0.9, fontWeight: 700, fontSize: 15 }}>{selectedEnteRight ? selectedEnteRight.title : '—'}</p>
          <p style={{ marginTop: -8, opacity: 0.8, fontWeight: 700 }}>Años: {selectedYears.length ? selectedYears.join(', ') : '—'}</p>
          {((!selectedEnteIdLeft && !selectedEnteIdRight) || !selectedYears.length) && <p style={{ fontSize: 12, background: 'rgba(220,53,69,.15)', padding: '6px 8px', borderRadius: 6, fontWeight: 600 }}>Faltan parámetros: enteIds y/o years.</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: .98 }} onClick={() => window.history.back()} style={{ ...btnStyle, background: '#13492f' }}>← Regresar</motion.button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: .98 }} style={{ ...btnStyle, background: pdfUrl ? '#28a745' : '#dc3545' }} onClick={handleGeneratePDF} disabled={generating || loading || (!selectedEnteIdLeft && !selectedEnteIdRight) || !selectedYears.length}>
              {generating ? 'Generando…' : pdfUrl ? '✓ PDF Generado' : 'Generar PDF'}
            </motion.button>
            {pdfUrl && (
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: .98 }} style={{ ...btnStyle, background: '#0d6efd' }} onClick={handleDownload} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
                ⬇ Descargar PDF
              </motion.button>
            )}
          </div>
        </div>
      </motion.aside>
      <motion.main style={contentWrapperStyle} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.45, ease: 'easeOut' }}>
        {generating && (
          <div style={{ position:'fixed', inset:0, background:'rgba(0, 0, 0, 0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 }}>
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ background:'#fff', padding:'40px', borderRadius:'12px', minWidth:'400px', boxShadow:'0 10px 40px rgba(0,0,0,0.3)' }}>
              <h3 style={{ margin: 0, marginBottom: 20, textAlign: 'center', color: '#2c3e50' }}>Generando PDF</h3>
              <div style={{ width:'100%', height:8, background:'#e0e0e0', borderRadius:4, overflow:'hidden', marginBottom:16 }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} style={{ height:'100%', background:'linear-gradient(90deg, #2d5016, #4CAF50)', borderRadius:4 }} />
              </div>
              <p style={{ margin: 0, textAlign: 'center', color:'#6c757d', fontSize: 14 }}>{progress}% completado</p>
            </motion.div>
          </div>
        )}
        {pdfUrl ? (
          <div style={{ position:'fixed', top:0, right:0, bottom:0, left: sidebarVisible ? sidebarWidth : 0, background:'#fff', zIndex: 1000 }}>
            <iframe src={pdfUrl} style={{ display:'block', border:'none', width:'100%', height:'100%' }} title="Vista previa del PDF" />
          </div>
        ) : (
          <div style={{ padding: 32, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100%' }}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <div style={{ fontSize: 64, marginBottom: 24, color: '#681b32', opacity: 0.3 }}>📄</div>
              <h3 style={{ color: '#2c3e50', fontWeight: 700, marginBottom: 12, fontSize: 24 }}>Exportación PDF por ente</h3>
              {!generating && (
                <p style={{ color: '#6c757d', fontSize: 16, marginBottom: 24, maxWidth: 520, margin: '0 auto' }}>
                  Haz clic en "Generar PDF" para crear y visualizar el documento
                </p>
              )}
              {((!selectedEnteIdLeft && !selectedEnteIdRight) || !selectedYears.length) ? (
                <p style={{ color: '#dc3545', fontSize: 14, background: '#ffe6e6', padding: '12px 20px', borderRadius: 8, display: 'inline-block', fontWeight: 600 }}>
                  ⚠ Faltan parámetros necesarios (enteIds y/o years)
                </p>
              ) : loading ? (
                <p style={{ color: '#6c757d', fontSize: 14 }}>Cargando datos...</p>
              ) : null}
            </motion.div>
          </div>
        )}


      </motion.main>
    </div>
  );
}
