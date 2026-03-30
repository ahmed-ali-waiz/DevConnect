import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useSelector } from 'react-redux';
import AppLayout from './components/layout/AppLayout';

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
import CallOverlay from './components/call/CallOverlay';
import CallScreen from './components/call/CallScreen';

function App() {
  const { token } = useSelector((state) => state.auth);
  const isAuth = !!token;

  return (
    <div className="min-h-screen bg-(--bg-primary) text-(--text-primary) font-body transition-colors duration-300">
      {/* Global call UI — renders above everything */}
      <CallOverlay />
      <CallScreen />
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
          <Route path="/" element={isAuth ? <HomePage /> : <Navigate to="/login" replace />} />
          <Route path="/post/:postId" element={isAuth ? <PostPage /> : <Navigate to="/login" replace />} />
          <Route path="/profile/:username" element={isAuth ? <ProfilePage /> : <Navigate to="/login" replace />} />
          <Route path="/chat" element={isAuth ? <ChatPage /> : <Navigate to="/login" replace />} />
          <Route path="/notifications" element={isAuth ? <NotificationsPage /> : <Navigate to="/login" replace />} />
          <Route path="/search" element={isAuth ? <SearchPage /> : <Navigate to="/login" replace />} />
          <Route path="/bookmarks" element={isAuth ? <BookmarksPage /> : <Navigate to="/login" replace />} />
          <Route path="/settings" element={isAuth ? <SettingsPage /> : <Navigate to="/login" replace />} />
          <Route path="/admin" element={isAuth ? <AdminPage /> : <Navigate to="/login" replace />} />
          <Route path="/trending" element={isAuth ? <SearchPage /> : <Navigate to="/login" replace />} />
        </Route>
      </Routes>
    </div>
  );
}

export default App;
