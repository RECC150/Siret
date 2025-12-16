import React, { useRef, useState, useEffect } from "react";
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

  // Asegura que el body no tenga padding-top (se usaba en otras vistas con navbar)
  useEffect(() => {
    const prevPadding = document.body.style.paddingTop;
    document.body.style.paddingTop = "0px";
    return () => {
      document.body.style.paddingTop = prevPadding;
    };
  }, []);

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
      navigate("/Siret");
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
      <style>{`
        .form-control-login {
          border: 1px solid #ddd !important;
          transition: all 0.3s ease;
          border-radius: 8px !important;
          padding: 12px 14px !important;
          font-size: 15px !important;
        }

        .form-control-login:focus {
          border-color: #85435e !important;
          box-shadow: 0 0 5px rgba(194, 24, 91, 0.5) !important;
          background-color: #fff0f5 !important;
          color: #333 !important;
          outline: none !important;
        }

        .form-control-login:hover {
          border-color: #85435e !important;
        }
      `}</style>
      <div className="centered-card row-lg">
        <div className="left-pane">
          <img src={asebcs} alt="ASEBCS" style={{ maxHeight: 380, objectFit: "contain", display: "block" }} />
        </div>

        <div className="right-pane">
          <div className="form-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div>
              <h2 className="text-2xl font-bold text-slate-800 text-center mb-2">Iniciar sesión</h2>
              <p className="text-sm mb-0 text-center text-gray-600">Accede con tu nombre de usuario y contraseña asignada</p>
            </div>

            <form onSubmit={onSubmit} className="w-full" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre de usuario</label>
                <input
                  ref={nameRef}
                  type="text"
                  placeholder="Nombre de usuario"
                  onChange={() => setErrors({ ...errors, name: null })}
                  className={`w-full form-control-login ${errors.name ? "border-red-500" : ""}`}
                />
                {errors.name && <p className="text-red-600 text-sm mt-2">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contraseña</label>
                <input
                  ref={passwordRef}
                  type="password"
                  placeholder="Contraseña"
                  onChange={() => setErrors({ ...errors, password: null })}
                  className={`w-full form-control-login ${errors.password ? "border-red-500" : ""}`}
                />
                {errors.password && <p className="text-red-600 text-sm mt-2">{errors.password}</p>}
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: '12px',
                  background: 'linear-gradient(135deg, #681b32 0%, #200b07 100%)',
                  color: '#fff',
                  border: 'none',
                  padding: '12px 20px',
                  fontWeight: 600,
                  borderRadius: '8px',
                  fontSize: '16px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 10px rgba(104, 27, 50, 0.45)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {loading ? "Accediendo ..." : "Acceder"}
              </button>
            </form>

            <div className="text-sm text-center" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <p style={{ margin: 0, color: '#6b7280' }}>¿Tienes problemas para iniciar sesión?</p>
              <button onClick={() => setIsModalOpen(true)} className="text-blue-600 font-bold underline" style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer", fontSize: '14px' }}>
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
