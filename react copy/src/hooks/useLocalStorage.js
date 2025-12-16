import { useState, useEffect } from 'react';

/**
 * Hook personalizado para usar LocalStorage de forma segura
 * @param {string} key - La clave en LocalStorage
 * @param {any} initialValue - Valor inicial si no existe en LocalStorage
 * @returns {[any, Function]} - [value, setValue]
 */
export const useLocalStorage = (key, initialValue) => {
  // State para almacenar el valor
  const [storedValue, setStoredValue] = useState(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error al leer LocalStorage [${key}]:`, error);
      return initialValue;
    }
  });

  // Función para actualizar el valor en LocalStorage
  const setValue = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);

      if (typeof window !== 'undefined') {
        if (valueToStore === null || valueToStore === undefined) {
          window.localStorage.removeItem(key);
        } else {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      }
    } catch (error) {
      console.error(`Error al escribir en LocalStorage [${key}]:`, error);
    }
  };

  return [storedValue, setValue];
};
