import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { googleProvider } from '../firebase';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null); // 'super_admin', 'admin', 'player', or null (unauthorized)
  const [loading, setLoading] = useState(true);
  const [deploymentId, setDeploymentId] = useState(null);
  const [config, setConfig] = useState(null);

  useEffect(() => {
    // 1. Get deployment ID from URL or localStorage
    const params = new URLSearchParams(window.location.search);
    let d = params.get('d');
    if (d) {
      localStorage.setItem('deploymentId', d);
    } else {
      d = localStorage.getItem('deploymentId');
    }
    setDeploymentId(d);

    // 2. Fetch config if we have a deployment ID
    const fetchConfig = async () => {
      if (!d) return;
      try {
        const docRef = doc(db, 'deployments', d);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setConfig(docSnap.data().config);
        }
      } catch (err) {
        console.error("Failed to fetch deployment config", err);
      }
    };
    fetchConfig();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        await checkUserRole(currentUser);
      } else {
        setUser(null);
        setRole(null);
        setLoading(false);
      }
    });

    return unsubscribe;
  }, [deploymentId]);

  const checkUserRole = async (currentUser) => {
    try {
      // Check Super Admin first (from env var)
      const superAdmins = (import.meta.env.VITE_SUPER_ADMINS || '').split(',').map(e => e.trim());
      if (superAdmins.includes(currentUser.email)) {
        setRole('super_admin');
        setLoading(false);
        return;
      }

      // Check Deployment Allowlist
      if (deploymentId) {
        const allowlistRef = doc(db, `deployments/${deploymentId}/allowlist`, currentUser.email);
        const allowlistSnap = await getDoc(allowlistRef);
        if (allowlistSnap.exists()) {
          const data = allowlistSnap.data();
          setRole(data.role); // 'admin' or 'player'
        } else if (currentUser.email.endsWith('@splash.tech')) {
          setRole('player');
        } else {
          setRole(null); // Explicitly forbidden
        }
      } else {
        if (currentUser.email.endsWith('@splash.tech')) {
          setRole('player');
        } else {
          setRole(null);
        }
      }
    } catch (err) {
      console.error("Error checking role:", err);
      setRole(null);
    }
    setLoading(false);
  };

  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const value = {
    user,
    role,
    loading,
    deploymentId,
    config,
    loginWithGoogle,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
