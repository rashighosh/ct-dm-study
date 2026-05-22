import { useState, useRef } from "react";
import logo from '../assets/logo-transparent.png'
import '../css/TrialLayout.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowRight, faPaperPlane, faCheck, faCommentDots, faXmark } from '@fortawesome/free-solid-svg-icons'
import { initDoctorCharacter, initCompanionCharacter, speakWithLipsync } from '../character.js';

function waitMs(duration) {
  return new Promise(resolve => setTimeout(resolve, duration));
}

export default function TrialLayout() {
  const [input, setInput] = useState("");
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState([]);
  const [activeBubble, setActiveBubble] = useState(null); // { from, text }
  const [showHistory, setShowHistory] = useState(false);
  const [sentToast, setSentToast] = useState(null);
  const sentToastTimer = useRef(null);
  const doctorRef = useRef(null);
  const companionRef = useRef(null);

  // Show a bubble, add to history, wait, clear bubble. Returns Promise.
  async function showMessage(from, text, duration = 6000) {
    setMessages(prev => [...prev, { from, text }]);
    setActiveBubble({ from, text });
    await waitMs(duration);
    setActiveBubble(null);
  }

  async function handleBegin() {
    setStarted(true)
    try {
      await initDoctorCharacter(doctorRef.current);
      await initCompanionCharacter(companionRef.current);
      await speakWithLipsync("Hi, I'm Doctor Alex!", 'doctor', 'wave', () => {
       console.log("DONE LIP SYNC")
      });
            // Alex intro
      await showMessage(
        "alex",
        "Hi! I'm Dr. Alex. I'll walk you through this clinical trial step by step. Feel free to ask me anything as we go.",
        7000
      );
 
      // Jordan follows
      await showMessage(
        "jordan",
        "And I'm Jordan — I'm here to help you think through what matters most to you. There are no right or wrong answers!",
        7000
      );
    } catch (error) {
      console.error("Init failed:", error);
    }
  }

    const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setMessages(prev => [...prev, { from: "user", text: trimmed }]);
    setInput("");
    // Show sent toast briefly above the input bar
    if (sentToastTimer.current) clearTimeout(sentToastTimer.current);
    setSentToast(trimmed);
    sentToastTimer.current = setTimeout(() => setSentToast(null), 2800);
    // TODO: pass trimmed to your backend / speakWithLipsync response chain here
  };
 
  const handleKey = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };
 
  const alexBubbleActive   = activeBubble?.from === "alex";
  const jordanBubbleActive = activeBubble?.from === "jordan";

  return (
    <div className="tl-root">

      {/* ── Start overlay ── */}
      {!started && (
        <div className="start-overlay">
          <img src={logo} className="logo" alt="Study logo" />
          <div className="information">Please click the button below to begin.</div>
        <button className="cssbuttons-io-button" onClick={handleBegin}>
          Begin
          <span className="icon">
            <FontAwesomeIcon icon={faArrowRight} size="xs" />
          </span>
        </button>
      </div>
      )}

      {/* ── Chat history modal ── */}
      {showHistory && (
        <div className="history-overlay" onClick={() => setShowHistory(false)}>
          <div className="history-modal" onClick={e => e.stopPropagation()}>
            <div className="history-modal-header">
              <span>Conversation history</span>
              <button className="history-close-btn" onClick={() => setShowHistory(false)}>
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>
            <div className="history-modal-body">
              {messages.length === 0 && (
                <div className="history-empty">No messages yet.</div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`history-msg history-msg-${msg.from}`}>
                  <span className="history-msg-sender">
                    {msg.from === "alex" ? "Dr. Alex" : msg.from === "jordan" ? "Jordan" : "You"}
                  </span>
                  <div className="history-msg-bubble">{msg.text}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="tl-main">
        {/* Doctor VH */}
        <div className="tl-vh-slot tl-vh-left">
          <div className="tl-vh-circle tl-vh-alex">
            <div className="virtual-doctor" id="virtualdoctor" ref={doctorRef} />
          </div>
          <div className="tl-vh-title-area">
            <div className="tl-vh-label">Dr. Alex</div>
            <div className="tl-vh-role">Clinical Trials Expert</div>
          </div>
          <div className={`speech-bubble speech-bubble-alex${alexBubbleActive ? " speech-bubble-visible" : ""}`}>
            {activeBubble?.from === "alex" ? activeBubble.text : ""}
          </div>
        </div>

        {/* Center: trial card */}
        <div className="tl-card-slot">
          <div className="tl-card-header">
            <span className="tl-card-tag">trial overview</span>
            <span className="tl-card-title">NCT Example Trial</span>
          </div>
          <div className="tl-card-body">
            <div className="tl-trial-section tl-section-visible">
              <div className="tl-section-label">eligibility</div>
              <div className="tl-section-content">
                Adults 18–65 with stage II–III diagnosis. No prior immunotherapy. ECOG performance status 0–1.
              </div>
            </div>
            <div className="tl-trial-section tl-section-visible">
              <div className="tl-section-label">treatment</div>
              <div className="tl-section-content">
                Experimental arm: combination immunotherapy every 3 weeks for 6 cycles. Standard arm: current standard of care.
              </div>
            </div>
            <div className="tl-trial-section tl-section-pending">
              <div className="tl-section-label">side effects</div>
              <div className="tl-section-content tl-pending-text">Dr. Alex will cover this next...</div>
            </div>
            <div className="tl-trial-section tl-section-pending">
              <div className="tl-section-label">logistics</div>
              <div className="tl-section-content tl-pending-text">Coming up...</div>
            </div>
          </div>
        </div>

        {/* Companion VH */}
        <div className="tl-vh-slot tl-vh-right">
          <div className="tl-vh-circle tl-vh-jordan">
            <div className="virtual-companion" id="virtualcompanion" ref={companionRef} />
          </div>
          <div className="tl-vh-title-area">
            <div className="tl-vh-label">Jordan</div>
            <div className="tl-vh-role">Patient Navigator</div>
          </div> 
          <div className={`speech-bubble speech-bubble-jordan${jordanBubbleActive ? " speech-bubble-visible" : ""}`}>
            {activeBubble?.from === "jordan" ? activeBubble.text : ""}
          </div>
        </div>
        {/* ── Sent toast — pops up above input, fades out ── */}
        <div className={`sent-toast${sentToast ? " sent-toast-visible" : ""}`}>
          <span className="sent-toast-text">{sentToast}</span>
        </div>
      </div>

      {/* ── User input area ── */}
      <div className="tl-chat-area">
        
        <form className="chat-input-row" onSubmit={(e) => { e.preventDefault(); handleSend(); }}>
          <textarea
            rows="3"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Share your thoughts…"
          />
          <button type="submit" className="send-button">
            <div className="svg-wrapper-1">
              <div className="svg-wrapper">
                <FontAwesomeIcon icon={faPaperPlane} />
              </div>
            </div>
            <span>Send</span>
          </button>
        </form>
        <span className="send-btn-subtext">Press Enter to send · Shift+Enter for new line</span>
      </div>
      <button className="history-btn" onClick={() => setShowHistory(true)}>
        <FontAwesomeIcon icon={faCommentDots} size="sm" />
        Chat history
      </button>
    </div>
  );
}
