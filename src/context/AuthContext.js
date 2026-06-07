'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// Context & Hook
// ---------------------------------------------------------------------------
const AuthContext = createContext(undefined);

/**
 * Hook to access the current auth context.
 * Must be used within an <AuthProvider>.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// ---------------------------------------------------------------------------
// Default expense categories seeded on sign-up
// ---------------------------------------------------------------------------
const DEFAULT_CATEGORIES = [
  { name: 'Food & Drinks', icon: '🍔', color: '#ef4444' },
  { name: 'Transport', icon: '🚗', color: '#f59e0b' },
  { name: 'Education', icon: '📚', color: '#6366f1' },
  { name: 'Entertainment', icon: '🎮', color: '#8b5cf6' },
  { name: 'Shopping', icon: '🛒', color: '#06b6d4' },
  { name: 'Health', icon: '💊', color: '#10b981' },
  { name: 'Housing', icon: '🏠', color: '#f97316' },
  { name: 'Subscriptions', icon: '📱', color: '#ec4899' },
  { name: 'Utilities', icon: '💡', color: '#eab308' },
  { name: 'Other', icon: '🎁', color: '#64748b' },
];

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // -----------------------------------------------------------------------
  // Fetch profile helper
  // -----------------------------------------------------------------------
  const fetchProfile = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = "no rows returned" — acceptable during sign-up race
        console.error('Error fetching profile:', error.message);
      }

      setProfile(data ?? null);
    } catch (err) {
      console.error('Unexpected error fetching profile:', err);
      setProfile(null);
    }
  }, []);

  // -----------------------------------------------------------------------
  // Refresh profile (exposed to consumers)
  // -----------------------------------------------------------------------
  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  // -----------------------------------------------------------------------
  // Bootstrap: get initial session & subscribe to auth changes
  // -----------------------------------------------------------------------
  useEffect(() => {
    // 1. Check for an existing session
    const getInitialSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          await fetchProfile(currentUser.id);
        }
      } catch (err) {
        console.error('Error getting initial session:', err);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // 2. Listen for auth state changes (sign in, sign out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        await fetchProfile(currentUser.id);
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // -----------------------------------------------------------------------
  // Sign In
  // -----------------------------------------------------------------------
  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  };

  // -----------------------------------------------------------------------
  // Sign Up — also creates the profile row and seeds default categories
  // -----------------------------------------------------------------------
  const signUp = async (email, password, fullName, hourlyRate) => {
    // 1. Create the auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) throw authError;

    const newUser = authData.user;
    if (!newUser) throw new Error('Sign-up succeeded but no user was returned.');

    // 2. Insert the profile row
    const { error: profileError } = await supabase.from('profiles').insert({
      id: newUser.id,
      full_name: fullName,
      hourly_rate: hourlyRate ?? 0,
    });

    if (profileError) {
      console.error('Error creating profile:', profileError.message);
      throw profileError;
    }

    // 3. Seed default expense categories
    const categoryRows = DEFAULT_CATEGORIES.map((cat) => ({
      user_id: newUser.id,
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      is_default: true,
    }));

    const { error: categoriesError } = await supabase
      .from('categories')
      .insert(categoryRows);

    if (categoriesError) {
      console.error('Error seeding default categories:', categoriesError.message);
      // Non-fatal: the user can still use the app and add categories manually
    }

    return authData;
  };

  // -----------------------------------------------------------------------
  // Sign Out
  // -----------------------------------------------------------------------
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    setUser(null);
    setProfile(null);
  };

  // -----------------------------------------------------------------------
  // Context value
  // -----------------------------------------------------------------------
  const value = {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
