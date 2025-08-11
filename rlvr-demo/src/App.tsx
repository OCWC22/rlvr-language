import React, { useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import "./App.css";

interface Candidate {
  id: string;
  tgt: string;
  R: number;
  breakdown: Record<string, number>;
}

interface TranslationResult {
  id: string;
  best: { tgt: string };
  candidates: Candidate[];
  prompt: string;
  weights: Record<string, number>;
}

interface ApiResponse {
  results: TranslationResult[];
}

interface LogEntry {
  id: number;
  timestamp: string;
  type: "info" | "process" | "candidate" | "score" | "winner" | "bandit";
  message: string;
  data?: any;
}

const App: React.FC = () => {
  const [inputText, setInputText] = useState("");
  const [sourceLanguage, setSourceLanguage] = useState<"en" | "haw">("en");
  const [targetLanguage, setTargetLanguage] = useState<"haw" | "en">("haw");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showLogs, setShowLogs] = useState(false);

  const addLog = (type: LogEntry["type"], message: string, data?: any) => {
    const newLog: LogEntry = {
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      type,
      message,
      data,
    };
    setLogs((prev) => [...prev, newLog]);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const simulateRLVRProcess = async () => {
    clearLogs();

    addLog("info", "🔄 Initializing RLVR framework...");
    await new Promise((resolve) => setTimeout(resolve, 300));

    addLog("bandit", "🎯 Bandit selecting optimal prompt...");
    await new Promise((resolve) => setTimeout(resolve, 400));
    addLog(
      "bandit",
      '✅ Selected: "Translate with proper diacritics" (confidence: 85%)'
    );

    addLog("process", "🤖 Generating AI candidates...");
    await new Promise((resolve) => setTimeout(resolve, 500));

    const mockCandidates = [
      "Mai hele ʻoe i laila.",
      "Mai hele oe i laila.",
      "ʻAʻole e hele ʻoe i laila.",
      "Mai hele ʻoe i kēlā wahi.",
    ];

    for (let i = 0; i < mockCandidates.length; i++) {
      addLog(
        "candidate",
        `├─ Candidate ${i + 1}: "${mockCandidates[i]}" (GPT-3.5, temp=${(
          0.7 +
          i * 0.05
        ).toFixed(2)})`
      );
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    addLog("score", "📊 Scoring candidates with Hawaiian language rules...");
    await new Promise((resolve) => setTimeout(resolve, 400));

    addLog("score", "├─ Diacritics: [0.95, 0.0, 0.95, 0.88] ʻokina check");
    await new Promise((resolve) => setTimeout(resolve, 200));
    addLog(
      "score",
      "├─ TAM Particles: [0.92, 0.92, 0.25, 0.92] negation patterns"
    );
    await new Promise((resolve) => setTimeout(resolve, 200));
    addLog("score", "└─ Articles: [0.75, 0.75, 0.75, 0.65] ke/ka KEAO rule");
    await new Promise((resolve) => setTimeout(resolve, 300));

    addLog("winner", '🏆 Winner: "Mai hele ʻoe i laila." (Score: 0.87)');
    await new Promise((resolve) => setTimeout(resolve, 300));

    addLog("bandit", "📈 Bandit learning: Updated prompt confidence to 87%");
  };

  const getMockTranslation = (
    text: string,
    src: "en" | "haw",
    tgt: "haw" | "en"
  ): TranslationResult => {
    if (src === "en" && tgt === "haw") {
      const mockCandidates: Candidate[] = [
        {
          id: "c0",
          tgt: "Mai hele ʻoe i laila.",
          R: 0.87,
          breakdown: {
            diacritics: 0.95, // Almost perfect, but strict checking
            tam_particles: 0.92, // Good structure, minor context issues
            articles_ke_ka: 0.75, // No articles present, context could be clearer
          },
        },
        {
          id: "c1",
          tgt: "Mai hele oe i laila.",
          R: 0.62,
          breakdown: {
            diacritics: 0.0, // Critical failure: missing ʻokina
            tam_particles: 0.92, // Same good structure
            articles_ke_ka: 0.75, // Same article score
          },
        },
        {
          id: "c2",
          tgt: "ʻAʻole ua hele ʻoe i laila.",
          R: 0.71,
          breakdown: {
            diacritics: 0.95, // Good diacritics
            tam_particles: 0.25, // Major error: ʻAʻole + ua is invalid
            articles_ke_ka: 0.75, // Same as others
          },
        },
        {
          id: "c3",
          tgt: "Mai hele ʻoe i kēlā wahi.",
          R: 0.82,
          breakdown: {
            diacritics: 0.88, // Missing one accent on kēlā
            tam_particles: 0.92, // Good structure
            articles_ke_ka: 0.65, // Word substitution affects article context
          },
        },
      ];

      return {
        id: "1",
        best: { tgt: mockCandidates[0].tgt },
        candidates: mockCandidates,
        prompt: "Translate to Hawaiian with proper diacritics",
        weights: { diacritics: 0.4, tam_particles: 0.4, articles_ke_ka: 0.2 },
      };
    } else {
      // Hawaiian to English - Make English metrics more strict too
      const mockCandidates: Candidate[] = [
        {
          id: "c0",
          tgt: "Do not go there.",
          R: 0.89,
          breakdown: {
            spelling: 0.95, // Minor contextual spelling check
            subject_verb_agreement: 0.88, // Imperative could be clearer
            articles_a_an: 0.85, // Context could use "to a place"
            punctuation: 0.9, // Good but not perfect flow
          },
        },
        {
          id: "c1",
          tgt: "Don't go there.",
          R: 0.78,
          breakdown: {
            spelling: 0.95, // Same quality
            subject_verb_agreement: 0.75, // Contraction affects formality
            articles_a_an: 0.85, // Same issue
            punctuation: 0.6, // Informal style penalty
          },
        },
        {
          id: "c2",
          tgt: "Do not go over there.",
          R: 0.82,
          breakdown: {
            spelling: 0.95, // Good spelling
            subject_verb_agreement: 0.88, // Good grammar
            articles_a_an: 0.7, // Added unnecessary "over"
            punctuation: 0.75, // Verbosity affects flow
          },
        },
        {
          id: "c3",
          tgt: "Dont go there",
          R: 0.65,
          breakdown: {
            spelling: 0.7, // Missing apostrophe
            subject_verb_agreement: 0.75, // Same structure as c1
            articles_a_an: 0.85, // Same as others
            punctuation: 0.3, // Missing period
          },
        },
      ];

      return {
        id: "1",
        best: { tgt: mockCandidates[0].tgt },
        candidates: mockCandidates,
        prompt: "Translate to English with proper grammar",
        weights: {
          spelling: 0.25,
          subject_verb_agreement: 0.25,
          articles_a_an: 0.25,
          punctuation: 0.25,
        },
      };
    }
  };

  const handleLanguageSwap = () => {
    setSourceLanguage(targetLanguage);
    setTargetLanguage(sourceLanguage);
  };

  const simulateTyping = async (
    text: string,
    delay: number = 100
  ): Promise<void> => {
    return new Promise((resolve) => {
      let index = 0;
      const interval = setInterval(() => {
        if (index <= text.length) {
          index++;
        } else {
          clearInterval(interval);
          resolve();
        }
      }, delay);
    });
  };

  const handleTranslate = async () => {
    if (!inputText.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    if (demoMode) {
      // Demo mode with mock data and animated logs
      await simulateRLVRProcess();
      const mockResult = getMockTranslation(
        inputText,
        sourceLanguage,
        targetLanguage
      );
      setResult(mockResult);
      setLoading(false);
      return;
    }

    try {
      addLog("info", "🔄 Connecting to RLVR backend...");

      const response = await axios.post<ApiResponse>(
        "http://localhost:8000/translate",
        {
          segments: [{ id: "1", src: inputText }],
          src: sourceLanguage,
          tgt: targetLanguage,
          mode: "rlvr",
        }
      );

      if (response.data.results && response.data.results.length > 0) {
        const result = response.data.results[0];
        addLog("winner", `🏆 Translation complete: "${result.best.tgt}"`);
        addLog("info", `📊 Generated ${result.candidates.length} candidates`);
        setResult(result);
      }
    } catch (err) {
      console.error("Translation error:", err);
      addLog("info", "❌ Backend connection failed");
      setError(
        "Failed to translate. Enable Demo Mode to try the interface, or make sure the RLVR API server is running on localhost:8000"
      );
    } finally {
      setLoading(false);
    }
  };

  const getMetricExplanation = (metricName: string): string => {
    switch (metricName) {
      case "diacritics":
        return "Checks for proper ʻokina and kahakō usage";
      case "tam_particles":
        return "Validates tense-aspect-mood particles (strict grammar rules)";
      case "articles_ke_ka":
        return "Ensures correct ke/ka article usage and context";
      case "spelling":
        return "Checks for spelling and contextual accuracy";
      case "subject_verb":
      case "subject_verb_agreement":
        return "Validates subject-verb agreement and formality";
      case "articles_a_an":
        return "Checks article usage and sentence conciseness";
      case "punctuation":
        return "Evaluates punctuation and writing style";
      default:
        return "Language quality metric";
    }
  };

  const getLanguageLabel = (lang: "en" | "haw"): string => {
    return lang === "en" ? "English" : "Hawaiian";
  };

  const getExampleSentences = (lang: "en" | "haw"): string[] => {
    if (lang === "en") {
      return [
        "Do not go there.",
        "We already finished the report.",
        "It is not raining.",
        "The book is on the table.",
        "She will come tomorrow.",
      ];
    } else {
      return [
        "Mai hele ʻoe i laila.",
        "Ua pau kēlā hōʻike.",
        "ʻAʻole e ua ana.",
        "Aia ka puke ma ka pākaukau.",
        "E hele mai ʻo ia i ka lā ʻapōpō.",
      ];
    }
  };

  const getLogIcon = (type: LogEntry["type"]) => {
    switch (type) {
      case "info":
        return "ℹ️";
      case "process":
        return "⚙️";
      case "candidate":
        return "🤖";
      case "score":
        return "📊";
      case "winner":
        return "🏆";
      case "bandit":
        return "🧠";
      default:
        return "•";
    }
  };

  const getLogColor = (type: LogEntry["type"]) => {
    switch (type) {
      case "info":
        return "#3b82f6";
      case "process":
        return "#8b5cf6";
      case "candidate":
        return "#10b981";
      case "score":
        return "#f59e0b";
      case "winner":
        return "#ef4444";
      case "bandit":
        return "#ec4899";
      default:
        return "#6b7280";
    }
  };

  return (
    <div className="app">
      <div className="demo-container">
        <header className="header">
          <h1>🌺 RLVR Framework Demo</h1>
          <p className="subtitle">
            AI Translation with Linguistic Intelligence & Verifiable Quality
            Metrics
          </p>
          <div
            style={{
              marginTop: "16px",
              display: "flex",
              gap: "16px",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "14px",
                color: "var(--rlvr-text-secondary)",
              }}
            >
              <input
                type="checkbox"
                checked={demoMode}
                onChange={(e) => setDemoMode(e.target.checked)}
                style={{ accentColor: "var(--rlvr-primary-blue)" }}
              />
              Demo Mode
            </label>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "14px",
                color: "var(--rlvr-text-secondary)",
              }}
            >
              <input
                type="checkbox"
                checked={showLogs}
                onChange={(e) => setShowLogs(e.target.checked)}
                style={{ accentColor: "var(--rlvr-primary-blue)" }}
              />
              Show Process Logs
            </label>
          </div>
        </header>

        <div className="translation-interface">
          <div className="input-section">
            <div className="input-controls">
              <div className="language-selector">
                <span>{getLanguageLabel(sourceLanguage)}</span>
                <button
                  onClick={handleLanguageSwap}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--rlvr-primary-blue)",
                    cursor: "pointer",
                    fontSize: "18px",
                  }}
                >
                  ↔
                </button>
                <span>{getLanguageLabel(targetLanguage)}</span>
              </div>
              <button
                className="translate-btn"
                onClick={handleTranslate}
                disabled={loading || !inputText.trim()}
              >
                {loading ? "Translating..." : "Translate"}
              </button>
            </div>

            <textarea
              className="translate-input"
              placeholder={`Enter ${getLanguageLabel(
                sourceLanguage
              )} text to translate...`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.ctrlKey) {
                  handleTranslate();
                }
              }}
            />

            <div
              style={{
                marginTop: "12px",
                fontSize: "12px",
                color: "var(--rlvr-text-secondary)",
              }}
            >
              Try examples:{" "}
              {getExampleSentences(sourceLanguage).map(
                (sentence: string, index: number) => (
                  <span key={index}>
                    <button
                      onClick={() => setInputText(sentence)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--rlvr-primary-blue)",
                        cursor: "pointer",
                        textDecoration: "underline",
                        fontSize: "12px",
                      }}
                    >
                      "{sentence}"
                    </button>
                    {index < getExampleSentences(sourceLanguage).length - 1 &&
                      " • "}
                  </span>
                )
              )}
            </div>
          </div>

          {/* Process Logs Panel */}
          <AnimatePresence>
            {showLogs && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="logs-panel"
                style={{
                  background: "var(--rlvr-card-bg)",
                  border: "1px solid var(--rlvr-border-glass)",
                  borderRadius: "12px",
                  padding: "16px",
                  maxHeight: "300px",
                  overflowY: "auto",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "12px",
                  }}
                >
                  <h4
                    style={{
                      fontSize: "16px",
                      fontWeight: "600",
                      color: "var(--rlvr-text-primary)",
                    }}
                  >
                    🔍 RLVR Process Log
                  </h4>
                  <button
                    onClick={clearLogs}
                    style={{
                      background: "rgba(255, 255, 255, 0.1)",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      borderRadius: "6px",
                      padding: "4px 8px",
                      color: "var(--rlvr-text-secondary)",
                      fontSize: "12px",
                      cursor: "pointer",
                    }}
                  >
                    Clear
                  </button>
                </div>
                <div
                  style={{
                    fontFamily: "Monaco, Menlo, monospace",
                    fontSize: "12px",
                    lineHeight: "1.5",
                  }}
                >
                  {logs.length === 0 ? (
                    <div
                      style={{
                        color: "var(--rlvr-text-secondary)",
                        fontStyle: "italic",
                      }}
                    >
                      Click "Translate" to see the RLVR process in action...
                    </div>
                  ) : (
                    logs.map((log) => (
                      <motion.div
                        key={log.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        style={{
                          padding: "4px 0",
                          color: getLogColor(log.type),
                          borderLeft:
                            log.message.startsWith("├─") ||
                            log.message.startsWith("└─")
                              ? "2px solid rgba(255,255,255,0.1)"
                              : "none",
                          paddingLeft:
                            log.message.startsWith("├─") ||
                            log.message.startsWith("└─")
                              ? "12px"
                              : "0",
                        }}
                      >
                        <span style={{ marginRight: "8px" }}>
                          {getLogIcon(log.type)}
                        </span>
                        {log.message}
                      </motion.div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                borderRadius: "8px",
                padding: "16px",
                color: "#fca5a5",
              }}
            >
              {error}
            </motion.div>
          )}

          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="loading"
            >
              <div className="loading-spinner"></div>
              <p style={{ marginTop: "16px" }}>
                {demoMode
                  ? `Generating ${
                      result?.candidates?.length || 4
                    } translation candidates...`
                  : `Processing with RLVR framework...`}
              </p>
            </motion.div>
          )}

          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="results-section"
              >
                <div className="best-translation">
                  <h3>
                    🏆 Best Translation
                    <span className="score-badge">
                      {(result.candidates[0]?.R * 100).toFixed(0)}%
                    </span>
                  </h3>
                  <div className="translation-text">{result.best.tgt}</div>
                  {demoMode && (
                    <div
                      style={{
                        marginTop: "12px",
                        fontSize: "12px",
                        color: "var(--rlvr-text-secondary)",
                        fontStyle: "italic",
                      }}
                    >
                      Using prompt: "{result.prompt}"
                    </div>
                  )}
                </div>

                <div className="metrics-panel">
                  <h4>📊 Quality Breakdown</h4>
                  {result.candidates[0] &&
                    Object.entries(result.candidates[0].breakdown).map(
                      ([metric, score]) => (
                        <div key={metric} className="metric-item">
                          <div>
                            <div className="metric-name">
                              {metric.replace("_", " ")}
                            </div>
                            <div className="metric-details">
                              {getMetricExplanation(metric)}
                            </div>
                          </div>
                          <div className="metric-score">
                            {(score * 100).toFixed(0)}%
                          </div>
                        </div>
                      )
                    )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {result?.candidates && result.candidates.length > 1 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: 0.2 }}
                className="candidates-section"
              >
                <h3>
                  🤖 AI Translation Candidates ({result.candidates.length}{" "}
                  generated)
                </h3>
                {result.candidates.map((candidate, index) => (
                  <motion.div
                    key={candidate.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`candidate-item ${index === 0 ? "best" : ""}`}
                  >
                    <div className="candidate-text">{candidate.tgt}</div>
                    <div className="candidate-score">
                      {(candidate.R * 100).toFixed(0)}%
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default App;
