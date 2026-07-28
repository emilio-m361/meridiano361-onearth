// Pure TypeScript — no 'use client', safe to import in Server Components

export interface AppSettingsData {
  home: {
    titolo1: string;
    titolo1Maiuscolo: boolean;
    titolo1Colore: string;
    titolo1Size: number;
    titolo1Font: string;
    titolo1Weight: string;
    titolo1LineHeight: number;
    titolo1LetterSpacing: number;
    titolo1Transform: string;
    titolo2: string;
    titolo2Colore: string;
    titolo2Size: number;
    titolo2Font: string;
    titolo2Weight: string;
    titolo2LineHeight: number;
    titolo2LetterSpacing: number;
    titolo2Transform: string;
    cta: string;
    scrollAttivo: boolean;
    scrollNumero: number;
    scrollCollezione: string;
    editorialAttivo: boolean;
    editorialUrl: string;
    editorialCaption: string;
    layoutCard: string;
  };
  social: {
    ordine: string[];
    items: Record<string, { visibile: boolean; url: string }>;
  };
  menu: {
    ordine: string[];
    items: Record<string, { label: string; visibile: boolean }>;
  };
  scheda: {
    codice: boolean;
    descrizione: boolean;
    produttore: boolean;
    paese: boolean;
    misure: boolean;
    linea: boolean;
    collezione: boolean;
    colore: boolean;
    temaColore: boolean;
    confezione: boolean;
    iva: boolean;
    prezzoCosto: boolean;
    pvp: boolean;
    fasciaSconto: boolean;
    fasciaRicarico: boolean;
    margine: boolean;
    guadagnoPotenziale: boolean;
    note: boolean;
  };
  card: {
    codice: boolean;
    prezzoCosto: boolean;
    pvp: boolean;
    aggiungi: boolean;
    badgeNuovo: boolean;
    cuoricino: boolean;
  };
  colori: {
    sfondo: string;
    pulsanti: string;
    testoPulsanti: string;
    testo: string;
  };
  login: {
    sfondoUrl: string;
    caption: string;
    claim: string;
  };
  ordine: {
    mostraBudget: boolean;
    mostraCosto: boolean;
    mostraVendite: boolean;
    mostraGuadagno: boolean;
    mostraMargine: boolean;
    mostraRimanente: boolean;
  };
  comunicazione: {
    attivo: boolean;
    titolo: string;
    testo: string;
    colore: string;
    posizione: string;
    font: string;
    fontSizeTitolo: number;
    fontSizeTesto: number;
    pesoTitolo: string;
    pesoTesto: string;
    allineamento: string;
    trasformazione: string;
    corsivoTitolo: boolean;
    corsivoTesto: boolean;
    sfondo: string;
    coloreTesto: string;
    coloreTitolo: string;
    bordo: string;
    coloreBordo: string;
    raggio: number;
    ombra: string;
    padding: number;
    larghezza: string;
    mostraIcona: boolean;
    icona: string;
    posizioneIcona: string;
    chiudibile: boolean;
    soloUnaVolta: boolean;
    scadenza: string;
  };
  comunicazione2: {
    attivo: boolean;
    titolo: string;
    testo: string;
    colore: string;
    posizione: string;
    font: string;
    fontSizeTitolo: number;
    fontSizeTesto: number;
    pesoTitolo: string;
    pesoTesto: string;
    allineamento: string;
    trasformazione: string;
    corsivoTitolo: boolean;
    corsivoTesto: boolean;
    sfondo: string;
    coloreTesto: string;
    coloreTitolo: string;
    bordo: string;
    coloreBordo: string;
    raggio: number;
    ombra: string;
    padding: number;
    larghezza: string;
    mostraIcona: boolean;
    icona: string;
    posizioneIcona: string;
    chiudibile: boolean;
    soloUnaVolta: boolean;
    scadenza: string;
  };
  collections: {
    moda: { bookingDeadline: string };
    casa: { bookingDeadline: string };
    lista: Array<{
      id: string;
      titolo: string;
      sottotitolo: string;
      fotoUrl: string;
      dataInizio: string;
      dataScadenza: string;
      dataFine: string;
      scrollAttivo: boolean;
      visibile?: boolean;
      fotoFiltro?: string; // 'auto' | 'colore' | 'biancoNero'
    }>;
  };
}

export const SOCIAL_KEYS = ['instagram', 'facebook', 'pinterest', 'tiktok', 'website', 'podcast'] as const;
export type SocialKey = (typeof SOCIAL_KEYS)[number];

export const DEFAULT_SOCIAL_URLS: Record<string, string> = {
  instagram: 'https://www.instagram.com/onearth_official/',
  facebook:  'https://www.facebook.com/onearthofficial/',
  pinterest: 'https://it.pinterest.com/OnEarth_official/',
  tiktok:    'https://www.tiktok.com/@onearth_official',
  website:   'https://www.on-earth.it',
  podcast:   'https://open.spotify.com/show/3MjWJeGlQFAy2D2D2awo4t',
};

export const DEFAULT_APP_SETTINGS: AppSettingsData = {
  home: {
    titolo1: 'TERRA E LUCE',
    titolo1Maiuscolo: true,
    titolo1Colore: '#1C1C1C',
    titolo1Size: 28,
    titolo1Font: 'system',
    titolo1Weight: 'light',
    titolo1LineHeight: 1.25,
    titolo1LetterSpacing: 2,
    titolo1Transform: 'uppercase',
    titolo2: 'Scopri la collezione casa 2027',
    titolo2Colore: '#1C1C1C',
    titolo2Size: 16,
    titolo2Font: 'system',
    titolo2Weight: 'light',
    titolo2LineHeight: 1.25,
    titolo2LetterSpacing: 1,
    titolo2Transform: 'none',
    cta: 'Apri il catalogo e crea un ordine',
    scrollAttivo: true,
    scrollNumero: 6,
    scrollCollezione: 'CA27',
    editorialAttivo: false,
    editorialUrl: '',
    editorialCaption: '',
    layoutCard: 'griglia',
  },
  social: {
    ordine: [...SOCIAL_KEYS],
    items: Object.fromEntries(
      SOCIAL_KEYS.map((k) => [k, { visibile: true, url: DEFAULT_SOCIAL_URLS[k] }])
    ),
  },
  menu: {
    ordine: ['catalogo', 'preferiti', 'carrelli', 'ordini', 'assistenza'],
    items: {
      catalogo: { label: 'Catalogo', visibile: true },
      preferiti: { label: 'Preferiti', visibile: true },
      carrelli: { label: 'Carrelli', visibile: true },
      ordini: { label: 'Ordini', visibile: true },
      assistenza: { label: 'Assistenza', visibile: true },
    },
  },
  scheda: {
    codice: true,
    descrizione: true,
    produttore: true,
    paese: true,
    misure: true,
    linea: true,
    collezione: true,
    colore: true,
    temaColore: true,
    confezione: true,
    iva: false,
    prezzoCosto: true,
    pvp: true,
    fasciaSconto: false,
    fasciaRicarico: false,
    margine: false,
    guadagnoPotenziale: true,
    note: false,
  },
  ordine: {
    mostraBudget: true,
    mostraCosto: true,
    mostraVendite: true,
    mostraGuadagno: false,
    mostraMargine: true,
    mostraRimanente: true,
  },
  card: {
    codice: true,
    prezzoCosto: true,
    pvp: true,
    aggiungi: true,
    badgeNuovo: true,
    cuoricino: true,
  },
  colori: {
    sfondo: '#F5F0EA',
    pulsanti: '#000000',
    testoPulsanti: '#FFFFFF',
    testo: '#000000',
  },
  login: {
    sfondoUrl: '',
    caption: 'Collezione CASA 2027',
    claim: 'C\'è un mondo da scoprire.',
  },
  comunicazione: {
    attivo: false,
    titolo: '',
    testo: '',
    colore: '#C17A5A',
    posizione: 'after-cta',
    font: 'system',
    fontSizeTitolo: 15,
    fontSizeTesto: 13,
    pesoTitolo: 'semibold',
    pesoTesto: 'normal',
    allineamento: 'left',
    trasformazione: 'none',
    corsivoTitolo: false,
    corsivoTesto: false,
    sfondo: '#FFFBEB',
    coloreTesto: '#374151',
    coloreTitolo: '#111827',
    bordo: 'thin',
    coloreBordo: '#C17A5A',
    raggio: 12,
    ombra: 'none',
    padding: 16,
    larghezza: 'full',
    mostraIcona: false,
    icona: '📢',
    posizioneIcona: 'before',
    chiudibile: false,
    soloUnaVolta: false,
    scadenza: '',
  },
  comunicazione2: {
    attivo: false,
    titolo: '',
    testo: '',
    colore: '#C17A5A',
    posizione: 'bottom',
    font: 'system',
    fontSizeTitolo: 15,
    fontSizeTesto: 13,
    pesoTitolo: 'semibold',
    pesoTesto: 'normal',
    allineamento: 'left',
    trasformazione: 'none',
    corsivoTitolo: false,
    corsivoTesto: false,
    sfondo: '#EFF6FF',
    coloreTesto: '#374151',
    coloreTitolo: '#111827',
    bordo: 'thin',
    coloreBordo: '#3B82F6',
    raggio: 12,
    ombra: 'none',
    padding: 16,
    larghezza: 'full',
    mostraIcona: false,
    icona: '📢',
    posizioneIcona: 'before',
    chiudibile: false,
    soloUnaVolta: false,
    scadenza: '',
  },
  collections: {
    moda: { bookingDeadline: '' },
    casa: { bookingDeadline: '' },
    lista: [
      { id: 'casa', titolo: 'Casa 2027', sottotitolo: '', fotoUrl: '', dataInizio: '', dataScadenza: '', dataFine: '', scrollAttivo: true },
      { id: 'moda', titolo: 'Moda PE27', sottotitolo: '', fotoUrl: '', dataInizio: '', dataScadenza: '', dataFine: '', scrollAttivo: true },
      { id: 'collezione-home', titolo: 'Collezione Home', sottotitolo: '', fotoUrl: '', dataInizio: '', dataScadenza: '', dataFine: '', scrollAttivo: true, visibile: true },
    ],
  },
};

export function parseSettingsFromDb(records: { chiave: string; valore: string }[]): AppSettingsData {
  const m = Object.fromEntries(records.map((r) => [r.chiave, r.valore]));
  const str = (k: string, d: string) => m[k] ?? d;
  const bool = (k: string, d: boolean) => (m[k] === undefined ? d : m[k] === 'true');
  const num = (k: string, d: number) => (m[k] ? Number(m[k]) : d);

  const MENU_KEYS = ['catalogo', 'preferiti', 'carrelli', 'ordini', 'assistenza'];
  const MENU_LABELS: Record<string, string> = {
    catalogo: 'Catalogo', preferiti: 'Preferiti', carrelli: 'Carrelli',
    ordini: 'Ordini', assistenza: 'Assistenza',
  };
  let ordine = MENU_KEYS;
  try {
    const raw = m['menu.ordine'];
    if (raw) {
      const stored: string[] = JSON.parse(raw);
      // Always append any MENU_KEYS not yet in the stored order (forward-compatibility)
      const missing = MENU_KEYS.filter((k) => !stored.includes(k));
      ordine = missing.length > 0 ? [...stored, ...missing] : stored;
    }
  } catch { /* keep default */ }

  let socialOrdine = [...SOCIAL_KEYS] as string[];
  try {
    const raw = m['social.ordine'];
    if (raw) socialOrdine = JSON.parse(raw);
  } catch { /* keep default */ }

  return {
    home: {
      titolo1: str('home.titolo1', 'TERRA E LUCE'),
      titolo1Maiuscolo: bool('home.titolo1.maiuscolo', true),
      titolo1Colore: str('home.titolo1.colore', '#1C1C1C'),
      titolo1Size: num('home.titolo1.size', 28),
      titolo1Font: str('home.titolo1.font', 'system'),
      titolo1Weight: str('home.titolo1.weight', 'light'),
      titolo1LineHeight: num('home.titolo1.lineHeight', 1.25),
      titolo1LetterSpacing: num('home.titolo1.letterSpacing', 2),
      titolo1Transform: str('home.titolo1.transform', 'uppercase'),
      titolo2: str('home.titolo2', 'Scopri la collezione casa 2027'),
      titolo2Colore: str('home.titolo2.colore', '#1C1C1C'),
      titolo2Size: num('home.titolo2.size', 16),
      titolo2Font: str('home.titolo2.font', 'system'),
      titolo2Weight: str('home.titolo2.weight', 'light'),
      titolo2LineHeight: num('home.titolo2.lineHeight', 1.25),
      titolo2LetterSpacing: num('home.titolo2.letterSpacing', 1),
      titolo2Transform: str('home.titolo2.transform', 'none'),
      cta: str('home.cta', 'Apri il catalogo e crea un ordine'),
      scrollAttivo: bool('home.scrollAttivo', true),
      scrollNumero: num('home.scrollNumero', 6),
      scrollCollezione: str('home.scrollCollezione', 'CA27'),
      editorialAttivo: bool('home.editorialAttivo', false),
      editorialUrl: str('home.editorialUrl', ''),
      editorialCaption: str('home.editorialCaption', ''),
      layoutCard: str('home.layoutCard', 'griglia'),
    },
    social: {
      ordine: socialOrdine,
      items: Object.fromEntries(
        SOCIAL_KEYS.map((k) => [
          k,
          {
            visibile: bool(`social.${k}.visibile`, true),
            url: str(`social.${k}.url`, DEFAULT_SOCIAL_URLS[k]),
          },
        ])
      ),
    },
    menu: {
      ordine,
      items: Object.fromEntries(
        MENU_KEYS.map((k) => [
          k,
          {
            label: str(`menu.${k}.label`, MENU_LABELS[k] ?? k),
            visibile: bool(`menu.${k}.visibile`, true),
          },
        ])
      ),
    },
    scheda: {
      codice: bool('scheda.codice', true),
      descrizione: bool('scheda.descrizione', true),
      produttore: bool('scheda.produttore', true),
      paese: bool('scheda.paese', true),
      misure: bool('scheda.misure', true),
      linea: bool('scheda.linea', true),
      collezione: bool('scheda.collezione', true),
      colore: bool('scheda.colore', true),
      temaColore: bool('scheda.temaColore', true),
      confezione: bool('scheda.confezione', true),
      iva: bool('scheda.iva', false),
      prezzoCosto: bool('scheda.prezzoCosto', true),
      pvp: bool('scheda.pvp', true),
      fasciaSconto: bool('scheda.fasciaSconto', false),
      fasciaRicarico: bool('scheda.fasciaRicarico', false),
      margine: bool('scheda.margine', false),
      guadagnoPotenziale: bool('scheda.guadagnoPotenziale', true),
      note: bool('scheda.note', false),
    },
    card: {
      codice: bool('card.codice', true),
      prezzoCosto: bool('card.prezzoCosto', true),
      pvp: bool('card.pvp', true),
      aggiungi: bool('card.aggiungi', true),
      badgeNuovo: bool('card.badgeNuovo', true),
      cuoricino: bool('card.cuoricino', true),
    },
    colori: {
      sfondo: str('colori.sfondo', '#F5F0EA'),
      pulsanti: str('colori.pulsanti', '#000000'),
      testoPulsanti: str('colori.testoPulsanti', '#FFFFFF'),
      testo: str('colori.testo', '#000000'),
    },
    login: {
      sfondoUrl: str('login.sfondoUrl', ''),
      caption: str('login.caption', 'Collezione CASA 2027'),
      claim: str('login.claim', 'C\'è un mondo da scoprire.'),
    },
    ordine: {
      mostraBudget:   bool('ordine.mostraBudget',   true),
      mostraCosto:    bool('ordine.mostraCosto',     true),
      mostraVendite:  bool('ordine.mostraVendite',   true),
      mostraGuadagno: bool('ordine.mostraGuadagno',  false),
      mostraMargine:  bool('ordine.mostraMargine',   true),
      mostraRimanente:bool('ordine.mostraRimanente', true),
    },
    comunicazione: {
      attivo:          bool('comunicazione.attivo',          false),
      titolo:          str('comunicazione.titolo',           ''),
      testo:           str('comunicazione.testo',            ''),
      colore:          str('comunicazione.colore',           '#C17A5A'),
      posizione:       str('comunicazione.posizione',        'after-cta'),
      font:            str('comunicazione.font',             'system'),
      fontSizeTitolo:  num('comunicazione.fontSizeTitolo',   15),
      fontSizeTesto:   num('comunicazione.fontSizeTesto',    13),
      pesoTitolo:      str('comunicazione.pesoTitolo',       'semibold'),
      pesoTesto:       str('comunicazione.pesoTesto',        'normal'),
      allineamento:    str('comunicazione.allineamento',     'left'),
      trasformazione:  str('comunicazione.trasformazione',   'none'),
      corsivoTitolo:   bool('comunicazione.corsivoTitolo',   false),
      corsivoTesto:    bool('comunicazione.corsivoTesto',    false),
      sfondo:          str('comunicazione.sfondo',           '#FFFBEB'),
      coloreTesto:     str('comunicazione.coloreTesto',      '#374151'),
      coloreTitolo:    str('comunicazione.coloreTitolo',     '#111827'),
      bordo:           str('comunicazione.bordo',            'thin'),
      coloreBordo:     str('comunicazione.coloreBordo',      '#C17A5A'),
      raggio:          num('comunicazione.raggio',           12),
      ombra:           str('comunicazione.ombra',            'none'),
      padding:         num('comunicazione.padding',          16),
      larghezza:       str('comunicazione.larghezza',        'full'),
      mostraIcona:     bool('comunicazione.mostraIcona',     false),
      icona:           str('comunicazione.icona',            '📢'),
      posizioneIcona:  str('comunicazione.posizioneIcona',   'before'),
      chiudibile:      bool('comunicazione.chiudibile',      false),
      soloUnaVolta:    bool('comunicazione.soloUnaVolta',    false),
      scadenza:        str('comunicazione.scadenza',         ''),
    },
    collections: (() => {
      const defaultLista = [
        { id: 'casa', titolo: 'Casa 2027', sottotitolo: '', fotoUrl: '', dataInizio: '', dataScadenza: str('collection.casa.bookingDeadline', ''), dataFine: '', scrollAttivo: true },
        { id: 'moda', titolo: 'Moda PE27', sottotitolo: '', fotoUrl: '', dataInizio: '', dataScadenza: str('collection.moda.bookingDeadline', ''), dataFine: '', scrollAttivo: true },
        { id: 'collezione-home', titolo: 'Collezione Home', sottotitolo: '', fotoUrl: '', dataInizio: '', dataScadenza: '', dataFine: '', scrollAttivo: true, visibile: true },
      ];
      let lista = defaultLista;
      try {
        const raw = m['collections.lista'];
        if (raw) lista = JSON.parse(raw);
      } catch { /* keep default */ }
      const casaItem = lista.find((c) => c.id === 'casa');
      const modaItem = lista.find((c) => c.id === 'moda');
      return {
        moda: { bookingDeadline: modaItem?.dataScadenza ?? str('collection.moda.bookingDeadline', '') },
        casa: { bookingDeadline: casaItem?.dataScadenza ?? str('collection.casa.bookingDeadline', '') },
        lista,
      };
    })(),
    comunicazione2: {
      attivo:          bool('comunicazione2.attivo',          false),
      titolo:          str('comunicazione2.titolo',           ''),
      testo:           str('comunicazione2.testo',            ''),
      colore:          str('comunicazione2.colore',           '#C17A5A'),
      posizione:       str('comunicazione2.posizione',        'bottom'),
      font:            str('comunicazione2.font',             'system'),
      fontSizeTitolo:  num('comunicazione2.fontSizeTitolo',   15),
      fontSizeTesto:   num('comunicazione2.fontSizeTesto',    13),
      pesoTitolo:      str('comunicazione2.pesoTitolo',       'semibold'),
      pesoTesto:       str('comunicazione2.pesoTesto',        'normal'),
      allineamento:    str('comunicazione2.allineamento',     'left'),
      trasformazione:  str('comunicazione2.trasformazione',   'none'),
      corsivoTitolo:   bool('comunicazione2.corsivoTitolo',   false),
      corsivoTesto:    bool('comunicazione2.corsivoTesto',    false),
      sfondo:          str('comunicazione2.sfondo',           '#EFF6FF'),
      coloreTesto:     str('comunicazione2.coloreTesto',      '#374151'),
      coloreTitolo:    str('comunicazione2.coloreTitolo',     '#111827'),
      bordo:           str('comunicazione2.bordo',            'thin'),
      coloreBordo:     str('comunicazione2.coloreBordo',      '#3B82F6'),
      raggio:          num('comunicazione2.raggio',           12),
      ombra:           str('comunicazione2.ombra',            'none'),
      padding:         num('comunicazione2.padding',          16),
      larghezza:       str('comunicazione2.larghezza',        'full'),
      mostraIcona:     bool('comunicazione2.mostraIcona',     false),
      icona:           str('comunicazione2.icona',            '📢'),
      posizioneIcona:  str('comunicazione2.posizioneIcona',   'before'),
      chiudibile:      bool('comunicazione2.chiudibile',      false),
      soloUnaVolta:    bool('comunicazione2.soloUnaVolta',    false),
      scadenza:        str('comunicazione2.scadenza',         ''),
    },
  };
}
