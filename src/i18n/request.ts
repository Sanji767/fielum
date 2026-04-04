import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

export default getRequestConfig(async () => {
  // Resolve locale: from cookie, or default to 'en'
  const cookieStore = await cookies();
  const locale = cookieStore.get("fielum_locale")?.value ?? "en";
  const validLocales = ["en", "es", "nl"];
  const resolvedLocale = validLocales.includes(locale) ? locale : "en";

  return {
    locale: resolvedLocale,
    messages: (await import(`../../messages/${resolvedLocale}.json`)).default,
  };
});
