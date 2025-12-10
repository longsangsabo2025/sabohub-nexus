import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useDocumentRealtime } from '@/hooks/useRealtime';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  FileText, 
  Search, 
  Download, 
  ExternalLink, 
  Trash2,
  File,
  FileImage,
  FileSpreadsheet,
  FileCode,
  Loader2
} from 'lucide-react';

interface Document {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number | null;
  document_type: string;
  category: string | null;
  description: string | null;
  google_drive_web_view_link: string | null;
  google_drive_download_link: string | null;
  created_at: string;
  uploaded_by: string;
}

const documentTypeLabels: Record<string, string> = {
  general: 'Chung',
  contract: 'Hợp đồng',
  invoice: 'Hóa đơn',
  report: 'Báo cáo',
  policy: 'Chính sách',
  form: 'Biểu mẫu',
  other: 'Khác',
};

const getFileIcon = (mimeType: string) => {
  if (mimeType.includes('image')) return <FileImage className="h-5 w-5 text-blue-500" />;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
  if (mimeType.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />;
  if (mimeType.includes('code') || mimeType.includes('json')) return <FileCode className="h-5 w-5 text-purple-500" />;
  return <File className="h-5 w-5 text-gray-500" />;
};

const formatFileSize = (bytes: number | null) => {
  if (!bytes) return '-';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

export default function Documents() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [fileName, setFileName] = useState('');
  const [description, setDescription] = useState('');
  const [documentType, setDocumentType] = useState('general');
  const [driveLink, setDriveLink] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Enable realtime updates
  useDocumentRealtime();

  const { data: documents, isLoading } = useQuery({
    queryKey: ['documents', searchQuery, filterType],
    queryFn: async () => {
      let query = supabase
        .from('documents')
        .select('*')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (searchQuery.trim()) {
        query = query.or(`file_name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }

      if (filterType !== 'all') {
        query = query.eq('document_type', filterType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Document[];
    },
  });

  const { mutate: createDocument, isPending: isCreating } = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Chưa đăng nhập');

      // Get user's company
      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!userData?.company_id) throw new Error('Không tìm thấy công ty');

      // Extract Google Drive file ID from link
      const fileIdMatch = driveLink.match(/\/d\/([^/]+)/);
      const fileId = fileIdMatch ? fileIdMatch[1] : driveLink;

      const { data, error } = await supabase
        .from('documents')
        .insert({
          file_name: fileName.trim(),
          file_type: 'application/octet-stream',
          document_type: documentType,
          description: description.trim() || null,
          google_drive_file_id: fileId,
          google_drive_web_view_link: driveLink,
          company_id: userData.company_id,
          uploaded_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Thành công', description: 'Đã thêm tài liệu mới' });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setCreateDialogOpen(false);
      setFileName('');
      setDescription('');
      setDocumentType('general');
      setDriveLink('');
    },
    onError: (error: Error) => {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    },
  });

  const { mutate: deleteDocument } = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('documents')
        .update({ is_deleted: true, deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Thành công', description: 'Đã xóa tài liệu' });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    },
  });

  const handleSubmitCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileName.trim()) {
      toast({ title: 'Lỗi', description: 'Vui lòng nhập tên tài liệu', variant: 'destructive' });
      return;
    }
    if (!driveLink.trim()) {
      toast({ title: 'Lỗi', description: 'Vui lòng nhập link Google Drive', variant: 'destructive' });
      return;
    }
    createDocument();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Tài liệu</h2>
          <p className="text-muted-foreground">Quản lý tài liệu và file</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Thêm tài liệu
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Thư viện tài liệu</CardTitle>
              <CardDescription>Tất cả tài liệu trong hệ thống</CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm..."
                  className="pl-8 w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Loại tài liệu" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  {Object.entries(documentTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : documents && documents.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên file</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Kích thước</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                  <TableHead>Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {getFileIcon(doc.file_type)}
                        <div>
                          <div className="font-medium">{doc.file_name}</div>
                          {doc.description && (
                            <div className="text-sm text-muted-foreground truncate max-w-xs">
                              {doc.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {documentTypeLabels[doc.document_type] || doc.document_type}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatFileSize(doc.file_size)}</TableCell>
                    <TableCell>
                      {new Date(doc.created_at).toLocaleDateString('vi-VN')}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {doc.google_drive_web_view_link && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(doc.google_drive_web_view_link!, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                        {doc.google_drive_download_link && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(doc.google_drive_download_link!, '_blank')}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => {
                            if (confirm('Bạn có chắc muốn xóa tài liệu này?')) {
                              deleteDocument(doc.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Chưa có tài liệu nào</p>
              <p className="text-sm mt-2">Bấm "Thêm tài liệu" để tải lên</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Document Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Thêm tài liệu mới</DialogTitle>
            <DialogDescription>
              Thêm link Google Drive để lưu tài liệu vào hệ thống
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitCreate}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="fileName">Tên tài liệu *</Label>
                <Input
                  id="fileName"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  placeholder="VD: Hợp đồng lao động Q1 2025"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="driveLink">Link Google Drive *</Label>
                <Input
                  id="driveLink"
                  value={driveLink}
                  onChange={(e) => setDriveLink(e.target.value)}
                  placeholder="https://drive.google.com/file/d/..."
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="documentType">Loại tài liệu</Label>
                <Select value={documentType} onValueChange={setDocumentType}>
                  <SelectTrigger id="documentType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(documentTypeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Mô tả</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Nhập mô tả ngắn về tài liệu..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang thêm...
                  </>
                ) : (
                  'Thêm tài liệu'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

