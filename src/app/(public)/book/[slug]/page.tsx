import { Suspense } from "react";

import { BookingFlowPage } from "@/components/pages/booking-flow-page";

export default async function BookPage(props: PageProps<"/book/[slug]">) {
  const { slug } = await props.params;
  return (
    <Suspense fallback={<div className="panel p-6 text-sm text-[var(--color-secondary)]">Loading...</div>}>
      <BookingFlowPage slug={slug} />
    </Suspense>
  );
}
