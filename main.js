const searchInput = document.getElementById('searchInput');
const cards = document.querySelectorAll('#cardContainer .box');

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

const actionIcons = document.querySelectorAll('.action-icon');

actionIcons.forEach(icon => {
  icon.addEventListener('click', (e) => {
    e.preventDefault(); 
    e.stopPropagation(); 

    if (icon.alt === 'Code') {
      console.log('Click pe Code');
      
    } else if (icon.alt === 'Bookmark') {
      console.log('Click pe Bookmark');
      
    }
  });
});