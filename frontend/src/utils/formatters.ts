export function formatRupiah(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return 'Rp 0'
  }
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDateIndo(dateStr: string): string {
  if (!dateStr) return '-'
  try {
    const parts = dateStr.split('-')
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10)
      const month = parseInt(parts[1], 10) - 1
      const day = parseInt(parts[2], 10)
      const date = new Date(year, month, day)
      return new Intl.DateTimeFormat('id-ID', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(date)
    }
    const d = new Date(dateStr)
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d)
  } catch {
    return dateStr
  }
}

export function getTodayDateString(): string {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const CATEGORIES = [
  { name: 'Makanan & Minuman', color: 'bg-indigo-50 text-indigo-700 border-indigo-200/60' },
  { name: 'Transportasi', color: 'bg-blue-50 text-blue-700 border-blue-200/60' },
  { name: 'Kebutuhan Harian', color: 'bg-teal-50 text-teal-700 border-teal-200/60' },
  { name: 'Tagihan & Pulsa', color: 'bg-violet-50 text-violet-700 border-violet-200/60' },
  { name: 'Hiburan & Hobi', color: 'bg-sky-50 text-sky-700 border-sky-200/60' },
  { name: 'Kesehatan', color: 'bg-emerald-50 text-emerald-700 border-emerald-200/60' },
  { name: 'Pendidikan', color: 'bg-slate-100 text-slate-700 border-slate-200/60' },
  { name: 'Lainnya', color: 'bg-slate-100 text-slate-600 border-slate-200/60' },
]

export function getCategoryBadge(categoryName: string) {
  const match = CATEGORIES.find(c => c.name.toLowerCase() === (categoryName || '').toLowerCase())
  return match || { name: categoryName || 'Lainnya', color: 'bg-slate-100 text-slate-600 border-slate-200/60' }
}

export function formatNumberWithDots(value: string | number): string {
  if (value === '' || value === null || value === undefined) return ''
  const cleanNumber = String(value).replace(/\D/g, '')
  if (!cleanNumber) return ''
  return new Intl.NumberFormat('id-ID').format(parseInt(cleanNumber, 10))
}

export function parseFormattedNumber(value: string): number {
  if (!value) return 0
  const cleanNumber = String(value).replace(/\D/g, '')
  return cleanNumber ? parseInt(cleanNumber, 10) : 0
}

export const CATEGORY_COLORS: Record<string, string> = {
  'Makanan & Minuman': '#4f46e5',
  'Transportasi': '#2563eb',
  'Kebutuhan Harian': '#0d9488',
  'Tagihan & Pulsa': '#7c3aed',
  'Hiburan & Hobi': '#0284c7',
  'Kesehatan': '#059669',
  'Pendidikan': '#475569',
  'Lainnya': '#94a3b8',
}

export function exportToCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const processCell = (cell: string | number) => {
    let str = cell === null || cell === undefined ? '' : String(cell)
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      str = `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const csvContent =
    '\uFEFF' + // UTF-8 BOM for Excel compatibility
    [headers.map(processCell).join(','), ...rows.map(row => row.map(processCell).join(','))].join('\r\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
