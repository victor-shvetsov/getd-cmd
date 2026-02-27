import type { HealthCheck, CheckContext } from "./types";
import { pass, warn } from "./types";

const CAT = "Branding";

export const checkBranding: HealthCheck = {
  category: CAT,
  order: 0,
  run({ client }: CheckContext) {
    const required = [
      "logo_url",
      "primary_color",
      "secondary_color",
      "accent_color",
      "background_color",
      "text_color",
      "font_heading",
      "font_body",
    ];
    const missing = required.filter((f) => !client[f] || client[f] === "");
    if (missing.length > 0) {
      return [warn(CAT, "branding.fields", "Branding", `Missing: ${missing.join(", ")}`)];
    }
    return [pass(CAT, "branding.fields", "Branding", "All branding fields set")];
  },
};
