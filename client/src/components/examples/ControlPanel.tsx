import ControlPanel from '../ControlPanel'
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function ControlPanelExample() {
  const [isPremium, setIsPremium] = useState(false);

  return (
    <div className="p-8 max-w-md space-y-4">
      <Button onClick={() => setIsPremium(!isPremium)} variant="outline">
        Toggle {isPremium ? 'Free' : 'Premium'} View
      </Button>
      <ControlPanel isPremium={isPremium} />
    </div>
  );
}