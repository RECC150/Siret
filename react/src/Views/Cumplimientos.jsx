import React from 'react';
import { Link } from 'react-router-dom';

export default function Cumplimientos(){
  return (
    <div className="container py-4">
      <h2>Cumplimientos - Consultas</h2>
      <p>Selecciona la consulta que deseas realizar:</p>
      <ul>
        <li><Link to="mes-anio">Por mes y año</Link></li>
        <li><Link to="por-ente">Por ente</Link></li>
        <li><Link to="por-clasificacion">Por clasificación de entes</Link></li>
      </ul>
    </div>
  )
}
