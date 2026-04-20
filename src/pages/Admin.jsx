import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, storage, functions } from '../firebase';
import { collection, doc, query, getDocs, setDoc, deleteDoc, updateDoc, serverTimestamp, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { Settings, Users, Image as ImageIcon, Gamepad2, Trophy, Clock, Check, X } from 'lucide-react';

export default function Admin() {
  const { deploymentId, config } = useAuth();
  const [activeTab, setActiveTab] = useState('branding');
  
  // Tabs: branding, games, allowlist, requests, results

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Admin Dashboard</h1>
        <p className="text-muted">Manage your deployment, games, and users.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Nav */}
        <div className="md:w-64 flex-shrink-0">
          <nav className="glass" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <TabButton active={activeTab === 'branding'} onClick={() => setActiveTab('branding')} icon={<ImageIcon size={18} />} label="Branding" />
            <TabButton active={activeTab === 'games'} onClick={() => setActiveTab('games')} icon={<Gamepad2 size={18} />} label="Games" />
            <TabButton active={activeTab === 'allowlist'} onClick={() => setActiveTab('allowlist')} icon={<Users size={18} />} label="Allowlist" />
            <TabButton active={activeTab === 'requests'} onClick={() => setActiveTab('requests')} icon={<Clock size={18} />} label="Access Requests" />
            <TabButton active={activeTab === 'results'} onClick={() => setActiveTab('results')} icon={<Trophy size={18} />} label="Results" />
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 glass-panel" style={{ padding: '32px', minHeight: '500px' }}>
          {activeTab === 'branding' && <BrandingTab deploymentId={deploymentId} currentConfig={config} />}
          {activeTab === 'games' && <GamesTab deploymentId={deploymentId} />}
          {activeTab === 'allowlist' && <AllowlistTab deploymentId={deploymentId} />}
          {activeTab === 'requests' && <AccessRequestsTab deploymentId={deploymentId} />}
          {activeTab === 'results' && <ResultsTab deploymentId={deploymentId} />}
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        borderRadius: 'var(--radius-sm)',
        background: active ? 'var(--color-primary)' : 'transparent',
        color: active ? 'white' : 'var(--color-text)',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
        fontWeight: 500,
        transition: 'all 0.2s',
      }}
      className={!active ? 'hover:bg-[rgba(255,255,255,0.05)]' : ''}
    >
      {icon}
      {label}
    </button>
  );
}

// -------------------------------------------------------------
// Branding Tab
// -------------------------------------------------------------
function BrandingTab({ deploymentId, currentConfig }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentConfig?.logoUrl || null);

  const handleUpload = async () => {
    if (!file || !deploymentId) return;
    setUploading(true);
    try {
      const extension = file.name.split('.').pop();
      const storageRef = ref(storage, `deployments/${deploymentId}/logo.${extension}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      
      const configRef = doc(db, 'deployments', deploymentId);
      await setDoc(configRef, { config: { ...currentConfig, logoUrl: url } }, { merge: true });
      
      setPreview(url);
      setFile(null);
      alert('Logo updated successfully!');
    } catch (err) {
      console.error(err);
      alert('Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <h2 className="mb-6">Deployment Branding</h2>
      
      <div className="mb-6 p-6 glass border-dashed">
        <p className="text-sm text-muted mb-4">Current Logo Preview:</p>
        <div style={{ height: '80px', background: 'var(--color-bg)', padding: '16px', borderRadius: '8px', display: 'flex', alignItems: 'center', border: '1px solid var(--color-border)' }}>
          {preview ? (
            <img src={preview} alt="Logo" style={{ height: '100%', objectFit: 'contain' }} />
          ) : (
            <span className="text-muted italic">No custom logo set (using default)</span>
          )}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Upload New Logo (PNG/JPG/SVG)</label>
        <input 
          type="file" 
          accept="image/*"
          className="form-control mb-4"
          onChange={e => setFile(e.target.files[0])}
        />
        <button 
          onClick={handleUpload} 
          disabled={!file || uploading} 
          className="btn btn-primary"
        >
          {uploading ? 'Uploading...' : 'Save Branding'}
        </button>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// Games Tab
// -------------------------------------------------------------
function GamesTab({ deploymentId }) {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [gameUuid, setGameUuid] = useState('');
  const [name, setName] = useState('');
  const [deadline, setDeadline] = useState('');
  const [status, setStatus] = useState('upcoming');
  const [active, setActive] = useState(true);

  useEffect(() => {
    fetchGames();
  }, [deploymentId]);

  const fetchGames = async () => {
    if (!deploymentId) return;
    try {
      const snap = await getDocs(collection(db, `deployments/${deploymentId}/games`));
      setGames(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddGame = async (e) => {
    e.preventDefault();
    try {
      const newGameRef = doc(collection(db, `deployments/${deploymentId}/games`));
      await setDoc(newGameRef, {
        gameUuid,
        name,
        deadline: new Date(deadline),
        status,
        active,
        prizeTablePublished: false
      });
      // reset form
      setGameUuid(''); setName(''); setDeadline('');
      fetchGames();
    } catch (err) {
      console.error(err);
      alert('Failed to add game: ' + err.message);
    }
  };

  const toggleActive = async (id, currentActive) => {
    try {
      await updateDoc(doc(db, `deployments/${deploymentId}/games`, id), {
        active: !currentActive
      });
      fetchGames();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteGame = async (id) => {
    if (!confirm('Are you sure you want to delete this game?')) return;
    try {
      await deleteDoc(doc(db, `deployments/${deploymentId}/games`, id));
      fetchGames();
    } catch (err) {
      console.error(err);
      alert('Failed to delete game: ' + err.message);
    }
  };

  return (
    <div className="animate-fade-in">
      <h2 className="mb-6">Manage Games</h2>
      
      <form onSubmit={handleAddGame} className="glass p-6 mb-8">
        <h3 className="mb-4 text-lg">Add New Game</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="form-group mb-0">
            <label className="form-label">Game Name</label>
            <input type="text" className="form-control" required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Weekly Premier League" />
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Game UUID</label>
            <input type="text" className="form-control" required value={gameUuid} onChange={e => setGameUuid(e.target.value)} />
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Deadline</label>
            <input type="datetime-local" className="form-control" required value={deadline} onChange={e => setDeadline(e.target.value)} />
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Status</label>
            <select className="form-control" value={status} onChange={e => setStatus(e.target.value)}>
              <option value="upcoming">Upcoming</option>
              <option value="live">Live</option>
              <option value="settled">Settled</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button type="submit" className="btn btn-primary">Add Game</button>
        </div>
      </form>

      {loading ? (
        <div className="text-center p-4">Loading...</div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {games.map(g => (
                <tr key={g.id}>
                  <td>{g.name}</td>
                  <td>
                    <span className={`badge ${g.status === 'upcoming' ? 'badge-success' : g.status === 'live' ? 'badge-warning' : 'badge-default'}`}>
                      {g.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ cursor: 'pointer', color: g.active ? 'var(--color-secondary)' : 'var(--color-text-muted)' }} onClick={() => toggleActive(g.id, g.active)}>
                      {g.active ? <Check size={20} /> : <X size={20} />}
                    </div>
                  </td>
                  <td>
                    <button onClick={() => handleDeleteGame(g.id)} style={{ color: 'var(--color-danger)', background: 'transparent', border: 'none', cursor: 'pointer' }} className="text-xs hover:text-white">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// Allowlist Tab
// -------------------------------------------------------------
function AllowlistTab({ deploymentId }) {
  const [users, setUsers] = useState([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('player');

  useEffect(() => { fetchUsers(); }, [deploymentId]);

  const fetchUsers = async () => {
    if (!deploymentId) return;
    try {
      const snap = await getDocs(collection(db, `deployments/${deploymentId}/allowlist`));
      setUsers(snap.docs.map(d => ({ email: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!email) return;
    try {
      await setDoc(doc(db, `deployments/${deploymentId}/allowlist`, email), {
        role,
        addedAt: serverTimestamp()
      });
      setEmail('');
      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemove = async (userEmail) => {
    if (confirm('Remove user?')) {
      try {
        await deleteDoc(doc(db, `deployments/${deploymentId}/allowlist`, userEmail));
        fetchUsers();
      } catch (err) { console.error(err); }
    }
  };

  return (
    <div className="animate-fade-in">
      <h2 className="mb-6">Allowlist Management</h2>
      <form onSubmit={handleAdd} className="flex gap-4 mb-8">
        <input type="email" placeholder="Email address" className="form-control" required value={email} onChange={e => setEmail(e.target.value)} />
        <select className="form-control" value={role} onChange={e => setRole(e.target.value)} style={{ width: '150px' }}>
          <option value="player">Player</option>
          <option value="admin">Admin</option>
        </select>
        <button type="submit" className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>Add User</button>
      </form>
      
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.email}>
                <td>{u.email}</td>
                <td className="capitalize">{u.role}</td>
                <td>
                  <button onClick={() => handleRemove(u.email)} style={{ color: 'var(--color-danger)', background: 'transparent', border: 'none', cursor: 'pointer' }}>Remove</button>
                </td>
              </tr>
            ))}
            {users.length === 0 && <tr><td colSpan="3" className="text-center p-4">Empty allowlist</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// Access Requests Tab
// -------------------------------------------------------------
function AccessRequestsTab({ deploymentId }) {
  const [requests, setRequests] = useState([]);

  useEffect(() => { fetchRequests(); }, [deploymentId]);

  const fetchRequests = async () => {
    if (!deploymentId) return;
    try {
      const q = query(collection(db, `deployments/${deploymentId}/accessRequests`), where('status', '==', 'pending'));
      const snap = await getDocs(q);
      setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
  };

  const handleAction = async (req, action) => {
    try {
      if (action === 'approved') {
        await setDoc(doc(db, `deployments/${deploymentId}/allowlist`, req.email), {
          role: 'player',
          displayName: req.displayName,
          addedAt: serverTimestamp()
        });
      }
      await updateDoc(doc(db, `deployments/${deploymentId}/accessRequests`, req.id), {
        status: action
      });
      fetchRequests();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="animate-fade-in">
      <h2 className="mb-6">Pending Access Requests</h2>
      {requests.length === 0 ? (
        <div className="p-8 text-center glass border-dashed text-muted">No pending requests.</div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>User / Email</th>
                <th>Reason</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(r => (
                <tr key={r.id}>
                  <td>
                    <div className="font-bold">{r.displayName || 'Unknown Name'}</div>
                    <div className="text-sm text-muted">{r.email}</div>
                  </td>
                  <td><p className="text-sm m-0 max-w-xs">{r.reason}</p></td>
                  <td>
                    <div className="flex gap-2">
                      <button onClick={() => handleAction(r, 'approved')} className="btn btn-secondary text-xs" style={{ borderColor: 'var(--color-secondary)' }}>Approve</button>
                      <button onClick={() => handleAction(r, 'denied')} className="btn btn-secondary text-xs" style={{ borderColor: 'var(--color-danger)' }}>Deny</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// Results Tab
// -------------------------------------------------------------
function ResultsTab({ deploymentId }) {
  const [games, setGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState('');
  const [predictions, setPredictions] = useState([]);
  const [scores, setScores] = useState({});
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    const fetchSettledGames = async () => {
      if (!deploymentId) return;
      const q = query(collection(db, `deployments/${deploymentId}/games`));
      const snap = await getDocs(q);
      setGames(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetchSettledGames();
  }, [deploymentId]);

  useEffect(() => {
    if (!selectedGame || !deploymentId) {
      setPredictions([]);
      return;
    }
    const fetchPreds = async () => {
      const snap = await getDocs(collection(db, `deployments/${deploymentId}/games/${selectedGame}/predictions`));
      const preds = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPredictions(preds);
      
      // Also fetch existing results to populate inputs
      const resSnap = await getDocs(collection(db, `deployments/${deploymentId}/games/${selectedGame}/results`));
      const currentScores = {};
      resSnap.docs.forEach(d => {
         currentScores[d.id] = d.data().correctAnswers;
      });
      setScores(currentScores);
    };
    fetchPreds();
  }, [selectedGame, deploymentId]);

  const handleScoreChange = (userId, value) => {
    setScores(prev => ({ ...prev, [userId]: parseInt(value, 10) || 0 }));
  };

  const handleSaveScores = async () => {
    try {
      // Save all manual scores to db
      for (const p of predictions) {
        const userId = p.email; // Using email as doc id
        const correctAnswers = scores[userId] || 0;
        await setDoc(doc(db, `deployments/${deploymentId}/games/${selectedGame}/results`, userId), {
          userId: p.userId || userId,
          displayName: p.displayName || userId,
          correctAnswers,
        }, { merge: true });
      }
      alert('Scores saved successfully.');
    } catch (err) {
      console.error(err);
      alert('Failed to save scores.');
    }
  };

  const handlePublish = async () => {
    if (!confirm('Are you sure you want to publish the prize table? This will calculate ranks.')) return;
    setPublishing(true);
    try {
      // In a real app we'd call the CF:
      const calculateScoresCF = httpsCallable(functions, 'calculateScores');
      await calculateScoresCF({ deploymentId, gameId: selectedGame });
      alert('Prize table published successfully!');
    } catch (err) {
      console.error("Cloud function call failed, triggering local fallback calc...", err);
      // Fallback local logic for demo/completeness if CF is missing
      await fallbackLocalRankCalculation();
    } finally {
      setPublishing(false);
    }
  };

  const fallbackLocalRankCalculation = async () => {
     const resSnap = await getDocs(collection(db, `deployments/${deploymentId}/games/${selectedGame}/results`));
     const resData = resSnap.docs.map(d => ({ id: d.id, ...d.data() }));
     resData.sort((a, b) => b.correctAnswers - a.correctAnswers);
     
     let currentRank = 1;
     let prevScore = null;
     
     for (let i = 0; i < resData.length; i++) {
        if (resData[i].correctAnswers !== prevScore) {
           currentRank = i + 1;
        }
        await updateDoc(doc(db, `deployments/${deploymentId}/games/${selectedGame}/results`, resData[i].id), {
           rank: currentRank
        });
        prevScore = resData[i].correctAnswers;
     }
     
     await updateDoc(doc(db, `deployments/${deploymentId}/games`, selectedGame), {
        prizeTablePublished: true
     });
     alert('Local calculation complete. Prize table published.');
  };

  return (
    <div className="animate-fade-in">
      <h2 className="mb-6">Scoring & Results</h2>
      
      <div className="form-group max-w-md">
        <label className="form-label">Select Game</label>
        <select className="form-control" value={selectedGame} onChange={e => setSelectedGame(e.target.value)}>
          <option value="">-- Choose game --</option>
          {games.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>

      {selectedGame && (
        <div className="mt-8">
          <h3 className="mb-4">Enter Correct Answers</h3>
          {predictions.length === 0 ? (
            <div className="p-4 text-muted border-dashed glass">No predictions found for this game.</div>
          ) : (
            <>
              <div className="table-container mb-6">
                <table>
                  <thead>
                    <tr>
                      <th>Player</th>
                      <th>Submitted At</th>
                      <th>Raw Picks (Payload)</th>
                      <th style={{ width: '150px' }}>Correct Answers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {predictions.map(p => (
                      <tr key={p.id}>
                        <td>{p.displayName || p.email}</td>
                        <td className="text-sm text-muted">{p.submittedAt ? new Date(p.submittedAt.toMillis()).toLocaleString() : 'N/A'}</td>
                        <td>
                          <details style={{ cursor: 'pointer', maxWidth: '300px' }}>
                            <summary className="text-xs text-primary font-bold">View Picks Data</summary>
                            <pre className="text-xs p-2 mt-2 bg-black bg-opacity-50 rounded overflow-x-auto" style={{ wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>
                              {JSON.stringify(p.payload, null, 2)}
                            </pre>
                          </details>
                        </td>
                        <td>
                          <input 
                            type="number" 
                            min="0"
                            className="form-control px-2 py-1"
                            value={scores[p.email] !== undefined ? scores[p.email] : ''}
                            onChange={(e) => handleScoreChange(p.email, e.target.value)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-4">
                <button onClick={handleSaveScores} className="btn btn-secondary">Save Draft Scores</button>
                <button onClick={handlePublish} disabled={publishing} className="btn btn-primary" style={{ background: 'var(--color-secondary)' }}>
                  {publishing ? 'Publishing...' : 'Calculate Ranks & Publish'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
