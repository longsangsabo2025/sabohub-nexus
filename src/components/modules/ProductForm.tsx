import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productSchema, type ProductFormData } from '@/schemas/moduleSchemas';
import { useCreateProductV2, useUpdateProductV2, useProductCategoriesV2 } from '@/hooks/useOdoriModules';
import type { Product } from '@/types/modules';
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
import { Loader2, Barcode } from 'lucide-react';

interface ProductFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
  onSuccess?: () => void;
}

const commonUnits = [
  'Cái', 'Chiếc', 'Bộ', 'Hộp', 'Thùng', 'Chai', 'Lon', 'Gói',
  'Kg', 'Gram', 'Lít', 'ml', 'Mét', 'Cuộn', 'Tấm', 'Thanh',
];

export function ProductForm({ open, onOpenChange, product, onSuccess }: ProductFormProps) {
  const isEditing = !!product;
  const createProduct = useCreateProductV2();
  const updateProduct = useUpdateProductV2();
  const { data: categories } = useProductCategoriesV2();
  const isPending = createProduct.isPending || updateProduct.isPending;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name || '',
      sku: product?.sku || '',
      barcode: product?.barcode || '',
      description: product?.description || '',
      category_id: product?.category_id || '',
      unit: product?.unit || 'Cái',
      base_price: product?.base_price || 0,
      cost_price: product?.cost_price || undefined,
      weight: product?.weight || undefined,
      volume: product?.volume || undefined,
      image_url: product?.image_url || '',
    },
  });

  React.useEffect(() => {
    if (product) {
      reset({
        name: product.name || '',
        sku: product.sku || '',
        barcode: product.barcode || '',
        description: product.description || '',
        category_id: product.category_id || '',
        unit: product.unit || 'Cái',
        base_price: product.base_price || 0,
        cost_price: product.cost_price || undefined,
        weight: product.weight || undefined,
        volume: product.volume || undefined,
        image_url: product.image_url || '',
      });
    } else {
      reset({
        name: '',
        sku: '',
        barcode: '',
        description: '',
        category_id: '',
        unit: 'Cái',
        base_price: 0,
        cost_price: undefined,
        weight: undefined,
        volume: undefined,
        image_url: '',
      });
    }
  }, [product, reset]);

  const onSubmit = async (data: ProductFormData) => {
    try {
      // Filter out empty strings for optional fields
      const cleanData = {
        ...data,
        sku: data.sku || undefined,
        barcode: data.barcode || undefined,
        description: data.description || undefined,
        category_id: data.category_id || undefined,
        image_url: data.image_url || undefined,
      };

      if (isEditing && product) {
        await updateProduct.mutateAsync({ id: product.id, ...cleanData });
      } else {
        await createProduct.mutateAsync(cleanData);
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

  const selectedUnit = watch('unit');
  const selectedCategory = watch('category_id');

  // Format number for display
  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('vi-VN').format(value);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Cập nhật thông tin sản phẩm'
              : 'Điền thông tin để tạo sản phẩm mới'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="name">Tên sản phẩm *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="VD: Dầu ăn Neptune 1L"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="sku">Mã SKU</Label>
              <Input
                id="sku"
                {...register('sku')}
                placeholder="Tự động nếu để trống"
              />
            </div>

            <div>
              <Label htmlFor="barcode">Mã vạch (Barcode)</Label>
              <div className="relative">
                <Input
                  id="barcode"
                  {...register('barcode')}
                  placeholder="Quét hoặc nhập mã vạch"
                  className="pr-10"
                />
                <Barcode className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </div>

          {/* Category and Unit */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category_id">Danh mục</Label>
              <Select
                value={selectedCategory}
                onValueChange={(value) => setValue('category_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn danh mục" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="unit">Đơn vị tính *</Label>
              <Select
                value={selectedUnit}
                onValueChange={(value) => setValue('unit', value)}
              >
                <SelectTrigger className={errors.unit ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Chọn đơn vị" />
                </SelectTrigger>
                <SelectContent>
                  {commonUnits.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.unit && (
                <p className="text-sm text-red-500 mt-1">{errors.unit.message}</p>
              )}
            </div>
          </div>

          {/* Pricing */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground">Giá cả</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="base_price">Giá bán (VNĐ) *</Label>
                <Input
                  id="base_price"
                  type="number"
                  {...register('base_price', { valueAsNumber: true })}
                  placeholder="0"
                  className={errors.base_price ? 'border-red-500' : ''}
                />
                {errors.base_price && (
                  <p className="text-sm text-red-500 mt-1">{errors.base_price.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="cost_price">Giá vốn (VNĐ)</Label>
                <Input
                  id="cost_price"
                  type="number"
                  {...register('cost_price', { valueAsNumber: true })}
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Physical Properties */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground">Thông số vật lý</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="weight">Khối lượng (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.01"
                  {...register('weight', { valueAsNumber: true })}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="volume">Thể tích (lít)</Label>
                <Input
                  id="volume"
                  type="number"
                  step="0.01"
                  {...register('volume', { valueAsNumber: true })}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Mô tả sản phẩm</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Mô tả chi tiết về sản phẩm..."
              rows={3}
            />
          </div>

          {/* Image URL */}
          <div>
            <Label htmlFor="image_url">URL hình ảnh</Label>
            <Input
              id="image_url"
              {...register('image_url')}
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Hủy
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Cập nhật' : 'Tạo sản phẩm'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default ProductForm;
