import PremiumPaywall from '../PremiumPaywall'

export default function PremiumPaywallExample() {
  const handleUpgrade = () => {
    console.log('Upgrade callback triggered');
  };

  return (
    <div className="p-8 max-w-sm">
      <PremiumPaywall feature="HD Export" onUpgrade={handleUpgrade} />
    </div>
  );
}