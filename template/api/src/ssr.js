const isProd = process.env.NODE_ENV === 'production';
const path = require('path');
const fs = require('fs');
const { createBundleRenderer } = require('vue-server-renderer');

module.exports = function() {

  const app = this;
  
  const indexPath = path.join(app.get('src'), 'index.html');
  let indexHTML = fs.readFileSync(indexPath, 'utf8');

  // We read the file generated by webpack with the compiled app
  const serverBundlePath = path.join( 
    app.get('ssr'),
    'vue-ssr-server-bundle.json' 
  );

  let clientManifest = require(path.join(
    app.get('public'), 'vue-ssr-client-manifest.json'
  ))

  const options = {
    runInNewContext: false,
    clientManifest: clientManifest,
    template: indexHTML
      .replace(
        '<div id="q-app"></div>', 
        '<!--vue-ssr-outlet-->'
      ),
    cache: isProd ? require('lru-cache')({
      max: 1000,
      maxAge: 1000 * 60 * 15
    }) : undefined
  };

  let bundleRenderer = createBundleRenderer(
    serverBundlePath, 
    options
  );

  // For all routes load the index.html file, assets should be caught by feathers.static middleware
  app.get('/*', (req, res) => {

    if (!isProd) {
      bundleRenderer = createBundleRenderer(
        serverBundlePath, 
        options
      );
    }

    // We need the req.url to know which vue component to render
    var context = { url: req.url };

    bundleRenderer.renderToString(context, (err, html) => {

      if (err) {
        console.warn('Error with SSR:', err);
        return res.status(500).send('Sorry, but there was a problem on the server and this page could not be rendered.');
      }

      return res.status(200).send(html);
    });

  });
};
