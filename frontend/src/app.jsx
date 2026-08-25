import React, { useState, useRef } from "react";
import axios from "axios";
import { Terminal, ArrowRight, Sparkles, Bot, Code2, ShieldCheck, UploadCloud, Play } from "lucide-react";

const API_URL = "http://127.0.0.1:8000/api";

function SpotlightCard({ children, className = "" }) {
  const divRef = useRef(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e) => {
    if (!divRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      className={`relative overflow-hidden rounded-2xl border border-white/10 bg-[#10111a]/80 backdrop-blur-xl p-8 shadow-2xl transition duration-300 ${className}`}
    >
      <div
        className="pointer-events-none absolute -inset-px transition duration-300"
        style={{
          opacity,
          background: `radial-gradient(600px circle at ${pos.x}px ${pos.y}px, rgba(99, 102, 241, 0.18), transparent 40%)`,
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export default function App() {
  const [stage, setStage] = useState("setup");
  const [loading, setLoading] = useState(false);

  const [candidate, setCandidate] = useState({
    name: "",
    target_role: "",
    company_style: "FAANG / Tier 1 Tech (Deep fundamentals & edge cases)",
    round_type: "Technical & Live Coding",
    experience: "Fresher / Entry-Level",
    resume_text: ""
  });

  const [transcript, setTranscript] = useState([]);
  const [turn, setTurn] = useState(1);
  const [userResponse, setUserResponse] = useState("");
  const [codeAnswer, setCodeAnswer] = useState("# Write your Python solution here\ndef solution():\n    pass");
  const [codeOutput, setCodeOutput] = useState("");
  const [scorecard, setScorecard] = useState(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      setLoading(true);
      const res = await axios.post(`${API_URL}/resume/parse`, formData);
      setCandidate({ ...candidate, resume_text: res.data.text });
    } catch {
      alert("Failed to parse PDF resume.");
    } finally {
      setLoading(false);
    }
  };

  const startInterview = async () => {
    if (!candidate.name || !candidate.target_role) {
      alert("Please enter both Candidate Name and Target Role.");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/interview/start`, candidate);
      const firstQ = res.data.question;
      setTranscript([{ role: "interviewer", content: firstQ }]);
      speakText(firstQ);
      setStage("interview");
    } catch {
      alert("Error starting interview. Ensure FastAPI server is running on port 8000!");
    } finally {
      setLoading(false);
    }
  };

  const speakText = (text) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const clean = text.replace(/[*#]/g, "");
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const submitTurn = async (ans) => {
    if (!ans.trim()) return;
    const updated = [...transcript, { role: "candidate", content: ans }];
    setTranscript(updated);
    setUserResponse("");
    setCodeOutput("");

    if (turn < 4) {
      setLoading(true);
      try {
        const res = await axios.post(`${API_URL}/interview/next`, {
          candidate_name: candidate.name,
          target_role: candidate.target_role,
          company_style: candidate.company_style,
          round_type: candidate.round_type,
          experience: candidate.experience,
          resume_text: candidate.resume_text,
          transcript: updated
        });
        const nextQ = res.data.question;
        setTranscript([...updated, { role: "interviewer", content: nextQ }]);
        speakText(nextQ);
        setTurn(turn + 1);
      } catch {
        alert("Error fetching next question.");
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(true);
      try {
        const res = await axios.post(`${API_URL}/interview/evaluate`, {
          candidate_name: candidate.name,
          target_role: candidate.target_role,
          company_style: candidate.company_style,
          round_type: candidate.round_type,
          experience: candidate.experience,
          transcript: updated
        });
        setScorecard(res.data);
        setStage("scorecard");
      } catch {
        alert("Error generating scorecard.");
      } finally {
        setLoading(false);
      }
    }
  };

  const runCode = async () => {
    try {
      const res = await axios.post(`${API_URL}/code/run`, { code: codeAnswer });
      setCodeOutput(res.data.output);
    } catch {
      setCodeOutput("Execution failed.");
    }
  };

  return (
    <div className="min-h-screen bg-[#08080f] text-slate-100 selection:bg-indigo-500 selection:text-white pb-20">
      {/* Glow Backdrop */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-175 h-87.5 bg-indigo-600/15 blur-[120px] rounded-full" />
      </div>

      {/* Header */}
      <header className="relative max-w-6xl mx-auto px-6 py-8 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-linear-to-tr from-indigo-600 to-violet-500 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/30">
            HM
          </div>
          <div>
            <h1 className="text-xl font-extrabold bg-linear-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              HireMind AI
            </h1>
            <p className="text-xs text-slate-400">Autonomous Interview Studio</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
          <span>Powered by Gemini 2.5</span>
        </div>
      </header>

      {/* STAGE 1: SETUP */}
      {stage === "setup" && (
        <main className="relative max-w-3xl mx-auto px-6 mt-12">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-extrabold tracking-tight text-white mb-3">Configure Your Interview</h2>
            <p className="text-slate-400 text-sm max-w-md mx-auto">
              Simulate high-pressure technical, behavioral, and system design interviews tailored to your exact profile.
            </p>
          </div>

          <SpotlightCard>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2">Candidate Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Teena Goswami"
                    value={candidate.name}
                    onChange={(e) => setCandidate({ ...candidate, name: e.target.value })}
                    className="w-full bg-[#161726] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2">Target Role</label>
                  <input
                    type="text"
                    placeholder="e.g. ML Engineer / Full Stack"
                    value={candidate.target_role}
                    onChange={(e) => setCandidate({ ...candidate, target_role: e.target.value })}
                    className="w-full bg-[#161726] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2">Company Persona</label>
                  <select
                    value={candidate.company_style}
                    onChange={(e) => setCandidate({ ...candidate, company_style: e.target.value })}
                    className="w-full bg-[#161726] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  >
                    <option>FAANG / Tier 1 Tech (Deep fundamentals & edge cases)</option>
                    <option>Fast-Paced Startup (Rapid execution & product sense)</option>
                    <option>Enterprise / Fintech (Scalability & clean code)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2">Interview Track</label>
                  <select
                    value={candidate.round_type}
                    onChange={(e) => setCandidate({ ...candidate, round_type: e.target.value })}
                    className="w-full bg-[#161726] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  >
                    <option>Technical & Live Coding</option>
                    <option>System Design & Scalability</option>
                    <option>HR & Behavioral (STAR Technique)</option>
                  </select>
                </div>
              </div>

              {/* Resume Ingestion Area */}
              <div className="p-5 rounded-xl border border-dashed border-white/15 bg-white/2 hover:bg-white/4 transition">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2 mb-2">
                  <UploadCloud className="w-4 h-4 text-indigo-400" /> Resume Context (Optional PDF)
                </label>
                <input type="file" accept=".pdf" onChange={handleFileUpload} className="text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600/20 file:text-indigo-300 hover:file:bg-indigo-600/30 cursor-pointer" />
                {candidate.resume_text && <p className="text-xs text-emerald-400 mt-2 font-medium">✓ Resume parsed successfully</p>}
              </div>

              <button
                onClick={startInterview}
                disabled={loading}
                className="w-full bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 font-semibold py-4 rounded-xl transition duration-200 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 cursor-pointer disabled:opacity-50"
              >
                {loading ? "Preparing Interview Room..." : "Launch Live Studio"} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </SpotlightCard>
        </main>
      )}

      {/* STAGE 2: INTERVIEW STUDIO */}
      {stage === "interview" && (
        <main className="relative max-w-6xl mx-auto px-6 mt-8">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-slate-300">{candidate.name}</span>
              <span className="text-slate-600">•</span>
              <span className="text-xs px-2.5 py-1 rounded-md bg-white/5 text-slate-400">{candidate.target_role}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 font-medium">Turn {turn} of 4</span>
              <span className="px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold animate-pulse">● LIVE CALL</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SpotlightCard>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Bot className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-slate-200">AI Lead Interviewer</h3>
              </div>
              <div className="p-5 rounded-xl bg-black/40 border border-white/5 min-h-40 flex items-center">
                <p className="text-slate-100 text-base leading-relaxed font-medium">
                  "{transcript[transcript.length - 1]?.content}"
                </p>
              </div>
            </SpotlightCard>

            <SpotlightCard>
              <h3 className="font-semibold text-slate-200 mb-4">Candidate Answer Console</h3>
              <textarea
                rows={5}
                value={userResponse}
                onChange={(e) => setUserResponse(e.target.value)}
                placeholder="Explain your approach, design, or technical solution..."
                className="w-full bg-[#161726] border border-white/10 rounded-xl p-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 mb-4 resize-none"
              />
              <button
                onClick={() => submitTurn(userResponse)}
                disabled={loading || !userResponse.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-500 py-3.5 rounded-xl font-semibold text-sm transition shadow-lg shadow-indigo-600/25 cursor-pointer disabled:opacity-50"
              >
                {loading ? "Analyzing Answer..." : "Submit Response"}
              </button>
            </SpotlightCard>
          </div>

          {/* Python Code Sandbox */}
          {candidate.round_type.includes("Coding") && (
            <div className="mt-6">
              <SpotlightCard>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-bold flex items-center gap-2 text-indigo-300">
                    <Code2 className="w-4 h-4" /> Live Code Sandbox (Python)
                  </span>
                  <button
                    onClick={runCode}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg border border-white/10 text-slate-200 transition cursor-pointer"
                  >
                    <Play className="w-3 h-3 text-emerald-400" /> Run Code
                  </button>
                </div>
                <textarea
                  rows={8}
                  value={codeAnswer}
                  onChange={(e) => setCodeAnswer(e.target.value)}
                  className="w-full bg-[#0c0d14] font-mono text-xs border border-white/10 rounded-xl p-4 text-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 leading-relaxed"
                />
                {codeOutput && (
                  <div className="mt-3 p-4 bg-black/70 rounded-xl border border-white/5 font-mono text-xs text-slate-300">
                    <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 font-sans font-bold">Terminal Output</div>
                    {codeOutput}
                  </div>
                )}
                <button
                  onClick={() => submitTurn(`[Submitted Code Solution]:\n\`\`\`python\n${codeAnswer}\n\`\`\``)}
                  className="mt-4 w-full bg-emerald-600 hover:bg-emerald-500 py-3 rounded-xl font-semibold text-xs transition cursor-pointer shadow-lg shadow-emerald-600/20"
                >
                  Submit Code Solution
                </button>
              </SpotlightCard>
            </div>
          )}
        </main>
      )}

      {/* STAGE 3: SCORECARD */}
      {stage === "scorecard" && scorecard && (
        <main className="relative max-w-4xl mx-auto px-6 mt-10">
          <SpotlightCard>
            <div className="text-center pb-8 border-b border-white/10">
              <div className="inline-flex p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-3">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h2 className="text-3xl font-extrabold text-white mb-1">Interview Assessment</h2>
              <p className="text-sm text-slate-400">{candidate.name} • {candidate.target_role}</p>
              <div className="mt-4 inline-block px-5 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-bold text-sm tracking-wide">
                Hiring Verdict: {scorecard.verdict}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 my-8">
              {scorecard.scores && Object.entries(scorecard.scores).map(([k, val]) => (
                <div key={k} className="bg-black/30 p-4 rounded-xl border border-white/5 text-center">
                  <div className="text-2xl font-black text-indigo-400">{val}</div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 mt-1 font-semibold">{k.replace("_", " ")}</div>
                </div>
              ))}
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="font-semibold text-emerald-400 text-sm mb-3">Demonstrated Strengths</h4>
                <div className="space-y-2">
                  {scorecard.strengths?.map((str, i) => (
                    <div key={i} className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-sm text-slate-200">
                      ✓ {str}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-amber-400 text-sm mb-3">Areas for Growth</h4>
                <div className="space-y-2">
                  {scorecard.improvements?.map((imp, i) => (
                    <div key={i} className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/10 text-sm text-slate-200">
                      • {imp}
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-5 rounded-xl bg-white/2 border border-white/5 text-sm text-slate-300 leading-relaxed">
                <span className="font-bold text-white block mb-1">Committee Summary:</span>
                {scorecard.feedback_summary}
              </div>
            </div>

            <button
              onClick={() => { setStage("setup"); setTranscript([]); setTurn(1); }}
              className="mt-8 w-full bg-indigo-600 hover:bg-indigo-500 font-semibold py-4 rounded-xl transition cursor-pointer shadow-lg shadow-indigo-600/25"
            >
              Start New Interview Session
            </button>
          </SpotlightCard>
        </main>
      )}
    </div>
  );
}