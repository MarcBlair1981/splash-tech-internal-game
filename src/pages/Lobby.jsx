import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { Play, Eye, Trophy, Clock } from 'lucide-react';

export default function Lobby() {
  const { deploymentId } = useAuth();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGames = async () => {
      if (!deploymentId) return;
      try {
        const gamesRef = collection(db, `deployments/${deploymentId}/games`);
        const q = query(gamesRef, where('active', '==', true));
        const snapshot = await getDocs(q);
        const fetchedGames = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Sort in memory since we might need a composite index for orderBy('deadline')
        fetchedGames.sort((a, b) => a.deadline?.toMillis() - b.deadline?.toMillis());
        setGames(fetchedGames);
      } catch (err) {
        console.error("Error fetching games:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchGames();
  }, [deploymentId]);

  if (loading) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8 p-8 glass-panel text-center" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(0, 12, 53, 0.6) 100%)' }}>
        <h1 className="mb-4" style={{ fontSize: '2.5rem', background: 'linear-gradient(to right, #fff, #9CA3AF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Internal Game Portal
        </h1>
        <p className="text-lg" style={{ color: 'var(--color-text-muted)', maxWidth: '600px', margin: '0 auto' }}>
          Select an active game below to submit your predictions or view the latest results.
        </p>
      </div>

      {games.length === 0 ? (
        <div className="text-center p-12 glass border-dashed">
          <Clock size={48} className="mx-auto mb-4" style={{ color: 'var(--color-text-muted)', opacity: 0.5, margin: '0 auto 16px' }} />
          <h3 className="mb-2">No active games</h3>
          <p className="text-sm text-muted">There are no active games available right now. Check back later.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
          {games.map((game, i) => (
            <div key={game.id} className="glass animate-slide-up" style={{ display: 'flex', flexDirection: 'column', animationDelay: `${i * 0.1}s` }}>
              <div className="p-6 flex-1">
                <div className="flex justify-between items-start mb-4">
                  <h3 style={{ fontSize: '1.25rem' }}>{game.name}</h3>
                  {game.status === 'upcoming' && <span className="badge badge-success">Upcoming</span>}
                  {game.status === 'live' && <span className="badge badge-warning">Live</span>}
                  {game.status === 'settled' && <span className="badge badge-default">Settled</span>}
                </div>
                
                <div className="mb-6 text-sm flex items-center gap-2" style={{ color: 'var(--color-text-muted)' }}>
                  <Clock size={16} />
                  <span>
                    Deadline: {game.deadline ? new Date(game.deadline.toMillis()).toLocaleString() : 'TBD'}
                  </span>
                </div>
              </div>

              <div className="p-6 border-t border-[var(--color-border)] bg-[rgba(255,255,255,0.02)]">
                {game.status === 'upcoming' && (
                  <Link to={`/game/${game.id}`} className="btn btn-primary w-full shadow-lg">
                    <Play size={18} /> Play Now
                  </Link>
                )}
                {game.status === 'live' && (
                  <Link to={`/game/${game.id}`} className="btn btn-secondary w-full">
                    <Eye size={18} /> View Predictions
                  </Link>
                )}
                {game.status === 'settled' && game.prizeTablePublished && (
                  <Link to={`/results/${game.id}`} className="btn btn-secondary w-full" style={{ borderColor: 'var(--color-warning)', color: 'var(--color-warning)' }}>
                    <Trophy size={18} /> View Results
                  </Link>
                )}
                {game.status === 'settled' && !game.prizeTablePublished && (
                  <button disabled className="btn w-full" style={{ background: 'var(--color-surface)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
                    Results Pending
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
