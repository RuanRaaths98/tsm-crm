"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function UpdatePasswordPage() {
  const [message, setMessage] = useState("Checking password link...");
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    async function checkSession() {
      if (!supabase) {
        setMessage("Add Supabase environment variables to enable password setup.");
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setMessage("Open the newest password recovery email, then set the password here.");
        return;
      }

      setMessage("");
      setIsReady(true);
    }

    checkSession();
  }, [supabase]);

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!supabase) {
      setMessage("Add Supabase environment variables to enable password setup.");
      return;
    }

    const form = new FormData(event.currentTarget);
    const password = String(form.get("password"));
    const confirmPassword = String(form.get("confirmPassword"));

    if (password.length < 8) {
      setMessage("Use at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("The passwords do not match.");
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setIsLoading(false);
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
          <h1 className="mt-8 text-4xl font-semibold tracking-tight">Create your CRM password</h1>
          <p className="mt-4 max-w-md leading-7 text-zinc-600">
            Use the latest password recovery email, then choose a password for future sign-ins.
          </p>
        </div>
      </section>
      <section className="flex items-center justify-center">
        <Card className="w-full max-w-md rounded-md border-zinc-200 bg-white shadow-none">
          <CardHeader>
            <div className="mb-4 flex size-10 items-center justify-center rounded-md bg-red-50 text-[#f70805]">
              <ShieldCheck className="size-5" />
            </div>
            <CardTitle>Set password</CardTitle>
            <p className="text-sm text-zinc-500">Create a password for your team CRM account.</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={updatePassword} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="rounded-md"
                  disabled={!isReady || isLoading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="rounded-md"
                  disabled={!isReady || isLoading}
                />
              </div>
              {message && <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">{message}</p>}
              <Button
                type="submit"
                className="h-10 rounded-md bg-[#f70805] hover:bg-[#d80f0c]"
                disabled={!isReady || isLoading}
              >
                {isLoading && <Loader2 className="size-4 animate-spin" />}
                {isLoading ? "Saving..." : "Save password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
