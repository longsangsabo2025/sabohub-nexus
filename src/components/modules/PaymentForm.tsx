import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { paymentSchema, type PaymentFormData } from '@/schemas/moduleSchemas';
import { useRecordPayment, useReceivableV2 } from '@/hooks/useOdoriModules';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Banknote, CreditCard, Building2, FileQuestion } from 'lucide-react';

interface PaymentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receivableId: string;
  onSuccess?: () => void;
}

const paymentMethods = [
  { value: 'cash', label: 'Tiền mặt', icon: Banknote },
  { value: 'bank_transfer', label: 'Chuyển khoản', icon: Building2 },
  { value: 'check', label: 'Séc', icon: CreditCard },
  { value: 'other', label: 'Khác', icon: FileQuestion },
];

export function PaymentForm({ open, onOpenChange, receivableId, onSuccess }: PaymentFormProps) {
  const recordPayment = useRecordPayment();
  const { data: receivable } = useReceivableV2(receivableId);
  const [gpsLocation, setGpsLocation] = React.useState<{ latitude: number; longitude: number } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: receivable?.remaining_amount || 0,
      payment_method: 'cash',
      payment_date: new Date().toISOString().split('T')[0],
      reference_number: '',
      notes: '',
    },
  });

  React.useEffect(() => {
    if (receivable) {
      setValue('amount', receivable.remaining_amount || 0);
    }
  }, [receivable, setValue]);

  // Get GPS location when opening form
  React.useEffect(() => {
    if (open && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGpsLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.warn('Could not get GPS location:', error);
        },
        { enableHighAccuracy: true }
      );
    }
  }, [open]);

  const onSubmit = async (data: PaymentFormData) => {
    try {
      await recordPayment.mutateAsync({
        receivableId,
        amount: data.amount,
        payment_method: data.payment_method,
        payment_date: data.payment_date || undefined,
        reference_number: data.reference_number || undefined,
        notes: data.notes || undefined,
        latitude: gpsLocation?.latitude,
        longitude: gpsLocation?.longitude,
      });
      onOpenChange(false);
      reset();
      onSuccess?.();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    reset();
  };

  const selectedMethod = watch('payment_method');
  const amount = watch('amount');

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(value);
  };

  if (!receivable) return null;

  const customer = receivable.customer as any;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Ghi nhận thanh toán</DialogTitle>
          <DialogDescription>
            Ghi nhận khoản thanh toán cho công nợ
          </DialogDescription>
        </DialogHeader>

        {/* Receivable Info */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Khách hàng:</span>
            <span className="font-medium">{customer?.name || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Mã công nợ:</span>
            <span>{receivable.receivable_number}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tổng công nợ:</span>
            <span>{formatPrice(receivable.amount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Đã thanh toán:</span>
            <span className="text-green-600">{formatPrice(receivable.paid_amount || 0)}</span>
          </div>
          <div className="flex justify-between border-t pt-2 mt-2">
            <span className="font-medium">Còn lại:</span>
            <span className="font-bold text-lg text-orange-600">
              {formatPrice(receivable.remaining_amount || 0)}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Amount */}
          <div>
            <Label htmlFor="amount">Số tiền thanh toán *</Label>
            <Input
              id="amount"
              type="number"
              {...register('amount', { valueAsNumber: true })}
              className={errors.amount ? 'border-red-500' : ''}
            />
            {errors.amount && (
              <p className="text-sm text-red-500 mt-1">{errors.amount.message}</p>
            )}
            {amount > (receivable.remaining_amount || 0) && (
              <p className="text-sm text-amber-500 mt-1">
                Số tiền lớn hơn công nợ còn lại
              </p>
            )}
          </div>

          {/* Payment Method */}
          <div>
            <Label>Phương thức thanh toán *</Label>
            <Select
              value={selectedMethod}
              onValueChange={(value) => setValue('payment_method', value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn phương thức" />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    <div className="flex items-center">
                      <method.icon className="h-4 w-4 mr-2" />
                      {method.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Payment Date */}
            <div>
              <Label htmlFor="payment_date">Ngày thanh toán</Label>
              <Input
                id="payment_date"
                type="date"
                {...register('payment_date')}
              />
            </div>

            {/* Reference Number */}
            <div>
              <Label htmlFor="reference_number">Số tham chiếu</Label>
              <Input
                id="reference_number"
                {...register('reference_number')}
                placeholder="VD: Số séc, mã GD..."
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Ghi chú</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Ghi chú thêm..."
              rows={2}
            />
          </div>

          {/* GPS Info */}
          {gpsLocation && (
            <p className="text-xs text-muted-foreground">
              📍 Vị trí: {gpsLocation.latitude.toFixed(6)}, {gpsLocation.longitude.toFixed(6)}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Hủy
            </Button>
            <Button type="submit" disabled={recordPayment.isPending}>
              {recordPayment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ghi nhận thanh toán
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default PaymentForm;
