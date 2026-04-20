import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

export default function AccessRequest() {
  const { user, deploymentId, logout } = useAuth();
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim() || !deploymentId) return;

    setLoading(true);
    try {
      await addDoc(collection(db, `deployments/${deploymentId}/accessRequests`), {
        email: user.email,
        displayName: user.displayName || '',
        reason: reason.trim(),
        requestedAt: serverTimestamp(),
        status: 'pending'
      });
      setSubmitted(true);
    } catch (err) {
      console.error('Error submitting access request', err);
      alert('There was an error submitting your request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="flex justify-center items-center p-6 animate-fade-in" style={{ minHeight: 'calc(100vh - 120px)' }}>
      <div className="glass-panel" style={{ padding: '40px', maxWidth: '500px', width: '100%' }}>
        <div className="text-center mb-8">
          <div className="mb-4 flex justify-center">
            <div style={{ width: 48, height: 48, background: 'rgba(239, 68, 68, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-danger)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            </div>
          </div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Access Required</h2>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Your account ({user?.email}) is not currently on the allowlist for this application.
          </p>
        </div>

        {submitted ? (
          <div className="text-center animate-slide-up glass" style={{ padding: '24px', background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.2)' }}>
            <div style={{ color: 'var(--color-secondary)', marginBottom: '12px', display: 'flex', justifyContent: 'center' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            </div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Request Sent</h3>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Your request has been sent. An admin will review your access.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="animate-slide-up">
            <div className="form-group">
              <label className="form-label text-sm">Reason for access</label>
              <textarea 
                className="form-control" 
                rows="4" 
                placeholder="E.g., I am a new team member and need access to play the internal iteration of the game."
                value={reason}
                onChange={e => setReason(e.target.value)}
                required
              ></textarea>
            </div>
            <div className="flex gap-4">
              <button type="submit" className="btn btn-primary w-full" disabled={loading || !reason.trim()}>
                {loading ? 'Submitting...' : 'Request Access'}
              </button>
            </div>
          </form>
        )}

        <div className="mt-8 text-center border-t border-[var(--color-border)] pt-6">
          <button onClick={handleSignOut} className="btn btn-secondary w-full">
            Sign out and try another account
          </button>
        </div>
      </div>
    </div>
  );
}
