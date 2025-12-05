import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axiosClient from "../axios-client";
import { useStateContext } from "../Contexts/ContextProvider";
import { toast } from "react-toastify";

/**
 * SimpleNavbar
 * - Muestra solo: botón "Iniciar sesión" (link) y botón "Cerrar sesión" (logout)
 * - Si no hay usuario autenticado -> solo "Iniciar sesión"
 * - Si hay usuario -> muestra "Cerrar sesión"
 */
export default function Navbar() {
    const { user, setUser, setToken } = useStateContext();
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const [openMenu, setOpenMenu] = useState(false);
    const menuRef = React.useRef();

    // close menu on outside click
    React.useEffect(() => {
        const onDoc = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenu(false);
        };
        document.addEventListener('click', onDoc);
        return () => document.removeEventListener('click', onDoc);
    }, []);

    // (Opcional) obtener usuario al montar si aún no está en contexto
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

    const onLogout = async (ev) => {
        ev && ev.preventDefault();
        setLoading(true);
        try {
            await axiosClient.post("/logout");
        } catch (err) {
            // ignorar error; igualmente limpiamos el estado local
        } finally {
            // limpiar contexto / localStorage
            setUser({});
            setToken(null);
            localStorage.removeItem("user_id");
            localStorage.removeItem("permisos");
            toast.success("Sesión cerrada");
            setLoading(false);
            // opcional: redirigir al inicio o login
            navigate("/");
        }
    };

    return (
        <header className="w-full bg-neutral-900 py-3 px-4 shadow-sm">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="space-x-10 flex items-center">
                    <Link
                        to="/services/new"
                        className="text-white bg-green-700 py-2 px-4 text-md"
                    >
                        Nuevo Servicio
                    </Link>
                    <Link to="/dashboard" className="text-white font-bold">
                        Inicio
                    </Link>

                    <Link to="/users" className="text-white font-bold">
                        Usuarios
                    </Link>

                    {/* Cumplimientos dropdown */}
                    <div className="relative inline-block text-left" ref={menuRef}>
                        <button type="button" aria-haspopup="true" aria-expanded={openMenu} onClick={() => setOpenMenu(v=>!v)} className="text-white font-bold px-3 py-2">
                            Cumplimientos ▾
                        </button>
                        {openMenu && (
                            <div className="origin-top-left absolute left-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                                <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                                    <a href="/cumplimientos/mes-anio" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem">Por mes y año</a>
                                    <a href="/cumplimientos/por-ente" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem">Por ente</a>
                                    <a href="/cumplimientos/por-clasificacion" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem">Por clasificación de entes</a>
                                </div>
                            </div>
                        )}
                    </div>

                    <Link to="/comparativa" className="text-white font-bold">
                        Comparativo
                    </Link>
                </div>

                <div className="flex items-center gap-3">
                    {!user || !user.id ? (
                        <Link
                            to="/login"
                            className="px-4 py-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition"
                        >
                            Iniciar sesión
                        </Link>
                    ) : (
                        <button
                            onClick={onLogout}
                            disabled={loading}
                            className="px-4 py-2 rounded-full bg-red-500 text-white hover:bg-red-600 transition disabled:opacity-60"
                        >
                            {loading ? "Cerrando..." : "Cerrar sesión"}
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
}
