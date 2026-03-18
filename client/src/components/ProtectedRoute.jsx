import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

const publicPaths = ['/login', '/register', '/forgot-password'];

const ProtectedRoute = ({ children }) => {
  const { user, token } = useSelector((state) => state.auth);
  const location = useLocation();
  const isPublicPath = publicPaths.some((p) => location.pathname.startsWith(p));

  if (isPublicPath) {
    if (token && user) {
      return <Navigate to="/" replace />;
    }
    return children;
  }

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
