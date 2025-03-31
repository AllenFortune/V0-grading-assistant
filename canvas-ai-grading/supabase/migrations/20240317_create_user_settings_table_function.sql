-- Create a function to create the user_settings table if it doesn't exist
CREATE OR REPLACE FUNCTION public.create_user_settings_table()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the user_settings table exists
  IF NOT EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'user_settings'
  ) THEN
    -- Create user_settings table
    CREATE TABLE public.user_settings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      canvas_url TEXT,
      canvas_token TEXT,
      canvas_token_name TEXT,
      auto_sync BOOLEAN DEFAULT true,
      sync_frequency TEXT DEFAULT 'daily',
      notifications_enabled BOOLEAN DEFAULT true,
      email_notifications BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Create index for faster lookups by user_id
    CREATE INDEX user_settings_user_id_idx ON public.user_settings(user_id);

    -- Create RLS policies for user_settings
    ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Users can view their own settings"
    ON public.user_settings FOR SELECT
    USING (auth.uid() = user_id);

    CREATE POLICY "Users can insert their own settings"
    ON public.user_settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update their own settings"
    ON public.user_settings FOR UPDATE
    USING (auth.uid() = user_id);

    -- Create trigger for updated_at
    CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON public.user_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END;
$$;

-- Create the update_updated_at_column function if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_proc
    WHERE proname = 'update_updated_at_column'
    AND pronamespace = 'public'::regnamespace
  ) THEN
    CREATE FUNCTION public.update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  END IF;
END $$;

