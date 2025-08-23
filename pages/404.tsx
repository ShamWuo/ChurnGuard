export default function NotFound() {
  return (
    <main className="container container--narrow">
      <h1>Page not found</h1>
      <p>We couldn’t find that page. Try the homepage or analytics.</p>
      <p>
        <a href="/">Home</a> · <a href="/analytics">Analytics</a> · <a href="/admin-login">Admin</a>
      </p>
    </main>
  );
}
