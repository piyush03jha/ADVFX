"use client";

import { useState } from "react";

import { Navbar } from "@/components/layout/SiteNavbar";

import { CustomHero } from "@/components/custom/CustomHero";
import { CustomForm, type CustomSubmission } from "@/components/custom/CustomForm";
import { CustomSuccessState } from "@/components/custom/CustomSuccessState";

export default function CustomPage() {
  const [body, setBody] = useState("full");
  const [head, setHead] = useState("stationary");
  const [submission, setSubmission] = useState<CustomSubmission | null>(null);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="relative isolate overflow-hidden pt-20 sm:pt-24">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[780px] bg-[radial-gradient(circle_at_78%_8%,rgba(139,92,246,0.18),transparent_34%),radial-gradient(circle_at_12%_20%,rgba(255,255,255,0.05),transparent_28%)]" />

        {submission ? (
          <CustomSuccessState {...submission} />
        ) : (
          <>
            <CustomHero body={body} head={head} />
            <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
              <CustomForm body={body} onBodyChange={setBody} head={head} onHeadChange={setHead} onSubmit={setSubmission} />
            </section>
          </>
        )}
      </main>
    </div>
  );
}
