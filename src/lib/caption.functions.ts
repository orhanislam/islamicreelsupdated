/**
 * Professional Social Media Caption Formatting Utility
 * Generates broadcast-grade, high-conversion captions for TikTok, Instagram Reels, and YouTube Shorts.
 */

export function formatViralSocialCaption(title: string, summary?: string): string {
  // Clean up title and format nicely
  const cleanTitle = title
    .replace(/^["'«]+|["'»]+$/g, "")
    .trim();

  // Make header uppercase or bold-styled with clean spacing
  const header = `🕋 ${cleanTitle.toUpperCase()}`;

  // Format description block if present
  let descriptionBlock = "";
  if (summary && summary.trim()) {
    const cleanSummary = summary.replace(/^["'«]+|["'»]+$/g, "").trim();
    descriptionBlock = `\n\n📖 ${cleanSummary}`;
  }

  // Professional Call to Action (CTA) block optimized for TikTok & Instagram algorithm (Saves & Shares)
  const ctaBlock = `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 ЗАПАЗИ това видео, за да си припомняш тази мъдрост!
🔄 СПОДЕЛИ с приятел или в Story — „Който посочи добро, получава награда колкото онзи, който го е извършил.“ (Сахих Муслим)
💬 НАПИШИ „Амин“ или „Субханаллах“ в коментарите!
━━━━━━━━━━━━━━━━━━━━━━━━━━`;

  // Curated high-volume and niche hashtags
  const hashtags = `\n\n#ислям #коран #хадиси #мюсюлмани #напомняне #вяра #аллах #българия #напомнянезадушата #истината #религия #islam #islamicvideo #islamicreels #muslimreels #fyp #viral #tiktokviral`;

  return `${header}${descriptionBlock}${ctaBlock}${hashtags}`;
}
