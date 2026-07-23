import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/auth/session";
import { SESSION_COOKIE } from "@/lib/auth/session";

// Next.js 16: file convention "middleware.ts" sudah dideprecate, diganti
// "proxy.ts" -- fungsinya sama persis, cuma nama file & fungsi yang beda.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = verifySessionToken(token);

  const isLoginRoute = pathname.startsWith("/login");

  if (!session && !isLoginRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (session && isLoginRoute) {
    const url = request.nextUrl.clone();
    url.pathname = session.role === "admin" ? "/dashboard" : "/input-kelas";
    return NextResponse.redirect(url);
  }

  const response = NextResponse.next();
  // Cegah browser nyimpen halaman ini di cache back/forward-nya sendiri --
  // biar pas logout terus pencet tombol back, nggak sempet kelihatan
  // sekilas isi halaman yang butuh login, dan biar data yang ditampilin
  // selalu yang terbaru bukan versi lama yang ke-cache.
  response.headers.set("Cache-Control", "no-store, must-revalidate");
  return response;
}

export const config = {
  matcher: ["/((?!api/health|api/cron|_next/static|_next/image|favicon.ico).*)"],
};
