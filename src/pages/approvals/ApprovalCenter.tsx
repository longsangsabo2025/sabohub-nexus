import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileCheck,
  Calendar,
  DollarSign,
  User,
  AlertCircle,
  Filter,
  Download,
} from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

// Types
interface ApprovalRequest {
  id: string;
  type: 'time_off' | 'expense' | 'task_assignment';
  requester_id: string;
  requester_name: string;
  status: 'pending' | 'approved' | 'rejected';
  details: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Mock data removed - using real Supabase data


// Approval Card Component
const ApprovalCard = ({ 
  approval, 
  onApprove, 
  onReject 
}: { 
  approval: ApprovalRequest; 
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
}) => {
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'time_off': return <Calendar className="h-5 w-5" />;
      case 'expense': return <DollarSign className="h-5 w-5" />;
      case 'task_assignment': return <FileCheck className="h-5 w-5" />;
      default: return <FileCheck className="h-5 w-5" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'time_off': return 'Nghỉ phép';
      case 'expense': return 'Chi phí';
      case 'task_assignment': return 'Phân công';
      default: return type;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="h-3 w-3 mr-1" />Chờ duyệt</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle2 className="h-3 w-3 mr-1" />Đã duyệt</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="h-3 w-3 mr-1" />Từ chối</Badge>;
    }
  };

  const handleReject = () => {
    if (rejectionReason.trim()) {
      onReject(approval.id, rejectionReason);
      setShowRejectDialog(false);
      setRejectionReason('');
    }
  };

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                {getTypeIcon(approval.type)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <CardTitle className="text-base">{getTypeLabel(approval.type)}</CardTitle>
                  {getStatusBadge(approval.status)}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span>{approval.requester_name}</span>
                  <span>•</span>
                  <span>{format(new Date(approval.created_at), 'dd MMM yyyy, HH:mm', { locale: vi })}</span>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Time Off Details */}
          {approval.type === 'time_off' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Thời gian:</span>
                <span className="font-medium">
                  {format(new Date(approval.details.start_date), 'dd/MM/yyyy')} - {format(new Date(approval.details.end_date), 'dd/MM/yyyy')}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Số ngày:</span>
                <span className="font-medium">{approval.details.days} ngày</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Lý do:</span>
                <span className="font-medium">{approval.details.reason}</span>
              </div>
              {approval.details.rejection_reason && (
                <div className="mt-2 p-2 bg-red-50 rounded-md">
                  <p className="text-xs text-red-700 flex items-start gap-2">
                    <AlertCircle className="h-3 w-3 mt-0.5" />
                    <span>{approval.details.rejection_reason}</span>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Expense Details */}
          {approval.type === 'expense' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Số tiền:</span>
                <span className="font-bold text-lg text-primary">
                  {approval.details.amount.toLocaleString('vi-VN')} đ
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Danh mục:</span>
                <Badge variant="secondary">{approval.details.category}</Badge>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Mô tả:</span>
                <p className="mt-1">{approval.details.description}</p>
              </div>
              {approval.details.receipt_url && (
                <Button variant="link" size="sm" className="p-0 h-auto text-xs">
                  <Download className="h-3 w-3 mr-1" />
                  Xem hóa đơn
                </Button>
              )}
            </div>
          )}

          {/* Action Buttons (only for pending) */}
          {approval.status === 'pending' && (
            <>
              <Separator className="my-4" />
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="default" 
                  className="flex-1"
                  onClick={() => onApprove(approval.id)}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Phê duyệt
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive" 
                  className="flex-1"
                  onClick={() => setShowRejectDialog(true)}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Từ chối
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Từ chối yêu cầu</DialogTitle>
            <DialogDescription>
              Vui lòng cho biết lý do từ chối để nhân viên hiểu rõ hơn.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reason">Lý do từ chối *</Label>
              <Textarea
                id="reason"
                placeholder="Ví dụ: Đang peak season, team thiếu người..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Hủy
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={!rejectionReason.trim()}
            >
              Xác nhận từ chối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Stats Card
const StatsCard = ({ 
  title, 
  value, 
  icon: Icon, 
  color 
}: { 
  title: string; 
  value: number; 
  icon: React.ComponentType<any>; 
  color: string;
}) => {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
          </div>
          <div className={`p-3 rounded-lg ${color}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function ApprovalCenter() {
  const { currentRole, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('pending');

  // Fetch approvals from Supabase
  const { data: approvals = [], isLoading } = useQuery({
    queryKey: ['approval-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('approval_requests')
        .select(`
          *,
          employees:requester_id (
            full_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching approvals:', error);
        throw error;
      }
      
      return data.map((item: any) => ({
        ...item,
        requester_name: item.employees?.full_name || 'Unknown'
      })) as ApprovalRequest[];
    },
    enabled: !!user && (currentRole === 'ceo' || currentRole === 'manager')
  });

  const pendingApprovals = approvals.filter(a => a.status === 'pending');
  const approvedApprovals = approvals.filter(a => a.status === 'approved');
  const rejectedApprovals = approvals.filter(a => a.status === 'rejected');

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      // 1. Get the request details first
      const { data: request, error: fetchError } = await supabase
        .from('approval_requests')
        .select('*')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;

      // 2. If it's an expense, insert into financial_transactions
      if (request.type === 'expense') {
        const { error: insertError } = await supabase
          .from('financial_transactions')
          .insert({
            company_id: request.details.company_id,
            date: request.details.date,
            type: 'expense',
            amount: request.details.amount,
            category: request.details.category,
            description: request.details.description,
            created_by: request.requester_id
          });
        
        if (insertError) throw insertError;
      }

      // 3. Update status to approved
      const { error } = await supabase
        .from('approval_requests')
        .update({ 
          status: 'approved',
          approver_id: user?.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-requests'] });
      // Also invalidate financial stats if we just approved an expense
      queryClient.invalidateQueries({ queryKey: ['financial-stats'] });
      toast({
        title: 'Đã phê duyệt',
        description: 'Yêu cầu đã được phê duyệt thành công',
      });
    },
    onError: (error) => {
      toast({
        title: 'Lỗi',
        description: 'Không thể phê duyệt yêu cầu: ' + error.message,
        variant: 'destructive',
      });
    }
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await supabase
        .from('approval_requests')
        .update({ 
          status: 'rejected',
          rejection_reason: reason,
          approver_id: user?.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-requests'] });
      toast({
        title: 'Đã từ chối',
        description: 'Yêu cầu đã bị từ chối',
        variant: 'destructive',
      });
    },
    onError: (error) => {
      toast({
        title: 'Lỗi',
        description: 'Không thể từ chối yêu cầu: ' + error.message,
        variant: 'destructive',
      });
    }
  });

  // Batch approve mutation
  const batchApproveMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('approval_requests')
        .update({ 
          status: 'approved',
          approver_id: user?.id,
          updated_at: new Date().toISOString()
        })
        .in('id', ids);
      
      if (error) throw error;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['approval-requests'] });
      toast({
        title: 'Đã duyệt tất cả',
        description: `Đã phê duyệt ${variables.length} yêu cầu`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Lỗi',
        description: 'Không thể phê duyệt các yêu cầu: ' + error.message,
        variant: 'destructive',
      });
    }
  });

  const handleApprove = (id: string) => {
    approveMutation.mutate(id);
  };

  const handleReject = (id: string, reason: string) => {
    rejectMutation.mutate({ id, reason });
  };

  const handleApproveAll = () => {
    const pendingIds = pendingApprovals.map(a => a.id);
    if (pendingIds.length === 0) return;
    batchApproveMutation.mutate(pendingIds);
  };

  // Access control
  if (currentRole !== 'ceo' && currentRole !== 'manager') {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <AlertCircle className="h-16 w-16 mx-auto text-yellow-500 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Không có quyền truy cập</h2>
          <p className="text-muted-foreground mb-6">Trang này chỉ dành cho CEO và Manager</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-10 w-full" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Approval Center</h2>
            <p className="text-muted-foreground">Quản lý các yêu cầu cần phê duyệt</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Lọc
            </Button>
            {pendingApprovals.length > 0 && (
              <Button size="sm" onClick={handleApproveAll}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Duyệt tất cả ({pendingApprovals.length})
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard
          title="Chờ duyệt"
          value={pendingApprovals.length}
          icon={Clock}
          color="bg-yellow-500"
        />
        <StatsCard
          title="Đã duyệt"
          value={approvedApprovals.length}
          icon={CheckCircle2}
          color="bg-green-500"
        />
        <StatsCard
          title="Từ chối"
          value={rejectedApprovals.length}
          icon={XCircle}
          color="bg-red-500"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending">
            Chờ duyệt
            {pendingApprovals.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {pendingApprovals.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved">Đã duyệt</TabsTrigger>
          <TabsTrigger value="rejected">Từ chối</TabsTrigger>
          <TabsTrigger value="all">Tất cả</TabsTrigger>
        </TabsList>

        {/* Pending Tab */}
        <TabsContent value="pending" className="space-y-4 mt-6">
          {pendingApprovals.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center py-12">
                <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-3" />
                <p className="text-lg font-medium">Không có yêu cầu chờ duyệt</p>
                <p className="text-sm text-muted-foreground mt-1">Tất cả yêu cầu đã được xử lý</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {pendingApprovals.map(approval => (
                <ApprovalCard
                  key={approval.id}
                  approval={approval}
                  onApprove={handleApprove}
                  onReject={handleReject}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Approved Tab */}
        <TabsContent value="approved" className="space-y-4 mt-6">
          {approvedApprovals.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center py-12">
                <p className="text-muted-foreground">Chưa có yêu cầu nào được duyệt</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {approvedApprovals.map(approval => (
                <ApprovalCard
                  key={approval.id}
                  approval={approval}
                  onApprove={handleApprove}
                  onReject={handleReject}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Rejected Tab */}
        <TabsContent value="rejected" className="space-y-4 mt-6">
          {rejectedApprovals.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center py-12">
                <p className="text-muted-foreground">Chưa có yêu cầu nào bị từ chối</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {rejectedApprovals.map(approval => (
                <ApprovalCard
                  key={approval.id}
                  approval={approval}
                  onApprove={handleApprove}
                  onReject={handleReject}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* All Tab */}
        <TabsContent value="all" className="space-y-4 mt-6">
          <div className="grid gap-4 md:grid-cols-2">
            {approvals.map(approval => (
              <ApprovalCard
                key={approval.id}
                approval={approval}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
