// AGGIORNATO: 2026-07-24 (fix coerenza scelta reso; fix navigazione ordini↔visual; fix codici taglia export Demetra)

import {
  LogIn, BookOpen, Heart, ShoppingBag, ShoppingCart, MapPin, Package,
  Eye, Download, Smartphone, HelpCircle, Layers, Film, Globe, Wallet, GitMerge, Bell, Settings, Sparkles, Palette, MessageSquare, BarChart2,
} from 'lucide-react';

export const metadata = { title: 'Guida all\'app — ON EARTH' };

const SECTIONS = [
  { id: 'installare-app',     label: 'Installare l\'app sul dispositivo', icon: Smartphone },
  { id: 'come-accedere',      label: 'Come accedere',                     icon: LogIn },
  { id: 'catalogo',           label: 'Il Catalogo',                       icon: BookOpen },
  { id: 'preferiti',          label: 'Preferiti',                         icon: Heart },
  { id: 'carrelli',           label: 'I Carrelli',                        icon: ShoppingCart },
  { id: 'creare-ordine',      label: 'Creare un Ordine',                  icon: ShoppingBag },
  { id: 'budget-ordine',      label: 'Budget Ordine',                     icon: Wallet },
  { id: 'destinazioni',       label: 'Le Destinazioni',                   icon: MapPin },
  { id: 'miei-ordini',        label: 'I miei Ordini',                     icon: Package },
  { id: 'unire-ordini',       label: 'Unire due Ordini',                  icon: GitMerge },
  { id: 'notifiche',          label: 'Notifiche',                         icon: Bell },
  { id: 'anteprima',          label: 'Anteprima e Raggruppamento',        icon: Eye },
  { id: 'demetra',            label: 'Esportare in Demetra',              icon: Download },
  { id: 'esposizioni',        label: 'Esposizioni',                       icon: Layers },
  { id: 'risorse',            label: 'Risorse e Media',                   icon: Film },
  { id: 'mie-destinazioni',   label: 'Le mie Destinazioni',               icon: MapPin },
  { id: 'multilingua',        label: 'Multilingua',                       icon: Globe },
  { id: 'impostazioni',       label: 'Impostazioni',                      icon: Settings },
  { id: 'moda-pe27',          label: 'Moda PE27',                         icon: Sparkles },
  { id: 'budget-pe27',        label: 'Budget',                            icon: BarChart2 },
  { id: 'ruota-cromatica',    label: 'Ruota Cromatica',                   icon: Palette },
  { id: 'survey',             label: 'Questionario',                      icon: MessageSquare },
  { id: 'assistenza-tecnica', label: 'Assistenza tecnica',                icon: HelpCircle },
];

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2 text-sm text-gray-600">
      <span className="text-accent mt-1 flex-shrink-0">·</span>
      <span>{children}</span>
    </li>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-2 text-sm text-gray-600">
      <span className="text-accent font-medium flex-shrink-0 w-4">{n}.</span>
      <span>{children}</span>
    </li>
  );
}

function SectionHeader({ n, icon: Icon, label }: { n: number; icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon size={16} className="text-accent flex-shrink-0" />
      <h2 className="text-sm font-semibold text-primary tracking-wide">{n}. {label}</h2>
    </div>
  );
}

export default function AssistenzaPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">

      {/* Header */}
      <div className="mb-8">
        <p className="label-luxury text-accent mb-1">Guida</p>
        <h1 className="font-display text-2xl sm:text-3xl text-primary font-light tracking-wide">
          Come usare l&apos;app
        </h1>
      </div>

      {/* TOC */}
      <nav className="bg-white border border-border rounded-lg p-5 mb-8">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Indice</p>
        <ol className="space-y-1.5">
          {SECTIONS.map((s, i) => {
            const Icon = s.icon;
            return (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="flex items-center gap-2.5 text-sm text-gray-600 hover:text-accent transition-colors group"
                >
                  <span className="text-xs text-gray-300 w-5 text-right flex-shrink-0">{i + 1}.</span>
                  <Icon size={13} className="text-gray-300 group-hover:text-accent flex-shrink-0 transition-colors" />
                  <span>{s.label}</span>
                </a>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Sections */}
      <div className="space-y-8">

        {/* 1. Installare l'app */}
        <section id="installare-app" className="bg-white border border-border rounded-lg p-5 sm:p-6 scroll-mt-6">
          <SectionHeader n={1} icon={Smartphone} label="Installare l'app sul dispositivo" />
          <div className="space-y-5">
            {[
              {
                label: 'iPhone / iPad (Safari)',
                steps: [
                  'Apri app.b2b.on-earth.it in Safari',
                  'Tocca l\'icona di condivisione (quadrato con freccia) in basso',
                  'Scorri e tocca "Aggiungi a schermata Home"',
                  'Tocca "Aggiungi"',
                ],
              },
              {
                label: 'Android (Chrome)',
                steps: [
                  'Apri app.b2b.on-earth.it in Chrome',
                  'Tocca i tre puntini in alto a destra',
                  'Tocca "Aggiungi a schermata Home" o "Installa app"',
                  'Tocca "Aggiungi"',
                ],
              },
              {
                label: 'Mac / PC (Chrome o Edge)',
                steps: [
                  'Apri app.b2b.on-earth.it',
                  'Clicca sull\'icona di installazione nella barra degli indirizzi',
                  'Clicca "Installa"',
                ],
              },
            ].map((platform) => (
              <div key={platform.label}>
                <p className="text-xs font-semibold text-primary mb-2">{platform.label}</p>
                <ol className="space-y-1 ml-1">
                  {platform.steps.map((step, i) => (
                    <Step key={i} n={i + 1}>{step}</Step>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </section>

        {/* 2. Come accedere */}
        <section id="come-accedere" className="bg-white border border-border rounded-lg p-5 sm:p-6 scroll-mt-6">
          <SectionHeader n={2} icon={LogIn} label="Come accedere" />
          <ul className="space-y-2">
            <Bullet>Vai su <span className="font-mono text-primary">app.b2b.on-earth.it</span></Bullet>
            <Bullet>Inserisci la tua email e la password ricevuta.</Bullet>
            <Bullet>La password predefinita è <span className="font-mono text-primary">onearth_</span> seguito dalle prime 5 lettere della tua organizzazione (minuscole, senza spazi).</Bullet>
            <Bullet>Esempio: organizzazione <span className="font-medium text-primary">Le Rondini</span> → password: <span className="font-mono text-primary">onearth_leron</span></Bullet>
            <Bullet>Se non hai ancora le credenziali clicca <span className="font-medium">Richiedi credenziali per accesso</span> nella pagina di login.</Bullet>
          </ul>
        </section>

        {/* 3. Il Catalogo */}
        <section id="catalogo" className="bg-white border border-border rounded-lg p-5 sm:p-6 scroll-mt-6">
          <SectionHeader n={3} icon={BookOpen} label="Il Catalogo" />
          <ul className="space-y-2">
            <Bullet>Accedi al catalogo dalla voce <span className="font-medium">Catalogo</span> nel menu in alto.</Bullet>
            <Bullet>Sfoglia i prodotti della collezione CASA 2027.</Bullet>
            <Bullet>Usa i filtri a sinistra per filtrare per: Gruppo merceologico, Famiglia, Classe, Sottoclasse, Gruppo omogeneo, Linea, <span className="font-medium">Linea</span> (modello), <span className="font-medium">Materiale</span>, Colore, Tema colore, Collezione, Stagione, Produttore, Tranche, Blocco colore.</Bullet>
            <Bullet><span className="font-medium">I filtri sono intelligenti:</span> selezionando un valore, tutti gli altri filtri aggiornano automaticamente le proprie opzioni mostrando solo i valori compatibili con la selezione corrente. Accanto a ogni opzione è indicato il numero di prodotti disponibili.</Bullet>
            <Bullet>Usa i chip <span className="font-medium">Tutti / Novità / Continuativi</span> sopra la griglia per filtrare rapidamente tra le novità e i prodotti continuativi (contrassegnati dal badge <span className="font-medium">CO</span>).</Bullet>
            <Bullet>Ordina i prodotti con <span className="font-medium">Ordina per…</span>: A→Z, Z→A, Prezzo crescente, Prezzo decrescente, Novità (CA27), Continuativi.</Bullet>
            <Bullet>Cerca per codice, nome o linea nella barra di ricerca.</Bullet>
            <Bullet>Scegli la modalità di visualizzazione: griglia, lista orizzontale o lookbook.</Bullet>
            <Bullet>Clicca ❤️ su un prodotto per aggiungerlo ai Preferiti.</Bullet>
            <Bullet>Usa <span className="font-medium">+</span> e <span className="font-medium">−</span> per aggiungere quantità all&apos;ordine corrente nella barra a destra.</Bullet>
            <Bullet><span className="font-medium">Varianti taglia:</span> i prodotti con più taglie (es. XS, S, M, L, XL) mostrano nella scheda prodotto la tabella <em>Varianti taglia</em> con il codice specifico per ciascuna taglia. Clicca <strong>+</strong> su una riga per aggiungere quella taglia al carrello; usa <strong>−</strong> / <strong>+</strong> per modificarne la quantità. Ogni taglia viene aggiunta come riga separata nel carrello con il proprio codice.</Bullet>
            <Bullet>I prodotti CA27 hanno il badge <span className="font-medium">NUOVO</span>. I prodotti continuativi (già presenti nelle collezioni precedenti) hanno il badge <span className="font-medium">CO</span>.</Bullet>
            <Bullet>Il carrello è sincronizzato tra tutti i tuoi dispositivi: se aggiungi prodotti da un telefono, li ritrovi esattamente uguali accedendo dallo stesso account su un altro dispositivo.</Bullet>
          </ul>
        </section>

        {/* 4. Preferiti */}
        <section id="preferiti" className="bg-white border border-border rounded-lg p-5 sm:p-6 scroll-mt-6">
          <SectionHeader n={4} icon={Heart} label="Preferiti" />
          <ul className="space-y-2">
            <Bullet>Clicca il cuore ❤️ su qualsiasi prodotto per salvarlo nei preferiti.</Bullet>
            <Bullet>Accedi ai tuoi preferiti dalla voce <span className="font-medium">Preferiti</span> nel menu in alto.</Bullet>
            <Bullet>Puoi aggiungere prodotti preferiti all&apos;ordine direttamente dalla pagina Preferiti.</Bullet>
          </ul>
        </section>

        {/* 5. I Carrelli */}
        <section id="carrelli" className="bg-white border border-border rounded-lg p-5 sm:p-6 scroll-mt-6">
          <SectionHeader n={5} icon={ShoppingCart} label="I Carrelli" />
          <ul className="space-y-2">
            <Bullet>Puoi andare al catalogo e aggiungere prodotti direttamente: al primo clic su <span className="font-medium">Aggiungi</span> ti viene chiesto in quale carrello inserirli (o di crearne uno nuovo).</Bullet>
            <Bullet>In alternativa vai in <span className="font-medium">Carrelli</span> nel menu per creare un carrello in anticipo o gestire quelli esistenti.</Bullet>
            <Bullet>Ogni utente può avere più carrelli aperti contemporaneamente (es. un carrello per ogni cliente o stagione).</Bullet>
            <Bullet>Crea un nuovo carrello con il pulsante <span className="font-medium">Nuovo carrello</span> in alto a destra: scegli la destinazione (obbligatoria per gli operatori), assegna un nome e imposta il budget se vuoi.</Bullet>
            <Bullet>Clicca <span className="font-medium">Seleziona</span> su un carrello per renderlo attivo: il carrello attivo è evidenziato con il badge <span className="font-medium">attivo</span>.</Bullet>
            <Bullet>Una volta attivo, clicca <span className="font-medium">+ Aggiungi prodotti</span> per andare al catalogo e iniziare ad aggiungere prodotti.</Bullet>
            <Bullet>La destinazione e il budget del carrello sono visibili nella barra laterale, sotto il nome del carrello: clicca <span className="font-medium">Modifica</span> per cambiarli in qualsiasi momento.</Bullet>
            <Bullet>I carrelli sono sincronizzati tra tutti i tuoi dispositivi: se aggiungi prodotti da un telefono, li ritrovi esattamente uguali accedendo dallo stesso account su un altro dispositivo.</Bullet>
            <Bullet>Rinomina un carrello con l&apos;icona matita. Eliminalo con l&apos;icona cestino (i prodotti vengono persi).</Bullet>
            <Bullet>Un carrello diventa un Ordine quando clicchi <span className="font-medium">Crea Ordine</span> nella barra laterale. Dopo la conversione il carrello non è più modificabile.</Bullet>
          </ul>
        </section>

        {/* 6. Creare un Ordine */}
        <section id="creare-ordine" className="bg-white border border-border rounded-lg p-5 sm:p-6 scroll-mt-6">
          <SectionHeader n={6} icon={ShoppingBag} label="Creare un Ordine" />
          <ul className="space-y-2">
            <Bullet>Quando entri nel catalogo tutti i prodotti mostrano il pulsante <span className="font-medium">Aggiungi</span>: nessun carrello è pre-selezionato.</Bullet>
            <Bullet>Al primo clic su <span className="font-medium">Aggiungi</span> si apre un pannello dove selezioni in quale carrello inserire il prodotto (o crei un nuovo carrello). Vengono mostrati solo i carrelli della collezione corrente (es. PE27 nel catalogo MODA, CA27 nel catalogo casa).</Bullet>
            <Bullet>Dopo la selezione la barra laterale mostra il carrello attivo e le quantità dei prodotti aggiunti.</Bullet>
            <Bullet>Per i prodotti MODA con più taglie (es. S, M, L) clicca <span className="font-medium">Aggiungi</span>: prima scegli la taglia, poi il carrello. Ogni taglia compare come riga separata nel carrello.</Bullet>
            <Bullet>Per cambiare carrello in qualsiasi momento clicca l&apos;icona <span className="font-medium">⇄</span> in alto nella barra laterale (accanto all&apos;icona cestino): si apre il pannello di selezione carrello.</Bullet>
            <Bullet>Clicca <span className="font-medium">Crea Ordine</span> nella barra laterale per convertire il carrello in un ordine: destinazione e budget vengono presi automaticamente dal carrello.</Bullet>
            <Bullet>Dopo la creazione vieni portato automaticamente alla pagina Ordini.</Bullet>
          </ul>
        </section>

        {/* 7. Budget Ordine */}
        <section id="budget-ordine" className="bg-white border border-border rounded-lg p-5 sm:p-6 scroll-mt-6">
          <SectionHeader n={7} icon={Wallet} label="Budget Ordine" />
          <ul className="space-y-2">
            <Bullet>Il budget si imposta quando crei il carrello (o in seguito cliccando <span className="font-medium">Modifica</span> nella barra laterale): appartiene al singolo carrello/ordine, non alla destinazione.</Bullet>
            <Bullet>Se la destinazione ha già un budget configurato, puoi scegliere di usarlo o di impostarne uno personalizzato.</Bullet>
            <Bullet>La barra di progressione nella sidebar mostra quanto del budget è stato usato man mano che aggiungi prodotti.</Bullet>
            <Bullet>Una volta creato l&apos;ordine, puoi modificare il budget in qualsiasi momento direttamente dalla pagina dell&apos;ordine usando l&apos;icona matita accanto al budget.</Bullet>
            <Bullet>Cambiare la destinazione del carrello non modifica il budget impostato.</Bullet>
          </ul>
        </section>

        {/* 8. Le Destinazioni */}
        <section id="destinazioni" className="bg-white border border-border rounded-lg p-5 sm:p-6 scroll-mt-6">
          <SectionHeader n={8} icon={MapPin} label="Le Destinazioni" />
          <ul className="space-y-2">
            <Bullet>Le destinazioni sono i tuoi punti vendita (bottega, emporio, online, ecc.).</Bullet>
            <Bullet>Gestiscile dalla voce <span className="font-medium">Destinazioni</span> nel menu.</Bullet>
            <Bullet>Ogni ordine è associato a una destinazione.</Bullet>
            <Bullet>Puoi impostare un budget di riferimento per ogni destinazione: serve a tracciare quanto hai ordinato complessivamente per quel punto vendita. È diverso dal budget del singolo ordine (vedi <a href="#budget-ordine" className="text-accent hover:underline">Budget Ordine</a>).</Bullet>
            <Bullet>Tipi disponibili: Bottega, Emporio, Distretto, Store, Outlet, Tendone, Fiera, Online, Altro.</Bullet>
          </ul>
        </section>

        {/* 9. I miei Ordini */}
        <section id="miei-ordini" className="bg-white border border-border rounded-lg p-5 sm:p-6 scroll-mt-6">
          <SectionHeader n={9} icon={Package} label="I miei Ordini" />
          <ul className="space-y-2">
            <Bullet>Visualizza tutti i tuoi ordini dalla voce <span className="font-medium">Ordini</span> nel menu.</Bullet>
            <Bullet>Usa la barra di ricerca per cercare per numero ordine o destinazione, i chip <span className="font-medium">Tutti / In lavorazione / Esportati</span> per filtrare per stato, e il menu a tendina <span className="font-medium">Tutti i negozi</span> per filtrare per negozio di destinazione (appare solo se hai più negozi).</Bullet>
            <Bullet>Gli stati possibili sono: <span className="font-medium">Da esportare</span> | <span className="font-medium">Esportato</span>.</Bullet>
            <Bullet>Per ogni ordine puoi:
              <ul className="mt-1.5 ml-2 space-y-1">
                <li className="flex gap-2 text-sm text-gray-600"><span className="text-accent flex-shrink-0">–</span><span>Modificare quantità e prodotti</span></li>
                <li className="flex gap-2 text-sm text-gray-600"><span className="text-accent flex-shrink-0">–</span><span>Vedere l&apos;anteprima visiva raggruppata</span></li>
                <li className="flex gap-2 text-sm text-gray-600"><span className="text-accent flex-shrink-0">–</span><span>Esportare in PDF con raggruppamento personalizzato</span></li>
                <li className="flex gap-2 text-sm text-gray-600"><span className="text-accent flex-shrink-0">–</span><span>Esportare in Demetra (CSV per il gestionale)</span></li>
                <li className="flex gap-2 text-sm text-gray-600"><span className="text-accent flex-shrink-0">–</span><span>Duplicare un ordine esportato come base per uno nuovo</span></li>
                <li className="flex gap-2 text-sm text-gray-600"><span className="text-accent flex-shrink-0">–</span><span>Unire due ordini non esportati in uno solo (vedi sezione seguente)</span></li>
                <li className="flex gap-2 text-sm text-gray-600"><span className="text-accent flex-shrink-0">–</span><span>Eliminare un ordine (anche se già esportato)</span></li>
              </ul>
            </Bullet>
            <Bullet>Usa il pulsante <span className="font-medium">Budget</span> su ogni ordine per impostare o modificare il budget di spesa massimo.</Bullet>
            <Bullet>Se provi a modificare o eliminare un ordine creato da un altro utente della tua organizzazione, l&apos;app ti chiederà conferma: <span className="font-medium">&ldquo;Hai l&apos;autorizzazione per modificare/eliminare questo ordine?&rdquo;</span> — rispondi <span className="font-medium">Sì, procedi</span> per continuare o <span className="font-medium">No, annulla</span> per fermarti.</Bullet>
          </ul>
        </section>

        {/* 10. Unire due Ordini */}
        <section id="unire-ordini" className="bg-white border border-border rounded-lg p-5 sm:p-6 scroll-mt-6">
          <SectionHeader n={10} icon={GitMerge} label="Unire due Ordini" />
          <ul className="space-y-2">
            <Bullet>Puoi unire due ordini non ancora esportati in un unico ordine.</Bullet>
            <Bullet>Nella pagina <span className="font-medium">Ordini</span>, spunta la <span className="font-medium">checkbox</span> accanto al numero di due ordini diversi.</Bullet>
            <Bullet>Appare una barra in basso: clicca <span className="font-medium">Unisci</span>.</Bullet>
            <Bullet>Nel modal scegli quale ordine <span className="font-medium">conservare</span>: il contenuto dell&apos;altro viene aggiunto a quello scelto (stessi prodotti: quantità sommate; prodotti nuovi: aggiunti). L&apos;ordine non conservato viene eliminato.</Bullet>
            <Bullet>Non è possibile unire ordini già esportati.</Bullet>
          </ul>
        </section>

        {/* 11. Notifiche */}
        <section id="notifiche" className="bg-white border border-border rounded-lg p-5 sm:p-6 scroll-mt-6">
          <SectionHeader n={11} icon={Bell} label="Notifiche" />
          <ul className="space-y-2">
            <Bullet>Quando ON EARTH pubblica un aggiornamento o una promozione, ricevi una notifica <span className="font-medium">push</span> se hai installato l&apos;app sul telefono, altrimenti via <span className="font-medium">email</span>.</Bullet>
            <Bullet>Al primo accesso appare un banner: clicca <span className="font-medium">Abilita</span> per attivare le notifiche push; il browser chiede conferma. Una volta abilitate, arrivano anche quando l&apos;app è chiusa.</Bullet>
            <Bullet>Per gestire le preferenze clicca sull&apos;icona <span className="font-medium">campanella 🔔</span> in alto a destra, poi <span className="font-medium">Impostazioni notifiche</span> in fondo al pannello.</Bullet>
            <Bullet>Puoi abilitare o disabilitare le <span className="font-medium">notifiche push</span> e le <span className="font-medium">notifiche email</span> separatamente in qualsiasi momento.</Bullet>
            <Bullet>Se disabiliti entrambe non riceverai più nessuna comunicazione da ON EARTH B2B.</Bullet>
          </ul>
        </section>

        {/* 12. Anteprima e Raggruppamento */}
        <section id="anteprima" className="bg-white border border-border rounded-lg p-5 sm:p-6 scroll-mt-6">
          <SectionHeader n={12} icon={Eye} label="Anteprima e Raggruppamento" />
          <ul className="space-y-2">
            <Bullet>Clicca <span className="font-medium">Modifica Anteprima</span> su un ordine per vedere i prodotti raggruppati visivamente e modificarli.</Bullet>
            <Bullet>Scegli il criterio di raggruppamento: Gruppo merceologico, Famiglia, Classe, Sottoclasse, Gruppo omogeneo, Linea, <span className="font-medium">Colore</span>, <span className="font-medium">Fantasia / Stampa</span> (le stampe si suddividono per nome), Stagione, Collezione, Produttore, Tranche.</Bullet>
            <Bullet>Usa la <span className="font-medium">barra di ricerca</span> in alto per filtrare i prodotti dell&apos;ordine per nome o codice.</Bullet>
            <Bullet>Clicca su una <span className="font-medium">foto prodotto</span> per aprire l&apos;anagrafica completa (galleria, prezzi, attributi).</Bullet>
            <Bullet>Modifica quantità direttamente dall&apos;anteprima con i pulsanti <span className="font-medium">+</span> e <span className="font-medium">−</span>.</Bullet>
            <Bullet>Clicca <span className="font-medium">+ Aggiungi prodotti</span> per aggiungere nuovi prodotti. Digita almeno 2 caratteri per cercare nella collezione corrente (MODA o casa), oppure sfoglia il catalogo con i filtri — vengono mostrati tutti i prodotti, incluse le varianti taglia non ancora aggiunte. In cima al pannello il selettore <span className="font-medium">Tutti / Non ancora / Già presenti</span> filtra la visibilità dei prodotti.</Bullet>
            <Bullet>In fondo alla pagina vedi il riepilogo con subtotali per gruppo e totale generale.</Bullet>
            <Bullet>Esporta il <span className="font-medium">PDF</span> con le foto dei prodotti raggruppati.</Bullet>
            <Bullet>Esporta in <span className="font-medium">Excel multi-foglio</span>: un foglio per ogni criterio di classificazione (linea, collezione, colore, ecc.).</Bullet>
          </ul>
        </section>

        {/* 13. Esportare in Demetra */}
        <section id="demetra" className="bg-white border border-border rounded-lg p-5 sm:p-6 scroll-mt-6">
          <SectionHeader n={13} icon={Download} label="Esportare in Demetra" />
          <ul className="space-y-2">
            <Bullet>Il pulsante <span className="font-medium">Esporta in Demetra</span> apre un menu con le opzioni: <span className="font-medium">CSV completo</span>, <span className="font-medium">CSV tranche</span> (una per ogni tranche presente nell&apos;ordine) e <span className="font-medium">Excel (.xlsx)</span>. Il menu è disponibile sia nella lista ordini sia nella pagina di modifica/anteprima.</Bullet>
            <Bullet>Dopo l&apos;export l&apos;ordine diventa <span className="font-medium">Esportato</span> e non è più modificabile.</Bullet>
            <Bullet>Puoi duplicarlo per creare un nuovo ordine basato su quello esportato.</Bullet>
            <Bullet>Su Demetra vai in <span className="font-medium">Proposte di prenotazione</span> › <span className="font-medium">Proposte attive</span> › <span className="font-medium">Nuova prenotazione</span>, compila i campi richiesti e poi clicca su <span className="font-medium">Crea prenotazione</span> (in Cliente seleziona <span className="font-medium">Prenotazioni dirette</span>).</Bullet>
            <Bullet>Nella finestra successiva inserisci la destinazione e compila gli altri campi necessari, poi clicca sul pulsante blu <span className="font-medium">Carica da file</span>.</Bullet>
            <Bullet>Si apre una nuova finestra. Clicca sul pulsante grigio <span className="font-medium">Scegli file</span>. Seleziona il file CSV o XLSX scaricato dall&apos;app.</Bullet>
            <Bullet>Clicca sul pulsante verde <span className="font-medium">Carica da file</span> per confermare il caricamento. In fondo alla pagina premi <span className="font-medium">Inserisci</span> per aggiungere gli articoli alla prenotazione, oppure <span className="font-medium">Annulla</span> per annullare l&apos;inserimento.</Bullet>
            <Bullet>Prosegui e clicca <span className="font-medium">Conferma e invia</span> per confermare in via definitiva la prenotazione.</Bullet>
          </ul>
        </section>

        {/* 14. Esposizioni */}
        <section id="esposizioni" className="bg-white border border-border rounded-lg p-5 sm:p-6 scroll-mt-6">
          <SectionHeader n={14} icon={Layers} label="Esposizioni" />
          <ul className="space-y-2">
            <Bullet>Dall&apos;anteprima di un ordine tocca il tab <span className="font-medium">Esposizione</span> per organizzare i prodotti in gruppi espositivi (es. Vetrina, Isola, Parete).</Bullet>
            <Bullet>Crea un nuovo gruppo con il pulsante <span className="font-medium">+ Gruppo</span>: assegna nome, colore e template.</Bullet>
            <Bullet>Assegna i prodotti non assegnati a un gruppo usando il menu a tendina su ciascun prodotto.</Bullet>
            <Bullet>Usa l&apos;icona 🔥 per marcare i prodotti <span className="font-medium">focus</span> del gruppo: prodotti di punta che meritano massima visibilità.</Bullet>
            <Bullet>Esporta il PDF Esposizioni con il pulsante <span className="font-medium">Scarica PDF</span>: include griglia prodotti, colori e note.</Bullet>
            <Bullet>Dal tab <span className="font-medium">Calendario</span> pianifica quando ogni gruppo sarà esposto, settimana per settimana, suddiviso per spazi espositivi.</Bullet>
          </ul>
        </section>

        {/* 15. Risorse e Media */}
        <section id="risorse" className="bg-white border border-border rounded-lg p-5 sm:p-6 scroll-mt-6">
          <SectionHeader n={15} icon={Film} label="Risorse e Media" />
          <ul className="space-y-2">
            <Bullet>Accedi alle Risorse dal menu in basso (icona cartella) o dalla homepage.</Bullet>
            <Bullet>I contenuti sono divisi in tre tab separati: <span className="font-medium">Documenti</span>, <span className="font-medium">Foto</span> e <span className="font-medium">Video</span>.</Bullet>
            <Bullet><span className="font-medium">Documenti:</span> PDF e altri file scaricabili direttamente.</Bullet>
            <Bullet><span className="font-medium">Foto:</span> album fotografici sfogliabili con lightbox e swipe.</Bullet>
            <Bullet><span className="font-medium">Video:</span> video (si apre in una nuova scheda) e podcast/audio ascoltabili con player integrato.</Bullet>
            <Bullet>All&apos;interno di ogni tab i contenuti possono essere ulteriormente raggruppati per cartella.</Bullet>
          </ul>
        </section>

        {/* 16. Le mie Destinazioni */}
        <section id="mie-destinazioni" className="bg-white border border-border rounded-lg p-5 sm:p-6 scroll-mt-6">
          <SectionHeader n={16} icon={MapPin} label="Le mie Destinazioni" />
          <ul className="space-y-2">
            <Bullet>Gestisci i tuoi punti vendita dalla voce <span className="font-medium">Destinazioni</span>.</Bullet>
            <Bullet>Aggiungi nuove destinazioni con: tipo, città, indirizzo.</Bullet>
            <Bullet>Puoi impostare un budget di riferimento per ogni destinazione: è indicativo e mostra quanti acquisti hai fatto complessivamente per quel punto vendita.</Bullet>
            <Bullet>Per impostare il budget di un singolo ordine usa il campo <span className="font-medium">Budget ordine €</span> nel carrello, oppure modificalo direttamente dalla pagina dell&apos;ordine già creato.</Bullet>
          </ul>
        </section>

        {/* 17. Multilingua */}
        <section id="multilingua" className="bg-white border border-border rounded-lg p-5 sm:p-6 scroll-mt-6">
          <SectionHeader n={17} icon={Globe} label="Multilingua" />
          <ul className="space-y-2">
            <Bullet>L&apos;app è disponibile in: <span className="font-medium">Italiano, Inglese, Tedesco, Francese, Spagnolo</span>.</Bullet>
            <Bullet>Cambia lingua dal selettore in alto a destra (IT / EN / DE / FR / ES).</Bullet>
            <Bullet>Su mobile usa il menu a tendina per selezionare la lingua.</Bullet>
          </ul>
        </section>

        {/* 18. Impostazioni */}
        <section id="impostazioni" className="bg-white border border-border rounded-lg p-5 sm:p-6 scroll-mt-6">
          <SectionHeader n={18} icon={Settings} label="Impostazioni" />
          <ul className="space-y-2">
            <Bullet>Accedi alle Impostazioni dall&apos;icona <span className="font-medium">⚙</span> in alto a destra o dalla barra in basso (<span className="font-medium">Impostaz.</span>).</Bullet>
            <Bullet><span className="font-medium">Il tuo account:</span> visualizza organizzazione, email di accesso e password.</Bullet>
            <Bullet><span className="font-medium">Notifiche sul telefono:</span> attiva o disattiva le notifiche push. Se attive, ricevi un avviso sul telefono anche con l&apos;app chiusa.</Bullet>
            <Bullet><span className="font-medium">Notifiche via email:</span> attiva o disattiva le comunicazioni email relative a novità e promozioni.</Bullet>
            <Bullet>Se il browser ha già bloccato le notifiche, vai in Impostazioni Chrome → Impostazioni sito → Notifiche e abilita <em>app.b2b.on-earth.it</em>.</Bullet>
          </ul>
        </section>

        {/* 19. Moda PE27 */}
        <section id="moda-pe27" className="bg-white border border-border rounded-lg p-5 sm:p-6 scroll-mt-6">
          <SectionHeader n={19} icon={Sparkles} label="Moda PE27" />
          <p className="text-sm text-gray-600 mb-3">
            La sezione <strong>Moda PE27</strong> è accessibile esclusivamente dall&apos;account amministratore e raccoglie la collezione moda Primavera/Estate 2027.
          </p>
          <ul className="space-y-2">
            <Bullet><span className="font-medium">Accesso:</span> dalla home dell&apos;app tocca il quadrato <em>MODA PE27</em> per entrare nella sezione. Da lì puoi navigare a Catalogo, Preferiti, Visual, Carrelli e Ordini della collezione.</Bullet>
            <Bullet><span className="font-medium">Catalogo Moda:</span> mostra solo i prodotti PE27 (il filtro collezione è pre-impostato e bloccato). Usa gli altri filtri per famiglia, classe, sottoclasse e gruppo omogeneo secondo la tassonomia moda.</Bullet>
            <Bullet><span className="font-medium">Visual:</span> simula l&apos;esposizione in negozio costruendo layout con barre appenderia, mensole e frontali. L&apos;anteprima è fissa in cima. Per aggiungere prodotti usa <strong>Aggiungi prodotto</strong>: filtra per <em>Tutti</em>, <em>Carrello</em> o <em>Ordine</em>, con filtri Famiglia, Colore, Classe e Sottoclasse. Tocca il nome di un prodotto per vedere taglia e codice corrispondente. Il <strong>frontale</strong> ammette solo 4 combinazioni: 1 abito, oppure top+bottom, oppure 1 capospalla, oppure capospalla+bottom. La <strong>mensola piccola</strong> è larga quanto un capo esposto frontalmente (48 px); per riordinare i prodotti sulla mensola usa le frecce ‹ › accanto a ciascun item. Puoi aggiungere <strong>più mensole</strong> sopra una barra o un frontale (max 2) e impilare fino a 4 ripiani su un elemento mensola: usa il pulsante <em>Aggiungi mensola</em> nella card di configurazione. Le taglie disponibili (XXS→XXL) sono evidenziate; quelle assenti semitrasparenti. L&apos;anteprima parete è divisa in 3 zone: in alto le miniature foto dei prodotti sulle mensole (12,5%), al centro il render a parete (75%), in basso le foto dei prodotti in barra (12,5%). Ogni elemento può essere spostato verticalmente tramite i tasti ▲▼ nella card di configurazione (<em>Posizione verticale</em>). Le foto in anteprima appaiono nella colonna sopra (mensole) o sotto (barre) al relativo capo, senza codice. Il frontale mostra la foto per intero. Trascina liberamente qualsiasi elemento nell&apos;anteprima per riposizionarlo in orizzontale e verticale — il salvataggio è automatico al rilascio. Nelle card di configurazione, ogni prodotto ha un&apos;icona ≡ per trascinarlo su o giù nell&apos;elenco e cambiarne l&apos;ordine all&apos;interno della barra o mensola; sono disponibili anche i tasti ▲▼ per lo spostamento fine. Il pulsante <em>abbinamenti cromatici →</em> accanto a un prodotto apre la Ruota Cromatica con il prodotto pre-selezionato: un banner in cima ricorda l&apos;elemento di destinazione (mensola/barra/frontale) e accanto a ogni prodotto appare un&apos;icona <strong>+</strong> per aggiungerlo direttamente all&apos;elemento. Un link <em>← Torna alla parete</em> riporta all&apos;editor. I pulsanti <strong>↩ Annulla</strong> e <strong>↪ Ripristina</strong> nell&apos;intestazione dell&apos;anteprima permettono di tornare indietro o ripetere le ultime modifiche (fino a 50 passi). Il layout dell&apos;editor è affiancato: le card di configurazione sono a sinistra (scorribili) e l&apos;anteprima parete è fissa a destra — occupa metà schermo e mostra una griglia semitrasparente di allineamento.</Bullet>
            <Bullet><span className="font-medium">Esposizione:</span> componi outfit a parete selezionando una palette colori PE27, una fantasia/texture dominante, i capi principali (zona centro) e gli accessori coordinati (zona destra). Da ogni outfit puoi aggiungere al carrello tutti i prodotti, solo i capi o solo gli accessori.</Bullet>
            <Bullet><span className="font-medium">Ordini:</span> gli ordini moda si creano con il carrello standard e sono accessibili dalla sezione I miei Ordini.</Bullet>
            <Bullet><span className="font-medium">Accessori consigliati:</span> in fondo alla scheda di ciascun prodotto bigiotteria trovi una sezione <em>Accessori consigliati</em> con i display ed espositivi adatti (es. busti per collane, coni per bracciali, espositori per orecchini). Ogni accessorio riporta codice, nome, misure, prezzo e un pulsante <em>Ordina su Demetra</em> che apre il link di acquisto diretto sul portale Demetra.</Bullet>
          </ul>
        </section>

        {/* 20. Budget PE27 */}
        <section id="budget-pe27" className="bg-white border border-border rounded-lg p-5 sm:p-6 scroll-mt-6">
          <SectionHeader n={20} icon={BarChart2} label="Budget" />
          <p className="text-sm text-gray-600 mb-3">
            La pagina <strong>Budget</strong> è disponibile solo per gli operatori Meridiano361 e permette di pianificare il budget acquisti stagionale.
            Aprila dalla home MODA PE27 → <em>Budget</em>, oppure dal menu in alto.
          </p>
          <ul className="space-y-2">
            <Bullet><span className="font-medium">Vista Famiglie:</span> inserisci i dati storici (venduto PE25 e PE26 in valore e pezzi, mesi consuntivi), l&apos;obiettivo stagionale in €, il margine pieno e gli sconti dei mesi 5 e 6. L&apos;app calcola automaticamente venduto proiettato, valore medio pezzo e obiettivo in pezzi.</Bullet>
            <Bullet><span className="font-medium">Vista Sottoclassi:</span> per ogni sottoclasse inserisci i pezzi ordinati in PE25, PE26 e i capi continuativi già disponibili. L&apos;app calcola l&apos;incidenza di ogni sottoclasse sulla famiglia e il fabbisogno netto (obiettivo pezzi × incidenza media − continuativi).</Bullet>
            <Bullet><span className="font-medium">Vista Conferenti:</span> mostra la suddivisione degli ordini e carrelli attivi per fornitore (conferente), con pezzi, imponibile e retail stimato.</Bullet>
            <Bullet><span className="font-medium">Vista Sintesi:</span> quadro riepilogativo con copertura del budget, totale ordinato vs obiettivo per famiglia e margine medio effettivo (ponderato sui 6 mesi stagionali).</Bullet>
            <Bullet>Tutti i campi si salvano automaticamente (debounce 800 ms) non appena smetti di digitare.</Bullet>
          </ul>
        </section>

        {/* 21. Ruota Cromatica */}
        <section id="ruota-cromatica" className="bg-white border border-border rounded-lg p-5 sm:p-6 scroll-mt-6">
          <SectionHeader n={21} icon={Palette} label="Ruota Cromatica" />
          <p className="text-sm text-gray-600 mb-3">
            La <strong>Ruota Cromatica</strong> è uno strumento di visual merchandising per i prodotti Moda PE27.
            Visualizza la ruota cromatica e trova abbinamenti ottimali per tavoli, pareti e vetrine.
          </p>
          <ul className="space-y-2">
            <Bullet><span className="font-medium">Ruota:</span> 12 famiglie cromatiche + neutri. Ogni segmento mostra quanti prodotti appartengono a quella famiglia colore. Clicca un segmento per filtrare.</Bullet>
            <Bullet><span className="font-medium">Selezione prodotto:</span> clicca un prodotto per vedere gli abbinamenti — analoghi, complementari, neutri compatibili — calcolati dal colore Pantone primario.</Bullet>
            <Bullet><span className="font-medium">Abbinamenti dalla parete:</span> cliccando <em>abbinamenti cromatici →</em> accanto a un prodotto nell&apos;editor parete si apre la Ruota Cromatica con il contesto della parete attivo. Un banner indica l&apos;elemento di destinazione; ogni prodotto ha un&apos;icona <strong>+</strong> per aggiungerlo direttamente all&apos;elemento. Usa il link <em>← Torna alla parete</em> per tornare all&apos;editor.</Bullet>
            <Bullet><span className="font-medium">Vista abbinamenti (focus mode):</span> cliccando <em>Vista abbinamenti</em> si apre una vista dedicata con 4 set espositivi — <em>Tono su tono</em>, <em>Analoghi</em>, <em>A contrasto</em> e <em>Hero + Neutri</em>. Ogni set mostra i prodotti armonici; clicca un set per espanderlo e filtrare i prodotti per famiglia, classe, sottoclasse e gruppo omogeneo tramite i chip di filtro. Clicca un prodotto per aprirne la scheda.</Bullet>
            <Bullet><span className="font-medium">Set per esposizione (ruota normale):</span> selezionando un prodotto sulla ruota, il pannello inferiore propone automaticamente i 4 set cromatici con score di qualità visiva.</Bullet>
            <Bullet><span className="font-medium">Pantone primario:</span> il colore che guida il posizionamento in ruota è il Pantone marcato come <em>principale</em> (stella) nel form prodotto admin.</Bullet>
          </ul>
        </section>

        {/* 22. Questionario */}
        <section id="survey" className="bg-white border border-border rounded-lg p-5 sm:p-6 scroll-mt-6">
          <SectionHeader n={22} icon={MessageSquare} label="Questionario" />
          <p className="text-sm text-gray-600 mb-2">
            Abbiamo inviato un breve questionario (2 minuti) per raccogliere il tuo feedback sull'app.
            Puoi rispondere cliccando il link nell'email che hai ricevuto oppure direttamente dal link nella notifica push.
          </p>
          <p className="text-xs text-gray-400">Il questionario è disponibile fino a domenica 21 giugno 2026.</p>
        </section>

        {/* 23. Assistenza tecnica */}
        <section id="assistenza-tecnica" className="bg-white border border-border rounded-lg p-5 sm:p-6 scroll-mt-6">
          <SectionHeader n={23} icon={HelpCircle} label="Assistenza tecnica" />
          <p className="text-sm text-gray-600">
            Per problemi tecnici{' '}
            <a
              href="mailto:e.mazzolari@meridiano361.it"
              className="text-accent hover:underline font-medium"
            >
              scrivici
            </a>
            . Ti risponderemo al più presto.
          </p>
        </section>

      </div>
    </div>
  );
}
