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
  const navigate = useNavigate();

  const onSubmit = async (ev) => {};

  const toggle = (idx) => {
    setOpen(open === idx ? null : idx);
  };
  // Cargar todas las imágenes de la carpeta Views/Imagenes y crear un mapa filename -> url
  // Use import.meta.glob with eager:true for compatibility
  const importedImages = import.meta.glob("./Imagenes/*.{png,jpg,jpeg,svg}", { eager: true });
  const imagesMap = Object.entries(importedImages).reduce((acc, [path, module]) => {
    const filename = path.split('/').pop();
    acc[filename] = module.default;
    return acc;
  }, {});

  // Data para cuadros (usa el nombre de archivo, p.ej. 'a.png')
  const entes = [
    {
      id: 1,
      title: "Congreso del Estado de Baja California Sur",
      img: imagesMap["a.png"] || Object.values(imagesMap)[0] || "",
      description:
        "Equipo ficticio de ejemplo. Aquí puedes colocar una descripción más larga y enlaces a documentos.",
      link: "/Marines%20Espaciales.html",
    },
    {
      id: 2,
      title: "Institución Ejemplo",
      img: imagesMap["placeholder.png"] || Object.values(imagesMap)[1] || Object.values(imagesMap)[0] || "",
      description: "Otra entidad de ejemplo. Reemplaza con datos reales o trae desde la API.",
      link: "/institucion.html",
    },
  ];

  const [selected, setSelected] = useState(null);
  const [modalClosing, setModalClosing] = useState(false);

  // close modal on Esc (keep up-to-date with `selected`)
  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && selected) {
        startClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  // Manage body/main classes to prevent background interaction when modal open
  React.useEffect(() => {
    if (selected) {
      document.body.classList.add("no-scroll");
    } else {
      document.body.classList.remove("no-scroll");
    }
  }, [selected]);

  const startClose = (delay = 260) => {
    // trigger closing animation then unmount
    setModalClosing(true);
    // wait for animation to finish
    setTimeout(() => {
      setModalClosing(false);
      setSelected(null);
    }, delay);
  };

  return (
    <div className="bg-light">
      {/* Navbar */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark fixed-top">
        <div className="container-fluid">
          <a className="navbar-brand d-flex align-items-center" href="#">
              <img src={ASEBCS} alt="Logo SIRET" width="80" height="40" className="me-2" />
            Cumplimientos mensuales y cuentas públicas anuales de los Entes Públicos de Baja California Sur
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
              <div className="semaforo-info">
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
              <div className="semaforo-info">
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
              <div className="semaforo-info">
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

        <div className="contenedor-cuadros">
          {entes.map((ente) => (
            <div
              key={ente.id}
              className={`cuadro ${selected?.id === ente.id ? "active" : ""}`}
              onClick={() => setSelected(ente)}
              tabIndex={0}
              role="button"
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setSelected(ente);
              }}
            >
              <img src={ente.img} alt={ente.title} />
              <h3>{ente.title}</h3>
            </div>
          ))}
        </div>

        {selected && (
          <div className={`modal-overlay ${modalClosing ? "closing" : ""}`} onClick={() => startClose()}>
            <div className={`modal-card ${modalClosing ? "closing" : ""}`} role="dialog" aria-modal="true" aria-label={selected.title} onClick={(e)=>e.stopPropagation()}>
              <header style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <h3>{selected.title}</h3>
                <button onClick={()=>startClose()} aria-label="Cerrar modal">✕</button>
              </header>
              <div className="modal-body">
                <img src={selected.img} alt={selected.title} style={{maxWidth:'200px',height:'auto'}} />
                <p>{selected.description}</p>
                {selected.link && <a href={selected.link} className="btn btn-primary">Ver más</a>}
              </div>
            </div>
          </div>
        )}
        <section id="cumplimientos" className="mb-5">
          <hr className="linea mb-4" />
          <h2 className="mb-4">Ver cumplimientos</h2>
          <div className="d-flex gap-3">
            <button className="btn btn-primary" onClick={() => navigate('/cumplimientos/mes-anio')}>Por mes y año</button>
            <button className="btn btn-primary" onClick={() => navigate('/cumplimientos/por-ente')}>Por ente</button>
            <button className="btn btn-primary" onClick={() => navigate('/cumplimientos/por-clasificacion')}>Por clasificación de entes</button>
          </div>
        </section>
        {/* Cumplimientos */}
        <section id="cumplimientos" className="mb-5">
          <hr className="linea mb-4" />
          <h2 className="mb-4">Cumplimientos</h2>

          {/* Indicadores */}
          <div className="cumplimiento-item mb-3">
            <button
              className="btn btn-magenta w-100 text-start"
              type="button"
              data-bs-toggle="collapse"
              data-bs-target="#indicadoresCollapse"
              aria-expanded="false"
              aria-controls="indicadoresCollapse"
            >
              Indicadores de Cumplimiento
            </button>
            <div className="collapse" id="indicadoresCollapse">
              <div className="card card-body">
                <section id="busqueda" className="mb-5">
                  <h2>🔍 Búsqueda de Información</h2>
                  <form className="row g-3">
                    <div className="col-md-4">
                      <label htmlFor="ente" className="form-label">
                        Ente
                      </label>
                      <input
                        type="text"
                        id="ente"
                        className="form-control"
                        placeholder="Ej: Municipio de La Paz"
                      />
                    </div>
                    <div className="col-md-4">
                      <label htmlFor="anio" className="form-label">
                        Año
                      </label>
                      <select id="anio" className="form-select">
                        <option defaultValue>2025</option>
                        <option>2024</option>
                        <option>2023</option>
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label htmlFor="mes" className="form-label">
                        Mes
                      </label>
                      <select id="mes" className="form-select">
                        <option defaultValue>Todos</option>
                        <option>Enero</option>
                        <option>Febrero</option>
                        <option>Marzo</option>
                      </select>
                    </div>
                    <div className="col-12">
                      <button type="button" className="btn btn-primary">
                        Buscar
                      </button>
                    </div>
                  </form>
                </section>
                <p>Aquí irá la información de indicadores...</p>
              </div>
            </div>
          </div>

          {/* Gráficas */}
          <div className="cumplimiento-item mb-3">
            <button
              className="btn btn-magenta w-100 text-start"
              type="button"
              data-bs-toggle="collapse"
              data-bs-target="#graficasCollapse"
              aria-expanded="false"
              aria-controls="graficasCollapse"
            >
              Gráficas de Cumplimiento
            </button>
            <div className="collapse" id="graficasCollapse">
              <div className="card card-body">
                <section id="busqueda" className="mb-5">
                  <h2>🔍 Búsqueda de Información</h2>
                  <form className="row g-3">
                    <div className="col-md-4">
                      <label htmlFor="ente" className="form-label">
                        Ente
                      </label>
                      <input
                        type="text"
                        id="ente"
                        className="form-control"
                        placeholder="Ej: Municipio de La Paz"
                      />
                    </div>
                    <div className="col-md-4">
                      <label htmlFor="anio" className="form-label">
                        Año
                      </label>
                      <select id="anio" className="form-select">
                        <option defaultValue>2025</option>
                        <option>2024</option>
                        <option>2023</option>
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label htmlFor="mes" className="form-label">
                        Mes
                      </label>
                      <select id="mes" className="form-select">
                        <option defaultValue>Todos</option>
                        <option>Enero</option>
                        <option>Febrero</option>
                        <option>Marzo</option>
                      </select>
                    </div>
                    <div className="col-12">
                      <button type="button" className="btn btn-primary">
                        Buscar
                      </button>
                    </div>
                  </form>
                </section>
                <p>Aquí irá la información de gráficas...</p>
              </div>
            </div>
          </div>

          {/* Reportes */}
          <div className="cumplimiento-item mb-3">
            <button
              className="btn btn-magenta w-100 text-start"
              type="button"
              data-bs-toggle="collapse"
              data-bs-target="#reportesCollapse"
              aria-expanded="false"
              aria-controls="reportesCollapse"
            >
              Reportes de Cumplimiento
            </button>
            <div className="collapse" id="reportesCollapse">
              <div className="card card-body">
                <section id="busqueda" className="mb-5">
                  <h2>🔍 Búsqueda de Información</h2>
                  <form className="row g-3">
                    <div className="col-md-4">
                      <label htmlFor="ente" className="form-label">
                        Ente
                      </label>
                      <input
                        type="text"
                        id="ente"
                        className="form-control"
                        placeholder="Ej: Municipio de La Paz"
                      />
                    </div>
                    <div className="col-md-4">
                      <label htmlFor="anio" className="form-label">
                        Año
                      </label>
                      <select id="anio" className="form-select">
                        <option defaultValue>2025</option>
                        <option>2024</option>
                        <option>2023</option>
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label htmlFor="mes" className="form-label">
                        Mes
                      </label>
                      <select id="mes" className="form-select">
                        <option defaultValue>Todos</option>
                        <option>Enero</option>
                        <option>Febrero</option>
                        <option>Marzo</option>
                      </select>
                    </div>
                    <div className="col-12">
                      <button type="button" className="btn btn-primary">
                        Buscar
                      </button>
                    </div>
                  </form>
                </section>
                <p>Aquí irá la información de reportes...</p>
              </div>
            </div>
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
