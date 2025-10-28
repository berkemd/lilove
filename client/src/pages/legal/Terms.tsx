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
