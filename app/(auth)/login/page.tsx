import { redirect } from "next/navigation";
import { login } from "./actions";
import { SalesMasterLogo } from "@/components/branding/sales-master-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

const NOTICES: Record<string, string> = {
  "access-denied": "Your account isn't set up for web access. Contact an admin.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role === "admin" || profile?.role === "manager") {
      redirect("/dashboard");
    }
    if (profile?.role === "salesman") {
      redirect("/record-visit");
    }
  }

  const { error, notice } = await searchParams;
  const noticeMessage = notice ? (NOTICES[notice] ?? NOTICES["access-denied"]) : undefined;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 p-4 dark:bg-black">
      <SalesMasterLogo size="lg" priority className="mb-6" />
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="sr-only">Sales Master</CardTitle>
          <CardDescription>Sign in to record dealer visits.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={login} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            {noticeMessage ? (
              <p className="text-sm text-muted-foreground">{noticeMessage}</p>
            ) : null}
            <Button type="submit" className="w-full">
              Sign in
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
