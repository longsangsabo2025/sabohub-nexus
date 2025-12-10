-- Financial Transactions Schema
-- Purpose: Track company revenue and expenses
-- Philosophy: Simple but complete

-- Financial transactions table
CREATE TABLE IF NOT EXISTS public.financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('revenue', 'expense', 'invoice', 'payment')),
  category VARCHAR(50) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method VARCHAR(30),
  reference_id VARCHAR(100),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_financial_transactions_company ON public.financial_transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_date ON public.financial_transactions(date);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_type ON public.financial_transactions(type);

-- RLS Policies
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

-- CEO can see all financial data
CREATE POLICY "ceo_financial_all" ON public.financial_transactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = financial_transactions.company_id
      AND c.ceo_id = auth.uid()
    )
  );

-- Managers can view financial data
CREATE POLICY "manager_financial_view" ON public.financial_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.user_id = auth.uid()
      AND e.role IN ('manager', 'admin')
      AND e.company_id = financial_transactions.company_id
      AND e.deleted_at IS NULL
    )
  );

-- Workflow definitions table
CREATE TABLE IF NOT EXISTS public.workflow_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  trigger_type VARCHAR(50) NOT NULL,
  trigger_config JSONB DEFAULT '{}',
  actions JSONB[] DEFAULT '{}',
  enabled BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow execution logs
CREATE TABLE IF NOT EXISTS public.workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES public.workflow_definitions(id) ON DELETE CASCADE,
  trigger_data JSONB DEFAULT '{}',
  actions_executed JSONB[] DEFAULT '{}',
  status VARCHAR(20) CHECK (status IN ('success', 'failed', 'partial')),
  error_message TEXT,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workflow_definitions_company ON public.workflow_definitions(company_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow ON public.workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_date ON public.workflow_executions(executed_at);

-- RLS for workflows
ALTER TABLE public.workflow_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workflow_definitions_company" ON public.workflow_definitions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = workflow_definitions.company_id
      AND c.ceo_id = auth.uid()
    )
  );

CREATE POLICY "workflow_executions_view" ON public.workflow_executions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workflow_definitions wd
      JOIN public.companies c ON c.id = wd.company_id
      WHERE wd.id = workflow_executions.workflow_id
      AND c.ceo_id = auth.uid()
    )
  );

-- Report schedules table
CREATE TABLE IF NOT EXISTS public.report_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  type VARCHAR(20) CHECK (type IN ('daily', 'weekly', 'monthly', 'custom')),
  format VARCHAR(10) CHECK (format IN ('pdf', 'excel', 'csv')),
  recipients TEXT[] DEFAULT '{}',
  schedule_config JSONB DEFAULT '{}',
  template_config JSONB DEFAULT '{}',
  enabled BOOLEAN DEFAULT true,
  last_generated_at TIMESTAMPTZ,
  next_scheduled_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generated reports history
CREATE TABLE IF NOT EXISTS public.generated_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES public.report_schedules(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  file_url TEXT,
  file_size INTEGER,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  sent_to TEXT[],
  status VARCHAR(20) CHECK (status IN ('generating', 'completed', 'failed'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_report_schedules_company ON public.report_schedules(company_id);
CREATE INDEX IF NOT EXISTS idx_generated_reports_schedule ON public.generated_reports(schedule_id);
CREATE INDEX IF NOT EXISTS idx_generated_reports_date ON public.generated_reports(generated_at);

-- RLS for reports
ALTER TABLE public.report_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "report_schedules_company" ON public.report_schedules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = report_schedules.company_id
      AND c.ceo_id = auth.uid()
    )
  );

CREATE POLICY "generated_reports_company" ON public.generated_reports
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = generated_reports.company_id
      AND c.ceo_id = auth.uid()
    )
  );

-- Notification preferences table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  push_enabled BOOLEAN DEFAULT true,
  email_enabled BOOLEAN DEFAULT true,
  notification_types JSONB DEFAULT '{"task": true, "attendance": true, "report": true, "system": true}',
  quiet_hours JSONB DEFAULT '{"enabled": false, "start": "22:00", "end": "08:00"}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for preferences
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_preferences_own" ON public.notification_preferences
  FOR ALL USING (user_id = auth.uid());

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers
CREATE TRIGGER update_financial_transactions_updated_at BEFORE UPDATE ON public.financial_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_definitions_updated_at BEFORE UPDATE ON public.workflow_definitions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_report_schedules_updated_at BEFORE UPDATE ON public.report_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
