import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosClient from "../axios-client.js";
import { useStateContext } from "../Contexts/ContextProvider.jsx";
import { toast } from "react-toastify";
import "./css/inicio.css";
import "./js/inicio.js";
import ASEBCS from "../assets/asebcs.jpg";
import grupal from "../assets/grupal.jpg";
import SemaforoVerde from "../assets/SemaforoVerde.png";
import SemaforoAmarillo from "../assets/SemaforoAmarillo.png";
import SemaforoRojo from "../assets/SemaforoRojo.png";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";


export default function Inicio() {
  const [open, setOpen] = useState(null);
  const [showInfo, setShowInfo] = useState(null);
  const [entes, setEntes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("");
  const [expandedGroups, setExpandedGroups] = useState({});
  const navigate = useNavigate();

  const onSubmit = async (ev) => {};

  const toggle = (idx) => {
    if (open === idx) {
      // Cerrando
      setShowInfo(null);
      setOpen(null);
    } else {
      // Abriendo - primero expandir el contenedor
      setOpen(idx);
      setShowInfo(null);
      // Después de 600ms (duración de la expansión), mostrar el texto
      setTimeout(() => {
        setShowInfo(idx);
      }, 600);
    }
  };

  // Cargar entes desde la API
  React.useEffect(() => {
    const fetchEntes = async () => {
      try {
        const response = await fetch('http://localhost/siret/api/entes.php');
        const data = await response.json();
        setEntes(data);
        setLoading(false);
      } catch (error) {
        console.error('Error cargando entes:', error);
        toast.error('Error al cargar los entes');
        setLoading(false);
      }
    };
    fetchEntes();
  }, []);

  const [showNoLinkModal, setShowNoLinkModal] = useState(false);
  const [modalClosing, setModalClosing] = useState(false);

  // Modal disables scroll
  React.useEffect(() => {
    if (showNoLinkModal) {
      document.body.classList.add("no-scroll");
    } else {
      document.body.classList.remove("no-scroll");
    }
  }, [showNoLinkModal]);

  // Close modal with animation
  const closeNoLinkModal = () => {
    setModalClosing(true);
    setTimeout(() => {
      setModalClosing(false);
      setShowNoLinkModal(false);
    }, 320);
  };

  const renderIcon = (key) => {
    const circleStyle = {
      width: 68,
      height: 68,
      borderRadius: '50%',
      background: 'linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))',
      border: '2px solid rgba(255,255,255,0.25)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto'
    };

    const baseProps = { width: 32, height: 32, viewBox: '0 0 24 24', fill: 'none', stroke: '#fff', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };

    switch (key) {
      case 'calendar':
        return (
          <div style={circleStyle} aria-hidden="true">
            <svg {...baseProps}>
              <rect x="4" y="5" width="16" height="15" rx="2" ry="2" fill="none" />
              <path d="M16 3v4M8 3v4M4 10h16" />
              <rect x="8" y="13" width="3" height="3" fill="#fff" />
              <rect x="13" y="13" width="3" height="3" fill="#fff" />
            </svg>
          </div>
        );
      case 'building':
        return (
          <div style={circleStyle} aria-hidden="true">
            <svg {...baseProps}>
              <rect x="5" y="4" width="14" height="16" rx="2" />
              <path d="M9 9h2M13 9h2M9 13h2M13 13h2M9 17h2M13 17h2" />
              <path d="M5 20h14" />
            </svg>
          </div>
        );
      case 'tags':
        return (
          <div style={circleStyle} aria-hidden="true">
            <svg {...baseProps}>
              <path d="M10 4H6a2 2 0 0 0-2 2v4l8 8 4-4-8-8z" />
              <path d="M14 8h4a2 2 0 0 1 2 2v4l-5 5" />
              <circle cx="8.5" cy="8.5" r="1.25" fill="#fff" />
            </svg>
          </div>
        );
      case 'compare':
        return (
          <div style={circleStyle} aria-hidden="true">
            <svg {...baseProps}>
              <path d="M5 20V10" />
              <path d="M12 20V6" />
              <path d="M19 20V12" />
              <path d="M4 20h16" />
            </svg>
          </div>
        );
      default:
        return (
          <div style={circleStyle} aria-hidden="true">
            <svg {...baseProps}>
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </div>
        );
    }
  };

  // Agrupar entes por clasificación y ordenar por id
  const grouped = entes
    .slice()
    .sort((a, b) => a.id - b.id)
    .reduce((acc, ente) => {
      const key = ente.classification || "Sin clasificación";
      if (!acc[key]) acc[key] = [];
      acc[key].push(ente);
      return acc;
    }, {});
  const classifications = Object.keys(grouped);

  // Actualiza el tab activo si cambia la lista
  React.useEffect(() => {
    if (classifications.length && !classifications.includes(activeTab)) {
      setActiveTab(classifications[0]);
    }
  }, [classifications]);

  return (
    <div className="bg-light">
      {/* Navbar */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark fixed-top">
        <div className="container-fluid">
          <a className="navbar-brand d-flex align-items-center" href="#">
              <img src={ASEBCS} alt="Logo SIRET" width="80" height="40" className="me-2" />
            ASEBCS
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
                <a className="nav-link active" href="#Inicio">
                  Inicio
                </a>
              </li>
              <li className="nav-item dropdown">
                <a
                  className="nav-link dropdown-toggle"
                  href="#"
                  id="cumplimientosDropdown"
                  role="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  Cumplimientos
                </a>
                <ul className="dropdown-menu dropdown-menu-end" aria-labelledby="cumplimientosDropdown">
                  <li>
                    <a className="dropdown-item" href="/cumplimientos/mes-anio">Por mes y año</a>
                  </li>
                  <li>
                    <a className="dropdown-item" href="/cumplimientos/por-ente">Por ente</a>
                  </li>
                  <li>
                    <a className="dropdown-item" href="/cumplimientos/por-clasificacion">Por clasificación de entes</a>
                  </li>
                  <li><a className="dropdown-item" href="/comparativa">Comparativa</a></li>
                </ul>
              </li>

            </ul>
          </div>
        </div>
      </nav>

      {/* Encabezado */}
      <header className="bg-primary text-white text-center py-4">
        <h1>Auditoría Superior del Estado de Baja California Sur</h1>
        <p className="lead">
          Monitoreo de Cumplimiento en la Entrega de Informes Mensuales y
          Cuentas Públicas
        </p>
      </header>

      <main className="container my-4">
        {/* Sección ASEBCS */}
        <section id="asebcs" className="mb-5">
          <div className="row align-items-center">
            <div className="col-md-6">
              <img src={grupal} alt="Equipo ASEBCS" className="img-fluid rounded shadow" />
            </div>
            <div className="col-md-6">
              <div className="bg-maroon text-white p-4 rounded shadow-sm">
                <h2 className="mb-3">¿Qué es la ASEBCS?</h2>
                <p style={{ textAlign: "justify" }}>
                  Es la entidad que cuenta con personalidad jurídica propia y
                  con autonomía técnica y de gestión, para el ejercicio de la
                  función fiscalizadora, que tiene por objeto determinar el
                  cumplimiento de programas, la gestión financiera, el
                  desempeño, eficiencia, eficacia y economía de los recursos
                  públicos administrados y ejercidos por los sujetos de
                  fiscalización.
                </p>
                <a href="#mas-informacion" className="btn btn-light mt-3">
                  Más información
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Semáforo de Cumplimiento */}
        <section id="semaforo" className="mb-5">
          <hr className="linea mb-4" />
          <h2 className="mb-4">Semáforos de Cumplimiento</h2>
          <div className="d-flex flex-wrap justify-content-center gap-4">
            {/* Verde */}
            <button
              type="button"
              className={`semaforo-card bg-success text-white ${open === 0 ? "expanded" : ""}`}
              aria-expanded={open === 0}
              onClick={() => toggle(0)}
            >
              <img src={SemaforoVerde} alt="Cumplimiento Total" className="semaforo-icon" />
              <div className={`semaforo-info ${showInfo === 0 ? "show" : ""}`}>
                <p>
                  Cumple en tiempo y forma con el 100% de la información
                  requerida en lo señalado por los Lineamientos para la
                  presentación e integración de la Cuenta Pública y la Guía de
                  información financiera mensual y Cuenta Pública.
                </p>
              </div>
            </button>

            {/* Amarillo */}
            <button
              type="button"
              className={`semaforo-card bg-warning text-dark ${open === 1 ? "expanded" : ""}`}
              aria-expanded={open === 1}
              onClick={() => toggle(1)}
            >
              <img src={SemaforoAmarillo} alt="Cumplimiento Parcial" className="semaforo-icon" />
              <div className={`semaforo-info ${showInfo === 1 ? "show" : ""}`}>
                <p>
                  No cumple en tiempo y forma con el 100% de la información
                  requerida en lo señalado por los Lineamientos para la
                  presentación e integración de la Cuenta Pública y la Guía de
                  información financiera mensual y Cuenta Pública.
                </p>
              </div>
            </button>

            {/* Rojo */}
            <button
              type="button"
              className={`semaforo-card bg-danger text-white ${open === 2 ? "expanded" : ""}`}
              aria-expanded={open === 2}
              onClick={() => toggle(2)}
            >
              <img src={SemaforoRojo} alt="Sin Información" className="semaforo-icon" />
              <div className={`semaforo-info ${showInfo === 2 ? "show" : ""}`}>
                <p>No presentó información.</p>
              </div>
            </button>
          </div>
        </section>

        {/* Entes */}
        <section id="cumplimientos" className="mb-5">
          <hr className="linea mb-4" />
          <h2 className="mb-4">Entes</h2>
        </section>

        {/* Pestañas de clasificación de entes */}
        <div className="entes-cards-container">
          {loading ? (
            <p>Cargando entes...</p>
          ) : (
            <div>
              {classifications.map((classification, idx) => {
                const entesInGroup = grouped[classification] || [];
                const collapseId = `collapse-group-${idx}`;
                const headingId = `heading-${idx}`;
                return (
                  <div className="card mb-4" key={classification}>
                    <div className="card-header p-0 collapse-header" id={headingId}>
                      <h3 className="mb-0">
                        <button
                          className="btn btn-link w-100 text-start px-4 py-3"
                          type="button"
                          data-bs-toggle="collapse"
                          data-bs-target={`#${collapseId}`}
                          aria-expanded="false"
                          aria-controls={collapseId}
                          style={{fontSize: 22, fontWeight: 700, color: '#681b32', textDecoration: 'none', cursor: 'pointer'}}
                        >
                          {classification} <span style={{fontSize:14, color:'#6c757d', marginLeft:12}}>{entesInGroup.length} {entesInGroup.length === 1 ? 'ente' : 'entes'}</span>
                        </button>
                      </h3>
                    </div>
                    <div id={collapseId} className="collapse" aria-labelledby={headingId}>
                      <div className="card-body">
                        <div className="contenedor-cuadros">
                          {entesInGroup.map((ente, entIndex) => (
                            <div
                              key={ente.id}
                              className="cuadro"
                              onClick={() => {
                                if (ente.link) {
                                  window.open(ente.link, '_blank', 'noopener');
                                } else {
                                  setShowNoLinkModal(true);
                                }
                              }}
                              tabIndex={0}
                              role="button"
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") setSelected(ente);
                              }}
                              style={{
                                animation: `slideUpEntes 0.5s ease-out ${0.05 * entIndex}s forwards`,
                                opacity: 0,
                              }}
                            >
                              <img src={ente.img} alt={ente.title} />
                              <h3>{ente.title}</h3>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <style>{`
                @keyframes slideUpEntes {
                  from { opacity: 0; transform: translateY(20px); }
                  to { opacity: 1; transform: translateY(0); }
                }
              `}</style>
            </div>
          )}
        </div>

        {showNoLinkModal && (
          <div className={`modal-overlay custom-modal${modalClosing ? " closing" : ""}`}>
            <div className="modal-card" role="dialog" aria-modal="true" aria-label="Sin página web" style={{textAlign:'center',padding:'2.5rem', minWidth:320, borderRadius:12, boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}}>
              <p style={{fontSize:18, color:'#2c3e50', margin:'0 0 2rem 0', lineHeight:1.5}}>Este ente no tiene página web registrada.</p>
              <button className="btn btn-primary" style={{minWidth:120, paddingLeft:32, paddingRight:32}} onClick={closeNoLinkModal}>Aceptar</button>
            </div>
          </div>
        )}
        <section id="cumplimientos" className="mb-5">
          <hr className="linea mb-4" />
          <h2 className="mb-4">Ver cumplimientos</h2>
          <style>{`
            @keyframes slideInLeftInicioCards {
              from { opacity: 0; transform: translateX(-40px); }
              to { opacity: 1; transform: translateX(0); }
            }
            .inicio-card {
              animation: slideInLeftInicioCards 0.6s ease-out forwards;
              background: #fff;
              border: none;
              border-radius: 12px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.08);
              transition: all 0.3s ease;
              height: 100%;
              display: flex;
              flex-direction: column;
              overflow: hidden;
            }
            .inicio-card:hover {
              transform: translateY(-8px);
              box-shadow: 0 8px 24px rgba(104, 27, 50, 0.2);
            }
            .inicio-card-header {
              background: linear-gradient(135deg, #681b32 0%, #200b07 100%);
              color: #fff;
              padding: 24px;
              text-align: center;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .inicio-card-body { padding: 22px; flex: 1; display: flex; flex-direction: column; }
            .inicio-card-title { font-size: 18px; font-weight: 700; color: #2c3e50; margin-bottom: 10px; }
            .inicio-card-description { font-size: 14px; color: #2c3e50; margin-bottom: 18px; flex: 1; line-height: 1.5; }
            .inicio-card-button {
              background: linear-gradient(135deg, #681b32 0%, #200b07 100%);
              color: #fff;
              border: none;
              padding: 11px 20px;
              border-radius: 8px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s ease;
              box-shadow: 0 3px 8px rgba(104, 27, 50, 0.3);
            }
            .inicio-card-button:hover { transform: translateY(-2px); box-shadow: 0 5px 12px rgba(104, 27, 50, 0.4); }
            .inicio-card-button:active { transform: translateY(0); }
          `}</style>

          <div className="row g-4">
            {[{
              id: 1,
              title: 'Por mes y año',
              description: 'Consulta cumplimientos filtrando por mes y año.',
              path: '/cumplimientos/mes-anio',
              iconKey: 'calendar'
            }, {
              id: 2,
              title: 'Por ente',
              description: 'Explora el detalle de cada ente y su historial de cumplimientos.',
              path: '/cumplimientos/por-ente',
              iconKey: 'building'
            }, {
              id: 3,
              title: 'Por clasificación',
              description: 'Revisa los cumplimientos agrupados por clasificación.',
              path: '/cumplimientos/por-clasificacion',
              iconKey: 'tags'
            }, {
              id: 4,
              title: 'Comparativa',
              description: 'Compara dos entes o meses/años para ver su desempeño.',
              path: '/comparativa',
              iconKey: 'compare'
            }].map((card, index) => (
              <div key={card.id} className="col-lg-6 col-xl-3" style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="inicio-card">
                  <div className="inicio-card-header">{renderIcon(card.iconKey)}</div>
                  <div className="inicio-card-body">
                    <div className="inicio-card-title">{card.title}</div>
                    <div className="inicio-card-description">{card.description}</div>
                    <button className="inicio-card-button" onClick={() => navigate(card.path)}>
                      Ir a {card.title}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="bg-dark text-white text-center py-3">
        <small>
          © 2025 Auditoría Superior del Estado - Baja California Sur
        </small>
      </footer>
    </div>
  );
}
