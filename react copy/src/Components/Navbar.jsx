import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import axiosClient from "../axios-client";
import { useStateContext } from "../Contexts/ContextProvider";
import { toast } from "react-toastify";
import ASEBCS from "../assets/asebcs.jpg";

export default function Navbar() {
    const { user, setUser, setToken } = useStateContext();
    const [loading, setLoading] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const [openMenu, setOpenMenu] = useState(false);
    const menuRef = React.useRef();

    // No mostrar navbar en login
    if (location.pathname === '/login') {
        return null;
    }

    // Apply body padding-top only while Navbar is mounted
    useEffect(() => {
        const prevPaddingTop = document.body.style.paddingTop;
        document.body.style.paddingTop = '15px';
        return () => {
            document.body.style.paddingTop = prevPaddingTop;
        };
    }, []);

    // close menu on outside click
    React.useEffect(() => {
        const onDoc = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenu(false);
        };
        document.addEventListener('click', onDoc);
        return () => document.removeEventListener('click', onDoc);
    }, []);

    // obtener usuario al montar si aún no está en contexto
    useEffect(() => {
        if (!user || !user.id) {
            axiosClient
                .get("/user")
                .then(({ data }) => {
                    setUser(data);
                })
                .catch(() => {
                    // no hacer nada si no hay sesión
                });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const performLogout = async () => {
        setLoading(true);
        try {
            await axiosClient.post("/logout");
        } catch (err) {
            // ignorar error; igualmente limpiamos el estado local
        } finally {
            setUser({});
            setToken(null);
            localStorage.removeItem("user_id");
            localStorage.removeItem("permisos");
            toast.success("Sesión cerrada");
            setLoading(false);
            navigate("/login", { replace: true });
            // Fallback duro por si el router no navega
            setTimeout(() => { try { window.location.assign('/login'); } catch (_) {} }, 150);
        }
    };

    const onLogoutClick = (ev) => {
        ev && ev.preventDefault();
        setShowLogoutConfirm(true);
    };

    return (
        <React.Fragment>
        <nav className="navbar navbar-expand-lg navbar-dark bg-dark fixed-top">
            <div className="container-fluid">
                <Link to="/Siret" className="navbar-brand d-flex align-items-center">
                    <img src={ASEBCS} alt="Logo SIRET" width="80" height="40" className="me-2" />
                    SIRET
                </Link>
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
                    <ul className="navbar-nav me-auto">
                        <li className="nav-item">
                            <Link to="/Siret" className="nav-link">
                                Inicio
                            </Link>
                        </li>
                        <li className="nav-item dropdown" ref={menuRef}>
                            <a
                                className="nav-link dropdown-toggle"
                                href="#"
                                id="vistasDropdown"
                                role="button"
                                data-bs-toggle="dropdown"
                                aria-expanded="false"
                                onClick={() => setOpenMenu(!openMenu)}
                            >
                                Vistas
                            </a>
                            <ul className="dropdown-menu" aria-labelledby="vistasDropdown">
                                <li>
                                    <Link to="/SiretEntes" className="dropdown-item">Entes</Link>
                                </li>
                                <li>
                                    <Link to="/SiretClasificaciones" className="dropdown-item">Clasificaciones</Link>
                                </li>
                                <li>
                                    <Link to="/SiretCumplimientos" className="dropdown-item">Cumplimientos</Link>
                                </li>
                                <li>
                                    <Link to="/SiretExportacion" className="dropdown-item">Exportación</Link>
                                </li>
                            </ul>
                        </li>
                    </ul>
                    <ul className="navbar-nav ms-auto">
                        <li className="nav-item">
                            <button
                                onClick={onLogoutClick}
                                disabled={loading}
                                className="nav-link active btn btn-link"
                                style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
                            >
                                {loading ? "Cerrando..." : "Cerrar Sesión"}
                            </button>
                        </li>
                    </ul>
                </div>
            </div>
        </nav>

        {showLogoutConfirm && (
            <div className="modal-backdrop" style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000 }}>
                <div className="modal-content" style={{ background:'#fff', borderRadius:12, padding:24, maxWidth:420, width:'90%', boxShadow:'0 10px 30px rgba(0,0,0,0.2)' }}>
                    <h5 style={{ marginBottom:12, fontWeight:700, color:'#2c3e50' }}>¿Cerrar sesión?</h5>
                    <p style={{ marginBottom:20, color:'#495057' }}>Se cerrará tu sesión actual y volverás a la pantalla de inicio de sesión.</p>
                    <div style={{ display:'flex', justifyContent:'flex-end', gap:10 }}>
                        <button
                            className="btn btn-secondary"
                            onClick={() => setShowLogoutConfirm(false)}
                            disabled={loading}
                        >
                            Cancelar
                        </button>
                        <button
                            className="btn btn-danger"
                            onClick={() => { setShowLogoutConfirm(false); performLogout(); }}
                            disabled={loading}
                        >
                            {loading ? 'Cerrando...' : 'Sí, cerrar sesión'}
                        </button>
                    </div>
                </div>
            </div>
        )}
        </React.Fragment>
    );
}
