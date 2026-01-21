import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { orderSchema, type OrderFormData } from '@/schemas/moduleSchemas';
import { useCreateOrderV2, useProductsV2, useCustomersV2 } from '@/hooks/useOdoriModules';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, Plus, Trash2, Search } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface OrderFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function OrderForm({ open, onOpenChange, onSuccess }: OrderFormProps) {
  const createOrder = useCreateOrderV2();
  const { data: products } = useProductsV2({ isActive: true });
  const { data: customers } = useCustomersV2();
  const [searchProduct, setSearchProduct] = React.useState('');
  const [productPopoverOpen, setProductPopoverOpen] = React.useState(false);
  const [customerPopoverOpen, setCustomerPopoverOpen] = React.useState(false);
  const [selectedCustomer, setSelectedCustomer] = React.useState<any>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      customer_id: '',
      expected_delivery_date: '',
      shipping_address: '',
      notes: '',
      items: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const items = watch('items');

  // Calculate totals
  const subtotal = items.reduce((sum, item) => {
    const lineTotal = (item.quantity || 0) * (item.unit_price || 0);
    const discount = lineTotal * ((item.discount_percent || 0) / 100);
    return sum + lineTotal - discount;
  }, 0);

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(value);
  };

  const addProduct = (product: any) => {
    // Check if product already in list
    const existingIndex = fields.findIndex((f: any) => f.product_id === product.id);
    if (existingIndex >= 0) {
      // Increase quantity
      const currentQty = watch(`items.${existingIndex}.quantity`) || 0;
      setValue(`items.${existingIndex}.quantity`, currentQty + 1);
    } else {
      append({
        product_id: product.id,
        product_name: product.name,
        product_sku: product.sku,
        unit: product.unit,
        quantity: 1,
        unit_price: product.base_price,
        discount_percent: 0,
        notes: '',
      });
    }
    setProductPopoverOpen(false);
    setSearchProduct('');
  };

  const onSubmit = async (data: OrderFormData) => {
    try {
      await createOrder.mutateAsync({
        customer_id: data.customer_id,
        expected_delivery_date: data.expected_delivery_date || undefined,
        shipping_address: data.shipping_address || undefined,
        notes: data.notes || undefined,
        items: data.items,
      });
      onOpenChange(false);
      reset();
      setSelectedCustomer(null);
      onSuccess?.();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    reset();
    setSelectedCustomer(null);
  };

  const handleSelectCustomer = (customer: any) => {
    setSelectedCustomer(customer);
    setValue('customer_id', customer.id);
    setValue('shipping_address', customer.address || '');
    setCustomerPopoverOpen(false);
  };

  // Filter products by search
  const filteredProducts = products?.filter((p) =>
    p.name.toLowerCase().includes(searchProduct.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchProduct.toLowerCase()) ||
    p.barcode?.includes(searchProduct)
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tạo đơn hàng mới</DialogTitle>
          <DialogDescription>
            Chọn khách hàng và thêm sản phẩm vào đơn hàng
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Customer Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Khách hàng *</Label>
              <Popover open={customerPopoverOpen} onOpenChange={setCustomerPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className={`w-full justify-start ${errors.customer_id ? 'border-red-500' : ''}`}
                  >
                    {selectedCustomer ? (
                      <span>
                        {selectedCustomer.code} - {selectedCustomer.name}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Chọn khách hàng...</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Tìm khách hàng..." />
                    <CommandList>
                      <CommandEmpty>Không tìm thấy khách hàng</CommandEmpty>
                      <CommandGroup>
                        {customers?.map((customer) => (
                          <CommandItem
                            key={customer.id}
                            value={customer.name}
                            onSelect={() => handleSelectCustomer(customer)}
                          >
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {customer.code} - {customer.name}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                {customer.phone} • {customer.address}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {errors.customer_id && (
                <p className="text-sm text-red-500 mt-1">{errors.customer_id.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="expected_delivery_date">Ngày giao dự kiến</Label>
              <Input
                id="expected_delivery_date"
                type="date"
                {...register('expected_delivery_date')}
              />
            </div>

            <div>
              <Label htmlFor="shipping_address">Địa chỉ giao hàng</Label>
              <Input
                id="shipping_address"
                {...register('shipping_address')}
                placeholder="Địa chỉ giao hàng"
              />
            </div>
          </div>

          {/* Product Search and Add */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Sản phẩm</h4>
              <Popover open={productPopoverOpen} onOpenChange={setProductPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Thêm sản phẩm
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="end">
                  <Command>
                    <CommandInput
                      placeholder="Tìm theo tên, SKU hoặc mã vạch..."
                      value={searchProduct}
                      onValueChange={setSearchProduct}
                    />
                    <CommandList>
                      <CommandEmpty>Không tìm thấy sản phẩm</CommandEmpty>
                      <CommandGroup>
                        {filteredProducts?.slice(0, 10).map((product) => (
                          <CommandItem
                            key={product.id}
                            value={product.name}
                            onSelect={() => addProduct(product)}
                          >
                            <div className="flex justify-between w-full">
                              <div>
                                <span className="font-medium">{product.name}</span>
                                <span className="text-sm text-muted-foreground ml-2">
                                  {product.sku}
                                </span>
                              </div>
                              <span className="text-sm">
                                {formatPrice(product.base_price)}/{product.unit}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Order Items Table */}
            {fields.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Sản phẩm</TableHead>
                    <TableHead className="w-[15%]">Số lượng</TableHead>
                    <TableHead className="w-[15%]">Đơn giá</TableHead>
                    <TableHead className="w-[10%]">CK %</TableHead>
                    <TableHead className="w-[15%] text-right">Thành tiền</TableHead>
                    <TableHead className="w-[5%]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, index) => {
                    const item = watch(`items.${index}`);
                    const lineTotal = (item.quantity || 0) * (item.unit_price || 0);
                    const discount = lineTotal * ((item.discount_percent || 0) / 100);
                    const finalAmount = lineTotal - discount;

                    return (
                      <TableRow key={field.id}>
                        <TableCell>
                          <div>
                            <span className="font-medium">{item.product_name}</span>
                            <span className="text-sm text-muted-foreground block">
                              {item.product_sku} • {item.unit}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            {...register(`items.${index}.unit_price`, { valueAsNumber: true })}
                            className="w-28"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            {...register(`items.${index}.discount_percent`, { valueAsNumber: true })}
                            className="w-16"
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatPrice(finalAmount)}
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(index)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="border rounded-lg p-8 text-center text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Chưa có sản phẩm nào</p>
                <p className="text-sm">Nhấn "Thêm sản phẩm" để bắt đầu</p>
              </div>
            )}

            {errors.items && (
              <p className="text-sm text-red-500">{errors.items.message}</p>
            )}

            {/* Order Summary */}
            {fields.length > 0 && (
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Tổng cộng:</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Ghi chú đơn hàng</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Ghi chú thêm cho đơn hàng..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Hủy
            </Button>
            <Button type="submit" disabled={createOrder.isPending || fields.length === 0}>
              {createOrder.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Tạo đơn hàng
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default OrderForm;
