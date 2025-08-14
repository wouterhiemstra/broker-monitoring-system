// server/integrations/hubspot.ts
const HUB_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN || "";
const PIPELINE = process.env.HUBSPOT_PIPELINE_ID || "default";
const DEALSTAGE = process.env.HUBSPOT_DEALSTAGE_ID || "appointmentscheduled";

type NewListing = {
  title: string;
  website: string;
  price?: string | null;
  location?: string | null;
  brokerName: string;
  firstSeenISO: string;
};

export async function createDealForListing(l: NewListing) {
  if (!HUB_TOKEN) {
    console.log("[hubspot] skipped: no HUBSPOT_ACCESS_TOKEN");
    return { ok: false, skipped: true };
  }

  const dealname = `${l.brokerName}: ${l.title || l.website}`.slice(0, 250);

  const body = {
    properties: {
      dealname,
      pipeline: PIPELINE,
      dealstage: DEALSTAGE,
      amount: parseAmount(l.price),
      description: buildDescription(l),
      // Later you can map to custom props if you create them in HubSpot
      // listing_url__c: l.website,
      // listing_price__c: l.price || "",
      // listing_location__c: l.location || "",
      // broker__c: l.brokerName,
      // first_seen__c: l.firstSeenISO,
    },
  };

  const res = await fetch("https://api.hubapi.com/crm/v3/objects/deals", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${HUB_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    console.error("[hubspot] create deal failed:", res.status, txt);
    return { ok: false, status: res.status, error: txt.slice(0, 1000) };
  }

  const json = await res.json();
  return { ok: true, id: json.id };
}

function parseAmount(price?: string | null): number | undefined {
  if (!price) return undefined;
  const m = String(price).match(/[\d,.]+/g);
  if (!m) return undefined;
  const raw = m.join("");
  const norm = raw.replace(/,/g, ""); // basic normalize
  const n = Number(norm);
  return Number.isFinite(n) ? n : undefined;
}

function buildDescription(l: NewListing) {
  const parts = [
    `URL: ${l.website}`,
    l.price ? `Price: ${l.price}` : "",
    l.location ? `Location: ${l.location}` : "",
    `Broker: ${l.brokerName}`,
    `First seen: ${l.firstSeenISO}`,
  ].filter(Boolean);
  return parts.join(" | ");
}

