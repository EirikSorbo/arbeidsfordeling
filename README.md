# Arbeidsfordeling — personlig tidsregistrering

Webapp for å registrere hvor mye tid som brukes på ulike typer
arbeidsoppgaver. React + TypeScript + Vite, med Firebase (Google-innlogging
og Firestore) som backend og GitHub Pages som hosting.

## Arkitektur

```
src/
  firebase/    Firebase-init, konfigurasjon og dokumentstier
  auth/        AuthContext (Google-innlogging) og rutebeskyttelse
  services/    Skriveoperasjoner mot Firestore (timer, kategorier)
  hooks/       Sanntidsabonnementer på Firestore-data
  pages/       Én komponent per side
  components/  Delte komponenter (Layout)
  utils/       Tidsformatering
```

Datamodell i Firestore (alt under `users/{uid}/`):

| Sti | Innhold |
| --- | --- |
| `categories/{id}` | navn, farge, ikon, rekkefølge, arkivert |
| `entries/{id}` | kategori, start, slutt, notat |
| `timer/active` | den ene aktive timeren (kategori, start, notat) |
| `settings/preferences` | brukerinnstillinger |

Kun én timer kan være aktiv: start/stopp kjøres som Firestore-transaksjoner
mot `timer/active`, og en løpende timer konverteres til en registrering før
en ny starter.

## Førstegangsoppsett

### 1. Firebase

1. Opprett et prosjekt på [console.firebase.google.com](https://console.firebase.google.com).
2. **Authentication** → Kom i gang → aktiver **Google** som innloggingsmetode.
3. **Firestore Database** → Opprett database (produksjonsmodus, europe-west).
4. Lim innholdet i `firestore.rules` inn under **Firestore → Regler** og publiser.
5. Prosjektinnstillinger → **Dine apper** → legg til en **web-app** og kopier
   konfigurasjonen inn i `src/firebase/config.ts`.
6. Authentication → Settings → **Authorized domains**: legg til
   `<brukernavn>.github.io`.

### 2. GitHub Pages

1. Opprett et GitHub-repo og push dette prosjektet til `main`.
2. Repo → Settings → Pages → Source: **GitHub Actions**.
3. Workflowen i `.github/workflows/deploy.yml` bygger og publiserer
   automatisk ved hver push til `main`.

## Utvikling

```bash
npm install
npm run dev      # utviklingsserver
npm run build    # typesjekk + produksjonsbygg til dist/
```
