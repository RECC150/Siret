import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosClient from "../axios-client.js";
import { useStateContext } from "../Contexts/ContextProvider.jsx";
import { toast } from "react-toastify";


export default function Inicio() {

  const onSubmit = async (ev) => {

  };

  return (
    <div className="bg-light">
      {/* Navbar */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark fixed-top">
        <div className="container-fluid">
          <a className="navbar-brand d-flex align-items-center" href="#">
            <img
              src="imagenes/ASEBCS.jpg"
              alt="Logo SIRET"
              width="80"
              height="40"
              className="me-2"
            />
            SIRET
          </a>
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarNav"
            aria-controls="navbarNav"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav ms-auto">
              <li className="nav-item">
                <a className="nav-link active" href="#indicadores">
                  Indicadores
                </a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="#graficas">
                  Gráficas
                </a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="#reportes">
                  Reportes
                </a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="#descargas">
                  Descargas
                </a>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      {/* Encabezado */}
      <header className="bg-primary text-white text-center py-4 mt-5">
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
              <img
                src="imagenes/grupal.jpg"
                alt="Equipo ASEBCS"
                className="img-fluid rounded shadow"
              />
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
          <h2 className="mb-4">🚦 Semáforo de Cumplimiento</h2>
          <div className="d-flex flex-wrap justify-content-center gap-4">
            {/* Verde */}
            <div className="semaforo-card bg-success text-white">
              <img
                src="imagenes/SemaforoVerde.png"
                alt="Cumplimiento Total"
                className="semaforo-icon"
              />
              <div className="semaforo-info">
                <p>
                  Cumple en tiempo y forma con el 100% de la información
                  requerida en lo señalado por los Lineamientos para la
                  presentación e integración de la Cuenta Pública y la Guía de
                  información financiera mensual y Cuenta Pública.
                </p>
              </div>
            </div>

            {/* Amarillo */}
            <div className="semaforo-card bg-warning text-dark">
              <img
                src="imagenes/SemaforoAmarillo.png"
                alt="Cumplimiento Parcial"
                className="semaforo-icon"
              />
              <div className="semaforo-info">
                <p>
                  No cumple en tiempo y forma con el 100% de la información
                  requerida en lo señalado por los Lineamientos para la
                  presentación e integración de la Cuenta Pública y la Guía de
                  información financiera mensual y Cuenta Pública.
                </p>
              </div>
            </div>

            {/* Rojo */}
            <div className="semaforo-card bg-danger text-white">
              <img
                src="imagenes/SemaforoRojo.png"
                alt="Sin Información"
                className="semaforo-icon"
              />
              <div className="semaforo-info">
                <p>No presentó información.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Cumplimientos */}
        <section id="cumplimientos" className="mb-5">
          <hr className="linea mb-4" />
          <h2 className="mb-4">📋 Cumplimientos</h2>

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
