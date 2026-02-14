import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/index.js';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-gray-200 dark:text-gray-800">
          404
        </h1>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-4">
          Page Not Found
        </h2>
        <p className="text-gray-500 mt-2 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Button onClick={() => window.history.back()} variant="outline">
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
          <Link to="/">
            <Button>
              <Home className="h-4 w-4" />
              Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
