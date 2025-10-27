import { useState, FormEvent } from 'react';
import './App.css';

function App() {
  const [bookIndex, setBookIndex] = useState('');
  const [userGoal, setUserGoal] = useState('');
  const [studyPlan, setStudyPlan] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!bookIndex.trim() || !userGoal.trim()) {
      alert('Please fill in both the book index and your goal.');
      return;
    }

    setIsLoading(true);
    setStudyPlan('');

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-plan`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          index: bookIndex,
          goal: userGoal,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setStudyPlan(data.plan || 'No study plan generated.');
    } catch (error) {
      console.error('Error generating study plan:', error);
      setStudyPlan('Failed to generate study plan. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-container">
      <div className="content-wrapper">
        <h1 className="app-title">Study Plan Strategist</h1>
        <p className="app-subtitle">AI-powered learning path generator</p>

        <form onSubmit={handleSubmit} className="study-form">
          <div className="form-group">
            <label htmlFor="book-index">Book Index (Table of Contents)</label>
            <textarea
              id="book-index"
              value={bookIndex}
              onChange={(e) => setBookIndex(e.target.value)}
              placeholder="Paste the book's table of contents here..."
              rows={10}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="user-goal">Your Learning Goal</label>
            <input
              type="text"
              id="user-goal"
              value={userGoal}
              onChange={(e) => setUserGoal(e.target.value)}
              placeholder="e.g., Learn React for building web apps"
              required
            />
          </div>

          <button type="submit" disabled={isLoading} className="submit-button">
            {isLoading ? 'Generating...' : 'Generate Study Plan'}
          </button>
        </form>

        {studyPlan && (
          <div id="study-plan-output" className="output-container">
            <h2 className="output-title">Your Personalized Study Plan</h2>
            <pre className="output-text">{studyPlan}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
