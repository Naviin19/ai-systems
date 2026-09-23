// KNOWN POSITIVE for paid-call-without-run-marker. This file exists to be caught.
export async function score(text: string) {
  try { return await callModel(text); } catch { return null; }
}
declare function callModel(t: string): Promise<number>;
