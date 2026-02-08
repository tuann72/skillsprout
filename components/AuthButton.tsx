"use client";

import { useAuth } from "./AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export function AuthButton() {
  const { user, loading } = useAuth();
  const router = useRouter();

  if (loading) return null;

  if (!user) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => router.push("/auth/login")}
        className="gap-2"
      >
        <LogIn className="h-4 w-4" />
        Sign In
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden sm:inline text-sm text-muted-foreground">
        {user.user_metadata?.full_name ?? user.email}
      </span>
      <Button
        variant="outline"
        size="icon"
        className="cursor-pointer"
        onClick={async () => {
          const supabase = createClient();
          await supabase.auth.signOut();
          router.push("/");
        }}
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}
