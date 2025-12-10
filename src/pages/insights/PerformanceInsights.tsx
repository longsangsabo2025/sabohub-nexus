import { useEffect, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Users,
  Target,
  DollarSign,
  Lightbulb,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  generatePerformanceInsights,
  PerformanceInsight,
  EmployeeSkill,
  recommendTaskAssignments,
  TaskRequirement,
  AssignmentRecommendation,
} from '@/utils/aiRecommendations';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';

export default function PerformanceInsights() {
  // Fetch employees data
  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .is('deleted_at', null);

      if (error) throw error;
      return data;
    },
  });

  // Fetch tasks data
  const { data: tasks } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .is('deleted_at', null);

      if (error) throw error;
      return data;
    },
  });

  // Transform employees to EmployeeSkill format
  const employeeSkills: EmployeeSkill[] = useMemo(() => {
    if (!employees || !tasks) return [];

    return employees.map((emp) => {
      const empTasks = tasks.filter((t) => t.assigned_to === emp.id);
      const completedTasks = empTasks.filter((t) => t.status === 'completed');
      const activeTasks = empTasks.filter((t) => t.status !== 'completed');

      return {
        id: emp.id,
        name: emp.full_name || emp.email,
        experience: emp.years_experience ? emp.years_experience * 12 : 12,
        taskCompletionRate:
          empTasks.length > 0 ? (completedTasks.length / empTasks.length) * 100 : 85,
        currentWorkload: activeTasks.length,
        availability: 40, // Default 40 hours per week
        avgTaskDuration: 16, // Default 2 days
      };
    });
  }, [employees, tasks]);

  // Calculate performance data
  const performanceData = useMemo(() => {
    if (!tasks) return null;

    const completedTasks = tasks.filter((t) => t.status === 'completed');
    const completionRate = tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0;

    return {
      employees: employeeSkills,
      completionRate,
      avgTaskDuration: 20, // hours
      budgetUtilization: 72, // percentage
    };
  }, [employeeSkills, tasks]);

  // Generate AI insights
  const insights = useMemo(() => {
    if (!performanceData) return [];
    return generatePerformanceInsights(performanceData);
  }, [performanceData]);

  // Group insights by category
  const insightsByCategory = useMemo(() => {
    return {
      warnings: insights.filter((i) => i.type === 'warning'),
      optimizations: insights.filter((i) => i.type === 'optimization'),
      opportunities: insights.filter((i) => i.type === 'opportunity'),
    };
  }, [insights]);

  // Sample task for recommendations demo
  const sampleTask: TaskRequirement = {
    estimatedHours: 24,
    requiredSkills: ['React', 'TypeScript'],
    priority: 'high',
    complexity: 'moderate',
  };

  const recommendations = useMemo(() => {
    if (employeeSkills.length === 0) return [];
    return recommendTaskAssignments(employeeSkills, sampleTask, 5);
  }, [employeeSkills]);

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'text-red-600 bg-red-100';
      case 'medium':
        return 'text-orange-600 bg-orange-100';
      case 'low':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case 'optimization':
        return <TrendingUp className="h-5 w-5 text-blue-600" />;
      case 'opportunity':
        return <Lightbulb className="h-5 w-5 text-yellow-600" />;
      default:
        return <CheckCircle className="h-5 w-5 text-green-600" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'team':
        return <Users className="h-4 w-4" />;
      case 'process':
        return <Target className="h-4 w-4" />;
      case 'resource':
        return <Users className="h-4 w-4" />;
      case 'budget':
        return <DollarSign className="h-4 w-4" />;
      default:
        return <Target className="h-4 w-4" />;
    }
  };

  if (!performanceData) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Performance Insights</h1>
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Loading insights...
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Lightbulb className="h-8 w-8" />
          AI Performance Insights
        </h1>
        <p className="text-muted-foreground mt-1">
          Intelligent recommendations and optimization strategies powered by AI
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              Warnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {insightsByCategory.warnings.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              Optimizations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {insightsByCategory.optimizations.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-600" />
              Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {insightsByCategory.opportunities.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Actionable
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {insights.filter((i) => i.actionable).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>AI-Generated Insights</CardTitle>
          <CardDescription>
            Recommendations based on team performance, workload, and trends
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All ({insights.length})</TabsTrigger>
              <TabsTrigger value="warnings">
                Warnings ({insightsByCategory.warnings.length})
              </TabsTrigger>
              <TabsTrigger value="optimizations">
                Optimizations ({insightsByCategory.optimizations.length})
              </TabsTrigger>
              <TabsTrigger value="opportunities">
                Opportunities ({insightsByCategory.opportunities.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4 mt-4">
              {insights.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No insights available. Everything looks good!</p>
                </div>
              ) : (
                insights.map((insight, index) => (
                  <InsightCard key={index} insight={insight} />
                ))
              )}
            </TabsContent>

            <TabsContent value="warnings" className="space-y-4 mt-4">
              {insightsByCategory.warnings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No warnings. Great job!</p>
                </div>
              ) : (
                insightsByCategory.warnings.map((insight, index) => (
                  <InsightCard key={index} insight={insight} />
                ))
              )}
            </TabsContent>

            <TabsContent value="optimizations" className="space-y-4 mt-4">
              {insightsByCategory.optimizations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No optimization suggestions at this time.</p>
                </div>
              ) : (
                insightsByCategory.optimizations.map((insight, index) => (
                  <InsightCard key={index} insight={insight} />
                ))
              )}
            </TabsContent>

            <TabsContent value="opportunities" className="space-y-4 mt-4">
              {insightsByCategory.opportunities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No opportunities identified yet.</p>
                </div>
              ) : (
                insightsByCategory.opportunities.map((insight, index) => (
                  <InsightCard key={index} insight={insight} />
                ))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Smart Task Assignment Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Smart Task Assignment</CardTitle>
          <CardDescription>
            AI-recommended employees for a sample high-priority task (24 hours, moderate complexity)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recommendations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No employees available for recommendations.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recommendations.map((rec, index) => (
                <div
                  key={rec.employeeId}
                  className="p-4 rounded-lg border bg-gradient-to-r from-blue-50 to-white"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-bold">
                        #{index + 1}
                      </div>
                      <div>
                        <h4 className="font-semibold">{rec.employeeName}</h4>
                        <p className="text-sm text-muted-foreground">
                          Match Score: {rec.score}/100
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-blue-100 border-blue-300">
                        {rec.confidence}% Confidence
                      </Badge>
                      <Badge
                        variant={
                          rec.workloadImpact === 'low'
                            ? 'outline'
                            : rec.workloadImpact === 'medium'
                              ? 'secondary'
                              : 'destructive'
                        }
                      >
                        {rec.workloadImpact} workload
                      </Badge>
                    </div>
                  </div>
                  <div className="ml-11">
                    <Progress value={rec.score} className="h-2 mb-3" />
                    <ul className="space-y-1 mb-3">
                      {rec.reasons.map((reason, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          {reason}
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-muted-foreground">
                      Estimated completion: {rec.estimatedCompletionDate.toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InsightCard({ insight }: { insight: PerformanceInsight }) {
  const [expanded, setExpanded] = useState(false);

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'text-red-600 bg-red-100 border-red-300';
      case 'medium':
        return 'text-orange-600 bg-orange-100 border-orange-300';
      case 'low':
        return 'text-green-600 bg-green-100 border-green-300';
      default:
        return 'text-gray-600 bg-gray-100 border-gray-300';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case 'optimization':
        return <TrendingUp className="h-5 w-5 text-blue-600" />;
      case 'opportunity':
        return <Lightbulb className="h-5 w-5 text-yellow-600" />;
      default:
        return <CheckCircle className="h-5 w-5 text-green-600" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'team':
        return <Users className="h-4 w-4" />;
      case 'process':
        return <Target className="h-4 w-4" />;
      case 'resource':
        return <Users className="h-4 w-4" />;
      case 'budget':
        return <DollarSign className="h-4 w-4" />;
      default:
        return <Target className="h-4 w-4" />;
    }
  };

  return (
    <div className="p-4 rounded-lg border hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{getTypeIcon(insight.type)}</div>
        <div className="flex-1">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h4 className="font-semibold">{insight.title}</h4>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={getImpactColor(insight.impact)}>
                {insight.impact} impact
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                {getCategoryIcon(insight.category)}
                {insight.category}
              </Badge>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-3">{insight.description}</p>

          {insight.actionable && (
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(!expanded)}
                className="mb-2 px-0"
              >
                {expanded ? '▼' : '▶'} View Recommendations ({insight.recommendations.length})
              </Button>
              {expanded && (
                <div className="space-y-2 pl-4 border-l-2 border-blue-200">
                  {insight.recommendations.map((rec, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {insight.data && (
            <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
              <strong>Related Data:</strong>{' '}
              {insight.data.overloadedEmployees &&
                insight.data.overloadedEmployees.join(', ')}
              {insight.data.underutilizedEmployees &&
                insight.data.underutilizedEmployees.join(', ')}
              {insight.data.topPerformers && insight.data.topPerformers.join(', ')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
