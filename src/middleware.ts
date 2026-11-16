import { NextResponse, type NextRequest } from "next/server";
import { resolverHost, urlDaPlataforma } from "@/lib/host";

/** telas que existem no site do produto (domínio principal) */
const PAGINAS_PLATAFORMA = ["/", "/cadastro", "/acessar", "/plataforma", "/termos", "/privacidade", "/offline"];
/** telas que só fazem sentido no site do produto */
const SO_PLATAFORMA = ["/cadastro", "/acessar", "/plataforma"];

const comeca = (path: string, lista: string[]) => lista.some((p) => path === p || (p !== "/" && path.startsWith(p + "/")));

export function middleware(req: NextRequest) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const destino = resolverHost(host);
  const { pathname } = req.nextUrl;

  if (destino.tipo === "plataforma") {
    if (!comeca(pathname, PAGINAS_PLATAFORMA)) return NextResponse.redirect(new URL("/", req.url));
    return NextResponse.next();
  }

  // endereço de um negócio
  if (pathname === "/") return NextResponse.redirect(new URL("/login", req.url));
  if (comeca(pathname, SO_PLATAFORMA)) return NextResponse.redirect(new URL(pathname, urlDaPlataforma()));
  return NextResponse.next();
}

export const config = {
  // tudo menos API, arquivos do Next e arquivos estáticos
  matcher: ["/((?!api/|_next/|brand/|produtos/|.*\\.(?:svg|png|jpg|jpeg|webp|ico|js|webmanifest|txt)$).*)"],
};
