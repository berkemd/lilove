import ExportPanel from '../ExportPanel'
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function ExportPanelExample() {
  const [isPremium, setIsPremium] = useState(false);

  return (
    <div className="p-8 max-w-md space-y-4">
      <Button onClick={() => setIsPremium(!isPremium)} variant="outline">
        Toggle {isPremium ? 'Free' : 'Premium'} View
      </Button>
      <ExportPanel isPremium={isPremium} />
    </div>
  );
}