import { Navigate, Outlet } from "react-router-dom";
import { useStateContext } from "../Contexts/ContextProvider";
import { useEffect } from "react";
import axiosClient from "../axios-client";
import Navbar from "../Components/Navbar";

export default function DefaultLayout() {
    const { user, token, setUser, setToken } = useStateContext();

    // Si no hay token, redirige al login.
    if (!token) {
        return <Navigate to="/Login" />;
    }

    const onLogout = (ev) => {
        ev.preventDefault();
        const queryClient = useQueryClient(); // Obtén la instancia del queryClient
        axiosClient.post("/logout").then(() => {
            // Limpia la caché de React Query, por ejemplo, eliminando las queries de notificaciones
            queryClient.removeQueries(["notifications"]);
            // O para limpiar toda la caché:
            // queryClient.clear();
            setUser({});
            setToken(null);
        });
    };
    useEffect(() => {
        axiosClient
            .get("/user")
            .then(({ data }) => {
                if (data.suspended) {
                    alert("Tu cuenta está suspendida.");
                    setUser({});
                    setToken(null);
                } else {
                    setUser(data);
                }
            })
            .catch(() => {
                // En caso de error, se podría redirigir al login
            });
    }, []);

    return (
        <div className="min-h-screen">
            <Navbar onLogout={onLogout}/>
            {/* Contenedor principal que ocupa el espacio disponible */}
            <main className=
            "p-14 w-full min-h-screen bg-gradient-to-l from-blue-950 via-pink-950 to-blue-950 background-animate">
                <Outlet />
            </main>
        </div>
    );
}
