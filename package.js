Package.describe({
  name: 'dmolin:meteor-accounts-feide',
  version: '0.0.1',
  // Brief, one-line summary of the package.
  summary: 'Meteor package to authorize and authenticate against FEIDE with OpenID Connect (Oath2)',
  // URL to the Git repository containing the source code for this package.
  git: '',
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: 'README.md'
});

Package.onUse(function(api) {
  api.versionsFrom('1.8');

  api.use('accounts-base@1.4.0', ['client', 'server']);
  api.use('accounts-oauth@1.1.0', ['client', 'server']);

  api.use('ecmascript', ['client', 'server']);
  api.use('dynamic-import', 'client');
  api.use('modules', 'server');
  api.use('oauth2@1.1.0', ['client', 'server']);
  api.use('oauth@1.1.0', ['client', 'server']);
  api.use('http@1.1.0', ['server']);
  api.use('random@1.0.0', 'client');
  api.use('service-configuration@1.0.0', ['client', 'server']);

  api.addFiles('feide_login_button.css', 'client');
  // api.addFiles('oidc.js');

  api.mainModule('feide_client.js', 'client');
  api.mainModule('feide_server.js', 'server');
  api.export('Feide', ['client', 'server']);
});

Npm.depends({
  lodash: '4.17.10'
});
