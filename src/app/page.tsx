import Link from "next/link";

export default async function HomePage() {
  return (
    <section className="relative">
      <div className="container py-16">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              Votre IPTV, <span className="text-brand">sans friction</span>.
            </h1>
            <p className="mt-4 text-zinc-300">
              Connectez votre compte Xtream une fois, profitez partout.
              Images et catalogues directement depuis votre serveur.
              Reviews via TMDB. Lecteur intégré.
            </p>
            <div className="mt-6 flex gap-3">
              <Link href="/auth/register" className="btn">Créer un compte</Link>
              <Link href="/auth/login" className="btn bg-zinc-800 hover:bg-zinc-700">Se connecter</Link>
            </div>
          </div>
          <div className="card h-64 md:h-80 flex items-center justify-center">
            <div className="text-center">
              <div className="skel h-32 w-56 mx-auto" />
              <p className="mt-4 text-zinc-400">UI style Netflix/Apple · Dark · Cartes</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
