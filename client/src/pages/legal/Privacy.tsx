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
