/**
 * Custom Dashboard Builder
 * Purpose: Allow CEO to customize their dashboard widgets
 * Philosophy: Drag-and-drop, personalized views
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Layout,
  Plus,
  Eye,
  EyeOff,
  Settings,
  Save,
  RotateCcw,
  Grid3x3,
  Maximize2,
  CheckCircle,
  TrendingUp,
  Users,
  DollarSign,
  Target,
  Activity,
  BarChart3,
  PieChart as PieChartIcon,
  AlertCircle,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface Widget {
  id: string;
  name: string;
  category: 'metrics' | 'charts' | 'lists' | 'alerts';
  icon: any;
  enabled: boolean;
  size: 'small' | 'medium' | 'large';
  description: string;
}

export default function CustomDashboardBuilder() {
  const [widgets, setWidgets] = useState<Widget[]>([
    {
      id: 'health-score',
      name: 'Health Score',
      category: 'metrics',
      icon: Activity,
      enabled: true,
      size: 'large',
      description: 'Overall company health score with trends',
    },
    {
      id: 'revenue',
      name: 'Revenue Metrics',
      category: 'metrics',
      icon: DollarSign,
      enabled: true,
      size: 'small',
      description: 'Monthly revenue and growth rate',
    },
    {
      id: 'employees',
      name: 'Employee Count',
      category: 'metrics',
      icon: Users,
      enabled: true,
      size: 'small',
      description: 'Total employees and hiring trend',
    },
    {
      id: 'completion-rate',
      name: 'Task Completion',
      category: 'metrics',
      icon: CheckCircle,
      enabled: true,
      size: 'small',
      description: 'Task completion rate and overdue tasks',
    },
    {
      id: 'strategic-goals',
      name: 'Strategic Goals',
      category: 'metrics',
      icon: Target,
      enabled: true,
      size: 'medium',
      description: 'OKR progress and key milestones',
    },
    {
      id: 'revenue-chart',
      name: 'Revenue Chart',
      category: 'charts',
      icon: TrendingUp,
      enabled: false,
      size: 'large',
      description: 'Revenue trend visualization (6 months)',
    },
    {
      id: 'expense-chart',
      name: 'Expense Breakdown',
      category: 'charts',
      icon: PieChartIcon,
      enabled: false,
      size: 'medium',
      description: 'Pie chart showing cost allocation',
    },
    {
      id: 'top-performers',
      name: 'Top Performers',
      category: 'lists',
      icon: Users,
      enabled: true,
      size: 'medium',
      description: 'Top 5 employees by performance',
    },
    {
      id: 'critical-alerts',
      name: 'Critical Alerts',
      category: 'alerts',
      icon: AlertCircle,
      enabled: true,
      size: 'medium',
      description: 'Urgent items requiring attention',
    },
    {
      id: 'pending-approvals',
      name: 'Pending Approvals',
      category: 'alerts',
      icon: CheckCircle,
      enabled: true,
      size: 'small',
      description: 'Approval requests awaiting review',
    },
    {
      id: 'team-health',
      name: 'Team Health Summary',
      category: 'metrics',
      icon: Activity,
      enabled: false,
      size: 'medium',
      description: 'Employee wellness and engagement',
    },
    {
      id: 'kpi-overview',
      name: 'KPI Overview',
      category: 'charts',
      icon: BarChart3,
      enabled: false,
      size: 'large',
      description: 'All strategic KPIs in one view',
    },
  ]);

  const [previewMode, setPreviewMode] = useState(false);

  const toggleWidget = (id: string) => {
    setWidgets(widgets.map(w => 
      w.id === id ? { ...w, enabled: !w.enabled } : w
    ));
  };

  const updateWidgetSize = (id: string, size: Widget['size']) => {
    setWidgets(widgets.map(w => 
      w.id === id ? { ...w, size } : w
    ));
  };

  const resetToDefault = () => {
    const defaultEnabled = ['health-score', 'revenue', 'employees', 'completion-rate', 
                            'strategic-goals', 'top-performers', 'critical-alerts', 'pending-approvals'];
    setWidgets(widgets.map(w => ({
      ...w,
      enabled: defaultEnabled.includes(w.id),
      size: w.id === 'health-score' || w.id === 'revenue-chart' ? 'large' : 
            w.id === 'strategic-goals' ? 'medium' : 'small',
    })));
  };

  const enabledWidgets = widgets.filter(w => w.enabled);
  const categoryCount = (category: Widget['category']) => 
    widgets.filter(w => w.category === category && w.enabled).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Layout className="h-8 w-8 text-purple-600" />
              Custom Dashboard Builder
            </h2>
            <p className="text-muted-foreground">Tùy chỉnh dashboard theo nhu cầu của bạn</p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={() => setPreviewMode(!previewMode)}
            >
              {previewMode ? (
                <>
                  <Settings className="h-4 w-4 mr-2" />
                  Edit Mode
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </>
              )}
            </Button>
            <Button variant="outline" onClick={resetToDefault}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button>
              <Save className="h-4 w-4 mr-2" />
              Save Layout
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{enabledWidgets.length}</p>
              <p className="text-sm text-muted-foreground">Widgets bật</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{categoryCount('metrics')}</p>
              <p className="text-sm text-muted-foreground">Metrics</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{categoryCount('charts')}</p>
              <p className="text-sm text-muted-foreground">Charts</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{categoryCount('alerts')}</p>
              <p className="text-sm text-muted-foreground">Alerts</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {previewMode ? (
        /* Preview Mode */
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Dashboard Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {enabledWidgets.map(widget => (
                <Card 
                  key={widget.id}
                  className={`
                    ${widget.size === 'large' ? 'md:col-span-3' : 
                      widget.size === 'medium' ? 'md:col-span-2' : 'md:col-span-1'}
                    border-2 border-dashed
                  `}
                >
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <widget.icon className="h-4 w-4" />
                      {widget.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-32 flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <widget.icon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">{widget.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Edit Mode */
        <>
          {(['metrics', 'charts', 'lists', 'alerts'] as const).map(category => {
            const categoryWidgets = widgets.filter(w => w.category === category);
            const categoryLabels = {
              metrics: 'Metrics & KPIs',
              charts: 'Charts & Visualizations',
              lists: 'Lists & Tables',
              alerts: 'Alerts & Notifications',
            };
            const categoryIcons = {
              metrics: Target,
              charts: BarChart3,
              lists: Grid3x3,
              alerts: AlertCircle,
            };
            const CategoryIcon = categoryIcons[category];

            return (
              <Card key={category}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CategoryIcon className="h-5 w-5" />
                      {categoryLabels[category]}
                    </div>
                    <Badge variant="outline">
                      {categoryCount(category)} / {categoryWidgets.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {categoryWidgets.map((widget) => (
                      <div 
                        key={widget.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <widget.icon className="h-5 w-5 text-muted-foreground" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{widget.name}</p>
                              <Badge 
                                variant={widget.size === 'large' ? 'default' : 
                                        widget.size === 'medium' ? 'secondary' : 'outline'}
                                className="text-xs"
                              >
                                {widget.size}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {widget.description}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Settings className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Widget Settings: {widget.name}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label>Size</Label>
                                  <Select 
                                    value={widget.size} 
                                    onValueChange={(value) => updateWidgetSize(widget.id, value as Widget['size'])}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="small">Small (1 column)</SelectItem>
                                      <SelectItem value="medium">Medium (2 columns)</SelectItem>
                                      <SelectItem value="large">Large (3 columns)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="flex items-center justify-between">
                                  <Label>Enable Widget</Label>
                                  <Switch 
                                    checked={widget.enabled}
                                    onCheckedChange={() => toggleWidget(widget.id)}
                                  />
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                          <Switch 
                            checked={widget.enabled}
                            onCheckedChange={() => toggleWidget(widget.id)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </>
      )}

      {/* Tips */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Maximize2 className="h-5 w-5 text-blue-500" />
            Dashboard Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• <strong>Large widgets</strong>: Best for charts and detailed views (full width)</li>
            <li>• <strong>Medium widgets</strong>: Good for lists and summaries (2 columns)</li>
            <li>• <strong>Small widgets</strong>: Perfect for single metrics (1 column)</li>
            <li>• Drag & drop functionality coming in next sprint</li>
            <li>• Save multiple layouts for different scenarios</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
