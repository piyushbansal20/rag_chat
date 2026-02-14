import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { AppLayout, AuthLayout } from '../components/layout/index.js';
import ProtectedRoute from '../components/auth/ProtectedRoute.jsx';
import PublicRoute from '../components/auth/PublicRoute.jsx';

// Auth pages
import LoginPage from '../pages/auth/LoginPage.jsx';
import RegisterPage from '../pages/auth/RegisterPage.jsx';

// App pages
import ChatPage from '../pages/chat/ChatPage.jsx';
import DocumentsPage from '../pages/documents/DocumentsPage.jsx';
import DashboardPage from '../pages/dashboard/DashboardPage.jsx';
import SettingsPage from '../pages/settings/SettingsPage.jsx';

// Error page
import NotFoundPage from '../pages/NotFoundPage.jsx';

const router = createBrowserRouter([
  // Public routes (auth)
  {
    element: (
      <PublicRoute>
        <AuthLayout />
      </PublicRoute>
    ),
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },

  // Protected routes (app)
  {
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/chat" replace /> },
      { path: '/chat', element: <ChatPage /> },
      { path: '/chat/:sessionId', element: <ChatPage /> },
      { path: '/documents', element: <DocumentsPage /> },
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/settings', element: <SettingsPage /> },
    ],
  },

  // 404
  { path: '*', element: <NotFoundPage /> },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
