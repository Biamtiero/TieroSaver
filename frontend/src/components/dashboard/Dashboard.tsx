import React from 'react'
import type { ExpenseOverviewResponse, BudgetOverviewResponse, SavingsOverviewResponse } from '../../types'
import { formatRupiah, CATEGORY_COLORS, exportToCSV, getCategoryBadge } from '../../utils/formatters'
import {
  TrendingDown,
  Calendar,
  CalendarRange,
  CalendarDays,
  PiggyBank,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  ArrowUpRight,
  PieChart as PieIcon,
  BarChart3,
  Download,
  TrendingUp,
  Activity,
} from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'

interface DashboardProps {
  expenseData: ExpenseOverviewResponse | null
  budgetData: BudgetOverviewResponse | null
  savingsData: SavingsOverviewResponse | null
  setActiveTab: (tab: 'dashboard' | 'expenses' | 'limits' | 'savings') => void
  onOpenAddExpense: () => void
  onOpenAddGoal: () => void
}

export const Dashboard: React.FC<DashboardProps> = ({
  expenseData,
  budgetData,
  savingsData,
  setActiveTab,
  onOpenAddExpense,
  onOpenAddGoal,
}) => {
  const todaySum = expenseData?.today_sum || 0
  const weekSum = expenseData?.week_sum || 0
  const monthSum = expenseData?.month_sum || 0
  const totalSaved = savingsData?.total_saved || 0

  const getStatusBadge = (status?: string, percentage?: number) => {
    if (!status || status === 'not_set') {
      return (
        <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 font-medium border border-slate-200">
          Belum diatur
        </span>
      )
    }
    if (status === 'exceeded') {
      return (
        <span className="text-[11px] px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-medium flex items-center gap-1 border border-rose-200">
          <AlertCircle className="w-3.5 h-3.5 text-rose-600" /> Melebihi Batas ({percentage}%)
        </span>
      )
    }
    if (status === 'warning') {
      return (
        <span className="text-[11px] px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-medium flex items-center gap-1 border border-amber-200">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Mendekati Batas ({percentage}%)
        </span>
      )
    }
    return (
      <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-medium flex items-center gap-1 border border-emerald-200">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Aman ({percentage}%)
      </span>
    )
  }

  // Trend chart type toggle
  const [trendChartType, setTrendChartType] = React.useState<'area' | 'bar'>('area')

  // Category data for Donut Chart
  const categoryChartData = React.useMemo(() => {
    if (!expenseData?.category_breakdown) return []
    return Object.entries(expenseData.category_breakdown)
      .map(([name, value]) => ({ name, value }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value)
  }, [expenseData?.category_breakdown])

  const totalCategoryExpense = React.useMemo(() => {
    return categoryChartData.reduce((acc, curr) => acc + curr.value, 0)
  }, [categoryChartData])

  // Daily trend data for Bar/Area Chart
  const dailyChartData = React.useMemo(() => {
    if (!expenseData?.daily_breakdown || expenseData.daily_breakdown.length === 0) return []
    return [...expenseData.daily_breakdown]
      .reverse()
      .map((item) => ({
        dateLabel: item.date.length >= 10 ? `${item.date.slice(8, 10)}/${item.date.slice(5, 7)}` : item.date,
        total: item.total_amount,
        count: item.count,
      }))
  }, [expenseData?.daily_breakdown])

  // Summary metrics for daily trend chart
  const trendStats = React.useMemo(() => {
    if (!dailyChartData || dailyChartData.length === 0) {
      return { avg: 0, max: 0, activeDays: 0 }
    }
    const totals = dailyChartData.map((d) => d.total)
    const max = Math.max(...totals)
    const sum = totals.reduce((a, b) => a + b, 0)
    const avg = Math.round(sum / dailyChartData.length)
    return { avg, max, activeDays: dailyChartData.length }
  }, [dailyChartData])

  // Custom tooltips
  const CustomDonutTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]
      const pct = totalCategoryExpense > 0 ? ((data.value / totalCategoryExpense) * 100).toFixed(1) : '0'
      return (
        <div className="bg-slate-900/95 backdrop-blur-md text-white px-3.5 py-2.5 rounded-xl shadow-xl border border-slate-800 text-xs">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: data.payload.fill }} />
            <span className="font-semibold text-slate-200">{data.name}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-white text-sm font-bold">{formatRupiah(data.value)}</span>
            <span className="text-indigo-400 font-semibold">({pct}%)</span>
          </div>
        </div>
      )
    }
    return null
  }

  const CustomTrendTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0]
      return (
        <div className="bg-slate-900/95 backdrop-blur-md text-white px-3.5 py-2.5 rounded-xl shadow-xl border border-slate-800 text-xs">
          <p className="text-slate-400 text-[11px] font-medium mb-1">Tanggal: {label}</p>
          <p className="text-sm font-bold text-white">{formatRupiah(item.value)}</p>
          {item.payload.count !== undefined && (
            <p className="text-[11px] text-indigo-300 mt-1 font-medium">{item.payload.count} Transaksi tercatat</p>
          )}
        </div>
      )
    }
    return null
  }

  const handleExportCSV = () => {
    if (!expenseData?.expenses || expenseData.expenses.length === 0) {
      alert('Belum ada data pengeluaran untuk diekspor')
      return
    }
    const headers = ['ID', 'Tanggal', 'Nama Pengeluaran', 'Kategori', 'Nominal (Rp)', 'Catatan']
    const rows = expenseData.expenses.map((e) => [
      e.id,
      e.expense_date,
      e.title,
      e.category,
      e.amount,
      e.notes || '',
    ])
    exportToCSV(`Laporan_Pengeluaran_${new Date().toISOString().slice(0, 10)}`, headers, rows)
  }

  return (
    <div className="space-y-6">
      {/* Modern Sleek Banner */}
      <div className="bg-slate-900 rounded-2xl p-6 sm:p-8 text-white border border-slate-800 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/10 text-slate-300 text-xs font-medium border border-white/10">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Ikhtisar Finansial</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white leading-tight">
              Kendalikan Pengeluaran, Capai Target Finansial
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm max-w-lg font-normal leading-relaxed">
              Catat transaksi dengan cepat, pantau batas anggaran belanja, dan kelola target tabungan secara terukur.
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
            <button
              onClick={onOpenAddExpense}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-medium text-xs hover:bg-indigo-500 transition duration-150 shadow-sm flex items-center justify-center gap-2 group"
            >
              <PlusCircle className="w-4 h-4 text-white" />
              <span>Tambah Pengeluaran</span>
            </button>
            <button
              onClick={onOpenAddGoal}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-xs border border-white/15 transition duration-150 flex items-center justify-center gap-2"
            >
              <PiggyBank className="w-4 h-4 text-indigo-300" />
              <span>Target Tabungan</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Hari Ini */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/90 dark:border-slate-800/90 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wide">
              Pengeluaran Hari Ini
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {formatRupiah(todaySum)}
          </p>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Batas Harian:</span>
            {getStatusBadge(budgetData?.daily?.status, budgetData?.daily?.percentage)}
          </div>
        </div>

        {/* Card 2: Minggu Ini */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/90 dark:border-slate-800/90 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wide">
              Pengeluaran Minggu Ini
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <CalendarRange className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {formatRupiah(weekSum)}
          </p>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Batas Mingguan:</span>
            {getStatusBadge(budgetData?.weekly?.status, budgetData?.weekly?.percentage)}
          </div>
        </div>

        {/* Card 3: Bulan Ini */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/90 dark:border-slate-800/90 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wide">
              Pengeluaran Bulan Ini
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <CalendarDays className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {formatRupiah(monthSum)}
          </p>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Batas Bulanan:</span>
            {getStatusBadge(budgetData?.monthly?.status, budgetData?.monthly?.percentage)}
          </div>
        </div>

        {/* Card 4: Tabungan Terkumpul */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/90 dark:border-slate-800/90 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wide">
              Total Tabungan
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
            {formatRupiah(totalSaved)}
          </p>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Target Total:</span>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {formatRupiah(savingsData?.total_target || 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Status Batas Anggaran */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-7 border border-slate-200/90 dark:border-slate-800/90 shadow-xs">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Status Batas Anggaran</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">Monitoring</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Rasio penggunaan pengeluaran terhadap batas anggaran yang ditentukan
            </p>
          </div>
          <button
            onClick={() => setActiveTab('limits')}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100/80 dark:hover:bg-indigo-900/60 transition"
          >
            <span>Atur Limit</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Daily Limit Meter */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Maksimal Harian</span>
              <span className="text-slate-500 dark:text-slate-400">{formatRupiah(budgetData?.daily?.limit || 0)}</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden my-2">
              <div
                className={`h-full transition-all duration-300 ${
                  budgetData?.daily?.status === 'exceeded'
                    ? 'bg-rose-500'
                    : budgetData?.daily?.status === 'warning'
                    ? 'bg-amber-500'
                    : 'bg-indigo-600'
                }`}
                style={{ width: `${Math.min(budgetData?.daily?.percentage || 0, 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              <span>Terpakai: {formatRupiah(budgetData?.daily?.spent || 0)}</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">{budgetData?.daily?.percentage || 0}%</span>
            </div>
          </div>

          {/* Weekly Limit Meter */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Maksimal Mingguan</span>
              <span className="text-slate-500 dark:text-slate-400">{formatRupiah(budgetData?.weekly?.limit || 0)}</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden my-2">
              <div
                className={`h-full transition-all duration-300 ${
                  budgetData?.weekly?.status === 'exceeded'
                    ? 'bg-rose-500'
                    : budgetData?.weekly?.status === 'warning'
                    ? 'bg-amber-500'
                    : 'bg-indigo-600'
                }`}
                style={{ width: `${Math.min(budgetData?.weekly?.percentage || 0, 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              <span>Terpakai: {formatRupiah(budgetData?.weekly?.spent || 0)}</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">{budgetData?.weekly?.percentage || 0}%</span>
            </div>
          </div>

          {/* Monthly Limit Meter */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Maksimal Bulanan</span>
              <span className="text-slate-500 dark:text-slate-400">{formatRupiah(budgetData?.monthly?.limit || 0)}</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden my-2">
              <div
                className={`h-full transition-all duration-300 ${
                  budgetData?.monthly?.status === 'exceeded'
                    ? 'bg-rose-500'
                    : budgetData?.monthly?.status === 'warning'
                    ? 'bg-amber-500'
                    : 'bg-indigo-600'
                }`}
                style={{ width: `${Math.min(budgetData?.monthly?.percentage || 0, 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              <span>Terpakai: {formatRupiah(budgetData?.monthly?.spent || 0)}</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">{budgetData?.monthly?.percentage || 0}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Visualisasi Grafik: Donut Chart Kategori & Area/Bar Chart Tren Harian */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Donut Chart: Proporsi Kategori */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-7 border border-slate-200/90 dark:border-slate-800/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <PieIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Distribusi Kategori</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Proporsi alokasi pengeluaran Anda</p>
                </div>
              </div>
            </div>

            {categoryChartData.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center text-slate-400 dark:text-slate-500 text-xs">
                <PieIcon className="w-10 h-10 mb-2 opacity-25" />
                <p>Belum ada data pengeluaran untuk ditampilkan dalam diagram.</p>
              </div>
            ) : (
              <div>
                <div className="relative h-56 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={66}
                        outerRadius={92}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {categoryChartData.map((entry) => (
                          <Cell
                            key={`cell-${entry.name}`}
                            fill={CATEGORY_COLORS[entry.name] || '#94a3b8'}
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip content={<CustomDonutTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center KPI text inside hollow Donut */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Total Alokasi</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{formatRupiah(totalCategoryExpense)}</span>
                  </div>
                </div>

                {/* Category Legends with Percentage and Progress Bar */}
                <div className="mt-4 space-y-2.5 max-h-48 overflow-y-auto pr-1">
                  {categoryChartData.map((item) => {
                    const percentage = totalCategoryExpense > 0
                      ? Math.round((item.value / totalCategoryExpense) * 100)
                      : 0
                    const color = CATEGORY_COLORS[item.name] || '#94a3b8'
                    return (
                      <div
                        key={item.name}
                        className="p-2 rounded-xl bg-slate-50/70 dark:bg-slate-800/50 hover:bg-slate-100/70 dark:hover:bg-slate-800 transition"
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <div className="flex items-center gap-2 truncate">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: color }}
                            />
                            <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-bold text-slate-900 dark:text-white">{formatRupiah(item.value)}</span>
                            <span className="text-slate-400 dark:text-slate-500 text-[11px] font-medium w-8 text-right">({percentage}%)</span>
                          </div>
                        </div>
                        <div className="w-full bg-slate-200/70 dark:bg-slate-700/60 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%`, backgroundColor: color }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Daily Trend Chart: Spline Area / Bar Chart with Toggle & Metric Strip */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-7 border border-slate-200/90 dark:border-slate-800/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Tren Pengeluaran Harian</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Fluktuasi belanja harian bulan ini</p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center">
                {/* Chart Type Toggle: Area vs Bar */}
                <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-800">
                  <button
                    onClick={() => setTrendChartType('area')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition flex items-center gap-1 ${
                      trendChartType === 'area'
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Area</span>
                  </button>
                  <button
                    onClick={() => setTrendChartType('bar')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition flex items-center gap-1 ${
                      trendChartType === 'bar'
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>Bar</span>
                  </button>
                </div>

                <button
                  onClick={handleExportCSV}
                  title="Ekspor laporan pengeluaran ke format CSV / Excel"
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span className="hidden sm:inline">Export CSV</span>
                </button>
              </div>
            </div>

            {/* Metric Summary Strip */}
            {dailyChartData.length > 0 && (
              <div className="grid grid-cols-3 gap-2.5 mb-4 p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">Rata-rata Harian</span>
                  <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">{formatRupiah(trendStats.avg)}</span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">Puncak Belanja</span>
                  <span className="text-xs sm:text-sm font-bold text-indigo-600 dark:text-indigo-400">{formatRupiah(trendStats.max)}</span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">Hari Transaksi</span>
                  <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">{trendStats.activeDays} Hari</span>
                </div>
              </div>
            )}

            {dailyChartData.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center text-slate-400 dark:text-slate-500 text-xs">
                <BarChart3 className="w-10 h-10 mb-2 opacity-25" />
                <p>Belum ada riwayat transaksi di bulan ini.</p>
              </div>
            ) : (
              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  {trendChartType === 'area' ? (
                    <AreaChart data={dailyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="dateLabel"
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        axisLine={{ stroke: '#e2e8f0' }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(val) => {
                          if (val >= 1000000) return `${(val / 1000000).toFixed(1)}jt`
                          if (val >= 1000) return `${(val / 1000).toFixed(0)}rb`
                          return String(val)
                        }}
                      />
                      <RechartsTooltip content={<CustomTrendTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="total"
                        stroke="#4f46e5"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#areaGradient)"
                      />
                    </AreaChart>
                  ) : (
                    <BarChart data={dailyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366f1" />
                          <stop offset="100%" stopColor="#4f46e5" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="dateLabel"
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        axisLine={{ stroke: '#e2e8f0' }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(val) => {
                          if (val >= 1000000) return `${(val / 1000000).toFixed(1)}jt`
                          if (val >= 1000) return `${(val / 1000).toFixed(0)}rb`
                          return String(val)
                        }}
                      />
                      <RechartsTooltip content={<CustomTrendTooltip />} />
                      <Bar
                        dataKey="total"
                        fill="url(#barGradient)"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={36}
                      />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Two Columns: Recent Expenses & Top Savings Goals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Daily Expenses Data Table */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/90 dark:border-slate-800/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">Pengeluaran Terakhir</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500">Transaksi terbaru yang tercatat</p>
              </div>
              <button
                onClick={() => setActiveTab('expenses')}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1"
              >
                <span>Lihat Semua Tanggal</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {!expenseData?.expenses || expenseData.expenses.length === 0 ? (
              <div className="text-center py-10 text-slate-400 dark:text-slate-500 text-sm">
                <TrendingDown className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>Belum ada pengeluaran yang dicatat.</p>
                <button
                  onClick={onOpenAddExpense}
                  className="mt-3 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition"
                >
                  + Catat Pengeluaran Pertama
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      <th className="pb-2.5 font-medium">Keperluan</th>
                      <th className="pb-2.5 font-medium">Kategori</th>
                      <th className="pb-2.5 font-medium">Tanggal</th>
                      <th className="pb-2.5 font-medium text-right">Nominal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/70 dark:divide-slate-800/70 text-xs">
                    {expenseData.expenses.slice(0, 5).map((exp) => (
                      <tr key={exp.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition group">
                        <td className="py-2.5 pr-2 font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[140px]">
                          {exp.title}
                        </td>
                        <td className="py-2.5 pr-2">
                          <span className="inline-block text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                            {exp.category}
                          </span>
                        </td>
                        <td className="py-2.5 pr-2 text-slate-400 dark:text-slate-500 text-[11px] whitespace-nowrap">
                          {exp.expense_date}
                        </td>
                        <td className="py-2.5 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          -{formatRupiah(exp.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Top Savings Goals */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/90 dark:border-slate-800/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 dark:text-white">Target Tabungan</h3>
              <button
                onClick={() => setActiveTab('savings')}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1"
              >
                <span>Lihat Tabungan</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {!savingsData?.goals || savingsData.goals.length === 0 ? (
              <div className="text-center py-10 text-slate-400 dark:text-slate-500 text-sm">
                <PiggyBank className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>Belum ada target tabungan yang dibuat.</p>
                <button
                  onClick={onOpenAddGoal}
                  className="mt-3 px-3 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition"
                >
                  + Buat Target Tabungan Baru
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {savingsData.goals.slice(0, 4).map((g) => (
                  <div key={g.id} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-bold text-slate-800 dark:text-slate-200">{g.title}</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatRupiah(g.current_amount)} / {formatRupiah(g.target_amount)}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(g.progress_percentage || 0, 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">
                      <span>{g.is_reached ? 'Target Tercapai' : `Sisa ${formatRupiah(g.remaining_amount)}`}</span>
                      <span className="font-semibold text-slate-600 dark:text-slate-300">{g.progress_percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
