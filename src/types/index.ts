export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'COMMERCIALE' | 'MAGAZZINO' | 'CUSTOMER';
export type AppRole = Role | 'OPERATOR';
export type DestinazioneTipo = 'BOTTEGA' | 'EMPORIO' | 'DISTRETTO' | 'STORE' | 'OUTLET' | 'TENDONE' | 'FIERA' | 'ONLINE' | 'ALTRO';
/** @deprecated use DestinazioneTipo */
export type CanaleTipo = DestinazioneTipo;

export type OrderStatus =
  | 'MERCE_DA_ORDINARE'
  | 'MERCE_ORDINATA'
  | 'MERCE_PARZIALMENTE_PRONTA'
  | 'MERCE_PRONTA_DA_AVVISARE'
  | 'MERCE_PRONTA_AVVISATO'
  | 'ESPORTATO'
  | 'ANNULLATO';

export interface Collection {
  id: string;
  name: string;
  slug: string;
  season: string;
  year: number;
  isActive: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  order: number;
  collectionId: string | null;
  children?: Category[];
}

export interface Product {
  id: string;
  code: string;
  name: string;
  description: string | null;
  costPrice: number;
  retailPrice: number;
  lotSize: number;
  imageUrl: string | null;
  imageUrl2: string | null;
  imageUrl3: string | null;
  imageUrl4: string | null;
  imageUrl5: string | null;
  notes: string | null;
  categoryId: string | null;
  collectionId: string | null;
  isActive: boolean;
  stock: number | null;
  famiglia: string | null;
  sottofamiglia: string | null;
  colore: string | null;
  colore2: string | null;
  colore3: string | null;
  nomLinea: string | null;
  misura: string | null;
  produttore: string | null;
  gruppoMerceologico: string | null;
  classe: string | null;
  classe2: string | null;
  sottoclasse: string | null;
  sottoclasse2: string | null;
  gruppoOmogeneo: string | null;
  gruppoOmogeneo2: string | null;
  stagione: string | null;
  temaColore: string | null;
  temaColore2: string | null;
  temaColore3: string | null;
  temaColore4: string | null;
  temaColore5: string | null;
  fasciaRicarico: string | null;
  fasciaSconto: number | null;
  collezione: string | null;
  tranche: string | null;
  paese: string | null;
  iva: number;
  descrizioneEn: string | null;
  descrizioneDe: string | null;
  descrizioneFr: string | null;
  descrizioneEs: string | null;
  modello: string | null;
  taglia: string | null;
  bloccoColore: string | null;
  costoIeConReso: number | null;
  costoIeSenzaReso: number | null;
  colorBlockIds: number[];
  conferente: string | null;
  materiale1: string | null;
  materiale2: string | null;
  materiale3: string | null;
  composizione: string | null;
  certificazione1: string | null;
  certificazione2: string | null;
  certificazione3: string | null;
  fantasia: string | null;
  lavorazione: string | null;
  dettaglio: string | null;
  materialeBottoni: string | null;
  nomeStampa: string | null;
  materiale1Bio: boolean;
  materiale2Bio: boolean;
  materiale3Bio: boolean;
  isContinuativo: boolean;
  cataloghi: string[];
  pantoneColors: ProductPantoneEntry[];
  sizeVariants: Array<{ taglia: string; codice: string }> | null;
  createdAt: string;
  category?: Category | null;
}

export interface ProductPantoneEntry {
  pantoneColorId: number;
  code: string;
  name: string;
  hex_code: string;
  system_type: string;
  sortOrder: number;
  isPrimary: boolean;
  isAutoFilled: boolean;
}

export type TipoElementoParete = 'barra' | 'mensola' | 'frontale';
export type DimensioneMensola = 'piccola' | 'media' | 'lunga';
export type DimensioneBarra = 'piccola' | 'media' | 'grande';
export type TipoCapo = 'top' | 'bottom' | 'abito' | 'capospalla' | 'borsa' | 'accessorio' | 'altro';

export interface PezzoParete {
  taglia: string;
}

export interface ItemParete {
  id: string;
  tipo: TipoCapo;
  productId?: string;
  productCode?: string;
  productName?: string;
  imageUrl?: string;
  continuativoId?: string; // prodotto continuativo del cliente (non catalogo)
  coloreHex?: string;
  pezzi: PezzoParete[];
  availableTaglie?: string[]; // from product sizeVariants; undefined = all sizes selectable
  offsetX?: number; // horizontal drag offset within mensola
  photoScale?: number;   // frontale photo zoom (1–3)
  photoOffsetX?: number; // frontale photo pan X in px (visual space)
  photoOffsetY?: number; // frontale photo pan Y in px (visual space)
}

export type PosizioneMensola = 'sopra' | 'sotto' | 'fianco';

export interface MensolaInlineConfig {
  dimensione: DimensioneMensola;
  items: ItemParete[];
  offsetX?: number;
  posizione?: PosizioneMensola;
}

export interface ElementoParete {
  id: string;
  tipo: TipoElementoParete;
  dimensione?: DimensioneMensola | DimensioneBarra;
  items: ItemParete[];
  mensole?: MensolaInlineConfig[]; // array of shelves (replaces mensolaTop)
  /** @deprecated use mensole[0] */
  mensolaTop?: MensolaInlineConfig;
  offsetX?: number;
  offsetY?: number;
}

export interface PareteAttrezzata {
  id: string;
  nome: string;
  collezione: string;
  ordine: number;
  configurazione: ElementoParete[];
  sourceOrderId: string | null;
  sourceCartId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClassificazioneValore {
  id: string;
  tipo: string;
  nome: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  companyName: string;
  customerCode: string;
  email: string;
  isActive: boolean;
  role: Role;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  vatNumber: string | null;
  createdAt: string;
}

// ─── New client hierarchy ─────────────────────────────────────────────────────

export interface Organization {
  id: string;
  nome: string;
  createdAt: string;
  _count?: { operatori: number; canali: number; ordini: number };
  operatori?: Operator[];
  destinazioni?: Destinazione[];
}

export interface Operator {
  id: string;
  nome: string;
  cognome: string;
  email: string;
  telefono: string | null;
  ruolo: string | null;
  organizationId: string;
  attivo: boolean;
  featureMondiEspositivi: boolean;
  createdAt: string;
  organization?: { nome: string };
}

// ─── Mondi Espositivi ─────────────────────────────────────────────────────────

export interface DisplayGroupItem {
  id: string;
  groupId: string;
  orderItemId: string;
  nota: string | null;
  posizione: number;
  isFocus: boolean;
  livello: number;
  orderItem: OrderItem;
}

export interface SpazioEspositivo {
  id: string;
  operatorId: string;
  nome: string;
  posizione: number;
  createdAt: string;
}

export interface DisplayGroupSchedule {
  id: string;
  groupId: string;
  spazioId: string | null;
  anno: number;
  settimanaIn: number;
  settimanaFn: number;
  nota: string | null;
}

export interface DisplayGroup {
  id: string;
  orderId: string;
  nome: string;
  descrizione: string | null;
  coloreTag: string | null;
  stagione: string | null;
  temaTag: string | null;
  posizione: number;
  nomiLivelli: string | null;
  hasFocusCard: boolean;
  createdAt: string;
  prodotti: DisplayGroupItem[];
  schedules?: DisplayGroupSchedule[];
}

export interface DisplayGroupPreset {
  id: string;
  operatorId: string;
  nome: string;
  descrizione: string | null;
  coloreTag: string | null;
  temaTag: string | null;
  createdAt: string;
}

export interface Destinazione {
  id: string;
  nome: string;
  tipo: DestinazioneTipo;
  citta: string | null;
  indirizzo: string | null;
  budget: number | null;
  organizationId: string;
  createdAt: string;
  organization?: { nome: string };
  _count?: { ordini: number };
}
/** @deprecated use Destinazione */
export type Canale = Destinazione;

// ─── Orders ───────────────────────────────────────────────────────────────────

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  taglia: string;
  quantity: number;
  mercePronta: number;
  unitPrice: number;
  subtotal: number;
  product?: Product;
}

export interface Order {
  id: string;
  orderNumber: string | null;
  customerId: string | null;
  organizationId: string | null;
  canaleId: string | null;
  operatorId: string | null;
  collectionId: string | null;
  status: OrderStatus;
  totalValue: number;
  totalItems: number;
  notes: string | null;
  budgetPersonalizzato: number | null;
  budgetNota: string | null;
  budgetConferenti: Record<string, number> | null;
  budgetFamiglie: Record<string, number> | null;
  createdAt: string;
  confirmedAt: string | null;
  customer?: Customer;
  organization?: Organization;
  operator?: Pick<Operator, 'id' | 'nome' | 'cognome' | 'email'>;
  destinazione?: Destinazione;
  /** @deprecated use destinazione */
  canale?: Destinazione;
  items?: OrderItem[];
}

// ─── Cart ─────────────────────────────────────────────────────────────────────

export interface CartItem {
  productId: string;
  product: Product;
  quantity: number;
  taglia?: string;
}

export type CartStatus = 'DRAFT' | 'CONVERTED';

export interface Cart {
  id: string;
  name: string;
  collectionId: string;
  status: CartStatus;
  customerId: string | null;
  operatorId: string | null;
  notes: string | null;
  canaleId: string | null;
  budgetPersonalizzato: number | null;
  budgetConferenti: Record<string, number> | null;
  canale?: Destinazione | null;
  createdAt: string;
  updatedAt: string;
  items: CartItem[];
  _count?: { items: number };
}

export interface CartState {
  items: CartItem[];
  customerId: string | null;
  collectionId: string | null;
  notes: string;
}

// ─── API response types ───────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── Import types ─────────────────────────────────────────────────────────────

export interface ImportRow {
  code: string;
  name: string;
  description?: string;
  category?: string;
  costPrice: number;
  retailPrice: number;
  lotSize?: number;
  notes?: string;
  imageUrl?: string;
}

export interface ImportResult {
  success: number;
  errors: Array<{ row: number; message: string; data?: ImportRow }>;
  total: number;
}

// ─── Session extensions ───────────────────────────────────────────────────────

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      role: AppRole;
      companyName: string;
      customerCode: string;
      // Operator-specific fields
      organizationId?: string;
      destinazioneId?: string;
      destinazioneName?: string;
      featureMondiEspositivi?: boolean;
      canAccessVisual?: boolean;
      isMeridiano361?: boolean;
    };
  }

  interface User {
    id: string;
    email: string;
    role: AppRole;
    companyName: string;
    customerCode: string;
    isActive?: boolean;
    organizationId?: string;
    destinazioneId?: string;
    destinazioneName?: string;
    featureMondiEspositivi?: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: AppRole;
    companyName: string;
    customerCode: string;
    organizationId?: string;
    destinazioneId?: string;
    destinazioneName?: string;
    featureMondiEspositivi?: boolean;
    canAccessVisual?: boolean;
    isMeridiano361?: boolean;
  }
}
