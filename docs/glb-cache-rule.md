# GLB edge caching

The storefront publishes product GLBs under immutable, job-specific URLs such as:

`/api/assets/products/<productId>/models/<conversionJobId>.glb`

The Next.js asset route already returns:

- `public, max-age=31536000, immutable` for GLB responses.
- `public, max-age=86400` for other assets.

Create a Cloudflare Cache Rule for the production asset hostname. The current production asset URL resolves through `api.voxel3d.org`; if a dedicated `assets.voxel3d.org` hostname is introduced, apply the same rule there.

Recommended expression:

```
(http.host eq "api.voxel3d.org" and ends_with(http.request.uri.path, ".glb"))
```

Then set:

- Cache eligibility: **Eligible for cache**
- Edge Cache TTL: **Respect origin** (or a long explicit TTL)
- Browser TTL: **Respect origin**
- Do not add cookies, authorization headers, or device type to the cache key.

Because published model URLs are immutable, an old cached GLB never needs to be overwritten. Publishing a replacement creates a new URL.

After deploying the rule, verify a product GLB returns `CF-Cache-Status: HIT` on the second request and that the response still has the immutable Cache-Control header.
