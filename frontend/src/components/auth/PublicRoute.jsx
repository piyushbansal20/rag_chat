import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { Spinner } from '../ui/index.js';

export default function PublicRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/chat" replace />;
  }

  return children;
}
