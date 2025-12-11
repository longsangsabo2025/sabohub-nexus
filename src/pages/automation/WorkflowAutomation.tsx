import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Workflow,
  Plus,
  Play,
  Pause,
  Trash2,
  Settings,
  Zap,
  CheckCircle,
  Clock,
  Mail,
  Bell,
  GitBranch,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorkflowTrigger {
  id: string;
  type: 'task_completed' | 'attendance_late' | 'kpi_threshold' | 'approval_pending' | 'deadline_approaching';
  config: Record<string, any>;
}

interface WorkflowAction {
  id: string;
  type: 'create_task' | 'send_email' | 'send_notification' | 'update_status' | 'assign_user';
  config: Record<string, any>;
}

interface AutomationWorkflow {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  trigger: WorkflowTrigger;
  actions: WorkflowAction[];
  executionCount: number;
  lastExecuted?: Date;
}

const TRIGGER_TYPES = [
  { value: 'task_completed', label: 'Task Completed', icon: CheckCircle },
  { value: 'attendance_late', label: 'Late Check-in', icon: Clock },
  { value: 'kpi_threshold', label: 'KPI Threshold', icon: Zap },
  { value: 'approval_pending', label: 'Approval Pending', icon: Bell },
  { value: 'deadline_approaching', label: 'Deadline Approaching', icon: Clock },
];

const ACTION_TYPES = [
  { value: 'create_task', label: 'Create Task', icon: Plus },
  { value: 'send_email', label: 'Send Email', icon: Mail },
  { value: 'send_notification', label: 'Send Notification', icon: Bell },
  { value: 'update_status', label: 'Update Status', icon: Settings },
  { value: 'assign_user', label: 'Assign User', icon: GitBranch },
];

export default function WorkflowAutomation() {
  // Fetch REAL workflow data
  const { data: workflowStats, isLoading } = useQuery({
    queryKey: ['workflow-stats'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: company } = await supabase
        .from('companies')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (!company) throw new Error('Company not found');

      // Get workflows
      const { data: workflows } = await supabase
        .from('workflow_definitions')
        .select('*')
        .eq('company_id', company.id);

      // Get executions
      const { data: executions } = await supabase
        .from('workflow_executions')
        .select('*, workflow_definitions!inner(company_id)')
        .eq('workflow_definitions.company_id', company.id)
        .order('executed_at', { ascending: false })
        .limit(100);

      const activeWorkflows = workflows?.filter(w => w.enabled).length || 0;
      const totalExecutions = executions?.length || 0;
      const successRate = executions && executions.length > 0
        ? Math.round((executions.filter(e => e.status === 'success').length / executions.length) * 100)
        : 0;

      return {
        workflows: workflows || [],
        executions: executions || [],
        activeWorkflows,
        totalExecutions,
        successRate,
      };
    },
  });

  const [isCreating, setIsCreating] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Workflow className="h-8 w-8" />
            Workflow Automation - Real Data
          </h1>
          <p className="text-muted-foreground mt-1">
            Automated workflows với trigger & action thực tế
          </p>
        </div>
        <Button disabled={isLoading}>
          <Plus className="h-4 w-4 mr-2" />
          New Workflow
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Workflows</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workflowStats?.workflows.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{workflowStats?.activeWorkflows || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Executions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workflowStats?.totalExecutions || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{workflowStats?.successRate || 0}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Workflows List */}
      <Card>
        <CardHeader>
          <CardTitle>Active Workflows</CardTitle>
          <CardDescription>Automated tasks running in your system</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Loading...</p>
          ) : workflowStats && workflowStats.workflows.length > 0 ? (
            <div className="space-y-4">
              {workflowStats.workflows.map((workflow) => (
                <div key={workflow.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{workflow.name}</h3>
                        <Badge variant={workflow.enabled ? 'default' : 'secondary'}>
                          {workflow.enabled ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{workflow.description}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Trigger: {workflow.trigger_type}</span>
                        <span>Actions: {workflow.actions?.length || 0}</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Chưa có workflow nào. Tạo workflow đầu tiên để bắt đầu automation.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Recent Executions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Executions</CardTitle>
          <CardDescription>Last 10 workflow executions</CardDescription>
        </CardHeader>
        <CardContent>
          {workflowStats && workflowStats.executions.length > 0 ? (
            <div className="space-y-2">
              {workflowStats.executions.slice(0, 10).map((execution) => (
                <div key={execution.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    {execution.status === 'success' ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Clock className="h-4 w-4 text-red-600" />
                    )}
                    <div>
                      <p className="text-sm font-medium">
                        {execution.workflow_definitions?.name || 'Workflow'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(execution.executed_at).toLocaleString('vi-VN')}
                      </p>
                    </div>
                  </div>
                  <Badge variant={execution.status === 'success' ? 'default' : 'destructive'}>
                    {execution.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">Chưa có execution nào</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function WorkflowBuilder({ onClose }: { onClose: () => void }) {
  const [workflowName, setWorkflowName] = useState('');
  const [workflowDesc, setWorkflowDesc] = useState('');
  const [triggerType, setTriggerType] = useState('');
  const [actionType, setActionType] = useState('');

  const handleCreate = () => {
    // TODO: Save workflow
    onClose();
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="name">Workflow Name</Label>
        <Input
          id="name"
          placeholder="e.g., Daily Task Summary"
          value={workflowName}
          onChange={(e) => setWorkflowName(e.target.value)}
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="What does this workflow do?"
          value={workflowDesc}
          onChange={(e) => setWorkflowDesc(e.target.value)}
        />
      </div>

      <div>
        <Label htmlFor="trigger">Trigger</Label>
        <Select value={triggerType} onValueChange={setTriggerType}>
          <SelectTrigger>
            <SelectValue placeholder="Select trigger event" />
          </SelectTrigger>
          <SelectContent>
            {TRIGGER_TYPES.map((trigger) => (
              <SelectItem key={trigger.value} value={trigger.value}>
                {trigger.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="action">Action</Label>
        <Select value={actionType} onValueChange={setActionType}>
          <SelectTrigger>
            <SelectValue placeholder="Select action" />
          </SelectTrigger>
          <SelectContent>
            {ACTION_TYPES.map((action) => (
              <SelectItem key={action.value} value={action.value}>
                {action.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleCreate}>Create Workflow</Button>
      </div>
    </div>
  );
}
