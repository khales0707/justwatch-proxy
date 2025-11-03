// api/justwatch.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    const title = (req.query.title || "").trim();
    const country = (req.query.country || "AR").toUpperCase();

    if (!title) {
      return res.status(400).json({ error: "Falta parámetro 'title'" });
    }

    // 1) Buscar el título en JustWatch
    const searchResp = await fetch("https://apis.justwatch.com/content/titles/es_AR/popular", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        page_size: 5,
        page: 1,
        query: title,
        content_types: ["movie", "show"]
      })
    });

    const searchData = await searchResp.json();
    const item = (searchData.items || [])[0];
    if (!item) {
      return res.json({ offers: [], country, title });
    }

    // 2) Obtener ofertas/donde ver
    const detailsResp = await fetch(`https://apis.justwatch.com/content/titles/movie/${item.id}/locale/es_${country}`);
    const details = await detailsResp.json();

    const offers = (details.offers || [])
      .filter(o => o.country === country)
      .map(o => ({
        // Tipo: flatrate (streaming), rent (alquiler), buy (compra)
        monetization_type: o.monetization_type,
        provider_id: o.provider_id,
        retail_price: o.retail_price || null,
        currency: o.currency || null,
        presentation_type: o.presentation_type || null
      }));

    // 3) Mapear providers (id -> nombre/logo) con catálogo público
    const providersResp = await fetch(`https://apis.justwatch.com/content/providers/locale/es_${country}`);
    const providersCatalog = await providersResp.json();
    const providersIndex = {};
    providersCatalog.forEach(p => {
      providersIndex[p.id] = {
        name: p.clear_name,
        logo: p.icon_url // típico: https://images.justwatch.com/icon/{id}/{size}/{path}.png
      };
    });

    const enriched = offers.map(o => ({
      ...o,
      provider_name: providersIndex[o.provider_id]?.name || `Provider ${o.provider_id}`,
      provider_logo: providersIndex[o.provider_id]?.logo || null
    }));

    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    return res.json({
      country,
      title,
      item_id: item.id,
      offers: enriched
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Error interno en JustWatch proxy" });
  }
}
