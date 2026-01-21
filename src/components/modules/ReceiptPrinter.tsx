import { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Printer, Download } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ReceiptData {
  id: string;
  order_number: string;
  customer_name: string;
  customer_address?: string;
  customer_phone?: string;
  customer_tax_id?: string;
  items: Array<{
    name: string;
    quantity: number;
    unit_price: number;
    total: number;
    unit?: string;
  }>;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  paid_amount: number;
  payment_method?: string;
  notes?: string;
  created_at: string;
  created_by_name?: string;
  company_name?: string;
  company_address?: string;
  company_phone?: string;
  company_tax_id?: string;
}

interface ReceiptPrinterProps {
  orderId: string;
  open: boolean;
  onClose: () => void;
}

export function ReceiptPrinter({ orderId, open, onClose }: ReceiptPrinterProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const { data: receipt, isLoading } = useQuery({
    queryKey: ['receipt', orderId],
    queryFn: async (): Promise<ReceiptData | null> => {
      // Fetch order with items
      const { data: order, error } = await supabase
        .from('sales_orders')
        .select(`
          *,
          customer:customers(name, address, phone, tax_id),
          items:order_items(*, product:products(name, unit))
        `)
        .eq('id', orderId)
        .single();

      if (error) throw error;
      if (!order) return null;

      // Get company info
      const { data: company } = await supabase
        .from('companies')
        .select('name, address, phone, tax_id')
        .eq('id', order.company_id)
        .single();

      return {
        id: order.id,
        order_number: order.order_number || `ĐH-${order.id.slice(0, 8).toUpperCase()}`,
        customer_name: order.customer?.name || 'Khách lẻ',
        customer_address: order.customer?.address,
        customer_phone: order.customer?.phone,
        customer_tax_id: order.customer?.tax_id,
        items: (order.items || []).map((item: Record<string, unknown>) => {
          const product = item.product as Record<string, unknown> | undefined;
          return {
            name: product?.name || item.product_name || 'Sản phẩm',
            quantity: item.quantity as number,
            unit_price: item.unit_price as number,
            total: (item.quantity as number) * (item.unit_price as number),
            unit: (product?.unit as string) || 'cái',
          };
        }),
        subtotal: order.subtotal || order.total_amount,
        tax_amount: order.tax_amount || 0,
        discount_amount: order.discount_amount || 0,
        total_amount: order.total_amount,
        paid_amount: order.paid_amount || 0,
        payment_method: order.payment_method,
        notes: order.notes,
        created_at: order.created_at,
        company_name: company?.name || 'SABOHUB',
        company_address: company?.address,
        company_phone: company?.phone,
        company_tax_id: company?.tax_id,
      };
    },
    enabled: open && !!orderId,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Hóa đơn ${receipt?.order_number}</title>
        <style>
          body { font-family: 'Arial', sans-serif; padding: 20px; max-width: 80mm; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 20px; }
          .company-name { font-size: 18px; font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 10px 0; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 5px; text-align: left; font-size: 12px; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .total-row { font-weight: bold; font-size: 14px; }
          .footer { text-align: center; margin-top: 20px; font-size: 11px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        ${content.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleDownloadPDF = () => {
    // For simplicity, trigger print which can save as PDF
    handlePrint();
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Hóa đơn / Phiếu thu</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-1" />
                In
              </Button>
              <Button size="sm" variant="outline" onClick={handleDownloadPDF}>
                <Download className="h-4 w-4 mr-1" />
                PDF
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : receipt ? (
          <div ref={printRef} className="bg-white p-6 rounded-lg">
            {/* Header */}
            <div className="text-center mb-6">
              <h1 className="text-xl font-bold">{receipt.company_name}</h1>
              {receipt.company_address && (
                <p className="text-sm text-gray-600">{receipt.company_address}</p>
              )}
              {receipt.company_phone && (
                <p className="text-sm text-gray-600">ĐT: {receipt.company_phone}</p>
              )}
              {receipt.company_tax_id && (
                <p className="text-sm text-gray-600">MST: {receipt.company_tax_id}</p>
              )}
            </div>

            <div className="border-t border-dashed border-gray-300 my-4"></div>

            <h2 className="text-center text-lg font-bold mb-4">HÓA ĐƠN BÁN HÀNG</h2>
            
            <div className="text-sm mb-4">
              <p><strong>Số:</strong> {receipt.order_number}</p>
              <p><strong>Ngày:</strong> {format(new Date(receipt.created_at), 'dd/MM/yyyy HH:mm', { locale: vi })}</p>
              <p><strong>Khách hàng:</strong> {receipt.customer_name}</p>
              {receipt.customer_phone && <p><strong>SĐT:</strong> {receipt.customer_phone}</p>}
              {receipt.customer_address && <p><strong>Địa chỉ:</strong> {receipt.customer_address}</p>}
            </div>

            <div className="border-t border-dashed border-gray-300 my-4"></div>

            {/* Items */}
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Sản phẩm</th>
                  <th className="text-center py-2">SL</th>
                  <th className="text-right py-2">Đơn giá</th>
                  <th className="text-right py-2">T.Tiền</th>
                </tr>
              </thead>
              <tbody>
                {receipt.items.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-100">
                    <td className="py-2">{item.name}</td>
                    <td className="text-center py-2">{item.quantity} {item.unit}</td>
                    <td className="text-right py-2">{formatCurrency(item.unit_price)}</td>
                    <td className="text-right py-2">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="border-t border-dashed border-gray-300 my-4"></div>

            {/* Totals */}
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Tạm tính:</span>
                <span>{formatCurrency(receipt.subtotal)}</span>
              </div>
              {receipt.discount_amount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Giảm giá:</span>
                  <span>-{formatCurrency(receipt.discount_amount)}</span>
                </div>
              )}
              {receipt.tax_amount > 0 && (
                <div className="flex justify-between">
                  <span>Thuế VAT:</span>
                  <span>{formatCurrency(receipt.tax_amount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>TỔNG CỘNG:</span>
                <span>{formatCurrency(receipt.total_amount)}</span>
              </div>
              {receipt.paid_amount > 0 && (
                <>
                  <div className="flex justify-between text-green-600">
                    <span>Đã thanh toán:</span>
                    <span>{formatCurrency(receipt.paid_amount)}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Còn nợ:</span>
                    <span>{formatCurrency(receipt.total_amount - receipt.paid_amount)}</span>
                  </div>
                </>
              )}
            </div>

            {receipt.notes && (
              <>
                <div className="border-t border-dashed border-gray-300 my-4"></div>
                <p className="text-sm text-gray-600"><strong>Ghi chú:</strong> {receipt.notes}</p>
              </>
            )}

            <div className="border-t border-dashed border-gray-300 my-4"></div>

            {/* Footer */}
            <div className="text-center text-sm text-gray-500">
              <p>Cảm ơn quý khách!</p>
              <p>Hẹn gặp lại</p>
            </div>
          </div>
        ) : (
          <div className="text-center py-10 text-gray-500">
            Không tìm thấy thông tin đơn hàng
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Invoice component for B2B
export function InvoicePrinter({ orderId, open, onClose }: ReceiptPrinterProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', orderId],
    queryFn: async (): Promise<ReceiptData | null> => {
      const { data: order, error } = await supabase
        .from('sales_orders')
        .select(`
          *,
          customer:customers(name, address, phone, tax_id, contact_person),
          items:order_items(*, product:products(name, unit, sku))
        `)
        .eq('id', orderId)
        .single();

      if (error) throw error;
      if (!order) return null;

      const { data: company } = await supabase
        .from('companies')
        .select('name, address, phone, tax_id')
        .eq('id', order.company_id)
        .single();

      return {
        id: order.id,
        order_number: order.order_number || `HD-${order.id.slice(0, 8).toUpperCase()}`,
        customer_name: order.customer?.name || 'Khách hàng',
        customer_address: order.customer?.address,
        customer_phone: order.customer?.phone,
        customer_tax_id: order.customer?.tax_id,
        items: (order.items || []).map((item: Record<string, unknown>) => ({
          name: (item.product as Record<string, unknown>)?.name || item.product_name,
          quantity: item.quantity as number,
          unit_price: item.unit_price as number,
          total: (item.quantity as number) * (item.unit_price as number),
          unit: (item.product as Record<string, unknown>)?.unit || 'cái',
        })),
        subtotal: order.subtotal || order.total_amount,
        tax_amount: order.tax_amount || 0,
        discount_amount: order.discount_amount || 0,
        total_amount: order.total_amount,
        paid_amount: order.paid_amount || 0,
        payment_method: order.payment_method,
        notes: order.notes,
        created_at: order.created_at,
        company_name: company?.name || 'SABOHUB',
        company_address: company?.address,
        company_phone: company?.phone,
        company_tax_id: company?.tax_id,
      };
    },
    enabled: open && !!orderId,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const numberToWords = (num: number): string => {
    // Vietnamese number to words (simplified)
    if (num === 0) return 'không đồng';
    // Simplified - just return the number formatted
    return `${new Intl.NumberFormat('vi-VN').format(num)} đồng`;
  };

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Hóa đơn ${invoice?.order_number}</title>
        <style>
          body { font-family: 'Times New Roman', serif; padding: 40px; max-width: 210mm; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
          .company-info { flex: 1; }
          .invoice-title { text-align: center; font-size: 24px; font-weight: bold; margin: 20px 0; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #000; padding: 8px; }
          th { background: #f0f0f0; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .no-border { border: none; }
          .signatures { display: flex; justify-content: space-between; margin-top: 40px; text-align: center; }
          .signature-box { width: 200px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        ${content.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Hóa đơn GTGT</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-1" />
                In
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : invoice ? (
          <div ref={printRef} className="bg-white p-8">
            {/* Header */}
            <div className="flex justify-between mb-6">
              <div>
                <h2 className="font-bold">{invoice.company_name}</h2>
                <p className="text-sm">{invoice.company_address}</p>
                <p className="text-sm">ĐT: {invoice.company_phone}</p>
                <p className="text-sm">MST: {invoice.company_tax_id}</p>
              </div>
              <div className="text-right">
                <p className="text-sm">Mẫu số: 01GTKT0/001</p>
                <p className="text-sm">Ký hiệu: AA/21E</p>
                <p className="text-sm">Số: {invoice.order_number}</p>
              </div>
            </div>

            <h1 className="text-2xl font-bold text-center my-6">HÓA ĐƠN GIÁ TRỊ GIA TĂNG</h1>
            <p className="text-center text-sm mb-6">
              Ngày {format(new Date(invoice.created_at), 'dd')} tháng {format(new Date(invoice.created_at), 'MM')} năm {format(new Date(invoice.created_at), 'yyyy')}
            </p>

            {/* Customer Info */}
            <div className="mb-6 text-sm">
              <p><strong>Đơn vị mua hàng:</strong> {invoice.customer_name}</p>
              <p><strong>Mã số thuế:</strong> {invoice.customer_tax_id || '---'}</p>
              <p><strong>Địa chỉ:</strong> {invoice.customer_address || '---'}</p>
              <p><strong>Hình thức thanh toán:</strong> {invoice.payment_method === 'cash' ? 'Tiền mặt' : invoice.payment_method === 'transfer' ? 'Chuyển khoản' : 'Công nợ'}</p>
            </div>

            {/* Items Table */}
            <table className="w-full border-collapse border text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2 w-12">STT</th>
                  <th className="border p-2">Tên hàng hóa, dịch vụ</th>
                  <th className="border p-2 w-20">ĐVT</th>
                  <th className="border p-2 w-20">Số lượng</th>
                  <th className="border p-2 w-32">Đơn giá</th>
                  <th className="border p-2 w-32">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="border p-2 text-center">{idx + 1}</td>
                    <td className="border p-2">{item.name}</td>
                    <td className="border p-2 text-center">{item.unit}</td>
                    <td className="border p-2 text-center">{item.quantity}</td>
                    <td className="border p-2 text-right">{formatCurrency(item.unit_price)}</td>
                    <td className="border p-2 text-right">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5} className="border p-2 text-right font-bold">Cộng tiền hàng:</td>
                  <td className="border p-2 text-right">{formatCurrency(invoice.subtotal)}</td>
                </tr>
                <tr>
                  <td colSpan={5} className="border p-2 text-right">Thuế suất GTGT: 10%</td>
                  <td className="border p-2 text-right">{formatCurrency(invoice.tax_amount)}</td>
                </tr>
                <tr>
                  <td colSpan={5} className="border p-2 text-right font-bold">Tổng cộng tiền thanh toán:</td>
                  <td className="border p-2 text-right font-bold">{formatCurrency(invoice.total_amount)}</td>
                </tr>
              </tfoot>
            </table>

            <p className="text-sm mt-4">
              <strong>Số tiền viết bằng chữ:</strong> {numberToWords(invoice.total_amount)}
            </p>

            {/* Signatures */}
            <div className="flex justify-between mt-10 text-center text-sm">
              <div className="w-1/3">
                <p className="font-bold">Người mua hàng</p>
                <p className="text-gray-500">(Ký, ghi rõ họ tên)</p>
              </div>
              <div className="w-1/3">
                <p className="font-bold">Người bán hàng</p>
                <p className="text-gray-500">(Ký, ghi rõ họ tên)</p>
              </div>
              <div className="w-1/3">
                <p className="font-bold">Thủ trưởng đơn vị</p>
                <p className="text-gray-500">(Ký, đóng dấu, ghi rõ họ tên)</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-10 text-gray-500">
            Không tìm thấy thông tin
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ReceiptPrinter;
