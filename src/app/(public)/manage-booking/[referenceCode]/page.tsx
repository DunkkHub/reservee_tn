import { ManageBookingPage } from "@/components/pages/manage-booking-page";

export default async function ManageBookingRoute(props: PageProps<"/manage-booking/[referenceCode]">) {
  const { referenceCode } = await props.params;
  return <ManageBookingPage referenceCode={referenceCode} />;
}
