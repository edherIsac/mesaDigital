import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import { PageBreadcrumb, PageMeta, ComponentCard } from '../../components';
import OrderService from '../Orders/Order.service';
import type { Order, Person } from '../../interfaces/Order.interface';

export default function CajaDetails() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const dynamicRef = useRef<HTMLDivElement | null>(null);
  const [dynamicHeight, setDynamicHeight] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!id) {
        setLoading(false);
        return;
      }
      try {
        const res = await OrderService.getOrder(id);
        if (!mounted) return;
        setOrder(res || null);
      } catch (err) {
        console.warn('Could not load order', err);
        setOrder(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [id]);

  useEffect(() => {
    const update = () => {
      if (!dynamicRef.current) return;
      const wrapperRect = dynamicRef.current.getBoundingClientRect();
      const avail = window.innerHeight - wrapperRect.top - 24;
      setDynamicHeight(avail > 0 ? Math.max(avail, 0) : 0);
    };
    update();
    window.addEventListener('resize', update);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    if (ro) ro.observe(document.body);
    return () => { window.removeEventListener('resize', update); if (ro) ro.disconnect(); };
  }, []);

  const computeTotals = (persons?: Person[]) => {
    if (!persons || persons.length === 0) return { subtotal: 0, taxes: 0, total: 0 };
    const subtotal = persons.reduce((sum, p) => sum + (p.orders || []).reduce((s, o) => s + ((o.unitPrice ?? o.price ?? 0) * (o.quantity ?? o.qty ?? 1)), 0), 0);
    const taxes = Math.round(subtotal * 0.16);
    const total = subtotal + taxes;
    return { subtotal, taxes, total };
  };

  if (loading) {
    return (
      <div>
        <PageMeta title="Caja — Detalle" description="Cargando orden..." />
        <PageBreadcrumb pageTitle="Caja / Detalle" />
        <div className="p-6">Cargando...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div>
        <PageMeta title="Caja — Detalle" description="Orden no encontrada" />
        <PageBreadcrumb pageTitle="Caja / Detalle" />
        <div className="p-6">
          <div className="text-gray-600">Orden no encontrada.</div>
          <button className="mt-4 px-3 py-2 bg-gray-100 rounded" onClick={() => navigate('/caja')}>Volver a Caja</button>
        </div>
      </div>
    );
  }

  const items: { name?: string; qty: number; price: number; person?: string }[] = [];
  if (order.people && Array.isArray(order.people)) {
    for (const p of order.people) {
      for (const it of p.orders || []) {
        items.push({ name: it.name, qty: it.quantity ?? it.qty ?? 1, price: it.unitPrice ?? it.price ?? 0, person: p.name });
      }
    }
  }

  const totals = computeTotals(order.people);

  return (
    <div>
      <PageMeta title={`Caja — ${order.tableLabel ?? order.tableId ?? 'Detalle'}`} description="Detalle de orden" />
      <PageBreadcrumb pageTitle={`Caja / ${order.tableLabel ?? order.tableId ?? 'Detalle'}`} />

      <div ref={dynamicRef} style={dynamicHeight ? { height: `${dynamicHeight}px` } : undefined} className="mt-4">
        <ComponentCard className="w-full h-full" noHeader fillHeight>
          <div className="h-full flex flex-col min-h-0">

            <div className="shrink-0 flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/[0.05]">
              <div>
                <h3 className="text-2xl font-semibold">Detalle — {order.tableLabel ?? order.tableId}</h3>
                <div className="text-sm text-gray-500">{(order.people || []).length} comensal{(order.people || []).length !== 1 ? 'es' : ''} • {order.placedAt ? new Date(String(order.placedAt)).toLocaleString() : ''}</div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => navigate('/caja')} className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Volver</button>
                <button onClick={() => console.log('Cobrar', order._id ?? order.id)} className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors">Cobrar</button>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-auto">
              <div className="max-w-2xl">
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700">Artículos</h4>
                  <div className="mt-3 space-y-3">
                    {items.map((it, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-800">{it.name} <span className="text-xs text-gray-400">{it.person ? `· ${it.person}` : ''}</span></div>
                          <div className="text-xs text-gray-500">x{it.qty}</div>
                        </div>
                        <div className="text-gray-800">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(it.price * it.qty)}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                    <div>Subtotal</div>
                    <div>{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(totals.subtotal)}</div>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                    <div>Impuestos (estimado)</div>
                    <div>{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(totals.taxes)}</div>
                  </div>
                  <div className="flex items-center justify-between text-lg font-semibold">
                    <div>Total</div>
                    <div>{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(totals.total)}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="shrink-0 flex items-center justify-between gap-4 border-t border-gray-100 dark:border-white/[0.05] pt-3 mt-1">
              <div>
                <div className="text-xs text-gray-400">Total orden</div>
                <div className="text-lg font-bold text-gray-800">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(totals.total)}</div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => navigate('/caja')} className="inline-flex items-center rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 bg-white hover:bg-red-50 transition-colors">Cancelar</button>
                <button onClick={() => console.log('Cobrar', order._id ?? order.id)} className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors">Cobrar</button>
              </div>
            </div>

          </div>
        </ComponentCard>
      </div>
    </div>
  );
}
