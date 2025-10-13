import {Outlet, Navigate} from 'react-router-dom'
import {useStateContext } from '../Contexts/ContextProvider'


export default function GuestLayout(){
    const {token} = useStateContext()
    if (token)
    {
        return <Navigate to= "/siret"/>
    }
    return(
        <div>
            <div className ="dg-red-200 p-14">

                <Outlet/>
            </div>
        </div>
    )
}
