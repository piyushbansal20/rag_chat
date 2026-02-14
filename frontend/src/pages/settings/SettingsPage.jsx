import { useAuth } from '../../context/AuthContext.jsx';
import { Card, CardHeader, CardTitle, CardContent, Button, Input } from '../../components/ui/index.js';

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Settings
      </h1>

      {/* Profile */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={user?.firstName || ''}
              disabled
            />
            <Input
              label="Last Name"
              value={user?.lastName || ''}
              disabled
            />
          </div>
          <Input
            label="Email"
            value={user?.email || ''}
            disabled
          />
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Contact your administrator to update your profile information.
          </p>
        </CardContent>
      </Card>

      {/* Company */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Company</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm text-gray-500 dark:text-slate-400">Company Name</p>
            <p className="font-medium text-gray-900 dark:text-white">
              {user?.company?.name || 'N/A'}
            </p>
          </div>
          <div className="mt-4 space-y-2">
            <p className="text-sm text-gray-500 dark:text-slate-400">Your Role</p>
            <p className="font-medium text-gray-900 dark:text-white capitalize">
              {user?.role || 'N/A'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
            Account created on{' '}
            {user?.createdAt
              ? new Date(user.createdAt).toLocaleDateString()
              : 'N/A'}
          </p>
          <Button variant="outline" disabled>
            Change Password
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
