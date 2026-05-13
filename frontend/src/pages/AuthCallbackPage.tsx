import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useAuthStore } from '../store/useAuthStore';

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setAuth } = useAuthStore();

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      navigate('/login?error=oauth_failed');
      return;
    }

    // Fetch user profile using the token
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    api.get('/users/profile')
      .then(({ data }) => {
        setAuth(data.data, token);
        navigate('/');
      })
      .catch(() => {
        navigate('/login?error=oauth_failed');
      });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="inline-flex w-16 h-16 rounded-full bg-gray-100 items-center justify-center mb-4">
          <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900">Signing you in...</h2>
        <p className="text-gray-500 mt-1">Please wait a moment</p>
      </div>
    </div>
  );
}
