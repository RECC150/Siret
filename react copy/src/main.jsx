import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ContextProvider } from './Contexts/ContextProvider'

import { RouterProvider } from 'react-router-dom'
import router from './router'


createRoot(document.getElementById('root')).render(
  <StrictMode>
   <ContextProvider>
      <RouterProvider router={router}/>
   </ContextProvider>
  </StrictMode>,
)
