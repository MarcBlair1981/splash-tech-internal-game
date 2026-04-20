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

  const [debugLogs, setDebugLogs] = useState([]);
  
  useEffect(() => {
    // Listen for iframe messages to capture predictions
    const handleMessage = async (event) => {
      // Allow specific origin or localhost for testing
      const splashHubUrl = import.meta.env.VITE_SPLASH_HUB_URL || 'https://hub.splash.tech';
      
      const rawData = typeof event.data === 'string' ? event.data : JSON.stringify(event.data);
      setDebugLogs(prev => [...prev, `RCV: ${rawData}`]);

      // Basic check, in production we strictly check origin
      if (event.origin !== splashHubUrl && event.origin !== new URL(splashHubUrl).origin) return;

      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        
        if (data.type === 'bridge_ready' || data === 'bridge_ready') {
            event.source.postMessage(JSON.stringify({ type: 'init_host' }), '*');
            setDebugLogs(prev => [...prev, `SNT: init_host`]);
        }
        
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
  const sharedToken = config.sharedToken || import.meta.env.VITE_SHARED_TOKEN || '';
  const iframeSrc = `${hubUrl}?token=${sharedToken}&gameUuid=${game.gameUuid || ''}&language=en`;

  return (
    <div className="animate-fade-in flex flex-col items-center" style={{ minHeight: 'calc(100vh - 120px)', width: '100%' }}>
      <div className="mb-4 flex items-center justify-between w-full" style={{ maxWidth: '450px' }}>
        <button 
          onClick={() => navigate('/lobby')} 
          className="btn btn-secondary shadow-lg"
          style={{ padding: '8px 16px', borderRadius: '999px' }}
        >
          <ArrowLeft size={16} /> Lobby
        </button>
        <div className="flex items-center gap-4">
          {saveStatus && (
            <span className="text-xs font-medium animate-fade-in badge badge-success" style={{ padding: '4px 10px' }}>
              {saveStatus}
            </span>
          )}
          <h2 style={{ fontSize: '1.25rem', margin: 0 }}>{game.name}</h2>
        </div>
      </div>
      
      <div className="glass-panel hidden-scrollbar shadow-2xl" style={{ 
        width: '100%', 
        maxWidth: '450px', 
        height: '800px', 
        maxHeight: 'calc(100vh - 160px)', 
        overflow: 'hidden', 
        padding: 0, 
        position: 'relative',
        borderRadius: '24px',
        border: '4px solid rgba(255,255,255,0.05)'
      }}>
        <iframe 
          src={iframeSrc}
          style={{ width: '100%', height: '100%', border: 'none', position: 'absolute', top: 0, left: 0, background: '#000C35' }}
          title={game.name}
          allowFullScreen
        ></iframe>
      </div>

      {debugLogs.length > 0 && (
        <div style={{ position: 'fixed', bottom: 10, left: 10, background: 'rgba(0,0,0,0.8)', color: 'lime', padding: '10px', fontSize: '10px', maxHeight: '200px', overflowY: 'auto', zIndex: 9999, maxWidth: '400px', wordWrap: 'break-word' }}>
          <strong>Bridge Debug:</strong>
          {debugLogs.map((log, i) => <div key={i}>{log}</div>)}
        </div>
      )}
    </div>
  );
}
