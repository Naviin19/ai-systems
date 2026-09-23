// KNOWN POSITIVE for unchecked-db-write. This file exists to be caught.
// The write below resolves with { data, error } and nobody reads error.
export async function markDelivered(db: any, id: string) {
  await db.from('deliveries').update({ delivered: true }).eq('id', id);
}
