import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function Settings() {
  const { user, employeeUser } = useAuth();
  const { toast } = useToast();

  // Profile state
  const [fullName, setFullName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Notification state
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [taskNotifications, setTaskNotifications] = useState(true);
  const [attendanceNotifications, setAttendanceNotifications] = useState(true);
  const [telegramChatId, setTelegramChatId] = useState('');
  const [savingTelegram, setSavingTelegram] = useState(false);

  // Load initial data
  useEffect(() => {
    if (user?.user_metadata?.full_name) {
      setFullName(user.user_metadata.full_name);
    } else if (employeeUser?.full_name) {
      setFullName(employeeUser.full_name);
    }

    // Load Telegram Chat ID
    const loadTelegram = async () => {
      if (employeeUser?.id) {
        const { data } = await supabase
          .from('employees')
          .select('telegram_chat_id')
          .eq('id', employeeUser.id)
          .single();
        if (data?.telegram_chat_id) {
          setTelegramChatId(data.telegram_chat_id);
        }
      }
    };
    loadTelegram();
  }, [user, employeeUser]);

  // Handle Telegram Update
  const handleUpdateTelegram = async () => {
    if (!employeeUser?.id) return;
    setSavingTelegram(true);
    try {
      const { error } = await supabase
        .from('employees')
        .update({ telegram_chat_id: telegramChatId })
        .eq('id', employeeUser.id);

      if (error) throw error;
      toast({ title: 'Thành công', description: 'Đã cập nhật Telegram Chat ID' });
    } catch (error: any) {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    } finally {
      setSavingTelegram(false);
    }
  };

  // Handle profile update
  const handleUpdateProfile = async () => {
    if (!fullName.trim()) {
      toast({ title: 'Lỗi', description: 'Vui lòng nhập họ tên', variant: 'destructive' });
      return;
    }

    setSavingProfile(true);
    try {
      if (user) {
        // Update Supabase Auth user metadata
        const { error } = await supabase.auth.updateUser({
          data: { full_name: fullName }
        });
        if (error) throw error;
      } else if (employeeUser) {
        // Update employee table
        const { error } = await supabase
          .from('employees')
          .update({ full_name: fullName })
          .eq('id', employeeUser.id);
        if (error) throw error;
      }

      toast({ title: 'Thành công', description: 'Đã cập nhật thông tin' });
    } catch (error) {
      toast({ 
        title: 'Lỗi', 
        description: error instanceof Error ? error.message : 'Không thể cập nhật', 
        variant: 'destructive' 
      });
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle password change
  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast({ title: 'Lỗi', description: 'Vui lòng nhập đầy đủ mật khẩu', variant: 'destructive' });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({ title: 'Lỗi', description: 'Mật khẩu xác nhận không khớp', variant: 'destructive' });
      return;
    }

    if (newPassword.length < 6) {
      toast({ title: 'Lỗi', description: 'Mật khẩu phải có ít nhất 6 ký tự', variant: 'destructive' });
      return;
    }

    setSavingPassword(true);
    try {
      if (user) {
        // Update Supabase Auth password
        const { error } = await supabase.auth.updateUser({
          password: newPassword
        });
        if (error) throw error;
      } else if (employeeUser) {
        // Update employee password_hash (simple hash for demo)
        const { error } = await supabase
          .from('employees')
          .update({ password_hash: newPassword }) // In production, use proper hashing
          .eq('id', employeeUser.id);
        if (error) throw error;
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast({ title: 'Thành công', description: 'Đã đổi mật khẩu' });
    } catch (error) {
      toast({ 
        title: 'Lỗi', 
        description: error instanceof Error ? error.message : 'Không thể đổi mật khẩu', 
        variant: 'destructive' 
      });
    } finally {
      setSavingPassword(false);
    }
  };

  const displayEmail = user?.email || employeeUser?.email || '';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Cài đặt</h2>
        <p className="text-muted-foreground">Quản lý cài đặt tài khoản và hệ thống</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Thông tin tài khoản</CardTitle>
            <CardDescription>Cập nhật thông tin cá nhân của bạn</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={displayEmail} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Họ và tên</Label>
              <Input 
                id="name" 
                type="text" 
                placeholder="Nhập họ và tên" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <Button onClick={handleUpdateProfile} disabled={savingProfile}>
              {savingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cập nhật
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bảo mật</CardTitle>
            <CardDescription>Quản lý mật khẩu và bảo mật</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Mật khẩu hiện tại</Label>
              <Input 
                id="current-password" 
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Mật khẩu mới</Label>
              <Input 
                id="new-password" 
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Xác nhận mật khẩu mới</Label>
              <Input 
                id="confirm-password" 
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <Button onClick={handleChangePassword} disabled={savingPassword}>
              {savingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Đổi mật khẩu
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>SABO Neural Link (Telegram)</CardTitle>
            <CardDescription>Kết nối Telegram để nhận thông báo tức thì</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="telegram-id">Telegram Chat ID</Label>
              <div className="flex gap-2">
                <Input 
                  id="telegram-id" 
                  placeholder="Nhập Chat ID (VD: 123456789)"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                />
                <Button onClick={handleUpdateTelegram} disabled={savingTelegram}>
                  {savingTelegram && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Lưu
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Để lấy Chat ID: Mở Telegram, chat với <strong>@userinfobot</strong> hoặc bot của hệ thống.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Thông báo</CardTitle>
            <CardDescription>Quản lý cài đặt thông báo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email thông báo</Label>
                <p className="text-sm text-muted-foreground">
                  Nhận thông báo qua email
                </p>
              </div>
              <Switch 
                checked={emailNotifications}
                onCheckedChange={setEmailNotifications}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Thông báo công việc</Label>
                <p className="text-sm text-muted-foreground">
                  Thông báo về công việc mới
                </p>
              </div>
              <Switch 
                checked={taskNotifications}
                onCheckedChange={setTaskNotifications}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Thông báo chấm công</Label>
                <p className="text-sm text-muted-foreground">
                  Thông báo về chấm công
                </p>
              </div>
              <Switch 
                checked={attendanceNotifications}
                onCheckedChange={setAttendanceNotifications}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

