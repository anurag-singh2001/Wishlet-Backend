export type FestivalStatus = "off" | "scheduled" | "live" | "ended";

export interface FestivalLike {
  id: string;
  enabled: boolean;
  festiveLook: boolean;
  startsAt: string | null;
  endsAt: string | null;
}

/** off = unpublished; an open-ended start or end counts as unbounded. */
export function festivalStatus(
  f: Pick<FestivalLike, "enabled" | "startsAt" | "endsAt">,
  now: Date,
): FestivalStatus {
  if (!f.enabled) return "off";
  const t = now.getTime();
  if (f.startsAt && t < Date.parse(f.startsAt)) return "scheduled";
  if (f.endsAt && t > Date.parse(f.endsAt)) return "ended";
  return "live";
}

/** Id of the live festival with festiveLook whose start is latest (unbounded start = oldest). */
export function pickActiveFestival(festivals: FestivalLike[], now: Date): string | null {
  const start = (f: FestivalLike): number => (f.startsAt ? Date.parse(f.startsAt) : -Infinity);
  const live = festivals.filter((f) => f.festiveLook && festivalStatus(f, now) === "live");
  live.sort((a, b) => start(b) - start(a));
  return live[0]?.id ?? null;
}
