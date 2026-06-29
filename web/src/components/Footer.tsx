// Pie de página de la aplicación.
export default function Footer() {
  return (
    <footer className="border-t border-black/10 px-6 py-4 text-center text-sm text-zinc-500 dark:border-white/10">
      Subastas sobre Solana · {new Date().getFullYear()}
    </footer>
  );
}
