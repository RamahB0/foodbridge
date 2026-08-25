// Small progressive-enhancement layer: everything on the site already works
// via plain HTML forms with no JS at all (deliberate, see README/report on
// the server-rendered architecture). This just adds a confirmation prompt
// before destructive actions so a stray click cannot silently cancel a
// listing or claim.
document.addEventListener('submit', (event) => {
  const form = event.target;
  if (form.matches('form[action*="/cancel"]')) {
    const confirmed = window.confirm('Are you sure? This cannot be undone.');
    if (!confirmed) {
      event.preventDefault();
    }
  }
});
