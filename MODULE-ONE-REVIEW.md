# Module 1 — inhoud, didactiek en interface

Review en implementatie: 3 oktober 2026. Alle zes activiteiten, gekoppelde
referentieteksten, controlevragen, modelvoorwaarden, geometrie en mobiele
bediening zijn onderzocht. De kernvergelijkingen in `flapping.js` en
`helilab_core.js` zijn niet gewijzigd.

## Hoofdoordeel

De volgorde had een bruikbare basis, maar het verband tussen de activiteiten
werd onvoldoende uitgelegd. De eerste modellen brachten extra begrippen in
beeld voordat de cursist de kernrelatie kon herkennen. Grote canvassen met
kleine tekeningen vergrootten de afstand tussen uitleg, bediening en resultaat.
Daarnaast waren er concrete inconsistenties in schaalgebruik en krachtlabels.
Daarom omvat deze wijziging zowel inhoud als visualisatie en bediening.

## Bevindingen en wijzigingen

| Activiteit | Probleem | Uitgevoerde verbetering |
|---|---|---|
| 1.1 Gehele helikopter | De opdracht vroeg een wakevergelijking die niet zichtbaar was. Er was geen afzonderlijke velocity-pijl. De verticale conclusie gebruikte totale T/W, ook bij gekantelde thrust. | Opdracht gericht op force/velocity/acceleration. Velocity apart getekend. Verticale component T cos(tilt) gebruikt; horizontale component T sin(tilt) − D behouden. Compactere model/bedieningsindeling. |
| 1.2 Blad-element | Hoeken, krachtcoëfficiënten en stall tegelijk in de eerste uitleg. Alleen positieve inflow instelbaar, hoewel de tekst upflow uitlegde. “Realistic” overschatte het hovermodel. | Vier direct selecteerbare views; alleen stroming en hoeken. Signed φ en negatieve α toegestaan. Drie expliciete vergelijkingsknoppen. Hoverkoppeling optioneel, met modelbenaming. |
| 1.3 Radius | Speed en lift op eigen normalisaties over elkaar; zonder y-as leek de kruising fysisch betekenisvol. Tekst suggereerde dat lift automatisch met snelheid² groeit. Een handmatig getekende tip-losscurve heette een Prandtlfactor. | Blade-stationstrip plus speedfraction r/R en rotational-pressurefraction (r/R)² op één benoemde schaal. Geen liftcurve of tip-lossclaim. Twist start op nul en verandert alleen de getoonde pitch, niet speed/pressure. Worked example 0,4R → 0,8R toegevoegd. |
| 1.4 Forward-flight triangle | De lokale slice had geen eenvoudig plaatsingsbeeld; details van blade motion en trim concurreerden met de eerste tangentiële vergelijking. | Klein CCW-bovenaanzicht met nose/tail, ADV rechts en RET links, actuele station en signed U_T-som. Geavanceerde normal-flowdetails achter een optionele uitklapper. De volledige BET-uitvoer blijft beschikbaar en wordt bewaard. |
| 1.5 Constructie | Lift en drag hadden verschillende schalen; vervolgens werd F_H afzonderlijk vergroot. De getekende TAF en projectie konden dus verschillende vectoren voorstellen. Drag-label verwarde airflow met beweging van het blad. Een juiste keuze na een fout liet geen expliciet supportspoor in het modelbewijs achter. | Forceviews gebruiken werkelijke hoeken en één schaal. Getekende L + D sluit exact aan op TAF; projecties geven dezelfde TAF. Force-sum en force-resolution zijn aparte views. Drag volgt de relatieve luchtbeweging en verzet zich tegen bladbeweging. Pogingen en feedbackgebruik blijven bewaard, ook na herladen. |
| 1.6 Changed case | De verbanden met eerdere activiteiten waren vooral impliciet. Een eerste geschreven analyse is hier wel doelgericht, maar het appresultaat beoordeelt geen vrije uitleg. | Zichtbaar doel en brug naar hover/energie. Vergelijkingen, changed-condition checks, uitleg en limitation behouden. Modelgeometrie uit de eerdere activiteiten wordt hergebruikt. Geen claim dat voltooien operationele competentie bewijst. |

## Nieuwe didactische lijn

1. **Oriënteer:** velocity is beweging; net force bepaalt acceleration.
2. **Zoom in:** bepaal local airflow en onderscheid θ, φ en α.
3. **Verplaats:** vergelijk radius bij vaste RPM, density en nul twist.
4. **Breid uit:** voeg aircraft forward speed toe met het juiste azimuthteken.
5. **Construeer:** gebruik de relaties om lokale krachten op te bouwen en op te lossen.
6. **Pas toe:** verklaar gewijzigde hoeken en radius met gekozen modelbewijs.

Elke activiteit heeft een zichtbaar kernidee en overgang naar de volgende.
De eerste vijf opdrachten hebben korte genummerde handelingen. De eerste vier
verkenningen openen direct; een geschreven prediction blijft optioneel. De
constructie behoudt gerichte commitments en de changed case behoudt een eerste
analyse. Informatie is steeds rechtstreeks bereikbaar via Read the explanation.

Dit past competentiegericht leren toe via doel, gecontroleerde taak,
observeerbaar modelbewijs, feedback en transfer. Het schrijven van een tekst of
afvinken van stappen geldt niet als bewijs van de kwaliteit van redeneren.
De fixed-case constructie is oefening; zelfstandig toepassen op onbekende
gevallen vraagt bredere taken en menselijke beoordeling.

## Theoretische precisie

- Voor normal chordwise flow: α = θ − φ met signed φ.
- Lift is normaal op local relative airflow; drag werkt langs de luchtbeweging
  ten opzichte van de sectie, tegengesteld aan de beweging van de sectie door lucht.
- De getoonde krachtprojecties gebruiken
  C_normal = C_l cosφ − C_d sinφ en C_braking = C_l sinφ + C_d cosφ.
  Vermenigvuldiging met q × section area levert lokale krachten, geen totaal
  rotorresultaat. De pijlen zijn op één onderlinge schaal; hun pixels zijn geen N.
- q_rot = ½ρ(Ωr)² is expliciet alleen de rotational bijdrage. De werkelijke
  relative speed en lift vragen aanvullende stroming en sectiondata.
- De introductory thrust is een opgelegd resultaat uit de hoveroplossing,
  ook als de snelheidsknop verandert. Er wordt geen forward-flight trim,
  trajectory, power availability of werkelijke yaw response opgelost.
- CCW van boven blijft de cursusconventie: 90° rechts ADV, 270° links RET.

Bron: [FAA Helicopter Flying Handbook, Chapter 2](https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/helicopter_flying_handbook/hfh_ch02.pdf),
onderdelen relative wind, blade twist en aerodynamic force direction; bestaande
Leishman BET-conventies en de [physics/visual contract](PHYSICS_VISUAL_CONTRACT.md).
De primaire FAA-PDF is tijdens deze review opgehaald en de relevante passages
zijn gelezen. De teksten zijn geparafraseerd.

## Voortgang en toetsing

De gewijzigde activiteiten 1.1, 1.2, 1.3, 1.5 en 1.6 gebruiken taakversie 3.
Eerdere taakversies blijven in het bestaande learning-recordarchief. Historische
lift-readouts kunnen de gewijzigde radial-pressuretaak niet afronden. Activiteit
1.4 behoudt zijn bestaande versie 3 en IDs; het model en de bewijstaak zijn intact.
Correcties na native feedback krijgen een supportspoor. Dit is geen zelfstandige
kwaliteitsbeoordeling van een vrije uitleg.

Gerichte controles staan in `tests/module-one.cjs`: werkelijke vergelijkingsknoppen,
signed inflow/negative α, fysische radiusverhoudingen, twist-invariantie,
verticale thrustprojectie, CCW-oriëntatie, opgenomen canvaspijlen, feedbackhistorie,
herladen, oude evidence en viewports 1280/768/390. De hele cursus behoudt zijn
bestaande physics-, learning-, smoke-, acceptance- en contentcontroles.

## Resterende pedagogische validatie

De technische en visuele controle vervangt geen test met cursisten. Test de
module met representatieve learners en een bevoegde inhoudsdeskundige volgens
`USER-VALIDATION.md`. Observeer of deelnemers zonder prompts kunnen:

- de drie hoekreferenties aanwijzen;
- de controlevariabele bij een vergelijking benoemen;
- radius/speed/pressure onderscheiden van werkelijke lift;
- een lokale forcevector van totaal rotor thrust onderscheiden;
- een nieuw geval verklaren en een relevante modelgrens noemen.

Registreer zoektijd, verkeerde routes, gebruikte hints en redeneringen.
Deze menselijke pilot is nog niet uitgevoerd. Formele opleidingsgoedkeuring
of gevalideerde aircraft performance is geen resultaat van deze review.
