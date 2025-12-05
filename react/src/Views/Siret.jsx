import React, { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axiosClient from "../axios-client";
import { useStateContext } from "../Contexts/ContextProvider.jsx";
import { toast } from "react-toastify";
import ASEBCS from "../assets/asebcs.jpg";
import "./css/inicio.css";


export default function Siret() {
  // years will be derived from data (entes) dynamically via `availableYears`
  const months = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

  const [entes, setEntes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit modal
  const [editEnte, setEditEnte] = useState(null);
  const editTitleRef = useRef();
  const editClassRef = useRef();
  const [editIconFile, setEditIconFile] = useState(null);
  const [editIconPreview, setEditIconPreview] = useState(null);

  // Initialize edit modal preview when editEnte changes
  React.useEffect(() => {
    if (editEnte) {
      setEditIconPreview(editEnte.img || ASEBCS);
      setEditIconFile(null);
      // also set ref values so inputs reflect current values
      if (editTitleRef.current) editTitleRef.current.value = editEnte.title || '';
      if (editClassRef.current) editClassRef.current.value = editEnte.classification || '';
    } else {
      setEditIconPreview(null);
      setEditIconFile(null);
    }
  }, [editEnte]);

  // Delete confirmation
  const [toDelete, setToDelete] = useState(null);

  // Assign compliance modal
  const [assignTarget, setAssignTarget] = useState(null);
  const [assignYear, setAssignYear] = useState(String(new Date().getFullYear()));
  const [assignMonth, setAssignMonth] = useState(months[0]);
  const [assignStatus, setAssignStatus] = useState("cumplio");

  // Active toggle year (current)
  const currentYear = new Date().getFullYear();

  // Filters for the catalog (nombre, clasificación/ente, año)
  const [filterName, setFilterName] = useState("");
  const [filterEnte, setFilterEnte] = useState("");
  const [filterYear, setFilterYear] = useState('Todos');
  const [sortDirection, setSortDirection] = useState('none'); // 'none' | 'asc' | 'desc'
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newIconFile, setNewIconFile] = useState(null);
  const [newIconPreview, setNewIconPreview] = useState(null);
  const newTitleRef = React.useRef();
  const [newClassification, setNewClassification] = useState('');

  const classifications = useMemo(() => {
    const s = new Set();
    entes.forEach(e => { if (e.classification) s.add(e.classification); });
    return Array.from(s);
  }, [entes]);

  // derive available years from entes.compliances and activeYears
  const availableYears = useMemo(() => {
    const s = new Set();
    entes.forEach(e => {
      (e.compliances || []).forEach(c => { if (c && c.year) s.add(Number(c.year)); });
      const ay = e.activeYears || {};
      Object.keys(ay).forEach(k => { if (ay[k]) s.add(Number(k)); });
    });
    if (s.size === 0) s.add(currentYear);
    return Array.from(s).sort((a,b)=>b-a);
  }, [entes]);

  // Fetch entes
  const fetchEntes = async () => {
    setLoading(true);
    try {
      const apiUrl = `${window.location.protocol}//${window.location.hostname}/siret/api/entes.php`;
      const res = await fetch(apiUrl);
      if (!res.ok) throw new Error("no-api");
      const json = await res.json();
      if (Array.isArray(json)) setEntes(json);
      else setEntes([]);
    } catch {
      // fallback: empty list (or you can seed sample)
      setEntes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEntes(); }, []);

  // Helpers: update local ente
  const updateLocalEnte = (id, patch) => {
    setEntes(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e));
  };

  // Toggle active for a given year (api placeholder)
  const toggleActive = async (enteId, yearToToggle, value) => {
    try {
      const apiUrl = `${window.location.protocol}//${window.location.hostname}/siret/api/ente_toggle_active.php`;
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: enteId, year: yearToToggle, active: value ? 1 : 0 })
      });
      // optimistic: update local
      if (res.ok) {
        // update ente.activeYears map if exists, else add property
        setEntes(prev => prev.map(e => {
          if (e.id !== enteId) return e;
          const ay = { ...(e.activeYears || {}) };
          ay[String(yearToToggle)] = value;
          return { ...e, activeYears: ay };
        }));
      } else {
        console.warn("toggleActive failed");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Assign compliance (api placeholder)
  const assignCompliance = async () => {
    if (!assignTarget) return;
    try {
      const apiUrl = `${window.location.protocol}//${window.location.hostname}/siret/api/assign_compliance.php`;
      const payload = { ente_id: assignTarget.id, year: Number(assignYear), month: assignMonth, status: assignStatus };
      const res = await fetch(apiUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (res.ok) {
        // Update local: add compliance record to ente
        setEntes(prev => prev.map(e => {
          if (e.id !== assignTarget.id) return e;
          const compliances = Array.isArray(e.compliances) ? [...e.compliances] : [];
          compliances.push({ year: Number(assignYear), month: assignMonth, status: assignStatus });
          return { ...e, compliances };
        }));
        setAssignTarget(null);
      } else {
        console.warn("assignCompliance failed");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Soft delete ente (api placeholder)
  const softDelete = async () => {
    if (!toDelete) return;
    try {
      const apiUrl = `${window.location.protocol}//${window.location.hostname}/siret/api/ente_delete.php`;
      const res = await fetch(apiUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: toDelete.id }) });
      if (res.ok) {
        // Soft delete locally: mark deleted_at or active=false
        setEntes(prev => prev.map(e => e.id === toDelete.id ? { ...e, deleted_at: new Date().toISOString() } : e));
        setToDelete(null);
      } else {
        console.warn("softDelete failed");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Edit ente (api placeholder)
  const saveEdit = async () => {
    if (!editEnte) return;
    const title = editTitleRef.current?.value?.trim() || editEnte.title;
    const classification = editClassRef.current?.value?.trim() || editEnte.classification;
    try {
      const apiUrl = `${window.location.protocol}//${window.location.hostname}/siret/api/ente_update.php`;
      const form = new FormData();
      form.append('id', editEnte.id);
      form.append('title', title);
      form.append('classification', classification);
      if (editIconFile) form.append('icon', editIconFile);
      const res = await fetch(apiUrl, { method: "POST", body: form });
      if (res.ok) {
        let json = null;
        try { json = await res.json(); } catch(e) { json = null; }
        const newImg = (json && (json.img || json.image)) ? (json.img || json.image) : editIconPreview || editEnte.img;
        updateLocalEnte(editEnte.id, { title, classification, img: newImg });
        setEditEnte(null);
        setEditIconFile(null);
        setEditIconPreview(null);
      } else {
        console.warn("saveEdit failed");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Create new ente
  const createEnte = async () => {
    const title = newTitleRef.current?.value?.trim() || '';
    const classification = newClassification || '';
    if (!title) return alert('El nombre es requerido');
    try {
      const apiUrl = `${window.location.protocol}//${window.location.hostname}/siret/api/ente_create.php`;
      const form = new FormData();
      form.append('title', title);
      form.append('classification', classification);
      if (newIconFile) form.append('icon', newIconFile);
      const res = await fetch(apiUrl, { method: 'POST', body: form });
      if (res.ok) {
        const json = await res.json();
        // prepend new ente
        setEntes(prev => [json, ...prev]);
        setAddModalOpen(false);
        setNewIconFile(null);
        setNewIconPreview(null);
        setNewClassification('');
        if (newTitleRef.current) newTitleRef.current.value = '';
      } else {
        console.warn('createEnte failed');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Render
    return (
    <div className="container py-4">
        {/* Navbar (custom) */}
              <nav className="navbar navbar-expand-lg navbar-dark bg-dark fixed-top">
                <div className="container-fluid">
                  <a className="navbar-brand d-flex align-items-center" href="#">
                      <img src={ASEBCS} alt="Logo SIRET" width="80" height="40" className="me-2" />
                    SIRET
                  </a>
                  <button
                    className="navbar-toggler"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#navbarNav"
                    aria-controls="navbarNav"
                    aria-expanded="false"
                    aria-label="Toggle navigaltion"
                  >
                    <span className="navbar-toggler-icon"></span>
                  </button>
                  <div className="collapse navbar-collapse" id="navbarNav">
                    <ul className="navbar-nav ms-auto">
                      <li className="nav-item">
                        <a className="nav-link active" href="/entes">Entes</a>
                      </li>
                      <li className="nav-item">
                        <a className="nav-link" href="/clasificaciones">Clasificaciones</a>
                      </li>
                      <li className="nav-item">
                        <a className="nav-link" href="/cumplimientos">Cumplimientos</a>
                      </li>
                      <li className="nav-item"><a className="nav-link" href="/SiretExportacion">Exportar</a></li>
                    </ul>
                  </div>
                </div>
              </nav>

              <header className="bg-primary text-white text-center py-4">
        <h1>SIRET</h1>
        <p className="lead">
          Catálogo de entes
        </p>
      </header>


      <section style={{ marginTop: 16 }}>
            <div className="card card-body mb-3">
              <div className="row g-2 align-items-end">
                <div className="col-md-4">
                  <label className="form-label">Ente</label>
                  <input className="form-control" placeholder="Buscar por nombre" value={filterName} onChange={e=>setFilterName(e.target.value)} />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Clasificación</label>
                  <select className="form-select" value={filterEnte} onChange={e=>setFilterEnte(e.target.value)}>
                    <option value="">Todos</option>
                    {classifications.map(c => (<option key={c} value={c}>{c}</option>))}
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label">Año</label>
                  <select className="form-select" value={filterYear} onChange={e=>setFilterYear(e.target.value)}>
                    <option value="Todos">Todos</option>
                    {availableYears.map(y => (<option key={y} value={String(y)}>{y}</option>))}
                  </select>
                </div>

              </div>
            </div>

            {loading ? <p>Cargando...</p> : (
              (() => {
                const displayed = entes.filter(e => {
                  if (filterName && !e.title.toLowerCase().includes(filterName.toLowerCase())) return false;
                  if (filterEnte && e.classification !== filterEnte) return false;
                  if (filterYear && filterYear !== 'Todos') {
                    // show ente if it has any compliance for the year or activeYears for that year
                    const hasComp = Array.isArray(e.compliances) && e.compliances.some(c => String(c.year) === filterYear);
                    const active = (e.activeYears || {})[filterYear];
                    if (!hasComp && !active) return false;
                  }
                  return true;
                });
                const sorted = (() => {
                  const copy = displayed.slice();
                  if (sortDirection === 'none') return copy;
                  copy.sort((a,b) => {
                    const aId = a.classification_id != null ? Number(a.classification_id) : null;
                    const bId = b.classification_id != null ? Number(b.classification_id) : null;
                    if (aId != null && bId != null) {
                      return sortDirection === 'asc' ? aId - bId : bId - aId;
                    }
                    const an = (a.classification || '').toString().toLowerCase();
                    const bn = (b.classification || '').toString().toLowerCase();
                    if (an < bn) return sortDirection === 'asc' ? -1 : 1;
                    if (an > bn) return sortDirection === 'asc' ? 1 : -1;
                    return 0;
                  });
                  return copy;
                })();

                return (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div>
                        <button className="btn btn-success" onClick={() => setAddModalOpen(true)}><strong>+</strong> Agregar Ente</button>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <label style={{ marginBottom: 0 }}>Ordenar clasificación:</label>
                        <select className="form-select form-select-sm" value={sortDirection} onChange={e=>setSortDirection(e.target.value)} style={{ width: 160 }}>
                          <option value="none">Sin ordenar</option>
                          <option value="asc">A → Z (id asc)</option>
                          <option value="desc">Z → A (id desc)</option>
                        </select>
                      </div>
                    </div>
                  <table className="table table-sm" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ borderBottom: '2px solid #111' }}>Ente</th>
                        <th style={{ borderBottom: '2px solid #111' }}>Clasificación</th>
                        <th style={{ borderBottom: '2px solid #111' }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayed.length === 0 && (<tr><td colSpan={3}>No hay entes registrados.</td></tr>)}
                      {displayed.map(e => (
                        <tr key={e.id} style={{ opacity: e.deleted_at ? 0.6 : 1 }}>
                          <td style={{ minWidth: 220, borderBottom: '1px solid #111' }}>
                            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                              <img src={e.img || ASEBCS} alt={e.title} style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 6 }} />
                              <div>
                                <div style={{ fontWeight: 700 }}>{e.title}</div>
                                {e.deleted_at && <small className="text-danger">Eliminado</small>}
                              </div>
                            </div>
                          </td>
                          <td style={{ borderBottom: '1px solid #111' }}>{e.classification}</td>
                          <td style={{ borderBottom: '1px solid #111' }}>
                            <div style={{ display: "flex", gap: 8 }}>
                              <button className="btn btn-sm btn-outline-primary" onClick={() => setEditEnte(e)} title="Editar" aria-label={`Editar ${e.title}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M12.146.854a.5.5 0 0 1 .708 0l2.292 2.292a.5.5 0 0 1 0 .708l-9.193 9.193a.5.5 0 0 1-.168.11l-4 1.5a.5.5 0 0 1-.65-.65l1.5-4a.5.5 0 0 1 .11-.168L12.146.854zM11.207 2L3 10.207V13h2.793L14 4.793 11.207 2z"/></svg>
                              </button>
                              <button className="btn btn-sm btn-outline-danger" onClick={() => setToDelete(e)} title="Eliminar" aria-label={`Eliminar ${e.title}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 5h4a.5.5 0 0 1 .5.5V6h1v7a2 2 0 0 1-2 2H4.5a2 2 0 0 1-2-2V6h1v-.5zM14.5 3a1 1 0 0 1-1 1H12v9a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V4H2.5a1 1 0 0 1-1-1V2h13v1zM6.5 1a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1H6.5z"/></svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                );
              })()
            )}
          </section>

      {/* Edit modal */}
      {editEnte && (
        <div style={{ position:'fixed',left:0,top:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:2000 }}>
          <div style={{ width: '90%', maxWidth: '95%', background:'#fff', padding:20, borderRadius:8 }}>
            <h4 style={{ marginBottom: 12, textAlign: 'center' }}>Editar Ente</h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
              <div style={{ width: 240, height: 240, borderRadius: 8, overflow: 'hidden', border: '1px solid #ddd' }}>
                <img src={editIconPreview || ASEBCS} alt="Icono ente" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>

              <div>
                <input type="file" accept="image/*" onChange={(ev)=>{
                  const f = ev.target.files && ev.target.files[0];
                  if (f) { setEditIconFile(f); setEditIconPreview(URL.createObjectURL(f)); }
                }} />
              </div>

              <div style={{ width: '100%' }}>
                <div>
                  <label>Nombre</label>
                  <input defaultValue={editEnte.title} ref={editTitleRef} className="form-control form-control-lg" />
                </div>

                <div style={{ marginTop:8 }}>
                  <label>Clasificación</label>
                  <select defaultValue={editEnte.classification || ''} ref={editClassRef} className="form-select form-select-lg">
                    <option value="">-- Seleccionar --</option>
                    {classifications.map(c => (<option key={c} value={c}>{c}</option>))}
                  </select>
                </div>
              </div>

              <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <button className="btn btn-sm" onClick={()=>{ setEditEnte(null); setEditIconFile(null); setEditIconPreview(null); }}>Cancelar</button>
                <button className="btn btn-sm btn-secondary" onClick={saveEdit}>Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {toDelete && (
        <div style={{ position:'fixed',left:0,top:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:2000 }}>
          <div style={{ width: 420, background:'#fff', padding:16, borderRadius:8 }}>
            <h4>Confirmar eliminación</h4>
            <p>¿Deseas eliminar (soft-delete) al ente <strong>{toDelete.title}</strong>? Esta acción puede desactivarlo en la plataforma.</p>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
              <button className="btn btn-sm" onClick={()=>setToDelete(null)}>Cancelar</button>
              <button className="btn btn-sm btn-danger" onClick={softDelete}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Assign compliance modal */}
      {assignTarget && (
        <div style={{ position:'fixed',left:0,top:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:2000 }}>
          <div style={{ width: 520, background:'#fff', padding:16, borderRadius:8 }}>
            <h4>Asignar cumplimiento — {assignTarget.title}</h4>
            <div style={{ display:'flex', gap:8, marginTop:8 }}>
              <div style={{ flex: 1 }}>
                <label>Año</label>
                <select className="form-control" value={assignYear} onChange={e=>setAssignYear(e.target.value)}>{availableYears.map(y=>(<option key={y} value={y}>{y}</option>))}</select>
              </div>
              <div style={{ flex: 1 }}>
                <label>Mes</label>
                <select className="form-control" value={assignMonth} onChange={e=>setAssignMonth(e.target.value)}>{months.map(m=> (<option key={m} value={m}>{m}</option>))}</select>
              </div>
            </div>
            <div style={{ marginTop:8 }}>
              <label>Estado</label>
              <select className="form-control" value={assignStatus} onChange={e=>setAssignStatus(e.target.value)}>
                <option value="cumplio">Cumplió</option>
                <option value="parcial">Parcial</option>
                <option value="no">No</option>
              </select>
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:12 }}>
              <button className="btn btn-sm" onClick={()=>setAssignTarget(null)}>Cancelar</button>
              <button className="btn btn-sm btn-primary" onClick={assignCompliance}>Asignar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
