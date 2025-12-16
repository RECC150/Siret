import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./css/inicio.css";

export default function Siret() {
  const navigate = useNavigate();

  const sections = [
    {
      id: 1,
      title: "Entes",
      description: "Gestiona el catálogo de entes, ingresando nuevas, editando y eliminando entes.",
      path: "/SiretEntes",
      iconKey: "building"
    },
    {
      id: 2,
      title: "Clasificaciones",
      description: "Administra las clasificaciones, ingresando nuevas, editando y eliminando clasificaciones.",
      path: "/SiretClasificaciones",
      iconKey: "tags"
    },
    {
      id: 3,
      title: "Cumplimientos",
      description: "Registra, edita y elimina los cumplimientos del sistema.",
      path: "/SiretCumplimientos",
      iconKey: "checklist"
    },
    {
      id: 4,
      title: "Exportación",
      description: "Exporta datos y reportes del sistema.",
      path: "/SiretExportacion",
      iconKey: "export"
    }
  ];

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
      case 'checklist':
        return (
          <div style={circleStyle} aria-hidden="true">
            <svg {...baseProps}>
              <path d="M5 5h14" />
              <path d="M5 12h14" />
              <path d="M5 19h14" />
              <path d="m3 5 1.5 1.5L6.5 4" />
              <path d="m3 12 1.5 1.5L6.5 11" />
              <path d="m3 19 1.5 1.5L6.5 18" />
            </svg>
          </div>
        );
      case 'export':
        return (
          <div style={circleStyle} aria-hidden="true">
            <svg {...baseProps}>
              <path d="M12 3v12" />
              <path d="m16 7-4-4-4 4" />
              <path d="M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
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

  return (
    <div className="container-fluid px-0" style={{ paddingTop: '50px', minHeight: '100vh', background: '#f8f9fa' }}>
      <header className="text-white text-center py-5" style={{ background: 'linear-gradient(135deg, #681b32 0%, #200b07 100%)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
        <h1 style={{ margin: 0, marginBottom: 8, fontWeight: 700 }}>SIRET</h1>
        <p className="lead" style={{ margin: 0, marginBottom: 0, opacity: 0.95 }}>Sistema de Registro de Entes y Cumplimientos</p>
      </header>

      <div className="container py-5">
        <style>{`
          @keyframes slideInLeft {
            from {
              opacity: 0;
              transform: translateX(-50px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }

          .siret-card {
            animation: slideInLeft 0.6s ease-out forwards;
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

          .siret-card:hover {
            transform: translateY(-8px);
            box-shadow: 0 8px 24px rgba(104, 27, 50, 0.2);
          }

          .siret-card-header {
            background: linear-gradient(135deg, #681b32 0%, #200b07 100%);
            color: #fff;
            padding: 28px;
            text-align: center;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .siret-card-body {
            padding: 24px;
            flex: 1;
            display: flex;
            flex-direction: column;
          }

          .siret-card-title {
            font-size: 20px;
            font-weight: 700;
            color: #2c3e50;
            margin-bottom: 12px;
          }

          .siret-card-description {
            font-size: 14px;
            color: #2c3e50;
            margin-bottom: 20px;
            flex: 1;
            line-height: 1.5;
          }

          .siret-card-button {
            background: linear-gradient(135deg, #681b32 0%, #200b07 100%);
            color: #fff;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 3px 8px rgba(104, 27, 50, 0.3);
          }

          .siret-card-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 12px rgba(104, 27, 50, 0.4);
          }

          .siret-card-button:active {
            transform: translateY(0);
          }
        `}</style>

        <div className="row g-4">
          {sections.map((section, index) => (
            <div
              key={section.id}
              className="col-lg-6 col-xl-3"
              style={{
                animationDelay: `${index * 0.1}s`
              }}
            >
              <div className="siret-card">
                  <div className="siret-card-header">
                    {renderIcon(section.iconKey)}
                  </div>
                <div className="siret-card-body">
                  <div className="siret-card-title">{section.title}</div>
                  <div className="siret-card-description">{section.description}</div>
                  <button
                    className="siret-card-button"
                    onClick={() => navigate(section.path)}
                  >
                    Ir a {section.title}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
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
