// Types for Full Accounting Module
// Matches database schema from migration 037

export interface ChartOfAccount {
  id: string;
  company_id: string;
  account_code: string;
  account_name: string;
  account_name_en?: string;
  description?: string;
  account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  account_subtype?: string;
  account_category?: string;
  parent_account_id?: string;
  level: number;
  path?: string;
  normal_balance: 'debit' | 'credit';
  is_header: boolean;
  is_control_account: boolean;
  is_reconcilable: boolean;
  opening_balance: number;
  opening_balance_date?: string;
  allow_manual_journal: boolean;
  currency: string;
  is_active: boolean;
  is_system_account: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface GeneralLedger {
  id: string;
  company_id: string;
  account_id: string;
  fiscal_year: number;
  fiscal_period: number;
  period_start_date: string;
  period_end_date: string;
  opening_balance_debit: number;
  opening_balance_credit: number;
  opening_balance: number;
  period_debit: number;
  period_credit: number;
  period_net: number;
  closing_balance_debit: number;
  closing_balance_credit: number;
  closing_balance: number;
  is_closed: boolean;
  closed_by?: string;
  closed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface JournalEntry {
  id: string;
  company_id: string;
  entry_number: string;
  entry_date: string;
  posting_date: string;
  fiscal_year: number;
  fiscal_period: number;
  entry_type: 'manual' | 'automatic' | 'adjustment' | 'closing' | 'opening';
  source_module?: string;
  source_document_type?: string;
  source_document_id?: string;
  description: string;
  reference?: string;
  total_debit: number;
  total_credit: number;
  status: 'draft' | 'posted' | 'voided' | 'reversed';
  posted_by?: string;
  posted_at?: string;
  reversed_by?: string;
  reversed_at?: string;
  reversal_entry_id?: string;
  requires_approval: boolean;
  approved_by?: string;
  approved_at?: string;
  attachments: string[];
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface JournalEntryLine {
  id: string;
  journal_entry_id: string;
  account_id: string;
  line_number: number;
  description?: string;
  debit: number;
  credit: number;
  cost_center?: string;
  department?: string;
  project_id?: string;
  dimension1?: string;
  dimension2?: string;
  dimension3?: string;
  created_at: string;
}

export interface FiscalPeriod {
  id: string;
  company_id: string;
  fiscal_year: number;
  period_number: number;
  period_name: string;
  start_date: string;
  end_date: string;
  status: 'open' | 'closed' | 'locked';
  closed_by?: string;
  closed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface FinancialStatement {
  id: string;
  company_id: string;
  statement_type: 'balance_sheet' | 'income_statement' | 'cash_flow' | 'trial_balance';
  fiscal_year: number;
  fiscal_period?: number;
  start_date: string;
  end_date: string;
  statement_data: any;
  generated_at: string;
  generated_by?: string;
}

// ===== INPUT TYPES FOR API =====

export interface CreateAccountInput {
  account_code: string;
  account_name: string;
  account_name_en?: string;
  description?: string;
  account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  account_subtype?: string;
  account_category?: string;
  parent_account_id?: string;
  is_header?: boolean;
  is_control_account?: boolean;
  is_reconcilable?: boolean;
  opening_balance?: number;
  opening_balance_date?: string;
  allow_manual_journal?: boolean;
  currency?: string;
}

export interface UpdateAccountInput {
  account_name?: string;
  account_name_en?: string;
  description?: string;
  account_subtype?: string;
  account_category?: string;
  parent_account_id?: string;
  is_header?: boolean;
  is_control_account?: boolean;
  is_reconcilable?: boolean;
  allow_manual_journal?: boolean;
  is_active?: boolean;
}

export interface CreateJournalEntryInput {
  entry_date: string;
  posting_date: string;
  entry_type?: 'manual' | 'automatic' | 'adjustment' | 'closing' | 'opening';
  source_module?: string;
  source_document_type?: string;
  source_document_id?: string;
  description: string;
  reference?: string;
  lines: Array<{
    account_id: string;
    description?: string;
    debit?: number;
    credit?: number;
    cost_center?: string;
    department?: string;
    project_id?: string;
    dimension1?: string;
    dimension2?: string;
    dimension3?: string;
  }>;
  requires_approval?: boolean;
  attachments?: string[];
}

export interface AccountFilters {
  account_type?: string;
  parent_account_id?: string;
  is_active?: boolean;
  is_header?: boolean;
  search?: string;
}

export interface JournalEntryFilters {
  entry_type?: string;
  source_module?: string;
  status?: string;
  from_date?: string;
  to_date?: string;
  fiscal_year?: number;
  fiscal_period?: number;
  account_id?: string;
}

export interface GeneralLedgerFilters {
  account_id?: string;
  fiscal_year?: number;
  fiscal_period?: number;
  from_date?: string;
  to_date?: string;
}

export interface TrialBalanceData {
  accounts: Array<{
    account_id: string;
    account_code: string;
    account_name: string;
    account_type: string;
    opening_debit: number;
    opening_credit: number;
    period_debit: number;
    period_credit: number;
    closing_debit: number;
    closing_credit: number;
  }>;
  totals: {
    opening_debit: number;
    opening_credit: number;
    period_debit: number;
    period_credit: number;
    closing_debit: number;
    closing_credit: number;
  };
}

export interface BalanceSheetData {
  assets: {
    current_assets: Array<{ account: string; amount: number }>;
    fixed_assets: Array<{ account: string; amount: number }>;
    total: number;
  };
  liabilities: {
    current_liabilities: Array<{ account: string; amount: number }>;
    long_term_liabilities: Array<{ account: string; amount: number }>;
    total: number;
  };
  equity: {
    items: Array<{ account: string; amount: number }>;
    total: number;
  };
}

export interface IncomeStatementData {
  revenue: {
    items: Array<{ account: string; amount: number }>;
    total: number;
  };
  cost_of_goods_sold: {
    items: Array<{ account: string; amount: number }>;
    total: number;
  };
  gross_profit: number;
  operating_expenses: {
    items: Array<{ account: string; amount: number }>;
    total: number;
  };
  operating_income: number;
  other_income: {
    items: Array<{ account: string; amount: number }>;
    total: number;
  };
  net_income: number;
}
