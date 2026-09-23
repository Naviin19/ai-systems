export async function grade(text: string) {
  try { return await judge(text); } catch { return null; }
}
declare function judge(t: string): Promise<number>;
