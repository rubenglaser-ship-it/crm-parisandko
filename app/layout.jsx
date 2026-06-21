import './globals.css';

export const metadata = {
  title: 'Paris&Ko — Itinéraires',
  description: 'Concierge & voyages cachers d\'exception',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
