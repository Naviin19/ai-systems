export async function deliver(db: any, id: string) {
  const { error } = await db.from('books').update({ status: 'sent' }).eq('id', id);
  if (error) throw error;
  await db.from('audit').insert({ book: id, at: Date.now() });
}
