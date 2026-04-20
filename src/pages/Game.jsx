import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ArrowLeft, CheckCircle, Edit3, Save } from 'lucide-react';

export default function Game() {
  const { gameId } = useParams();
  const { user, deploymentId, config } = useAuth();
  const navigate = useNavigate();
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);

  // Manual picks state
  const [picks, setPicks] = useState(['', '', '', '', '']);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedPicks, setSavedPicks] = useState(null); // confirmed picks from DB
  const [picksSaved, setPicksSaved] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const fetchGame = async () => {
      if (!deploymentId || !gameId) return;
      try {
        const gameRef = doc(db, `deployments/${deploymentId}/games`, gameId);
        const gameSnap = await getDoc(gameRef);
        if (gameSnap.exists()) {
          setGame(gameSnap.data());
        } else {
          navigate('/lobby');
        }
      } catch (err) {
        console.error('Error fetching game:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchGame();
  }, [deploymentId, gameId, navigate]);

  // Load existing picks from Firestore if user has already submitted
  useEffect(() => {
    const loadExistingPicks = async () => {
      if (!deploymentId || !gameId || !user?.email) return;
      try {
        const predRef = doc(db, `deployments/${deploymentId}/games/${gameId}/predictions`, user.email);
        const predSnap = await getDoc(predRef);
        if (predSnap.exists()) {
          const data = predSnap.data();
          setSavedPicks(data);
          setPicks(data.picks || ['', '', '', '', '']);
          setNotes(data.notes || '');
          setPicksSaved(true);
        }
      } catch (err) {
        console.error('Error loading existing picks:', err);
      }
    };
    loadExistingPicks();
  }, [deploymentId, gameId, user]);

  const handleSavePicks = async () => {
    const filledPicks = picks.filter(p => p.trim() !== '');
    if (filledPicks.length === 0) {
      alert('Please enter at least one pick before saving.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        userId: user.uid,
        email: user.email,
        displayName: user.displayName || user.email,
        picks,
        notes,
        submittedAt: serverTimestamp(),
      };
      await setDoc(
        doc(db, `deployments/${deploymentId}/games/${gameId}/predictions`, user.email),
        payload
      );
      setSavedPicks({ ...payload, submittedAt: new Date() });
      setPicksSaved(true);
      setEditing(false);
    } catch (err) {
      console.error('Error saving picks:', err);
      alert('Failed to save picks: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePickChange = (index, value) => {
    const updated = [...picks];
    updated[index] = value;
    setPicks(updated);
  };

  if (loading || !config) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!game) return null;

  const hubUrl = import.meta.env.VITE_SPLASH_HUB_URL || 'https://hub.splash.tech';
  const sharedToken = config.sharedToken || import.meta.env.VITE_SHARED_TOKEN || '';
  const iframeSrc = `${hubUrl}?token=${sharedToken}&gameUuid=${game.gameUuid || ''}&language=en`;

  const isDeadlinePassed = game.deadline?.toMillis ? new Date() > new Date(game.deadline.toMillis()) : false;

  return (
    <div className="animate-fade-in flex flex-col items-center" style={{ minHeight: 'calc(100vh - 120px)', width: '100%', paddingBottom: '48px' }}>
      {/* Header row */}
      <div className="mb-4 flex items-center justify-between w-full" style={{ maxWidth: '450px' }}>
        <button
          onClick={() => navigate('/lobby')}
          className="btn btn-secondary"
          style={{ padding: '8px 16px', borderRadius: '999px' }}
        >
          <ArrowLeft size={16} /> Lobby
        </button>
        <h2 style={{ fontSize: '1.25rem', margin: 0 }}>{game.name}</h2>
      </div>

      {/* Game iframe */}
      <div className="glass-panel shadow-2xl" style={{
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

      {/* Manual Picks Panel */}
      <div className="glass-panel animate-slide-up mt-6" style={{ width: '100%', maxWidth: '450px', padding: '28px' }}>
        {picksSaved && !editing ? (
          // Confirmed picks view
          <div>
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle size={22} style={{ color: 'var(--color-secondary)', flexShrink: 0 }} />
              <div>
                <h3 style={{ fontSize: '1rem', margin: 0 }}>Your Picks Are In!</h3>
                <p style={{ fontSize: '0.8rem', margin: 0 }}>
                  Saved {savedPicks?.submittedAt instanceof Date
                    ? savedPicks.submittedAt.toLocaleString()
                    : 'just now'}
                </p>
              </div>
            </div>

            <ol style={{ listStyle: 'none', padding: 0, margin: '0 0 16px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(savedPicks?.picks || []).filter(p => p.trim() !== '').map((p, i) => (
                <li key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '10px 14px',
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  borderRadius: '10px'
                }}>
                  <span style={{
                    width: '24px', height: '24px', borderRadius: '50%',
                    background: 'var(--color-secondary)', color: '#000',
                    fontSize: '0.75rem', fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>{i + 1}</span>
                  <span style={{ fontWeight: 600 }}>{p}</span>
                </li>
              ))}
            </ol>

            {savedPicks?.notes && (
              <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', marginBottom: '16px' }}>
                <p style={{ fontSize: '0.8rem', margin: 0, color: 'var(--color-text-muted)' }}>Notes: {savedPicks.notes}</p>
              </div>
            )}

            {!isDeadlinePassed && (
              <button onClick={() => setEditing(true)} className="btn btn-secondary w-full" style={{ gap: '8px' }}>
                <Edit3 size={15} /> Edit My Picks
              </button>
            )}
          </div>
        ) : (
          // Picks entry form
          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '4px' }}>
              {editing ? 'Edit Your Picks' : 'Submit Your Picks'}
            </h3>
            <p style={{ fontSize: '0.82rem', marginBottom: '20px' }}>
              Enter your selections below (up to 5). These will be recorded against your name.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
              {picks.map((pick, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    background: pick.trim() ? 'var(--color-primary)' : 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    fontSize: '0.78rem', fontWeight: 700, color: pick.trim() ? '#fff' : 'var(--color-text-muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    transition: 'all 0.2s'
                  }}>{i + 1}</span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder={`Pick #${i + 1} e.g. Rory McIlroy`}
                    value={pick}
                    onChange={e => handlePickChange(i, e.target.value)}
                    style={{ flex: 1 }}
                  />
                </div>
              ))}
            </div>

            <div className="form-group mb-5">
              <label className="form-label">Notes (optional)</label>
              <textarea
                className="form-control"
                placeholder="Any additional comments about your picks..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                style={{ resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              {editing && (
                <button onClick={() => setEditing(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                  Cancel
                </button>
              )}
              <button
                onClick={handleSavePicks}
                disabled={saving || picks.every(p => !p.trim())}
                className="btn btn-primary"
                style={{ flex: 2, gap: '8px' }}
              >
                <Save size={16} />
                {saving ? 'Saving...' : editing ? 'Update My Picks' : 'Save My Picks'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
