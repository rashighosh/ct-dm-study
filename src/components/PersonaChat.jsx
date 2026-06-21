import { useState, useRef, useEffect } from "react";
import "../css/PersonaChat.css";

const API = "http://localhost:8000";

const initials = (n) =>
  n ? n.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() : "?";

const TypingIndicator = () => (
  <div className="typingWrap">
    <div className="typingDot" style={{ animationDelay: "0s" }} />
    <div className="typingDot" style={{ animationDelay: "0.2s" }} />
    <div className="typingDot" style={{ animationDelay: "0.4s" }} />
  </div>
);

export default function PersonaChat() {
  const [userId, setUserId] = useState("");
  const [personas, setPersonas] = useState(null);
  const [loadingPersonas, setLoadingPersonas] = useState(false);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [error, setError] = useState(null);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatLoading]);

  const generatePersonas = async () => {
    if (!userId.trim()) return;
    setLoadingPersonas(true);
    setError(null);
    setPersonas(null);
    setMessages([]);

    try {
      const res = await fetch(`${API}/personas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userId.trim() }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      console.log("PERSONAS", data.reply)
      setPersonas(data.reply);
    } catch (e) {
      setError(e.message || "Failed to generate personas.");
    } finally {
      setLoadingPersonas(false);
    }
  };

  const sendMessage = async () => {
    const msg = chatInput.trim();
    if (!msg || chatLoading) return;

    setChatInput("");
    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    setChatLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API}/chat-with-personas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thread_id: userId, message: msg }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setMessages((prev) => [
        ...prev,
        { role: "personas", reply1: data.reply1, reply2: data.reply2 },
      ]);
    } catch (e) {
      setError(e.message || "Chat request failed.");
    } finally {
      setChatLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const p1 = personas?.[0];
  const p2 = personas?.[1];

  return (
    <div className="app">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;1,400&family=DM+Sans:wght@300;400;500&display=swap');
      `}</style>

      <div>
        <h1 className="h1">Persona Chat</h1>
        <p className="subtitle">AI-generated personas · live conversation interface</p>
      </div>

      <div className="stepCard">
        <div className="inputRow">
          <input
            className="idInput"
            placeholder="e.g. user042"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && generatePersonas()}
            disabled={loadingPersonas}
          />
          <button
            className="btnPrimary"
            disabled={loadingPersonas || !userId.trim()}
            onClick={generatePersonas}
          >
            {loadingPersonas ? <span className="spinner" /> : null}
            {loadingPersonas ? "Generating..." : "Generate Personas"}
          </button>
        </div>
        {error ? <div className="error">{error}</div> : null}
      </div>


      {personas ? ( 
        <div>
          <p className="subtitle">Meet Your</p>
          <h1 className="h1">Conversation Partners</h1>
        </div>
      ) : null }
      
      {personas ? (
        <div className="personasGrid">
          {personas.map((p, i) => {
            const isP1 = i === 0;
            return (
              <div key={i} className={`personaCard ${isP1 ? "p1" : "p2"}`}>
                <div className="personaHeader">
                  <div className={`avatar ${isP1 ? "p1" : "p2"}`}>
                    {initials(p.name_and_surname)}
                  </div>
                  <div>
                    <div className="personaName">{p.name_and_surname}</div>
                    <div className="personaMeta">
                      {p.country} · {p.career_level_and_discipline}
                    </div>
                  </div>
                </div>

                <div className="quote">{p.goal_quote}</div>
                <div className="narrative">{p.narrative_background}</div>

                <div className="tagRow">
                  {p.personality_traits?.map((t, ti) => (
                    <span key={ti} className={`tag ${isP1 ? "p1" : "p2"}`}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {personas ? (
        <div className="stepCard">
          <div>
            <h1 className="h1">Chat Space</h1>
            <p className="subtitle">You are chatting with: {personas[0].name_and_surname} & {personas[1].name_and_surname}</p>
          </div>
          <div className="messagesArea">
            {messages.length === 0 && !chatLoading ? (
              <div className="emptyChat">
                Ask {p1?.nameandsurname?.split(" ")[0]} or {p2?.nameandsurname?.split(" ")[0]} anything.
                <br />
                Try asking about their experience with clinical trials.
              </div>
            ) : null}

            {messages.map((msg, i) => {
              if (msg.role === "user") {
                return (
                  <div key={i} className="userRow">
                    <div className="userBubble">{msg.content}</div>
                  </div>
                );
              }

              return (
                <div key={i} className="personaReplyGroup">
                  {[p1, msg.reply1, true].map(() => null)}
                  {[
                    { p: p1, reply: msg.reply1, isP1: true },
                    { p: p2, reply: msg.reply2, isP1: false },
                  ].map((item, idx) => (
                    <div key={idx} className="personaReplyRow">
                      <div className={`miniAvatar ${item.isP1 ? "p1" : "p2"}`}>
                        {initials(item.p?.name_and_surname)}
                      </div>
                      <div className="replyStack">
                        <div className="replyName">{item.p?.name_and_surname?.split(" ")[0]}</div>
                        <div className={`personaBubble ${item.isP1 ? "p1" : "p2"}`}>
                          {item.reply?.response}
                        </div>
                        <div className="wordCount">{item.reply?.wordCount} words</div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}

            {chatLoading ? (
              <div className="personaReplyRow">
                <div className="miniAvatar p1">{initials(p1?.nameandsurname)}</div>
                <TypingIndicator />
              </div>
            ) : null}

            <div ref={endRef} />
          </div>

          <div className="inputRow">
            <textarea
              className="chatInput"
              placeholder="Type a message and press Enter"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={chatLoading}
            />
            <button
              className="btnPrimary"
              disabled={chatLoading || !chatInput.trim()}
              onClick={sendMessage}
            >
              {chatLoading ? "Sending..." : "Send"}
            </button>
            <button className="btnGhost" onClick={() => setMessages([])}>
              Clear
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}