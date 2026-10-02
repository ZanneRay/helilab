# HeliLab — inhoudelijke en didactische review

Datum: 2 oktober 2026. Scope: het volledige zelfstandige leerpad met 29 activiteiten, de 19 naslaglessen, de modeluitleg en de toetsvragen. Deze review volgt op de navigatie- en bewijsverbeteringen in PR #86.

De belangrijkste tekortkoming was inconsistentie tussen uitleg, modeltoestand en de conclusie die een opdracht vroeg. Sommige teksten gebruikten een vergelijking bij vaste pitch om een conclusie over gelijke lift te trekken. Andere teksten presenteerden vereenvoudigde modelgrenzen als echte vlieglimieten. Deze problemen zijn in de app aangepast; dit document beschrijft de wijzigingen en de resterende evaluatie.

## Inhoudelijke bevindingen en uitgevoerde correcties

| Onderwerp | Bevinding | Uitgevoerde wijziging |
|---|---|---|
| Pitch en invalshoek | De uitleg veronderstelde dat inflow altijd positief was en reduceerde lift tot alleen α. | Getekende componenten, gesigneerde φ en α = θ − φ expliciet gemaakt; dichtheid, snelheid, oppervlak en coëfficiënt onderscheiden. Een upflow-rekenvoorbeeld toegevoegd. |
| Snelheidsdriehoek | Het widget combineerde getrimde pitch, absolute throughflow en natuurlijke ongetrimde flapping. De kaart en driehoek waren verschillende berekeningen, terwijl de tekst gelijkheid suggereerde. | De driehoek gebruikt één getrimde toestand en de bestaande gedeelde gesigneerde snelheidsdecompositie, inclusief blade-motion-termen. De optionele kaart krijgt een eigen duidelijk benoemde aanname. |
| Radiale vergelijking | Een hogere lokale snelheid werd soms gelijkgesteld aan een vaste liftverhouding. | Ωr, dynamische druk en werkelijke lokale lift onderscheiden. De moduletransfer toetst nu ook radiaal redeneren. |
| Hover | Dunnere lucht werd ten onrechte als meer vereiste thrust beschreven; ideale induced power en totaalvermogen liepen door elkaar. | Vergelijkingen bij gelijke massa versus gewijzigde massa uitgesplitst; T ≈ W bij trim en de voorwaarden van de ideale vermogensverhouding toegevoegd. |
| Collectieve pitch en tijd | De statische vergelijking suggereerde een gemeten volgorde van flowveranderingen of een afgeronde klim. | De eerste bedieningsverandering onderscheiden van de gekoppelde eindtoestand. Een thrustoverschot geeft een versnellingstendens, geen bewezen vliegtraject. |
| Grondeffect | Vaste collective, vast vermogen en gelijke thrust werden in één verklaring samengevoegd. Er waren harde uitspraken over hoogtegrenzen. | Elk vergelijkingsregime apart uitgelegd; rotorhoogte/radius verduidelijkt; continue verandering en beperkingen van de hoogtecorrectie benoemd. |
| Verticale flow/VRS | Naslagvragen en teksten gaven een generieke herstelprocedure en numerieke banden als algemene grenzen. | Vragen en uitleg richten zich op flowmechanisme en modelgeldigheid. Illustratieve banden bepalen geen vliegtuigprocedure of gevalideerde trajectberekening. |
| Dissymmetrie | Lift ∝ snelheid² en automatische volledige compensatie waren ongekwalificeerde claims. | Dynamische-drukproxy als zodanig benoemd; voorwaarden voor een liftverhouding en onderscheid tussen lokale asymmetrie en geïntegreerde rotortrim toegevoegd. |
| Flapping | Verplaatsing en snelheid werden verward; 90° fase werd als universele gyroscoopregel uitgelegd. | Flap rate, verplaatsing, coning en pitch onderscheiden. Fase als configuratie-afhankelijke dynamische respons beschreven. |
| Cyclic-laag | De tekst zei tegelijk dat de disc level was en thrust naar voren bleef wijzen. | Discoriëntatie, velocity en thrust apart uitgelegd. De level-disc teaching trim impliceert geen voorwaartse thrustcomponent. |
| Inflow roll | Genormaliseerde wake-skew en absolute inflowgradiënt werden verwisseld. | Geïnduceerde flow, totale U_P, coning, gemiddelde inflow en relatieve/absolute gradiënt onderscheiden. Flapback en fore-aft inflow roll blijven aparte mechanismen. |
| Coriolis | De voorgeschreven lead/lag-curve werd als echte dynamische oplossing gepresenteerd. | Positieve-coning/geometrie-aanname benoemd. De getoonde gain × dβ/dψ is een illustratie; massamiddelpuntgeometrie, demping en lagfase worden niet opgelost. |
| Envelope | Er stonden universele tip-first-claims, V_NE-verdicts en voorspelde symptomen. | Labels zijn nu modeldiagnostiek. Mach- en α-grenzen zijn aannames. Initiële instelling is Extended; Foundation blijft een expliciet andere optionele benadering. |
| Yaw/LTE | Weathercock-effect werd als tail-rotor thrustverlies uitgelegd; een verzonnen marge gaf een controllability-verdict. Overlappende sectoren werden maar één keer getoond. | Fuselage/fin-moment onderscheiden van tail-rotor flowverandering; de marge en yaw-verdict verwijderd. Alle overlappende mechanismen zichtbaar; bij nul wind geen actief windmechanisme. Geen gevalideerde H145/Fenestron-sectoren gesuggereerd. |
| Autorotatie | De driving region werd de oorspronkelijke energiebron genoemd; vaste regions en directe recoverability-conclusies waren te stellig. | Energiereservoir, lokale torque, totaalbalans, vermogen en opgeslagen energie onderscheiden. Fixed-RPM-map blijft een kwalitatieve toestandsvergelijking. |
| Vermogenscurve | Minimaal vermogen werd universeel gelijkgesteld aan endurance, climb en autorotative descent; beschikbaar vermogen werd in een opdracht gevraagd terwijl het niet was getoond. | Markers heten min P en min P/V. Fuel flow, wind en beschikbaar vermogen zijn extra voorwaarden. De opdracht vergelijkt required-power-componenten en vraagt welke beschikbaarheidsdata ontbreken. |
| Eindcasussen | Afleiders gaven vaak het antwoord weg; sommige datasets ontbraken bij de conclusie. | Casus A bevat gematchte shaft-power-data en lokale θ/φ-data. Casus B vermeldt alle resisting loads en toetst energietoestand versus actuele energiestroom. |

## Pedagogische beoordeling

De route oefent conceptuele aerodynamische competenties: voorspellen onder benoemde voorwaarden, een relevante modelvergelijking kiezen, gegevens interpreteren, een mechanisme verklaren en een beperking aangeven. De zeven module-uitkomsten worden gekoppeld aan observeerbaar werk. De volgorde blijft basis → deelmechanisme → gecontroleerde oefening → transfer → geïntegreerde casus.

Alle activiteiten zijn op dezelfde samenhang bekeken: **uitkomst → taak → bewijs → vraag → feedback**. De onderstaande tabel legt de inhoudelijke dekking vast. In gewone oefening volstaan de gevraagde vergelijking, de relevante beslissing en zelfreview. Transfer vraagt een eigen verklaring en een beperking. De vrije verklaring wordt inhoudelijk door een mens beoordeeld, niet door een completion-vinkje.

| Stap | Activiteit | Inhoudelijk zwaartepunt van de review |
|---|---|---|
| 1.1 | How a Helicopter Flies | Thrust, snelheid en versnelling uit elkaar houden. |
| 1.2 | The Blade Element | Pitch, gesigneerde inflow en lokale α. |
| 1.3 | Speed Along the Blade | Ωr, dynamische druk en werkelijke lift. |
| 1.4 | Read the velocity triangle around the disc | Eén consistente toestand; lokale componenten vóór envelope-diagnostiek. |
| 1.5 | Build a blade element | Velocity construeren, hoeken bepalen en kracht in het juiste frame ontbinden. |
| 1.6 | New blade-element conditions | Transfer van hoek-, kracht- en radiaal redeneren. |
| 2.1 | Why hover needs power | Aircraft velocity versus energieoverdracht aan lucht. |
| 2.2 | Collective, thrust and induced flow | Geproduceerde thrust, ongewijzigd gewicht en statische modelvergelijking. |
| 2.3 | Mass and density in trimmed hover | Vereiste thrust versus de kosten van het leveren ervan. |
| 2.4 | Ground effect at equal thrust | Correct gecontroleerde hoogtevergelijking. |
| 2.5 | Vertical flow and model validity | Tekenconventie en grenzen bij recirculatie. |
| 2.6 | Changed hover demand and ground proximity | Vermogensschaalwet en grondeffect in aparte vergelijkingen. |
| 3.1 | Dissymmetry of Lift | Lokale tangentiële snelheid vóór compensatie. |
| 3.2 | Flapping & Rotor Response | Rate, displacement en dynamische fase. |
| 3.3 | From rigid blade to flapping and cyclic | Invoer, lokale luchtstroom en rotorrespons per laag. |
| 3.4 | Flapback & Inflow Roll | Verschillende asymmetriebronnen en juiste causaliteit. |
| 3.5 | Coriolis Effect — Lead & Lag | Angular momentum en beperkingen van de curve. |
| 3.6 | Explain a new rotor response | Pitch en lokale flow samen gebruiken in een nieuwe vergelijking. |
| 4.1 | Power Required & Performance | Componentensom en ontbrekende beschikbaarheidsdata. |
| 4.2 | Aerodynamic Speed Constraints | Lokale Mach/α tegenover echte aircraft limits. |
| 4.3 | Read changed power and limit evidence | Gematchte data; verschillende typen bewijs. |
| 5.1 | Dynamic Rollover | Pivot, momentarm en ontbrekende dynamiek. |
| 5.2 | Unanticipated Yaw & Anti-Torque | Demand, externe momenten en control response. |
| 5.3 | Changed pivot and yaw-moment constraints | Twee aparte constraints correct analyseren. |
| 6.1 | Autorotation | Lokale forces → torque; energiebron en resisting loads. |
| 6.2 | Rotor energy: RPM and stored energy | E = ½IΩ²; toestand versus verandering per tijd. |
| 6.3 | New torque and rotor-energy states | Fixed-RPM-kaart en aparte energievergelijking verbinden. |
| 7.1 | Case A — hover demand and transition | Demand, matched power margin en lokale hoekdata integreren. |
| 7.2 | Case B — aerodynamic torque and stored energy | Net torque, opgeslagen energie en onbekende voorgeschiedenis. |

De voorspel/construeer/commit/reveal-opdrachten blijven behouden. Hun naslaguitleg verschijnt pas na de modelcommitments, zodat die het antwoord niet vooraf weggeeft. Gevorderde discdiagnostiek staat ingeklapt na de eerste snelheidsdriehoek. Labels op de telefoon zijn ingekort waar ze in het canvas buiten beeld kwamen.

Een antwoord vóór feedback, een ondersteunde retry, zelfreview en een instructeursobservatie blijven aparte bewijzen. De oefening is nog geen gevalideerde competentiebeoordeling: meerkeuzevragen kunnen slechts een deel van de redenering beoordelen. De vijf menselijke observatiecriteria zijn voorwaarden, voorspelling, modelbewijs, mechanisme en beperkingen.

## Voortgang en wijzigingen

Alle activity IDs en de route blijven stabiel. Tekstcorrecties resetten het dossier niet. Verouderde antwoorden voldoen niet aan gewijzigde vragen; de app legt uit dat de controles zijn herzien en bewaart de opgeslagen vergelijkingen en verklaring. Een extra radiale transfervraag maakt die specifieke activiteit opnieuw controleerbaar.

De snelheidsdriehoek had inhoudelijk onverenigbare toestandsdata. Alleen deze modeltaak krijgt versie 3. Eerder werk staat onder **Previous task version — preserved work** in Learning record; het geldt niet als bewijs voor de gecorrigeerde berekening. De overige taken houden hun bestaande taakversie.

## Bronnen en verificatie

De aerodynamische begrippen zijn vergeleken met primaire documenten en met de gedeelde modelberekening. De exacte beperkingen van de app zijn ook afgeleid uit het daadwerkelijk geïmplementeerde model. Geen bron maakt deze app tot een gevalideerde aircraft-performance-simulator.

- [FAA Helicopter Flying Handbook](https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/helicopter_flying_handbook): basisbegrippen, flow en force/torque-regions.
- [FAA AC 90-95](https://www.faa.gov/documentLibrary/media/Advisory_Circular/ac90-95.pdf): historische conventionele yaw-mechanismen; weathercock door fuselage/fin.
- [Airbus SIN 3298-S-00, revision 0 (2019)](https://www.airbus.com/sites/g/files/jlcbta136/files/2025-01/3298-s-00-rev-0-en.pdf): unanticipated yaw en onderscheid tussen control response, power limits en malfunction.
- [NASA TN D-7856](https://ntrs.nasa.gov/api/citations/19750010111/downloads/19750010111.pdf): rotorrespons en configuratie-afhankelijke fase, met name pp. 28–29.
- [NASA: Effect of Helicopter Blade Dynamics on Blade Aerodynamic and Structural Loads](https://ntrs.nasa.gov/citations/19990110723): meerdere bijdragen aan lokale invalshoek en de invloed van bladdynamiek.
- [ICAO Competency-Based Training](https://www.icao.int/competency-based-training): koppeling tussen beoogde prestatie, criteria en bewijs. Het lokale lesontwerp en de concrete interpretatie hierboven zijn reviewkeuzes voor deze app.

De technische resultaten en de grenzen ervan staan in [RELEASE-VALIDATION.md](RELEASE-VALIDATION.md). De nieuwe browsercontroles vergelijken gepubliceerde numerieke readouts met de gedeelde gesigneerde modeltoestand bij hover, beide rotorhelften en negatieve totale U_P. Ze controleren ook overlappende/zero-wind yaw-mechanismen, reveal-gating, gewijzigde vragen, behoud van snapshots en alle naslagroutes.

## Nog te valideren met gebruikers

De review en technische tests zijn uitgevoerd. Een leerderonderzoek en formele beoordeling door een bevoegde instructeur zijn niet uitgevoerd. Een gerichte volgende evaluatie laat representatieve gebruikers de route zonder aanwijzingen volgen, na een onderbreking hervatten en een nieuwe casus uitleggen. Observeer waar zij condities verwisselen, hun bewijs onvoldoende vinden of onzeker zijn over de volgende stap. Gebruik de vijf bestaande observatiecriteria en pas daarna de moeilijkheid en begeleiding aan op gemeten prestaties.
