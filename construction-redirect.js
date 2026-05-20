(function () {
  var path = window.location.pathname;
  if (/\/en-construccion\.html$/i.test(path)) {
    return;
  }
  if (/\.(css|js|png|jpe?g|webp|svg|ico|gif|woff2?)$/i.test(path)) {
    return;
  }
  if (path.indexOf('/api/') === 0) {
    return;
  }
  window.location.replace('/en-construccion.html' + window.location.search + window.location.hash);
})();
