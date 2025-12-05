import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import jsPDF from 'jspdf';
import asebcsLogo from '../assets/asebcs.jpg';

export default function SiretExportPDFMes(){
  const params = new URLSearchParams(window.location.search);
  const year = params.get('year');
  const month = params.get('month');
  const q = params.get('q') || '';
  const clasif = params.get('clasif') || '';
  const enteIdsParam = params.get('enteIds') || '';

  // UI
  const [sidebarVisible, setSidebarVisible] = useState(true);

  // Data
  const [compliances, setCompliances] = useState([]);
  const [entes, setEntes] = useState([]);
  const [entesActivosSet, setEntesActivosSet] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [progress, setProgress] = useState(0); // progreso de generación estilo anual

  const apiBase = `${window.location.protocol}//${window.location.hostname}/siret/api`;

  const sidebarWidth = 260;
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
    width: sidebarVisible ? sidebarWidth : 0,
    background: 'linear-gradient(135deg, #681b32 0%, #200b07 100%)',
    color: '#fff',
    padding: sidebarVisible ? '24px 16px' : '0',
    boxShadow: '2px 0 8px rgba(0,0,0,0.15)',
    position: 'relative',
    overflow: 'hidden',
    height: '100vh',
    transition: 'all 0.3s ease',
    zIndex: 2000
  };
  const contentWrapperStyle = {
    flex: 1,
    // Quitar padding cuando el PDF está visible para que el iframe abarque todo
    padding: pdfUrl ? '0' : '32px',
    overflowY: 'auto',
    height: '100vh',
    background: '#ffffff',
    marginLeft: sidebarVisible ? 0 : 0,
    transition: 'margin-left .3s'
  };
  const titleStyle = {
    margin: 0,
    fontWeight: 800,
    letterSpacing: '0.5px'
  };
  const btnStyle = {
    background: 'rgba(255,255,255,0.15)',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '12px 16px',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: 14
  };
  const toggleBtnStyle = {
    position: 'fixed',
    bottom: 20,
    left: sidebarVisible ? '270px' : '10px',
    background: 'linear-gradient(135deg, #681b32 0%, #200b07 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '50%',
    width: 50,
    height: 50,
    fontSize: 24,
    fontWeight: 'bold',
    cursor: 'pointer',
    zIndex: 10000,
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease'
  };

  // Load data for year/month
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!year) return;
      setLoading(true);
      try {
        const [cRes, eRes, aRes] = await Promise.all([
          fetch(apiBase + '/compliances.php'),
          fetch(apiBase + '/entes.php'),
          fetch(apiBase + `/entes_activos.php?year=${encodeURIComponent(year)}`)
        ]);
        const [cJson, eJson, aJson] = await Promise.all([cRes.json(), eRes.json(), aRes.json()]);
        if (!mounted) return;
        setCompliances(Array.isArray(cJson) ? cJson : []);
        setEntes(Array.isArray(eJson) ? eJson : []);
        setEntesActivosSet(new Set((Array.isArray(aJson) ? aJson : []).map(r => Number(r.ente_id))));
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [apiBase, year]);

  // Map of status by ente for given month
  const statusByEnte = useMemo(() => {
    const map = new Map();
    (compliances || []).forEach(c => {
      if (String(c.year) === String(year) && String(c.month) === String(month)) {
        map.set(Number(c.ente_id), (c.status || '').toLowerCase());
      }
    });
    return map;
  }, [compliances, year, month]);

  // Parse explicit ids (higher priority)
  const parsedIds = useMemo(() => {
    const raw = (enteIdsParam || '').trim();
    if (!raw) return null;
    const set = new Set();
    raw.split('-').forEach(x => {
      const n = Number(x);
      if (!Number.isNaN(n)) set.add(n);
    });
    return set.size ? set : null;
  }, [enteIdsParam]);

  // Filtered entes for rendering/PDF
  const filteredEntes = useMemo(() => {
    let base = [];
    if (parsedIds) {
      base = (entes || []).filter(e => parsedIds.has(Number(e.id)));
    } else {
      base = (entes || []).filter(e => entesActivosSet.has(Number(e.id)));
      const qq = (q || '').trim().toLowerCase();
      if (qq) base = base.filter(e => (e.title || '').toLowerCase().includes(qq));
      if (clasif && clasif !== 'Todos') base = base.filter(e => (e.classification || '') === clasif);
    }
    base.sort((a,b) => {
      const c1 = (a.classification || '').localeCompare(b.classification || '');
      if (c1 !== 0) return c1;
      return (a.title || '').localeCompare(b.title || '');
    });
    return base;
  }, [entes, entesActivosSet, parsedIds, q, clasif]);

  // Summary + IC
  const summary = useMemo(() => {
    let g = 0, y = 0, r = 0;
    filteredEntes.forEach(e => {
      const s = (statusByEnte.get(Number(e.id)) || '').toLowerCase();
      if (s === 'cumplio') g++;
      else if (s === 'parcial') y++;
      else if (s === 'no') r++;
    });
    const total = g + y + r;
    const ic = total > 0 ? ((g / total) * 100).toFixed(1) : '0.0';
    return { g, y, r, total, ic };
  }, [filteredEntes, statusByEnte]);

  // Cleanup PDF URL on unmount
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  const handleGeneratePDF = async () => {
    setGenerating(true);
    setProgress(0);
    try {
      const pdf = new jsPDF('p', 'pt', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 32;
      const usableWidth = pageWidth - (margin * 2);
      const col1Width = usableWidth * 0.494;
      const col2Width = usableWidth * 0.414;
      const col3Width = usableWidth * 0.092;
      const minRowHeight = 18;

      let yPos = margin;

      setProgress(5);

      // Header institucional (se dibuja primero)
      pdf.setFillColor(44, 62, 80);
      pdf.rect(0, 0, pageWidth, 90, 'F');

      // Tabla invisible: Columna 1 (logo), Columna 2 (título)
      const logoColWidth = 95;
      const titleColX = logoColWidth;
      const titleColWidth = pageWidth - logoColWidth;

      // Agregar logo de ASEBCS (columna 1)
      try {
        const img = new Image();
        img.src = asebcsLogo;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const imgData = canvas.toDataURL('image/jpeg');

        // Logo centrado en su columna
        const logoWidth = 70;
        const logoHeight = (img.height / img.width) * logoWidth;
        const logoCenterX = (logoColWidth / 2) - (logoWidth / 2);
        pdf.addImage(imgData, 'JPEG', logoCenterX, 8, logoWidth, logoHeight);
      } catch (e) {
        console.warn('No se pudo cargar el logo:', e);
      }

      setProgress(10);

      // Título y subtítulo centrados en columna 2 con texto que ocupa todo el ancho
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');

      const col2LeftMargin = titleColX + 10; // margen izquierdo de la columna 2
      const col2RightMargin = pageWidth - 10; // margen derecho de la columna 2
      const col2MaxWidth = col2RightMargin - col2LeftMargin;
      const centerCol2 = titleColX + (titleColWidth / 2);

      // Dividir texto largo para que ocupe el ancho disponible
      const headerText1 = 'TABLA DE CUMPLIMIENTO DE ENTREGA DE INFORMES MENSUALES';
      const headerText2 = `A LA AUDITORÍA SUPERIOR DEL ESTADO DE BAJA CALIFORNIA SUR ${year}`;

      const lines1 = pdf.splitTextToSize(headerText1, col2MaxWidth);
      const lines2 = pdf.splitTextToSize(headerText2, col2MaxWidth);

      let textY = 18;
      lines1.forEach(line => {
        pdf.text(line, centerCol2, textY, { align: 'center' });
        textY += 12;
      });

      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      lines2.forEach(line => {
        pdf.text(line, centerCol2, textY, { align: 'center' });
        textY += 10;
      });

      pdf.setFontSize(8);
      pdf.text(`PLATAFORMA SIRET - ${month} ${year}`, centerCol2, textY + 3, { align: 'center' });

      pdf.setFontSize(7);
      pdf.text(`IC: ${summary.ic}%`, margin, 75);
      const today = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
      pdf.text(`Actualizada al ${today}`, pageWidth / 2, 75, { align: 'center' });
      const rightMargin = pageWidth - margin - 5;
      pdf.text(`Entes: ${summary.total}`, rightMargin, 75, { align: 'right' });      yPos = 100;
      setProgress(20);

      // Resumen con gráfica de dona
      const total = summary.total;
      const verde = summary.g;
      const amarillo = summary.y;
      const rojo = summary.r;
      const verdePct = total > 0 ? ((verde / total) * 100).toFixed(1) : '0.0';
      const amarilloPct = total > 0 ? ((amarillo / total) * 100).toFixed(1) : '0.0';
      const rojoPct = total > 0 ? ((rojo / total) * 100).toFixed(1) : '0.0';

      const donutCenterX = pageWidth / 2 - 60;
      const donutCenterY = yPos + 40;
      const donutRadius = 30;
      const donutThickness = 12;

      // Dibujar segmentos de dona
      let startAngle = -90;
      if (verde > 0) {
        const angle = (parseFloat(verdePct) / 100) * 360;
        pdf.setFillColor(31, 122, 61);
        drawDonutSegment(pdf, donutCenterX, donutCenterY, donutRadius, donutThickness, startAngle, angle);
        startAngle += angle;
      }
      if (amarillo > 0) {
        const angle = (parseFloat(amarilloPct) / 100) * 360;
        pdf.setFillColor(242, 201, 76);
        drawDonutSegment(pdf, donutCenterX, donutCenterY, donutRadius, donutThickness, startAngle, angle);
        startAngle += angle;
      }
      if (rojo > 0) {
        const angle = (parseFloat(rojoPct) / 100) * 360;
        pdf.setFillColor(231, 76, 60);
        drawDonutSegment(pdf, donutCenterX, donutCenterY, donutRadius, donutThickness, startAngle, angle);
      }

      // Leyenda
      const legendX = pageWidth / 2 + 20;
      let legendY = yPos + 15;

      pdf.setFillColor(31, 122, 61);
      pdf.rect(legendX, legendY, 10, 10, 'F');
      pdf.setTextColor(44, 62, 80);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Cumplió: ${verdePct}%`, legendX + 15, legendY + 7);

      legendY += 20;
      pdf.setFillColor(242, 201, 76);
      pdf.rect(legendX, legendY, 10, 10, 'F');
      pdf.text(`No cumplió: ${amarilloPct}%`, legendX + 15, legendY + 7);

      legendY += 20;
      pdf.setFillColor(231, 76, 60);
      pdf.rect(legendX, legendY, 10, 10, 'F');
      pdf.text(`No presentó: ${rojoPct}%`, legendX + 15, legendY + 7);

      yPos += 90;
      setProgress(40);

      // Tabla de entes
      if (yPos + 60 > pageHeight - margin) {
        pdf.addPage();
        yPos = margin;
      }

      const drawTableHeader = () => {
        pdf.setFillColor(52, 73, 94);
        pdf.rect(margin, yPos, usableWidth, 20, 'F');

        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.text('ENTE', margin + 5, yPos + 13);
        pdf.text('CLASIFICACIÓN', margin + col1Width + 5, yPos + 13);
        pdf.text('ESTADO', margin + col1Width + col2Width + (col3Width / 2), yPos + 13, { align: 'center' });

        yPos += 20;
      };

      drawTableHeader();
      setProgress(50);

      // Filas de datos con altura dinámica
      filteredEntes.forEach((e, idx) => {
        const enteName = e.title || '';
        const clasifName = e.classification || 'Sin clasificación';

        // Calcular altura necesaria para el texto
        const maxEnteWidth = col1Width - 10;
        const maxClasifWidth = col2Width - 10;

        const enteLines = pdf.splitTextToSize(enteName, maxEnteWidth);
        const clasifLines = pdf.splitTextToSize(clasifName, maxClasifWidth);

        const lineSpacing = 10; // Aumentado de 5 a 7 para más espaciado
        const enteHeight = enteLines.length * lineSpacing;
        const clasifHeight = clasifLines.length * lineSpacing;
        const rowHeight = Math.max(minRowHeight, enteHeight + 6, clasifHeight + 6);

        if (yPos + rowHeight + 5 > pageHeight - margin) {
          pdf.addPage();
          yPos = margin;
          drawTableHeader();
        }

        const s = statusByEnte.get(Number(e.id)) || '';
        const isEven = idx % 2 === 0;

        // Fondo de fila
        if (isEven) {
          pdf.setFillColor(255, 255, 255);
        } else {
          pdf.setFillColor(248, 249, 250);
        }
        pdf.rect(margin, yPos, usableWidth, rowHeight, 'F');

        // Bordes
        pdf.setDrawColor(222, 226, 230);
        pdf.setLineWidth(0.5);
        pdf.line(margin, yPos, margin + usableWidth, yPos);
        pdf.line(margin, yPos + rowHeight, margin + usableWidth, yPos + rowHeight);
        pdf.line(margin, yPos, margin, yPos + rowHeight);
        pdf.line(margin + col1Width, yPos, margin + col1Width, yPos + rowHeight);
        pdf.line(margin + col1Width + col2Width, yPos, margin + col1Width + col2Width, yPos + rowHeight);
        pdf.line(margin + usableWidth, yPos, margin + usableWidth, yPos + rowHeight);

        // Texto
        pdf.setTextColor(44, 62, 80);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');

        // Dibujar todas las líneas del ente (alineado a la izquierda)
        let textYPos = yPos + 6;
        enteLines.forEach(line => {
          pdf.text(line, margin + 5, textYPos, { align: 'left' });
          textYPos += lineSpacing;
        });

        // Dibujar todas las líneas de clasificación (alineado a la izquierda)
        textYPos = yPos + 6;
        clasifLines.forEach(line => {
          pdf.text(line, margin + col1Width + 5, textYPos, { align: 'left' });
          textYPos += lineSpacing;
        });

        // Estado (color)
        const statusX = margin + col1Width + col2Width + 3;
        const statusY = yPos + 3;
        const statusW = col3Width - 6;
        const statusH = rowHeight - 6;

        if (s === 'cumplio') {
          pdf.setFillColor(45, 80, 22);
        } else if (s === 'parcial') {
          pdf.setFillColor(255, 215, 0);
        } else if (s === 'no') {
          pdf.setFillColor(220, 53, 69);
        } else {
          pdf.setFillColor(255, 255, 255);
        }
        pdf.rect(statusX, statusY, statusW, statusH, 'F');

        yPos += rowHeight;
        setProgress(50 + (idx / filteredEntes.length) * 40);
      });

      setProgress(95);

      // Create blob URL for preview
      const blob = pdf.output('blob');
      const url = URL.createObjectURL(blob);
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
      setPdfUrl(url);
      setProgress(100);
    } catch (e) {
      console.error(e);
      alert('Error al generar el PDF: ' + e.message);
    } finally {
      setGenerating(false);
    }
  };

  // Helper para dibujar segmento de dona
  const drawDonutSegment = (pdf, cx, cy, radius, thickness, startAngle, sweepAngle) => {
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = ((startAngle + sweepAngle) * Math.PI) / 180;
    const outerRadius = radius;
    const innerRadius = radius - thickness;

    // Dibujar segmento usando path
    const steps = Math.max(Math.ceil(Math.abs(sweepAngle) / 5), 1);
    const angleStep = (endRad - startRad) / steps;

    for (let i = 0; i < steps; i++) {
      const a1 = startRad + (i * angleStep);
      const a2 = startRad + ((i + 1) * angleStep);

      const x1 = cx + innerRadius * Math.cos(a1);
      const y1 = cy + innerRadius * Math.sin(a1);
      const x2 = cx + outerRadius * Math.cos(a1);
      const y2 = cy + outerRadius * Math.sin(a1);
      const x3 = cx + outerRadius * Math.cos(a2);
      const y3 = cy + outerRadius * Math.sin(a2);
      const x4 = cx + innerRadius * Math.cos(a2);
      const y4 = cy + innerRadius * Math.sin(a2);

      pdf.triangle(x1, y1, x2, y2, x3, y3, 'F');
      pdf.triangle(x1, y1, x3, y3, x4, y4, 'F');
    }
  };

  const handleDownload = () => {
    if (!pdfUrl) return;
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `SIRET_${month || ''}_${year || ''}.pdf`;
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
            <h2 style={titleStyle}>Exportación PDF</h2>
            <p style={{ marginTop: 4, opacity: 0.8, fontWeight: 700 }}>Año {year || '—'} - Mes {month || '—'}</p>
            {(!year || !month) && <p style={{ fontSize: 12, background: 'rgba(220,53,69,.15)', padding: '6px 8px', borderRadius: 6, fontWeight: 600 }}>Faltan parámetros year y/o month.</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: .98 }} onClick={() => window.history.back()} style={{ ...btnStyle, background: '#13492f' }}>
                ← Regresar
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: .98 }}
                style={{ ...btnStyle, background: pdfUrl ? '#28a745' : '#dc3545' }}
                onClick={handleGeneratePDF}
                disabled={generating || loading}
              >
                {generating ? 'Generando…' : pdfUrl ? '✓ PDF Generado' : 'Generar PDF'}
              </motion.button>
              {pdfUrl && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: .98 }}
                  style={{ ...btnStyle, background: '#0d6efd' }}
                  onClick={handleDownload}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  ⬇ Descargar PDF
                </motion.button>
              )}
            </div>
        </div>
      </motion.aside>
      <motion.main
        style={contentWrapperStyle}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        {generating && (
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
          <div style={{ position:'fixed', top:0, right:0, bottom:0, left: sidebarVisible ? sidebarWidth : 0, background:'#fff', zIndex: 1000 }}>
            <iframe
              src={pdfUrl}
              style={{
                display:'block',
                border: 'none',
                width: '100%',
                height: '100%'
              }}
              title="Vista previa del PDF"
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
                Exportación PDF - {month} {year}
              </h3>
              {!generating && (
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
              {!year || !month ? (
                <p style={{
                  color: '#dc3545',
                  fontSize: 14,
                  background: '#ffe6e6',
                  padding: '12px 20px',
                  borderRadius: 8,
                  display: 'inline-block',
                  fontWeight: 600
                }}>
                  ⚠ Faltan parámetros necesarios (año y/o mes)
                </p>
              ) : loading ? (
                <p style={{ color: '#6c757d', fontSize: 14 }}>
                  Cargando datos...
                </p>
              ) : null}
            </motion.div>
          </div>
        )}
      </motion.main>
    </div>
  );
}
