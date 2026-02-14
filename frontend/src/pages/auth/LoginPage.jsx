import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { Button, Card, CardHeader, CardTitle, CardContent } from '../../components/ui/index.js';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login, isLoginLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState({});

  const from = location.state?.from?.pathname || '/chat';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    const newErrors = {};
    if (!formData.email) newErrors.email = 'Email is required';
    if (!formData.password) newErrors.password = 'Password is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await login(formData);
      toast.success('Welcome back!');
      navigate(from, { replace: true });
    } catch (error) {
      const message =
        error.response?.data?.message || 'Login failed. Please try again.';
      toast.error(message);
    }
  };

  return (
    <Card className="shadow-xl shadow-gray-200/50 dark:shadow-none border-gray-200 dark:border-slate-700">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-2xl">Welcome back</CardTitle>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-2">
          Sign in to your account to continue
        </p>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Email address
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="email"
                name="email"
                placeholder="you@company.com"
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
                className={`w-full pl-12 pr-4 py-3 rounded-xl border ${
                  errors.email
                    ? 'border-red-500 focus:ring-red-500/50'
                    : 'border-gray-200 dark:border-slate-700 focus:ring-blue-500/50 focus:border-blue-500'
                } bg-white dark:bg-slate-800/50 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all`}
              />
            </div>
            {errors.email && (
              <p className="mt-2 text-sm text-red-500">{errors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="password"
                name="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                autoComplete="current-password"
                className={`w-full pl-12 pr-4 py-3 rounded-xl border ${
                  errors.password
                    ? 'border-red-500 focus:ring-red-500/50'
                    : 'border-gray-200 dark:border-slate-700 focus:ring-blue-500/50 focus:border-blue-500'
                } bg-white dark:bg-slate-800/50 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all`}
              />
            </div>
            {errors.password && (
              <p className="mt-2 text-sm text-red-500">{errors.password}</p>
            )}
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full"
            isLoading={isLoginLoading}
          >
            Sign in
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-100 dark:border-slate-700">
          <p className="text-center text-sm text-gray-500 dark:text-slate-400">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="text-blue-600 hover:text-blue-500 font-semibold transition-colors"
            >
              Create account
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
