/**
 * Inhalte des erfundenen Demo-Archivs (Jonas Brandt, Abiturient, 01.03.–31.10.2026).
 * Alle Personen, Orte und Texte sind ausgedacht. Siehe docs/GLIEDERUNG.md, Abschnitt 8.
 *
 * Wichtig für die Akzeptanztests:
 * - „solarbetriebene Bienentränke“ kommt genau 4× in Einträgen vor, zuerst am 12.04.2026.
 * - „4.000 Wildbienen“ steht genau in einem Eintrag (gemeint: 400).
 * - „Robotik“ kommt nur in der Notiz „Lebenslauf“ vor (unbelegter Punkt).
 */

export type Pair = readonly [user: string, assistant: string];

export const FACHARBEIT_PAIRS: readonly Pair[] = [
  [
    'Ich schreibe meine Facharbeit über Wildbienen im Stadtpark. Wie grenze ich das Thema sinnvoll ein?',
    'Eine gute Eingrenzung wäre ein fester Standort und eine klare Frage, zum Beispiel: Welche Wildbienenarten nutzen die Blühflächen im Stadtpark zwischen März und Mai? So bleibt die Facharbeit überschaubar.',
  ],
  [
    'Wie lege ich Transekte für die Zählung im Park fest?',
    'Wähle drei bis fünf feste Strecken von etwa 50 Metern, die du immer gleich abgehst. Notiere Uhrzeit, Temperatur und Wind – dann sind deine Zählungen vergleichbar.',
  ],
  [
    'Welche Wildbienen kann ich ohne Mikroskop sicher bestimmen?',
    'Gut erkennbar sind zum Beispiel die Gehörnte Mauerbiene, die Rotpelzige Sandbiene und viele Hummeln. Bei Sandbienen reicht ein Foto oft nicht – dort lieber nur bis zur Gattung bestimmen.',
  ],
  [
    'Mein Lehrer meint, ich soll die Größe der Nisthilfen mit einbeziehen. Wie messe ich das?',
    'Miss den Durchmesser der Bohrlöcher (etwa 3 bis 9 mm) und zähle, welche Löcher belegt sind. So kannst du zeigen, ob die Größe der Röhren für die Besiedlung eine Rolle spielt.',
  ],
  [
    'Wie zitiere ich Internetquellen in der Facharbeit richtig?',
    'Gib Autor oder Herausgeber, Titel, Adresse und das Abrufdatum an. Wichtig ist, dass du eine Zitierweise durchgehend verwendest.',
  ],
  [
    'Ist es schlimm, wenn bei Regen keine Bienen unterwegs sind und meine Zählung leer bleibt?',
    'Nein, das ist auch ein Ergebnis. Dokumentiere das Wetter und plane einen Ersatztermin – leere Zählungen zeigen, wie stark die Aktivität vom Wetter abhängt.',
  ],
  [
    'Wie formuliere ich eine Hypothese für die Facharbeit?',
    'Zum Beispiel: Auf ungemähten Blühstreifen werden mehr Wildbienen beobachtet als auf gemähtem Rasen. Eine Hypothese muss sich mit deinen Daten überprüfen lassen.',
  ],
  [
    'Was schreibe ich in die Einleitung meiner Facharbeit?',
    'Beginne mit dem Problem, also dem Rückgang der Wildbienen, nenne deine Frage und kündige kurz an, wie du vorgehst. Eine halbe Seite reicht.',
  ],
  [
    'Darf ich im Stadtpark einfach Bienen fangen, um sie zu bestimmen?',
    'Viele Wildbienen sind besonders geschützt. Beobachte und fotografiere lieber, statt zu fangen – für eine Schülerarbeit reicht das völlig.',
  ],
  [
    'Wie stelle ich die Zählergebnisse übersichtlich dar?',
    'Ein Balkendiagramm pro Standort und eine Tabelle mit Arten und Anzahlen sind gut lesbar. Achte auf beschriftete Achsen und eine Legende.',
  ],
  [
    'Welche Pflanzen im Park sind für Wildbienen besonders wichtig?',
    'Frühblüher wie Weiden, Krokusse und Lungenkraut sind im März und April entscheidend. Später helfen Natternkopf, Glockenblumen und Wiesensalbei.',
  ],
  [
    'Ich hab heute 45 Minuten am Teich gezählt und fast nur Hummeln gesehen. Ist das normal?',
    'Am Wasser gibt es oft weniger Blüten – das erklärt die geringe Vielfalt. Notiere das als Standortunterschied, das ist für deine Facharbeit sogar interessant.',
  ],
  [
    'Wie lang sollte das Fazit der Facharbeit sein?',
    'Etwa eine Seite: Ergebnisse kurz zusammenfassen, die Hypothese beantworten, Grenzen der Methode nennen und einen Ausblick geben.',
  ],
  [
    'Kannst du meinen Methodikteil auf Verständlichkeit prüfen? Ich beschreibe die Zählung über drei Transekte.',
    'Der Ablauf ist nachvollziehbar. Ergänze noch, zu welchen Uhrzeiten du gezählt hast und wie du vermeidest, dieselbe Biene doppelt zu zählen.',
  ],
  [
    'Was ist der Unterschied zwischen Honigbiene und Wildbiene, kurz erklärt für die Einleitung?',
    'Honigbienen werden vom Menschen gehalten und leben in großen Völkern. Die meisten Wildbienen leben dagegen allein und sind auf bestimmte Pflanzen und Nistplätze angewiesen.',
  ],
  [
    'Wie viele Seiten hat eine Facharbeit normalerweise?',
    'Meist 10 bis 15 Seiten Text ohne Anhang. Schau aber in die Vorgaben deiner Schule, die sind verbindlich.',
  ],
];

export const ANHAENGER_PAIRS: readonly Pair[] = [
  [
    'Ich will einen Fahrradanhänger für Einkäufe bauen. Holz oder Aluprofile?',
    'Für den ersten Anhänger ist eine Siebdruckplatte auf einem Rahmen aus Aluvierkantrohr ein guter Kompromiss: leicht, stabil und gut zu verarbeiten.',
  ],
  [
    'Welche Größe sollte die Ladefläche vom Anhänger haben?',
    'Etwa 60 × 80 cm passt für zwei Getränkekisten und bleibt schmaler als der Lenker. Prüf die Breite trotzdem an engen Radwegen.',
  ],
  [
    'Wie viel Gewicht darf ein Fahrradanhänger tragen?',
    'Viele Hersteller geben 40 bis 60 kg an. Bei einem selbstgebauten Anhänger würde ich mit 30 kg planen und die Achse großzügig auslegen.',
  ],
  [
    'Brauche ich am Anhänger Reflektoren oder Licht?',
    'Rückstrahler hinten und seitlich sind Pflicht. Bei Dunkelheit kommt eine Rückleuchte dazu, wenn der Anhänger das Rücklicht vom Fahrrad verdeckt.',
  ],
  [
    'Wie befestige ich die Deichsel so, dass sie in Kurven nicht wackelt?',
    'Nutze zwei Befestigungspunkte am Rahmen und ein Gelenk, das nur in der Drehachse Spiel hat. Ein Gummipuffer dämpft Stöße.',
  ],
  [
    'Welche Schrauben nehme ich, damit sich am Anhänger nichts losvibriert?',
    'Sicherungsmuttern mit Kunststoffring oder flüssige Schraubensicherung. Kontrolliere die Verbindungen nach den ersten Fahrten.',
  ],
  [
    'Lohnt sich ein Kugellager an der Anhängerkupplung?',
    'Für Alltagsfahrten nicht unbedingt – ein robustes Gelenk aus Gummi oder Kunststoff reicht und ist leichter zu warten.',
  ],
  [
    'Wie teste ich den Anhänger sicher, bevor ich damit auf die Straße fahre?',
    'Erst leer auf einem Parkplatz, dann mit langsam steigendem Gewicht. Teste Bremsen, enge Kurven und das Fahren über Bordsteinkanten.',
  ],
];

export const BEWERBUNG_PAIRS: readonly Pair[] = [
  [
    'Wie fange ich ein Anschreiben für einen Nebenjob an, ohne langweilig zu klingen?',
    'Steig mit einem konkreten Bezug ein, zum Beispiel warum dir das Café gefällt. Danach zwei bis drei Stärken mit kurzen Beispielen.',
  ],
  [
    'Was ziehe ich zum Vorstellungsgespräch im Café an?',
    'Ordentlich, aber nicht verkleidet: saubere Jeans oder Chino und ein schlichtes Shirt oder Hemd passen gut.',
  ],
  [
    'Welche Fragen kann ich am Ende vom Vorstellungsgespräch stellen?',
    'Zum Beispiel: Wie sieht eine typische Schicht aus? Wie werden neue Leute eingearbeitet? Wie flexibel ist die Planung in der Abiturphase?',
  ],
  [
    'Wie viele Stunden kann ich neben dem Abi sinnvoll arbeiten?',
    'Plane realistisch, zum Beispiel zwei Schichten pro Woche, damit genug Zeit für die Prüfungsvorbereitung bleibt. Rechtlich gelten mit 18 die normalen Regeln.',
  ],
  [
    'Soll ich ein Foto in die Bewerbung packen?',
    'Ein Foto ist in Deutschland freiwillig. Wenn, dann ein freundliches, aktuelles Bild mit ruhigem Hintergrund.',
  ],
  [
    'Wie erkläre ich, dass ich noch keine Erfahrung in der Gastronomie habe?',
    'Betone übertragbare Erfahrungen: Zuverlässigkeit, Umgang mit Menschen, schnelles Lernen. Ehrlich bleiben wirkt besser als übertreiben.',
  ],
  [
    'Was ist ein Minijob genau?',
    'Ein Minijob ist eine Beschäftigung mit einer monatlichen Verdienstgrenze. Für dich fallen in der Regel keine Steuern an; die Einzelheiten erklärt die Minijob-Zentrale.',
  ],
  [
    'Wie lange sollte ich nach der Bewerbung warten, bevor ich nachfrage?',
    'Etwa eine Woche. Eine kurze, freundliche Nachfrage per Mail oder Telefon ist völlig in Ordnung.',
  ],
];

export const ALLGEMEIN_PAIRS: readonly Pair[] = [
  [
    'Kannst du mir partielle Integration an einem einfachen Beispiel erklären?',
    'Gern: Für das Integral von x·eˣ setzt du u = x und v′ = eˣ. Dann ergibt sich x·eˣ − ∫ eˣ dx = (x − 1)·eˣ + C.',
  ],
  [
    'Wie strukturiere ich einen Essay auf Englisch über Social Media?',
    'Introduction mit These, zwei bis drei Argumente mit Beispielen, ein Gegenargument und eine Conclusion. Verbinde die Absätze mit klaren Linking Words.',
  ],
  [
    'Welche Route für Interrail, wenn ich zwei Wochen Zeit habe?',
    'Zum Beispiel Berlin – Prag – Wien – Ljubljana – Venedig – München. Plane Puffertage ein und reserviere Nachtzüge früh.',
  ],
  [
    'Ich schaffe es nicht, morgens zu lernen. Hast du Tipps?',
    'Lege feste Lernblöcke am Nachmittag fest, je 50 Minuten mit Pausen. Wichtig ist Regelmäßigkeit, nicht die Uhrzeit.',
  ],
  [
    'Wie bereite ich mich auf eine mündliche Prüfung in Bio vor?',
    'Erkläre die Themen laut, als würdest du sie jemandem beibringen. Übe mit Karteikarten und mit jemandem, der dir Fragen stellt.',
  ],
  [
    'Was ist der Unterschied zwischen Biologie und Umweltwissenschaften im Studium?',
    'Biologie ist breiter und grundlagenorientiert. Umweltwissenschaften verbinden Natur-, Technik- und Sozialwissenschaften stärker mit Anwendungen.',
  ],
  [
    'Wie schreibe ich eine gute Mail an eine Lehrerin wegen einer Fristverlängerung?',
    'Kurz und höflich: Anlass nennen, den Grund ehrlich erklären, einen konkreten neuen Termin vorschlagen und dich bedanken.',
  ],
  [
    'Welche Bücher über Natur kannst du für die Ferien empfehlen?',
    'Gut lesbar sind populärwissenschaftliche Bücher über Insekten, Vögel oder Wälder. In der Stadtbibliothek kannst du vorher reinlesen.',
  ],
  [
    'Wie plane ich meine Woche, wenn Schule, Sport und Nebenjob zusammenkommen?',
    'Trag zuerst feste Termine ein, dann Lernblöcke, dann Freizeit. Ein Puffer pro Tag verhindert, dass alles kippt.',
  ],
  [
    'Wie funktioniert die Notenberechnung im Abitur grob?',
    'Die Gesamtqualifikation setzt sich aus den Kursen der Qualifikationsphase und den Prüfungen zusammen. Die Details regelt die Oberstufenverordnung deines Landes.',
  ],
];

/** Allgemeine Nachfragen, die in jeden Faden passen. */
export const FOLLOW_UP_PAIRS: readonly Pair[] = [
  [
    'Danke! Kannst du das in drei Stichpunkten zusammenfassen?',
    'Gern: 1. Ziel klar festlegen. 2. Schritt für Schritt vorgehen. 3. Ergebnisse direkt notieren.',
  ],
  [
    'Okay, und was wäre dabei der häufigste Fehler?',
    'Meist fehlt eine saubere Dokumentation. Schreib dir direkt auf, was du gemacht hast, dann kannst du später alles nachvollziehen.',
  ],
  [
    'Gibt es dazu eine gute Quelle, die ich mir merken sollte?',
    'Am besten eine Fachquelle aus der Bibliothek oder von einer Hochschule. Notiere dir gleich Titel, Autor und Datum.',
  ],
  ['Klingt gut, ich probier das morgen aus.', 'Viel Erfolg! Erzähl gern, wie es gelaufen ist.'],
  [
    'Kannst du das noch einmal einfacher erklären?',
    'Sicher: Fang mit dem kleinsten Schritt an, prüfe das Ergebnis und mach erst dann weiter.',
  ],
  [
    'Wie viel Zeit sollte ich dafür einplanen?',
    'Rechne mit ein bis zwei Stunden und plane einen Puffer ein, falls etwas länger dauert.',
  ],
];

/** Formulierungen, wenn eine Frage in einem späteren Gespräch erneut auftaucht. */
export const REPEAT_PREFIXES: readonly string[] = [
  'Noch mal kurz:',
  'Ich hatte das schon mal gefragt, aber:',
  'Zur Sicherheit noch einmal:',
  'Mir ist wieder eingefallen:',
];

// ---------------------------------------------------------------------------
// Besondere Einträge (Akzeptanztests)
// ---------------------------------------------------------------------------

export const PAIR_4000_WILDBIENEN: Pair = [
  'Laut meiner ersten Zählung leben im Stadtpark etwa 4.000 Wildbienen in 23 Arten. Klingt das plausibel?',
  'Bei 23 Arten auf einer Parkfläche ist das eine bemerkenswerte Vielfalt. Die Gesamtzahl hängt stark von deiner Hochrechnung ab – prüfe, wie du von den gezählten Tieren auf die ganze Fläche geschlossen hast.',
];

export const PAIR_BIENENTRAENKE_IDEE: Pair = [
  'Heute am Rosenbeet gezählt: viele Mauerbienen, die immer wieder an die Pfütze am Weg fliegen. Dabei ist mir eine Idee gekommen: eine solarbetriebene Bienentränke für den Stadtpark, mit einer kleinen Pumpe, damit das Wasser nicht kippt.',
  'Schöne Idee! Wildbienen brauchen tatsächlich Wasser, und Mauerbienen zusätzlich feuchten Lehm für ihre Nester. Eine flache Tränke mit Steinen wäre auch ein guter Ausblick für das Fazit deiner Facharbeit.',
];

export const PAIRS_PYTHON: readonly Pair[] = [
  [
    'Ich will die Zähldaten für die Facharbeit mit Python auswerten. Reicht eine CSV-Datei und pandas?',
    'Ja, das passt gut: Lies die CSV mit pandas ein, gruppiere nach Standort und Datum und erstelle die Diagramme mit matplotlib.',
  ],
  [
    'Mein Python-Skript zählt Arten doppelt, wenn ein Name am Ende ein Leerzeichen hat.',
    'Bereinige die Spalte vorher mit str.strip() und vereinheitliche die Schreibweise mit str.lower(). Danach stimmt das Gruppieren.',
  ],
];

export const PAIR_BEWERBUNG_BELEGE: Pair = [
  'Was soll ich in die Bewerbung fürs Café Lindner schreiben? Ich kann Python – damit habe ich die Zählungen für meine Facharbeit ausgewertet – und ich habe ein zweiwöchiges Praktikum bei der Stadtgärtnerei gemacht.',
  'Beides ist gut: Das Praktikum zeigt Zuverlässigkeit und Teamarbeit, die Python-Auswertung zeigt, dass du dich selbstständig in etwas einarbeitest. Für das Café würde ich das Praktikum stärker betonen.',
];

export const PAIRS_SOLARPUMPE: readonly Pair[] = [
  [
    'Ich will meine solarbetriebene Bienentränke endlich bauen. Welche Solarpumpe reicht für eine flache Schale?',
    'Eine kleine 5-Volt-Solarpumpe mit 1 bis 2 Watt reicht völlig. Wichtig ist eine flache Wasserstelle mit Steinen als Landeplatz, damit keine Biene ertrinkt.',
  ],
  [
    'Brauche ich einen Akku, damit die Pumpe auch bei Wolken läuft?',
    'Nicht zwingend – Bienen fliegen ohnehin vor allem bei Sonne. Ein kleiner Pufferakku überbrückt aber kurze Wolkenphasen.',
  ],
  [
    'Wie verhindere ich Algen im Wasser?',
    'Wasser regelmäßig wechseln und die Schale in den Halbschatten stellen. Die Bewegung durch die Pumpe hilft zusätzlich.',
  ],
  ['Was kostet das ungefähr?', 'Mit Pumpe, Schale und Steinen kommst du auf etwa 20 bis 30 Euro.'],
];

/** Faden mit einem eingefügten Chat eines Freundes – Test für „Dieses Gespräch ist nicht von mir“. */
export const PAIRS_MALTE: readonly Pair[] = [
  [
    'Ich füge mal den Chat von meinem Freund Malte ein, er braucht Rat:\n„Hey, ich will mir endlich eine E-Gitarre kaufen, Budget so 400 €. Lieber gebraucht oder neu?“',
    'Für 400 € bekommt Malte gebraucht oft deutlich mehr Qualität. Wichtig: vor Ort anspielen, Hals und Bünde prüfen und auf Kratzgeräusche an den Reglern achten.',
  ],
  [
    'Malte: „Ich spiele eher Indie und ein bisschen Punk. Brauche ich dann einen Humbucker?“',
    'Für Indie passen Single Coils sehr gut, für Punk sind Humbucker kräftiger. Eine Gitarre mit beiden Varianten wäre ein guter Kompromiss.',
  ],
  [
    'Malte: „Und welcher Verstärker für zu Hause, ohne dass die Nachbarn durchdrehen?“',
    'Ein kleiner Modeling-Verstärker mit Kopfhörerausgang ist ideal – leise spielbar und mit vielen Klängen zum Ausprobieren.',
  ],
  [
    'Malte: „Lohnt sich Unterricht oder reichen Videos?“',
    'Videos sind super für Songs, ein paar Stunden Unterricht helfen aber, früh eine saubere Technik zu lernen.',
  ],
];

// ---------------------------------------------------------------------------
// WhatsApp-Fäden: [vonJonas, Text]
// ---------------------------------------------------------------------------

export type ChatLine = readonly [fromJonas: boolean, text: string];

export const WHATSAPP_OPA: readonly ChatLine[] = [
  [false, 'Na Jonas, wie weit ist dein Anhänger? Ich hab noch Vierkantrohr im Keller.'],
  [true, 'Echt? Das wäre super! Ich bräuchte so 4 Meter, 20 × 20 mm.'],
  [false, 'Müsste passen. Komm Samstag vorbei, dann schneiden wir das zusammen.'],
  [true, 'Mach ich! Hast du die Metallsäge in der Werkstatt?'],
  [false, 'Alles in der Werkstatt. Und zieh alte Sachen an 😉'],
  [true, 'Haha, okay. Danke, Opa!'],
  [false, 'Schick mal ein Foto, wenn der Rahmen fertig ist.'],
  [true, 'Mach ich, wahrscheinlich nächste Woche.'],
];

export const WHATSAPP_LERNGRUPPE: readonly ChatLine[] = [
  [false, 'Lea: Wer hat die Unterlagen zur Fotosynthese?'],
  [true, 'Hab ich, schick ich gleich als PDF.'],
  [false, 'Tim: Treffen wir uns Dienstag in der Bibliothek?'],
  [true, 'Dienstag passt, aber erst ab 15 Uhr, vorher zähle ich Bienen für die Facharbeit.'],
  [false, 'Lea: Du und deine Bienen 😄 Wie läuft es?'],
  [
    true,
    'Ganz gut, am Rosenbeet ist richtig was los. Die Größe der Nisthilfen macht echt einen Unterschied.',
  ],
  [false, 'Tim: Bring Kekse mit, dann verzeihen wir dir alles.'],
  [true, 'Abgemacht.'],
];

export const WHATSAPP_FAMILIE: readonly ChatLine[] = [
  [false, 'Mama: Denk an Omas Geburtstag am Sonntag!'],
  [true, 'Steht im Kalender. Ich bringe den Kuchen aus dem Café mit, ich hab Samstag Schicht.'],
  [false, 'Papa: Klappt der neue Job gut?'],
  [true, 'Ja, die Leute sind nett. Nur das Milchschäumen muss ich noch üben.'],
  [false, 'Mama: Und vergiss über das ganze Arbeiten die Schule nicht 😉'],
  [true, 'Keine Sorge, Mathe läuft gerade richtig gut.'],
];

// ---------------------------------------------------------------------------
// Sprachmemos und kurze Notizen (Einträge ohne Faden): [Datum, Uhrzeit, Text]
// ---------------------------------------------------------------------------

export type Loose = readonly [date: string, time: string, text: string];

export const VOICE_MEMOS: readonly Loose[] = [
  [
    '2026-03-05',
    '07:42',
    'Für die Facharbeit morgen früh die Temperatur am Teich messen und die Uhrzeit aufschreiben.',
  ],
  [
    '2026-03-14',
    '16:10',
    'Mir fällt gerade ein: Ich sollte die Transekte mit Kreide markieren, sonst laufe ich jedes Mal anders.',
  ],
  ['2026-03-27', '11:05', 'Heute die erste Gehörnte Mauerbiene gesehen, am Weidenstrauch beim Spielplatz.'],
  [
    '2026-04-18',
    '18:30',
    'Idee für die Facharbeit: gemähte und ungemähte Fläche vergleichen, das wäre eine klare Hypothese.',
  ],
  ['2026-05-03', '13:15', 'Muss Herrn Albers fragen, ob die Facharbeit einen Anhang mit Fotos haben darf.'],
  ['2026-05-21', '17:48', 'Anhänger: Ladefläche lieber 60 mal 80, sonst passt er nicht durch das Gartentor.'],
  [
    '2026-06-03',
    '19:22',
    'Noch mal zur solarbetriebenen Bienentränke: Vielleicht kann ich das Solarpanel vom Fahrradanhänger mitbenutzen.',
  ],
  [
    '2026-06-11',
    '08:05',
    'Für die Bewerbung noch das Praktikumszeugnis von der Stadtgärtnerei raussuchen und kopieren.',
  ],
  ['2026-06-30', '20:12', 'Die Anhängerkupplung wackelt noch, ich brauche einen Gummipuffer.'],
  ['2026-07-16', '15:40', 'Probefahrt mit dem Anhänger und zwei Getränkekisten – hat super funktioniert!'],
  ['2026-07-27', '21:03', 'Für Interrail: Nachtzug nach Wien rechtzeitig reservieren.'],
  ['2026-08-15', '12:20', 'Vorstellungsgespräch lief gut, die Chefin hat sogar nach meinen Bienen gefragt.'],
  ['2026-09-02', '18:55', 'Erster Arbeitstag im Café. Milchschaum ist schwieriger als gedacht.'],
  [
    '2026-09-20',
    '10:30',
    'Ich sollte überlegen, ob ich die Facharbeit beim Umweltpreis der Stadt einreiche.',
  ],
  ['2026-10-06', '16:45', 'Studienberatung am Donnerstag – Fragen zu Umweltinformatik vorbereiten.'],
  [
    '2026-10-25',
    '22:10',
    'Rückblick: seit März so viel passiert. Facharbeit fertig, Anhänger gebaut, Job gefunden.',
  ],
];

export const JOTTINGS: readonly Loose[] = [
  ['2026-03-02', '19:00', 'Thema der Facharbeit steht: Wildbienen im Stadtpark.'],
  ['2026-03-08', '10:15', 'Bestimmungsbuch für Wildbienen in der Stadtbibliothek ausleihen.'],
  ['2026-03-16', '21:30', 'Zähltermine: Di, Do, Sa jeweils 10–11 Uhr.'],
  ['2026-03-25', '17:20', 'Mathe-Klausur: partielle Integration wiederholen.'],
  ['2026-04-02', '16:00', 'Nisthilfe am Schuppen aufgehängt, Bohrlöcher 3 bis 9 mm.'],
  ['2026-04-28', '20:40', 'Facharbeit: Diagramme fertig, die Tabelle über alle Standorte fehlt noch.'],
  ['2026-05-12', '07:30', 'Abgabe der Facharbeit am 29.05.!'],
  ['2026-05-30', '18:10', 'Materialliste für den Anhänger an Opa geschickt.'],
  ['2026-06-18', '13:00', 'Café Lindner sucht eine Aushilfe – Aushang am Markt.'],
  ['2026-07-08', '19:45', 'Achse 20 mm – vielleicht die Steckachse vom alten Kinderanhänger?'],
  [
    '2026-07-21',
    '22:05',
    'Idee wieder aufgegriffen: die solarbetriebene Bienentränke als Beitrag für den Schulgarten-Wettbewerb einreichen.',
  ],
  ['2026-08-05', '09:50', 'Interrail-Pass gebucht.'],
  ['2026-08-20', '20:00', 'Fragen fürs Vorstellungsgespräch ausgedruckt.'],
  ['2026-09-01', '17:35', 'Arbeitsvertrag unterschrieben: Minijob, zwei Schichten pro Woche.'],
  ['2026-09-12', '11:25', 'Buchtipp merken: etwas über Insekten im Herbst lesen.'],
  ['2026-09-29', '18:40', 'Omas Geburtstag – Kuchen bestellt.'],
  ['2026-10-03', '14:15', 'Rückmeldung zur Facharbeit: 13 Punkte!'],
  ['2026-10-10', '16:20', 'Studiengänge vergleichen: Biologie, Umweltinformatik, Landschaftsökologie.'],
  ['2026-10-21', '19:10', 'Bewerbungsfrist für die Uni notieren: 15. Juli.'],
  ['2026-10-30', '21:15', 'Ziel: die Ergebnisse der Facharbeit dem Grünflächenamt zeigen.'],
];

// ---------------------------------------------------------------------------
// Notizen (Markdown): [Pfad, Titel, Datum, Text, Ordner]
// ---------------------------------------------------------------------------

export type FolderKey = 'facharbeit' | 'bienen';
export type NoteSpec = readonly [
  path: string,
  title: string,
  date: string,
  body: string,
  folders: readonly FolderKey[],
];

export const NOTES: readonly NoteSpec[] = [
  [
    'Bewerbung/Lebenslauf.md',
    'Lebenslauf',
    '2026-06-19',
    '# Lebenslauf\n\n- Abitur 2027 (voraussichtlich), Leistungskurse Biologie und Mathematik\n- Programmierkenntnisse: Python (Datenauswertung)\n- Praktikum: Stadtgärtnerei, zwei Wochen\n- Leitung der Robotik-AG\n- Ehrenamt: Jugendfeuerwehr\n- Führerschein Klasse B',
    [],
  ],
  [
    'Projekte/Facharbeit/Gliederung.md',
    'Facharbeit – Gliederung',
    '2026-03-11',
    '# Gliederung\n\n1. Einleitung: Rückgang der Wildbienen\n2. Methodik: Transekte im Stadtpark\n3. Ergebnisse\n4. Diskussion\n5. Fazit und Ausblick',
    ['facharbeit'],
  ],
  [
    'Projekte/Facharbeit/Methodik.md',
    'Facharbeit – Methodik',
    '2026-03-12',
    'Drei Transekte à 50 m: Rosenbeet, Teich und die Wiese am Spielplatz. Zählung jeweils 45 Minuten, Temperatur und Wind notieren.',
    ['facharbeit'],
  ],
  [
    'Projekte/Facharbeit/Quellen.md',
    'Facharbeit – Quellen',
    '2026-03-30',
    '- Bestimmungsbuch Wildbienen (Stadtbibliothek)\n- Artikel über Blühstreifen in Städten\n- Zählanleitung eines Naturschutzverbands',
    ['facharbeit'],
  ],
  [
    'Projekte/Facharbeit/Artenliste.md',
    'Artenliste Stadtpark',
    '2026-04-01',
    '- Gehörnte Mauerbiene\n- Rote Mauerbiene\n- Rotpelzige Sandbiene\n- Ackerhummel\n- Steinhummel\n- Furchenbienen (nur Gattung)',
    ['facharbeit', 'bienen'],
  ],
  [
    'Projekte/Facharbeit/Zähltermine.md',
    'Zähltermine',
    '2026-03-16',
    'Di, Do, Sa 10–11 Uhr. Bei Regen Ersatztermin am nächsten Tag.',
    ['facharbeit'],
  ],
  [
    'Projekte/Bienen/Nisthilfen.md',
    'Nisthilfen',
    '2026-04-03',
    'Bohrlöcher 3–9 mm in Hartholz bohren, nicht ins Stirnholz. Die Größe der Löcher entscheidet, welche Arten einziehen.',
    ['bienen'],
  ],
  [
    'Projekte/Facharbeit/Ergebnisse.md',
    'Facharbeit – Ergebnisse',
    '2026-05-02',
    'Rosenbeet: höchste Vielfalt. Teich: fast nur Hummeln. Auf der ungemähten Wiese deutlich mehr Wildbienen als auf dem Rasen.',
    ['facharbeit'],
  ],
  [
    'Projekte/Facharbeit/Fazit.md',
    'Facharbeit – Fazit',
    '2026-05-15',
    'Hypothese bestätigt: Ungemähte Blühstreifen fördern Wildbienen. Grenze: nur eine Saison beobachtet.',
    ['facharbeit'],
  ],
  [
    'Projekte/Facharbeit/Präsentation.md',
    'Präsentation Facharbeit',
    '2026-05-26',
    '10 Minuten, 8 Folien, Fotos vom Rosenbeet zeigen. Am Ende ein Ausblick auf Nisthilfen im Park.',
    ['facharbeit'],
  ],
  [
    'Projekte/Bienen/Begriffe.md',
    'Wildbienen – Begriffe',
    '2026-03-20',
    '- solitär: allein lebend\n- oligolektisch: auf wenige Pflanzen spezialisiert\n- Transekt: feste Zählstrecke',
    ['facharbeit', 'bienen'],
  ],
  [
    'Wissen/Python.md',
    'Python-Notizen',
    '2026-04-23',
    'pandas: read_csv, groupby, plot. Leerzeichen in Namen mit str.strip() entfernen.',
    ['facharbeit'],
  ],
  [
    'Wissen/Statistik.md',
    'Statistik-Grundlagen',
    '2026-04-24',
    'Mittelwert, Median, Streuung. Bei kleinen Stichproben vorsichtig mit Schlüssen sein.',
    [],
  ],
  [
    'Projekte/Anhänger/Materialliste.md',
    'Fahrradanhänger – Materialliste',
    '2026-05-17',
    '- Aluvierkantrohr 20 × 20 mm, 4 m\n- Siebdruckplatte 60 × 80 cm\n- 2 Räder, 16 Zoll\n- Steckachse\n- Sicherungsmuttern',
    [],
  ],
  [
    'Projekte/Anhänger/Maße.md',
    'Fahrradanhänger – Maße',
    '2026-05-22',
    'Ladefläche 60 × 80 cm, Deichsel 1,10 m, Gesamtbreite unter 90 cm.',
    [],
  ],
  [
    'Projekte/Anhänger/Kupplung.md',
    'Fahrradanhänger – Kupplung',
    '2026-06-15',
    'Gummigelenk statt Kugellager, zwei Befestigungspunkte am Rahmen.',
    [],
  ],
  [
    'Projekte/Anhänger/Probefahrt.md',
    'Fahrradanhänger – Probefahrt',
    '2026-07-16',
    'Mit zwei Getränkekisten gut. In engen Kurven langsam fahren.',
    [],
  ],
  [
    'Bewerbung/Anschreiben Café Lindner.md',
    'Bewerbung – Anschreiben Café Lindner',
    '2026-06-21',
    'Bezug zum Café: komme seit Jahren gern her. Stärken: zuverlässig, lerne schnell, freundlich.',
    [],
  ],
  [
    'Bewerbung/Fragen fürs Gespräch.md',
    'Bewerbung – Fragen fürs Gespräch',
    '2026-08-20',
    '- Wie sieht eine typische Schicht aus?\n- Wie läuft die Einarbeitung?\n- Ist die Planung in der Abiturphase flexibel?',
    [],
  ],
  [
    'Bewerbung/Minijob.md',
    'Minijob – Regeln',
    '2026-09-08',
    'Verdienstgrenze im Blick behalten und Stunden notieren.',
    [],
  ],
  [
    'Schule/Lernplan Mathe.md',
    'Abi – Lernplan Mathe',
    '2026-03-23',
    'Analysis: Integrale, Extremwerte. Stochastik: Binomialverteilung. Jeden Mo und Mi 50 Minuten.',
    [],
  ],
  [
    'Schule/Englisch.md',
    'Abi – Englisch',
    '2026-06-29',
    'Essay-Struktur: Introduction, Arguments, Counterargument, Conclusion. Linking Words üben.',
    [],
  ],
  [
    'Freizeit/Interrail.md',
    'Interrail – Route',
    '2026-08-03',
    'Berlin – Prag – Wien – Ljubljana – Venedig – München. Nachtzug nach Wien reservieren.',
    [],
  ],
  [
    'Freizeit/Bücherliste.md',
    'Bücherliste',
    '2026-07-01',
    '- ein Sachbuch über Insekten\n- ein Roman für den Zug\n- etwas über Wälder',
    [],
  ],
  [
    'Ideen.md',
    'Ideen-Sammlung',
    '2026-05-05',
    '- Nisthilfen im Schulgarten\n- Ergebnisse der Facharbeit dem Grünflächenamt zeigen\n- Patenschaft für einen Blühstreifen',
    [],
  ],
  [
    'Zukunft/Studienwahl.md',
    'Studienwahl',
    '2026-10-11',
    'Biologie (breit) oder Umweltinformatik (Daten und Natur) oder Landschaftsökologie. Tage der offenen Tür im Januar.',
    [],
  ],
  [
    'Freizeit/Training.md',
    'Sport – Trainingsplan',
    '2026-04-08',
    'Mo 5 km laufen, Do schwimmen. Vor Klausuren etwas weniger.',
    [],
  ],
  [
    'Wochenplanung.md',
    'Wochenplanung',
    '2026-09-05',
    'Schule, Café-Schichten Di und Sa, Training Mo und Do, Lernen Mo, Mi und Fr.',
    [],
  ],
  [
    'Projekte/Facharbeit/Umweltpreis.md',
    'Umweltpreis der Stadt',
    '2026-09-21',
    'Einreichung bis 30.11. Facharbeit auf 5 Seiten kürzen und Fotos auswählen.',
    ['facharbeit'],
  ],
  [
    'Rückblick Sommer.md',
    'Rückblick Sommer',
    '2026-09-30',
    'Anhänger fertig, Job im Café, Interrail im August. Facharbeit mit 13 Punkten bewertet.',
    [],
  ],
];

/** Tagesnotizen: [Datum, Text] */
export const DAILY_NOTES: readonly (readonly [string, string])[] = [
  ['2026-03-02', 'Heute das Thema für die Facharbeit festgelegt. Bin gespannt.'],
  ['2026-03-18', 'Erste richtige Zählung, sonnig, 14 °C. Viel los am Rosenbeet.'],
  ['2026-04-12', 'Langer Tag im Park. Abends noch Mathe.'],
  ['2026-04-29', 'Diagramme gebaut, Python macht langsam Spaß.'],
  ['2026-05-29', 'Facharbeit abgegeben! Erst mal durchatmen.'],
  ['2026-06-21', 'Bewerbung abgeschickt. Danach mit Opa am Anhänger geschraubt.'],
  ['2026-07-16', 'Probefahrt mit dem Anhänger – läuft.'],
  ['2026-08-15', 'Vorstellungsgespräch geschafft, gutes Gefühl.'],
  ['2026-09-02', 'Erster Tag im Café. Müde, aber zufrieden.'],
  ['2026-10-03', '13 Punkte für die Facharbeit! Abends mit der Familie gefeiert.'],
];
