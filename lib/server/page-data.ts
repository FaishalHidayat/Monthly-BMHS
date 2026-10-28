import "server-only";
import { getPeriodBundle } from "./periods";
import { getInsights } from "./insights";

export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Data standar halaman dashboard: periode terpilih, histori 3 periode, narasi. */
export async function loadPage(searchParams: SearchParams) {
  const sp = await searchParams;
  const id = Number(Array.isArray(sp.p) ? sp.p[0] : sp.p) || undefined;
  const { current, history } = await getPeriodBundle(id);
  const { map, sources } = await getInsights(history);
  return { current, history, insights: map, sources };
}
