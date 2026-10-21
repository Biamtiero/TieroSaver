import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "./context/AuthContext";
import { useToast } from "./context/ToastContext";
import { AuthScreen } from "./components/auth/AuthScreen";
import { Navbar } from "./components/common/Navbar";
import { BottomNav } from "./components/common/BottomNav";
import { Dashboard } from "./components/dashboard/Dashboard";
import { ExpenseTracker } from "./components/expenses/ExpenseTracker";
import { BudgetLimitManager } from "./components/limits/BudgetLimitManager";
import { SavingsTracker } from "./components/savings/SavingsTracker";
import { ProfileModal } from "./components/profile/ProfileModal";
import { expensesApi, budgetsApi, savingsApi } from "./services/api";
import type {
  ExpenseOverviewResponse,
  BudgetOverviewResponse,
  SavingsOverviewResponse,
} from "./types";
import {
  getTodayDateString,
  CATEGORIES,
  formatNumberWithDots,
  parseFormattedNumber,
} from "./utils/formatters";
import { Plus, X, Tag, DollarSign, FileText, CalendarDays } from "lucide-react";

export const App: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "expenses" | "limits" | "savings"
  >("dashboard");
  const [selectedDate, setSelectedDate] =
    useState<string>(getTodayDateString());

  // Data states
  const [expenseData, setExpenseData] =
    useState<ExpenseOverviewResponse | null>(null);
  const [budgetData, setBudgetData] = useState<BudgetOverviewResponse | null>(
    null,
  );
  const [savingsData, setSavingsData] =
    useState<SavingsOverviewResponse | null>(null);
  const [isDataLoading, setIsDataLoading] = useState<boolean>(false);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);

  // Quick Action Modals
  const [showQuickExpenseModal, setShowQuickExpenseModal] =
    useState<boolean>(false);
  const [quickTitle, setQuickTitle] = useState("");
  const [quickAmount, setQuickAmount] = useState("");
  const [quickCategory, setQuickCategory] = useState(CATEGORIES[0].name);
  const [quickNotes, setQuickNotes] = useState("");
  const [quickLoading, setQuickLoading] = useState(false);

  const loadAllData = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsDataLoading(true);
    try {
      const [exp, bud, sav] = await Promise.all([
        expensesApi.getOverview(selectedDate),
        budgetsApi.getOverview(),
        savingsApi.getGoals(),
      ]);
      setExpenseData(exp);
      setBudgetData(bud);
      setSavingsData(sav);
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setIsDataLoading(false);
    }
  }, [isAuthenticated, selectedDate]);

  useEffect(() => {
    if (isAuthenticated) {
      loadAllData();
    }
  }, [isAuthenticated, loadAllData]);

  const handleQuickSubmitExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFormattedNumber(quickAmount);
    if (!quickTitle.trim() || amt <= 0) {
      showToast("Judul dan nominal pengeluaran wajib diisi", "error");
      return;
    }

    setQuickLoading(true);
    try {
      await expensesApi.createExpense({
        title: quickTitle.trim(),
        amount: amt,
        category: quickCategory,
        expense_date: selectedDate,
        notes: quickNotes.trim() || undefined,
      });
      setShowQuickExpenseModal(false);
      setQuickTitle("");
      setQuickAmount("");
      setQuickNotes("");
      showToast("Pengeluaran berhasil dicatat!", "success");
      loadAllData();
    } catch (err: any) {
      showToast(err.response?.data?.error || "Gagal mencatat pengeluaran", "error");
    } finally {
      setQuickLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col relative selection:bg-indigo-600 selection:text-white transition-colors duration-200">
      {/* Ambient background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-indigo-50/60 dark:from-indigo-950/20 via-slate-50/20 dark:via-slate-950/20 to-transparent pointer-events-none -z-0" />

      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenProfile={() => setShowProfileModal(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-28 md:pb-8 relative z-10">
        {activeTab === "dashboard" && (
          <Dashboard
            expenseData={expenseData}
            budgetData={budgetData}
            savingsData={savingsData}
            setActiveTab={setActiveTab}
            onOpenAddExpense={() => setShowQuickExpenseModal(true)}
            onOpenAddGoal={() => setActiveTab("savings")}
          />
        )}

        {activeTab === "expenses" && (
          <ExpenseTracker
            overviewData={expenseData}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            onRefresh={loadAllData}
          />
        )}

        {activeTab === "limits" && (
          <BudgetLimitManager budgetData={budgetData} onRefresh={loadAllData} />
        )}

        {activeTab === "savings" && (
          <SavingsTracker savingsData={savingsData} onRefresh={loadAllData} />
        )}
      </main>

      {/* Desktop & Tablet Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs py-8 text-center text-xs text-slate-400 dark:text-slate-500 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 dark:text-white text-sm">
              Tiero<span className="text-indigo-600 dark:text-indigo-400">Saver</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium border border-slate-200 dark:border-slate-700">
              v2.0
            </span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-normal">
            Smart Finance & Budget Tracker • Platform Manajemen Keuangan Pribadi
          </p>
        </div>
      </footer>

      {/* Mobile Ergonomic Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAddExpense={() => setShowQuickExpenseModal(true)}
      />

      {/* Quick Add Expense Modal */}
      {showQuickExpenseModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-7 max-w-md w-full shadow-2xl relative border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setShowQuickExpenseModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-5">
              <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
                Catat Cepat
              </span>
              <h3 className="font-bold text-slate-900 dark:text-white text-base tracking-tight">
                Tambah Pengeluaran
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                Tanggal: {selectedDate}
              </p>
            </div>

            <form onSubmit={handleQuickSubmitExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Pengeluaran / Keperluan
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <FileText className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={quickTitle}
                    onChange={(e) => setQuickTitle(e.target.value)}
                    placeholder="Contoh: Kopi Sore"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nominal (Rp)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={quickAmount}
                    onChange={(e) =>
                      setQuickAmount(formatNumberWithDots(e.target.value))
                    }
                    placeholder="Contoh: 18.000"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Kategori
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Tag className="w-4 h-4" />
                  </div>
                  <select
                    value={quickCategory}
                    onChange={(e) => setQuickCategory(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.name} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tanggal
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <CalendarDays className="w-4 h-4" />
                  </div>
                  <input
                    type="date"
                    required
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Catatan (Opsional)
                </label>
                <input
                  type="text"
                  value={quickNotes}
                  onChange={(e) => setQuickNotes(e.target.value)}
                  placeholder="Catatan tambahan"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>

              <button
                type="submit"
                disabled={quickLoading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs transition shadow-xs disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {quickLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Simpan Pengeluaran</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Profile & Account Settings Modal */}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        onDataReset={loadAllData}
      />
    </div>
  );
};
