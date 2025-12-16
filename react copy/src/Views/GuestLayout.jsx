import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useStateContext } from '../Contexts/ContextProvider';
import { AnimatePresence, motion } from 'framer-motion';


export default function GuestLayout(){
    const { token } = useStateContext();
    const location = useLocation();

    if (token) {
        return <Navigate to="/siret" />;
    }

    return (
        <div>
            <div className="dg-red-200 p-14">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={location.pathname}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                    >
                        <Outlet />
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
