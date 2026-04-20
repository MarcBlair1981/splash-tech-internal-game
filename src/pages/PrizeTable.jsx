import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { ArrowLeft, Trophy, Medal } from 'lucide-react';

export default function PrizeTable() {
  const { gameId } = useParams();
  const { deploymentId, user } = useAuth();
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!deploymentId || !gameId) return;
      try {
        // Fetch Game specific info
        const gameRef = doc(db, `deployments/${deploymentId}/games`, gameId);
        const gameSnap = await getDoc(gameRef);
        if (gameSnap.exists()) {
          setGame(gameSnap.data());
        }

        // Fetch Results
        const resultsRef = collection(db, `deployments/${deploymentId}/games/${gameId}/results`);
        const q = query(resultsRef, orderBy('rank', 'asc'));
        const snapshot = await getDocs(q);
        
        const fetchedResults = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setResults(fetchedResults);
      } catch (err) {
        console.error("Error fetching prize table:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [deploymentId, gameId]);

  if (loading) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
      </div>
    );
  }

  const getRankStyle = (rank) => {
    if (rank === 1) return { color: '#FBBF24', icon: <Trophy size={18} /> }; // Gold
    if (rank === 2) return { color: '#9CA3AF', icon: <Medal size={18} /> };  // Silver
    if (rank === 3) return { color: '#B45309', icon: <Medal size={18} /> };  // Bronze
    return { color: 'var(--color-text-muted)', icon: null };
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex items-center justify-between">
        <button 
          onClick={() => navigate('/lobby')} 
          className="btn btn-secondary"
          style={{ padding: '8px 16px' }}
        >
          <ArrowLeft size={16} /> Back to Lobby
        </button>
      </div>

      <div className="mb-8 p-8 glass-panel text-center" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(0, 12, 53, 0.6) 100%)' }}>
        <h1 className="mb-2" style={{ fontSize: '2.5rem' }}>
          Leaderboard
        </h1>
        {game && (
          <p className="text-lg" style={{ color: 'var(--color-text-muted)' }}>
            Results for: <strong style={{ color: 'white' }}>{game.name}</strong>
          </p>
        )}
      </div>

      <div className="glass-panel animate-slide-up" style={{ padding: '0', overflow: 'hidden' }}>
        {results.length === 0 ? (
          <div className="p-12 text-center">
            <Trophy size={48} className="mx-auto mb-4" style={{ color: 'var(--color-text-muted)', opacity: 0.5 }} />
            <h3>No results yet</h3>
            <p className="text-sm text-muted">The prize table is currently empty or hasn't been published.</p>
          </div>
        ) : (
          <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table>
              <thead>
                <tr>
                  <th style={{ width: '100px', textAlign: 'center' }}>Rank</th>
                  <th>Player</th>
                  <th style={{ textAlign: 'right' }}>Correct Answers</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, index) => {
                  const style = getRankStyle(r.rank);
                  const isCurrentUser = r.userId === user?.uid || r.id === user?.email; // based on how it's saved
                  return (
                    <tr key={r.id} style={{ background: isCurrentUser ? 'rgba(59, 130, 246, 0.1)' : 'transparent' }}>
                      <td style={{ textAlign: 'center' }}>
                        <div className="flex items-center justify-center gap-2 font-display font-bold text-lg" style={{ color: style.color }}>
                          {style.icon}
                          {r.rank}
                        </div>
                      </td>
                      <td>
                        <div className="font-medium" style={{ color: isCurrentUser ? 'var(--color-primary)' : 'var(--color-text)' }}>
                          {r.displayName || r.id}
                          {isCurrentUser && <span className="ml-2 badge badge-default" style={{ fontSize: '0.65rem' }}>You</span>}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span className="font-display text-xl font-bold">{r.correctAnswers}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
