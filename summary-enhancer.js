(() => {
  const SUMMARIES = {
    300: {
      topics: [
        'Speciální živé nahrávání v lese u ohně, do kterého otázkami vstupovali posluchači.',
        'Kontakt s mimozemskou civilizací: jak by mohl probíhat a proč by bylo obtížné porozumět zprávě bez společného kontextu.',
        'Rychlost světla: zda se světlo může zrychlovat a proč je jeho rychlost ve vakuu základní mezí fyziky.',
        'Umělá inteligence: jak ji usměrňovat, jaké má limity a proč záleží na cílech, pravidlech a lidské kontrole.',
        'Diskuse propojuje otázky posluchačů s fyzikou, kosmologií a moderními technologiemi.'
      ],
      concepts: [
        'Mimozemská inteligence – hypotetická inteligentní civilizace mimo Zemi.',
        'Komunikační kontext – společné znalosti a předpoklady potřebné k pochopení zprávy.',
        'Rychlost světla – přibližně 300 000 km/s ve vakuu.',
        'Speciální relativita – teorie popisující prostor a čas při vysokých rychlostech.',
        'Umělá inteligence – systémy schopné řešit úlohy, které běžně vyžadují lidské rozpoznávání, rozhodování nebo tvorbu.',
        'AI alignment – snaha nastavit cíle a chování AI tak, aby odpovídaly lidským záměrům a bezpečnostním pravidlům.'
      ],
      note: 'Pilotní shrnutí vytvořené z veřejně dostupného popisu epizody. Úplný přepis nebo titulky se pro tento díl nepodařilo spolehlivě získat.'
    }
  };

  const style = document.createElement('style');
  style.textContent = `
    .episode-summary{margin-top:10px;border:1px solid var(--line,#dbe2ea);border-radius:12px;background:#fafaff}
    .episode-summary>summary{cursor:pointer;font-weight:750;padding:10px 12px;color:#392b9b;list-style:none}
    .episode-summary>summary::-webkit-details-marker{display:none}
    .episode-summary>summary::after{content:'▾';float:right;transition:.2s}
    .episode-summary[open]>summary::after{transform:rotate(180deg)}
    .episode-summary-body{padding:0 12px 12px;color:#354158;line-height:1.48}
    .episode-summary-body h3{font-size:.92rem;margin:.75rem 0 .3rem}
    .episode-summary-body ul{margin:.25rem 0;padding-left:1.25rem}
    .episode-summary-body li{margin:.25rem 0}
    .summary-note{font-size:.78rem;color:var(--muted,#64748b);margin-top:.65rem}
  `;
  document.head.appendChild(style);

  const esc = value => String(value).replace(/[&<>"']/g, char => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[char]));

  function addSummaries() {
    document.querySelectorAll('#episodes article').forEach(card => {
      if (card.querySelector('.episode-summary')) return;
      const title = card.querySelector('h2')?.textContent || '';
      const match = title.match(/Vedátorský podcast\s+(\d+)/i);
      if (!match) return;
      const summary = SUMMARIES[Number(match[1])];
      if (!summary) return;

      const details = document.createElement('details');
      details.className = 'episode-summary';
      details.innerHTML = `
        <summary>Shrnutí dílu</summary>
        <div class="episode-summary-body">
          <h3>O čem se mluví</h3>
          <ul>${summary.topics.map(item => `<li>${esc(item)}</li>`).join('')}</ul>
          <h3>Základní pojmy</h3>
          <ul>${summary.concepts.map(item => `<li>${esc(item)}</li>`).join('')}</ul>
          <div class="summary-note">${esc(summary.note)}</div>
        </div>`;
      card.appendChild(details);
    });
  }

  addSummaries();
  new MutationObserver(addSummaries).observe(document.body, {childList:true, subtree:true});
})();
