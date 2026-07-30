export const COLORE_OPTIONS = [
  // Bianchi e neutri chiari
  'Bianco', 'Avorio', 'Panna', 'Crema', 'Burro', 'Gesso', 'Latte', 'Perla', 'Champagne', 'Ecrù',
  'Sabbia', 'Beige', 'Tortora chiaro', 'Greige', 'Lino',
  // Beige, sabbia e terre chiare
  'Cammello', 'Biscotto', 'Nocciola', 'Caramello', 'Miele', 'Tabacco chiaro', 'Caffellatte',
  'Cappuccino', 'Taupe', 'Khaki chiaro', 'Arenaria', 'Ocra chiaro', 'Fango',
  'Terra di Siena chiara', 'Mandorla',
  // Marroni
  'Marrone', 'Cioccolato', 'Fondente', 'Caffè', 'Mogano', 'Castagna', 'Cuoio', 'Cognac',
  'Noce', 'Ebano', 'Testa di moro', 'Ruggine', 'Terra bruciata', 'Bronzo', 'Seppia',
  // Grigi
  'Grigio perla', 'Grigio chiaro', 'Grigio medio', 'Grigio scuro', 'Cenere', 'Fumo', 'Grafite',
  'Ardesia', 'Piombo', 'Antracite', 'Ferro', 'Titanio', 'Argento', 'Acciaio', 'Tortora scuro',
  // Neri
  'Nero', 'Nero carbone', 'Nero inchiostro', 'Nero grafite', 'Onice',
  // Speciali
  'Multicolore',
  // Rossi
  'Rosso', 'Rosso fuoco', 'Rosso ciliegia', 'Rosso fragola', 'Rosso rubino', 'Rosso cremisi',
  'Rosso cardinale', 'Rosso corallo', 'Rosso mattone', 'Rosso pompeiano', 'Rosso borgogna',
  'Rosso amaranto', 'Rosso vermiglione', 'Rosso papavero', 'Rosso scarlatto',
  // Rosa
  'Rosa cipria', 'Rosa antico', 'Rosa nude', 'Rosa blush', 'Rosa confetto', 'Rosa pastello',
  'Rosa pesca', 'Rosa quarzo', 'Rosa salmone', 'Rosa shocking', 'Fucsia', 'Magenta',
  'Lampone', 'Malva', 'Rosa corallo',
  // Arancioni
  'Arancione', 'Albicocca', 'Pesca', 'Melone', 'Zucca', 'Terracotta', 'Papaya',
  'Corallo aranciato', 'Ambra', 'Mandarino', 'Tangerine', 'Arancio bruciato', 'Rame',
  'Zafferano', 'Mango',
  // Gialli
  'Giallo', 'Giallo limone', 'Giallo pastello', 'Giallo paglierino', 'Giallo senape',
  'Giallo ocra', 'Oro', 'Oro antico', 'Girasole', 'Mais', 'Vaniglia', 'Banana',
  'Lime gold', 'Topazio', 'Curry',
  // Verdi
  'Verde chiaro', 'Verde prato', 'Verde erba', 'Verde mela', 'Verde lime', 'Verde salvia',
  'Verde oliva', 'Verde muschio', 'Verde bosco', 'Verde smeraldo', 'Verde giada', 'Verde menta',
  'Verde acqua', 'Verde petrolio', 'Verde kaki', 'Verde militare', 'Verde bottiglia',
  'Verde foresta', 'Pistacchio', 'Chartreuse',
  // Turchesi e acquatici
  'Acquamarina', 'Turchese', 'Turchese chiaro', 'Turchese scuro', 'Tiffany', 'Acqua marina',
  'Seafoam', 'Lagoon', 'Caraibi', 'Azzurro acqua',
  // Azzurri
  'Azzurro cielo', 'Azzurro polvere', 'Azzurro baby', 'Azzurro ghiaccio', 'Azzurro avio',
  'Carta da zucchero', 'Celeste', 'Ceruleo', 'Fiordaliso', 'Blue mist',
  // Blu
  'Blu', 'Blu navy', 'Blu notte', 'Blu reale', 'Blu elettrico', 'Blu cobalto', 'Blu oltremare',
  'Blu zaffiro', 'Blu oceano', 'Blu denim', 'Blu aviazione', 'Blu pavone', 'Blu indaco',
  'Midnight Blue', 'Persian Blue',
  // Viola
  'Viola', 'Lilla', 'Lavanda', 'Glicine', 'Orchidea', 'Prugna', 'Melanzana', 'Ametista',
  'Porpora', 'Violetto', 'Eliotropio', 'Mora', 'Uva', 'Iris', 'Mauve',
  // Metallici e speciali
  'Oro rosa', 'Platino', 'Rame rosato', 'Peltro', 'Nichel',
] as const;

export const FANTASIA_OPTIONS = [
  // Unite e bicolor
  'Tinta unita', 'Bicolor', 'Tricolor', 'Color block', 'Dip dye', 'Ombré', 'Degradé',
  'Sfumato', 'Double face', 'Reversibile',
  // Righe
  'Riga verticale', 'Riga orizzontale', 'Riga diagonale', 'Riga marina', 'Riga marina bicolor',
  'Riga Breton', 'Riga Bengal', 'Riga regimental', 'Riga tennis', 'Riga gessata',
  'Riga diplomatica', 'Riga multiriga', 'Riga irregolare', 'Riga barcode', 'Riga zigzag',
  // Quadri e scozzesi
  'Quadretto Vichy', 'Vichy bicolor', 'Tartan', 'Royal Stewart', 'Black Watch', 'Madras',
  'Buffalo Check', 'Windowpane', 'Prince of Wales', 'Glen Check', 'Tattersall', 'Gingham',
  'Plaid', 'Quadretto micro', 'Quadretto macro', 'Scacchiera', 'Checkerboard', 'Arlecchino',
  'Patchwork a quadri', 'Quadri sfumati',
  // Pois e puntinati
  'Pois classici', 'Pois micro', 'Pois maxi', 'Pois bicolor', 'Pois irregolari', 'Polka Dot',
  'Puntinato', 'Confetti', 'Spot', 'Dalmata',
  // Geometriche
  'Chevron', 'Zigzag', 'Rombi', 'Losanghe', 'Diamante', 'Cubi', 'Esagoni', 'Triangoli',
  'Cerchi', 'Cerchi concentrici', 'Labirinto', 'Optical', 'Optical bicolor', 'Moiré geometrico',
  'Geometrico astratto', "Geometrico anni '60", "Geometrico anni '70", 'Geometrico modulare',
  'Pixel', 'Pixel art',
  // Classici sartoriali
  'Pied de Poule', 'Pied de Poule maxi', 'Pied de Poule micro', 'Pied de Coq', 'Houndstooth',
  'Dogtooth', 'Spinato', 'Spina di pesce', 'Birdseye', 'Nailhead', 'Sharkskin', 'Fil-à-fil',
  'Donegal', 'Tweed fantasia', 'Salt and Pepper',
  // Floreali
  'Liberty', 'Millefiori', 'Floreale romantico', 'Floreale vintage', 'Floreale tropicale',
  'Floreale botanico', 'Floreale acquerello', 'Floreale stilizzato', 'Floreale giapponese',
  'Floreale orientale', 'Bouquet', 'Roselline', 'Margherite', 'Peonie', 'Fiori sparsi',
  'Fiori all over', 'Fiori maxi', 'Fiori micro', 'Fiori tropicali', 'Hibiscus',
  // Vegetali e naturali
  'Foglie tropicali', 'Palme', 'Monstera', 'Bamboo', 'Felci', 'Edera', 'Fogliame', 'Rami',
  'Bosco', 'Giungla',
  // Paisley e orientali
  'Paisley', 'Paisley cachemire', 'Boteh', 'Kashmir', 'Arabesco', 'Damascato',
  'Broccato fantasia', 'Ikat', 'Suzani', 'Kilim',
  // Animalier
  'Leopardo', 'Leopardato astratto', 'Ghepardo', 'Tigre', 'Zebra', 'Zebra bicolor', 'Pitone',
  'Serpente', 'Coccodrillo', 'Giraffa', 'Mucca', 'Dalmata', 'Pavone', 'Farfalle', 'Piume',
  // Etniche e folk
  'Azteco', 'Navajo', 'Inca', 'Tribale', 'Africano wax', 'Batik', 'Folk nordico', 'Boho',
  'Messicano', 'Marocchino',
  // Astratte
  'Astratto pittorico', 'Astratto acquerello', 'Astratto grafico', 'Astratto fluido',
  'Marmorizzato', 'Marmo', 'Nuvolato', 'Pennellate', 'Splash', 'Maculato astratto',
  'Schizzi di colore', 'Effetto inchiostro', 'Effetto resina', 'Effetto fumo', 'Effetto galassia',
  // Vintage e retrò
  'Toile de Jouy', 'Art Déco', 'Art Nouveau', "Retro anni '50", "Retro anni '60",
  "Retro anni '70", 'Pop Art', 'Memphis', 'Psichedelico', 'Hippie',
  // Tematiche
  'Nautica', 'Marinara', 'Ancorette', 'Stelle marine', 'Costellazioni', 'Celestiale',
  'Cuori', 'Stelle', 'Luna e stelle', 'Nuvole',
  // Tecniche e texture stampate
  'Denim stampato', 'Effetto consumato', 'Stone wash print', 'Tie-dye', 'Shibori',
  'Camouflage', 'Camouflage urbano', 'Camouflage desertico', 'Camouflage woodland', 'Patchwork',
] as const;

export const MATERIALE_OPTIONS = [
  'Agata',
  'Alluminio',
  'Alpaca',
  'Canvas',
  'Carta',
  'Carta seta',
  'Cashmere',
  'Corno',
  'Cotone',
  'Elastan',
  'Fibra arancia',
  'Ferro',
  'Fibra bambù',
  'Fibra latte',
  'Fibra rosa',
  'Jeans',
  'Juta',
  'Lana',
  'Legno',
  'Lino',
  'Lyocell',
  'Metallo',
  'Mohair',
  'Onice',
  'Osso',
  'Ottone',
  'Paolo Santo',
  'Pelle',
  'Pile',
  'Plastica riciclata',
  'Poliestere',
  'Resina',
  'RPET',
  'Sari',
  'Semi',
  'Seta',
  'Sughero',
  'Tagua',
  'Vetro',
  'Viscosa',
] as const;

export const TAGLIA_OPTIONS = ['TU', 'XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XS/S', 'S/M', 'M/L', 'L/XL', 'XL/XXL'] as const;

export const CONFERENTE_OPTIONS = [
  'Altraqualità',
  'Equomercato',
  'Meridiano 361',
  'Prism',
] as const;

export const STAGIONE_OPTIONS = ['AI', 'PE', 'TUTTE'] as const;
