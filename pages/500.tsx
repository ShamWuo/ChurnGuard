export default function Custom500() {
  return (
    <main className="container container--narrow p-16">
      <h1 className="mt-0">Something went wrong</h1>
      <p>We hit an unexpected error. Please try again in a moment.</p>
      <p>If this keeps happening, contact support and include the approximate time and what you were doing.</p>
      <div className="mt-12">
        <a href="/">Go back home</a>
      </div>
    </main>
  );
}
