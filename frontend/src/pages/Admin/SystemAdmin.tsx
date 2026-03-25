import { useState } from 'react';
import { PageBreadcrumb, PageMeta, ComponentCard } from '../../components';
import { Modal } from '../../components/ui/modal';
import { useModal } from '../../hooks/useModal';
import AdminApi from '../../api/admin';
import Button from '../../components/ui/button/Button';
import { useAlert } from '../../context/AlertContext';

const COLLECTIONS: { key: string; label: string }[] = [
  { key: 'users', label: 'Usuarios' },
  { key: 'products', label: 'Productos' },
  { key: 'orders', label: 'Órdenes' },
  { key: 'tables', label: 'Mesas' },
  { key: 'stations', label: 'Estaciones' },
  { key: 'kdsdevices', label: 'KDS Devices' },
  { key: 'printers', label: 'Impresoras' },
  { key: 'orderevents', label: 'Eventos de orden' },
];

export default function SystemAdmin() {
  const alert = useAlert();
  const [busy, setBusy] = useState(false);
  const { isOpen, openModal, closeModal } = useModal();
  const [pending, setPending] = useState<{ type: 'clear' | 'tables'; payload?: any } | null>(null);

  const confirmClear = (collection: string) => {
    setPending({ type: 'clear', payload: { collection } });
    openModal();
  };

  const confirmResetTables = (opts?: any) => {
    setPending({ type: 'tables', payload: opts });
    openModal();
  };

  const runPending = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      if (pending.type === 'clear') {
        const { collection } = pending.payload;
        const res = await AdminApi.clearCollection(collection);
        alert.success(`Colección ${collection} limpiada (${res.deletedCount} documentos)`);
      } else if (pending.type === 'tables') {
        const res = await AdminApi.resetTables(pending.payload || {});
        alert.success(`Mesas reseteadas: ${res.updated ?? res.updatedCount ?? 0}`);
      }
    } catch (err: any) {
      const msg = err?.message ?? String(err ?? 'Error');
      alert.error(msg);
    } finally {
      setBusy(false);
      closeModal();
      setPending(null);
    }
  };

  return (
    <div className="mx-auto max-w-screen-lg px-4 py-6 sm:px-6 lg:px-8">
      <PageMeta title="Administración del sistema | mesaDigital" description="Herramientas de administración" />
      <PageBreadcrumb pageTitle="Herramientas administrativas" />

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <ComponentCard>
          <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white">Vaciar colecciones</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">Selecciona una colección y confirma para eliminar todos los documentos.</p>
          <div className="flex flex-col gap-2">
            {COLLECTIONS.map((c) => (
              <div key={c.key} className="flex items-center justify-between gap-4">
                <div className="font-medium text-gray-800 dark:text-gray-100">{c.label}</div>
                <Button
                  variant="outline"
                  size="sm"
                  className="dark:text-gray-200 dark:ring-gray-600 dark:bg-gray-800"
                  onClick={() => confirmClear(c.key)}
                  disabled={busy}
                >
                  Vaciar
                </Button>
              </div>
            ))}
          </div>
        </ComponentCard>

        <ComponentCard>
          <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white">Mesas</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">Acciones para desocupar mesas en caso de órdenes borradas o problemas.</p>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-800 dark:text-gray-100">Desocupar todas las mesas</div>
                <div className="text-xs text-gray-400 dark:text-gray-300">Forzar desocupación de todas las mesas que estén marcadas como ocupadas.</div>
              </div>
              <Button size="sm" variant="outline" className="dark:text-gray-200 dark:ring-gray-600 dark:bg-gray-800" onClick={() => confirmResetTables({ onlyIfOrderMissing: false })} disabled={busy}>Desocupar todas</Button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-800 dark:text-gray-100">Desocupar mesas con orden faltante</div>
                <div className="text-xs text-gray-400 dark:text-gray-300">Solo desocupa mesas cuyo `currentOrderId` apunta a una orden inexistente.</div>
              </div>
              <Button size="sm" variant="outline" className="dark:text-gray-200 dark:ring-gray-600 dark:bg-gray-800" onClick={() => confirmResetTables({ onlyIfOrderMissing: true })} disabled={busy}>Desocupar faltantes</Button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-800 dark:text-gray-100">Desocupar mesa específica</div>
                <div className="text-xs text-gray-400 dark:text-gray-300">Introduce el ID de la mesa y desocupa solo esa mesa.</div>
              </div>
              <TableResetBox onConfirm={(tableId) => confirmResetTables({ tableId })} disabled={busy} />
            </div>
          </div>
        </ComponentCard>
      </div>

      <Modal isOpen={isOpen} onClose={() => { closeModal(); setPending(null); }} className="max-w-lg p-6">
        <div>
          <h4 className="text-lg font-semibold">Confirmar acción</h4>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
            {pending?.type === 'clear'
              ? `Vas a vaciar la colección "${pending.payload.collection}". Esta acción es irreversible. ¿Deseas continuar?`
              : 'Vas a ejecutar la acción solicitada sobre las mesas. ¿Deseas continuar?'}
          </p>
          <div className="mt-4 flex justify-end gap-3">
            <Button variant="outline" className="dark:text-gray-200 dark:ring-gray-600 dark:bg-gray-800" onClick={() => { closeModal(); setPending(null); }} disabled={busy}>Cancelar</Button>
            <Button onClick={runPending} disabled={busy}>{busy ? 'Procesando...' : 'Confirmar'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function TableResetBox({ onConfirm, disabled }: { onConfirm: (tableId: string) => void; disabled?: boolean }) {
  const [val, setVal] = useState('');
  return (
    <div className="flex items-center gap-2">
      <input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder="ID de mesa"
        className="h-9 w-40 rounded-lg border border-gray-300 px-3 text-sm bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
      />
      <Button size="sm" onClick={() => onConfirm(val)} disabled={!val || disabled}>Desocupar</Button>
    </div>
  );
}
