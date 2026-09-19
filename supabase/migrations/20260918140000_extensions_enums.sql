-- Extensions and domain enums
-- Generated from database/HEALTHCARE_DATABASE_BLUEPRINT.sql
-- Adapted for Supabase: auth.users → public.users; no credential duplication.

-- SECTION 2: EXTENSIONS & TYPES
-- ██████████████████████████████████████████████████████████████████████████████

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";       -- fuzzy text search
CREATE EXTENSION IF NOT EXISTS "btree_gist";    -- exclusion constraints

-- Custom ENUM types for domain integrity
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'gender_enum' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.gender_enum AS ENUM ('male', 'female', 'other', 'unknown');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'blood_group_enum' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.blood_group_enum AS ENUM ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'appointment_status' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.appointment_status AS ENUM (
  'draft', 'pending_payment', 'payment_processing', 'confirmed', 'upcoming',
  'checked_in', 'in_progress', 'completed', 'cancelled', 'rescheduled',
  'no_show', 'expired', 'refunded'
);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'payment_status' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.payment_status AS ENUM (
  'none', 'pending', 'processing', 'paid', 'failed',
  'cancelled', 'expired', 'refunded', 'partially_refunded'
);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'payment_method_enum' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.payment_method_enum AS ENUM (
  'upi', 'credit_card', 'debit_card', 'net_banking', 'wallet', 'cash', 'insurance'
);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'visit_type_enum' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.visit_type_enum AS ENUM (
  'in_person', 'video', 'phone', 'home_visit', 'emergency'
);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'service_type_enum' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.service_type_enum AS ENUM (
  'doctor_consultation', 'virtual_consultation', 'pharmacy_delivery',
  'home_care_nursing', 'lab_test', 'ambulance', 'emergency'
);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'record_status' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.record_status AS ENUM ('active', 'inactive', 'archived', 'deleted');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'severity_enum' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.severity_enum AS ENUM ('mild', 'moderate', 'severe', 'critical');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'allergy_severity_enum' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.allergy_severity_enum AS ENUM ('mild', 'moderate', 'severe', 'life_threatening');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'consent_status' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.consent_status AS ENUM ('granted', 'withdrawn', 'expired', 'pending');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'notification_channel' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.notification_channel AS ENUM ('push', 'email', 'sms', 'in_app');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'notification_status' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.notification_status AS ENUM ('pending', 'sent', 'delivered', 'read', 'failed');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'lab_order_status' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.lab_order_status AS ENUM (
  'ordered', 'specimen_collected', 'in_transit', 'received',
  'in_progress', 'completed', 'cancelled', 'amended'
);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'specimen_status' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.specimen_status AS ENUM (
  'collected', 'in_transit', 'received', 'rejected', 'processed'
);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'prescription_status' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.prescription_status AS ENUM ('active', 'dispensed', 'cancelled', 'expired');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'dispensing_status' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.dispensing_status AS ENUM (
  'pending', 'verified', 'dispensed', 'picked_up', 'delivered', 'returned'
);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'ambulance_status' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.ambulance_status AS ENUM (
  'available', 'dispatched', 'en_route', 'on_scene',
  'transporting', 'at_hospital', 'out_of_service'
);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'triage_level' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.triage_level AS ENUM (
  'resuscitation', 'emergent', 'urgent', 'less_urgent', 'non_urgent'
);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'bed_status' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.bed_status AS ENUM ('available', 'occupied', 'reserved', 'maintenance', 'cleaning');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'room_type' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.room_type AS ENUM (
  'consultation', 'examination', 'procedure', 'operation_theatre',
  'icu', 'nicu', 'emergency', 'observation', 'waiting', 'pharmacy', 'lab'
);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'staff_role' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.staff_role AS ENUM (
  'doctor', 'nurse', 'pharmacist', 'lab_tech', 'receptionist',
  'admin', 'ambulance_driver', 'caregiver', 'therapist', 'radiologist'
);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'claim_status' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.claim_status AS ENUM (
  'draft', 'submitted', 'under_review', 'additional_info_required',
  'approved', 'partially_approved', 'denied', 'appealed', 'paid', 'closed'
);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'telehealth_session_status' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.telehealth_session_status AS ENUM (
  'scheduled', 'waiting', 'in_progress', 'completed', 'cancelled', 'no_show'
);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'home_care_visit_status' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.home_care_visit_status AS ENUM (
  'scheduled', 'en_route', 'in_progress', 'completed', 'cancelled', 'rescheduled'
);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'inventory_transaction_type' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.inventory_transaction_type AS ENUM (
  'purchase', 'dispensing', 'return', 'adjustment', 'expired', 'transfer', 'damaged'
);
  END IF;
END $$;
