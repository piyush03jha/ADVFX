import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/api/assets/"],
      disallow: [
        "/admin/",
        "/api/",
        "/account/",
        "/cart/",
        "/checkout/",
        "/payment/",
        "/order/",
        "/wishlist/",
        "/login/",
        "/register/",
        "/forgot-password/",
        "/reset-password/",
        "/verify-email/",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
