import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { customerSchema, type CustomerFormData } from '@/schemas/moduleSchemas';
import { useCreateCustomerV2, useUpdateCustomerV2 } from '@/hooks/useOdoriModules';
import type { Customer } from '@/types/modules';
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
import { Loader2 } from 'lucide-react';

interface CustomerFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer | null;
  onSuccess?: () => void;
}

const customerTypes = [
  { value: 'distributor', label: 'Nhà phân phối' },
  { value: 'retailer', label: 'Đại lý / Cửa hàng' },
  { value: 'end_customer', label: 'Khách hàng cuối' },
];

export function CustomerForm({ open, onOpenChange, customer, onSuccess }: CustomerFormProps) {
  const isEditing = !!customer;
  const createCustomer = useCreateCustomerV2();
  const updateCustomer = useUpdateCustomerV2();
  const isPending = createCustomer.isPending || updateCustomer.isPending;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: customer?.name || '',
      code: customer?.code || '',
      type: customer?.type || 'retailer',
      contact_person: customer?.contact_person || '',
      phone: customer?.phone || '',
      email: customer?.email || '',
      address: customer?.address || '',
      city: customer?.city || '',
      district: customer?.district || '',
      ward: customer?.ward || '',
      tax_id: customer?.tax_id || '',
      credit_limit: customer?.credit_limit || undefined,
      payment_terms: customer?.payment_terms || undefined,
      notes: customer?.notes || '',
    },
  });

  React.useEffect(() => {
    if (customer) {
      reset({
        name: customer.name || '',
        code: customer.code || '',
        type: customer.type || 'retailer',
        contact_person: customer.contact_person || '',
        phone: customer.phone || '',
        email: customer.email || '',
        address: customer.address || '',
        city: customer.city || '',
        district: customer.district || '',
        ward: customer.ward || '',
        tax_id: customer.tax_id || '',
        credit_limit: customer.credit_limit || undefined,
        payment_terms: customer.payment_terms || undefined,
        notes: customer.notes || '',
      });
    } else {
      reset({
        name: '',
        code: '',
        type: 'retailer',
        contact_person: '',
        phone: '',
        email: '',
        address: '',
        city: '',
        district: '',
        ward: '',
        tax_id: '',
        credit_limit: undefined,
        payment_terms: undefined,
        notes: '',
      });
    }
  }, [customer, reset]);

  const onSubmit = async (data: CustomerFormData) => {
    try {
      if (isEditing && customer) {
        await updateCustomer.mutateAsync({ id: customer.id, ...data });
      } else {
        await createCustomer.mutateAsync(data);
      }
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

  const selectedType = watch('type');

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Chỉnh sửa khách hàng' : 'Thêm khách hàng mới'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Cập nhật thông tin khách hàng'
              : 'Điền thông tin để tạo khách hàng mới'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="name">Tên khách hàng *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="VD: Cửa hàng ABC"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="code">Mã khách hàng</Label>
              <Input
                id="code"
                {...register('code')}
                placeholder="Tự động nếu để trống"
              />
            </div>

            <div>
              <Label htmlFor="type">Loại khách hàng</Label>
              <Select
                value={selectedType}
                onValueChange={(value) => setValue('type', value as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn loại khách hàng" />
                </SelectTrigger>
                <SelectContent>
                  {customerTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground">Thông tin liên hệ</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contact_person">Người liên hệ</Label>
                <Input
                  id="contact_person"
                  {...register('contact_person')}
                  placeholder="Họ tên người liên hệ"
                />
              </div>

              <div>
                <Label htmlFor="phone">Số điện thoại</Label>
                <Input
                  id="phone"
                  {...register('phone')}
                  placeholder="VD: 0901234567"
                  className={errors.phone ? 'border-red-500' : ''}
                />
                {errors.phone && (
                  <p className="text-sm text-red-500 mt-1">{errors.phone.message}</p>
                )}
              </div>

              <div className="col-span-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  placeholder="email@example.com"
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && (
                  <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground">Địa chỉ</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-3">
                <Label htmlFor="address">Địa chỉ chi tiết</Label>
                <Input
                  id="address"
                  {...register('address')}
                  placeholder="Số nhà, tên đường..."
                />
              </div>

              <div>
                <Label htmlFor="ward">Phường/Xã</Label>
                <Input id="ward" {...register('ward')} placeholder="Phường/Xã" />
              </div>

              <div>
                <Label htmlFor="district">Quận/Huyện</Label>
                <Input id="district" {...register('district')} placeholder="Quận/Huyện" />
              </div>

              <div>
                <Label htmlFor="city">Tỉnh/Thành phố</Label>
                <Input id="city" {...register('city')} placeholder="Tỉnh/Thành phố" />
              </div>
            </div>
          </div>

          {/* Business Info */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground">Thông tin kinh doanh</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="tax_id">Mã số thuế</Label>
                <Input id="tax_id" {...register('tax_id')} placeholder="MST" />
              </div>

              <div>
                <Label htmlFor="credit_limit">Hạn mức tín dụng (VNĐ)</Label>
                <Input
                  id="credit_limit"
                  type="number"
                  {...register('credit_limit', { valueAsNumber: true })}
                  placeholder="0"
                />
              </div>

              <div>
                <Label htmlFor="payment_terms">Kỳ hạn thanh toán (ngày)</Label>
                <Input
                  id="payment_terms"
                  type="number"
                  {...register('payment_terms', { valueAsNumber: true })}
                  placeholder="30"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Ghi chú</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Ghi chú thêm về khách hàng..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Hủy
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Cập nhật' : 'Tạo khách hàng'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default CustomerForm;
