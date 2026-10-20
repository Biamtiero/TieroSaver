import React, { useState, useMemo } from 'react'
import type { ExpenseOverviewResponse, Expense } from '../../types'
import {
  formatRupiah,
  formatDateIndo,
  getTodayDateString,
  CATEGORIES,
  getCategoryBadge,
  formatNumberWithDots,
  parseFormattedNumber,
  exportToCSV,
} from '../../utils/formatters'
import { expensesApi } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Pencil,
  CalendarDays,
  Tag,
  FileText,
  DollarSign,
  TrendingDown,
  Layers,
  Search,
  Filter,
  Download,
  ReceiptText,
  ArrowUpDown,
  X,
  ArrowRight,
} from 'lucide-react'

interface ExpenseTrackerProps {
  overviewData: ExpenseOverviewResponse | null
  selectedDate: string
  setSelectedDate: (date: string) => void
  onRefresh: () => void
}

export const ExpenseTracker: React.FC<ExpenseTrackerProps> = ({
  overviewData,
  selectedDate,
  setSelectedDate,
  onRefresh,
}) => {
  const { showToast, confirm } = useToast()
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0].name)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeView, setActiveView] = useState<'single_day' | 'month_breakdown'>('single_day')
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('Semua')
  const [sortBy, setSortBy] = useState<'latest' | 'oldest' | 'highest' | 'lowest'>('latest')

  // Edit Expense State
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [editCategory, setEditCategory] = useState(CATEGORIES[0].name)
  const [editDate, setEditDate] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editLoading, setEditLoading] = useState(false)

  const todayStr = getTodayDateString()

  const handlePrevDay = () => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() - 1)
    setSelectedDate(d.toISOString().split('T')[0])
  }

  const handleNextDay = () => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + 1)
    setSelectedDate(d.toISOString().split('T')[0])
  }

  const handleSubmitExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    const numAmount = parseFormattedNumber(amount)
    if (!title.trim() || numAmount <= 0) {
      showToast('Judul dan nominal pengeluaran wajib diisi dengan benar', 'error')
      return
    }

    setLoading(true)
    try {
      await expensesApi.createExpense({
        title: title.trim(),
        amount: numAmount,
        category,
        expense_date: selectedDate,
        notes: notes.trim(),
      })
      setTitle('')
      setAmount('')
      setNotes('')
      showToast('Pengeluaran berhasil dicatat!', 'success')
      onRefresh()
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Gagal menambahkan pengeluaran', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenEdit = (expense: Expense) => {
    setEditingExpense(expense)
    setEditTitle(expense.title)
    setEditAmount(formatNumberWithDots(expense.amount))
    setEditCategory(expense.category)
    setEditDate(expense.expense_date)
    setEditNotes(expense.notes || '')
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingExpense) return
    const numAmount = parseFormattedNumber(editAmount)
    if (!editTitle.trim() || numAmount <= 0) {
      showToast('Judul dan nominal wajib diisi', 'error')
      return
    }

    setEditLoading(true)
    try {
      await expensesApi.updateExpense(editingExpense.id, {
        title: editTitle.trim(),
        amount: numAmount,
        category: editCategory,
        expense_date: editDate,
        notes: editNotes.trim(),
      })
      setEditingExpense(null)
      showToast('Catatan pengeluaran berhasil diperbarui!', 'success')
      onRefresh()
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Gagal memperbarui pengeluaran', 'error')
    } finally {
      setEditLoading(false)
    }
  }

  const filteredDailyExpenses = useMemo(() => {
    if (!overviewData?.expenses) return []
    const list = overviewData.expenses.filter((item) => {
      const matchSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.notes && item.notes.toLowerCase().includes(searchQuery.toLowerCase()))
      const matchCategory =
        categoryFilter === 'Semua' || item.category.toLowerCase() === categoryFilter.toLowerCase()
      return matchSearch && matchCategory
    })

    list.sort((a, b) => {
      if (sortBy === 'latest') return b.id - a.id
      if (sortBy === 'oldest') return a.id - b.id
      if (sortBy === 'highest') return b.amount - a.amount
      if (sortBy === 'lowest') return a.amount - b.amount
      return 0
    })

    return list
  }, [overviewData?.expenses, searchQuery, categoryFilter, sortBy])

  const filteredTotalAmount = useMemo(() => {
    return filteredDailyExpenses.reduce((sum, item) => sum + item.amount, 0)
  }, [filteredDailyExpenses])

  const monthTotalAmount = useMemo(() => {
    if (!overviewData?.daily_breakdown) return 0
    return overviewData.daily_breakdown.reduce((sum, item) => sum + item.total_amount, 0)
  }, [overviewData?.daily_breakdown])

  const handleExportDateCSV = () => {
    if (!filteredDailyExpenses || filteredDailyExpenses.length === 0) {
      showToast('Tidak ada transaksi untuk diekspor', 'info')
      return
    }
    const headers = ['ID', 'Tanggal', 'Nama Pengeluaran', 'Kategori', 'Nominal (Rp)', 'Catatan']
    const rows = filteredDailyExpenses.map((e) => [
      e.id,
      e.expense_date,
      e.title,
      e.category,
      e.amount,
      e.notes || '',
    ])
    exportToCSV(`Pengeluaran_${selectedDate}`, headers, rows)
    showToast('Laporan pengeluaran berhasil diunduh dalam format CSV', 'success')
  }

  const handleDeleteExpense = async (id: number) => {
    const isConfirmed = await confirm({
      title: 'Hapus Pengeluaran',
      message: 'Apakah Anda yakin ingin menghapus catatan transaksi pengeluaran ini?',
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      danger: true,
    })
    if (!isConfirmed) return

    try {
      await expensesApi.deleteExpense(id)
      showToast('Pengeluaran berhasil dihapus', 'success')
      onRefresh()
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Gagal menghapus pengeluaran', 'error')
    }
  }

  return (
    <div className="space-y-6">
      {/* Date Header & Quick Selector */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/90 dark:border-slate-800/90 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4 transition-colors">
        <div className="flex items-center gap-3.5 w-full md:w-auto">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
              Kalender Transaksi
            </span>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              {formatDateIndo(selectedDate)}
            </h2>
          </div>
        </div>

        {/* Date Navigator Controls */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          <button
            onClick={handlePrevDay}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
            title="Hari Sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={() => setSelectedDate(todayStr)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
              selectedDate === todayStr
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Hari Ini
          </button>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          <button
            onClick={handleNextDay}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
            title="Hari Berikutnya"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Prominent Daily Aggregation Banner */}
      <div className="bg-slate-900 rounded-2xl p-6 text-white border border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="text-center sm:text-left relative z-10">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/10 text-slate-300 text-xs font-medium mb-2">
            <span>Pengeluaran Tanggal Terpilih</span>
          </div>
          <p className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            {formatRupiah(overviewData?.selected_date_sum || 0)}
          </p>
          <p className="text-xs text-slate-400 mt-1 font-normal">
            Dari {overviewData?.expenses?.length || 0} transaksi tercatat pada tanggal ini.
          </p>
        </div>

        <div className="flex items-center gap-6 border-t sm:border-t-0 sm:border-l border-white/10 pt-4 sm:pt-0 sm:pl-8 text-xs relative z-10">
          <div className="text-center sm:text-left">
            <span className="text-slate-400 block font-medium">Hari Ini:</span>
            <span className="font-semibold text-emerald-400 text-sm">{formatRupiah(overviewData?.today_sum || 0)}</span>
          </div>
          <div className="text-center sm:text-left">
            <span className="text-slate-400 block font-medium">Bulan Berjalan:</span>
            <span className="font-semibold text-slate-200 text-sm">{formatRupiah(overviewData?.month_sum || 0)}</span>
          </div>
        </div>
      </div>

      {/* Main Content Layout: Form & List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form: Catat Pengeluaran Langsung */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/90 dark:border-slate-800/90 shadow-xs sticky top-24 transition-colors">
            <h3 className="font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2 text-base">
              <span className="p-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400"><Plus className="w-4 h-4" /></span>
              <span>Tambah Pengeluaran</span>
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-5 font-normal">
              Transaksi akan dicatat pada tanggal {selectedDate}
            </p>

            <form onSubmit={handleSubmitExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Nama / Keperluan
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <FileText className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Contoh: Makan Siang Nasi Padang"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Nominal (Rp)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={amount}
                    onChange={(e) => setAmount(formatNumberWithDots(e.target.value))}
                    placeholder="Contoh: 25.000"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Kategori
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Tag className="w-4 h-4" />
                  </div>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
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
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Tanggal Transaksi
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
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Catatan Tambahan (Opsional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Catatan tempat, promo, dsb."
                  rows={2}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs transition duration-150 shadow-xs disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? (
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

        {/* List: Pengeluaran Hari Ini & Breakdown Per Tanggal */}
        <div className="lg:col-span-2 space-y-5">
          {/* View Tab Selector */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveView('single_day')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeView === 'single_day'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Tanggal Terpilih</span>
            </button>
            <button
              onClick={() => setActiveView('month_breakdown')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeView === 'month_breakdown'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Rekap Harian Bulan Ini</span>
            </button>
          </div>

          {activeView === 'single_day' ? (
            /* Single Day Modern Data Table View */
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/90 dark:border-slate-800/90 shadow-xs transition-colors">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-5">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    Daftar Pengeluaran ({formatDateIndo(selectedDate)})
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Daftar transaksi belanja pada tanggal terpilih</p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-center">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                    {filteredDailyExpenses.length} Transaksi
                  </span>
                  {filteredDailyExpenses.length > 0 && (
                    <button
                      onClick={handleExportDateCSV}
                      title="Download data tanggal ini ke CSV"
                      className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>Export CSV</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Search, Category Filter & Sorting Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 mb-5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                {/* Search Input */}
                <div className="sm:col-span-5 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Search className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari keperluan / catatan..."
                    className="w-full pl-8 pr-7 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 transition shadow-xs"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Category Filter */}
                <div className="sm:col-span-4 relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                    <Filter className="w-3.5 h-3.5" />
                  </div>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 transition shadow-xs font-medium"
                  >
                    <option value="Semua">Semua Kategori</option>
                    {CATEGORIES.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sort Order Selector */}
                <div className="sm:col-span-3 relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="w-full pl-8 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 transition shadow-xs font-medium"
                  >
                    <option value="latest">Terbaru</option>
                    <option value="oldest">Terlama</option>
                    <option value="highest">Nominal Tertinggi</option>
                    <option value="lowest">Nominal Terendah</option>
                  </select>
                </div>
              </div>

              {filteredDailyExpenses.length === 0 ? (
                <div className="text-center py-12 text-slate-400 dark:text-slate-500">
                  <TrendingDown className="w-10 h-10 mx-auto mb-2 opacity-30 text-slate-400" />
                  <p className="text-sm font-medium">
                    {searchQuery || categoryFilter !== 'Semua'
                      ? 'Tidak ada pengeluaran yang cocok dengan filter pencarian.'
                      : 'Tidak ada pengeluaran pada tanggal ini.'}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    {searchQuery || categoryFilter !== 'Semua'
                      ? 'Coba ganti kata kunci atau pilih kategori lain.'
                      : 'Gunakan formulir di samping untuk mencatat pengeluaran.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        <th className="pb-3 pr-4 font-medium">Keperluan & Catatan</th>
                        <th className="pb-3 pr-4 font-medium">Kategori</th>
                        <th className="pb-3 pr-4 font-medium text-right">Nominal</th>
                        <th className="pb-3 font-medium text-center w-20">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/80 dark:divide-slate-800/80 text-xs">
                      {filteredDailyExpenses.map((expense) => {
                        const badge = getCategoryBadge(expense.category)
                        return (
                          <tr
                            key={expense.id}
                            className="hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 transition group"
                          >
                            <td className="py-3 pr-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/60 border border-indigo-100/60 dark:border-indigo-800/60 flex items-center justify-center shrink-0 text-indigo-600 dark:text-indigo-400">
                                  <ReceiptText className="w-4 h-4" />
                                </div>
                                <div>
                                  <p className="font-semibold text-slate-900 dark:text-white leading-tight">
                                    {expense.title}
                                  </p>
                                  {expense.notes && (
                                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate max-w-xs">
                                      {expense.notes}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-3 pr-4">
                              <span
                                className={`inline-block text-[10px] px-2.5 py-0.5 rounded-md border font-medium ${badge.color}`}
                              >
                                {expense.category}
                              </span>
                            </td>
                            <td className="py-3 pr-4 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                              -{formatRupiah(expense.amount)}
                            </td>
                            <td className="py-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => handleOpenEdit(expense)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition"
                                  title="Edit Pengeluaran"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteExpense(expense.id)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition"
                                  title="Hapus Pengeluaran"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                        <td colSpan={2} className="py-3 pl-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                          Total {filteredDailyExpenses.length} Transaksi Terfilter
                        </td>
                        <td className="py-3 pr-4 text-right font-bold text-sm text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                          {formatRupiah(filteredTotalAmount)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          ) : (
            /* Month Breakdown - Grouped By Each Date as a Modern Table */
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/90 dark:border-slate-800/90 shadow-xs space-y-4 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    Rekap Harian Bulan Ini
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Total belanja dikelompokkan per tanggal transaksi</p>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">Total Pengeluaran Bulan Ini</span>
                  <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{formatRupiah(monthTotalAmount)}</span>
                </div>
              </div>

              {!overviewData?.daily_breakdown || overviewData.daily_breakdown.length === 0 ? (
                <div className="text-center py-10 text-slate-400 dark:text-slate-500 text-sm">
                  Belum ada catatan pengeluaran di bulan ini.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        <th className="pb-3 pr-4 font-medium">Tanggal</th>
                        <th className="pb-3 pr-4 font-medium">Jumlah Transaksi</th>
                        <th className="pb-3 pr-4 font-medium text-right">Total Belanja</th>
                        <th className="pb-3 font-medium text-center w-24">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/80 dark:divide-slate-800/80 text-xs">
                      {overviewData.daily_breakdown.map((group) => {
                        const isSelected = group.date === selectedDate
                        const isToday = group.date === todayStr
                        return (
                          <tr
                            key={group.date}
                            onClick={() => {
                              setSelectedDate(group.date)
                              setActiveView('single_day')
                            }}
                            className={`hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 cursor-pointer transition ${
                              isSelected ? 'bg-indigo-50/30 dark:bg-indigo-950/40' : ''
                            }`}
                          >
                            <td className="py-3 pr-4">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-900 dark:text-white">
                                  {formatDateIndo(group.date)}
                                </span>
                                {isToday && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-100 dark:border-indigo-800/60">
                                    Hari Ini
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 pr-4 text-slate-500 dark:text-slate-400 font-medium">
                              {group.count} transaksi
                            </td>
                            <td className="py-3 pr-4 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                              {formatRupiah(group.total_amount)}
                            </td>
                            <td className="py-3 text-center">
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300">
                                <span>Detail</span>
                                <ArrowRight className="w-3 h-3" />
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                        <td colSpan={2} className="py-3 pl-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                          Total {overviewData.daily_breakdown.length} Hari Aktif
                        </td>
                        <td className="py-3 pr-4 text-right font-bold text-sm text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                          {formatRupiah(monthTotalAmount)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Expense Modal */}
      {editingExpense && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-7 max-w-md w-full shadow-2xl relative border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setEditingExpense(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-5">
              <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
                Edit Transaksi
              </span>
              <h3 className="font-bold text-slate-900 dark:text-white text-base tracking-tight">
                Ubah Data Pengeluaran
              </h3>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama / Keperluan
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nominal (Rp)
                </label>
                <input
                  type="text"
                  required
                  value={editAmount}
                  onChange={(e) => setEditAmount(formatNumberWithDots(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Kategori
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.name} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tanggal
                  </label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Catatan (Opsional)
                </label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Catatan tambahan"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingExpense(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs transition shadow-xs disabled:opacity-60 flex items-center gap-1.5"
                >
                  {editLoading ? 'Menyimpan...' : 'Perbarui Transaksi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
