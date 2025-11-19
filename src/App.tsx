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
const generateStudyPlan = async (bookIndex: string, userGoal: string) => {
  try {
    const response = await fetch('http://localhost:3001/generate-plan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        index: bookIndex,
        goal: userGoal,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to generate plan');
    }

    if (!data.plan) {
      throw new Error('Received empty plan from server');
    }

    return data.plan;
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
  const [isLoading, setIsLoading] = useState<boolean>(false);
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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!bookIndex.trim() || !userGoal.trim()) {
      setError('Please fill in both the book index and your study goal.');
      return;
    }

    setIsLoading(true);
    setStudyPlan('');
    setError(null);

    try {
      const plan = await generateStudyPlan(bookIndex, userGoal);
      setStudyPlan(plan);
    } catch (err: any) {
      setError(err.message || 'Failed to generate study plan.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!librariesLoaded) {
        alert("Please wait, PDF tools are still loading...");
        return;
    }

    const planElement = document.getElementById('study-plan-output-content');
    if (!planElement) return;

    const { jsPDF } = window.jspdf;
    const html2canvas = window.html2canvas;
    const originalPadding = planElement.style.padding;
    planElement.style.padding = '40px'; 

    html2canvas(planElement, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#1E1E1E',
      onclone: (clonedDoc: Document) => {
        const elements = clonedDoc.querySelectorAll('#study-plan-output-content *');
        elements.forEach((el) => {
            if(el instanceof HTMLElement) {
                const computedStyle = window.getComputedStyle(el);
                el.style.color = computedStyle.color;
                if (/^H[1-6]$/.test(el.tagName)) el.style.color = '#E0E0E0';
                if (el.tagName === 'LI') el.style.color = '#D1D5DB';
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
              <form onSubmit={handleSubmit}>
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
                  disabled={isLoading}
                  className="submit-button"
                >
                  {isLoading ? (
                    <>
                      Generating...
                    </>
                  ) : (
                    'Generate Plan'
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
              {isLoading && (
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
                  <div
                    id="study-plan-output-content"
                    className="output-text"
                    dangerouslySetInnerHTML={renderMarkdown(studyPlan)}
                  ></div>
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