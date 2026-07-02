export function SetupRequired({ error }: { error?: string | null }) {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md text-center">
        <span className="text-5xl block mb-4">🔧</span>
        <h1 className="font-serif text-3xl text-warm-800 mb-3">
          Supabase setup needed
        </h1>
        <p className="text-warm-600 mb-6 leading-relaxed">
          The app can&apos;t connect to a database yet. Add your Supabase
          credentials to get started.
        </p>

        {error && (
          <p className="text-sm text-coral-600 bg-coral-500/10 rounded-xl px-4 py-3 mb-6">
            {error}
          </p>
        )}

        <ol className="text-left text-sm text-warm-700 space-y-3 bg-cream rounded-2xl border border-gold-200 p-5 mb-6">
          <li>
            <span className="font-semibold">1.</span> Create a free project at{" "}
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="text-coral-500 underline"
            >
              supabase.com
            </a>
          </li>
          <li>
            <span className="font-semibold">2.</span> Enable{" "}
            <strong>Anonymous sign-ins</strong> under Authentication → Providers
          </li>
          <li>
            <span className="font-semibold">3.</span> Run{" "}
            <code className="text-xs bg-warm-200 px-1.5 py-0.5 rounded">
              supabase/migrations/001_schema.sql
            </code>{" "}
            in the SQL Editor
          </li>
          <li>
            <span className="font-semibold">4.</span> Copy your project URL and
            anon key into <code className="text-xs bg-warm-200 px-1.5 py-0.5 rounded">.env.local</code>
          </li>
          <li>
            <span className="font-semibold">5.</span> Restart the dev server
          </li>
        </ol>

        <pre className="text-left text-xs bg-warm-900 text-warm-200 rounded-xl p-4 overflow-x-auto">
{`NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...`}
        </pre>
      </div>
    </main>
  );
}
