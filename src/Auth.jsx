import React, { useState } from 'react';
import { supabase } from './supabaseClient';

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false); // Toggle between Login/Signup
  const [errorMsg, setErrorMsg] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    let result;

    if (isSignUp) {
      // --- SIGN UP LOGIC ---
      result = await supabase.auth.signUp({
        email,
        password,
      });
    } else {
      // --- LOG IN LOGIC ---
      result = await supabase.auth.signInWithPassword({
        email,
        password,
      });
    }

    const { data, error } = result;

    if (error) {
      setErrorMsg(error.message);
    } else {
      // If signup was successful and auto-confirm is on, 
      // Supabase automatically logs them in, which triggers App.js to switch views.
      if (isSignUp && !data.session) {
        setErrorMsg("Please check your email to confirm your account.");
      }
    }
    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.header}>Pathfinder</h1>
        <p style={styles.description}>
          {isSignUp ? 'Create a new account' : 'Sign in to continue'}
        </p>

        <form onSubmit={handleAuth}>
          <input
            style={styles.input}
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            style={styles.input}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          
          <button style={styles.button} disabled={loading}>
            {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Log In')}
          </button>
        </form>

        {errorMsg && <p style={{color: 'red', marginTop: '10px'}}>{errorMsg}</p>}

        <div style={{marginTop: '20px', fontSize: '14px'}}>
          {isSignUp ? "Already have an account? " : "Don't have an account? "}
          <span 
            onClick={() => { setIsSignUp(!isSignUp); setErrorMsg(''); }}
            style={{color: '#2563EB', cursor: 'pointer', fontWeight: 'bold'}}
          >
            {isSignUp ? 'Log In' : 'Sign Up'}
          </span>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f3f4f6' },
  card: { background: 'white', padding: '40px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', textAlign: 'center', width: '320px' },
  header: { color: '#2563EB', marginBottom: '5px', marginTop: 0 },
  description: { color: '#666', marginBottom: '20px', fontSize: '14px' },
  input: { width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '5px', border: '1px solid #ddd', boxSizing: 'border-box', fontSize: '14px' },
  button: { width: '100%', padding: '12px', background: '#2563EB', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', marginTop: '10px' }
};