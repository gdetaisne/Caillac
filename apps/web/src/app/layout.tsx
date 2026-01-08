import "./globals.css";

export const metadata = {
  title: "Héritage Géraud",
  description: "Centraliser des documents de succession et en extraire des faits (sans interprétation)."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-neutral-50 text-neutral-900">
        <div className="mx-auto max-w-6xl p-6">{children}</div>
      </body>
    </html>
  );
}

