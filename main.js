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