import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowLeft, 
  Calendar, 
  User, 
  Clock, 
  CheckCircle2, 
  Circle,
  AlertCircle,
  Flag,
  Edit,
  Trash2,
  MessageSquare,
  Send
} from 'lucide-react';
import { useState } from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  due_date: string;
  assigned_to: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  employee_name?: string;
  creator_name?: string;
  progress?: number;
  notes?: string;
}

interface Comment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user_name?: string;
}

const statusConfig = {
  'pending': { label: 'Chờ xử lý', color: 'bg-yellow-500', icon: Circle },
  'in-progress': { label: 'Đang làm', color: 'bg-blue-500', icon: Clock },
  'completed': { label: 'Hoàn thành', color: 'bg-green-500', icon: CheckCircle2 },
  'cancelled': { label: 'Đã hủy', color: 'bg-gray-500', icon: AlertCircle },
};

const priorityConfig = {
  'low': { label: 'Thấp', color: 'bg-gray-200 text-gray-800' },
  'medium': { label: 'Trung bình', color: 'bg-blue-200 text-blue-800' },
  'high': { label: 'Cao', color: 'bg-orange-200 text-orange-800' },
  'urgent': { label: 'Khẩn cấp', color: 'bg-red-200 text-red-800' },
};

export default function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Fetch task details
  const { data: task, isLoading } = useQuery<Task>({
    queryKey: ['task', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          employee_name:assigned_to(full_name),
          creator_name:created_by(full_name)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      
      return {
        ...data,
        employee_name: data.employee_name?.full_name,
        creator_name: data.creator_name?.full_name,
      };
    },
    staleTime: 30000,
  });

  // Fetch comments
  const { data: comments = [] } = useQuery<Comment[]>({
    queryKey: ['task-comments', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_comments')
        .select(`
          *,
          user_name:user_id(full_name)
        `)
        .eq('task_id', id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      return data.map(comment => ({
        ...comment,
        user_name: comment.user_name?.full_name,
      }));
    },
    staleTime: 10000,
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({
        title: 'Cập nhật thành công',
        description: 'Trạng thái công việc đã được cập nhật',
      });
    },
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('task_comments')
        .insert({
          task_id: id,
          user_id: user.id,
          content,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', id] });
      setComment('');
      toast({
        title: 'Đã thêm nhận xét',
      });
    },
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({
        title: 'Đã xóa công việc',
        variant: 'destructive',
      });
      navigate('/tasks');
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Không tìm thấy công việc</p>
        <Button onClick={() => navigate('/tasks')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Quay lại
        </Button>
      </div>
    );
  }

  const StatusIcon = statusConfig[task.status as keyof typeof statusConfig]?.icon || Circle;
  const statusInfo = statusConfig[task.status as keyof typeof statusConfig];
  const priorityInfo = priorityConfig[task.priority as keyof typeof priorityConfig];

  const handleStatusChange = (newStatus: string) => {
    updateStatusMutation.mutate(newStatus);
  };

  const handleAddComment = () => {
    if (!comment.trim()) return;
    addCommentMutation.mutate(comment);
  };

  const handleDelete = () => {
    deleteTaskMutation.mutate();
  };

  return (
    <div className="space-y-6">
      {/* Header - Minimal, Action-Focused */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/tasks')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{task.title}</h1>
            <p className="text-sm text-muted-foreground">
              Tạo {format(new Date(task.created_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate(`/tasks/${id}/edit`)}
          >
            <Edit className="h-4 w-4 mr-2" />
            Sửa
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Xóa
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Left Side */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status & Priority - Quick Glance */}
          <Card className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                <StatusIcon className={`h-5 w-5 text-white ${statusInfo?.color} rounded-full p-1`} />
                <span className="font-semibold">{statusInfo?.label}</span>
              </div>
              <Badge className={priorityInfo?.color}>
                <Flag className="h-3 w-3 mr-1" />
                {priorityInfo?.label}
              </Badge>
            </div>

            {/* Quick Actions - Elon Style: Fast Decision Making */}
            <div className="flex gap-2">
              {task.status !== 'completed' && (
                <Button
                  size="sm"
                  onClick={() => handleStatusChange('completed')}
                  disabled={updateStatusMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Hoàn thành
                </Button>
              )}
              {task.status === 'pending' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusChange('in-progress')}
                  disabled={updateStatusMutation.isPending}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Bắt đầu
                </Button>
              )}
              {task.status === 'in-progress' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusChange('pending')}
                  disabled={updateStatusMutation.isPending}
                >
                  Tạm dừng
                </Button>
              )}
            </div>
          </Card>

          {/* Description - Clear Communication */}
          <Card className="p-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <div className="h-1 w-1 rounded-full bg-primary"></div>
              Mô tả
            </h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {task.description || 'Không có mô tả'}
            </p>
          </Card>

          {/* Notes */}
          {task.notes && (
            <Card className="p-6 bg-accent/50">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-yellow-500"></div>
                Ghi chú
              </h3>
              <p className="text-sm whitespace-pre-wrap">{task.notes}</p>
            </Card>
          )}

          {/* Comments - Team Collaboration */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Nhận xét ({comments.length})
            </h3>

            <div className="space-y-4 mb-4">
              {comments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Chưa có nhận xét nào
                </p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3 pb-4 border-b last:border-b-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{comment.user_name || 'User'}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(comment.created_at), 'dd/MM HH:mm', { locale: vi })}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{comment.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add Comment */}
            <div className="flex gap-2">
              <Textarea
                placeholder="Thêm nhận xét..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="min-h-[80px]"
              />
              <Button
                size="icon"
                onClick={handleAddComment}
                disabled={!comment.trim() || addCommentMutation.isPending}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        </div>

        {/* Sidebar - Key Metrics */}
        <div className="space-y-4">
          {/* Progress */}
          {task.progress !== null && task.progress !== undefined && (
            <Card className="p-6">
              <h3 className="font-semibold mb-3 text-sm">Tiến độ</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Hoàn thành</span>
                  <span className="font-semibold">{task.progress}%</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
              </div>
            </Card>
          )}

          {/* Key Info - Data Density */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4 text-sm">Thông tin</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Người thực hiện</p>
                  <p className="text-sm font-medium">{task.employee_name || 'Chưa giao'}</p>
                </div>
              </div>

              <Separator />

              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Hạn hoàn thành</p>
                  <p className="text-sm font-medium">
                    {format(new Date(task.due_date), 'dd/MM/yyyy', { locale: vi })}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex items-start gap-3">
                <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Người tạo</p>
                  <p className="text-sm font-medium">{task.creator_name || 'Unknown'}</p>
                </div>
              </div>

              <Separator />

              <div className="flex items-start gap-3">
                <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Cập nhật lần cuối</p>
                  <p className="text-sm font-medium">
                    {format(new Date(task.updated_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Timeline Preview */}
          <Card className="p-6 bg-muted/30">
            <h3 className="font-semibold mb-3 text-sm">Timeline</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tạo:</span>
                <span>{format(new Date(task.created_at), 'dd/MM/yyyy')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Deadline:</span>
                <span className="font-semibold">{format(new Date(task.due_date), 'dd/MM/yyyy')}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa công việc?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể hoàn tác. Công việc "{task.title}" sẽ bị xóa vĩnh viễn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
