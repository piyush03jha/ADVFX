export const COURIER_OPTIONS = [
  { name: "India Post — Speed Post", url: "https://www.indiapost.gov.in/?tt=1" },
  { name: "DTDC", url: "https://www.dtdc.com/track-your-shipment/" },
] as const;

export function knownCourier(carrier?: string | null) {
  const normalized = (carrier ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (normalized === "dtdc" || normalized === "dtdccourier") return COURIER_OPTIONS[1];
  if (["indiapost", "speedpost", "indiapostspeedpost", "speedpostindiapost", "indiapostspeedpostparcel"].includes(normalized)) return COURIER_OPTIONS[0];
  return undefined;
}

export function shipmentTrackingUrl(carrier?: string | null, savedUrl?: string | null): string | undefined {
  const official = knownCourier(carrier);
  if (official) return official.url;
  if (!savedUrl) return undefined;
  try {
    const url = new URL(savedUrl);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : undefined;
  } catch {
    return undefined;
  }
}
