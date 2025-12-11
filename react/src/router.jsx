import { createBrowserRouter } from "react-router-dom";
import DefaultLayout from "./Views/DefaultLayout";
import Inicio from "./Views/Inicio";
import GuestLayout from "./Views/GuestLayout";
import Login from "./Views/Login";
import Cumplimientos from "./Views/Cumplimientos";
import CumplimientosMesAnio from "./Views/CumplimientosMesAnio";
import CumplimientosPorEnte from "./Views/CumplimientosPorEnte";
import CumplimientosPorClasificacion from "./Views/CumplimientosPorClasificacion";
import Comparativa from "./Views/Comparativa";
import Siret from "./Views/Siret";
import SiretEntes from "./Views/SiretEntes";
import SiretClasificaciones from "./Views/SiretClasificaciones";
import SiretCumplimientos from "./Views/SiretCumplimientos";
import SiretComparativa from "./Views/SiretComparativa";
import SiretExportacion from "./Views/SiretExportacion";
import SiretExportPDF from "./Views/SiretExportPDF";
import SiretExportExcel from "./Views/SiretExportExcel";
import SiretExportExcelMes from "./Views/SiretExportExcelMes";
import SiretExportPDFMes from "./Views/SiretExportPDFMes";
import SiretExportPDFEnte from "./Views/SiretExportPDFEnte";
import SiretExportExcelEnte from "./Views/SiretExportExcelEnte";
import SiretExportExcelCom from "./Views/SiretExportExcelCom";
import SiretExportPDFCom from "./Views/SiretExportPDFCom";
import ExportPDF from "./Views/ExportPDF";
import ExportPDFMes from "./Views/ExportPDFMes";
import ExportPDFEnte from "./Views/ExportPDFEnte";
import ExportPDFCom from "./Views/ExportPDFCom";
import ExportExcel from "./Views/ExportExcel";
import ExportExcelMes from "./Views/ExportExcelMes";
import ExportExcelEnte from "./Views/ExportExcelEnte";
import ExportExcelCom from "./Views/ExportExcelCom";
import ExportPDFEnteCom from "./Views/ExportPDFEnteCom";
import ExportExcelEnteCom from "./Views/ExportExcelEnteCom";


const router = createBrowserRouter([
  {
    path: "/",
    element: <DefaultLayout />,
    children: [

      { path: "/Siret", element: <Siret /> },
      { path: "/SiretEntes", element: <SiretEntes /> },
      { path: "/SiretClasificaciones", element: <SiretClasificaciones /> },
      { path: "/SiretCumplimientos", element: <SiretCumplimientos /> },
      { path: "/SiretExportacion", element: <SiretExportacion /> },
      { path: "/SiretExportPDF", element: <SiretExportPDF /> },
      { path: "/SiretExportExcel", element: <SiretExportExcel /> },
      { path: "/SiretExportExcelMes", element: <SiretExportExcelMes /> },
      { path: "/SiretExportPDFMes", element: <SiretExportPDFMes /> },
      { path: "/SiretExportPDFEnte", element: <SiretExportPDFEnte /> },
      { path: "/SiretExportExcelEnte", element: <SiretExportExcelEnte /> },
      { path: "/SiretExportPDFCom", element: <SiretExportPDFCom /> },
      { path: "/SiretExportExcelCom", element: <SiretExportExcelCom /> },
      { path: "/SiretComparativa", element: <SiretComparativa /> }
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
      { path: "/ExportPDF", element: <ExportPDF /> },
      { path: "/ExportPDFMes", element: <ExportPDFMes /> },
      { path: "/ExportPDFEnte", element: <ExportPDFEnte /> },
      { path: "/ExportPDFCom", element: <ExportPDFCom /> },
      { path: "/ExportExcel", element: <ExportExcel /> },
      { path: "/ExportExcelMes", element: <ExportExcelMes /> },
      { path: "/ExportExcelEnte", element: <ExportExcelEnte /> },
      { path: "/ExportExcelCom", element: <ExportExcelCom /> },
      { path: "/ExportPDFEnteCom", element: <ExportPDFEnteCom /> },
      { path: "/ExportExcelEnteCom", element: <ExportExcelEnteCom /> }

    ],
  },
]);

export default router;
