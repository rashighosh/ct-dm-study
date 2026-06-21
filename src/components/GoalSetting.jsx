import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import logo from '../assets/logo-transparent.png'
import jordan_thumbsup from '../assets/jordan_thumbsup.png'
import '../css/GoalSetting.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowRight, faCheck, faStethoscope, faHandHoldingHeart, faPlus, faXmark, faFilePen } from '@fortawesome/free-solid-svg-icons'
import { initDoctorCharacter, initCompanionCharacter, speakWithLipsync, playGesture } from '../character.js';

function waitMs(duration) {
  return new Promise(resolve => setTimeout(resolve, duration));
}

// Things to understand, with Dr. Alex — factual / informational needs
// (QPL-CT, QuIC informed)
const ALEX_SECTIONS = [
  {
    title: "The basics",
    items: [
      { id: "trial-basics", label: "What is a clinical trial?", description: "What trials are, and why one might be offered to you." },
    ],
  },
  {
    title: "Risks & benefits",
    items: [
      { id: "risks", label: "Risks & side effects", description: "What could go wrong, and how it's monitored." },
      { id: "benefits", label: "Possible benefits", description: "What could help you, and what's still uncertain." },
      { id: "alternatives", label: "Other options", description: "Ways to participate in research beyond clinical trials." },
    ],
  },
  {
    title: "How it works",
    items: [
      { id: "types", label: "Types of clinical trials", description: "Different types of clinical trials." },
      { id: "randomization", label: "Randomization & groups", description: "How treatment assignment is decided." },
      { id: "logistics", label: "Schedule, costs & visits", description: "Time commitment, location, and what's covered." },
    ],
  },
  {
    title: "Other",
    items: [
      { id: "stories", label: "People's experiences", description: "Experiences of people who have participated." }
    ],
  }
];

// Things to think through, with Jordan — values / decision-support needs
// (Ottawa Decision Support Framework informed)
const JORDAN_SECTIONS = [
  {
    title: "What matters to you",
    items: [
      { id: "priorities", label: "What matters most to me", description: "The things you care about most in this decision." },
      { id: "life-fit", label: "How this fits my life", description: "Family, work, and daily routine considerations." },
    ],
  },
  {
    title: "Working through it",
    items: [
      { id: "worries", label: "Worries I haven't said out loud", description: "Concerns or fears about joining — no judgment here." },
      { id: "weighing", label: "Decisions I'm still weighing", description: "Pros and cons you haven't settled yet." },
      { id: "questions", label: "Questions for my doctor", description: "Help getting ready for that conversation." },
    ],
  },
];

function ToggleRow({ item, checked, onToggle, accent }) {
  return (
    <button
      type="button"
      className={`gs-row gs-row-${accent}${checked ? " gs-row-checked" : ""}`}
      onClick={() => onToggle(item.id)}
      aria-pressed={checked}
    >
      <div className="gs-row-text">
        <span className="gs-row-label">{item.label}</span>
        <span className="gs-row-description">{item.description}</span>
      </div>

      <span className={`gs-switch${checked ? " gs-switch-on" : ""}`}>
        <span className="gs-switch-knob">
          {checked && <FontAwesomeIcon icon={faCheck} />}
        </span>
      </span>
    </button>
  );
}

export default function GoalSetting({ onComplete }) {
  const [started, setStarted] = useState(false);
  const [selectedGoals, setSelectedGoals] = useState([]);
  const [customGoals, setCustomGoals] = useState([]); // [{ id, label }]
  const [customInput, setCustomInput] = useState("");
  const [showDiv, setShowDiv] = useState(false);
  const [introFinished, setIntroFinished] = useState(false);
  const companionRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!started) return;
    (async () => {
      try {
        const introText = "Hi I'm Jordan!"
        await initCompanionCharacter(companionRef.current);
        // await speakWithLipsync(introText, "companion")
        playGesture("lookright")
        setShowDiv(true);
        setIntroFinished(true);
      } catch (error) {
        console.error("Init failed:", error);
      }
    })();
  }, [started]);

 function toggleGoal(id) {
    setSelectedGoals(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
    playGesture("thumbsupQuick")
    setTimeout(() => {
      playGesture("lookright");
    }, 3000);
  }

  function handleAddCustomGoal(e) {
    e.preventDefault();
    const trimmed = customInput.trim();
    if (!trimmed) return;
    setCustomGoals(prev => [...prev, { id: `custom-${Date.now()}`, label: trimmed }]);
    setCustomInput("");
  }

  function handleRemoveCustomGoal(id) {
    setCustomGoals(prev => prev.filter(g => g.id !== id));
  }

  const totalSelected = selectedGoals.length + customGoals.length;

  function handleContinue() {
    if (totalSelected === 0) return;

    navigate("/main-interaction", {
      state: {
        selectedGoals,
        customGoals: customGoals.map(g => g.label),
      },
    });
  }

  return (
    <div className="gs-root">

      {/* ── Start overlay ── */}
      {!started && (
        <div className="start-overlay">
          <img src={logo} className="logo" alt="Study logo" />
          <div className="information">Let's set up what you'd like to talk about today.</div>
          <button className="cssbuttons-io-button" onClick={() => setStarted(true)}>
            Begin
            <span className="icon">
              <FontAwesomeIcon icon={faArrowRight} size="xs" />
            </span>
          </button>
        </div>
      )}

      <div className="gs-page">
        <header className="gs-header">
          <div className="gs-header-avatars">
            <div className={introFinished ? "gs-avatar gs-avatar-jordan small" : "gs-avatar gs-avatar-jordan large"}>
              <div className="virtual-companion" id="virtualcompanion" ref={companionRef} />
            </div>
          </div>
          <h1 className="gs-title">Jordan</h1>
          <span className="gs-eyebrow">Virtual Companion</span>
          {/* <p className="gs-subtitle">
            Dr. Alex can walk you through the facts. Jordan can help you think through
            what matters to you. Pick as many or as few as you'd like — you can always
            come back to the rest later.
          </p> */}
          {introFinished &&
            <div className="continue-area">
              <span className="gs-footer-count">
                {totalSelected === 0
                  ? "Select at least one topic to continue"
                  : `${totalSelected} topic${totalSelected > 1 ? "s" : ""} selected`}
              </span>
              <button
                type="button"
                className="cssbuttons-io-button gs-continue-button"
                disabled={totalSelected === 0}
                onClick={handleContinue}
              >
                Continue
                <span className="icon">
                  <FontAwesomeIcon icon={faArrowRight} size="xs" />
                </span>
              </button>
            </div>
          }
        </header>

        {showDiv && (
          <div className="gs-columns fade-in-up">
            <section className="gs-column gs-column-alex">
              <div className="gs-column-header">
                <span className="gs-column-icon gs-column-icon-alex">
                  <FontAwesomeIcon icon={faFilePen} />
                </span>
                <div>
                  <h2 className="gs-column-title">Let's write down your information needs</h2>
                </div>
              </div>
              {ALEX_SECTIONS.map(section => (
                <div className="gs-subsection" key={section.title}>
                  <h3 className="gs-subsection-title">{section.title}</h3>
                  <div className="gs-row-list">
                    {section.items.map(item => (
                      <ToggleRow
                        key={item.id}
                        item={item}
                        accent="alex"
                        checked={selectedGoals.includes(item.id)}
                        onToggle={toggleGoal}
                      />
                    ))}
                  </div>
                </div>
              ))}
              
              <div className="gs-subsection">
                <h3 className="gs-subsection-title">Custom topics</h3>
                <form className="gs-custom-form" onSubmit={handleAddCustomGoal}>
                  <input
                    type="text"
                    className="gs-custom-input"
                    placeholder="Enter any custom topics in your own words here."
                    value={customInput}
                    onChange={e => setCustomInput(e.target.value)}
                    maxLength={120}
                  />
                  <button type="submit" className="gs-custom-add-btn" disabled={!customInput.trim()}>
                    <FontAwesomeIcon icon={faPlus} size="xs" />
                    Add
                  </button>
                </form>
                {customGoals.length > 0 && (
                  <ul className="gs-custom-chip-list">
                    {customGoals.map(goal => (
                      <li className="gs-custom-chip" key={goal.id}>
                        <span>{goal.label}</span>
                        <button
                          type="button"
                          className="gs-custom-chip-remove"
                          onClick={() => handleRemoveCustomGoal(goal.id)}
                          aria-label={`Remove "${goal.label}"`}
                        >
                          <FontAwesomeIcon icon={faXmark} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            <section className="gs-column gs-column-jordan">
              <div className="gs-column-header">
                <span className="gs-column-icon gs-column-icon-jordan">
                  <FontAwesomeIcon icon={faHandHoldingHeart} />
                </span>
                <div>
                  <span className="gs-column-tag gs-column-tag-jordan">With Jordan</span>
                  <h2 className="gs-column-title">Things to think through</h2>
                </div>
              </div>
              {JORDAN_SECTIONS.map(section => (
                <div className="gs-subsection" key={section.title}>
                  <h3 className="gs-subsection-title">{section.title}</h3>
                  <div className="gs-row-list">
                    {section.items.map(item => (
                      <ToggleRow
                        key={item.id}
                        item={item}
                        accent="jordan"
                        checked={selectedGoals.includes(item.id)}
                        onToggle={toggleGoal}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}