import React, { useState, useEffect } from 'react';
import './app.css';
import {
  BookOpenIcon,
  DownloadIcon,
  LightBulbIcon,
  LinkedInIcon,
  SparklesIcon
} from './components/Icons';

// --- 1. Services ---
interface Task {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

interface PlanResponse {
  plan: string;
  suggestedSprints: number;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const generateStudyPlan = async (bookIndex: string, userGoal: string): Promise<PlanResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/generate-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ index: bookIndex, goal: userGoal }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to generate plan');
    return data;
  } catch (error) {
    console.error("Service Error:", error);
    throw error;
  }
};

const generateRoadmap = async (studyPlan: string, sprints: number): Promise<Task[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/generate-roadmap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studyPlan, sprints }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to generate roadmap');
    return data.tasks || [];
  } catch (error) {
    console.error("Service Error:", error);
    throw error;
  }
};

// Globals Declarations
declare global {
  interface Window {
    marked: { parse: (markdown: string) => string };
    jspdf: { jsPDF: any };
    html2canvas: any;
  }
}

const App: React.FC = () => {
  const [bookIndex, setBookIndex] = useState<string>('');
  const [userGoal, setUserGoal] = useState<string>('');
  const [studyPlan, setStudyPlan] = useState<string>('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sprints, setSprints] = useState<number>(2);
  const [maxSprints, setMaxSprints] = useState<number>(12);
  const [showRoadmapConfig, setShowRoadmapConfig] = useState<boolean>(false);

  const [isGeneratingPlan, setIsGeneratingPlan] = useState<boolean>(false);
  const [isGeneratingRoadmap, setIsGeneratingRoadmap] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [librariesLoaded, setLibrariesLoaded] = useState(false);

  // --- AUTO-LOAD EXTERNAL SCRIPTS ---
  useEffect(() => {
    const loadScript = (src: string, id: string) => {
      return new Promise((resolve, reject) => {
        if (document.getElementById(id)) {
          resolve(true);
          return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.id = id;
        script.onload = () => resolve(true);
        script.onerror = () => reject(false);
        document.body.appendChild(script);
      });
    };

    const loadLibraries = async () => {
      try {
        await Promise.all([
          loadScript('https://cdn.jsdelivr.net/npm/marked/marked.min.js', 'script-marked'),
          loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js', 'script-html2canvas'),
          loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', 'script-jspdf')
        ]);
        setLibrariesLoaded(true);
      } catch (err) {
        console.error("Failed to load external libraries", err);
      }
    };

    loadLibraries();
  }, []);

  const handleGeneratePlan = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!bookIndex.trim() || !userGoal.trim()) {
      setError('Please fill in both the book index and your study goal.');
      return;
    }

    setIsGeneratingPlan(true);
    setStudyPlan('');
    setTasks([]);
    setShowRoadmapConfig(false);
    setError(null);

    try {
      const data = await generateStudyPlan(bookIndex, userGoal);
      setStudyPlan(data.plan);
      if (data.suggestedSprints) {
        setMaxSprints(data.suggestedSprints);
        setSprints(Math.min(data.suggestedSprints, 2)); // Default to 2 or max if lower
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate study plan.');
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleGenerateRoadmap = async () => {
    setIsGeneratingRoadmap(true);
    setError(null);
    try {
      const roadmapTasks = await generateRoadmap(studyPlan, sprints);
      setTasks(roadmapTasks);
      setShowRoadmapConfig(false); // Hide config after generation
    } catch (err: any) {
      setError(err.message || 'Failed to generate roadmap.');
    } finally {
      setIsGeneratingRoadmap(false);
    }
  };

  const toggleTask = (taskId: string) => {
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const handleDownload = () => {
    if (!librariesLoaded) {
      alert("Please wait, PDF tools are still loading...");
      return;
    }

    const planElement = document.getElementById('study-plan-output');
    if (!planElement) return;

    const { jsPDF } = window.jspdf;
    const html2canvas = window.html2canvas;
    const originalPadding = planElement.style.padding;
    planElement.style.padding = '40px';

    html2canvas(planElement, {
      scale: 2,
      useCORS: true,
      backgroundColor: null, // Transparent base, let element style dictate
      onclone: (clonedDoc: Document) => {
        const element = clonedDoc.getElementById('study-plan-output');
        if (element) {
          // Reset container styles for PDF
          element.style.color = '#000000';
          element.style.background = '#FFFFFF';
          element.style.backgroundImage = 'none';
          element.style.boxShadow = 'none';
          element.style.border = '2px solid #000000'; // Keep border but make it simple black
          element.style.animation = 'none';
          element.style.transition = 'none';
        }

        const elements = clonedDoc.querySelectorAll('#study-plan-output *');
        elements.forEach((el) => {
          if (el instanceof HTMLElement) {
            // Remove animations/transitions from all children
            el.style.animation = 'none';
            el.style.transition = 'none';

            // Force text colors to dark
            const computedColor = window.getComputedStyle(el).color;
            // If it's a light color (likely white/grey from dark mode), make it black
            // Simple heuristic: if it's not explicitly dark, make it dark
            el.style.color = '#111827';

            if (/^H[1-6]$/.test(el.tagName)) el.style.color = '#000000';
            if (el.tagName === 'LI') el.style.color = '#374151';

            // Handle Task Items specifically
            if (el.classList.contains('task-item')) {
              el.style.backgroundColor = '#F3F4F6';
              el.style.border = '1px solid #9CA3AF';
              el.style.color = '#000000';
            }
            // Handle Task Title/Desc
            if (el.tagName === 'H4') el.style.color = '#000000';
            if (el.tagName === 'P') el.style.color = '#4B5563';

            // Handle Output Text container
            if (el.classList.contains('output-text')) {
              el.style.background = '#FFFFFF';
              el.style.border = 'none'; // Remove the purple border-left if desired, or keep it
              el.style.borderLeft = '4px solid #000000';
              el.style.color = '#000000';
            }
          }
        });
      }
    }).then((canvas: any) => {
      planElement.style.padding = originalPadding;
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const ratio = canvasWidth / canvasHeight;
      const imgWidth = pdfWidth - 20;
      const imgHeight = imgWidth / ratio;

      let heightLeft = imgHeight;
      let position = 10;

      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= (pdfHeight - 20);

      while (heightLeft > 0) {
        position = position - (pdfHeight - 20);
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= (pdfHeight - 20);
      }
      pdf.save('Index-Intellect-Study-Plan.pdf');
    });
  };

  // Safe Markdown Rendering
  const renderMarkdown = (text: string) => {
    if (window.marked && window.marked.parse) {
      return { __html: window.marked.parse(text) };
    }
    return { __html: `<pre class="output-text">${text}</pre>` };
  };

  return (
    <>
      <div className="app-container">
        <div className="content-wrapper">
          <header className="text-center mb-8">
            <h1 className="app-title">
              <SparklesIcon className="icon" style={{ width: '2.5rem', height: '2.5rem' }} />
              Index Intellect
              <SparklesIcon className="icon" style={{ width: '2.5rem', height: '2.5rem' }} />
            </h1>
            <p className="app-subtitle">
              Transform a book's index into a personalized, actionable study plan tailored to your goals.
            </p>

            <div className="powered-badge">
              <span className="badge-content">
                Powered by <strong>Gemini</strong> <SparklesIcon style={{ width: '1rem', height: '1rem' }} />
              </span>
            </div>
          </header>

          <main>
            <div className="study-form">
              <form onSubmit={handleGeneratePlan}>
                <div className="form-group">
                  <label htmlFor="book-index">
                    <BookOpenIcon className="icon" />
                    Book Index / Table of Contents
                  </label>
                  <textarea
                    id="book-index"
                    value={bookIndex}
                    onChange={(e) => setBookIndex(e.target.value)}
                    placeholder="Paste the book's full table of contents here..."
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="user-goal">
                    <LightBulbIcon className="icon" />
                    Your Learning Goal
                  </label>
                  <input
                    id="user-goal"
                    type="text"
                    value={userGoal}
                    onChange={(e) => setUserGoal(e.target.value)}
                    placeholder="e.g., 'Master state management for a new job' or 'Build a full-stack project'"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isGeneratingPlan}
                  className="submit-button"
                >
                  {isGeneratingPlan ? (
                    <>Generating Plan...</>
                  ) : (
                    'Generate Study Plan'
                  )}
                </button>
              </form>
            </div>

            {error && (
              <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(127, 29, 29, 0.5)', border: '1px solid rgb(239, 68, 68)', color: '#fca5a5', borderRadius: '8px', textAlign: 'center' }}>
                {error}
              </div>
            )}

            <div style={{ marginTop: '2rem' }}>
              {isGeneratingPlan && (
                <div style={{ textAlign: 'center', color: '#9ca3af' }}>
                  <p>AI is strategizing your learning path... Please wait.</p>
                </div>
              )}

              {studyPlan && (
                <div id="study-plan-output" className="output-container">
                  <div className="output-header">
                    <h2 className="output-title">Your Personalized Study Plan</h2>
                    <button
                      onClick={handleDownload}
                      disabled={!librariesLoaded}
                      className="download-button"
                    >
                      <DownloadIcon style={{ width: '1.25rem', height: '1.25rem' }} />
                      {librariesLoaded ? 'Download Plan' : 'Loading...'}
                    </button>
                  </div>

                  {/* Plan Text Section */}
                  <div
                    id="study-plan-output-content"
                    className="output-text"
                    dangerouslySetInnerHTML={renderMarkdown(studyPlan)}
                  ></div>

                  {/* Roadmap Action Section */}
                  <div style={{ marginTop: '2rem', borderTop: '1px solid #333', paddingTop: '2rem' }}>
                    {!showRoadmapConfig && tasks.length === 0 && (
                      <button
                        onClick={() => setShowRoadmapConfig(true)}
                        className="submit-button"
                        style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
                      >
                        Create Actionable Roadmap
                      </button>
                    )}

                    {showRoadmapConfig && (
                      <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '8px' }}>
                        <h3 style={{ color: '#fff', marginBottom: '1rem' }}>Configure Roadmap</h3>
                        <div className="form-group">
                          <label htmlFor="sprints" style={{ display: 'block', marginBottom: '0.5rem' }}>Number of Sprints (Weeks)</label>
                          <input
                            type="number"
                            id="sprints"
                            min="1"
                            max={maxSprints}
                            value={sprints}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              if (!isNaN(val) && val >= 1 && val <= maxSprints) {
                                setSprints(val);
                              }
                            }}
                            style={{ width: '100px', padding: '0.5rem', borderRadius: '4px', border: '1px solid #444', background: '#222', color: '#fff' }}
                          />
                          <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.25rem' }}>
                            Based on the plan, we suggest up to {maxSprints} sprints.
                          </p>
                        </div>
                        <button
                          onClick={handleGenerateRoadmap}
                          disabled={isGeneratingRoadmap}
                          className="submit-button"
                          style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', marginTop: '1rem' }}
                        >
                          {isGeneratingRoadmap ? 'Generating Roadmap...' : 'Generate Roadmap'}
                        </button>
                      </div>
                    )}

                    {/* Tasks Section */}
                    {tasks.length > 0 && (
                      <div className="tasks-container" style={{ marginTop: '2rem' }}>
                        <h3 style={{ color: '#E0E0E0', marginBottom: '1rem', fontSize: '1.2rem' }}>Actionable Roadmap ({tasks.length} Sprints)</h3>
                        <div className="tasks-list">
                          {tasks.map((task) => (
                            <div
                              key={task.id}
                              className={`task-item ${task.completed ? 'completed' : ''}`}
                              style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                padding: '1rem',
                                marginBottom: '0.75rem',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '1rem',
                                border: task.completed ? '1px solid #10B981' : '1px solid transparent',
                                transition: 'all 0.2s ease'
                              }}
                            >
                              <div style={{ paddingTop: '0.25rem' }}>
                                <input
                                  type="checkbox"
                                  checked={task.completed}
                                  onChange={() => toggleTask(task.id)}
                                  style={{
                                    width: '1.25rem',
                                    height: '1.25rem',
                                    cursor: 'pointer',
                                    accentColor: '#10B981'
                                  }}
                                />
                              </div>
                              <div style={{ width: '100%' }}>
                                <h4 style={{
                                  margin: '0 0 0.5rem 0',
                                  color: task.completed ? '#10B981' : '#F3F4F6',
                                  textDecoration: task.completed ? 'line-through' : 'none',
                                  fontSize: '1.1rem'
                                }}>
                                  {task.title}
                                </h4>
                                <p style={{
                                  margin: 0,
                                  color: '#9CA3AF',
                                  fontSize: '0.95rem',
                                  textDecoration: task.completed ? 'line-through' : 'none',
                                  whiteSpace: 'pre-wrap',
                                  lineHeight: '1.6'
                                }}>
                                  {task.description}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </main>

          <footer className="footer">
            <div className="footer-content">
              <span>Made By <strong>Yaswanth sai mannem</strong></span>
              <a
                href="https://www.linkedin.com/in/yaswanth-sai-mannem-800a75258"
                target="_blank"
                rel="noopener noreferrer"
                className="linkedin-link"
              >
                <LinkedInIcon style={{ width: '1.25rem', height: '1.25rem' }} />
              </a>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
};

export default App;