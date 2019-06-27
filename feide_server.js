require("./service");
import _ from "lodash";

if (!Meteor.isServer) return;

import { OAuth } from "meteor/oauth";

let userAgent = "Meteor";
if (Meteor.release) {
  userAgent += "/" + Meteor.release;
}

Meteor.startup(() => {
  if (!Meteor.settings.private.feide) {
    console.warn("FEIDE Service Configuration is disabled (no config)");
    return;
  }

  var feide = Meteor.settings.private.feide;

  ServiceConfiguration.configurations.upsert(
    { service: 'feide' },
    {
      $set: {
        loginStyle: "popup",
        ...feide
      }
    }
  );
});

const getConfiguration = function () {
  var config = ServiceConfiguration.configurations.findOne({ service: 'feide' });
  if (!config) {
    throw new ServiceConfiguration.ConfigError('Service oidc not configured.');
  }
  return config;
};

const getEndpoint = (url, config) => {
  return url.includes("https://") ?
    url :
    config.serverUrl + url;
}

const getToken = function (query) {
  var debug = process.env.DEBUG || false;
  var config = getConfiguration();
  var serverTokenEndpoint = config.serverUrl + config.tokenEndpoint;
  var response;

  try {
    response = HTTP.post(
      serverTokenEndpoint,
      {
        headers: {
          Accept: 'application/json',
          "User-Agent": userAgent
        },
        params: {
          code: query.code,
          client_id: config.clientId,
          client_secret: OAuth.openSecret(config.secret),
          redirect_uri: OAuth._redirectUri('feide', config),
          grant_type: 'authorization_code',
          state: query.state
        }
      }
    );
  } catch (err) {
    throw _.extend(new Error("Failed to get token from OIDC " + serverTokenEndpoint + ": " + err.message),
      { response: err.response });
  }
  if (response.data.error) {
    // if the http response was a json object with an error attribute
    throw new Error("Failed to complete handshake with OIDC " + serverTokenEndpoint + ": " + response.data.error);
  } else {
    if (debug) console.log('XXX: getToken response: ', response.data);
    return response.data;
  }
};

const getUserInfo = function (accessToken) {
  var debug = process.env.DEBUG || false;
  var config = getConfiguration();

  if (!_.get(config, "userinfoEndpoint")) return;

  const serverUserinfoEndpoint = getEndpoint(config.userinfoEndpoint, config);
  var response;
  try {
    response = HTTP.get(
      serverUserinfoEndpoint,
      {
        headers: {
          "User-Agent": userAgent,
          "Authorization": "Bearer " + accessToken
        }
      }
    );
  } catch (err) {
    throw _.extend(new Error("Failed to fetch userinfo from OIDC " + serverUserinfoEndpoint + ": " + err.message),
      { response: err.response });
  }
  if (debug) console.log('XXX: getUserInfo response: ', response.data);
  return response.data;
};

const getGroups = function (accessToken) {
  var debug = process.env.DEBUG || false;
  var config = getConfiguration();

  const groupsEndpoint = getEndpoint(config.groupsEndpoint, config);
  let response;
  try {
    response = HTTP.get(
      groupsEndpoint,
      {
        headers: {
          "User-Agent": userAgent,
          "Authorization": "Bearer " + accessToken
        }
      }
    );
  } catch (err) {
    throw _.extend(new Error("Failed to fetch identity from Dataporten. " + err.message),
      { response: err.response });
  }
  if (debug) console.log('XXX: getGroups response: ', response.data);
  return response.data;
};

OAuth.registerService('feide', 2, null, function (query) {
  var debug = process.env.DEBUG || false;
  var token = getToken(query);
  if (debug) console.log('XXX: register token:', token);

  var accessToken = token.access_token || token.id_token;
  var expiresAt = (+new Date) + (1000 * parseInt(token.expires_in, 10));

  var userinfo = getUserInfo(accessToken);
  var groups = getGroups(accessToken);

  if (debug) console.log('XXX: userinfo:', userinfo);

  var serviceData = {
    id: userinfo.user.userid,
    accessToken: OAuth.sealSecret(accessToken),
    expiresAt,
    email: userinfo.user.email,
    groups: groups,
    userid_sec: userinfo.user.userid_sec[0],
    profilepicture: userinfo.user.profilephoto,
  };

  // serviceData.expiresAt = expiresAt;

  if (token.refresh_token) {
    serviceData.refreshToken = token.refresh_token;
  }

  if (debug) console.log('XXX: serviceData:', serviceData);

  const profile = {
    username: userinfo.user.userid,
    name: userinfo.user.name,
    email: userinfo.user.email
  };

  if (debug) console.log('XXX: profile:', profile);

  var result = {
    serviceData: serviceData,
    options: { profile: profile }
  };

  return result;
});

Feide = {
  retrieveCredential: function (credentialToken, credentialSecret) {
    return OAuth.retrieveCredential(credentialToken, credentialSecret);
  }
};
