import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getVisitDetail } from "@/lib/business/visit-history";
import { loadVisitImageAttachments } from "@/lib/business/visit-attachments.server";
import { VisitDetailsPage } from "@/components/salesman/visit-history/visit-details-page";

interface VisitDetailRoutePageProps {
  params: Promise<{ visitId: string }>;
}

export default async function VisitDetailRoutePage({ params }: VisitDetailRoutePageProps) {
  const { visitId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: salesmanId } = await supabase.rpc("current_salesman_id");
  if (!salesmanId) notFound();

  let visit;
  try {
    visit = await getVisitDetail(supabase, visitId);
  } catch {
    notFound();
  }

  if (!visit) notFound();

  const attachments = await loadVisitImageAttachments(supabase, visitId);

  return <VisitDetailsPage visit={{ ...visit, attachments }} />;
}
