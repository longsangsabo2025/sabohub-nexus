import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface TaskReportDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly task: {
    id: string;
    title: string;
    status: string;
    progress: number;
    notes: string | null;
  } | null;
}

export function TaskReportDialog({ open, onOpenChange, task }: TaskReportDialogProps) {
  const [status, setStatus] = useState<string>('in_progress');
  const [progress, setProgress] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (task) {
      setStatus(task.status);
      setProgress(task.progress || 0);
      setNotes(task.notes || '');
    }
  }, [task]);

  const { mutate: submitReport, isPending } = useMutation({
    mutationFn: async () => {
      if (!task) return;

      const updates: any = {
        status,
        progress,
        notes, 
        updated_at: new Date().toISOString(),
      };

      if (status === 'completed' && task.status !== 'completed') {
        updates.completed_at = new Date().toISOString();
        updates.progress = 100;
      }

      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', task.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Báo cáo thành công',
        description: 'Đã cập nhật tiến độ công việc',
      });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Lỗi',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Báo cáo tiến độ</DialogTitle>
          <DialogDescription>
            Cập nhật trạng thái và kết quả cho công việc: <span className="font-semibold">{task?.title}</span>
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="status">Trạng thái</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Chờ xử lý</SelectItem>
                <SelectItem value="in_progress">Đang thực hiện</SelectItem>
                <SelectItem value="completed">Hoàn thành</SelectItem>
                <SelectItem value="cancelled">Đã hủy</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <div className="flex justify-between">
              <Label>Tiến độ (%)</Label>
              <span className="text-sm text-muted-foreground">{progress}%</span>
            </div>
            <Slider
              value={[progress]}
              onValueChange={(vals) => setProgress(vals[0])}
              max={100}
              step={5}
              className="py-4"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Ghi chú / Kết quả</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Nhập chi tiết kết quả công việc, khó khăn gặp phải..."
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={() => submitReport()} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang lưu...
              </>
            ) : (
              'Lưu báo cáo'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
