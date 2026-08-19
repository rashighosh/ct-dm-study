import { createRoot } from 'react-dom/client'
import './index.css'
import { BrowserRouter, Routes, Route } from 'react-router'
import App from './components/App.jsx'
import TrialLayout from './components/TrialLayout.jsx'
import GuidedInteraction from './components/GuidedInteraction.jsx'
import PersonaChat from './components/PersonaChat.jsx'
import GoalSetting from './components/GoalSetting.jsx'
import MainInteraction from './components/MainInteraction.jsx'
import MainInteraction1 from './components/MainInteraction1.jsx'
import MainInteractionCombined from './components/MainInteractionCombined.jsx'
import NotesReview from './components/NotesReview'
import AdaptiveNotesReview from './components/AdaptiveNotesReview'
import AdaptiveInteraction from './components/AdaptiveInteraction.jsx'
import Adaptive from './components/Adaptive.jsx'

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Adaptive />} />
      <Route path="/main-iteraction" element={<MainInteraction />} />
      <Route path="/goal-setting" element={<GoalSetting />} />
      <Route path="/persona-chat" element={<PersonaChat />} />
      <Route path="/original" element={<App />} />
      <Route path="/trials-layout" element={<TrialLayout />} />
      <Route path="/guided-interaction" element={<GuidedInteraction />} />
      <Route path="/notes-review" element={<NotesReview />} />
      <Route
        path="/interaction-notes-review"
        element={<AdaptiveNotesReview />}
      />
      <Route path="/interact" element={<MainInteraction1 />} />
      <Route path="/adaptive" element={<AdaptiveInteraction />} />
      <Route path="/combined" element={<MainInteractionCombined />} />
    </Routes>
  </BrowserRouter>,
)
