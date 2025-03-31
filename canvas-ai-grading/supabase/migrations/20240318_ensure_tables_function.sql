-- Create a function to ensure all required tables exist
CREATE OR REPLACE FUNCTION public.ensure_tables()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb := '{}'::jsonb;
  table_exists boolean;
BEGIN
  -- Check if the user_settings table exists
  SELECT EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'user_settings'
  ) INTO table_exists;
  
  IF NOT table_exists THEN
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
    
    result := result || '{"user_settings": "created"}'::jsonb;
  ELSE
    result := result || '{"user_settings": "already exists"}'::jsonb;
  END IF;
  
  -- Check if the profiles table exists
  SELECT EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'profiles'
  ) INTO table_exists;
  
  IF NOT table_exists THEN
    -- Create profiles table
    CREATE TABLE public.profiles (
      id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      title TEXT,
      institution TEXT,
      bio TEXT,
      avatar_url TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Create index for faster lookups by id
    CREATE INDEX profiles_id_idx ON public.profiles(id);

    -- Create RLS policies for profiles
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

    CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

    CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

    -- Create trigger for updated_at
    CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    
    result := result || '{"profiles": "created"}'::jsonb;
  ELSE
    result := result || '{"profiles": "already exists"}'::jsonb;
  END IF;
  
  -- Ensure the update_updated_at_column function exists
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
    
    result := result || '{"update_updated_at_column": "created"}'::jsonb;
  ELSE
    result := result || '{"update_updated_at_column": "already exists"}'::jsonb;
  END IF;
  
  -- Ensure the handle_new_user function and trigger exist
  IF NOT EXISTS (
    SELECT FROM pg_proc
    WHERE proname = 'handle_new_user'
    AND pronamespace = 'public'::regnamespace
  ) THEN
    CREATE FUNCTION public.handle_new_user()
    RETURNS TRIGGER AS $$
    BEGIN
      INSERT INTO public.profiles (id)
      VALUES (NEW.id);
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
    
    result := result || '{"handle_new_user": "created"}'::jsonb;
  ELSE
    result := result || '{"handle_new_user": "already exists"}'::jsonb;
  END IF;
  
  IF NOT EXISTS (
    SELECT FROM pg_trigger
    WHERE tgname = 'on_auth_user_created'
    AND tgrelid = 'auth.users'::regclass
  ) THEN
    CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    
    result := result || '{"on_auth_user_created": "created"}'::jsonb;
  ELSE
    result := result || '{"on_auth_user_created": "already exists"}'::jsonb;
  END IF;
  
  RETURN result;
END;
$$;

