const path = require('path');
const merge = require('deepmerge');
const defaultConfig = require('../config/default');

// In: docker args array [string]
// Out: [number] | null
function getExposedPorts(args) {
  if (!Array.isArray(args)) {
    return null;
  }
  const portArg = args
    .filter(arg => typeof arg === 'string')
    .map(arg => arg.trimStart())
    .find(arg => arg.startsWith("-p"));
  if (portArg) {
    const matches = Array.from(portArg.matchAll(/(\d+):/g));
    if (matches.length > 0) {
      return matches.map(match => Number(match[1])).filter(port => !isNaN(port));
    }
  }

  return null;
}

function getExposedPort(args) {
  const ports = getExposedPorts(args);
  if (ports) {
    return ports[0];
  }

  return null;
}

function isGitUrl(pathOrUrl) {
  return /(https?:\/\/|git@)/.test(pathOrUrl);
}

function resolvePath(reposDir, pathOrUrl) {
  const split = pathOrUrl.split('/');
  return isGitUrl(pathOrUrl)
    ? path.join(reposDir, split[split.length - 1])
    : pathOrUrl;
}

// standalone: boolean | string | object
function getConfig(standalone, env, port) {
  let res = defaultConfig;
  if (typeof standalone === 'object') {
    res = merge(standalone, defaultConfig);
  } else if (typeof standalone === 'string') {
    try {
      const config = require(process.cwd() + '/standalone.config');
      res = merge(res, config);
    }
    catch {
      console.warn('No standalone config provided');
    }
  }

  // Resolve functions that depend on env or port
  Object.keys(res || {})
    .filter(key => typeof res[key] === 'function')
    .forEach(key => res[key] = res[key]({ env, port }));

  // Don't start keycloak if not replacing keycloakUri in chrome.js
  if (res.chrome && !res.chrome.keycloakUri.includes('localhost')) {
    delete res.chrome.services;
  }

  return res;
}

module.exports = {
  NET: 'clouddot_net',
  getExposedPorts,
  getExposedPort,
  getConfig,
  isGitUrl,
  resolvePath
};
