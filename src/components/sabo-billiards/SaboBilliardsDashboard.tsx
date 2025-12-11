/**
 * SABO Billiards Dashboard Component
 * Example implementation using the centralized data system
 */

'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Users, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  DollarSign, 
  MapPin,
  RefreshCw
} from 'lucide-react';
import { 
  useSaboCompany, 
  useSaboEmployees, 
  useSaboTasks, 
  useSaboTodayCheckins,
  useSaboOrders,
  useSaboDashboardStats,
  saboUtils,
  SABO_BILLIARDS 
} from '@/lib/sabo-billiards';

export function SaboBilliardsDashboard() {
  const { company, loading: companyLoading, error: companyError } = useSaboCompany();
  const { employees, loading: employeesLoading, refetch: refetchEmployees } = useSaboEmployees();
  const { tasks, loading: tasksLoading } = useSaboTasks();
  const { checkins, loading: checkinsLoading } = useSaboTodayCheckins();
  const { orders, loading: ordersLoading } = useSaboOrders({ 
    date: new Date().toISOString().split('T')[0] 
  });
  const stats = useSaboDashboardStats();

  if (companyLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading SABO Billiards data...</span>
      </div>
    );
  }

  if (companyError) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Error Loading Data</h2>
        <p className="text-muted-foreground">{companyError}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">{SABO_BILLIARDS.NAME}</h1>
          <p className="text-muted-foreground mt-2">{SABO_BILLIARDS.FULL_NAME}</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span>{SABO_BILLIARDS.ADDRESS}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(saboUtils.getGoogleMapsUrl(), '_blank')}
          >
            View on Map
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeEmployees}</div>
            <p className="text-xs text-muted-foreground">
              {stats.todayCheckins} checked in today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingTasks}</div>
            <p className="text-xs text-muted-foreground">
              {stats.completedTasks} completed today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Orders</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayOrders}</div>
            <p className="text-xs text-muted-foreground">
              Orders processed today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {saboUtils.formatCurrency(stats.todayRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              Revenue from {stats.todayOrders} orders
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Employees */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>
                {employeesLoading ? 'Loading employees...' : `${employees.length} active employees`}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={refetchEmployees}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {employees.slice(0, 5).map((employee) => (
                <div key={employee.id} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{employee.name}</div>
                    <div className="text-sm text-muted-foreground">{employee.email}</div>
                  </div>
                  <Badge variant={employee.is_active ? "default" : "secondary"}>
                    {employee.role.toUpperCase()}
                  </Badge>
                </div>
              ))}
              {employees.length > 5 && (
                <div className="text-sm text-muted-foreground text-center pt-2">
                  +{employees.length - 5} more employees
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Check-ins */}
        <Card>
          <CardHeader>
            <CardTitle>Today's Check-ins</CardTitle>
            <CardDescription>
              {checkinsLoading ? 'Loading check-ins...' : `${checkins.length} check-ins today`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {checkins.slice(0, 5).map((checkin) => (
                <div key={checkin.id} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Employee {checkin.employee_id.substring(0, 8)}...</div>
                    <div className="text-sm text-muted-foreground">
                      {saboUtils.formatTime(checkin.check_in_time)}
                      {checkin.check_out_time && ` - ${saboUtils.formatTime(checkin.check_out_time)}`}
                    </div>
                  </div>
                  <Badge variant={checkin.is_valid ? "default" : "destructive"}>
                    {checkin.is_valid ? 'Valid' : 'Invalid'}
                  </Badge>
                </div>
              ))}
              {checkins.length === 0 && !checkinsLoading && (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No check-ins today
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Tasks */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Tasks</CardTitle>
          <CardDescription>
            {tasksLoading ? 'Loading tasks...' : `${tasks.length} total tasks`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tasks.slice(0, 8).map((task) => (
              <div key={task.id} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium">{task.title}</div>
                  {task.description && (
                    <div className="text-sm text-muted-foreground">{task.description}</div>
                  )}
                  <div className="text-xs text-muted-foreground mt-1">
                    Created {saboUtils.formatDate(task.created_at)}
                    {task.due_date && ` • Due ${saboUtils.formatDate(task.due_date)}`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={
                      task.status === 'completed' ? 'default' :
                      task.status === 'in_progress' ? 'secondary' :
                      task.priority === 'urgent' ? 'destructive' :
                      'outline'
                    }
                  >
                    {task.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                  {task.priority === 'urgent' && (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                </div>
              </div>
            ))}
            {tasks.length === 0 && !tasksLoading && (
              <div className="text-sm text-muted-foreground text-center py-4">
                No tasks found
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Company Info */}
      {company && (
        <Card>
          <CardHeader>
            <CardTitle>Business Information</CardTitle>
            <CardDescription>Company details and configuration</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Business Type:</span>
                <span className="ml-2">{company.business_type}</span>
              </div>
              <div>
                <span className="font-medium">Check-in Radius:</span>
                <span className="ml-2">{company.check_in_radius}m</span>
              </div>
              <div>
                <span className="font-medium">Location:</span>
                <span className="ml-2">
                  {company.check_in_latitude}, {company.check_in_longitude}
                </span>
              </div>
              <div>
                <span className="font-medium">Updated:</span>
                <span className="ml-2">{saboUtils.formatDate(company.updated_at)}</span>
              </div>
            </div>
            <Separator className="my-4" />
            <div className="space-y-2 text-sm">
              <div><span className="font-medium">Address:</span> {company.address}</div>
              <div>
                <span className="font-medium">Contact:</span> {SABO_BILLIARDS.CONTACT.EMAIL} | {SABO_BILLIARDS.CONTACT.PHONE}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}