export default function PublicLoading() {
  return (
    <div className="space-y-6">
      <section className="panel p-6 md:p-8">
        <div className="h-3 w-32 rounded-full bg-white/10" />
        <div className="mt-4 h-9 w-full max-w-2xl rounded-full bg-white/10" />
        <div className="mt-3 h-4 w-full max-w-xl rounded-full bg-white/8" />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="panel h-36 animate-pulse bg-[linear-gradient(180deg,rgba(28,34,48,0.78),rgba(21,25,34,0.84))]"
          />
        ))}
      </section>
    </div>
  );
}
