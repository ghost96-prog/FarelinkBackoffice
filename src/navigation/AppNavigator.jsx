// components/AppNavigator.jsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthenticatedApp from '../components/AuthenticatedApp';
import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import EnterVerificationScreen from '../screens/EnterVerificationScreen';

const AppNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px',
        background: 'linear-gradient(135deg, #1a5b7b, #276482)',
        color: 'white'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '4px solid rgba(255,255,255,0.3)',
            borderTop: '4px solid white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 15px'
          }}></div>
          Loading...
        </div>
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/welcome" element={<WelcomeScreen />} />
      <Route path="/login" element={<LoginScreen />} />
      <Route path="/register" element={<RegisterScreen />} />
      <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
<Route path="/enter-verification" element={<EnterVerificationScreen />} />      
      {/* Root path redirects to welcome or dashboard */}
      <Route path="/" element={
        isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/welcome" replace />
      } />
      
      {/* Protected routes - all other routes go through AuthenticatedApp */}
      <Route path="/*" element={
        isAuthenticated ? <AuthenticatedApp /> : <Navigate to="/login" replace />
      } />
    </Routes>
  );
};

export default AppNavigator;