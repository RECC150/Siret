import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import jsPDF from 'jspdf';
import asebcsLogo from '../assets/asebcs.jpg';

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

  const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

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

  // Parse selected years
  const selectedYears = useMemo(() => {
    const raw = yearsParam.trim();
    if (!raw) return [];
    return raw.split('-').map(x => parseInt(x, 10)).filter(n => !isNaN(n)).sort((a,b)=>b-a);
  }, [yearsParam]);

  // Parse selected ente id (single)
  const selectedEnteId = useMemo(() => {
    const raw = (enteIdsParam || '').trim();
    if (!raw) return null;
    const first = raw.split('-').map(x => parseInt(x, 10)).find(n => !isNaN(n));
    return first ?? null;
  }, [enteIdsParam]);

  // Load data
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!selectedEnteId || !selectedYears.length) { setLoading(false); return; }
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
  }, [apiBase, selectedEnteId, selectedYears]);

  const selectedEnte = useMemo(() => {
    return (entes || []).find(e => Number(e.id) === Number(selectedEnteId)) || null;
  }, [entes, selectedEnteId]);

  const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  const getStatusForMonthYear = (enteId, month, year) => {
    const rec = (compliances || []).find(c => Number(c.ente_id) === Number(enteId) && String(c.month) === String(month) && Number(c.year) === Number(year));
    return (rec?.status || '').toLowerCase();
  };

  const summary = useMemo(() => {
    if (!selectedEnteId) return { g:0, y:0, r:0, total:0, ic:'0.0' };
    let g=0,y=0,r=0; let total=0;
    selectedYears.forEach(yv => {
      months.forEach(m => {
        const s = getStatusForMonthYear(selectedEnteId, m, yv);
        if (!s) return;
        total++;
        if (s==='cumplio') g++; else if (s==='parcial') y++; else if (s==='no') r++;
      });
    });
    const ic = total>0 ? ((g/total)*100).toFixed(1) : '0.0';
    return { g,y,r,total, ic };
  }, [selectedEnteId, selectedYears, compliances]);

  useEffect(() => () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl); }, [pdfUrl]);

  const handleGeneratePDF = async () => {
    if (!selectedEnte) return;
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
      const headerText1 = selectedEnte.title.toUpperCase();
      const lines1 = pdf.splitTextToSize(headerText1, col2MaxWidth);
      let textY = 18;
      lines1.forEach(line => {
        pdf.text(line, centerCol2, textY, { align: 'center' });
        textY += 12;
      });

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      const headerText2 = (selectedEnte.classification || 'Sin clasificación').toUpperCase();
      const lines2 = pdf.splitTextToSize(headerText2, col2MaxWidth);
      lines2.forEach(line => {
        pdf.text(line, centerCol2, textY, { align: 'center' });
        textY += 10;
      });

      pdf.setFontSize(7);
      pdf.text(`IC: ${summary.ic}%`, margin, 82);
      pdf.setFont('helvetica', 'italic');
      pdf.text(`Actualizada al ${new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}`, pageWidth / 2, 82, { align: 'center' });
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Años: ${selectedYears.join(', ')}`, pageWidth - margin, 82, { align: 'right' });

      yPos = 100;
      setProgress(20);

      // Resumen porcentajes con badges
      const total = summary.total;
      const pct = v => total > 0 ? ((v / total) * 100).toFixed(1) : '0.0';
      const verde = pct(summary.g);
      const amarillo = pct(summary.y);
      const rojo = pct(summary.r);

      pdf.setFillColor(248, 249, 250);
      pdf.rect(0, yPos, pageWidth, 170, 'F');

      const badgeY = yPos + 15;
      const badgeSpacing = 180;
      let badgeX = (pageWidth - (badgeSpacing * 3)) / 2;

      // Badge verde
      pdf.setDrawColor(31, 122, 61);
      pdf.setLineWidth(2);
      pdf.roundedRect(badgeX, badgeY, 160, 24, 3, 3, 'S');
      pdf.setFillColor(31, 122, 61);
      pdf.roundedRect(badgeX + 8, badgeY + 4, 16, 16, 2, 2, 'F');
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(31, 122, 61);
      pdf.text(`Cumplió: ${summary.g} (${verde}%)`, badgeX + 30, badgeY + 15);

      badgeX += badgeSpacing;
      // Badge amarillo
      pdf.setDrawColor(242, 201, 76);
      pdf.roundedRect(badgeX, badgeY, 160, 24, 3, 3, 'S');
      pdf.setFillColor(242, 201, 76);
      pdf.roundedRect(badgeX + 8, badgeY + 4, 16, 16, 2, 2, 'F');
      pdf.setTextColor(160, 121, 3);
      pdf.text(`No cumplió: ${summary.y} (${amarillo}%)`, badgeX + 30, badgeY + 15);

      badgeX += badgeSpacing;
      // Badge rojo
      pdf.setDrawColor(231, 76, 60);
      pdf.roundedRect(badgeX, badgeY, 160, 24, 3, 3, 'S');
      pdf.setFillColor(231, 76, 60);
      pdf.roundedRect(badgeX + 8, badgeY + 4, 16, 16, 2, 2, 'F');
      pdf.setTextColor(231, 76, 60);
      pdf.text(`No presentó: ${summary.r} (${rojo}%)`, badgeX + 30, badgeY + 15);

      // Gráfica de barras
      const chartY = yPos + 50;
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
        const barX = margin + (idx * monthWidth) + (monthWidth / 2) - ((selectedYears.length * 9) / 2);
        selectedYears.forEach((y, yIdx) => {
          const s = getStatusForMonthYear(selectedEnteId, m, y);
          const status = (s || '').toLowerCase();
          let color = [233, 236, 239];
          let height = 0;
          if (status === 'cumplio') { color = [40, 167, 69]; height = 50; }
          else if (status === 'parcial') { color = [255, 193, 7]; height = 35; }
          else if (status === 'no') { color = [220, 53, 69]; height = 20; }
          if (height > 0) {
            pdf.setFillColor(...color);
            pdf.setDrawColor(0, 0, 0, 0.1);
            pdf.roundedRect(barX + (yIdx * 9), barContainerY + (barContainerHeight - height), 8, height, 1.5, 1.5, 'FD');
          }
        });
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
      const legendText = selectedYears.join(' | ');
      pdf.text(legendText, pageWidth / 2, chartY + 95, { align: 'center' });

      yPos = chartY + chartHeight + 25;
      setProgress(40);

      // Tabla de meses x años
      const usableWidth = pageWidth - (margin * 2);
      const col1Width = usableWidth * 0.22;
      const colYearWidth = (usableWidth - col1Width) / (selectedYears.length + 1);

      const drawTableHeader = () => {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        pdf.setFillColor(52, 73, 94);
        pdf.setTextColor(255, 255, 255);
        pdf.rect(margin, yPos, usableWidth, 20, 'F');
        pdf.setDrawColor(44, 62, 80);
        pdf.setLineWidth(1);
        pdf.rect(margin, yPos, col1Width, 20);
        pdf.text('MES', margin + 5, yPos + 13);

        selectedYears.forEach((y, idx) => {
          const xCol = margin + col1Width + (idx * colYearWidth);
          pdf.rect(xCol, yPos, colYearWidth, 20);
          pdf.text(String(y), xCol + (colYearWidth / 2), yPos + 13, { align: 'center' });
        });

        const icColX = margin + col1Width + (selectedYears.length * colYearWidth);
        pdf.rect(icColX, yPos, colYearWidth, 20);
        pdf.text('IC', icColX + (colYearWidth / 2), yPos + 13, { align: 'center' });
        yPos += 20;
      };

      drawTableHeader();

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      months.forEach((m, idx) => {
        const rowHeight = 18;
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
        pdf.rect(margin, yPos, col1Width, rowHeight);
        pdf.text(m, margin + 5, yPos + 12);

        selectedYears.forEach((y, yIdx) => {
          const s = getStatusForMonthYear(selectedEnteId, m, y);
          const xCol = margin + col1Width + (yIdx * colYearWidth);
          let cellColor = [255, 255, 255];
          if (s === 'cumplio') cellColor = [45, 80, 22];
          else if (s === 'parcial') cellColor = [255, 215, 0];
          else if (s === 'no') cellColor = [220, 53, 69];
          pdf.setFillColor(...cellColor);
          pdf.rect(xCol, yPos, colYearWidth, rowHeight, 'FD');
        });

        // IC por mes
        const statsForMonth = selectedYears.map(y => getStatusForMonthYear(selectedEnteId, m, y));
        const totalItems = statsForMonth.filter(Boolean).length;
        const cumplidos = statsForMonth.filter(s => (s || '').toLowerCase() === 'cumplio').length;
        const icm = totalItems > 0 ? Math.round((cumplidos / totalItems) * 100) : null;
        const icColX = margin + col1Width + (selectedYears.length * colYearWidth);
        pdf.setFillColor(...bgColor);
        pdf.rect(icColX, yPos, colYearWidth, rowHeight, 'FD');
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(44, 62, 80);
        if (icm !== null) {
          pdf.text(`${icm}%`, icColX + (colYearWidth / 2), yPos + 12, { align: 'center' });
        } else {
          pdf.text('-', icColX + (colYearWidth / 2), yPos + 12, { align: 'center' });
        }

        yPos += rowHeight;
      });

      // Fila IC por año
      const icRowHeight = 18;
      if (yPos + icRowHeight + 5 > pageHeight - margin) {
        pdf.addPage();
        yPos = margin;
        drawTableHeader();
      }

      pdf.setFillColor(241, 243, 245);
      pdf.rect(margin, yPos, usableWidth, icRowHeight, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(44, 62, 80);
      pdf.rect(margin, yPos, col1Width, icRowHeight, 'D');
      pdf.text('IC', margin + 5, yPos + 12);

      selectedYears.forEach((y, yIdx) => {
        const items = (compliances || []).filter(c => Number(c.ente_id) === Number(selectedEnteId) && Number(c.year) === Number(y));
        const monthsWithData = months.filter(m => items.some(c => c.month === m)).length || 12;
        const cumplidos = items.filter(c => (c.status || '').toLowerCase() === 'cumplio').length;
        const ic = monthsWithData > 0 ? Math.round((cumplidos / monthsWithData) * 100) : null;
        const xCol = margin + col1Width + (yIdx * colYearWidth);
        pdf.rect(xCol, yPos, colYearWidth, icRowHeight, 'D');
        if (ic !== null) {
          pdf.text(`${ic}%`, xCol + (colYearWidth / 2), yPos + 12, { align: 'center' });
        } else {
          pdf.text('-', xCol + (colYearWidth / 2), yPos + 12, { align: 'center' });
        }
      });

      const icColX = margin + col1Width + (selectedYears.length * colYearWidth);
      pdf.rect(icColX, yPos, colYearWidth, icRowHeight, 'D');
      pdf.text(`${summary.ic}%`, icColX + (colYearWidth / 2), yPos + 12, { align: 'center' });

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
    link.download = `SIRET_ente_${selectedEnteId}_${selectedYears.join('-')}.pdf`;
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
      <style>{`.navbar { display: none !important; }`}</style>
      <motion.button style={toggleBtnStyle} onClick={() => setSidebarVisible(s => !s)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        {sidebarVisible ? '‹' : '›'}
      </motion.button>
      <motion.aside style={sidebarStyle} initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.4, ease: 'easeOut' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
          <h2 style={titleStyle}>Exportación PDF</h2>
          <p style={{ marginTop: 4, opacity: 0.9, fontWeight: 700, fontSize: 15 }}>{selectedEnte ? selectedEnte.title : '—'}</p>
          <p style={{ marginTop: -8, opacity: 0.8, fontWeight: 700 }}>Años: {selectedYears.length ? selectedYears.join(', ') : '—'}</p>
          {(!selectedEnteId || !selectedYears.length) && <p style={{ fontSize: 12, background: 'rgba(220,53,69,.15)', padding: '6px 8px', borderRadius: 6, fontWeight: 600 }}>Faltan parámetros: enteIds y/o years.</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: .98 }} onClick={() => window.history.back()} style={{ ...btnStyle, background: '#13492f' }}>← Regresar</motion.button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: .98 }} style={{ ...btnStyle, background: pdfUrl ? '#28a745' : '#dc3545' }} onClick={handleGeneratePDF} disabled={generating || loading || !selectedEnteId || !selectedYears.length}>
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
              {(!selectedEnteId || !selectedYears.length) ? (
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
