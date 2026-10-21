import React from 'react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import {
  Wallet,
  LayoutDashboard,
  ReceiptText,
  SlidersHorizontal,
  PiggyBank,
  LogOut,
  Sun,
  Moon,
} from 'lucide-react'

interface NavbarProps {
  activeTab: 'dashboard' | 'expenses' | 'limits' | 'savings'
  setActiveTab: (tab: 'dashboard' | 'expenses' | 'limits' | 'savings') => void
  onOpenProfile: () => void
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, onOpenProfile }) => {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'expenses', label: 'Pengeluaran', icon: ReceiptText },
    { id: 'limits', label: 'Batas Anggaran', icon: SlidersHorizontal },
    { id: 'savings', label: 'Tabungan', icon: PiggyBank },
  ] as const

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800/90 shadow-xs transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18">
          {/* Logo */}
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => setActiveTab('dashboard')}
          >
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-600/30 group-hover:scale-105 transition duration-200">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white block leading-tight">
                  Tiero<span className="text-indigo-600 dark:text-indigo-400">Saver</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-medium border border-indigo-100 dark:border-indigo-800/60 hidden sm:inline-block">
                  Pro
                </span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal tracking-tight block">
                Smart Finance & Budget Tracker
              </span>
            </div>
          </div>

          {/* Navigation Tabs - Desktop */}
          <nav className="hidden md:flex items-center p-1 bg-slate-100/90 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                    isActive
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200/50 dark:border-slate-600'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-slate-700/40'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              )
            })}
          </nav>

          {/* User info, Theme Switcher & Logout */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Dark Mode Switcher Button */}
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 border border-slate-200/80 dark:border-slate-700/70 transition"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400 transition-transform duration-300 rotate-0 hover:rotate-90" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600 transition-transform duration-300 hover:-rotate-12" />
              )}
            </button>

            {/* User Profile Pill Button */}
            <button
              type="button"
              onClick={onOpenProfile}
              title="Buka Pengaturan Profil & Akun"
              className="flex items-center gap-2 sm:gap-2.5 py-1 px-2 sm:px-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 border border-slate-200/70 dark:border-slate-700/70 transition cursor-pointer group"
            >
              <div className="w-7 h-7 rounded-lg bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center text-xs font-semibold shadow-xs overflow-hidden shrink-0">
                {user?.avatar_url ? (
                  user.avatar_url.length <= 4 ? (
                    <span className="text-sm select-none">{user.avatar_url}</span>
                  ) : (
                    <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
                  )
                ) : (
                  user?.name ? user.name.charAt(0).toUpperCase() : 'U'
                )}
              </div>
              <div className="text-left text-xs hidden sm:block">
                <p className="font-semibold text-slate-800 dark:text-slate-200 leading-tight truncate max-w-[120px] group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                  {user?.name}
                </p>
              </div>
            </button>

            {/* Logout Button */}
            <button
              onClick={logout}
              title="Keluar Akun"
              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition border border-transparent hover:border-rose-100 dark:hover:border-rose-900/40"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
