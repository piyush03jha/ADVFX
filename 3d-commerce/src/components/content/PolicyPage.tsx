import Link from "next/link";

type Section={title:string;body:string};
export async function PolicyPage({
  eyebrow,title,intro,sections,contentKey,
}:{eyebrow:string;title:string;intro:string;sections:Section[];contentKey?:string}) {
  let live:any=null;
  if(contentKey){
    try{
      const api=process.env.BACKEND_API_URL||"http://localhost:4000";
      const r=await fetch(api+"/site-content/"+contentKey,{cache:"no-store"});
      if(r.ok) live=(await r.json()).value;
    }catch{}
  }
  const liveSections=Array.isArray(live?.sections)?live.sections.filter((x:any)=>x?.title&&x?.body):null;
  const renderedSections:Section[]=liveSections?.length?liveSections:sections;
  const renderedIntro=typeof live?.intro==="string"&&live.intro.trim()?live.intro:intro;
  const email=typeof live?.contactEmail==="string"&&live.contactEmail.trim()?live.contactEmail:"hello@voxel3d.in";
  return <main className="min-h-screen bg-background px-5 pb-20 pt-32 text-foreground sm:px-8 lg:px-12">
    <div className="mx-auto max-w-4xl">
      <Link href="/" className="text-[10px] uppercase tracking-[0.18em] text-primary hover:text-primary-hover">Voxel3D.</Link>
      <p className="mt-10 text-[10px] font-medium uppercase tracking-[0.24em] text-primary">{eyebrow}</p>
      <h1 className="mt-3 font-serif text-4xl tracking-[-0.04em] sm:text-6xl">{title}</h1>
      <p className="mt-6 max-w-3xl text-sm leading-7 text-muted sm:text-base">{renderedIntro}</p>
      <div className="mt-12 space-y-8">{renderedSections.map(section=><section key={section.title} className="rounded-2xl border border-border bg-surface p-5 sm:p-7"><h2 className="text-lg font-semibold">{section.title}</h2><p className="mt-3 whitespace-pre-line text-sm leading-7 text-muted">{section.body}</p></section>)}</div>
      <p className="mt-10 text-xs text-muted">Questions? Contact <a className="text-foreground underline decoration-border underline-offset-4" href={"mailto:"+email}>{email}</a>.</p>
    </div>
  </main>;
}
