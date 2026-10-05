import { Link } from 'react-router-dom';

export default function PageNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="card-soft w-full max-w-sm space-y-4 p-8 text-center">
        <h1 className="font-display text-2xl font-bold">Nothing here</h1>
        <p className="text-sm text-muted-foreground">This page doesn't exist.</p>
        <Link to="/" className="btn-primary inline-flex w-full items-center justify-center">Back to feed</Link>
      </div>
    </div>
  );
}
