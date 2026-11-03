#!/usr/bin/env python3
"""
Validates that the database schema defined in supabase/migrations
matches the columns and tables used by frontend React components.
"""

import os
import re
import sys

def validate():
    migration_file = "supabase/migrations/20261103000000_init_schema.sql"
    if not os.path.exists(migration_file):
        print(f"Error: Migration file not found: {migration_file}")
        sys.exit(1)

    with open(migration_file, "r") as f:
        schema_sql = f.read()

    # Tables to verify
    required_tables = ["profiles", "households", "orders"]
    for table in required_tables:
        if f"CREATE TABLE IF NOT EXISTS public.{table}" not in schema_sql:
            print(f"Error: Table {table} is missing from migration!")
            sys.exit(1)

    # Columns to verify from App.jsx and Shop.jsx
    required_profile_columns = [
        "full_name", "phone", "email", "address", "area", "family_members"
    ]
    for col in required_profile_columns:
        if not re.search(rf"\b{col}\b", schema_sql):
            print(f"Error: Column {col} missing in profiles table definition!")
            sys.exit(1)

    required_household_columns = [
        "household_code", "g_bin_status", "b_bin_status", "owner_id"
    ]
    for col in required_household_columns:
        if not re.search(rf"\b{col}\b", schema_sql):
            print(f"Error: Column {col} missing in households table definition!")
            sys.exit(1)

    required_order_columns = [
        "household_id", "product_type", "quantity", "delivery_address",
        "customer_notes", "status", "payment_status"
    ]
    for col in required_order_columns:
        if not re.search(rf"\b{col}\b", schema_sql):
            print(f"Error: Column {col} missing in orders table definition!")
            sys.exit(1)

    # Check triggers and RLS
    assert "handle_new_user" in schema_sql, "handle_new_user trigger function missing"
    assert "on_auth_user_created" in schema_sql, "on_auth_user_created trigger missing"
    assert "ENABLE ROW LEVEL SECURITY" in schema_sql, "RLS not enabled"

    print("All schema validations passed successfully!")

if __name__ == "__main__":
    validate()
