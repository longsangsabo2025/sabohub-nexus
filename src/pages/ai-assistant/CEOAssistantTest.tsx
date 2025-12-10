// TEST FILE - Simple version to isolate the error
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bot } from 'lucide-react';

export default function CEOAssistantTest() {
  const [count, setCount] = useState(0);

  return (
    <div className="p-6">
      <h1 className="text-2xl">CEO Assistant Test</h1>
      <Card>
        <CardContent className="pt-6">
          <Button onClick={() => setCount(count + 1)}>
            <Bot className="h-4 w-4 mr-2" />
            Test Button {count}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
