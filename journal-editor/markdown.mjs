export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
}

// A small, explicitly supported Markdown subset. Code spans are tokenized before
// emphasis and links, so their literal content can never become markup.
function inline(text) {
  const tokens = /(`+)(.*?)\1|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let html = '', last = 0, match;
  while ((match = tokens.exec(text))) {
    html += escapeHtml(text.slice(last, match.index));
    if (match[1]) html += `<code>${escapeHtml(match[2])}</code>`;
    else if (match[3]) html += `<a href="${escapeHtml(match[4])}" target="_blank" rel="noopener noreferrer">${inline(match[3])}</a>`;
    else if (match[5]) html += `<strong>${inline(match[5])}</strong>`;
    else html += `<em>${escapeHtml(match[6])}</em>`;
    last = tokens.lastIndex;
  }
  return html + escapeHtml(text.slice(last));
}

export function markdownToHtml(markdown) {
  const lines = markdown.replace(/\r/g, '').split('\n');
  let html = '', list = null, paragraph = [], quote = [], code = null;
  const flushParagraph = () => { if (paragraph.length) html += `<p>${paragraph.map((line) => inline(line.replace(/ {2}$/, ''))).join('<br>')}</p>`; paragraph = []; };
  const closeList = () => { if (list) html += `</${list}>`; list = null; };
  const closeQuote = () => { if (quote.length) html += `<blockquote>${quote.map(inline).join('<br>')}</blockquote>`; quote = []; };
  const flush = () => { flushParagraph(); closeList(); closeQuote(); };
  for (const line of lines) {
    if (code) {
      if (/^\s*```\s*$/.test(line)) { html += `<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`; code = null; }
      else code.push(line);
      continue;
    }
    if (/^\s*```/.test(line)) { flush(); code = []; continue; }
    const heading = line.match(/^(#{1,6})\s+(.+)/);
    const quoted = line.match(/^>\s?(.*)/);
    const bullet = line.match(/^[-*+]\s+(.+)/);
    const numbered = line.match(/^(\d+)\.\s+(.+)/);
    if (heading) { flush(); html += `<h${heading[1].length}>${inline(heading[2])}</h${heading[1].length}>`; }
    else if (/^\s*---+\s*$/.test(line)) { flush(); html += '<hr>'; }
    else if (quoted) { flushParagraph(); closeList(); quote.push(quoted[1]); }
    else if (bullet || numbered) {
      flushParagraph(); closeQuote();
      const kind = bullet ? 'ul' : 'ol';
      if (list !== kind) { closeList(); html += bullet ? '<ul>' : `<ol start="${Number(numbered[1])}">`; list = kind; }
      html += `<li>${inline(bullet ? bullet[1] : numbered[2])}</li>`;
    } else if (!line.trim()) flush();
    else { closeList(); closeQuote(); paragraph.push(line); }
  }
  flush();
  if (code) html += `<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`;
  return html;
}
