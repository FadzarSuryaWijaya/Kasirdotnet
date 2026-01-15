import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { authApi } from './api';

export interface UserInfo {
  id: string;
  name: string;
  role: string;
}

// Helper to decode JWT and get user info
export function decodeToken(token: string): UserInfo | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    
    // DEBUG: Log entire payload to see what's actually in the JWT
    console.log('JWT Payload:', JSON.stringify(payload, null, 2));
    
    // Check all possible role claim names
    const rawRole = 
      payload.role || 
      payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
      'User';
    
    const normalizedRole = rawRole.charAt(0).toUpperCase() + rawRole.slice(1).toLowerCase();
    
    console.log('Raw Role:', rawRole, '-> Normalized:', normalizedRole);
    
    return {
      id: payload.nameid || payload.sub || payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || '',
      name: payload.name || payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || 'User',
      role: normalizedRole
    };
  } catch (e) {
    console.error('Failed to decode token:', e);
    return null;
  }
}

// Helper to get user info from localStorage
export function getUserInfoFromStorage(): UserInfo | null {
  if (typeof window === 'undefined') return null;
  
  const userInfo = localStorage.getItem('userInfo');
  if (userInfo) {
    try {
      return JSON.parse(userInfo);
    } catch (e) {
      console.error('Failed to parse userInfo from localStorage:', e);
    }
  }
  
  // Fallback: try to decode from token
  const token = authApi.getToken();
  if (token) {
    const decoded = decodeToken(token);
    if (decoded) {
      localStorage.setItem('userInfo', JSON.stringify(decoded));
      return decoded;
    }
  }
  
  return null;
}

// Hook to check authentication and redirect if needed
export function useAuth() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    const authenticated = authApi.isAuthenticated();
    setIsAuthenticated(authenticated);
    
    if (!authenticated) {
      setLoading(false);
      return;
    }

    // Get user info from localStorage or decode from token
    const userInfo = getUserInfoFromStorage();
    setUser(userInfo);
    setLoading(false);
  }, [router]);

  return { isAuthenticated, loading, user };
}

// Hook to get current token
export function useToken() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setToken(authApi.getToken());
  }, []);

  return token;
}

// Logout function
export function logout() {
  authApi.logout();
  if (typeof window !== 'undefined') {
    localStorage.removeItem('userInfo');
    window.location.href = '/login';
  }
}
