import React from 'react'
import {
  LayoutDashboard,
  ReceiptText,
  SlidersHorizontal,
  PiggyBank,
  Plus,
} from 'lucide-react'

interface BottomNavProps {
  activeTab: 'dashboard' | 'expenses' | 'limits' | 'savings'
  setActiveTab: (tab: 'dashboard' | 'expenses' | 'limits' | 'savings') => void
  onOpenAddExpense: () => void
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  onOpenAddExpense,
}) => {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800/80 px-3 py-2 pb-safe">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {/* Dashboard */}
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition ${
            activeTab === 'dashboard'
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-medium'
          }`}
        >
          <div className="relative">
            <LayoutDashboard className="w-5 h-5" />
            {activeTab === 'dashboard' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
            )}
          </div>
          <span className="text-[10px] tracking-tight">Ikhtisar</span>
        </button>

        {/* Expenses */}
        <button
          onClick={() => setActiveTab('expenses')}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition ${
            activeTab === 'expenses'
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-medium'
          }`}
        >
          <div className="relative">
            <ReceiptText className="w-5 h-5" />
            {activeTab === 'expenses' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
            )}
          </div>
          <span className="text-[10px] tracking-tight">Belanja</span>
        </button>

        {/* Center Quick Add Action */}
        <button
          onClick={onOpenAddExpense}
          title="Catat Pengeluaran Cepat"
          className="flex items-center justify-center -mt-5 w-12 h-12 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/40 active:scale-95 transition-all duration-200 border-2 border-white dark:border-slate-900"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>

        {/* Limits */}
        <button
          onClick={() => setActiveTab('limits')}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition ${
            activeTab === 'limits'
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-medium'
          }`}
        >
          <div className="relative">
            <SlidersHorizontal className="w-5 h-5" />
            {activeTab === 'limits' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
            )}
          </div>
          <span className="text-[10px] tracking-tight">Anggaran</span>
        </button>

        {/* Savings */}
        <button
          onClick={() => setActiveTab('savings')}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition ${
            activeTab === 'savings'
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-medium'
          }`}
        >
          <div className="relative">
            <PiggyBank className="w-5 h-5" />
            {activeTab === 'savings' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
            )}
          </div>
          <span className="text-[10px] tracking-tight">Tabungan</span>
        </button>
      </div>
    </div>
  )
}
