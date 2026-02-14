import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Building2, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { Button, Card, CardHeader, CardTitle, CardContent } from '../../components/ui/index.js';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const { register, isRegisterLoading } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    companyName: '',
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validatePassword = (password) => {
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[@$!%*?&]/.test(password);
    const hasMinLength = password.length >= 8;

    if (!hasMinLength) return 'Password must be at least 8 characters';
    if (!hasUppercase) return 'Password must contain an uppercase letter';
    if (!hasLowercase) return 'Password must contain a lowercase letter';
    if (!hasNumber) return 'Password must contain a number';
    if (!hasSpecial) return 'Password must contain a special character (@$!%*?&)';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    const newErrors = {};
    if (!formData.firstName) newErrors.firstName = 'First name is required';
    if (!formData.lastName) newErrors.lastName = 'Last name is required';
    if (!formData.email) newErrors.email = 'Email is required';
    if (!formData.companyName) newErrors.companyName = 'Company name is required';

    const passwordError = validatePassword(formData.password);
    if (passwordError) newErrors.password = passwordError;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await register(formData);
      toast.success('Account created successfully!');
      navigate('/chat');
    } catch (error) {
      const message =
        error.response?.data?.message || 'Registration failed. Please try again.';
      toast.error(message);
    }
  };

  const inputClasses = (hasError) =>
    `w-full pl-12 pr-4 py-3 rounded-xl border ${
      hasError
        ? 'border-red-500 focus:ring-red-500/50'
        : 'border-gray-200 dark:border-slate-700 focus:ring-blue-500/50 focus:border-blue-500'
    } bg-white dark:bg-slate-800/50 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all`;

  return (
    <Card className="shadow-xl shadow-gray-200/50 dark:shadow-none border-gray-200 dark:border-slate-700">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-2xl">Create your account</CardTitle>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-2">
          Start your journey with Knowledge AI
        </p>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                First name
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  name="firstName"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={handleChange}
                  className={inputClasses(errors.firstName)}
                />
              </div>
              {errors.firstName && (
                <p className="mt-1.5 text-xs text-red-500">{errors.firstName}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Last name
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  name="lastName"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={handleChange}
                  className={inputClasses(errors.lastName)}
                />
              </div>
              {errors.lastName && (
                <p className="mt-1.5 text-xs text-red-500">{errors.lastName}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Company name
            </label>
            <div className="relative">
              <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                name="companyName"
                placeholder="Acme Inc."
                value={formData.companyName}
                onChange={handleChange}
                className={inputClasses(errors.companyName)}
              />
            </div>
            {errors.companyName && (
              <p className="mt-1.5 text-xs text-red-500">{errors.companyName}</p>
            )}
          </div>

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
                className={inputClasses(errors.email)}
              />
            </div>
            {errors.email && (
              <p className="mt-1.5 text-xs text-red-500">{errors.email}</p>
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
                placeholder="Create a strong password"
                value={formData.password}
                onChange={handleChange}
                autoComplete="new-password"
                className={inputClasses(errors.password)}
              />
            </div>
            {errors.password && (
              <p className="mt-1.5 text-xs text-red-500">{errors.password}</p>
            )}
            <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
              8+ characters with uppercase, lowercase, number, and special character
            </p>
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full"
            isLoading={isRegisterLoading}
          >
            Create account
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-100 dark:border-slate-700">
          <p className="text-center text-sm text-gray-500 dark:text-slate-400">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-blue-600 hover:text-blue-500 font-semibold transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
