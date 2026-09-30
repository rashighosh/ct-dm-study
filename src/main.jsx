import { createRoot } from 'react-dom/client'
import { Suspense } from 'react'
import './index.css'
import { BrowserRouter, Routes, Route } from 'react-router'
import Adaptive from './components/Adaptive.jsx'
import SelectResources from './components/SelectResources'

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<Adaptive />} />
        <Route path="/conversation" element={<Adaptive />} />
        <Route path="/resources" element={<SelectResources />} />
      </Routes>
    </Suspense>
  </BrowserRouter>,
)
