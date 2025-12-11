import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Image as ImageIcon, Send, AlertCircle, CheckCircle2, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface BugReport {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  created_at: string;
  employee_id: string | null;
  employees?: {
    full_name: string;
    email: string;
  };
}

export default function BugReports() {
  const { user, employeeUser, currentRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newReport, setNewReport] = useState({
    title: '',
    description: '',
    image: null as File | null,
  });
  const [isUploading, setIsUploading] = useState(false);
  const [deleteReportId, setDeleteReportId] = useState<string | null>(null);

  // Fetch bug reports
  const { data: reports, isLoading } = useQuery({
    queryKey: ['bug-reports'],
    queryFn: async () => {
      let query = supabase
        .from('bug_reports')
        .select('*, employees(full_name, email)')
        .order('created_at', { ascending: false });

      // If not CEO/Manager, maybe filter? 
      // But requirement says "send to CEO", so user should see their own sent reports.
      // And CEO sees all.
      // For now, the RLS allows seeing all, so we'll filter in frontend or let everyone see everything for transparency if desired.
      // Let's filter for non-admin roles to only see their own if we want strict privacy, 
      // but "Báo cáo lỗi" usually implies a public board or private channel.
      // Given "gửi các lỗi kèm hình ảnh tới cho CEO", it sounds like a direct channel.
      // Let's show all for CEO/Manager, and only own for others.
      
      if (currentRole !== 'ceo' && currentRole !== 'manager') {
        if (employeeUser?.id) {
           query = query.eq('employee_id', employeeUser.id);
        } else if (user?.id) {
           query = query.eq('user_id', user.id);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as BugReport[];
    },
  });

  // Create report mutation
  const createReport = useMutation({
    mutationFn: async (data: typeof newReport) => {
      let imageUrl = null;

      if (data.image) {
        setIsUploading(true);
        const fileExt = data.image.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('bug-reports')
          .upload(filePath, data.image);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('bug-reports')
          .getPublicUrl(filePath);

        imageUrl = publicUrl;
        setIsUploading(false);
      }

      const { error } = await supabase
        .from('bug_reports')
        .insert({
          title: data.title,
          description: data.description,
          image_url: imageUrl,
          user_id: user?.id,
          employee_id: employeeUser?.id,
          status: 'open',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bug-reports'] });
      setIsDialogOpen(false);
      setNewReport({ title: '', description: '', image: null });
      toast({
        title: 'Đã gửi báo cáo',
        description: 'Cảm ơn bạn đã đóng góp ý kiến!',
      });
    },
    onError: (error) => {
      setIsUploading(false);
      toast({
        title: 'Lỗi',
        description: `Không thể gửi báo cáo: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Update status mutation (for CEO/Manager)
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('bug_reports')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bug-reports'] });
      toast({
        title: 'Đã cập nhật',
        description: 'Trạng thái báo cáo đã được thay đổi.',
      });
    },
  });

  // Delete report mutation (for CEO/Manager)
  const deleteReport = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('bug_reports')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bug-reports'] });
      setDeleteReportId(null);
      toast({
        title: 'Đã xóa',
        description: 'Báo cáo lỗi đã được xóa.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Lỗi',
        description: `Không thể xóa báo cáo: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = () => {
    if (!newReport.title || !newReport.description) {
      toast({
        title: 'Thiếu thông tin',
        description: 'Vui lòng nhập tiêu đề và mô tả lỗi.',
        variant: 'destructive',
      });
      return;
    }
    createReport.mutate(newReport);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="destructive">Mới</Badge>;
      case 'in_progress':
        return <Badge variant="default" className="bg-blue-500">Đang xử lý</Badge>;
      case 'resolved':
        return <Badge variant="default" className="bg-green-500">Đã xong</Badge>;
      case 'closed':
        return <Badge variant="secondary">Đã đóng</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Báo cáo lỗi</h2>
          <p className="text-muted-foreground">Gửi phản hồi và báo cáo lỗi hệ thống</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Báo lỗi mới
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Gửi báo cáo lỗi</DialogTitle>
              <DialogDescription>
                Mô tả chi tiết lỗi bạn gặp phải và đính kèm hình ảnh nếu có.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Tiêu đề lỗi</Label>
                <Input
                  id="title"
                  placeholder="Ví dụ: Không thể chấm công..."
                  value={newReport.title}
                  onChange={(e) => setNewReport({ ...newReport, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Mô tả chi tiết</Label>
                <Textarea
                  id="description"
                  placeholder="Mô tả các bước để tái hiện lỗi..."
                  className="min-h-[100px]"
                  value={newReport.description}
                  onChange={(e) => setNewReport({ ...newReport, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="image">Hình ảnh đính kèm (Tùy chọn)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setNewReport({ ...newReport, image: e.target.files[0] });
                      }
                    }}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Hủy
              </Button>
              <Button onClick={handleSubmit} disabled={createReport.isPending || isUploading}>
                {createReport.isPending || isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang gửi...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Gửi báo cáo
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          [...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-[100px] bg-muted/50" />
              <CardContent className="h-[150px] bg-muted/20" />
            </Card>
          ))
        ) : reports?.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mb-4 text-green-500" />
            <h3 className="text-lg font-semibold">Không có lỗi nào</h3>
            <p>Hệ thống đang hoạt động ổn định!</p>
          </div>
        ) : (
          reports?.map((report) => (
            <Card key={report.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg line-clamp-1" title={report.title}>
                      {report.title}
                    </CardTitle>
                    <CardDescription>
                      {format(new Date(report.created_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
                      {report.employees && ` • ${report.employees.full_name}`}
                    </CardDescription>
                  </div>
                  {getStatusBadge(report.status)}
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {report.description}
                </p>
                {report.image_url && (
                  <div className="relative aspect-video w-full overflow-hidden rounded-md border bg-muted">
                    <img
                      src={report.image_url}
                      alt="Bug screenshot"
                      className="object-cover w-full h-full transition-transform hover:scale-105 cursor-pointer"
                      onClick={() => window.open(report.image_url!, '_blank')}
                    />
                  </div>
                )}
                
                {(currentRole === 'ceo' || currentRole === 'manager') && (
                  <div className="pt-4 mt-auto border-t flex items-center gap-2">
                    <Select
                      defaultValue={report.status}
                      onValueChange={(value) => updateStatus.mutate({ id: report.id, status: value })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Cập nhật trạng thái" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Mới</SelectItem>
                        <SelectItem value="in_progress">Đang xử lý</SelectItem>
                        <SelectItem value="resolved">Đã xong</SelectItem>
                        <SelectItem value="closed">Đóng</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteReportId(report.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteReportId} onOpenChange={() => setDeleteReportId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa báo cáo lỗi này? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteReportId && deleteReport.mutate(deleteReportId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteReport.isPending ? 'Đang xóa...' : 'Xóa'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
