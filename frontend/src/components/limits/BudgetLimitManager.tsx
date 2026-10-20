import React, { useState } from 'react'
import type { BudgetOverviewResponse } from '../../types'
import { formatRupiah, formatNumberWithDots, parseFormattedNumber } from '../../utils/formatters'
import { budgetsApi } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import {
  SlidersHorizontal,
  Save,
  CheckCircle2,
  Clock,
  Calendar,
  CalendarDays,
} from 'lucide-react'

interface BudgetLimitManagerProps {
  budgetData: BudgetOverviewResponse | null
  onRefresh: () => void
}

export const BudgetLimitManager: React.FC<BudgetLimitManagerProps> = ({
  budgetData,
  onRefresh,
}) => {
  const { showToast } = useToast()
  const [dailyLimit, setDailyLimit] = useState(
    budgetData?.daily_limit ? formatNumberWithDots(budgetData.daily_limit) : ''
  )
  const [weeklyLimit, setWeeklyLimit] = useState(
    budgetData?.weekly_limit ? formatNumberWithDots(budgetData.weekly_limit) : ''
  )
  const [monthlyLimit, setMonthlyLimit] = useState(
    budgetData?.monthly_limit ? formatNumberWithDots(budgetData.monthly_limit) : ''
  )
  const [loading, setLoading] = useState(false)

  const handleSaveLimits = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await budgetsApi.setLimits({
        daily_limit: parseFormattedNumber(dailyLimit),
        weekly_limit: parseFormattedNumber(weeklyLimit),
        monthly_limit: parseFormattedNumber(monthlyLimit),
      })
      showToast('Batas anggaran pengeluaran berhasil diperbarui!', 'success')
      onRefresh()
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Gagal menyimpan batas pengeluaran', 'error')
    } finally {
      setLoading(false)
    }
  }

  const renderLimitCard = (
    title: string,
    periodLabel: string,
    spent: number,
    limit: number,
    remaining: number,
    percentage: number,
    status: string,
    icon: any
  ) => {
    const Icon = icon
    let statusBg = 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
    let progressBg = 'bg-indigo-600 dark:bg-indigo-500'
    let statusText = 'Belum Diatur'

    if (status === 'safe') {
      statusBg = 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60'
      progressBg = 'bg-indigo-600 dark:bg-indigo-500'
      statusText = 'Aman'
    } else if (status === 'warning') {
      statusBg = 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60'
      progressBg = 'bg-amber-500'
      statusText = 'Mendekati Batas'
    } else if (status === 'exceeded') {
      statusBg = 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/60'
      progressBg = 'bg-rose-500'
      statusText = 'Melebihi Batas'
    }

    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/90 dark:border-slate-800/90 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition duration-150">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-base">{title}</h4>
                <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">{periodLabel}</span>
              </div>
            </div>
            <span className={`text-[11px] px-2 py-0.5 rounded-md font-medium border ${statusBg}`}>
              {statusText}
            </span>
          </div>

          <div className="my-5">
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-xs text-slate-500 dark:text-slate-400">Total Pengeluaran:</span>
              <span className="text-lg font-bold text-slate-900 dark:text-white">
                {formatRupiah(spent)}
              </span>
            </div>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">Maksimal Anggaran:</span>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {limit > 0 ? formatRupiah(limit) : 'Tidak dibatasi'}
              </span>
            </div>

            {/* Meter Bar */}
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden p-0 border border-slate-200/60 dark:border-slate-700/60">
              <div
                className={`h-full rounded-full transition-all duration-300 ${progressBg}`}
                style={{ width: `${Math.min(percentage || 0, 100)}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs mt-2 text-slate-500 dark:text-slate-400 font-medium">
              <span>{percentage}% terpakai</span>
              <span>
                {limit > 0 ? (
                  remaining >= 0 ? (
                    <span className="text-emerald-600 dark:text-emerald-400">Sisa {formatRupiah(remaining)}</span>
                  ) : (
                    <span className="text-rose-600 dark:text-rose-400">Over {formatRupiah(Math.abs(remaining))}</span>
                  )
                ) : (
                  '-'
                )}
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/90 dark:border-slate-800/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
                Batas Anggaran
              </span>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                Pengaturan Batas Pengeluaran
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 font-normal">
                Tetapkan batas maksimal pengeluaran harian, mingguan, dan bulanan untuk menjaga stabilitas finansial.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3 Status Meter Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {renderLimitCard(
          'Batas Harian',
          'Hari Ini',
          budgetData?.daily?.spent || 0,
          budgetData?.daily?.limit || 0,
          budgetData?.daily?.remaining || 0,
          budgetData?.daily?.percentage || 0,
          budgetData?.daily?.status || 'not_set',
          Clock
        )}

        {renderLimitCard(
          'Batas Mingguan',
          'Minggu Ini',
          budgetData?.weekly?.spent || 0,
          budgetData?.weekly?.limit || 0,
          budgetData?.weekly?.remaining || 0,
          budgetData?.weekly?.percentage || 0,
          budgetData?.weekly?.status || 'not_set',
          Calendar
        )}

        {renderLimitCard(
          'Batas Bulanan',
          'Bulan Ini',
          budgetData?.monthly?.spent || 0,
          budgetData?.monthly?.limit || 0,
          budgetData?.monthly?.remaining || 0,
          budgetData?.monthly?.percentage || 0,
          budgetData?.monthly?.status || 'not_set',
          CalendarDays
        )}
      </div>

      {/* Form Settings */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-7 border border-slate-200/90 dark:border-slate-800/90 shadow-xs max-w-2xl transition-colors">
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
          Ubah Pengaturan Batas Maksimal
        </h3>
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-6 font-normal">
          Masukkan nominal batas pengeluaran (dalam Rupiah). Kosongkan atau isi 0 jika tidak ingin membatasi.
        </p>

        <form onSubmit={handleSaveLimits} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Maksimal Pengeluaran Per Hari (Daily Limit)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 font-bold text-sm">
                Rp
              </span>
              <input
                type="text"
                value={dailyLimit}
                onChange={(e) => setDailyLimit(formatNumberWithDots(e.target.value))}
                placeholder="Contoh: 100.000"
                className="w-full pl-12 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              Batas pengeluaran harian Anda, direset otomatis setiap pergantian tanggal.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Maksimal Pengeluaran Per Minggu (Weekly Limit)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 font-bold text-sm">
                Rp
              </span>
              <input
                type="text"
                value={weeklyLimit}
                onChange={(e) => setWeeklyLimit(formatNumberWithDots(e.target.value))}
                placeholder="Contoh: 700.000"
                className="w-full pl-12 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              Batas pengeluaran dari hari Senin hingga Minggu.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Maksimal Pengeluaran Per Bulan (Monthly Limit)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 font-bold text-sm">
                Rp
              </span>
              <input
                type="text"
                value={monthlyLimit}
                onChange={(e) => setMonthlyLimit(formatNumberWithDots(e.target.value))}
                placeholder="Contoh: 3.000.000"
                className="w-full pl-12 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              Batas total pengeluaran untuk seluruh bulan berjalan.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs transition duration-150 shadow-xs disabled:opacity-60 flex items-center gap-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Simpan Batas Anggaran</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
