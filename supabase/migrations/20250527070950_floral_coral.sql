/*
  # Create initial schema for Zovia

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `full_name` (text)
      - `email` (text)
      - `phone` (text)
      - `location` (text)
      - `bio` (text)
      - `linkedin` (text)
      - `website` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `resumes`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `file_name` (text)
      - `file_type` (text)
      - `file_path` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `job_preferences`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `desired_roles` (text)
      - `job_types` (text)
      - `locations` (text)
      - `min_salary` (integer)
      - `remote_only` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `applications`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `job_title` (text)
      - `company` (text)
      - `job_description` (text)
      - `location` (text)
      - `salary` (text)
      - `application_date` (timestamptz)
      - `platform` (text)
      - `status` (text)
      - `job_url` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  location TEXT,
  bio TEXT,
  linkedin TEXT,
  website TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create resumes table
CREATE TABLE IF NOT EXISTS resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create job_preferences table
CREATE TABLE IF NOT EXISTS job_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  desired_roles TEXT NOT NULL,
  job_types TEXT,
  locations TEXT,
  min_salary INTEGER,
  remote_only BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create applications table
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_title TEXT NOT NULL,
  company TEXT NOT NULL,
  job_description TEXT,
  location TEXT,
  salary TEXT,
  application_date TIMESTAMPTZ DEFAULT now(),
  platform TEXT,
  status TEXT DEFAULT 'Applied',
  job_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" 
  ON profiles 
  FOR SELECT 
  TO authenticated 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON profiles 
  FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
  ON profiles 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = id);

-- Create policies for resumes
CREATE POLICY "Users can view their own resumes" 
  ON resumes 
  FOR SELECT 
  TO authenticated 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own resumes" 
  ON resumes 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own resumes" 
  ON resumes 
  FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own resumes" 
  ON resumes 
  FOR DELETE 
  TO authenticated 
  USING (auth.uid() = user_id);

-- Create policies for job_preferences
CREATE POLICY "Users can view their own job preferences" 
  ON job_preferences 
  FOR SELECT 
  TO authenticated 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own job preferences" 
  ON job_preferences 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own job preferences" 
  ON job_preferences 
  FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = user_id);

-- Create policies for applications
CREATE POLICY "Users can view their own applications" 
  ON applications 
  FOR SELECT 
  TO authenticated 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own applications" 
  ON applications 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own applications" 
  ON applications 
  FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = user_id);

-- Create trigger function to update timestamps
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for all tables
CREATE TRIGGER update_profiles_modtime
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_resumes_modtime
BEFORE UPDATE ON resumes
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_job_preferences_modtime
BEFORE UPDATE ON job_preferences
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_applications_modtime
BEFORE UPDATE ON applications
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();