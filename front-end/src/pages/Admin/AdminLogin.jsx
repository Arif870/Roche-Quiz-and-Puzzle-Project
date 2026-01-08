import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';

const DEFAULT_ADMIN = {
  email: 'admin@roche.com',
  password: 'letmein123'
};

const AdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const storedSession = useMemo(() => {
    const raw = sessionStorage.getItem('adminSession');
    return raw ? JSON.parse(raw) : null;
  }, []);

  useEffect(() => {
    if (storedSession?.email) {
      navigate('/admin', { replace: true });
    }
  }, [storedSession, navigate]);

  if (storedSession?.email) {
    return <Navigate to="/admin" replace />;
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    const isValid =
      trimmedEmail === DEFAULT_ADMIN.email &&
      trimmedPassword === DEFAULT_ADMIN.password;

    if (!isValid) {
      setError('Invalid credentials. Try admin@roche.com / letmein123 for local testing.');
      return;
    }

    sessionStorage.setItem(
      'adminSession',
      JSON.stringify({ email: trimmedEmail, loggedInAt: new Date().toISOString() })
    );
    navigate('/admin', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-2xl">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">Admin Login</h1>
        <p className="text-sm text-gray-600 mb-6 text-center">
          Secure access for quiz/puzzle control. Use the seeded credentials while the real auth
          service is not wired up.
        </p>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="admin@roche.com"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition"
          >
            Login
          </button>
        </form>

        <div className="mt-6 text-xs text-gray-500 space-y-1">
          <p>• QR-based player onboarding remains unchanged.</p>
          <p>• Once logged in, you can compose events, puzzles, and question banks.</p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
