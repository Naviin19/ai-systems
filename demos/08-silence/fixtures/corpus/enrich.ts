export async function enrich(raw: string) {
  const { data, error } = await client.from('cache').upsert({ raw });
  if (error) console.warn(error);
  return data;
}
declare const client: any;
