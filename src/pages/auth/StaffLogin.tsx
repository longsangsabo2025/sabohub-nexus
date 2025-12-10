import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, EmployeeUser } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User, Lock, Loader2, Building2, Clock, FileText, Target, ChevronRight, Search } from 'lucide-react';

interface Company {
  id: string;
  name: string;
}

export default function StaffLogin() {
  // Step management
  const [step, setStep] = useState<'select-company' | 'login'>('select-company');
  
  // Company selection
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  
  // Login form - use username instead of email
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const { setEmployeeUser, isAuthenticated, employeeUser, currentRole } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      if (employeeUser && (currentRole === 'staff' || currentRole === 'shift_leader')) {
        navigate('/staff/dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, employeeUser, currentRole, navigate]);

  // Fetch companies on mount
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const { data, error } = await supabase
          .from('companies')
          .select('id, name')
          .order('name', { ascending: true });
        
        if (error) throw error;
        setCompanies(data || []);
      } catch (err) {
        console.error('Error fetching companies:', err);
        setError('Không thể tải danh sách doanh nghiệp');
      } finally {
        setLoadingCompanies(false);
      }
    };
    
    fetchCompanies();
  }, []);

  // Filter companies by search
  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectCompany = (company: Company) => {
    setSelectedCompany(company);
    setStep('login');
    setError(null);
  };

  const handleBackToCompanySelect = () => {
    setStep('select-company');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!selectedCompany) {
      setError('Vui lòng chọn doanh nghiệp');
      setLoading(false);
      return;
    }

    try {
      // Call employee_login RPC
      const { data, error: rpcError } = await supabase.rpc('employee_login', {
        p_company_name: selectedCompany.name,
        p_username: username,
        p_password: password,
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Đăng nhập thất bại');
      }

      // Store employee in auth context (which also persists to localStorage)
      const employee: EmployeeUser = {
        ...data.employee,
        role: data.employee.role as EmployeeUser['role'],
      };
      setEmployeeUser(employee);
      
      // Navigate based on role - STAFF and SHIFT_LEADER go to staff dashboard
      const role = employee.role.toLowerCase();
      if (role === 'staff' || role === 'shift_leader') {
        navigate('/staff/dashboard');
      } else {
        // MANAGER and CEO go to main dashboard
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo & Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white mb-4">
            <Building2 className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Đăng nhập Nhân viên</h1>
          <p className="text-gray-600">Truy cập hệ thống quản lý công việc SABOHUB</p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
            step === 'select-company' 
              ? 'bg-blue-600 text-white' 
              : 'bg-blue-100 text-blue-600'
          }`}>
            <Building2 className="w-4 h-4" />
            <span>1. Chọn doanh nghiệp</span>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
            step === 'login' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 text-gray-400'
          }`}>
            <Lock className="w-4 h-4" />
            <span>2. Đăng nhập</span>
          </div>
        </div>

        {/* Features Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/80 backdrop-blur rounded-lg p-3 text-center shadow-sm">
            <Clock className="w-6 h-6 mx-auto text-blue-600 mb-1" />
            <span className="text-xs text-gray-700 font-medium">Chấm công</span>
          </div>
          <div className="bg-white/80 backdrop-blur rounded-lg p-3 text-center shadow-sm">
            <FileText className="w-6 h-6 mx-auto text-green-600 mb-1" />
            <span className="text-xs text-gray-700 font-medium">Báo cáo</span>
          </div>
          <div className="bg-white/80 backdrop-blur rounded-lg p-3 text-center shadow-sm">
            <Target className="w-6 h-6 mx-auto text-purple-600 mb-1" />
            <span className="text-xs text-gray-700 font-medium">KPI</span>
          </div>
        </div>

        {/* Step 1: Select Company */}
        {step === 'select-company' && (
          <Card className="shadow-xl border-0">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-xl text-center">Chọn Doanh nghiệp</CardTitle>
              <CardDescription className="text-center">
                Vui lòng chọn doanh nghiệp bạn đang làm việc
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Tìm kiếm doanh nghiệp..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Company List */}
              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {loadingCompanies ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    <span className="ml-2 text-gray-600">Đang tải...</span>
                  </div>
                ) : filteredCompanies.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {searchQuery ? 'Không tìm thấy doanh nghiệp' : 'Chưa có doanh nghiệp nào'}
                  </div>
                ) : (
                  filteredCompanies.map((company) => (
                    <button
                      key={company.id}
                      onClick={() => handleSelectCompany(company)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold">
                        {company.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 group-hover:text-blue-600">
                          {company.name}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600" />
                    </button>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Login Form */}
        {step === 'login' && selectedCompany && (
          <Card className="shadow-xl border-0">
            <CardHeader className="space-y-1 pb-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm">
                  {selectedCompany.name.charAt(0).toUpperCase()}
                </div>
                <span className="font-semibold text-blue-600">{selectedCompany.name}</span>
              </div>
              <CardTitle className="text-xl text-center">Đăng nhập</CardTitle>
              <CardDescription className="text-center">
                Nhập tài khoản được CEO/Quản lý cấp
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Tên đăng nhập</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="username"
                      type="text"
                      placeholder="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Mật khẩu</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700" 
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang đăng nhập...
                    </>
                  ) : (
                    'Đăng nhập'
                  )}
                </Button>

                <Button 
                  type="button" 
                  variant="ghost"
                  className="w-full text-gray-600"
                  onClick={handleBackToCompanySelect}
                >
                  ← Chọn doanh nghiệp khác
                </Button>
              </form>

              <div className="mt-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Quên mật khẩu? Liên hệ quản lý để được cấp lại.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer Links */}
        <div className="text-center space-y-2">
          <div className="text-sm text-gray-600">
            Bạn là CEO hoặc Quản lý?{' '}
            <Link to="/login" className="text-primary font-medium hover:underline">
              Đăng nhập tại đây
            </Link>
          </div>
          <div className="text-sm text-gray-500">
            <Link to="/" className="hover:text-gray-700">
              ← Quay lại trang chủ
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
