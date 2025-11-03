// api/justwatch.js
const fetch = require("node-fetch");

module.exports = async (req, res) => {
  try {
    const { title = "", country = "AR" } = req.query;
    if (!title) {
      return res.status(400).json({ error: "Falta parámetro 'title'" });
    }

    // Buscar en JustWatch
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

    // Detalles
    const detailsResp = await fetch(`https://apis.justwatch.com/content/titles/movie/${item.id}/locale/es_${country}`);
    const details = await detailsResp.json();

    const offers = (details.offers || []).filter(o => o.country === country);

    res.json({ country, title, item_id: item.id, offers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno en JustWatch proxy" });
  }
};
