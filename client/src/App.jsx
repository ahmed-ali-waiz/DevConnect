import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useSelector } from 'react-redux';
import AppLayout from './components/layout/AppLayout';
import { isProfileComplete } from './utils/profile';

// Page imports
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import ChatPage from './pages/ChatPage';
import NotificationsPage from './pages/NotificationsPage';
import SearchPage from './pages/SearchPage';
import BookmarksPage from './pages/BookmarksPage';
import SettingsPage from './pages/SettingsPage';
import AdminPage from './pages/AdminPage';
import PostPage from './pages/PostPage';
import OnboardingPage from './pages/OnboardingPage';

function App() {
  const { token, user } = useSelector((state) => state.auth);
  const location = useLocation();
  const isAuth = !!token;
  const needsOnboarding = isAuth && user && !isProfileComplete(user);

  return (
    <div className="min-h-screen bg-(--bg-primary) text-(--text-primary) font-body transition-colors duration-300">
      <Toaster 
        position="top-right" 
        toastOptions={{
          style: {
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            backdropFilter: 'blur(10px)',
            border: '1px solid var(--border-glass)',
          }
        }} 
      />
      <Routes>
        <Route path="/login" element={isAuth ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route path="/register" element={isAuth ? <Navigate to="/" replace /> : <RegisterPage />} />
        <Route path="/forgot-password" element={isAuth ? <Navigate to="/" replace /> : <ForgotPasswordPage />} />
        <Route path="/reset-password" element={isAuth ? <Navigate to="/" replace /> : <ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route element={<AppLayout />}>
          <Route
            path="/onboarding"
            element={isAuth ? (needsOnboarding ? <OnboardingPage /> : <Navigate to="/" replace />) : <Navigate to="/login" replace />}
          />
          <Route
            path="/"
            element={
              isAuth
                ? needsOnboarding && location.pathname !== '/onboarding'
                  ? <Navigate to="/onboarding" replace />
                  : <HomePage />
                : <Navigate to="/login" replace />
            }
          />
          <Route
            path="/post/:postId"
            element={
              isAuth
                ? needsOnboarding && location.pathname !== '/onboarding'
                  ? <Navigate to="/onboarding" replace />
                  : <PostPage />
                : <Navigate to="/login" replace />
            }
          />
          <Route
            path="/profile/:username"
            element={
              isAuth
                ? needsOnboarding && location.pathname !== '/onboarding'
                  ? <Navigate to="/onboarding" replace />
                  : <ProfilePage />
                : <Navigate to="/login" replace />
            }
          />
          <Route
            path="/chat"
            element={
              isAuth
                ? needsOnboarding && location.pathname !== '/onboarding'
                  ? <Navigate to="/onboarding" replace />
                  : <ChatPage />
                : <Navigate to="/login" replace />
            }
          />
          <Route
            path="/notifications"
            element={
              isAuth
                ? needsOnboarding && location.pathname !== '/onboarding'
                  ? <Navigate to="/onboarding" replace />
                  : <NotificationsPage />
                : <Navigate to="/login" replace />
            }
          />
          <Route
            path="/search"
            element={
              isAuth
                ? needsOnboarding && location.pathname !== '/onboarding'
                  ? <Navigate to="/onboarding" replace />
                  : <SearchPage />
                : <Navigate to="/login" replace />
            }
          />
          <Route
            path="/bookmarks"
            element={
              isAuth
                ? needsOnboarding && location.pathname !== '/onboarding'
                  ? <Navigate to="/onboarding" replace />
                  : <BookmarksPage />
                : <Navigate to="/login" replace />
            }
          />
          <Route
            path="/settings"
            element={
              isAuth
                ? needsOnboarding && location.pathname !== '/onboarding'
                  ? <Navigate to="/onboarding" replace />
                  : <SettingsPage />
                : <Navigate to="/login" replace />
            }
          />
          <Route
            path="/admin"
            element={
              isAuth
                ? needsOnboarding && location.pathname !== '/onboarding'
                  ? <Navigate to="/onboarding" replace />
                  : <AdminPage />
                : <Navigate to="/login" replace />
            }
          />
          <Route
            path="/trending"
            element={
              isAuth
                ? needsOnboarding && location.pathname !== '/onboarding'
                  ? <Navigate to="/onboarding" replace />
                  : <SearchPage />
                : <Navigate to="/login" replace />
            }
          />
        </Route>
      </Routes>
    </div>
  );
}

export default App;
