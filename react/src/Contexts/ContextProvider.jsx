import { createContext, useContext, useState, useEffect } from "react";
import axiosClient from "../axios-client";

const StateContext = createContext({
  user: null,
  token: null,
  notification: null,
  loading: false,
  setUser: () => {},
  setToken: () => {},
  setNotification: () => {}
});

export const ContextProvider = ({ children }) => {
  const [user, setUser] = useState(null); // Inicializamos como null
  const [token, _setToken] = useState(localStorage.getItem("ACCESS_TOKEN"));
  const [notification, _setNotification] = useState("");
  const [loading, setLoading] = useState(true); // Estado de carga

  const setToken = (token) => {
    _setToken(token);
    if (token) {
      localStorage.setItem("ACCESS_TOKEN", token);
    } else {
      localStorage.removeItem("ACCESS_TOKEN");
    }
  };

  const setNotification = (message) => {
    _setNotification(message);
    setTimeout(() => {
      _setNotification("");
    }, 5000);
  };

  // Efecto para recuperar el usuario cuando exista un token
  useEffect(() => {
    if (token) {
      axiosClient
        .get("/user")
        .then(({ data }) => {
          // Verificamos si el usuario tiene algún flag de suspensión, por ejemplo.
          if (data.suspended) {
            alert("Your account is suspended.");
            setUser(null);
            setToken(null);
          } else {
            setUser(data);
          }
        })
        .catch(() => {
          // En caso de error, puedes redirigir o limpiar el token
          setUser(null);
          setToken(null);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [token]);

  return (
    <StateContext.Provider
      value={{
        user,
        setUser,
        token,
        setToken,
        notification,
        setNotification,
        loading,
      }}
    >
      {children}
    </StateContext.Provider>
  );
};

export const useStateContext = () => useContext(StateContext);