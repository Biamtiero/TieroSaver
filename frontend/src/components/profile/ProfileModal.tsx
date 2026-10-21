import React, { useState, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { authApi } from '../../services/api'
import {
  X,
  User as UserIcon,
  Mail,
  Lock,
  Camera,
  Trash2,
  Save,
  Download,
  Shield,
  Phone,
  Coins,
  Sparkles,
  Eye,
  EyeOff,
  AlertTriangle,
  KeyRound,
  FileSpreadsheet,
  Check,
} from 'lucide-react'

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
  onDataReset?: () => void
}

const PRESET_AVATARS = ['🦊', '🦁', '🚀', '💎', '💼', '🎓', '🎧', '⚡', '🐱', '🐼', '🦄', '⭐']

const CURRENCY_OPTIONS = [
  { code: 'IDR', label: 'IDR (Rp) - Rupiah Indonesia' },
  { code: 'USD', label: 'USD ($) - US Dollar' },
  { code: 'EUR', label: 'EUR (€) - Euro' },
  { code: 'SGD', label: 'SGD (S$) - Singapore Dollar' },
  { code: 'MYR', label: 'MYR (RM) - Malaysian Ringgit' },
]

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, onDataReset }) => {
  const { user, updateUser } = useAuth()
  const { showToast } = useToast()

  const [activeTab, setActiveTab] = useState<'info' | 'security' | 'data'>('info')

  // Info Tab Form
  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [currency, setCurrency] = useState(user?.currency || 'IDR')
  const [bio, setBio] = useState(user?.bio || '')
  const [avatarUrl, setAvatarUrl] = useState<string>(user?.avatar_url || '')
  const [isSavingInfo, setIsSavingInfo] = useState(false)

  // Security Tab Form
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showOldPass, setShowOldPass] = useState(false)
  const [showNewPass, setShowNewPass] = useState(false)
  const [isSavingPass, setIsSavingPass] = useState(false)

  // Danger zone state
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen || !user) return null

  // Handle Photo Upload from Local File
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      showToast('Ukuran foto maksimal 2 MB', 'error')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatarUrl(reader.result)
        showToast('Foto profil berhasil diunggah! Klik Simpan Perubahan.', 'info')
      }
    }
    reader.readAsDataURL(file)
  }

  // Handle Profile Info Submit
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      showToast('Nama lengkap tidak boleh kosong', 'error')
      return
    }
    if (!email.trim()) {
      showToast('Email tidak boleh kosong', 'error')
      return
    }

    setIsSavingInfo(true)
    try {
      const updated = await authApi.updateProfile({
        name: name.trim(),
        email: email.trim(),
        avatar_url: avatarUrl,
        phone: phone.trim(),
        currency,
        bio: bio.trim(),
      })
      updateUser(updated)
      showToast('Profil Anda berhasil diperbarui!', 'success')
    } catch (err: any) {
      const msg = err.message || err.response?.data?.error || 'Gagal memperbarui profil'
      showToast(msg, 'error')
    } finally {
      setIsSavingInfo(false)
    }
  }

  // Handle Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPassword) {
      showToast('Kata sandi baru wajib diisi', 'error')
      return
    }
    if (newPassword.length < 6) {
      showToast('Kata sandi baru minimal 6 karakter', 'error')
      return
    }
    if (newPassword !== confirmPassword) {
      showToast('Konfirmasi kata sandi baru tidak cocok', 'error')
      return
    }

    setIsSavingPass(true)
    try {
      await authApi.changePassword(oldPassword, newPassword)
      showToast('Kata sandi berhasil diubah!', 'success')
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      const msg = err.message || err.response?.data?.error || 'Gagal mengubah kata sandi'
      showToast(msg, 'error')
    } finally {
      setIsSavingPass(false)
    }
  }

  // Export User JSON Data Backup
  const handleExportBackup = () => {
    try {
      const expKey = `tierosaver_expenses_user_${user.id}`
      const budKey = `tierosaver_budget_user_${user.id}`
      const savKey = `tierosaver_savings_user_${user.id}`

      const backupData = {
        exported_at: new Date().toISOString(),
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        expenses: JSON.parse(localStorage.getItem(expKey) || '[]'),
        budgets: JSON.parse(localStorage.getItem(budKey) || '{}'),
        savings: JSON.parse(localStorage.getItem(savKey) || '[]'),
      }

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `TieroSaver_Backup_${user.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      showToast('File backup JSON berhasil diunduh!', 'success')
    } catch {
      showToast('Gagal mengekspor data backup', 'error')
    }
  }

  // Handle Reset All Data
  const handleConfirmReset = async () => {
    setIsResetting(true)
    try {
      await authApi.resetData()
      setShowResetConfirm(false)
      showToast('Semua riwayat transaksi & tabungan berhasil direset!', 'success')
      if (onDataReset) onDataReset()
    } catch {
      showToast('Gagal mereset data', 'error')
    } finally {
      setIsResetting(false)
    }
  }

  const isPresetAvatar = PRESET_AVATARS.includes(avatarUrl)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Pengaturan Profil & Akun
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Kelola identitas, foto profil, keamanan, dan preferensi Anda
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 px-6 bg-slate-50/60 dark:bg-slate-900/40">
          <button
            onClick={() => setActiveTab('info')}
            className={`py-3.5 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'info'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <UserIcon className="w-4 h-4" />
            <span>Informasi Pribadi</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`py-3.5 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'security'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Keamanan & Password</span>
          </button>

          <button
            onClick={() => setActiveTab('data')}
            className={`py-3.5 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'data'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Backup & Data</span>
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* TAB 1: INFORMASI PRIBADI */}
          {activeTab === 'info' && (
            <form onSubmit={handleSaveProfile} className="space-y-6">
              {/* Avatar Section */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
                {/* Big Avatar Preview */}
                <div className="relative group shrink-0">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20 overflow-hidden text-2xl font-bold ring-4 ring-white dark:ring-slate-800">
                    {avatarUrl ? (
                      isPresetAvatar ? (
                        <span className="text-3xl select-none">{avatarUrl}</span>
                      ) : (
                        <img
                          src={avatarUrl}
                          alt="Avatar"
                          className="w-full h-full object-cover"
                        />
                      )
                    ) : (
                      <span>{name ? name.charAt(0).toUpperCase() : 'U'}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="Unggah Foto dari Laptop/HP"
                    className="absolute -bottom-1 -right-1 w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-md hover:bg-indigo-500 transition"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>

                {/* Avatar Actions & Presets */}
                <div className="flex-1 text-center sm:text-left space-y-2">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition shadow-xs flex items-center gap-1.5"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Upload Foto</span>
                    </button>
                    {avatarUrl && (
                      <button
                        type="button"
                        onClick={() => setAvatarUrl('')}
                        className="px-3 py-1.5 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 transition flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus Foto</span>
                      </button>
                    )}
                  </div>

                  {/* Preset Avatar Emojis */}
                  <div>
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
                      Atau pilih karakter avatar cepat:
                    </span>
                    <div className="flex flex-wrap gap-1.5 justify-center sm:justify-start">
                      {PRESET_AVATARS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setAvatarUrl(emoji)}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition ${
                            avatarUrl === emoji
                              ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 scale-110 shadow-xs'
                              : 'bg-white dark:bg-slate-700 hover:scale-105 border border-slate-200/60 dark:border-slate-600'
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Inputs Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nama Lengkap */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Nama Lengkap <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nama Anda"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Alamat Email <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nama@email.com"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    />
                  </div>
                </div>

                {/* Nomor Telepon / WhatsApp */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Nomor WhatsApp / HP (Opsional)
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="081234567890"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    />
                  </div>
                </div>

                {/* Mata Uang */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Mata Uang Utama
                  </label>
                  <div className="relative">
                    <Coins className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    >
                      {CURRENCY_OPTIONS.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Bio / Motto */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Bio Finansial / Catatan Pribadi
                  </label>
                  <textarea
                    rows={2}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Contoh: Fokus nabung untuk beli rumah pertama & investasi jangka panjang."
                    className="w-full p-3 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 resize-none"
                  />
                </div>
              </div>

              {/* Submit Info Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSavingInfo}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingInfo ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: KEAMANAN & PASSWORD */}
          {activeTab === 'security' && (
            <form onSubmit={handleChangePassword} className="space-y-4 max-w-lg mx-auto py-2">
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-3">
                <KeyRound className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Pastikan kata sandi baru Anda minimal 6 karakter. Gunakan kombinasi huruf dan angka agar akun Anda lebih aman.
                </span>
              </div>

              {/* Password Lama */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Kata Sandi Saat Ini
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showOldPass ? 'text' : 'password'}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Masukkan kata sandi lama"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPass(!showOldPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showOldPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Password Baru */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Kata Sandi Baru (Min. 6 Karakter)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Konfirmasi Password Baru */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Ulangi Kata Sandi Baru
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ketik ulang kata sandi baru"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isSavingPass}
                  className="w-full py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Lock className="w-4 h-4" />
                  <span>{isSavingPass ? 'Memperbarui...' : 'Perbarui Kata Sandi'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: BACKUP & DATA MANAGEMENT */}
          {activeTab === 'data' && (
            <div className="space-y-6">
              {/* Account Metadata Card */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 grid grid-cols-2 sm:grid-cols-3 gap-4 text-center sm:text-left">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider block mb-0.5">
                    User ID Akun
                  </span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    #{user.id}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider block mb-0.5">
                    Bergabung Sejak
                  </span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {user.created_at
                      ? new Date(user.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : 'Baru saja'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider block mb-0.5">
                    Status Layanan
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <Check className="w-3.5 h-3.5" />
                    <span>Aktif & Tersinkron</span>
                  </span>
                </div>
              </div>

              {/* Data Backup Card */}
              <div className="p-5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Download className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Ekspor Data Cadangan (Backup JSON)</span>
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md">
                    Unduh seluruh arsip catatan keuangan, batas limit, dan tabungan Anda dalam format JSON untuk disimpan di komputer.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportBackup}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition flex items-center gap-2 shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Backup</span>
                </button>
              </div>

              {/* Danger Zone */}
              <div className="p-5 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/40 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-rose-600 dark:text-rose-400">
                      Zona Berbahaya: Reset Semua Data Transaksi
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      Tindakan ini akan menghapus semua pengeluaran dan mutasi tabungan di akun ini. Akun Anda tidak akan terhapus, tetapi data saldo akan kembali ke Rp 0.
                    </p>
                  </div>
                </div>

                {!showResetConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(true)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-300 dark:border-rose-800 transition"
                  >
                    Reset Data Transaksi Saya
                  </button>
                ) : (
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800 space-y-2">
                    <p className="text-xs font-medium text-rose-600 dark:text-rose-400">
                      Apakah Anda benar-benar yakin ingin menghapus semua catatan transaksi akun ini?
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isResetting}
                        onClick={handleConfirmReset}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 text-white hover:bg-rose-500 transition disabled:opacity-50"
                      >
                        {isResetting ? 'Mereset...' : 'Ya, Hapus Semua'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowResetConfirm(false)}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
