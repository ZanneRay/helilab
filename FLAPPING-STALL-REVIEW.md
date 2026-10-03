# Flapping, invalshoek, retreating blade stall en twist

Review en herontwerp, 3 oktober 2026. Scope: de volledige causale lijn in de naslag, activiteiten 3.2 en 4.2, de moduletransfer, Guided BET, de optionele velocity-trianglekaart en de sandboxkaart. HeliLab blijft een zelfstandige app. KOA wordt hier uitgevoerd als de eerder gevraagde competentiegeoriënteerde training; een formele uitbreiding van het acroniem is niet vastgesteld.

## Theoretische kern

**De richting van de flapping-snelheid bepaalt de directe verandering van α.** Bij vaste pitch, positieve tangentiële snelheid en onveranderde overige stroming verlaagt neerwaartse flapping de inflowhoek en verhoogt zij α. Opwaartse flapping doet het omgekeerde. “Flapping voegt een verticale component toe, dus α wordt groter” is zonder richting en gecontroleerde voorwaarden onjuist.

De rotorvlakconventie is:

- `U_P = normale luchtstroming + r·β̇ + overige bewegingsbijdragen`;
- `φ = atan2(U_P,U_T)`;
- `α = θ − φ`.

Positieve β̇ betekent opwaartse bladbeweging. De lucht beweegt relatief ten opzichte van het blad; de bewegingssnelheid van het blad en de pijl van de relatieve luchtstroming mogen niet worden verwisseld. β is een verplaatsing, β̇ een snelheid. Bij een glad maximum of minimum van β is de snelheid nul. Een bepaalde azimut of de hoogste bladpositie garandeert geen maximale snelheidsbijdrage. Werkelijke fase hangt af van rotorconstructie en trim.

Voor een eenvoudige ongetwiste radiale vergelijking bij constante θ en positieve uniforme U_P neemt U_T naar buiten toe toe. φ neemt af, α neemt toe. Een buitenste regio kan daarom eerder een gemeenschappelijke kritische α bereiken. Dat is een uitleg onder aannames, geen universele locatievoorspelling.

Negatieve twist verlaagt de lokale pitch aan de tip en verhoogt haar binnen de gekozen 0,75R-referentie wanneer die referentiepitch vaststaat. Bij dezelfde stroming geldt `Δα = Δθ`. Een maximum kan naar binnen verschuiven. De precieze plaats en of daar werkelijk stall begint, volgen mede uit lokale kritische α, inflow, trim, flapping, compressibiliteit en onstationaire aerodynamica. NACA TN 1666 is een nuttig tegenvoorbeeld: circa 8° negatieve twist verlaagde de tip-α in de onderzochte rotor, terwijl de maximale α daar nog steeds aan de tip lag.

**Lagere snelheid en hogere α-vraag zijn verschillende redeneringen.** Om dezelfde sectielift bij minder dynamische druk te behouden, is een hogere liftcoëfficiënt nodig; in het normale pre-stall bereik doorgaans een hogere α. Bij vaste pitch en vaste positieve U_P maakt een lagere U_T daarentegen φ groter en α kleiner. Een vergelijking bij vaste pitch is geen vergelijking bij gelijke lift of gelijke rotortrim.

## Gevonden problemen en uitgevoerde wijzigingen

| Probleem | Pedagogische of fysieke consequentie | Uitgevoerd |
|---|---|---|
| De flappingopdracht vroeg naar lokale α, maar liet vooral discstand en β zien. | De gevraagde verklaring was niet rechtstreeks uit het getoonde bewijs af te leiden. | Twee relatieve-stromingsdiagrammen en numerieke U_P, φ, α en rβ̇ bij vaste pitch; neerwaartse/opwaartse ratevergelijking. |
| Verplaatsing en snelheid stonden dicht bij elkaar zonder gecontroleerd contrast. | “Het blad staat hoog, dus α is lager” kon blijven bestaan. | β blijft 0° in de momentane vergelijking; β̇ verandert. Een aparte toets vraagt naar de snelheid bij een extremum. |
| Foundation/Extended veranderden tegelijk twist, cyclic en inflow. | Een kaartverandering kon ten onrechte alleen aan twist worden toegeschreven. | Een afzonderlijke, bevroren uniforme-flowvergelijking met nul twist en negatieve twist, vaste pitch op 0,75R, twee α-curves en berekende piekplaatsen. |
| Foundation gebruikte φ uit alleen de rotatiesnelheid/radius, terwijl U_T de vliegsnelheid wel bevatte. | Het weergegeven hoekmodel kwam niet overeen met zijn lokale snelheidsdriehoek. | Foundation gebruikt nu `atan2(U_P,U_T)` met de werkelijke lokale U_T. Het blijft een gecombineerd vereenvoudigd preset. |
| De procentuele α-kleurwaarde werd met een belastingfactor vermenigvuldigd. | “100% kritische α” betekende in kleur en contour niet hetzelfde. | Ongewogen ratio voor kleur, contour en uitlezing; kritische-α-regel gedeeld tussen kaartweergaven. |
| Lage dynamische druk werd als bewijs gebruikt dat een sectie niet kon stallen. | Geometrische hoek, stromingsloslating en de grootte van krachten werden verwisseld. | Lage belasting onderdrukt de positieve-α-diagnostiek niet. Een apart tangentiëel belastingproxy toont U_T²; reverse/near-zero flow krijgt een aparte scope. |
| Een vaste globale α-grens werd vergeleken met een kaart met lokale Mach-afhankelijke grenzen. | Samenvatting en kaart konden elkaar tegenspreken. | Geselecteerde ratio en gesamplede retreating maximumratio gebruiken dezelfde lokale regel. |
| De loadweergave kon buiten de aangenomen α-range nul lijken. | Geen modelvoorspelling werd verward met nul werkelijke post-stalllift. | Guided BET toont daar grijze, niet beschikbare attached-flowproxies, met expliciete uitleg. |
| De mobiele flappingweergave groeide breder dan het zichtbare paneel. | Diagram en waarden raakten afgesneden, ook zonder documentbrede scroll. | Modellen rekken binnen de beschikbare breedte; labels en tabelcellen mogen afbreken. Browsercontrole meet ook het scrollbare hoofdvlak en de zichtbare modelgrenzen. |

## Nieuwe leerlijn: kort, zichtbaar en toetsbaar

1. **Praktijkvraag:** een retreating element beweegt neerwaarts terwijl pitch gelijk blijft. Overweeg de lokale α-verandering voordat je een parameter verandert. In gewone oefeningen is een geschreven voorspelling optioneel.
2. **Gericht experiment:** bij 60 kt, 270° en 0,75R vergelijk je −60°/s en +60°/s. Sla beide toestanden op en traceer β̇ → U_P → φ → α. Pitch en overige stroming moeten in beide bewijsstukken gelijk zijn.
3. **Rotorrespons:** de volgende bestaande Guided BET-activiteit verbindt lokale stroming met flapping, cyclic en trim. De momentane vergelijking voorspelt zelf geen discrespons of tijdsverloop.
4. **Stallvraag:** onderscheid de α-vraag voor loading van de feitelijke lokale α en van de aangenomen kritische α.
5. **Twist isoleren:** stel het geselecteerde station op 1R en sla 0° en −8° twist op. De stroming en pitchreferentie blijven gelijk. De twee radiale curves blijven zichtbaar; een berekende piek is geen vaste memoreerbare stalllocatie.
6. **Toepassen op de kaart:** vergelijk twee snelheden in hetzelfde rotor-preset. Lees lokale α, kritische α, hun ratio en advancing tip Mach afzonderlijk.
7. **Transfer:** analyseer een nieuwe aangeleverde radiale conditie met vaste flow en 0,75R-pitchreferentie. Bereken wat twist met θ en α doet; vermeld wat hiermee niet over werkelijke stall is vastgesteld.

De kernuitleg blijft in het zicht; extra formule- en modeldetails staan uitklapbaar. Activiteit 4.2 heeft twee genummerde modelkeuzes die overeenkomen met de opdracht. De voortgang vereist echte gecontroleerde opgeslagen toestanden plus de inhoudelijke beslissingen en zelfreview. Een gewone oefening opent direct; een geschreven voorspelling is optioneel. Uitleg en bronnen zijn rechtstreeks bereikbaar via de doorzoekbare themalijst en Read the explanation. Zie ook [PREDICT-ACCESS-REVIEW.md](PREDICT-ACCESS-REVIEW.md). De bestaande moduletransfer vraagt een vrije verklaring en een beperking. Een instructeur kan redeneren beoordelen aan de bestaande vijf observatiecriteria: voorwaarden, voorspelling, bewijs, mechanisme en beperking. Automatisch afronden bewijst niet dat een vrije uitleg inhoudelijk door een mens is beoordeeld.

## Grenzen en resterende gebruiksevaluatie

- De motor voor de bestaande BET-berekeningen en de rotorconventie zijn behouden. De rotor blijft CCW van boven gezien: advancing rechts, retreating links.
- De rateoefening schrijft één momentane toestand voor; de twistoefening schrijft uniforme normale stroming voor. Beide isoleren één oorzaak. Zij zijn geen getrimde vlucht of equal-thrust rotorvergelijking.
- De kritische-α/Mach-regel is illustratief, niet gevalideerde airfoildata. De kaarten berekenen geen dynamische stall, reverse-flowloads, aeroelasticiteit, symptomen, herstel of goedgekeurde V_NE. Een gesamplede maximale geometrische ratio is geen voorspelling van de eerste operationeel bepalende stallregio.
- De veranderingen in 3.2 en 4.2 hebben activiteitversie 3. Oud leerbewijs blijft beschikbaar als eerdere versie. Andere activiteiten worden niet volledig gereset; gewijzigde transfervragen vragen nieuw actueel bewijs van de beslissing.
- Laat in de voorbereide gebruiksevaluatie een cursist zonder hints de twee bewegingsrichtingen voorspellen, de twistvergelijking uitvoeren en de nieuwe stationcasus uitleggen. Laat de instructeur controleren of de cursist lokale α, liftvraag en kritische α zelfstandig scheidt. Menselijke begripstoetsing en formele syllabusmapping blijven nodig; browserchecks vervangen die niet.

Technische verificatie wordt vastgelegd in [RELEASE-VALIDATION.md](RELEASE-VALIDATION.md).

## Bronnen

- FAA, [Helicopter Flying Handbook, hoofdstuk 11](https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/helicopter_flying_handbook/hfh_ch11.pdf), pp. 11-10–11-11: local speed asymmetry, up/downflapping en retreating blade stall. De operationele procedures zijn niet naar de modellen overgenomen.
- Gessow, A. (1948), [NACA TN 1666](https://ntrs.nasa.gov/citations/19930082289), *Flight Investigation of Effects of Rotor-blade Twist on Helicopter Performance in the High-speed and Vertical-autorotative-descent Conditions*: effect en begrenzing van de twistverklaring in die onderzochte rotor.
- NASA, [TN D-7856](https://ntrs.nasa.gov/api/citations/19750010111/downloads/19750010111.pdf), pp. 28–29: configuratie-afhankelijke rotorrespons en fase.
- Leishman, *Principles of Helicopter Aerodynamics*, forward-flight blade-element local velocities, §3.5.2, zoals al vastgelegd in de physics/visual contract en de bestaande BET-functies. De nieuwe presets hergebruiken die teken- en hoekconventies.
