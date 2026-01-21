import { supabase } from '@/integrations/supabase/client';
import type { Product, ProductCategory } from '@/types/modules';

export interface CreateProductInput {
  sku?: string;
  barcode?: string;
  name: string;
  description?: string;
  category_id?: string;
  unit: string;
  base_price: number;
  cost_price?: number;
  weight?: number;
  volume?: number;
  image_url?: string;
}

export interface UpdateProductInput extends Partial<CreateProductInput> {
  is_active?: boolean;
}

export interface ProductFilters {
  categoryId?: string;
  isActive?: boolean;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
}

class ProductService {
  private getCompanyId(): string | null {
    const companyId = localStorage.getItem('company_id');
    return companyId;
  }

  async getAll(filters: ProductFilters = {}): Promise<Product[]> {
    const companyId = this.getCompanyId();
    if (!companyId) throw new Error('Company ID not found');

    let query = supabase
      .from('products')
      .select(`
        *,
        category:category_id(id, name)
      `)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('name');

    if (filters.categoryId) {
      query = query.eq('category_id', filters.categoryId);
    }
    if (filters.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive);
    }
    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,sku.ilike.%${filters.search}%,barcode.ilike.%${filters.search}%`);
    }
    if (filters.minPrice !== undefined) {
      query = query.gte('base_price', filters.minPrice);
    }
    if (filters.maxPrice !== undefined) {
      query = query.lte('base_price', filters.maxPrice);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as Product[];
  }

  async getById(id: string): Promise<Product | null> {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        category:category_id(id, name)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Product;
  }

  async getByBarcode(barcode: string): Promise<Product | null> {
    const companyId = this.getCompanyId();
    if (!companyId) throw new Error('Company ID not found');

    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        category:category_id(id, name)
      `)
      .eq('company_id', companyId)
      .eq('barcode', barcode)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data as Product | null;
  }

  async create(input: CreateProductInput): Promise<Product> {
    const companyId = this.getCompanyId();
    if (!companyId) throw new Error('Company ID not found');

    // Generate SKU if not provided
    let sku = input.sku;
    if (!sku) {
      const timestamp = Date.now().toString().slice(-8);
      sku = `SKU${timestamp}`;
    }

    const { data, error } = await supabase
      .from('products')
      .insert({
        ...input,
        company_id: companyId,
        sku,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;
    return data as Product;
  }

  async update(id: string, input: UpdateProductInput): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Product;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('products')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  }

  async getCategories(): Promise<ProductCategory[]> {
    const companyId = this.getCompanyId();
    if (!companyId) throw new Error('Company ID not found');

    const { data, error } = await supabase
      .from('product_categories')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('sort_order');

    if (error) throw error;
    return data as ProductCategory[];
  }

  async createCategory(name: string, description?: string, parentId?: string): Promise<ProductCategory> {
    const companyId = this.getCompanyId();
    if (!companyId) throw new Error('Company ID not found');

    const { data, error } = await supabase
      .from('product_categories')
      .insert({
        company_id: companyId,
        name,
        description,
        parent_id: parentId,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;
    return data as ProductCategory;
  }

  async updateCategory(id: string, name: string, description?: string): Promise<ProductCategory> {
    const { data, error } = await supabase
      .from('product_categories')
      .update({ name, description })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as ProductCategory;
  }

  async getStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    byCategory: Record<string, number>;
    lowStock?: number;
  }> {
    const companyId = this.getCompanyId();
    if (!companyId) throw new Error('Company ID not found');

    const { data, error } = await supabase
      .from('products')
      .select('is_active, category_id')
      .eq('company_id', companyId)
      .is('deleted_at', null);

    if (error) throw error;

    const stats = {
      total: data.length,
      active: data.filter(p => p.is_active).length,
      inactive: data.filter(p => !p.is_active).length,
      byCategory: {} as Record<string, number>,
    };

    data.forEach(p => {
      if (p.category_id) {
        stats.byCategory[p.category_id] = (stats.byCategory[p.category_id] || 0) + 1;
      }
    });

    return stats;
  }
}

export const productService = new ProductService();
