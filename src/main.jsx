import { createRoot } from 'react-dom/client'
import './index.css'
import { BrowserRouter, Routes, Route } from 'react-router'
import App from './components/App.jsx'
import TrialLayout from './components/TrialLayout.jsx'
import GuidedInteraction from './components/GuidedInteraction.jsx'
import PersonaChat from './components/PersonaChat.jsx'
import GoalSetting from './components/GoalSetting.jsx'
import MainInteraction from './components/MainInteraction.jsx'
import NotesReview from './components/NotesReview'

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<GoalSetting />} />
      <Route path="/main-interaction" element={<MainInteraction />} />
      <Route path="/persona-chat" element={<PersonaChat />} />
      <Route path="/original" element={<App />} />
      <Route path="/trials-layout" element={<TrialLayout />} />
      <Route path="/guided-interaction" element={<GuidedInteraction />} />
      <Route path="/notes-review" element={<NotesReview />} />
    </Routes>
  </BrowserRouter>,
)
