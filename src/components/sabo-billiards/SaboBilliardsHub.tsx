/**
 * SABO Billiards Main Hub Page
 * Combines dashboard and documentation in one place
 */

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SaboBilliardsDashboard } from './SaboBilliardsDashboard';
import { SaboBilliardsDocumentation } from './SaboBilliardsDocumentation';
import { BarChart3, FileText } from 'lucide-react';

export function SaboBilliardsHub() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold gradient-text mb-2">SABO Billiards Hub</h1>
        <p className="text-xl text-muted-foreground">Trung tâm quản lý & tài liệu doanh nghiệp</p>
      </div>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="documentation" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Tài Liệu
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-8">
          <SaboBilliardsDashboard />
        </TabsContent>

        <TabsContent value="documentation" className="mt-8">
          <SaboBilliardsDocumentation />
        </TabsContent>
      </Tabs>
    </div>
  );
}