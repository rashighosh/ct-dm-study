import { createRoot } from 'react-dom/client'
import './index.css'
import { BrowserRouter, Routes, Route } from "react-router";
import App from './components/App.jsx'
import TrialLayout from './components/TrialLayout.jsx'

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/trials-layout" element={<TrialLayout />} />
    </Routes>
  </BrowserRouter>
);