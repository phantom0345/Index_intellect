import React, { useState } from 'react';
import { generateStudyPlan } from './services/geminiService';
import { BookOpenIcon, LightBulbIcon, DownloadIcon } from './components/Icons';

declare const marked: { parse: (markdown: string) => string };
declare const jspdf: any;
declare const html2canvas: any;

const App: React.FC = () => {
  const [bookIndex, setBookIndex] = useState<string>('');
  const [userGoal, setUserGoal] = useState<string>('');
  const [studyPlan, setStudyPlan] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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
    } catch (err) {
      setError('Failed to generate study plan. Please check your connection and API key, then try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    const planElement = document.getElementById('study-plan-output-content');
    if (!planElement) {
        console.error("Could not find the study plan content to download.");
        return;
    }

    const { jsPDF } = jspdf;

    html2canvas(planElement, {
      scale: 2, // Use a higher scale for better resolution in the PDF
      backgroundColor: '#1E1E1E', // Match the dark theme background
      onclone: (document) => {
        // Ensure text colors are not lost during canvas rendering
        const elements = document.querySelectorAll('#study-plan-output-content *');
        elements.forEach((el: HTMLElement) => {
          el.style.color = window.getComputedStyle(el).color;
        });
      }
    }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      
      const ratio = canvasWidth / canvasHeight;
      const imgWidth = pdfWidth - 20; // 10mm margin on each side
      const imgHeight = imgWidth / ratio;
      
      let heightLeft = imgHeight;
      let position = 10; // Top margin

      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= (pdfHeight - 20);

      while (heightLeft > 0) {
        position = position - (pdfHeight - 20); // Move the image "up" on the next page
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= (pdfHeight - 20);
      }
      
      pdf.save('Index-Intellect-Study-Plan.pdf');
    });
  };

  return (
    <div className="min-h-screen bg-[#121212] text-gray-200 font-sans flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 py-2 mb-2">
            Index Intellect
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Transform a book's index into a personalized, actionable study plan tailored to your goals.
          </p>
        </header>

        <main>
          <div className="bg-[#1E1E1E] p-6 sm:p-8 rounded-2xl shadow-lg border border-gray-700">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="book-index" className="flex items-center text-lg font-semibold text-gray-100">
                  <BookOpenIcon className="w-6 h-6 mr-2 text-purple-400" />
                  Book Index / Table of Contents
                </label>
                <textarea
                  id="book-index"
                  value={bookIndex}
                  onChange={(e) => setBookIndex(e.target.value)}
                  placeholder="Paste the book's full table of contents here..."
                  className="w-full h-48 p-4 bg-gray-800 border-2 border-gray-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors duration-300 placeholder-gray-500 resize-y"
                  required
                />
              </div>

              <div className="space-y-2">
                 <label htmlFor="user-goal" className="flex items-center text-lg font-semibold text-gray-100">
                  <LightBulbIcon className="w-6 h-6 mr-2 text-purple-400" />
                  Your Learning Goal
                </label>
                <input
                  id="user-goal"
                  type="text"
                  value={userGoal}
                  onChange={(e) => setUserGoal(e.target.value)}
                  placeholder="e.g., 'Master state management for a new job' or 'Build a full-stack project'"
                  className="w-full p-4 bg-gray-800 border-2 border-gray-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors duration-300 placeholder-gray-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center gap-2 py-3 px-6 text-lg font-bold text-white bg-[#6a0dad] rounded-lg shadow-md hover:bg-purple-800 focus:outline-none focus:ring-4 focus:ring-purple-500 focus:ring-opacity-50 transition-all duration-300 disabled:bg-purple-900 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </>
                ) : (
                  'Generate Plan'
                )}
              </button>
            </form>
          </div>

          {error && (
            <div className="mt-8 p-4 bg-red-900/50 border border-red-500 text-red-300 rounded-lg text-center">
              {error}
            </div>
          )}

          <div className="mt-8">
            {isLoading && (
              <div className="text-center text-gray-400">
                <p>AI is strategizing your learning path... Please wait.</p>
              </div>
            )}
            {studyPlan && (
              <div id="study-plan-output" className="bg-[#1E1E1E] p-6 sm:p-8 rounded-2xl shadow-lg border border-gray-700 animate-fade-in">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">Your Personalized Study Plan</h2>
                  <button 
                    onClick={handleDownload}
                    className="flex items-center gap-2 py-2 px-4 text-sm font-semibold text-purple-200 bg-purple-900/50 border border-purple-700 rounded-lg hover:bg-purple-800/70 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 transition-colors"
                    aria-label="Download study plan as a PDF"
                  >
                    <DownloadIcon className="w-5 h-5" />
                    Download Plan
                  </button>
                </div>
                <div
                  id="study-plan-output-content"
                  className="text-gray-300 text-base leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: marked.parse(studyPlan) }}
                ></div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;