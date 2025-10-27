// Legacy component - replaced by modern App.tsx structure
// This file is kept for compatibility but no longer used
// Main routing now handled in App.tsx with sidebar layout

export default function AppLayout() {
  // Legacy component - functionality moved to modern App.tsx
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold">LiLove</h1>
        <p className="text-muted-foreground">Redirecting to modern dashboard...</p>
      </div>
    </div>
  );
}