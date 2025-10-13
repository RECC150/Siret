import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosClient from "../axios-client";
import { useStateContext } from "../Contexts/ContextProvider.jsx";
import { toast } from "react-toastify";
import asebcs from "../assets/asebcs.jpg";
import "./css/Login.css";


export default function Login() {
  const nameRef = useRef();
  const passwordRef = useRef();
  const { setUser, setToken } = useStateContext();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);

  const onSubmit = async (ev) => {
    ev.preventDefault();
    setLoading(true);
    setErrors({});

    const name = nameRef.current?.value.trim() || "";
    const password = passwordRef.current?.value.trim() || "";

    if (!name || !password) {
      setErrors({
        name: !name ? "El nombre de usuario es requerido" : null,
        password: !password ? "La contraseña es requerida" : null,
      });
      setLoading(false);
      return;
    }

    try {
      // Envío al endpoint token-based: POST /login (baseURL ya configurada en axios-client)
      const { data } = await axiosClient.post("/login", { name, password });

      // data debe contener { user, token } según tu AuthController
      if (!data || !data.user) {
        throw new Error("Respuesta inválida del servidor");
      }

      // Guardar en context (setToken ya persiste ACCESS_TOKEN en localStorage)
      if (data.token) {
        setToken(data.token);
      } else {
        setToken(null);
      }
      setUser(data.user);

      // Opcional: guarda id mínimo en localStorage (ya guarda token desde ContextProvider)
      localStorage.setItem("user_id", data.user.id);

      toast.success("Sesión iniciada correctamente");
      navigate("/dashboard");
    } catch (err) {
      const response = err?.response;
      if (response?.status === 422) {
        // Validación / credenciales
        toast.error("Credenciales incorrectas. Verifica usuario y contraseña");
        // Si tu backend envía errores específicos:
        if (response.data?.errors) {
          setErrors(Object.fromEntries(
            Object.entries(response.data.errors).map(([k, v]) => [k, v?.[0] ?? v])
          ));
        }
      } else if (response?.status === 401) {
        toast.error("No autorizado. Credenciales inválidas");
      } else {
        toast.error("Error al iniciar sesión. Comprueba la conexión");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-center">
      <div className="centered-card row-lg">
        <div className="left-pane">
          <img src={asebcs} alt="ASEBCS" style={{ maxHeight: 380, objectFit: "contain", display: "block" }} />
        </div>

        <div className="right-pane">
          <div className="form-wrapper">
            <h2 className="text-2xl font-bold text-slate-800 text-center mb-4">Iniciar sesión</h2>
            <p className="text-sm mb-6 text-center">Accede con tu nombre de usuario y contraseña asignada</p>

            <form onSubmit={onSubmit} className="w-full space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre de usuario</label>
                <input
                  ref={nameRef}
                  type="text"
                  placeholder="Nombre de usuario"
                  onChange={() => setErrors({ ...errors, name: null })}
                  className={`w-full px-4 py-3 border rounded-2xl transition ${errors.name ? "input-error" : ""}`}
                />
                {errors.name && <p className="text-error">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contraseña</label>
                <input
                  ref={passwordRef}
                  type="password"
                  placeholder="Contraseña"
                  onChange={() => setErrors({ ...errors, password: null })}
                  className={`w-full px-4 py-3 border rounded-2xl transition ${errors.password ? "input-error" : ""}`}
                />
                {errors.password && <p className="text-error">{errors.password}</p>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
              >
                {loading ? "Accediendo ..." : "Acceder"}
              </button>
            </form>

            <div className="text-sm mt-4 text-center">
              ¿Tienes problemas para iniciar sesión?{" "}
              <button onClick={() => setIsModalOpen(true)} className="text-blue-600 font-bold underline ml-1" style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer" }}>
                Click aquí
              </button>
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
              <h3 className="text-lg font-semibold">Problemas para iniciar sesión</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700" aria-label="Cerrar">✕</button>
            </div>

            <div className="mt-4 text-sm text-gray-700" style={{ lineHeight: 1.5 }}>
              <p>Si no recuerdas tu nombre de usuario o contraseña, contacta al administrador del sistema.</p>
              <p className="text-xs text-gray-500">Si el problema persiste, envía un correo a soporte@tudominio.mx</p>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.5rem" }}>
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-md" style={{ background: "#e5e7eb" }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
