import { supabase } from '@/lib/supabase';
import type {
  ChartOfAccount,
  GeneralLedger,
  JournalEntry,
  JournalEntryLine,
  FiscalPeriod,
  FinancialStatement,
  CreateAccountInput,
  UpdateAccountInput,
  CreateJournalEntryInput,
  AccountFilters,
  JournalEntryFilters,
  GeneralLedgerFilters,
  TrialBalanceData,
  BalanceSheetData,
  IncomeStatementData,
} from '@/types/accounting';

class AccountingService {
  private getCompanyId(): string | null {
    return localStorage.getItem('company_id');
  }

  private getUserId(): string | null {
    return localStorage.getItem('user_id');
  }

  // ========== CHART OF ACCOUNTS ==========

  async getAllAccounts(filters: AccountFilters = {}): Promise<ChartOfAccount[]> {
    const companyId = this.getCompanyId();
    if (!companyId) throw new Error('Company ID not found');

    let query = supabase
      .from('chart_of_accounts')
      .select('*')
      .eq('company_id', companyId);

    if (filters.account_type) {
      query = query.eq('account_type', filters.account_type);
    }
    if (filters.parent_account_id !== undefined) {
      if (filters.parent_account_id === null) {
        query = query.is('parent_account_id', null);
      } else {
        query = query.eq('parent_account_id', filters.parent_account_id);
      }
    }
    if (filters.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }
    if (filters.is_header !== undefined) {
      query = query.eq('is_header', filters.is_header);
    }
    if (filters.search) {
      query = query.or(`account_code.ilike.%${filters.search}%,account_name.ilike.%${filters.search}%`);
    }

    const { data, error } = await query.order('account_code', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async getAccountById(id: string): Promise<ChartOfAccount | null> {
    const { data, error } = await supabase
      .from('chart_of_accounts')
      .select('*, parent:parent_account_id(id, account_code, account_name)')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async createAccount(input: CreateAccountInput): Promise<ChartOfAccount> {
    const companyId = this.getCompanyId();
    const userId = this.getUserId();
    if (!companyId) throw new Error('Company ID not found');

    // Determine level and path
    let level = 1;
    let path = input.account_code;
    
    if (input.parent_account_id) {
      const { data: parent } = await supabase
        .from('chart_of_accounts')
        .select('level, path')
        .eq('id', input.parent_account_id)
        .single();

      if (parent) {
        level = parent.level + 1;
        path = `${parent.path}/${input.account_code}`;
      }
    }

    // Determine normal balance based on account type
    let normalBalance: 'debit' | 'credit' = 'debit';
    if (['liability', 'equity', 'revenue'].includes(input.account_type)) {
      normalBalance = 'credit';
    }

    const { data, error } = await supabase
      .from('chart_of_accounts')
      .insert({
        company_id: companyId,
        account_code: input.account_code,
        account_name: input.account_name,
        account_name_en: input.account_name_en,
        description: input.description,
        account_type: input.account_type,
        account_subtype: input.account_subtype,
        account_category: input.account_category,
        parent_account_id: input.parent_account_id,
        level: level,
        path: path,
        normal_balance: normalBalance,
        is_header: input.is_header || false,
        is_control_account: input.is_control_account || false,
        is_reconcilable: input.is_reconcilable || false,
        opening_balance: input.opening_balance || 0,
        opening_balance_date: input.opening_balance_date,
        allow_manual_journal: input.allow_manual_journal !== undefined ? input.allow_manual_journal : true,
        currency: input.currency || 'VND',
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateAccount(id: string, input: UpdateAccountInput): Promise<ChartOfAccount> {
    const { data, error } = await supabase
      .from('chart_of_accounts')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteAccount(id: string): Promise<void> {
    // Check if account is system account
    const { data: account } = await supabase
      .from('chart_of_accounts')
      .select('is_system_account')
      .eq('id', id)
      .single();

    if (account?.is_system_account) {
      throw new Error('Cannot delete system account');
    }

    // Soft delete
    const { error } = await supabase
      .from('chart_of_accounts')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;
  }

  async seedStandardChartOfAccounts(): Promise<void> {
    const companyId = this.getCompanyId();
    if (!companyId) throw new Error('Company ID not found');

    const { error } = await supabase.rpc('seed_standard_chart_of_accounts', {
      p_company_id: companyId,
    });

    if (error) throw error;
  }

  // ========== JOURNAL ENTRIES ==========

  async getAllJournalEntries(filters: JournalEntryFilters = {}): Promise<JournalEntry[]> {
    const companyId = this.getCompanyId();
    if (!companyId) throw new Error('Company ID not found');

    let query = supabase
      .from('journal_entries')
      .select(`
        *,
        posted_by_user:posted_by(id, display_name),
        approved_by_user:approved_by(id, display_name)
      `)
      .eq('company_id', companyId);

    if (filters.entry_type) {
      query = query.eq('entry_type', filters.entry_type);
    }
    if (filters.source_module) {
      query = query.eq('source_module', filters.source_module);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.from_date) {
      query = query.gte('entry_date', filters.from_date);
    }
    if (filters.to_date) {
      query = query.lte('entry_date', filters.to_date);
    }
    if (filters.fiscal_year) {
      query = query.eq('fiscal_year', filters.fiscal_year);
    }
    if (filters.fiscal_period) {
      query = query.eq('fiscal_period', filters.fiscal_period);
    }

    const { data, error } = await query.order('entry_date', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getJournalEntryById(id: string): Promise<JournalEntry | null> {
    const { data, error } = await supabase
      .from('journal_entries')
      .select(`
        *,
        lines:journal_entry_lines(
          *,
          account:account_id(id, account_code, account_name)
        ),
        posted_by_user:posted_by(id, display_name),
        approved_by_user:approved_by(id, display_name)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async createJournalEntry(input: CreateJournalEntryInput): Promise<JournalEntry> {
    const companyId = this.getCompanyId();
    const userId = this.getUserId();
    if (!companyId) throw new Error('Company ID not found');

    // Validate lines balance
    const totalDebit = input.lines.reduce((sum, line) => sum + (line.debit || 0), 0);
    const totalCredit = input.lines.reduce((sum, line) => sum + (line.credit || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error('Journal entry is not balanced');
    }

    // Determine fiscal year and period from entry date
    const entryDate = new Date(input.entry_date);
    const fiscalYear = entryDate.getFullYear();
    const fiscalPeriod = entryDate.getMonth() + 1;

    // Generate entry number
    const { data: entryNumber, error: rpcError } = await supabase
      .rpc('generate_journal_entry_number', {
        p_company_id: companyId,
        p_entry_type: input.entry_type || 'manual',
      });

    if (rpcError) throw rpcError;

    // Create journal entry
    const { data: entry, error: entryError } = await supabase
      .from('journal_entries')
      .insert({
        company_id: companyId,
        entry_number: entryNumber,
        entry_date: input.entry_date,
        posting_date: input.posting_date,
        fiscal_year: fiscalYear,
        fiscal_period: fiscalPeriod,
        entry_type: input.entry_type || 'manual',
        source_module: input.source_module,
        source_document_type: input.source_document_type,
        source_document_id: input.source_document_id,
        description: input.description,
        reference: input.reference,
        total_debit: totalDebit,
        total_credit: totalCredit,
        status: 'draft',
        requires_approval: input.requires_approval || false,
        attachments: input.attachments || [],
        created_by: userId,
      })
      .select()
      .single();

    if (entryError) throw entryError;

    // Create journal entry lines
    const lines = input.lines.map((line, index) => ({
      journal_entry_id: entry.id,
      account_id: line.account_id,
      line_number: index + 1,
      description: line.description,
      debit: line.debit || 0,
      credit: line.credit || 0,
      cost_center: line.cost_center,
      department: line.department,
      project_id: line.project_id,
      dimension1: line.dimension1,
      dimension2: line.dimension2,
      dimension3: line.dimension3,
    }));

    const { error: linesError } = await supabase
      .from('journal_entry_lines')
      .insert(lines);

    if (linesError) throw linesError;

    return entry;
  }

  async postJournalEntry(id: string): Promise<void> {
    const userId = this.getUserId();

    const { error } = await supabase
      .from('journal_entries')
      .update({
        status: 'posted',
        posted_by: userId,
        posted_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
  }

  async voidJournalEntry(id: string): Promise<void> {
    const { error } = await supabase
      .from('journal_entries')
      .update({ status: 'voided' })
      .eq('id', id);

    if (error) throw error;
  }

  async reverseJournalEntry(id: string, reversalDate: string): Promise<JournalEntry> {
    // Get original entry
    const original = await this.getJournalEntryById(id);
    if (!original) throw new Error('Journal entry not found');

    // Create reversal entry with opposite signs
    const reversalLines = (original as any).lines.map((line: any) => ({
      account_id: line.account_id,
      description: `Reversal: ${line.description || ''}`,
      debit: line.credit, // Swap debit and credit
      credit: line.debit,
      cost_center: line.cost_center,
      department: line.department,
      project_id: line.project_id,
    }));

    const reversalEntry = await this.createJournalEntry({
      entry_date: reversalDate,
      posting_date: reversalDate,
      entry_type: 'adjustment',
      description: `Reversal of ${original.entry_number}: ${original.description}`,
      reference: original.entry_number,
      lines: reversalLines,
    });

    // Post reversal entry
    await this.postJournalEntry(reversalEntry.id);

    // Update original entry
    const userId = this.getUserId();
    await supabase
      .from('journal_entries')
      .update({
        status: 'reversed',
        reversed_by: userId,
        reversed_at: new Date().toISOString(),
        reversal_entry_id: reversalEntry.id,
      })
      .eq('id', id);

    return reversalEntry;
  }

  // ========== GENERAL LEDGER ==========

  async getGeneralLedger(filters: GeneralLedgerFilters = {}): Promise<GeneralLedger[]> {
    const companyId = this.getCompanyId();
    if (!companyId) throw new Error('Company ID not found');

    let query = supabase
      .from('general_ledger')
      .select(`
        *,
        account:account_id(id, account_code, account_name, account_type)
      `)
      .eq('company_id', companyId);

    if (filters.account_id) {
      query = query.eq('account_id', filters.account_id);
    }
    if (filters.fiscal_year) {
      query = query.eq('fiscal_year', filters.fiscal_year);
    }
    if (filters.fiscal_period) {
      query = query.eq('fiscal_period', filters.fiscal_period);
    }
    if (filters.from_date) {
      query = query.gte('period_start_date', filters.from_date);
    }
    if (filters.to_date) {
      query = query.lte('period_end_date', filters.to_date);
    }

    const { data, error } = await query.order('fiscal_year', { ascending: false })
      .order('fiscal_period', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // ========== FISCAL PERIODS ==========

  async getAllFiscalPeriods(fiscalYear?: number): Promise<FiscalPeriod[]> {
    const companyId = this.getCompanyId();
    if (!companyId) throw new Error('Company ID not found');

    let query = supabase
      .from('fiscal_periods')
      .select('*')
      .eq('company_id', companyId);

    if (fiscalYear) {
      query = query.eq('fiscal_year', fiscalYear);
    }

    const { data, error } = await query
      .order('fiscal_year', { ascending: false })
      .order('period_number', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async closeFiscalPeriod(id: string): Promise<void> {
    const userId = this.getUserId();

    const { error } = await supabase
      .from('fiscal_periods')
      .update({
        status: 'closed',
        closed_by: userId,
        closed_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
  }

  // ========== FINANCIAL STATEMENTS ==========

  async getTrialBalance(startDate: string, endDate: string): Promise<TrialBalanceData> {
    const companyId = this.getCompanyId();
    if (!companyId) throw new Error('Company ID not found');

    // Get all accounts
    const accounts = await this.getAllAccounts({ is_active: true, is_header: false });

    // Get GL data for the period
    const glData = await this.getGeneralLedger({
      from_date: startDate,
      to_date: endDate,
    });

    // Build trial balance
    const accountsData = accounts.map(account => {
      const glRecords = glData.filter(gl => (gl as any).account_id === account.id);
      
      const opening_debit = glRecords.reduce((sum, gl) => sum + gl.opening_balance_debit, 0);
      const opening_credit = glRecords.reduce((sum, gl) => sum + gl.opening_balance_credit, 0);
      const period_debit = glRecords.reduce((sum, gl) => sum + gl.period_debit, 0);
      const period_credit = glRecords.reduce((sum, gl) => sum + gl.period_credit, 0);
      const closing_debit = glRecords.reduce((sum, gl) => sum + gl.closing_balance_debit, 0);
      const closing_credit = glRecords.reduce((sum, gl) => sum + gl.closing_balance_credit, 0);

      return {
        account_id: account.id,
        account_code: account.account_code,
        account_name: account.account_name,
        account_type: account.account_type,
        opening_debit,
        opening_credit,
        period_debit,
        period_credit,
        closing_debit,
        closing_credit,
      };
    });

    // Calculate totals
    const totals = accountsData.reduce((acc, item) => ({
      opening_debit: acc.opening_debit + item.opening_debit,
      opening_credit: acc.opening_credit + item.opening_credit,
      period_debit: acc.period_debit + item.period_debit,
      period_credit: acc.period_credit + item.period_credit,
      closing_debit: acc.closing_debit + item.closing_debit,
      closing_credit: acc.closing_credit + item.closing_credit,
    }), {
      opening_debit: 0,
      opening_credit: 0,
      period_debit: 0,
      period_credit: 0,
      closing_debit: 0,
      closing_credit: 0,
    });

    return {
      accounts: accountsData,
      totals,
    };
  }

  async getBalanceSheet(asOfDate: string): Promise<BalanceSheetData> {
    // Implementation would aggregate accounts by type
    // This is a simplified version
    const accounts = await this.getAllAccounts({ is_active: true });
    
    const assets = accounts.filter(a => a.account_type === 'asset');
    const liabilities = accounts.filter(a => a.account_type === 'liability');
    const equity = accounts.filter(a => a.account_type === 'equity');

    // TODO: Get actual balances from GL
    return {
      assets: {
        current_assets: [],
        fixed_assets: [],
        total: 0,
      },
      liabilities: {
        current_liabilities: [],
        long_term_liabilities: [],
        total: 0,
      },
      equity: {
        items: [],
        total: 0,
      },
    };
  }

  async getIncomeStatement(startDate: string, endDate: string): Promise<IncomeStatementData> {
    // Implementation would aggregate revenue and expense accounts
    // This is a simplified version
    return {
      revenue: {
        items: [],
        total: 0,
      },
      cost_of_goods_sold: {
        items: [],
        total: 0,
      },
      gross_profit: 0,
      operating_expenses: {
        items: [],
        total: 0,
      },
      operating_income: 0,
      other_income: {
        items: [],
        total: 0,
      },
      net_income: 0,
    };
  }
}

export const accountingService = new AccountingService();
