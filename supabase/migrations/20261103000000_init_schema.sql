-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. PROFILES TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    area TEXT,
    family_members INTEGER NOT NULL DEFAULT 1 CHECK (family_members >= 1),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.profiles IS 'Stores user profile and household registration details.';

-- ==============================================================================
-- 2. HOUSEHOLDS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.households (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    household_code TEXT NOT NULL UNIQUE,
    g_bin_status TEXT NOT NULL DEFAULT 'pending' CHECK (g_bin_status IN ('pending', 'distributed', 'damaged')),
    b_bin_status TEXT NOT NULL DEFAULT 'pending' CHECK (b_bin_status IN ('pending', 'distributed', 'damaged')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_households_owner UNIQUE (owner_id)
);

COMMENT ON TABLE public.households IS 'Stores household bin allocation status and household code.';

-- ==============================================================================
-- 3. ORDERS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
    product_type TEXT NOT NULL CHECK (product_type IN ('g_bin', 'b_bin', 'combo')),
    quantity INTEGER NOT NULL CHECK (quantity >= 1 AND quantity <= 50),
    delivery_address TEXT NOT NULL,
    customer_notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled')),
    payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'pending', 'paid', 'refunded')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.orders IS 'Stores bin purchase or replacement orders per household.';

-- ==============================================================================
-- 4. UPDATED_AT TRIGGER FUNCTION
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_profiles_modtime
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_households_modtime
    BEFORE UPDATE ON public.households
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_orders_modtime
    BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 5. AUTOMATIC PROFILE & HOUSEHOLD CREATION TRIGGER
-- ==============================================================================
-- Generates a readable household code e.g. GB-XXXXXX
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    gen_code TEXT;
    raw_full_name TEXT;
    raw_phone TEXT;
    raw_address TEXT;
    raw_area TEXT;
    raw_members INT;
BEGIN
    -- Extract values from user_metadata (passed during supabase.auth.signUp)
    raw_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'User');
    raw_phone     := NEW.raw_user_meta_data->>'phone';
    raw_address   := NEW.raw_user_meta_data->>'address';
    raw_area      := NEW.raw_user_meta_data->>'area';
    raw_members   := COALESCE((NEW.raw_user_meta_data->>'family_members')::INT, 1);

    -- Insert into profiles
    INSERT INTO public.profiles (
        id,
        full_name,
        phone,
        email,
        address,
        area,
        family_members
    ) VALUES (
        NEW.id,
        raw_full_name,
        raw_phone,
        NEW.email,
        raw_address,
        raw_area,
        raw_members
    );

    -- Generate unique household code: GB- + first 6 uppercase characters of UUID
    gen_code := 'GB-' || UPPER(SUBSTRING(REPLACE(NEW.id::TEXT, '-', ''), 1, 6));

    -- Insert into households
    INSERT INTO public.households (
        owner_id,
        household_code,
        g_bin_status,
        b_bin_status
    ) VALUES (
        NEW.id,
        gen_code,
        'pending',
        'pending'
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- --- Profiles policies ---
CREATE POLICY "Users can view own profile"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON public.profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- --- Households policies ---
CREATE POLICY "Users can view own household"
    ON public.households
    FOR SELECT
    TO authenticated
    USING (auth.uid() = owner_id);

CREATE POLICY "Users can update own household"
    ON public.households
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

-- --- Orders policies ---
CREATE POLICY "Users can view own household orders"
    ON public.orders
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.households h
            WHERE h.id = orders.household_id
            AND h.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert orders for own household"
    ON public.orders
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.households h
            WHERE h.id = household_id
            AND h.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can update orders for own household"
    ON public.orders
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.households h
            WHERE h.id = orders.household_id
            AND h.owner_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.households h
            WHERE h.id = household_id
            AND h.owner_id = auth.uid()
        )
    );
