const fs = require('fs');
const crypto = 'node_modules/@angular-devkit/build-angular/src/webpack/configs/browser.js';
const treeview = 'node_modules/ngx-treeview/fesm2015/ngx-treeview.js';

fs.readFile(crypto, 'utf8', function (err, data) {
  if (err) {
    return console.log(err);
  }
  const result = data.replace(
    /node: false/g,
    'node: {crypto: true, stream: true, fs: "empty"}'
  );

  fs.writeFile(crypto, result, 'utf8', function (err) {
    if (err) return console.log(err);
  });
});

fs.readFile(treeview, 'utf8', function (err, data) {
  if (err) {
    return console.log(err);
  }
  const result = data.replace(
    /this\.internalChecked\s+\=\s+true\;[\n\s]+this\.internalCollapsed\s+\=+\s+false\;/g,
    'this.internalChecked = false;this.internalCollapsed = true;'
  );

  fs.writeFile(treeview, result, 'utf8', function (err) {
    if (err) return console.log(err);
  });
});
