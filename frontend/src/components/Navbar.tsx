// src/components/Navbar.tsx
import React from 'react';
import { Menu, Bell, User, LogOut, Store } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ThemeToggle } from './ui/ThemeToggle';

interface NavbarProps {
  onMenuClick: () => void;
  onLogout: () => void;
  user: { name: string; role: string; email?: string };
  companyName?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  onMenuClick,
  onLogout,
  user,
  companyName = 'PharmacyPOS',
}) => {
  return (
    <header className="fixed top-0 right-0 left-0 lg:left-64 h-16 z-30 bg-white/80 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-800 backdrop-blur-xl theme-transition">
      <div className="flex items-center justify-between h-full px-5">

        {/* Left */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="p-2 rounded-xl lg:hidden text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="hidden md:flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 flex items-center justify-center shadow-sm">
              <Store className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-900 dark:text-white leading-none">
                {companyName}
              </h1>
              <p className="text-xs mt-0.5 text-gray-500 dark:text-gray-400">
                Management System
              </p>
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          <ThemeToggle />

          {/* Notifications */}
          <div className="relative group">
            <button className="relative p-2 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 transition-colors">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 border-2 border-white dark:border-gray-900" />
            </button>

            {/* Notification Dropdown */}
            <div className="absolute top-full right-0 mt-2 w-80 rounded-xl shadow-xl p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  Notifications
                </p>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                  3 new
                </span>
              </div>

              <div className="space-y-2">
                <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Low Stock Alert
                  </p>
                  <p className="text-xs mt-0.5 text-gray-600 dark:text-gray-400">
                    5 products are running low
                  </p>
                  <p className="text-xs mt-1.5 text-gray-500 dark:text-gray-500">
                    2 min ago
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    New Sale Completed
                  </p>
                  <p className="text-xs mt-0.5 text-gray-600 dark:text-gray-400">
                    Transaction #TRX-0012
                  </p>
                  <p className="text-xs mt-1.5 text-gray-500 dark:text-gray-500">
                    5 min ago
                  </p>
                </div>
              </div>

              <button className="w-full mt-3 text-xs font-medium py-2 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors">
                View All Notifications
              </button>
            </div>
          </div>

          <div className="h-8 w-px mx-1 bg-gray-200 dark:bg-gray-700" />

          {/* User menu */}
          <div className="flex items-center gap-2.5">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-semibold text-gray-900 dark:text-white leading-none">
                {user.name}
              </p>
              <p className="text-xs mt-0.5 capitalize text-gray-500 dark:text-gray-400">
                {user.role}
              </p>
            </div>

            <div className="relative group">
              <button className="w-9 h-9 rounded-full flex items-center justify-center shadow-sm bg-gradient-to-r from-purple-600 to-indigo-600">
                <User className="h-4 w-4 text-white" />
              </button>

              {/* User Dropdown */}
              <div className="absolute top-full right-0 mt-2 w-56 rounded-xl shadow-xl p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-3 pb-3 mb-3 border-b border-gray-200 dark:border-gray-700">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-r from-purple-600 to-indigo-600">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate text-gray-900 dark:text-white">
                      {user.name}
                    </p>
                    <p className="text-xs capitalize truncate text-gray-500 dark:text-gray-400">
                      {user.role}
                    </p>
                  </div>
                </div>

                <div className="space-y-0.5">
                  <Link
                    to="/dashboard/profile"
                    className="block px-3 py-2 text-sm rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    Profile Settings
                  </Link>
                  <Link
                    to="#"
                    className="block px-3 py-2 text-sm rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    Account Preferences
                  </Link>
                  <Link
                    to="#"
                    className="block px-3 py-2 text-sm rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    Help & Support
                  </Link>
                </div>

                <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={onLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};