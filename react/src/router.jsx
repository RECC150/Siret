import {createBrowserRouter} from "react-router-dom";
import DefaultLayout from "./Views/DefaultLayout";
import Login from "./Views/Login";
import GuestLayout from "./Views/GuestLayout";
import Siret from "./Views/Siret";

const router = createBrowserRouter([
    {
        path: "/",
        element: <DefaultLayout />,
        children:[
            /*En esta parte va siret. Voy a cambiar Login por siret*/
            { path: "/Siret", element: <Siret/>}
        ],
    },
    {
        path: "/",

        element: <GuestLayout />,
        children:[
            {path: "", element: <Login />},
            /*En esta parte va inicio. Voy a cambiar Login por inicio*/
            {path: "/Login", element: <Login />},
        ],
    },
])
export default router;
