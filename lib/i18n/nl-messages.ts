// Dutch for form messages (lib/actions.ts), voetbal.nl sync errors (lib/voetbal.ts) and the shared form pieces
// (components/forms.tsx), keyed by the English text in the code.
export const NL_MESSAGES: Record<string, string> = {
  // Access
  "You need to sign in as a club admin to do that.": "Daarvoor moet je ingelogd zijn als beheerder van de club.",
  "You need to sign in as the coach or a club admin to do that.": "Daarvoor moet je ingelogd zijn als trainer of beheerder van de club.",
  "Club not found.": "Club niet gevonden.",
  "Wrong password.": "Verkeerd wachtwoord.",

  // Club
  "Give the club a name.": "Geef de club een naam.",
  "Add a short name (up to 5 letters) for the badge.": "Voeg een korte naam toe (max. 5 letters) voor het embleem.",
  "Pick both club colours.": "Kies allebei de clubkleuren.",
  "That logo couldn't be used. Try a PNG, JPG or SVG under 5 MB.": "Dat logo werkt niet. Probeer een PNG, JPG of SVG kleiner dan 5 MB.",
  "That photo couldn't be used. Try a PNG or JPG.": "Die foto werkt niet. Probeer een PNG of JPG.",
  "The admin password needs at least 6 characters.": "Het beheerderswachtwoord moet minstens 6 tekens hebben.",
  "The passwords don't match.": "De wachtwoorden zijn niet hetzelfde.",
  "That web address is taken. Try another.": "Dat webadres is al bezet. Probeer een ander.",
  "Use at least 2 characters: lowercase letters, numbers and dashes.": "Gebruik minstens 2 tekens: kleine letters, cijfers en streepjes.",
  "Club settings saved.": "Clubinstellingen opgeslagen.",
  'Type "{name}" exactly to confirm.': 'Typ precies "{name}" om te bevestigen.',

  // Passwords and recovery
  "Current password is wrong.": "Het huidige wachtwoord klopt niet.",
  "The new password needs at least 6 characters.": "Het nieuwe wachtwoord moet minstens 6 tekens hebben.",
  "The new passwords don't match.": "De nieuwe wachtwoorden zijn niet hetzelfde.",
  "Password changed. Everyone else has been signed out.": "Wachtwoord gewijzigd. Alle anderen zijn uitgelogd.",
  "Save this code somewhere safe. It's shown only now.": "Bewaar deze code op een veilige plek. Je ziet hem alleen nu.",
  "This club has no recovery code, so the password can't be reset here.": "Deze club heeft geen herstelcode, dus het wachtwoord kan hier niet opnieuw worden ingesteld.",
  "That recovery code isn't right.": "Die herstelcode klopt niet.",
  "Password changed and you're signed in. Your old code is used up; save this new one.":
    "Wachtwoord gewijzigd en je bent ingelogd. Je oude code is opgebruikt; bewaar deze nieuwe.",
  "Coach login removed.": "Trainerslogin verwijderd.",
  "The coach password needs at least 6 characters.": "Het trainerswachtwoord moet minstens 6 tekens hebben.",
  "Use a different password from the admin one.": "Gebruik een ander wachtwoord dan dat van de beheerder.",
  "Use a different password from the coach one.": "Gebruik een ander wachtwoord dan dat van de trainer.",
  "Coach password saved. The coach signs in with it at the bottom of any club page.":
    "Trainerswachtwoord opgeslagen. De trainer logt ermee in onderaan elke clubpagina.",
  "The club is private now.": "De club is nu privé.",
  "The club is public now. Anyone with the link can see it.": "De club is nu openbaar. Iedereen met de link kan hem zien.",
  "Squad password removed. Only the admin and coach can open the club while it's private.":
    "Selectiewachtwoord verwijderd. Zolang de club privé is, kunnen alleen de beheerder en trainer hem openen.",
  "The squad password needs at least 6 characters.": "Het selectiewachtwoord moet minstens 6 tekens hebben.",
  "Squad password saved. Share it with the team along with the link.": "Selectiewachtwoord opgeslagen. Deel het samen met de link met het team.",

  // voetbal.nl
  "That isn't a voetbal.nl team link. It should contain something like T1628317720.":
    "Dat is geen teamlink van voetbal.nl. Er hoort iets als T1628317720 in te staan.",
  "That isn't a voetbal.nl team link. Open your team on voetbal.nl and copy the address, it contains something like T1628317720.":
    "Dat is geen teamlink van voetbal.nl. Open je team op voetbal.nl en kopieer het adres, daar staat iets als T1628317720 in.",
  "This site can't read voetbal.nl right now. Skip this step and fill in the club yourself.":
    "Deze site kan voetbal.nl nu niet lezen. Sla deze stap over en vul de club zelf in.",
  "Couldn't reach voetbal.nl. Try again in a minute.": "voetbal.nl is niet bereikbaar. Probeer het over een minuut opnieuw.",
  "Disconnected from voetbal.nl. Matches already synced stay.": "Losgekoppeld van voetbal.nl. Wedstrijden die al gesynchroniseerd zijn, blijven staan.",
  "Team saved. Connect a voetbal.nl login below to sync it.": "Team opgeslagen. Koppel hieronder een voetbal.nl-login om het te synchroniseren.",
  "Enter the email address of the voetbal.nl account.": "Vul het e-mailadres van het voetbal.nl-account in.",
  "Enter the password of the voetbal.nl account.": "Vul het wachtwoord van het voetbal.nl-account in.",
  "Connected as {email}. Syncs now use this account.": "Gekoppeld als {email}. Synchroniseren gebruikt nu dit account.",
  "Login removed. Syncs use the site's shared account again.": "Login verwijderd. Synchroniseren gebruikt weer het gedeelde account van de site.",
  "Login removed. Syncing stops until you connect one.": "Login verwijderd. Synchroniseren stopt tot je er een koppelt.",
  "{n} new match": "{n} nieuwe wedstrijd",
  "{n} new matches": "{n} nieuwe wedstrijden",
  "{n} updated": "{n} bijgewerkt",
  "{n} line-up": "{n} opstelling",
  "{n} line-ups": "{n} opstellingen",
  "{n} photo": "{n} foto",
  "{n} photos": "{n} foto's",
  "league table": "de stand",
  "Synced from voetbal.nl: {what}.": "Gesynchroniseerd met voetbal.nl: {what}.",
  "nothing new": "niets nieuws",
  "The sync failed.": "Het synchroniseren is mislukt.",
  'voetbal.nl shows up to {n} player per match in your line-ups as "Afgeschermd": their profile is private, so the name isn\'t given. Add them to the squad by hand, and to those matches from each match\'s Edit page.':
    'voetbal.nl toont per wedstrijd tot {n} speler in je opstellingen als "Afgeschermd": het profiel is privé, dus de naam wordt niet gegeven. Voeg die speler zelf toe aan de selectie, en aan die wedstrijden via de Bewerken-pagina van elke wedstrijd.',
  'voetbal.nl shows up to {n} players per match in your line-ups as "Afgeschermd": their profile is private, so the name isn\'t given. Add them to the squad by hand, and to those matches from each match\'s Edit page.':
    'voetbal.nl toont per wedstrijd tot {n} spelers in je opstellingen als "Afgeschermd": hun profiel is privé, dus de naam wordt niet gegeven. Voeg ze zelf toe aan de selectie, en aan die wedstrijden via de Bewerken-pagina van elke wedstrijd.',
  // Sync errors from lib/voetbal.ts. They're stored in English (voetbal_error) and translated where they're shown.
  "Unknown format.": "Onbekend formaat.",
  "The saved voetbal.nl password can't be read any more. Enter it again in Settings.":
    "Het opgeslagen voetbal.nl-wachtwoord is niet meer te lezen. Vul het opnieuw in bij Instellingen.",
  "voetbal.nl kept redirecting.": "voetbal.nl bleef doorverwijzen.",
  "Couldn't find the voetbal.nl login form. The site may have changed.": "Het inlogformulier van voetbal.nl is niet gevonden. De site is misschien veranderd.",
  "voetbal.nl didn't accept the site's login. Check VOETBALNL_EMAIL and VOETBALNL_PASSWORD on the server.":
    "voetbal.nl accepteerde de login van de site niet. Controleer VOETBALNL_EMAIL en VOETBALNL_PASSWORD op de server.",
  "voetbal.nl didn't accept that email and password.": "voetbal.nl accepteerde dat e-mailadres en wachtwoord niet.",
  "Still logged out of voetbal.nl after logging in.": "Na het inloggen nog steeds uitgelogd bij voetbal.nl.",
  "A sync is already running for this club.": "Er loopt al een synchronisatie voor deze club.",
  "Add the voetbal.nl team link first.": "Voeg eerst de teamlink van voetbal.nl toe.",
  "Connect a voetbal.nl login in Settings first.": "Koppel eerst een voetbal.nl-login bij Instellingen.",
  "This site can't read voetbal.nl right now.": "Deze site kan voetbal.nl nu niet lezen.",
  "voetbal.nl has no team at that link. Check that it opens your team's page.": "voetbal.nl heeft geen team op die link. Controleer of hij de pagina van je team opent.",

  // Players
  "Unknown player.": "Onbekende speler.",
  "{name} is already in the squad.": "{name} zit al in de selectie.",
  "{name} added to the squad. Set their number and position below.": "{name} is toegevoegd aan de selectie. Stel hieronder rugnummer en positie in.",
  "Nobody new to add.": "Niemand nieuw om toe te voegen.",
  "{n} player added.": "{n} speler toegevoegd.",
  "{n} players added.": "{n} spelers toegevoegd.",
  "Enter the player's name.": "Vul de naam van de speler in.",
  "Pick a position.": "Kies een positie.",
  "{name} updated.": "{name} bijgewerkt.",
  "{name} added to the squad.": "{name} is toegevoegd aan de selectie.",
  "This player has match history, so deleting would wipe their stats. Untick 'Active' instead to hide them from new matches.":
    "Deze speler heeft al wedstrijden gespeeld, dus verwijderen wist zijn statistieken. Zet 'Actief' liever uit om hem te verbergen bij nieuwe wedstrijden.",
  "Player removed.": "Speler verwijderd.",

  // Matches and line-ups
  "Couldn't read the form. Try again.": "Het formulier kon niet gelezen worden. Probeer het opnieuw.",
  "Pick a date.": "Kies een datum.",
  "Enter the opponent.": "Vul de tegenstander in.",
  "Pick home or away.": "Kies thuis of uit.",
  "Enter how many goals we conceded.": "Vul in hoeveel goals we tegen kregen.",
  "Match not found.": "Wedstrijd niet gevonden.",
  "Unknown match.": "Onbekende wedstrijd.",
  "Pick a formation.": "Kies een formatie.",
  "Someone is in the line-up twice. Each player can only take one spot.": "Iemand staat twee keer in de opstelling. Elke speler kan maar één plek innemen.",
  "Line-up saved.": "Opstelling opgeslagen.",

  // Halls and rankings
  "Pick Hall of Fame or Hall of Shame.": "Kies Hall of Fame of Hall of Shame.",
  "Give the moment a title.": "Geef het moment een titel.",
  "Unknown player or match.": "Onbekende speler of wedstrijd.",
  "Moment added.": "Moment toegevoegd.",
  "Give the ranking a title, like “Snelste”.": "Geef de ranglijst een titel, zoals “Snelste”.",
  "Ranking not found.": "Ranglijst niet gevonden.",
  "Ranking saved.": "Ranglijst opgeslagen.",

  // Shared form pieces (components/forms.tsx)
  "Saving…": "Opslaan…",
  "That file is over 5 MB. Pick a smaller one.": "Dat bestand is groter dan 5 MB. Kies een kleiner bestand.",
  "Couldn't read that image. Try a PNG or JPG.": "Die afbeelding kon niet gelezen worden. Probeer een PNG of JPG.",
  Remove: "Verwijderen",
  Password: "Wachtwoord",
  "Signing in…": "Inloggen…",
  "Sign in": "Inloggen",
  "in {n} line-up": "in {n} opstelling",
  "in {n} line-ups": "in {n} opstellingen",
  "Adding…": "Toevoegen…",
  "Add to squad": "Toevoegen aan selectie",
  "Add all {n}": "Alle {n} toevoegen",
  "Deleting…": "Verwijderen…",
  "For the line-up graphic. A cut-out on a transparent background (PNG) looks best; a normal photo works too.":
    "Voor de opstellingsafbeelding. Een uitsnede op een transparante achtergrond (PNG) staat het mooist; een gewone foto kan ook.",
};
