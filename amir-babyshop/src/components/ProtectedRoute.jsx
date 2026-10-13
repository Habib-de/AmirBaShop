import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-4">🚫</div>
        <h1 className="text-2xl font-black mb-2">Access denied</h1>
        <p className="text-sm text-amir-dark/60 font-semibold mb-6">
          Your role ({user.role}) doesn't have permission to view this page.
        </p>
        <a href="/" className="btn-primary inline-flex">Back to home</a>
      </div>
    );
  }

  return children;
}