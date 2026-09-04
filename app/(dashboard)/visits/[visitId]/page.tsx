import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getVisitDetailForAdmin } from "@/lib/business/visit-activity";
import { loadVisitImageAttachments } from "@/lib/business/visit-attachments.server";
import { VisitDetailsPage } from "@/components/salesman/visit-history/visit-details-page";

interface AdminVisitDetailPageProps {
  params: Promise<{ visitId: string }>;
}

export default async function AdminVisitDetailPage({ params }: AdminVisitDetailPageProps) {
  const { visitId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "admin" && profile.role !== "manager")) {
    notFound();
  }

  let visit;
  try {
    visit = await getVisitDetailForAdmin(supabase, visitId);
  } catch {
    notFound();
  }

  if (!visit) notFound();

  const attachments = await loadVisitImageAttachments(supabase, visitId);

  return (
    <VisitDetailsPage
      visit={{ ...visit, attachments }}
      backHref="/visits"
      backLabel="Visit Activity"
      showSource
      visitDetailBasePath="/visits"
    />
  );
}
