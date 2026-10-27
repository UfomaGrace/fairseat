// PlaceholderPage: stands in for a page that a later step builds.
//
//   <PlaceholderPage title="Notices" />

export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-(--color-text)">{title}</h1>
      <p className="mt-2 text-(--color-text-muted)">Coming in a later step.</p>
    </main>
  );
}
