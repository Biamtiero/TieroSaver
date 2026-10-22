import React, { useState } from 'react'
import type { SavingsOverviewResponse, SavingsGoal } from '../../types'
import { formatRupiah, formatDateIndo, formatNumberWithDots, parseFormattedNumber } from '../../utils/formatters'
import { savingsApi } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import {
  PiggyBank,
  Plus,
  ArrowDownCircle,
  ArrowUpCircle,
  Target,
  Calendar,
  Trash2,
  X,
  History,
} from 'lucide-react'

interface SavingsTrackerProps {
  savingsData: SavingsOverviewResponse | null
  onRefresh: () => void
}

export const SavingsTracker: React.FC<SavingsTrackerProps> = ({
  savingsData,
  onRefresh,
}) => {
  const { showToast, confirm } = useToast()
  const [showAddGoalModal, setShowAddGoalModal] = useState(false)
  const [selectedGoalForTx, setSelectedGoalForTx] = useState<SavingsGoal | null>(null)

  // Add Goal Form State
  const [newTitle, setNewTitle] = useState('')
  const [newTargetAmount, setNewTargetAmount] = useState('')
  const [newTargetDate, setNewTargetDate] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [loadingGoal, setLoadingGoal] = useState(false)

  // Transaction Form State
  const [txType, setTxType] = useState<'deposit' | 'withdraw'>('deposit')
  const [txAmount, setTxAmount] = useState('')
  const [txNotes, setTxNotes] = useState('')
  const [loadingTx, setLoadingTx] = useState(false)

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault()
    const target = parseFormattedNumber(newTargetAmount)
    if (!newTitle.trim() || target <= 0) {
      showToast('Nama target dan nominal target wajib diisi', 'error')
      return
    }

    setLoadingGoal(true)
    try {
      await savingsApi.createGoal({
        title: newTitle.trim(),
        target_amount: target,
        target_date: newTargetDate || undefined,
        notes: newNotes.trim() || undefined,
      })
      setShowAddGoalModal(false)
      setNewTitle('')
      setNewTargetAmount('')
      setNewTargetDate('')
      setNewNotes('')
      showToast('Target tabungan baru berhasil dibuat!', 'success')
      onRefresh()
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Gagal membuat target tabungan', 'error')
    } finally {
      setLoadingGoal(false)
    }
  }

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedGoalForTx) return
    const amount = parseFormattedNumber(txAmount)
    if (amount <= 0) {
      showToast('Nominal transaksi harus lebih dari 0', 'error')
      return
    }

    setLoadingTx(true)
    try {
      await savingsApi.addTransaction(selectedGoalForTx.id, {
        type: txType,
        amount,
        notes: txNotes.trim() || undefined,
      })
      setSelectedGoalForTx(null)
      setTxAmount('')
      setTxNotes('')
      showToast(
        txType === 'deposit'
          ? 'Setoran tabungan berhasil dicatat!'
          : 'Penarikan tabungan berhasil diproses!',
        'success'
      )
      onRefresh()
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Gagal memproses transaksi tabungan', 'error')
    } finally {
      setLoadingTx(false)
    }
  }

  const handleDeleteGoal = async (id: number | string) => {
    const isConfirmed = await confirm({
      title: 'Hapus Target Tabungan',
      message: 'Apakah Anda yakin ingin menghapus target tabungan ini beserta seluruh riwayat setorannya?',
      confirmText: 'Ya, Hapus Target',
      cancelText: 'Batal',
      danger: true,
    })
    if (!isConfirmed) return

    try {
      await savingsApi.deleteGoal(id)
      showToast('Target tabungan berhasil dihapus', 'success')
      onRefresh()
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Gagal menghapus target tabungan', 'error')
    }
  }

  const totalSaved = savingsData?.total_saved || 0
  const totalTarget = savingsData?.total_target || 0
  const overallPercentage =
    totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 1000) / 10 : 0

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-slate-900 rounded-2xl p-6 sm:p-8 text-white border border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/10 text-slate-300 text-xs font-medium">
            <PiggyBank className="w-3.5 h-3.5 text-indigo-400" />
            <span>Target & Tabungan</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white leading-tight">
            Rencanakan Tabungan untuk Masa Depan
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm max-w-xl font-normal leading-relaxed">
            Sisihkan sisa pengeluaran harian secara berkala untuk mencapai target finansial dan kebutuhan terencana.
          </p>
        </div>

        <button
          onClick={() => setShowAddGoalModal(true)}
          className="relative z-10 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-medium text-xs hover:bg-indigo-500 transition shadow-xs flex items-center justify-center gap-2 self-start md:self-auto shrink-0"
        >
          <Plus className="w-4 h-4 text-white" />
          <span>+ Buat Target Tabungan</span>
        </button>
      </div>

      {/* Overview Aggregation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/90 dark:border-slate-800/90 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wide">
            Total Tabungan Terkumpul
          </span>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2 tracking-tight">
            {formatRupiah(totalSaved)}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-normal">
            Dari {savingsData?.goals_count || 0} target tabungan aktif
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/90 dark:border-slate-800/90 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wide">
            Total Target Tabungan
          </span>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2 tracking-tight">
            {formatRupiah(totalTarget)}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-normal">
            Sisa kebutuhan: {formatRupiah(Math.max(0, totalTarget - totalSaved))}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/90 dark:border-slate-800/90 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wide">
            Persentase Pencapaian
          </span>
          <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-2 tracking-tight">
            {overallPercentage}%
          </p>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden mt-3 border border-slate-200/50 dark:border-slate-700/60">
            <div
              className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(overallPercentage, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Goals Grid */}
      <div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <span>Daftar Target Tabungan</span>
          <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
            {savingsData?.goals?.length || 0}
          </span>
        </h3>

        {!savingsData?.goals || savingsData.goals.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800 shadow-xs text-slate-400 dark:text-slate-500 transition-colors">
            <PiggyBank className="w-12 h-12 mx-auto mb-3 opacity-30 text-indigo-600 dark:text-indigo-400" />
            <h4 className="font-bold text-slate-700 dark:text-slate-200 text-base">Belum Ada Target Tabungan</h4>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto">
              Mulai membuat target pertama Anda, misalnya Dana Darurat, Liburan, atau Investasi.
            </p>
            <button
              onClick={() => setShowAddGoalModal(true)}
              className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-xs transition"
            >
              + Buat Target Tabungan Sekarang
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {savingsData.goals.map((goal) => (
              <div
                key={goal.id}
                className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/90 dark:border-slate-800/90 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        goal.is_reached
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                          : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                      }`}>
                        <Target className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-base leading-tight">
                          {goal.title}
                        </h4>
                        {goal.target_date && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                            <Calendar className="w-3 h-3" />
                            <span>Target: {formatDateIndo(goal.target_date)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {goal.is_reached && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800/60">
                          Tercapai
                        </span>
                      )}
                      <button
                        onClick={() => handleDeleteGoal(goal.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition"
                        title="Hapus Target"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {goal.notes && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      {goal.notes}
                    </p>
                  )}

                  {/* Amounts & Progress */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400">Terkumpul:</span>
                      <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                        {formatRupiah(goal.current_amount)}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400">Target Total:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {formatRupiah(goal.target_amount)}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-200/60 dark:border-slate-700/60">
                      <div
                        className="h-full rounded-full transition-all duration-500 bg-indigo-600 dark:bg-indigo-500"
                        style={{ width: `${Math.min(goal.progress_percentage || 0, 100)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                      <span>{goal.progress_percentage}% tercapai</span>
                      <span>
                        {goal.is_reached ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Lunas</span>
                        ) : (
                          <span>Sisa {formatRupiah(goal.remaining_amount)}</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons for this goal */}
                <div className="pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedGoalForTx(goal)
                      setTxType('deposit')
                    }}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <ArrowDownCircle className="w-3.5 h-3.5" />
                    <span>Setor Tabungan</span>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedGoalForTx(goal)
                      setTxType('withdraw')
                    }}
                    disabled={goal.current_amount <= 0}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium text-xs transition disabled:opacity-40 flex items-center justify-center gap-1.5"
                  >
                    <ArrowUpCircle className="w-3.5 h-3.5" />
                    <span>Tarik Dana</span>
                  </button>
                </div>

                {/* Recent Transactions Mini Table */}
                {goal.transactions && goal.transactions.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <span className="font-semibold text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-wider block mb-2 flex items-center gap-1">
                      <History className="w-3 h-3 text-indigo-500 dark:text-indigo-400" />
                      <span>Riwayat Mutasi:</span>
                    </span>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-[11px]">
                        <thead>
                          <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                            <th className="pb-1 font-medium">Jenis</th>
                            <th className="pb-1 font-medium text-right">Nominal</th>
                            <th className="pb-1 font-medium text-right">Catatan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/60 dark:divide-slate-800/60">
                          {goal.transactions.slice(0, 3).map((tx) => (
                            <tr key={tx.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                              <td className="py-1.5 pr-2">
                                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                  tx.type === 'deposit'
                                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                    : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                                }`}>
                                  {tx.type === 'deposit' ? 'Setor' : 'Tarik'}
                                </span>
                              </td>
                              <td className={`py-1.5 pr-2 text-right font-bold whitespace-nowrap ${
                                tx.type === 'deposit' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                              }`}>
                                {tx.type === 'deposit' ? '+' : '-'}{formatRupiah(tx.amount)}
                              </td>
                              <td className="py-1.5 text-right text-slate-400 dark:text-slate-500 truncate max-w-[120px]">
                                {tx.notes || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Tambah Target Baru */}
      {showAddGoalModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-7 max-w-md w-full shadow-2xl relative border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setShowAddGoalModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <PiggyBank className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Buat Target Tabungan Baru</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500">Tentukan nama dan target nominal yang ingin dicapai</p>
              </div>
            </div>

            <form onSubmit={handleCreateGoal} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Target
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Contoh: Dana Darurat, Liburan"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Nominal (Rp)
                </label>
                <input
                  type="text"
                  required
                  value={newTargetAmount}
                  onChange={(e) => setNewTargetAmount(formatNumberWithDots(e.target.value))}
                  placeholder="Contoh: 10.000.000"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Tanggal Tercapai (Opsional)
                </label>
                <input
                  type="date"
                  value={newTargetDate}
                  onChange={(e) => setNewTargetDate(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Catatan / Keterangan (Opsional)
                </label>
                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Catatan khusus..."
                  rows={2}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>

              <button
                type="submit"
                disabled={loadingGoal}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs transition shadow-xs disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loadingGoal ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Buat Target Sekarang</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Setor / Tarik Tabungan */}
      {selectedGoalForTx && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-7 max-w-md w-full shadow-2xl relative border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setSelectedGoalForTx(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-5">
              <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
                Transaksi Tabungan
              </span>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">{selectedGoalForTx.title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Saldo saat ini: {formatRupiah(selectedGoalForTx.current_amount)}
              </p>
            </div>

            {/* Type Switcher */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-4 border border-slate-200/60 dark:border-slate-700/60">
              <button
                type="button"
                onClick={() => setTxType('deposit')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
                  txType === 'deposit'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                + Setor Tabungan
              </button>
              <button
                type="button"
                onClick={() => setTxType('withdraw')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
                  txType === 'withdraw'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                - Tarik Dana
              </button>
            </div>

            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nominal {txType === 'deposit' ? 'Setoran' : 'Penarikan'} (Rp)
                </label>
                <input
                  type="text"
                  required
                  value={txAmount}
                  onChange={(e) => setTxAmount(formatNumberWithDots(e.target.value))}
                  placeholder="Contoh: 50.000"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Catatan (Opsional)
                </label>
                <input
                  type="text"
                  value={txNotes}
                  onChange={(e) => setTxNotes(e.target.value)}
                  placeholder="Contoh: Dari sisa belanja hari ini"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>

              <button
                type="submit"
                disabled={loadingTx}
                className={`w-full py-2.5 text-white font-semibold rounded-xl text-xs transition shadow-xs disabled:opacity-60 flex items-center justify-center gap-2 ${
                  txType === 'deposit'
                    ? 'bg-indigo-600 hover:bg-indigo-500'
                    : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                {loadingTx ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span>
                    Konfirmasi {txType === 'deposit' ? 'Setoran Tabungan' : 'Penarikan Dana'}
                  </span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
