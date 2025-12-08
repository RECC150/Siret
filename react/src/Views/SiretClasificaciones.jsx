import React, { useEffect, useRef, useState } from "react";
import ASEBCS from "../assets/asebcs.jpg";
import Toast from "../Components/Toast";

export default function SiretClasificaciones() {
  const [clasificaciones, setClasificaciones] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editItem, setEditItem] = useState(null);
  const editRef = useRef();

  const [toDelete, setToDelete] = useState(null);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [closingModalIndex, setClosingModalIndex] = useState(null);
  const newRef = useRef();
  const [toast, setToast] = useState(null);

  const closeModalWithAnimation = (modalId, callback) => {
    setClosingModalIndex(modalId);
    setTimeout(() => {
      setClosingModalIndex(null);
      callback();
    }, 300);
  };

  const closeAddModal = () => {
    closeModalWithAnimation('add', () => {
      setAddModalOpen(false);
      if (newRef.current) newRef.current.value = '';
    });
  };

  const closeEditModal = () => {
    closeModalWithAnimation('edit', () => {
      setEditItem(null);
    });
  };

  const closeDeleteModal = () => {
    closeModalWithAnimation('delete', () => {
      setToDelete(null);
    });
  };

  const fetchClasificaciones = async () => {
    setLoading(true);
    try {
      const apiUrl = `${window.location.protocol}//${window.location.hostname}/siret/api/clasificaciones.php`;
      const res = await fetch(apiUrl);
      if (!res.ok) throw new Error('no-api');
      const json = await res.json();
      if (Array.isArray(json)) setClasificaciones(json);
      else setClasificaciones([]);
    } catch (err) {
      setClasificaciones([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(()=>{ fetchClasificaciones(); }, []);

  // prevent body scroll while modals open
  React.useEffect(() => {
    const anyOpen = addModalOpen || !!editItem || !!toDelete;
    const orig = document.body.style.overflow;
    if (anyOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = orig || '';
    return () => { document.body.style.overflow = orig || ''; };
  }, [addModalOpen, editItem, toDelete]);

  const createClasificacion = async () => {
    const title = newRef.current?.value?.trim() || '';
    if (!title) {
      setToast({ message: 'El nombre es requerido', type: 'warning' });
      return;
    }
    try {
      const apiUrl = `${window.location.protocol}//${window.location.hostname}/siret/api/clasificacion_create.php`;
      const res = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title }) });
      const json = await res.json();

      if (json.success) {
        await fetchClasificaciones();
        setAddModalOpen(false);
        if (newRef.current) newRef.current.value = '';
        setToast({ message: json.message || 'Clasificación creada exitosamente', type: 'success' });
      } else {
        setToast({ message: json.message || 'Error al crear la clasificación', type: 'error' });
      }
    } catch (err) {
      console.error(err);
      setToast({ message: 'Error al crear la clasificación', type: 'error' });
    }
  };

  const saveEdit = async () => {
    if (!editItem) return;
    const title = editRef.current?.value?.trim() || editItem.title;
    if (!title) {
      setToast({ message: 'El nombre es requerido', type: 'warning' });
      return;
    }
    try {
      const apiUrl = `${window.location.protocol}//${window.location.hostname}/siret/api/clasificacion_update.php`;
      const res = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editItem.id, title }) });
      const json = await res.json();

      if (json.success) {
        await fetchClasificaciones();
        setEditItem(null);
        setToast({ message: json.message || 'Clasificación actualizada exitosamente', type: 'success' });
      } else {
        setToast({ message: json.message || 'Error al actualizar la clasificación', type: 'error' });
      }
    } catch (err) {
      console.error(err);
      setToast({ message: 'Error al actualizar la clasificación', type: 'error' });
    }
  };

  const softDelete = async () => {
    if (!toDelete) return;
    try {
      const apiUrl = `${window.location.protocol}//${window.location.hostname}/siret/api/clasificacion_delete.php`;
      const res = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: toDelete.id }) });
      const json = await res.json();

      if (json.success) {
        await fetchClasificaciones();
        setToast({ message: json.message || 'Clasificación eliminada exitosamente', type: 'success' });
      } else {
        setToast({ message: json.message || 'Error al eliminar la clasificación', type: 'error' });
      }
      setToDelete(null);
    } catch (err) {
      console.error(err);
      setToast({ message: 'Error al eliminar la clasificación', type: 'error' });
      setToDelete(null);
    }
  };

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
      `}</style>

      <header className="text-white text-center py-5" style={{ background: 'linear-gradient(135deg, #681b32 0%, #200b07 100%)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
        <h1 style={{ margin: 0, marginBottom: 8, fontWeight: 700 }}>SIRET</h1>
        <p className="lead" style={{ margin: 0, marginBottom: 0, opacity: 0.95 }}>Catálogo de clasificaciones</p>
      </header>

      <div className="container py-4">
      <section style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <button className="btn" onClick={()=>setAddModalOpen(true)} style={{ background: 'linear-gradient(135deg, #681b32 0%, #200b07 100%)', color: '#fff', border: 'none', padding: '10px 20px', fontWeight: 600, borderRadius: 8, boxShadow: '0 3px 8px rgba(104, 27, 50, 0.3)', transition: 'all 0.2s ease' }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 5px 12px rgba(104, 27, 50, 0.4)'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 3px 8px rgba(104, 27, 50, 0.3)'; }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16" style={{ marginRight: 8, verticalAlign: 'middle' }}>
                <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
              </svg>
              Agregar Clasificación
            </button>
          </div>
        </div>

        {loading ? <p>Cargando...</p> : (
          <table className="table table-sm" style={{ borderCollapse: 'collapse', background: '#fff', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <thead>
              <tr style={{ background: 'linear-gradient(135deg, #681b32 0%, #200b07 100%)', color: '#fff' }}>
                <th style={{ borderBottom: 'none', padding: '14px 16px', fontWeight: 600 }}>Clasificación</th>
                <th style={{ borderBottom: 'none', textAlign: 'center', padding: '14px 16px', fontWeight: 600 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clasificaciones.length === 0 && (<tr><td colSpan={2} style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" viewBox="0 0 16 16" style={{ opacity: 0.5, marginBottom: 12 }}>
                  <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                  <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                </svg>
                <div>No hay clasificaciones registradas.</div>
              </td></tr>)}
              {clasificaciones.map(c => (
                <tr key={c.id} style={{ transition: 'background 0.2s ease', cursor: 'pointer' }} onMouseEnter={(e) => e.currentTarget.style.background = '#f8f9fa'} onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}>
                  <td style={{ borderBottom: '1px solid #e9ecef', padding: '16px' }}>{c.title || c.name}</td>
                  <td style={{ borderBottom: '1px solid #e9ecef', textAlign: 'center', padding: '16px' }}>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                      <button className="btn btn-sm" onClick={()=>setEditItem(c)} style={{ background: 'linear-gradient(to right, #681b32, #200b07)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 500, boxShadow: '0 2px 4px rgba(104, 27, 50, 0.2)', transition: 'transform 0.2s ease' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'} title="Editar">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style={{ marginRight: 6, verticalAlign: 'middle' }}>
                          <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/>
                        </svg>
                        Editar
                      </button>
                      <button className="btn btn-sm" onClick={()=>setToDelete(c)} style={{ background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 500, boxShadow: '0 2px 4px rgba(220, 53, 69, 0.2)', transition: 'transform 0.2s ease' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'} title="Eliminar">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style={{ marginRight: 6, verticalAlign: 'middle' }}>
                          <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                          <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                        </svg>
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {addModalOpen && (
        <div className={`modal-backdrop${closingModalIndex === 'add' ? ' closing' : ''}`} style={{ position:'fixed',left:0,top:0,right:0,bottom:0,background:'rgba(0,0,0,0.6)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:2000 }}>
          <div className={`modal-content${closingModalIndex === 'add' ? ' closing' : ''}`} style={{ width: 520, background:'#fff', borderRadius:12, overflow:'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.25)' }}>
            <div style={{ background: 'linear-gradient(135deg, #681b32 0%, #200b07 100%)', color: '#fff', padding: '20px 24px' }}>
              <h4 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 16 16" style={{ marginRight: 10, verticalAlign: 'middle' }}>
                  <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                </svg>
                Nueva Clasificación
              </h4>
            </div>
            <div style={{ padding: '24px' }}>
              <div>
                <label style={{ fontWeight: 600, marginBottom: 8, display: 'block', color: '#2c3e50' }}>Nombre</label>
                <input ref={newRef} className="form-control form-control-lg" style={{ borderRadius: 8, border: '2px solid #e9ecef', padding: '12px 16px' }} />
              </div>
            </div>
            <div style={{ borderTop: '1px solid #e9ecef', padding: '18px 24px', background: '#f8f9fa', display:'flex', justifyContent:'flex-end', gap:10 }}>
              <button className="btn" onClick={closeAddModal} style={{ background: '#fff', color: '#6c757d', border: '2px solid #dee2e6', padding: '10px 24px', fontWeight: 600, borderRadius: 8, transition: 'all 0.2s ease' }} onMouseEnter={(e) => { e.currentTarget.style.background = '#f8f9fa'; e.currentTarget.style.borderColor = '#adb5bd'; }} onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#dee2e6'; }}>Cancelar</button>
              <button className="btn" onClick={createClasificacion} style={{ background: 'linear-gradient(135deg, #681b32 0%, #200b07 100%)', color: '#fff', border: 'none', padding: '10px 28px', fontWeight: 600, borderRadius: 8, boxShadow: '0 3px 8px rgba(104, 27, 50, 0.3)', transition: 'all 0.2s ease' }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 5px 12px rgba(104, 27, 50, 0.4)'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 3px 8px rgba(104, 27, 50, 0.3)'; }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style={{ marginRight: 8, verticalAlign: 'middle' }}>
                  <path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/>
                </svg>
                Crear
              </button>
            </div>
          </div>
        </div>
      )}

      {editItem && (
        <div className={`modal-backdrop${closingModalIndex === 'edit' ? ' closing' : ''}`} style={{ position:'fixed',left:0,top:0,right:0,bottom:0,background:'rgba(0,0,0,0.6)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:2000 }}>
          <div className={`modal-content${closingModalIndex === 'edit' ? ' closing' : ''}`} style={{ width: 520, background:'#fff', borderRadius:12, overflow:'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.25)' }}>
            <div style={{ background: 'linear-gradient(135deg, #681b32 0%, #200b07 100%)', color: '#fff', padding: '20px 24px' }}>
              <h4 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 16 16" style={{ marginRight: 10, verticalAlign: 'middle' }}>
                  <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/>
                </svg>
                Editar Clasificación
              </h4>
            </div>
            <div style={{ padding: '24px' }}>
              <div>
                <label style={{ fontWeight: 600, marginBottom: 8, display: 'block', color: '#2c3e50' }}>Nombre</label>
                <input defaultValue={editItem.title || editItem.name} ref={editRef} className="form-control form-control-lg" style={{ borderRadius: 8, border: '2px solid #e9ecef', padding: '12px 16px' }} />
              </div>
            </div>
            <div style={{ borderTop: '1px solid #e9ecef', padding: '18px 24px', background: '#f8f9fa', display:'flex', justifyContent:'flex-end', gap:10 }}>
              <button className="btn" onClick={closeEditModal} style={{ background: '#fff', color: '#6c757d', border: '2px solid #dee2e6', padding: '10px 24px', fontWeight: 600, borderRadius: 8, transition: 'all 0.2s ease' }} onMouseEnter={(e) => { e.currentTarget.style.background = '#f8f9fa'; e.currentTarget.style.borderColor = '#adb5bd'; }} onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#dee2e6'; }}>Cancelar</button>
              <button className="btn" onClick={saveEdit} style={{ background: 'linear-gradient(135deg, #681b32 0%, #200b07 100%)', color: '#fff', border: 'none', padding: '10px 28px', fontWeight: 600, borderRadius: 8, boxShadow: '0 3px 8px rgba(104, 27, 50, 0.3)', transition: 'all 0.2s ease' }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 5px 12px rgba(104, 27, 50, 0.4)'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 3px 8px rgba(104, 27, 50, 0.3)'; }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style={{ marginRight: 8, verticalAlign: 'middle' }}>
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
              <p style={{ margin: 0, fontSize: 15, color: '#2c3e50' }}>¿Estás seguro de que deseas eliminar la clasificación <strong style={{ color: '#681b32' }}>{toDelete.title || toDelete.name}</strong>?</p>
            </div>
            <div style={{ borderTop: '1px solid #e9ecef', padding: '18px 24px', background: '#f8f9fa', display:'flex', justifyContent:'flex-end', gap:10 }}>
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

    </div>
  );
}
