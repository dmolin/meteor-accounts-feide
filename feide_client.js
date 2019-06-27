
if (!Meteor.isClient) return;

require("./service");
import _ from "lodash";

import { OAuth } from "meteor/oauth";

Feide = {};

// Request OpenID Connect credentials for the user
// @param options {optional}
// @param credentialRequestCompleteCallback {Function} Callback function to call on
//   completion. Takes one argument, credentialToken on success, or Error on
//   error.
Feide.requestCredential = function (options, credentialRequestCompleteCallback) {
  // support both (options, callback) and (callback).
  if (!credentialRequestCompleteCallback && typeof options === 'function') {
    credentialRequestCompleteCallback = options;
    options = {};
  }

  var config = ServiceConfiguration.configurations.findOne({ service: 'feide' });
  if (!config) {
    credentialRequestCompleteCallback && credentialRequestCompleteCallback(
      new ServiceConfiguration.ConfigError('Service FEIDE not configured.'));
    return;
  }

  var credentialToken = Random.secret();
  var loginStyle = OAuth._loginStyle(serviceName, config, options);
  var scope = config.requestPermissions || ['openid', 'profile', 'email', 'groups', 'userinfo', 'userinfo-extra'];

  // options
  options = options || {};
  options.client_id = config.clientId;
  options.response_type = options.response_type || 'code';
  options.redirect_uri = OAuth._redirectUri(serviceName, config);
  options.state = OAuth._stateParam(loginStyle, credentialToken, options.redirectUrl);
  options.scope = scope.join(' ');

  if (config.loginStyle && config.loginStyle == 'popup') {
    options.display = 'popup';
  }

  var loginUrl = config.serverUrl + config.authorizationEndpoint;
  // check if the loginUrl already contains a "?"
  var first = loginUrl.indexOf('?') === -1;
  for (var k in options) {
    if (first) {
      loginUrl += '?';
      first = false;
    }
    else {
      loginUrl += '&'
    }
    loginUrl += encodeURIComponent(k) + '=' + encodeURIComponent(options[k]);
  }

  options.popupOptions = options.popupOptions || {};
  var popupOptions = {
    width: options.popupOptions.width || 320,
    height: options.popupOptions.height || 450
  };

  OAuth.launchLogin({
    loginService: serviceName,
    loginStyle: loginStyle,
    loginUrl: loginUrl,
    credentialRequestCompleteCallback: credentialRequestCompleteCallback,
    credentialToken: credentialToken,
    popupOptions: popupOptions,
  });
};

Meteor.loginWithFeide = function (options, callback) {
  // support a callback without options
  if (!callback && typeof options === "function") {
    callback = options;
    options = null;
  }

  var credentialRequestCompleteCallback = Accounts.oauth.credentialRequestCompleteHandler(callback);
  Feide.requestCredential(options, credentialRequestCompleteCallback);
};
