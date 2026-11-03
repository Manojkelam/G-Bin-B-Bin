-- ==============================================================================
-- Supabase Local Development Seed Data
-- ==============================================================================

DO $$
DECLARE
    demo_user_id UUID := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    demo_household_id UUID := 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
BEGIN
    -- Ensure user exists in auth.users for local development/seed testing
    -- (This prevents foreign key constraint violations on profiles.id and households.owner_id)
    INSERT INTO auth.users (
        id,
        instance_id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at
    ) VALUES (
        demo_user_id,
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        'demo@example.com',
        crypt('Password123!', gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}',
        '{"full_name":"Demo Household Resident","phone":"+91 9876543210","address":"Flat 101, Green Heights, Sector 4","area":"Indiranagar","family_members":4}',
        now(),
        now()
    )
    ON CONFLICT (id) DO NOTHING;

    -- Seed / update demo profile
    INSERT INTO public.profiles (
        id,
        full_name,
        phone,
        email,
        address,
        area,
        family_members
    ) VALUES (
        demo_user_id,
        'Demo Household Resident',
        '+91 9876543210',
        'demo@example.com',
        'Flat 101, Green Heights, Sector 4',
        'Indiranagar',
        4
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        phone = EXCLUDED.phone,
        address = EXCLUDED.address,
        area = EXCLUDED.area,
        family_members = EXCLUDED.family_members;

    -- Seed / update demo household
    INSERT INTO public.households (
        id,
        owner_id,
        household_code,
        g_bin_status,
        b_bin_status
    ) VALUES (
        demo_household_id,
        demo_user_id,
        'GB-DEMO01',
        'distributed',
        'distributed'
    )
    ON CONFLICT (id) DO UPDATE SET
        household_code = EXCLUDED.household_code,
        g_bin_status = EXCLUDED.g_bin_status,
        b_bin_status = EXCLUDED.b_bin_status;

    -- Seed demo orders
    INSERT INTO public.orders (
        id,
        household_id,
        product_type,
        quantity,
        delivery_address,
        customer_notes,
        status,
        payment_status
    ) VALUES
    (
        'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
        demo_household_id,
        'combo',
        1,
        'Flat 101, Green Heights, Sector 4, Indiranagar',
        'Please deliver during morning hours',
        'delivered',
        'paid'
    ),
    (
        'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
        demo_household_id,
        'g_bin',
        1,
        'Flat 101, Green Heights, Sector 4, Indiranagar',
        'Replacement for damaged bin lid',
        'pending',
        'unpaid'
    )
    ON CONFLICT (id) DO NOTHING;
END $$;
