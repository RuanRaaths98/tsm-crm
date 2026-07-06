"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function LoginPage() {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const supabase = getSupabaseBrowserClient();

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!supabase) {
      setMessage("Add Supabase environment variables to enable team login.");
      return;
    }

    setIsLoading(true);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setIsLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    window.location.href = "/";
  }

  return (
    <main className="grid min-h-[100dvh] bg-[#f7f8f5] px-4 py-8 lg:grid-cols-[1fr_480px] lg:px-8">
      <section className="hidden items-end border-r border-zinc-200 pr-10 lg:flex">
        <div className="max-w-xl pb-12">
          <Image
            src="/tsm-logo.png"
            alt="TSM logo"
            width={1153}
            height={510}
            className="h-auto w-44 object-contain"
            priority
          />
          <h1 className="mt-8 text-4xl font-semibold tracking-tight">TSM CRM</h1>
          <p className="mt-4 max-w-md leading-7 text-zinc-600">
            A secure workspace for leads, follow-ups, deals, clients, and agency delivery.
          </p>
        </div>
      </section>
      <section className="flex items-center justify-center">
        <Card className="w-full max-w-md rounded-md border-zinc-200 bg-white shadow-none">
          <CardHeader>
            <div className="mb-4 flex size-10 items-center justify-center rounded-md bg-red-50 text-[#f70805]">
              <ShieldCheck className="size-5" />
            </div>
            <CardTitle>Team login</CardTitle>
            <p className="text-sm text-zinc-500">Use your agency Supabase account to access the CRM.</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={signIn} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" autoComplete="email" required className="rounded-md" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" autoComplete="current-password" required className="rounded-md" />
              </div>
              {message && <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">{message}</p>}
              <Button
                type="submit"
                className="h-10 rounded-md bg-[#f70805] hover:bg-[#d80f0c]"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="size-4 animate-spin" />}
                {isLoading ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
