// Interfaces unificadas para órdenes / KDS / StartOrder
// Estas interfaces combinan las formas de respuesta del backend
// y las estructuras usadas en la UI (Comanda / KDS).

export interface Modifier {
	priceAdjust?: number;
	qty?: number;
	name?: string;
}

export interface OrderItem {
	_id?: string;
	id?: string | number;
	// referencias al catálogo (puede llamarse menuItemId o productId en distintos módulos)
	menuItemId?: string;
	productId?: string;
	name?: string;
	quantity?: number;
	qty?: number;
	unitPrice?: number;
	price?: number;
	notes?: string;
	note?: string;
	status?: string;
	modifiers?: Modifier[];
	assignedTo?: string;
	coverImage?: string | null;
	type?: string;
	// referencia opcional al producto (cuando se carga desde catálogo)
	product?: unknown | null;
}

export interface Person {
	id?: string | number;
	name?: string;
	seat?: number;
	orders?: OrderItem[];
}

export interface Order {
	_id?: string;
	id?: string | number;
	orderNumber?: string;
	status?: string;
	tableId?: string | null;
	tableLabel?: string | null;
	locationId?: string | null;
	placedAt?: string | Date | null;
	people?: Person[];
	notes?: string;
	createdAt?: string;
	updatedAt?: string;
	metadata?: Record<string, unknown>;
}

// Tipos específicos para KDS (extienden OrderItem)
export interface KDSItem extends OrderItem {
	orderId?: string;
	orderNumber?: string;
	tableId?: string | null;
	tableLabel?: string | null;
	placedAt?: string | Date | null;
	personName?: string;
	_order?: Order;
}

export interface AggregatedKDSItem extends KDSItem {
	_ids: string[];
	quantity: number;
}

export interface KDSGroup {
	orderId: string;
	orderNumber?: string;
	tableId?: string | null;
	tableLabel?: string | null;
	placedAt?: string | Date | null;
	items: AggregatedKDSItem[];
}

export default {} as unknown;

