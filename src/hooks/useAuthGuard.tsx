import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export const useAuthGuard = () => {
  const { user, loading, isAuthorized } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Don't redirect while still loading
    if (loading) return;

    // Redirect to login if not authenticated
    if (!user) {
      navigate('/auth');
      return;
    }

    // Redirect to access denied if not authorized
    if (user && !isAuthorized) {
      navigate('/access-denied');
      return;
    }
  }, [user, loading, isAuthorized, navigate]);

  return {
    user,
    loading,
    isAuthorized,
    isAuthenticated: !!user,
    canAccess: !!user && isAuthorized
  };
};