import React from 'react';
import { useAuth, authAvailable } from '../data/auth.js';

/**
 * Persistent top navigation: brand → home, My Landscapes, and the account
 * entry point. Auth state is visible on every screen — signed out shows
 * "Sign in", signed in shows an initial avatar that opens the account page.
 */
export default function Header({ onHome, onMyLandscapes, onArchetypes, onAccount, onSignIn }) {
  const { user } = useAuth();
  const initial = user?.email?.[0]?.toUpperCase() || '?';

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '1rem',
      paddingBottom: '0.85rem',
      marginBottom: '0.5rem',
      borderBottom: '1px solid var(--color-border-subtle)',
    }}>
      <button
        onClick={onHome}
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '1.15rem',
          color: 'var(--color-text)',
          padding: 0,
        }}
      >
        Love Landscape
      </button>

      <nav style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {onArchetypes && (
          <button
            onClick={onArchetypes}
            style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}
          >
            Archetypes
          </button>
        )}
        <button
          onClick={onMyLandscapes}
          style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}
        >
          My Landscapes
        </button>

        {authAvailable && (
          user ? (
            <button
              onClick={onAccount}
              title={user.email}
              aria-label="Account"
              style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                background: 'var(--color-accent)',
                color: '#fff',
                fontSize: '0.85rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {initial}
            </button>
          ) : (
            <button
              className="btn-secondary"
              onClick={onSignIn}
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.9rem' }}
            >
              Sign in
            </button>
          )
        )}
      </nav>
    </header>
  );
}
