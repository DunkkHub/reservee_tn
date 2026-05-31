export default function PublicLoading() {
  return (
    <div className="space-y-6">
      <section className="panel p-6 md:p-8">
        <div className="loading-skeleton h-3 w-32 rounded-full" />
        <div className="loading-skeleton mt-4 h-9 w-full max-w-2xl rounded-full" />
        <div className="loading-skeleton mt-3 h-4 w-full max-w-xl rounded-full" />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="panel loading-skeleton h-36"
          />
        ))}
      </section>
    </div>
  );
}
