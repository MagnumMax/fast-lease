-- Create a table to track CI/CD test runs for the Quality Dashboard
CREATE TABLE IF NOT EXISTS public.tecor_test_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    project_name TEXT NOT NULL DEFAULT 'fast-lease',
    status TEXT NOT NULL, -- 'success', 'failure', 'cancelled'
    duration_ms INTEGER,
    deploy_url TEXT,
    workflow_run_url TEXT,
    branch_name TEXT,
    test_results JSONB DEFAULT '{}'::jsonb -- Detailed metrics: tests_total, tests_passed, tests_failed
);

-- Enable RLS
ALTER TABLE public.tecor_test_runs ENABLE ROW LEVEL SECURITY;

-- Allow only ADMIN to read test results
CREATE POLICY "Allow admin to read test runs"
    ON public.tecor_test_runs
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_roles.user_id = auth.uid() 
        AND user_roles.role = 'ADMIN'
      )
    );

-- Allow service role (CI/CD) to insert test results
CREATE POLICY "Allow service role to insert test runs"
    ON public.tecor_test_runs
    FOR INSERT
    TO service_role
    WITH CHECK (true);
