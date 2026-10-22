-- ==============================================================
-- 🪙 TIEROSAVER - SUPABASE DATABASE INITIALIZATION SCRIPT
-- ==============================================================
-- Jalankan skrip ini di menu SQL Editor pada Dashboard Supabase Anda.
-- Skrip ini akan membuat tabel-tabel dan sistem keamanan Row Level Security (RLS)
-- sehingga setiap pengguna hanya bisa mengakses datanya sendiri.

-- 1. TABEL PROFILES (Biodata Pengguna Terhubung ke Auth Supabase)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'User',
    email TEXT NOT NULL,
    avatar_url TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    currency TEXT DEFAULT 'IDR',
    bio TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger Otomatis: Saat ada user baru register di Supabase, buatkan profilnya
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, name, email, avatar_url)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
        new.email,
        COALESCE(new.raw_user_meta_data->>'avatar_url', '')
    );

    -- Buat batas anggaran awal
    INSERT INTO public.budget_limits (user_id, daily_limit, weekly_limit, monthly_limit)
    VALUES (new.id, 100000, 600000, 2500000);

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. TABEL EXPENSES (Pencatatan Pengeluaran)
CREATE TABLE IF NOT EXISTS public.expenses (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    amount NUMERIC NOT NULL CHECK (amount >= 0),
    category TEXT NOT NULL,
    expense_date DATE NOT NULL,
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. TABEL BUDGET_LIMITS (Batas Anggaran)
CREATE TABLE IF NOT EXISTS public.budget_limits (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    daily_limit NUMERIC DEFAULT 0,
    weekly_limit NUMERIC DEFAULT 0,
    monthly_limit NUMERIC DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. TABEL SAVINGS_GOALS (Target Tabungan)
CREATE TABLE IF NOT EXISTS public.savings_goals (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    target_amount NUMERIC NOT NULL CHECK (target_amount > 0),
    current_amount NUMERIC DEFAULT 0,
    target_date DATE,
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. TABEL SAVINGS_TRANSACTIONS (Riwayat Setor/Tarik Tabungan)
CREATE TABLE IF NOT EXISTS public.savings_transactions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    savings_goal_id BIGINT NOT NULL REFERENCES public.savings_goals(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('deposit', 'withdraw')),
    amount NUMERIC NOT NULL CHECK (amount > 0),
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================
-- 🔒 KEAMANAN: ROW LEVEL SECURITY (RLS)
-- Data aman: Pengguna A tidak bisa mengintip / mengubah data Pengguna B
-- ==============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_transactions ENABLE ROW LEVEL SECURITY;

-- Policies for Profiles
CREATE POLICY "Users can manage own profile"
    ON public.profiles FOR ALL
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Policies for Expenses
CREATE POLICY "Users can manage own expenses"
    ON public.expenses FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policies for Budget Limits
CREATE POLICY "Users can manage own budget limits"
    ON public.budget_limits FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policies for Savings Goals
CREATE POLICY "Users can manage own savings goals"
    ON public.savings_goals FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policies for Savings Transactions
CREATE POLICY "Users can manage own savings transactions"
    ON public.savings_transactions FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
