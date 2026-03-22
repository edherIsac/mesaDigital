import React, { useState } from "react";
import { useAlert } from "../context/AlertContext";

const AlertDemo: React.FC = () => {
  const alert = useAlert();
  const [lastId, setLastId] = useState<string | null>(null);

  const handleSuccess = () => alert.success("Operación completada correctamente.", "Éxito");
  const handleError = () => alert.error("Ocurrió un error inesperado.", "Error");
  const handleInfo = () => alert.info("Este es un mensaje informativo.", "Info");
  const handleWarning = () => alert.warning("Ten cuidado con esta acción.", "Advertencia");

  const handleShow = () => alert.show("default", "Mensaje genérico desde AlertDemo.", "Atención");

  const handlePersistent = () => {
    const id = alert.show("info", "Este toast es persistente hasta que lo cierres.", "Persistente", null);
    setLastId(id);
  };

  const handleWithAction = () => {
    alert.show(
      "info",
      "Mensaje con acción: deshacer o confirmar.",
      "Acción",
      null,
      [
        { label: "Deshacer", onClick: () => alert.info("Deshecho"), variant: 'secondary' },
        { label: "Confirmar", onClick: () => alert.success("Confirmado"), variant: 'primary' },
      ],
    );
  };

  const handleDismiss = () => {
    if (lastId) {
      alert.dismiss(lastId);
      setLastId(null);
    }
  };

  const handleConfirm = async () => {
    const ok = await alert.confirm("¿Seguro que quieres continuar?");
    if (ok) alert.success("Acción confirmada");
    else alert.info("Acción cancelada");
  };

  const handleConfirmCustom = async () => {
    const ok = await alert.confirm("¿Eliminar elemento? Esta acción no se puede deshacer.", {
      title: "Confirmar eliminación",
      confirmLabel: "Sí, eliminar",
      cancelLabel: "No, volver",
    });
    if (ok) alert.success("Elemento eliminado");
    else alert.warning("No se eliminó el elemento");
  };

  return (
    <div className="rounded-lg border border-gray-100 dark:border-white/[0.04] p-4 bg-white dark:bg-gray-900 mb-4">
      <h4 className="text-sm font-semibold mb-2 text-gray-800 dark:text-white/90">Alert demo (temporal)</h4>
      <div className="flex flex-wrap gap-2">
        <button onClick={handleSuccess} className="px-3 py-1.5 rounded bg-green-600 text-white text-sm">Success</button>
        <button onClick={handleError} className="px-3 py-1.5 rounded bg-red-600 text-white text-sm">Error</button>
        <button onClick={handleInfo} className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm">Info</button>
        <button onClick={handleWarning} className="px-3 py-1.5 rounded bg-yellow-500 text-white text-sm">Warning</button>
        <button onClick={handleShow} className="px-3 py-1.5 rounded border text-sm">Show(default)</button>
        <button onClick={handlePersistent} className="px-3 py-1.5 rounded border text-sm">Show(persist)</button>
        <button onClick={handleWithAction} className="px-3 py-1.5 rounded border text-sm">Show(with action)</button>
        <button onClick={handleDismiss} className="px-3 py-1.5 rounded border text-sm" disabled={!lastId}>Dismiss</button>
        <button onClick={handleConfirm} className="px-3 py-1.5 rounded bg-brand-500 text-white text-sm">Confirm</button>
        <button onClick={handleConfirmCustom} className="px-3 py-1.5 rounded bg-red-600 text-white text-sm">Confirm (custom)</button>
      </div>
    </div>
  );
};

export default AlertDemo;
