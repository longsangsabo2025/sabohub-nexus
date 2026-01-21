import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { payableService } from '@/services/payableService';
import { Button } from '@/components/ui/button';
import { Plus, Search } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function PayablesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Fetch payables
  const { data: payables = [], isLoading } = useQuery({
    queryKey: ['payables', statusFilter],
    queryFn: () => payableService.getPayables({
      status: statusFilter === 'all' ? undefined : statusFilter,
    }),
  });

  // Filter payables by search query
  const filteredPayables = payables.filter((payable: any) =>
    searchQuery === '' ||
    payable.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    payable.supplier_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      outstanding: 'bg-yellow-100 text-yellow-800',
      partial: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
      overdue: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Payables</h1>
          <p className="text-muted-foreground">Quản lý công nợ phải trả</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Payable
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by invoice number or supplier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="outstanding">Outstanding</SelectItem>
            <SelectItem value="partial">Partial Paid</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Invoice Date</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Total Amount</TableHead>
              <TableHead>Outstanding</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredPayables.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center">
                  No payables found
                </TableCell>
              </TableRow>
            ) : (
              filteredPayables.map((payable: any) => (
                <TableRow key={payable.id}>
                  <TableCell className="font-medium">{payable.invoice_number}</TableCell>
                  <TableCell>{payable.supplier_name || '-'}</TableCell>
                  <TableCell>{new Date(payable.invoice_date).toLocaleDateString()}</TableCell>
                  <TableCell>{new Date(payable.due_date).toLocaleDateString()}</TableCell>
                  <TableCell>{payable.total_amount?.toLocaleString()} {payable.currency}</TableCell>
                  <TableCell>{payable.outstanding_amount?.toLocaleString()} {payable.currency}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(payable.status)}>
                      {payable.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">View</Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default PayablesPage;
