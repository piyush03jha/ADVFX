"use client";

import { useState } from "react";
import { Navbar } from "@/components/layout/SiteNavbar";
import { CustomForm, type CustomSubmission } from "@/components/custom/CustomForm";
import { CustomSuccessState } from "@/components/custom/CustomSuccessState";

export default function CustomPage() {
  const [body, setBody] = useState("full");
  const [head, setHead] = useState("bobble");
  const [submission, setSubmission] = useState<CustomSubmission | null>(null);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="relative isolate overflow-hidden pt-20 sm:pt-24">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[900px] bg-[radial-gradient(circle_at_72%_8%,rgba(139,92,246,0.16),transparent_32%),radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.045),transparent_25%)]" />
        {submission ? (
          <CustomSuccessState {...submission} />
        ) : (
          <section className="mx-auto max-w-[1440px] px-3 pb-20 sm:px-6 lg:px-10">
            <CustomForm body={body} onBodyChange={setBody} head={head} onHeadChange={setHead} onSubmit={setSubmission} />
          </section>
        )}
      </main>
    </div>
  );
}
