import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { LogOut, Menu, ShoppingBag, UserRound, X } from "lucide-react";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";

const NAV = [
  { to: "/", label: "Accueil" },
  { to: "/restaurants", label: "Restaurants" },
  { to: "/comment-ca-marche", label: "Comment ça marche" },
  { to: "/partenaire", label: "Devenir partenaire" },
  { to: "/livreur", label: "Devenir livreur" },
] as const;

export function Logo() {
  return (
    <Link
      to="/"
      className="flex items-center gap-2 font-display text-xl font-bold text-primary-deep"
    >
      <span className="grid size-9 place-items-center rounded-xl bg-gradient-gold text-primary-foreground">
        R
      </span>
      <span>
        Resto<span className="text-primary">Clik</span>
      </span>
    </Link>
  );
}

export function Header() {
  const { count } = useCart();
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    setOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
        <Logo />
        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: true }}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
              activeProps={{ className: "text-primary-deep bg-secondary" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link
                to="/profil"
                aria-label="Mon profil"
                title="Mon profil"
                className="grid size-10 place-items-center rounded-full hover:bg-muted"
              >
                <UserRound className="size-5" />
                <span className="sr-only">Mon profil</span>
              </Link>
              <button
                type="button"
                onClick={() => void handleSignOut()}
                aria-label="Se déconnecter"
                title="Se déconnecter"
                className="flex size-10 items-center justify-center gap-2 rounded-full text-sm font-medium text-destructive hover:bg-muted sm:w-auto sm:px-3"
              >
                <LogOut className="size-5" />
                <span className="hidden sm:inline">Déconnexion</span>
              </button>
            </>
          ) : (
            <>
              <Link
                to="/connexion"
                className="hidden rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted sm:block"
              >
                Connexion
              </Link>
              <Link
                to="/inscription"
                className="hidden rounded-full bg-primary-deep px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 sm:block"
              >
                Inscription
              </Link>
            </>
          )}
          <Link
            to="/panier"
            aria-label="Panier"
            className="relative grid size-10 place-items-center rounded-full bg-secondary text-primary-deep"
          >
            <ShoppingBag className="size-5" />
            {count > 0 && (
              <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                {count}
              </span>
            )}
          </Link>
          <button
            className="grid size-10 place-items-center rounded-full hover:bg-muted lg:hidden"
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="border-t bg-background px-4 py-3 lg:hidden">
          {[
            ...NAV,
            ...(user
              ? [
                  { to: "/profil", label: "Mon profil" },
                  { to: "/commandes", label: "Mes commandes" },
                ]
              : [
                  { to: "/connexion", label: "Connexion" },
                  { to: "/inscription", label: "Inscription" },
                ]),
          ].map((n) => (
            <Link
              key={n.to}
              to={n.to}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-3 text-sm font-medium hover:bg-muted"
            >
              {n.label}
            </Link>
          ))}
          {user && (
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-3 text-left text-sm font-medium text-destructive hover:bg-muted"
            >
              <LogOut className="size-4" />
              Se déconnecter
            </button>
          )}
        </nav>
      )}
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-20 border-t bg-secondary/60">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-3">
        <div>
          <Logo />
          <p className="mt-3 text-sm text-muted-foreground">
            Vos repas préférés livrés partout à Ziguinchor.
          </p>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <Link to="/restaurants" className="hover:text-primary">
            Restaurants
          </Link>
          <Link to="/comment-ca-marche" className="hover:text-primary">
            Comment ça marche
          </Link>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <Link to="/partenaire" className="hover:text-primary">
            Devenir partenaire
          </Link>
          <Link to="/livreur" className="hover:text-primary">
            Devenir livreur
          </Link>
        </div>
      </div>
      <p className="pb-6 text-center text-xs text-muted-foreground">
        © 2026 RestoClik — Ziguinchor, Sénégal
      </p>
    </footer>
  );
}
