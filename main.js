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

const codeOverlay = document.getElementById('codeOverlay');
const closeCodeBtn = document.getElementById('closeCodeBtn');
const codeIcons = document.querySelectorAll('.action-icon[alt="Code"]');

codeIcons.forEach(icon => {
  icon.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    codeOverlay.classList.add('active');
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