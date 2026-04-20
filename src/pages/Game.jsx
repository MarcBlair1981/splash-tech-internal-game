import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ArrowLeft } from 'lucide-react';

export default function Game() {
  const { gameId } = useParams();
  const { user, deploymentId, config } = useAuth();
  const navigate = useNavigate();
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    const fetchGame = async () => {
      if (!deploymentId || !gameId) return;
      try {
        const gameRef = doc(db, `deployments/${deploymentId}/games`, gameId);
        const gameSnap = await getDoc(gameRef);
        if (gameSnap.exists()) {
          setGame(gameSnap.data());
        } else {
          console.error("Game not found");
          navigate('/lobby');
        }
      } catch (err) {
        console.error("Error fetching game:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchGame();
  }, [deploymentId, gameId, navigate]);

  useEffect(() => {
    // Listen for iframe messages to capture predictions
    const handleMessage = async (event) => {
      // Allow specific origin or localhost for testing
      const splashHubUrl = import.meta.env.VITE_SPLASH_HUB_URL || 'https://hub.splash.tech';
      
      // Basic check, in production we strictly check origin
      if (event.origin !== splashHubUrl) return;

      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        
        // Assuming payload has { type: 'prediction_submit', predictions: [...] }
        if (data.type === 'prediction_submit') {
          setSaveStatus('Saving predictions...');
          
          await setDoc(doc(db, `deployments/${deploymentId}/games/${gameId}/predictions`, user.email), {
            userId: user.uid,
            email: user.email,
            displayName: user.displayName || '',
            submittedAt: serverTimestamp(),
            payload: data.predictions
          });
          
          setSaveStatus('Predictions saved successfully!');
          setTimeout(() => setSaveStatus(''), 3000);
        }
      } catch (err) {
        console.error("Error processing iframe message", err);
        setSaveStatus('Failed to save predictions.');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [deploymentId, gameId, user]);

  if (loading || !config) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!game) return null;

  // Render iframe URL
  const hubUrl = import.meta.env.VITE_SPLASH_HUB_URL || 'https://hub.splash.tech';
  const iframeSrc = `${hubUrl}?token=${config.sharedToken || ''}&gameUuid=${game.gameUuid || ''}&language=en&bg=000C35`;

  return (
    <div className="animate-fade-in flex flex-col" style={{ height: 'calc(100vh - 120px)' }}>
      <div className="mb-4 flex items-center justify-between">
        <button 
          onClick={() => navigate('/lobby')} 
          className="btn btn-secondary"
          style={{ padding: '8px 16px' }}
        >
          <ArrowLeft size={16} /> Back to Lobby
        </button>
        <div className="flex items-center gap-4">
          {saveStatus && (
            <span className="text-sm font-medium animate-fade-in" style={{ color: 'var(--color-secondary)' }}>
              {saveStatus}
            </span>
          )}
          <h2 style={{ fontSize: '1.25rem' }}>{game.name}</h2>
        </div>
      </div>
      
      <div className="glass-panel flex-1 hidden-scrollbar" style={{ overflow: 'hidden', padding: 0 }}>
        <iframe 
          src={iframeSrc}
          style={{ width: '100%', height: '100%', border: 'none' }}
          title={game.name}
          allowFullScreen
        ></iframe>
      </div>
    </div>
  );
}
