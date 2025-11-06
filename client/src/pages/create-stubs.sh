#!/bin/bash

# Create stub pages
pages=(
  "Dashboard:Dashboard"
  "Goals:Goals"
  "Tasks:Tasks"
  "Habits:Habits"
  "Teams:Teams"
  "Challenges:Challenges"
  "Coach:AI Coach"
  "BetaCoach:Beta Coach"
  "Insights:Insights"
  "Analytics:Analytics"
  "Achievements:Achievements"
  "Leaderboard:Leaderboard"
  "Leagues:Leagues"
  "Gamification:Gamification"
  "Profile:Profile"
  "Settings:Settings"
  "Landing:Welcome to LiLove"
  "Onboarding:Onboarding"
  "not-found:Page Not Found"
  "NotificationCenter:Notifications"
  "PaymentSuccess:Payment Successful"
  "PaymentFailure:Payment Failed"
  "Avatar:Avatar"
  "Quests:Quests"
  "Shop:Shop"
)

for page in "${pages[@]}"; do
  IFS=':' read -r filename title <<< "$page"
  cat > "${filename}.tsx" << EOF
export default function ${filename}() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">${title}</h1>
      <p className="text-muted-foreground">This page is under development.</p>
    </div>
  );
}
EOF
  echo "Created ${filename}.tsx"
done

# Create legal pages
mkdir -p legal
cat > "legal/Privacy.tsx" << 'EOF'
export default function Privacy() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      <div className="prose dark:prose-invert">
        <p>Last updated: {new Date().toLocaleDateString()}</p>
        <h2>Introduction</h2>
        <p>Welcome to LiLove. We respect your privacy and are committed to protecting your personal data.</p>
        <p>This privacy policy is under development and will be updated soon.</p>
      </div>
    </div>
  );
}
EOF

cat > "legal/Terms.tsx" << 'EOF'
export default function Terms() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
      <div className="prose dark:prose-invert">
        <p>Last updated: {new Date().toLocaleDateString()}</p>
        <h2>Agreement to Terms</h2>
        <p>By accessing LiLove, you agree to be bound by these Terms of Service.</p>
        <p>These terms are under development and will be updated soon.</p>
      </div>
    </div>
  );
}
EOF

echo "All pages created!"
