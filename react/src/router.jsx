import { createBrowserRouter } from "react-router-dom";
import DefaultLayout from "./Views/DefaultLayout";
import Inicio from "./Views/inicio";
import GuestLayout from "./Views/GuestLayout";
import Login from "./Views/Login";
import SiretEntes from "./Views/SiretEntes";
import Cumplimientos from "./Views/Cumplimientos";
import CumplimientosMesAnio from "./Views/CumplimientosMesAnio";
import CumplimientosPorEnte from "./Views/CumplimientosPorEnte";
import CumplimientosPorClasificacion from "./Views/CumplimientosPorClasificacion";
import Comparativa from "./Views/Comparativa";
import SiretClasificaciones from "./Views/SiretClasificaciones";
import SiretCumplimientos from "./Views/SiretCumplimientos";
import SiretExportacion from "./Views/SiretExportacion";
import SiretExportPDF from "./Views/SiretExportPDF";
import SiretExportExcel from "./Views/SiretExportExcel";
import SiretExportExcelMes from "./Views/SiretExportExcelMes";
import SiretExportPDFMes from "./Views/SiretExportPDFMes";
import SiretExportPDFEnte from "./Views/SiretExportPDFEnte";
import SiretExportExcelEnte from "./Views/SiretExportExcelEnte";
import SiretExportPDFCom from "./Views/ExportPDFCom";
import SiretExportExcelCom from "./Views/ExportExcelCom";

const router = createBrowserRouter([
  {
    path: "/",
    element: <DefaultLayout />,
    children: [

    ],
  },
  {
    path: "/",
    element: <GuestLayout />,
    children: [
      { path: "", element: <Inicio /> },
      { path: "/inicio", element: <Inicio /> },
      { path: "/cumplimientos", element: <Cumplimientos /> },
      { path: "/cumplimientos/mes-anio", element: <CumplimientosMesAnio /> },
      { path: "/cumplimientos/por-ente", element: <CumplimientosPorEnte /> },
      { path: "/cumplimientos/por-clasificacion", element: <CumplimientosPorClasificacion /> },
      { path: "/comparativa", element: <Comparativa /> },
      { path: "/login", element: <Login /> },
      { path: "/Siret", element: <SiretEntes /> },
      { path: "/SiretEntes", element: <SiretEntes /> },
      { path: "/SiretClasificaciones", element: <SiretClasificaciones /> },
      { path: "/SiretCumplimientos", element: <SiretCumplimientos /> },
      { path: "/SiretExportacion", element: <SiretExportacion /> },
      { path: "/ExportPDF", element: <SiretExportPDF /> },
      { path: "/ExportExcel", element: <SiretExportExcel /> },
      { path: "/ExportExcelMes", element: <SiretExportExcelMes /> },
      { path: "/ExportPDFMes", element: <SiretExportPDFMes /> },
      { path: "/ExportPDFEnte", element: <SiretExportPDFEnte /> },
      { path: "/ExportExcelEnte", element: <SiretExportExcelEnte /> },
      { path: "/ExportPDFCom", element: <SiretExportPDFCom /> },
      { path: "/ExportExcelCom", element: <SiretExportExcelCom /> },
    ],
  },
]);

export default router;
