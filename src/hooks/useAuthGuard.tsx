import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export const useAuthGuard = () => {
  const { user, loading, isAuthorized } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    console.log('🔒 AuthGuard DEBUG:', { 
      user: user?.email, 
      loading, 
      isAuthorized,
      willRedirect: !loading && (!user || (user && !isAuthorized))
    });
    
    // Don't redirect while still loading
    if (loading) return;

    // Redirect to login if not authenticated
    if (!user) {
      console.log('🔒 AuthGuard: Redirecting to /auth - no user');
      navigate('/auth');
      return;
    }

    // Redirect to access denied if not authorized
    if (user && !isAuthorized) {
      console.log('🔒 AuthGuard: Redirecting to /access-denied - user not authorized');
      navigate('/access-denied');
      return;
    }
    
    console.log('🔒 AuthGuard: User authorized, no redirect needed');
  }, [user, loading, isAuthorized, navigate]);

  return {
    user,
    loading,
    isAuthorized,
    isAuthenticated: !!user,
    canAccess: !!user && isAuthorized
  };
};