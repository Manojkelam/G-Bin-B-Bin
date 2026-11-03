# G-Bin & B-Bin: Smart Waste Segregation and Management System

A modern full-stack web application designed to encourage household waste segregation at source (G-Bin for biodegradable waste, B-Bin for dry recyclables), manage bin allocations, and allow residents to order bins.

---

## Architecture Overview

- **Frontend:** React 19 + Vite (`frontend/`)
- **Backend & Database:** Supabase (`supabase/`)
  - **Auth:** Supabase Authentication (Email/Password registration, login, password recovery).
  - **PostgreSQL Database:**
    - `profiles`: User contact and household demographic details.
    - `households`: Household identification code (`GB-XXXXXX`) and bin statuses (`g_bin_status`, `b_bin_status`).
    - `orders`: Household order requests for G-Bin, B-Bin, or Combo sets.
  - **Triggers:**
    - `handle_new_user`: Automatically creates a `profiles` entry and a linked `households` entry when a resident registers.
    - `handle_updated_at`: Maintains accurate `updated_at` timestamps on row modifications.
  - **Row Level Security (RLS):** Authenticated users can only read and update their own profile, household, and order records.

---

## Backend Setup Guide

You can run the backend either locally using the **Supabase CLI** or deploy it to a hosted project on **Supabase Cloud**.

### Option A: Local Backend Setup (Supabase CLI)

1. **Prerequisites:**
   - Docker installed and running on your system.
   - Node.js (v18+) and npm.

2. **Start Local Supabase:**
   From the repository root directory, run:
   ```bash
   npx supabase start
   ```
   This will spin up PostgreSQL, Auth (GoTrue), PostgREST API, Inbucket (email testing), and Supabase Studio.

3. **Apply Database Migrations and Seed Data:**
   ```bash
   npx supabase db reset
   ```
   This runs all SQL migrations in `supabase/migrations/` and populates sample data from `supabase/seed.sql`.

4. **Retrieve API Credentials:**
   Run:
   ```bash
   npx supabase status
   ```
   Note down the `Project URL` (typically `http://127.0.0.1:54321`) and `anon key`.

5. **Stop Local Supabase Services:**
   When finished, you can stop the local containers:
   ```bash
   npx supabase stop
   ```

---

### Option B: Hosted Supabase Cloud Setup

1. **Create a Supabase Project:**
   - Go to [supabase.com](https://supabase.com) and create a new project.
   - Go to **Project Settings -> API** to get your **Project URL** and **anon public key**.

2. **Run Migrations:**
   - Go to the **SQL Editor** in the Supabase Dashboard.
   - Copy and paste the contents of `supabase/migrations/20261103000000_init_schema.sql` into the editor and click **Run**.
   - (Optional) Copy and paste `supabase/seed.sql` to populate sample records.

---

## Frontend Setup Guide

1. **Install Dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Configure Environment Variables:**
   Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```
   Open `.env.local` and set your credentials:
   ```env
   VITE_SUPABASE_URL=http://127.0.0.1:54321
   VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
   ```

3. **Start the Development Server:**
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:5173`.

4. **Build for Production:**
   ```bash
   npm run build
   ```

---

## Database Schema Reference

### `public.profiles`
| Column | Type | Constraints / Description |
|---|---|---|
| `id` | `UUID` | Primary Key, references `auth.users(id)` |
| `full_name` | `TEXT` | Resident full name |
| `phone` | `TEXT` | Mobile number |
| `email` | `TEXT` | Registered email |
| `address` | `TEXT` | Full street address |
| `area` | `TEXT` | Area / City |
| `family_members` | `INTEGER` | Number of family members (>= 1) |
| `created_at` | `TIMESTAMPTZ` | Record creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | Record last update timestamp |

### `public.households`
| Column | Type | Constraints / Description |
|---|---|---|
| `id` | `UUID` | Primary Key (`gen_random_uuid()`) |
| `owner_id` | `UUID` | Unique, references `auth.users(id)` |
| `household_code` | `TEXT` | Unique household identifier (`GB-XXXXXX`) |
| `g_bin_status` | `TEXT` | Status: `pending`, `distributed`, `damaged` |
| `b_bin_status` | `TEXT` | Status: `pending`, `distributed`, `damaged` |
| `created_at` | `TIMESTAMPTZ` | Record creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | Record last update timestamp |

### `public.orders`
| Column | Type | Constraints / Description |
|---|---|---|
| `id` | `UUID` | Primary Key (`gen_random_uuid()`) |
| `household_id` | `UUID` | References `public.households(id)` |
| `product_type` | `TEXT` | One of `g_bin`, `b_bin`, `combo` |
| `quantity` | `INTEGER` | Quantity between 1 and 50 |
| `delivery_address` | `TEXT` | Shipping / delivery address |
| `customer_notes` | `TEXT` | Optional delivery notes |
| `status` | `TEXT` | Order state: `pending`, `confirmed`, `packed`, `shipped`, `delivered`, `cancelled` |
| `payment_status` | `TEXT` | Payment status: `unpaid`, `pending`, `paid`, `refunded` |
| `created_at` | `TIMESTAMPTZ` | Order placement timestamp |
| `updated_at` | `TIMESTAMPTZ` | Record update timestamp |
