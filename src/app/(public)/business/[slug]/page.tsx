import { BusinessProfilePage } from "@/components/pages/business-profile-page";

export default async function BusinessPage(props: PageProps<"/business/[slug]">) {
  const { slug } = await props.params;
  return <BusinessProfilePage slug={slug} />;
}
