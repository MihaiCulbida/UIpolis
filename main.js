const searchInput = document.getElementById('searchInput');
const cards = document.querySelectorAll('#cardContainer .box');
const siteHeader = document.getElementById('siteHeader');

searchInput.addEventListener('input', () => {
  const query = searchInput.value.trim().toLowerCase();

  cards.forEach(card => {
    const name = card.querySelector('.box-name').textContent.toLowerCase();
    card.classList.toggle('hidden', query.length > 0 && !name.includes(query));
  });
});

document.addEventListener('keydown', (e) => {
  const isShortcut = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k';
  if (isShortcut) {
    e.preventDefault();
    searchInput.focus();
  }
});

window.addEventListener('scroll', () => {
  if (window.scrollY > 20) {
    siteHeader.classList.add('scrolled');
  } else {
    siteHeader.classList.remove('scrolled');
  }
});

const actionIcons = document.querySelectorAll('.action-icon[alt="Bookmark"]');

actionIcons.forEach(icon => {

  const cardName = icon.closest('.box').querySelector('.box-name').textContent;
  const savedBookmarks = JSON.parse(localStorage.getItem('bookmarks') || '[]');
  if (savedBookmarks.includes(cardName)) {
    icon.src = 'img/bookmark1.png';
    icon.classList.add('bookmarked');
  }

  icon.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();

    const isBookmarked = icon.classList.toggle('bookmarked');
    icon.src = isBookmarked ? 'img/bookmark1.png' : 'img/bookmark.png';

    let bookmarks = JSON.parse(localStorage.getItem('bookmarks') || '[]');
    if (isBookmarked) {
      bookmarks.push(cardName);
    } else {
      bookmarks = bookmarks.filter(name => name !== cardName);
    }
    localStorage.setItem('bookmarks', JSON.stringify(bookmarks));

  });
});

const savedOverlay = document.getElementById('savedOverlay');
const savedList = document.getElementById('savedList');
const closeSavedBtn = document.getElementById('closeSavedBtn');

function getBookmarks() {
  return JSON.parse(localStorage.getItem('bookmarks') || '[]');
}

function setBookmarks(bookmarks) {
  localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
}

function syncCardIcon(cardName, isBookmarked) {
  cards.forEach(card => {
    const name = card.querySelector('.box-name').textContent;
    if (name === cardName) {
      const icon = card.querySelector('.action-icon[alt="Bookmark"]');
      icon.src = isBookmarked ? 'img/bookmark1.png' : 'img/bookmark.png';
      icon.classList.toggle('bookmarked', isBookmarked);
    }
  });
}

function renderSavedList() {
  const bookmarks = getBookmarks();
  savedList.innerHTML = '';

  if (bookmarks.length === 0) {
    savedList.innerHTML = '<div class="modal-empty">No saved items yet.</div>';
    return;
  }

  bookmarks.forEach(name => {
    let href = '#';
    cards.forEach(card => {
      if (card.querySelector('.box-name').textContent === name) {
        href = card.getAttribute('href');
      }
    });

    const item = document.createElement('div');
    item.className = 'modal-item';
    item.dataset.name = name;
    item.dataset.href = href;
    item.innerHTML = `
      <span class="modal-item-name">${name}</span>
      <img src="img/bookmark1.png" class="modal-item-remove" alt="Remove">
    `;
    savedList.appendChild(item);
  });
}

function openSavedModal() {
  renderSavedList();
  savedOverlay.classList.add('active');
}

function closeSavedModal() {
  savedOverlay.classList.remove('active');
}

openSavedBtn.addEventListener('click', openSavedModal);
closeSavedBtn.addEventListener('click', closeSavedModal);

savedOverlay.addEventListener('click', (e) => {
  if (e.target === savedOverlay) {
    closeSavedModal();
  }
});

savedList.addEventListener('click', (e) => {
  const removeIcon = e.target.closest('.modal-item-remove');
  const item = e.target.closest('.modal-item');
  if (!item) return;

  if (removeIcon) {
    const name = item.dataset.name;
    const bookmarks = getBookmarks().filter(n => n !== name);
    setBookmarks(bookmarks);
    syncCardIcon(name, false);
    renderSavedList();
    return;
  }

  window.location.href = item.dataset.href;
});

const codeOverlay   = document.getElementById('codeOverlay');
const closeCodeBtn  = document.getElementById('closeCodeBtn');
const codeIcons     = document.querySelectorAll('.action-icon[alt="Code"]');
const codeTabs      = document.querySelectorAll('.code-tab');
const codeDisplay   = document.getElementById('codeDisplay');

let currentCode = { html: '', css: '', js: '' };

function resolveUrl(href, baseUrl) {
  try {
    return new URL(href, baseUrl).href;
  } catch {
    return href;
  }
}

async function fetchExternal(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return `/* nu am putut incarca: ${url} */`;
    return await res.text();
  } catch {
    return `/* eroare la incarcarea: ${url} */`;
  }
}

async function extractParts(rawHtml, baseUrl) {

  let css = '';

  const styleMatches = [...rawHtml.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)];
  css += styleMatches.map(m => m[1].trim()).join('\n\n');

  const linkMatches = [...rawHtml.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi)];
  for (const tag of linkMatches) {
    const hrefMatch = tag[0].match(/href=["']([^"']+)["']/i);
    if (!hrefMatch) continue;
    const cssText = await fetchExternal(resolveUrl(hrefMatch[1], baseUrl));
    css += (css ? '\n\n' : '') + `/* ${hrefMatch[1]} */\n` + cssText.trim();
  }

  let js = '';

  const scriptMatches = [...rawHtml.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)];
  for (const [, attrs, inlineCode] of scriptMatches) {
    const srcMatch = attrs.match(/src=["']([^"']+)["']/i);
    if (srcMatch) {
      const jsText = await fetchExternal(resolveUrl(srcMatch[1], baseUrl));
      js += (js ? '\n\n' : '') + `/* ${srcMatch[1]} */\n` + jsText.trim();
    } else if (inlineCode.trim()) {
      js += (js ? '\n\n' : '') + inlineCode.trim();
    }
  }

  let html = rawHtml;
  const bodyMatch = rawHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (bodyMatch) html = bodyMatch[1];

  html = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .trim();

  return { html, css: css.trim(), js: stripLiveReloadScript(js.trim()) };
}

function stripLiveReloadScript(js) {
  return js
    .replace(/\/\/\s*<!\[CDATA\[[\s\S]*?\/\/\s*\]\]>/g, '')
    .replace(/[^\n]*livereload[^\n]*\n?/gi, '')
    .trim();
}

function showTab(tabName) {
  codeTabs.forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });

  const content = currentCode[tabName];
  codeDisplay.textContent = content && content.length > 0
    ? content
    : `/* nu s-a gasit continut pentru ${tabName.toUpperCase()} */`;
}

codeTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    showTab(tab.dataset.tab);
  });
});

codeIcons.forEach(icon => {
  icon.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const cardHref = icon.closest('.box').getAttribute('href');

    currentCode = { html: 'Se incarca...', css: 'Se incarca...', js: 'Se incarca...' };
    showTab('html');
    codeOverlay.classList.add('active');

    try {
      const res = await fetch(cardHref);
      if (!res.ok) throw new Error('Fisierul nu a putut fi gasit: ' + cardHref);

      const rawHtml = await res.text();
      const baseUrl = new URL(cardHref, window.location.href).href;
      currentCode = await extractParts(rawHtml, baseUrl);
    } catch (err) {
      console.error(err);
      currentCode = {
        html: '// Eroare la incarcarea fisierului.\n// Verifica daca site-ul ruleaza pe un server local (nu direct din file://).',
        css: '',
        js: ''
      };
    }

    showTab('html');
  });
});

closeCodeBtn.addEventListener('click', () => {
  codeOverlay.classList.remove('active');
});

codeOverlay.addEventListener('click', (e) => {
  if (e.target === codeOverlay) {
    codeOverlay.classList.remove('active');
  }
});