/** Supabase suele responder en inglés; lo pasamos a español. */
export function friendlyStoreAuthError(raw: string): string {
  const m = raw.trim().toLowerCase();
  if (
    m.includes("invalid login") ||
    m.includes("invalid credentials") ||
    m.includes("invalid_grant") ||
    m.includes("wrong password")
  ) {
    return "Correo o contraseña incorrectos.";
  }
  if (m.includes("email not confirmed")) {
    return "Tienes que confirmar el correo antes de entrar. Revisa tu bandeja.";
  }
  if (m.includes("user already registered")) {
    return "Ese correo ya está registrado. Prueba iniciar sesión.";
  }
  if (m.includes("password") && m.includes("6")) {
    return "La contraseña debe tener al menos 6 caracteres.";
  }
  if (m.includes("too many requests") || m.includes("rate limit")) {
    return "Demasiados intentos. Espera un momento y vuelve a probar.";
  }
  if (m.includes("network") || m.includes("fetch")) {
    return "No hay conexión o el servidor no respondió. Revisa tu internet.";
  }
  return raw;
}
