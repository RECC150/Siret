import React, { useEffect, useRef, useState, useMemo } from "react";
import { useLocalStorage } from '../hooks/useLocalStorage';
import ASEBCS from "../assets/asebcs.jpg";
import Toast from "../Components/Toast";

export default function SiretEntes() {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [entes, setEntes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [classifications, setClassifications] = useState([]);
  const [toast, setToast] = useState(null);

  // Edit modal
  const [editEnte, setEditEnte] = useState(null);
  const editTitleRef = useRef();
  const editClassRef = useRef();
  const editDescRef = useRef();
  const editLinkRef = useRef();
  const [editIconFile, setEditIconFile] = useState(null);
  const [editIconPreview, setEditIconPreview] = useState(null);

  // Delete confirmation
  const [toDelete, setToDelete] = useState(null);

  // Create modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newIconFile, setNewIconFile] = useState(null);
  const [newIconPreview, setNewIconPreview] = useState(null);
  const newTitleRef = useRef();
  const newDescRef = useRef();
  const newLinkRef = useRef();
  const [newClassification, setNewClassification] = useState('');

  // Filters for the catalog
  const [enteQuery, setEnteQuery] = useLocalStorage('siretEntes_enteQuery', "");
  const [selectedEnteId, setSelectedEnteId] = useState(null);
  const [filterClasif, setFilterClasif] = useLocalStorage('siretEntes_filterClasif', 'Todos');

  // Estado para animación de cierre de modales
  const [closingModalIndex, setClosingModalIndex] = useState(null);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Funciones helper para cerrar modales con animación
  const closeModalWithAnimation = (modalIndex, callback) => {
    setClosingModalIndex(modalIndex);
    setTimeout(() => {
      callback();
      setClosingModalIndex(null);
    }, 300);
  };

  const closeAddModal = () => {
    closeModalWithAnimation('add', () => {
      setAddModalOpen(false);
      setNewIconFile(null);
      setNewIconPreview(null);
      setNewClassification('');
      if (newTitleRef.current) newTitleRef.current.value = '';
      if (newDescRef.current) newDescRef.current.value = '';
      if (newLinkRef.current) newLinkRef.current.value = '';
    });
  };

  const closeEditModal = () => {
    closeModalWithAnimation('edit', () => {
      setEditEnte(null);
      setEditIconFile(null);
      setEditIconPreview(null);
    });
  };

  const closeDeleteModal = () => {
    closeModalWithAnimation('delete', () => {
      setToDelete(null);
    });
  };

  // Load classifications from API
  const fetchClasificaciones = async () => {
    try {
      const apiUrl = `${(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')}/clasificaciones.php`;
      const res = await fetch(apiUrl);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json)) setClassifications(json);
      }
    } catch (err) { console.error(err); }
  };

  // Fetch entes
  const fetchEntes = async () => {
    setLoading(true);
    try {
      const apiUrl = `${(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')}/entes.php`;
      const res = await fetch(apiUrl);
      if (!res.ok) throw new Error("no-api");
      const json = await res.json();
      if (Array.isArray(json)) setEntes(json);
      else setEntes([]);
    } catch {
      setEntes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEntes(); }, []);
  useEffect(() => { fetchClasificaciones(); }, []);

  // Edit ente
  const saveEdit = async () => {
    if (!editEnte) return;
    const title = editTitleRef.current?.value?.trim() || editEnte.title;
    const classification = editClassRef.current?.value?.trim() || editEnte.classification;
    const description = editDescRef.current?.value?.trim() || '';
    const link = editLinkRef.current?.value?.trim() || '';

    if (!title) {
      setToast({ message: 'El nombre es requerido', type: 'warning' });
      return;
    }

    if (!classification) {
      setToast({ message: 'La clasificación es requerida', type: 'warning' });
      return;
    }

    try {
      const apiUrl = `${(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')}/ente_update.php`;
      const form = new FormData();
      form.append('id', editEnte.id);
      form.append('title', title);
      form.append('classification', classification);
      form.append('description', description);
      form.append('link', link);
      if (editIconFile) form.append('icon', editIconFile);

      const res = await fetch(apiUrl, { method: "POST", body: form });
      const json = await res.json();

      if (json.success) {
        await fetchEntes();
        setEditEnte(null);
        setEditIconFile(null);
        setEditIconPreview(null);
        setToast({ message: json.message || 'Ente actualizado exitosamente', type: 'success' });
      } else {
        setToast({ message: json.message || 'Error al actualizar el ente', type: 'error' });
      }
    } catch (err) {
      console.error(err);
      setToast({ message: 'Error al actualizar el ente', type: 'error' });
    }
  };

  // Create new ente
  const createEnte = async () => {
    const title = newTitleRef.current?.value?.trim() || '';
    const classification = newClassification || '';
    const description = newDescRef.current?.value?.trim() || '';
    const link = newLinkRef.current?.value?.trim() || '';

    if (!title) {
      setToast({ message: 'El nombre es requerido', type: 'warning' });
      return;
    }

    if (!classification) {
      setToast({ message: 'La clasificación es requerida', type: 'warning' });
      return;
    }

    try {
      const apiUrl = `${(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')}/ente_create.php`;
      const form = new FormData();
      form.append('title', title);
      if (classification) form.append('classification', classification);
      form.append('description', description);
      form.append('link', link);
      if (newIconFile) form.append('icon', newIconFile);

      const res = await fetch(apiUrl, { method: 'POST', body: form });
      const json = await res.json();

      if (res.ok && (json.success || json.id)) {
        await fetchEntes();
        setAddModalOpen(false);
        setNewIconFile(null);
        setNewIconPreview(null);
        setNewClassification('');
        if (newTitleRef.current) newTitleRef.current.value = '';
        setToast({ message: json.message || 'Ente creado exitosamente', type: 'success' });
      } else {
        setToast({ message: json.message || 'Error al crear el ente', type: 'error' });
      }
    } catch (err) {
      console.error(err);
      setToast({ message: 'Error al crear el ente', type: 'error' });
    }
  };  // Soft delete ente
  const softDelete = async () => {
    if (!toDelete) return;
    try {
      const apiUrl = `${(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')}/ente_delete.php`;
      const res = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: toDelete.id }) });
      const json = await res.json();

      if (json.success) {
        await fetchEntes();
        setToast({ message: json.message || 'Ente eliminado exitosamente', type: 'success' });
      } else {
        setToast({ message: json.message || 'Error al eliminar el ente', type: 'error' });
      }
      setToDelete(null);
    } catch (err) {
      console.error(err);
      setToast({ message: 'Error al eliminar el ente', type: 'error' });
      setToDelete(null);
    }
  };

  // Initialize edit modal preview when editEnte changes
  React.useEffect(() => {
    if (editEnte) {
      setEditIconPreview(editEnte.img || ASEBCS);
      setEditIconFile(null);
      if (editTitleRef.current) editTitleRef.current.value = editEnte.title || '';
      if (editClassRef.current) editClassRef.current.value = editEnte.classification || '';
      if (editDescRef.current) editDescRef.current.value = editEnte.description || '';
      if (editLinkRef.current) editLinkRef.current.value = editEnte.link || '';
    } else {
      setEditIconPreview(null);
      setEditIconFile(null);
    }
  }, [editEnte]);

  // Prevent body scroll while any modal is open
  React.useEffect(() => {
    const anyOpen = addModalOpen || !!editEnte || !!toDelete;
    const orig = document.body.style.overflow;
    if (anyOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = orig || '';
    return () => { document.body.style.overflow = orig || ''; };
  }, [addModalOpen, editEnte, toDelete]);

  // Filter entes
  const displayed = entes.filter(e => {
    if (selectedEnteId && Number(e.id) !== Number(selectedEnteId)) return false;
    if (enteQuery && !e.title.toLowerCase().includes(enteQuery.toLowerCase())) return false;
    if (filterClasif !== 'Todos' && e.classification !== filterClasif) return false;
    return true;
  });

  return (
    <div className="container-fluid px-0" style={{ paddingTop: '50px', background: '#f8f9fa', minHeight: '100vh' }}>
      <style>{`
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

      <header className="text-white text-center py-5" style={{ background: 'linear-gradient(135deg, #681b32 0%, #200b07 100%)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
        <h1 style={{ margin: 0, marginBottom: 8, fontWeight: 700 }}>SIRET</h1>
        <p className="lead" style={{ margin: 0, marginBottom: 0, opacity: 0.95 }}>Catálogo de entes</p>
      </header>

      <div className="container py-4">
      <section style={{ marginTop: 16 }}>
        <div className="card" style={{ border: 'none', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: 20 }}>
          <div className="card-body" style={{ padding: 24 }}>
            <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#681b32" viewBox="0 0 16 16">
                <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
              </svg>
              <h5 style={{ margin: 0, color: '#2c3e50', fontWeight: 600 }}>Filtros de búsqueda</h5>
            </div>
            <div className="row g-3 align-items-end">
              <div className="col-md-6">
                <label htmlFor="ente" className="form-label" style={{ fontWeight: 500, color: '#495057', marginBottom: 8 }}>Ente</label>
                <input id="ente" list="entes-list" className="form-control" value={enteQuery} onChange={e=>{
                  const v = e.target.value || '';
                  setEnteQuery(v);
                  const match = (entes || []).find(x => String(x.title) === String(v));
                  if (match) setSelectedEnteId(match.id); else setSelectedEnteId(null);
                }} placeholder="Buscar ente" style={{ borderRadius: 8, padding: '10px 14px', border: '2px solid #e9ecef' }} />
                <datalist id="entes-list">{(entes||[]).map((e,i)=>(<option key={i} value={e.title}/>))}</datalist>
              </div>
              <div className="col-md-6">
                <label className="form-label" style={{ fontWeight: 500, color: '#495057', marginBottom: 8 }}>Clasificación</label>
                <select className="form-select" value={filterClasif} onChange={e=>setFilterClasif(e.target.value)} style={{ borderRadius: 8, padding: '10px 14px', border: '2px solid #e9ecef' }}>
                  <option value="Todos">Todas las clasificaciones</option>
                  {classifications.map(c => (<option key={c.id} value={c.name || c.title}>{c.name || c.title}</option>))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <button className="btn" onClick={() => setAddModalOpen(true)} style={{ background: 'linear-gradient(135deg, #681b32 0%, #200b07 100%)', color: '#fff', border: 'none', padding: '10px 20px', fontWeight: 600, borderRadius: 8, boxShadow: '0 3px 8px rgba(104, 27, 50, 0.3)', transition: 'all 0.2s ease' }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 5px 12px rgba(104, 27, 50, 0.4)'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 3px 8px rgba(104, 27, 50, 0.3)'; }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16" style={{ marginRight: 8, verticalAlign: 'middle' }}>
                <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
              </svg>
              Agregar Ente
            </button>
          </div>
        </div>

        {loading ? <p>Cargando...</p> : (
          windowWidth < 768 ? (
            // Vista para Mobile: Cards verticales
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {displayed.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" viewBox="0 0 16 16" style={{ opacity: 0.5, marginBottom: 12 }}>
                    <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                    <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                  </svg>
                  <div>No hay entes registrados.</div>
                </div>
              ) : (
                displayed.map(e => (
                  <div key={e.id} style={{ background: '#fff', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e9ecef' }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                      <img src={e.img || ASEBCS} alt={e.title} style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 8, border: '2px solid #e9ecef', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, marginBottom: 4, wordBreak: 'break-word' }}>{e.title}</div>
                        <div style={{ fontSize: '13px', color: '#6c757d' }}>{e.classification}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button className="btn btn-sm" onClick={() => setEditEnte(e)} style={{ background: 'linear-gradient(to right, #681b32, #200b07)', color: '#fff', border: 'none', padding: '6px 8px', borderRadius: '6px', fontWeight: 500, boxShadow: '0 2px 4px rgba(104, 27, 50, 0.2)', transition: 'transform 0.2s ease', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0 }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'} title="Editar">
                        <svg xmlns="http://www.w3.org/2000/svg" width={12} height={12} fill="currentColor" viewBox="0 0 16 16">
                          <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/>
                        </svg>
                      </button>
                      <button className="btn btn-sm" onClick={() => setToDelete(e)} style={{ background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)', color: '#fff', border: 'none', padding: '6px 8px', borderRadius: '6px', fontWeight: 500, boxShadow: '0 2px 4px rgba(220, 53, 69, 0.2)', transition: 'transform 0.2s ease', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0 }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'} title="Eliminar">
                        <svg xmlns="http://www.w3.org/2000/svg" width={12} height={12} fill="currentColor" viewBox="0 0 16 16">
                          <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                          <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            // Vista tabla para Tablet/Desktop
            <table className="table table-sm" style={{ borderCollapse: 'collapse', background: '#fff', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <thead>
                <tr style={{ background: 'linear-gradient(135deg, #681b32 0%, #200b07 100%)', color: '#fff' }}>
                  <th style={{ borderBottom: 'none', padding: '14px 16px', fontWeight: 600 }}>Ente</th>
                  <th style={{ borderBottom: 'none', padding: '14px 16px', fontWeight: 600 }}>Clasificación</th>
                  <th style={{ borderBottom: 'none', textAlign: 'center', padding: '14px 16px', fontWeight: 600 }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {displayed.length === 0 && (<tr><td colSpan={3} style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" viewBox="0 0 16 16" style={{ opacity: 0.5, marginBottom: 12 }}>
                    <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                    <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                  </svg>
                  <div>No hay entes registrados.</div>
                </td></tr>)}
                {displayed.map(e => (
                  <tr key={e.id} style={{ transition: 'background 0.2s ease', cursor: 'pointer' }} onMouseEnter={(e) => e.currentTarget.style.background = '#f8f9fa'} onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}>
                    <td style={{ borderBottom: '1px solid #e9ecef', padding: '16px' }}>
                      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        <img src={e.img || ASEBCS} alt={e.title} style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 8, border: '2px solid #e9ecef' }} />
                        <div style={{ fontWeight: 600 }}>{e.title}</div>
                      </div>
                    </td>
                    <td style={{ borderBottom: '1px solid #e9ecef', padding: '16px' }}>{e.classification}</td>
                    <td style={{ borderBottom: '1px solid #e9ecef', textAlign: 'center', padding: '16px' }}>
                      <div style={{ display: 'flex', gap: windowWidth < 1100 ? 6 : 8, justifyContent: 'center', flexDirection: windowWidth < 1100 ? 'column' : 'row' }}>
                        <button className="btn btn-sm" onClick={() => setEditEnte(e)} style={{ background: 'linear-gradient(to right, #681b32, #200b07)', color: '#fff', border: 'none', padding: windowWidth < 1100 ? '10px 12px' : '8px 16px', borderRadius: '6px', fontWeight: 500, boxShadow: '0 2px 4px rgba(104, 27, 50, 0.2)', transition: 'transform 0.2s ease', fontSize: windowWidth < 1100 ? '12px' : '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: windowWidth < 1100 ? 2 : 6 }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'} title="Editar">
                          <svg xmlns="http://www.w3.org/2000/svg" width={windowWidth < 1100 ? 18 : 16} height={windowWidth < 1100 ? 18 : 16} fill="currentColor" viewBox="0 0 16 16">
                            <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/>
                          </svg>
                          {windowWidth < 1100 ? '' : 'Editar'}
                        </button>
                        <button className="btn btn-sm" onClick={() => setToDelete(e)} style={{ background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)', color: '#fff', border: 'none', padding: windowWidth < 1100 ? '10px 12px' : '8px 16px', borderRadius: '6px', fontWeight: 500, boxShadow: '0 2px 4px rgba(220, 53, 69, 0.2)', transition: 'transform 0.2s ease', fontSize: windowWidth < 1100 ? '12px' : '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: windowWidth < 1100 ? 2 : 6 }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'} title="Eliminar">
                          <svg xmlns="http://www.w3.org/2000/svg" width={windowWidth < 1100 ? 18 : 16} height={windowWidth < 1100 ? 18 : 16} fill="currentColor" viewBox="0 0 16 16">
                            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                            <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                          </svg>
                          {windowWidth < 1100 ? '' : 'Eliminar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </section>

      {addModalOpen && (
        <div className={`modal-backdrop${closingModalIndex === 'add' ? ' closing' : ''}`} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:2000 }}>
          <div className={`modal-content${closingModalIndex === 'add' ? ' closing' : ''}`} style={{ width: '95%', maxWidth: 1100, maxHeight: '90vh', background:'#fff', borderRadius:12, overflow:'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ background: 'linear-gradient(135deg, #681b32 0%, #200b07 100%)', color: '#fff', padding: '18px 24px', flexShrink: 0 }}>
              <h4 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16" style={{ marginRight: 12, verticalAlign: 'middle' }}>
                  <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                </svg>
                Nuevo Ente
              </h4>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 18, overflowY: 'auto', flex: 1 }}>
              <div style={{ display: 'flex', gap: 30, alignItems: windowWidth < 768 ? 'stretch' : 'flex-start', flexDirection: windowWidth < 768 ? 'column' : 'row' }}>
                <div style={{ flexShrink: 0, width: windowWidth < 768 ? '100%' : 'auto', alignSelf: windowWidth < 768 ? 'center' : 'auto', maxWidth: windowWidth < 768 ? 300 : 400 }}>
                  <div style={{ width: windowWidth < 768 ? '100%' : 400, aspectRatio: windowWidth < 768 ? '4/5' : 'auto', height: windowWidth < 768 ? 'auto' : 260, borderRadius: 10, overflow: 'hidden', border: '2px solid #e9ecef', background: '#f8f9fa', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src={newIconPreview || ASEBCS} alt="Icono ente" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, display: 'block', color: '#495057' }}>Cargar imagen</label>
                    <input type="file" accept="image/*" onChange={(ev)=>{
                      const f = ev.target.files && ev.target.files[0];
                      if (f) { setNewIconFile(f); setNewIconPreview(URL.createObjectURL(f)); }
                    }} className="form-control" style={{ borderRadius: 8, border: '1px solid #ddd', padding: '8px 10px', fontSize: '13px' }} />
                  </div>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, width: windowWidth < 768 ? '100%' : 'auto' }}>
                  <div>
                    <label style={{ fontWeight: 600, marginBottom: 8, display: 'block', color: '#2c3e50', fontSize: '15px' }}>Nombre <span style={{ color: '#dc3545' }}>*</span></label>
                    <input ref={newTitleRef} className="form-control" placeholder="Ej: Ministerio de Salud" style={{ borderRadius: 8, border: '1px solid #ddd', padding: '12px 12px', fontSize: '15px' }} />
                  </div>

                  <div>
                    <label style={{ fontWeight: 600, marginBottom: 8, display: 'block', color: '#2c3e50', fontSize: '15px' }}>Clasificación <span style={{ color: '#dc3545' }}>*</span></label>
                    <select value={newClassification} onChange={e=>setNewClassification(e.target.value)} className="form-select" style={{ borderRadius: 8, border: '1px solid #ddd', padding: '12px 12px', fontSize: '15px' }}>
                      <option value="">-- Seleccionar --</option>
                      {classifications.map(c => (<option key={c.id} value={c.name || c.title}>{c.name || c.title}</option>))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontWeight: 600, marginBottom: 8, display: 'block', color: '#2c3e50', fontSize: '15px' }}>Link de página web <span style={{ color: '#6c757d', fontSize: '13px', fontWeight: 400 }}>(opcional)</span></label>
                    <input ref={newLinkRef} className="form-control" placeholder="https://ejemplo.com" style={{ borderRadius: 8, border: '1px solid #ddd', padding: '12px 12px', fontSize: '15px' }} />
                  </div>
                </div>
              </div>

              <div>
                <label style={{ fontWeight: 600, marginBottom: 8, display: 'block', color: '#2c3e50', fontSize: '15px' }}>Descripción <span style={{ color: '#6c757d', fontSize: '13px', fontWeight: 400 }}>(opcional)</span></label>
                <textarea ref={newDescRef} className="form-control" placeholder="Detalles adicionales del ente..." style={{ borderRadius: 8, border: '1px solid #ddd', padding: '12px 12px', fontSize: '15px', minHeight: '140px', resize: 'vertical' }} />
              </div>
            </div>

            <div style={{ borderTop: '1px solid #e9ecef', padding: '14px 24px', background: '#f8f9fa', display: 'flex', justifyContent: 'flex-end', gap: 10, flexShrink: 0 }}>
              <button className="btn" onClick={closeAddModal} style={{ background: '#fff', color: '#6c757d', border: '1px solid #dee2e6', padding: '10px 24px', fontWeight: 600, borderRadius: 6, fontSize: '13px', transition: 'all 0.2s ease' }} onMouseEnter={(e) => { e.currentTarget.style.background = '#f8f9fa'; e.currentTarget.style.borderColor = '#adb5bd'; }} onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#dee2e6'; }}>Cancelar</button>
              <button className="btn" onClick={createEnte} style={{ background: 'linear-gradient(135deg, #681b32 0%, #200b07 100%)', color: '#fff', border: 'none', padding: '10px 28px', fontWeight: 600, borderRadius: 6, fontSize: '13px', boxShadow: '0 2px 6px rgba(104, 27, 50, 0.3)', transition: 'all 0.2s ease' }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 10px rgba(104, 27, 50, 0.4)'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(104, 27, 50, 0.3)'; }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="currentColor" viewBox="0 0 16 16" style={{ marginRight: 6, verticalAlign: 'middle' }}>
                  <path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/>
                </svg>
                Crear
              </button>
            </div>
          </div>
        </div>
      )}

      {editEnte && (
        <div className={`modal-backdrop${closingModalIndex === 'edit' ? ' closing' : ''}`} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:2000 }}>
          <div className={`modal-content${closingModalIndex === 'edit' ? ' closing' : ''}`} style={{ width: '95%', maxWidth: 1100, maxHeight: '90vh', background:'#fff', borderRadius:12, overflow:'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ background: 'linear-gradient(135deg, #681b32 0%, #200b07 100%)', color: '#fff', padding: '18px 24px', flexShrink: 0 }}>
              <h4 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16" style={{ marginRight: 12, verticalAlign: 'middle' }}>
                  <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/>
                </svg>
                Editar Ente
              </h4>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 18, overflowY: 'auto', flex: 1 }}>
              <div style={{ display: 'flex', gap: 30, alignItems: windowWidth < 768 ? 'stretch' : 'flex-start', flexDirection: windowWidth < 768 ? 'column' : 'row' }}>
                <div style={{ flexShrink: 0, width: windowWidth < 768 ? '100%' : 'auto', alignSelf: windowWidth < 768 ? 'center' : 'auto', maxWidth: windowWidth < 768 ? 300 : 400 }}>
                  <div style={{ width: windowWidth < 768 ? '100%' : 400, aspectRatio: windowWidth < 768 ? '4/5' : 'auto', height: windowWidth < 768 ? 'auto' : 260, borderRadius: 10, overflow: 'hidden', border: '2px solid #e9ecef', background: '#f8f9fa', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src={editIconPreview || ASEBCS} alt="Icono ente" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, display: 'block', color: '#495057' }}>Cambiar imagen</label>
                    <input type="file" accept="image/*" onChange={(ev)=>{
                      const f = ev.target.files && ev.target.files[0];
                      if (f) { setEditIconFile(f); setEditIconPreview(URL.createObjectURL(f)); }
                    }} className="form-control" style={{ borderRadius: 8, border: '1px solid #ddd', padding: '8px 10px', fontSize: '13px' }} />
                  </div>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, width: windowWidth < 768 ? '100%' : 'auto' }}>
                  <div>
                    <label style={{ fontWeight: 600, marginBottom: 8, display: 'block', color: '#2c3e50', fontSize: '15px' }}>Nombre <span style={{ color: '#dc3545' }}>*</span></label>
                    <input defaultValue={editEnte.title} ref={editTitleRef} className="form-control" placeholder="Ej: Ministerio de Salud" style={{ borderRadius: 8, border: '1px solid #ddd', padding: '12px 12px', fontSize: '15px' }} />
                  </div>

                  <div>
                    <label style={{ fontWeight: 600, marginBottom: 8, display: 'block', color: '#2c3e50', fontSize: '15px' }}>Clasificación <span style={{ color: '#dc3545' }}>*</span></label>
                    <select defaultValue={editEnte.classification || ''} ref={editClassRef} className="form-select" style={{ borderRadius: 8, border: '1px solid #ddd', padding: '12px 12px', fontSize: '15px' }}>
                      <option value="">-- Seleccionar --</option>
                      {classifications.map(c => (<option key={c.id} value={c.name || c.title}>{c.name || c.title}</option>))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontWeight: 600, marginBottom: 8, display: 'block', color: '#2c3e50', fontSize: '15px' }}>Link de página web <span style={{ color: '#6c757d', fontSize: '13px', fontWeight: 400 }}>(opcional)</span></label>
                    <input defaultValue={editEnte.link} ref={editLinkRef} className="form-control" placeholder="https://ejemplo.com" style={{ borderRadius: 8, border: '1px solid #ddd', padding: '12px 12px', fontSize: '15px' }} />
                  </div>
                </div>
              </div>

              <div>
                <label style={{ fontWeight: 600, marginBottom: 8, display: 'block', color: '#2c3e50', fontSize: '15px' }}>Descripción <span style={{ color: '#6c757d', fontSize: '13px', fontWeight: 400 }}>(opcional)</span></label>
                <textarea defaultValue={editEnte.description} ref={editDescRef} className="form-control" placeholder="Detalles adicionales del ente..." style={{ borderRadius: 8, border: '1px solid #ddd', padding: '12px 12px', fontSize: '15px', minHeight: '140px', resize: 'vertical' }} />
              </div>
            </div>

            <div style={{ borderTop: '1px solid #e9ecef', padding: '14px 24px', background: '#f8f9fa', display: 'flex', justifyContent: 'flex-end', gap: 10, flexShrink: 0 }}>
              <button className="btn" onClick={closeEditModal} style={{ background: '#fff', color: '#6c757d', border: '1px solid #dee2e6', padding: '10px 24px', fontWeight: 600, borderRadius: 6, fontSize: '13px', transition: 'all 0.2s ease' }} onMouseEnter={(e) => { e.currentTarget.style.background = '#f8f9fa'; e.currentTarget.style.borderColor = '#adb5bd'; }} onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#dee2e6'; }}>Cancelar</button>
              <button className="btn" onClick={saveEdit} style={{ background: 'linear-gradient(135deg, #681b32 0%, #200b07 100%)', color: '#fff', border: 'none', padding: '10px 28px', fontWeight: 600, borderRadius: 6, fontSize: '13px', boxShadow: '0 2px 6px rgba(104, 27, 50, 0.3)', transition: 'all 0.2s ease' }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 10px rgba(104, 27, 50, 0.4)'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(104, 27, 50, 0.3)'; }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="currentColor" viewBox="0 0 16 16" style={{ marginRight: 6, verticalAlign: 'middle' }}>
                  <path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/>
                </svg>
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {toDelete && (
        <div className={`modal-backdrop${closingModalIndex === 'delete' ? ' closing' : ''}`} style={{ position:'fixed',left:0,top:0,right:0,bottom:0,background:'rgba(0,0,0,0.6)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:2000 }}>
          <div className={`modal-content${closingModalIndex === 'delete' ? ' closing' : ''}`} style={{ width: 480, background:'#fff', borderRadius:12, overflow:'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.25)' }}>
            <div style={{ background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)', color: '#fff', padding: '20px 24px' }}>
              <h4 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 16 16" style={{ marginRight: 10, verticalAlign: 'middle' }}>
                  <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
                </svg>
                Confirmar eliminación
              </h4>
            </div>
            <div style={{ padding: '24px' }}>
              <p style={{ margin: 0, fontSize: 15, color: '#2c3e50' }}>¿Estás seguro de que deseas eliminar el ente <strong style={{ color: '#681b32' }}>{toDelete.title}</strong>? Se eliminarán <strong style={{ color: '#000000' }}>TODOS</strong> los cumplimientos del ente</p>
            </div>
            <div style={{ borderTop: '1px solid #e9ecef', padding: '18px 24px', background:'#f8f9fa', display:'flex', justifyContent:'flex-end', gap:10 }}>
              <button className="btn" onClick={closeDeleteModal} style={{ background: '#fff', color: '#6c757d', border: '2px solid #dee2e6', padding: '10px 24px', fontWeight: 600, borderRadius: 8, transition: 'all 0.2s ease' }} onMouseEnter={(e) => { e.currentTarget.style.background = '#f8f9fa'; e.currentTarget.style.borderColor = '#adb5bd'; }} onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#dee2e6'; }}>Cancelar</button>
              <button className="btn" onClick={softDelete} style={{ background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)', color: '#fff', border: 'none', padding: '10px 28px', fontWeight: 600, borderRadius: 8, boxShadow: '0 3px 8px rgba(220, 53, 69, 0.3)', transition: 'all 0.2s ease' }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 5px 12px rgba(220, 53, 69, 0.4)'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 3px 8px rgba(220, 53, 69, 0.3)'; }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style={{ marginRight: 8, verticalAlign: 'middle' }}>
                  <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                  <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                </svg>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

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




