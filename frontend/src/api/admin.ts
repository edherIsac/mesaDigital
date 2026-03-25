import api from './client';

export async function clearCollection(collection: string) {
  const res = await api.post('/admin/db/clear', { collection });
  return res.data;
}

export async function resetTables(body: { tableId?: string; onlyIfOrderMissing?: boolean } = {}) {
  const res = await api.post('/admin/tables/reset', body);
  return res.data;
}

const AdminApi = { clearCollection, resetTables };
export default AdminApi;
