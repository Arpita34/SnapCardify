import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setMenuOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold">
            G
          </div>
          <span className="text-lg font-bold text-gray-900">GreetCraft</span>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 pl-3 pr-1 py-1 rounded border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm text-gray-700 hidden sm:block">{user.name.split(' ')[0]}</span>
                {user.subscriptionStatus === 'premium' && (
                  <span className="badge-premium text-xs py-0.5 px-1.5 hidden sm:inline-flex">PRO</span>
                )}
                <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center">
                  {user.profilePicture ? (
                    <img src={user.profilePicture} alt={user.name} className="w-full h-full object-cover rounded" />
                  ) : (
                    <span className="text-white text-xs font-bold">{user.name[0]?.toUpperCase()}</span>
                  )}
                </div>
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded shadow-md py-1">
                  <Link
                    to="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    My Profile
                  </Link>
                  <div className="h-px bg-gray-200 my-1" />
                  <button
                    onClick={handleLogout}
                    className="w-full block px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" className="btn-secondary text-sm py-2 px-4">Sign In</Link>
              <Link to="/login" className="btn-primary text-sm py-2 px-4">Get Started</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
