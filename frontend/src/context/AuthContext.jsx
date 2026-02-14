import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { authAPI } from '../api/auth.api.js';
import {
  setTokens,
  clearTokens,
  getAccessToken,
  getRefreshToken,
} from '../lib/axios.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasToken, setHasToken] = useState(!!getAccessToken());

  // Try to refresh token on mount if refresh token exists but access token doesn't
  useEffect(() => {
    const tryRefreshToken = async () => {
      const accessToken = getAccessToken();
      const refreshToken = getRefreshToken();

      console.log('[Auth] Init - accessToken:', !!accessToken, 'refreshToken:', !!refreshToken);

      if (!accessToken && refreshToken) {
        try {
          console.log('[Auth] Attempting token refresh...');
          const response = await authAPI.refreshToken(refreshToken);
          console.log('[Auth] Refresh response:', response.data);
          const { accessToken: newAccessToken } = response.data.data;
          setTokens(newAccessToken, null);
          setHasToken(true);
          console.log('[Auth] Token refreshed successfully');
        } catch (error) {
          console.error('[Auth] Refresh failed:', error);
          clearTokens();
          setHasToken(false);
        }
      } else if (accessToken) {
        setHasToken(true);
      }
      setIsInitialized(true);
    };

    tryRefreshToken();
  }, []);

  // Fetch current user
  const {
    data: user,
    isLoading,
    error,
    refetch: refetchUser,
  } = useQuery({
    queryKey: ['auth', 'user'],
    queryFn: async () => {
      const response = await authAPI.getCurrentUser();
      return response.data.data;
    },
    enabled: isInitialized && hasToken,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: authAPI.login,
    onSuccess: (response) => {
      const { accessToken, refreshToken, user } = response.data.data;
      setTokens(accessToken, refreshToken);
      setHasToken(true);
      queryClient.setQueryData(['auth', 'user'], user);
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: authAPI.register,
    onSuccess: (response) => {
      const { accessToken, refreshToken, user } = response.data.data;
      setTokens(accessToken, refreshToken);
      setHasToken(true);
      queryClient.setQueryData(['auth', 'user'], user);
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: () => {
      const refreshToken = getRefreshToken();
      return authAPI.logout(refreshToken);
    },
    onSettled: () => {
      clearTokens();
      setHasToken(false);
      queryClient.clear();
    },
  });

  const login = useCallback(
    async (credentials) => {
      return loginMutation.mutateAsync(credentials);
    },
    [loginMutation]
  );

  const register = useCallback(
    async (userData) => {
      return registerMutation.mutateAsync(userData);
    },
    [registerMutation]
  );

  const logout = useCallback(async () => {
    return logoutMutation.mutateAsync();
  }, [logoutMutation]);

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading: !isInitialized || (hasToken && isLoading),
    isLoginLoading: loginMutation.isPending,
    isRegisterLoading: registerMutation.isPending,
    loginError: loginMutation.error,
    registerError: registerMutation.error,
    login,
    register,
    logout,
    refetchUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
