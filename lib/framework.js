'use strict';
var path = require('path'),
  fs = require('fs');

// Helper for mapping include file paths to karma file patterns - served, included, but not watched
var createIncludePattern = function (path) {
  return {
    pattern: path,
    included: true,
    served: true,
    watched: false
  };
};

// Loads up a SystemJS config file and returns the configuration
// Taken from how systemjs-builder loads config files inside node
var readConfigFile = function(filePath) {
  var curSystem = global.System;
  var fileConfig = {};
  global.System = {
    config: function(cfg) {
      fileConfig = cfg;
    }
  };
  // jshint evil:true
  new Function(fs.readFileSync(filePath).toString()).call(global);
  global.System = curSystem;
  return fileConfig;
};

// Takes properties from one object and applies them to another IF they don't already exist
var merge = function(src, into) {
  for (var key in src) {
    if (src.hasOwnProperty(key)) {
      if (!into.hasOwnProperty(key)) {
        into[key] = src[key];
      }
    }
  }
};

// Merges 2 SystemJS configs
var mergeConfigs = function(src, into) {
  merge(src, into);
  merge(src.paths, into.paths);
  merge(src.map, into.map);
  merge(src.meta, into.meta);
};

/**
 * Run during karma initialisation.
 * Alters the karma configuration to use SystemJS.
 * @param config {object}
 * @param logger {object} Karma logger object
 */
var initSystemjsFramework = function (config, logger) {
  var log = logger.create('framework.systemjs');
  log.debug('Starting');

  // Resolve paths for dependencies now
  var getDependencyPath = function (moduleName, relativePath) {
    try {
      return path.dirname(require.resolve(moduleName)) + relativePath;
    } catch (e) {
      if (e.code === 'MODULE_NOT_FOUND' && e.message.indexOf(moduleName) !== -1) {
        log.warn('Cannot find "%s".\n  Did you forget to install it ?\n' +
        '  npm install %s --save-dev', moduleName, moduleName);
      } else {
        log.warn('Error during loading "%s":\n  %s', moduleName, e.message);
      }
    }
  };

  // Final files array should look like this: SystemJS libraries - included; SystemJS config - included & watched; App code and tests - served and watched; Plugin adapter - included
  var systemjsConfig = config.systemjs || {};
  systemjsConfig.config = systemjsConfig.config || {};
  var basePath = (config.basePath || '.') + '/';

  // If there's an external SystemJS configuration file...
  if (systemjsConfig.configFile) {
    // Add it's path to config.files
    var cfgPath = basePath + systemjsConfig.configFile;
    config.files.unshift({
      pattern: cfgPath,
      included: true,
      served: true,
      watched: true
    });

    // Load it, and merge it with the config
    mergeConfigs(readConfigFile(cfgPath), systemjsConfig.config);
  }

  var es6ModuleLoaderPath = getDependencyPath('es6-module-loader', '/../dist/es6-module-loader.src.js');
  var systemjsPath = getDependencyPath('systemjs', '/system.src.js');

  // Adds dependencies to start of config.files: es6-module-loader, and system.js
  // Don't watch, since these files should never change
  config.files.unshift(
    createIncludePattern(es6ModuleLoaderPath),
    createIncludePattern(systemjsPath)
  );

  // Include the runtime for the chosen transpiler
  // Default to use Traceur as transpiler, but make it possible to avoid using
  // a transpiler by setting the transpiler option to null.
  var useTranspiler = systemjsConfig.config.transpiler !== null;
  if (useTranspiler) {
    var transpilerPath = systemjsConfig.config.transpiler === 'babel' ?
      getDependencyPath('babel', '/../../../external-helpers.js') :
      getDependencyPath('traceur', '/../../bin/traceur-runtime.js');

    // Don't watch, since this file should never change
    config.files.unshift(
      createIncludePattern(transpilerPath)
    );
  }

  // system.js-0.16 uses Function.prototype.bind, which PhantomJS does not support.
  if (config.browsers && config.browsers.indexOf('PhantomJS') !== -1) {
    var phantomjsPolyfillPath = getDependencyPath('phantomjs-polyfill', '/bind-polyfill.js');
    config.files.unshift(
      createIncludePattern(phantomjsPolyfillPath)
    );
  }

  // Adds karma-systemjs adapter.js to end of config.files
  config.files.push(createIncludePattern(__dirname + '/adapter.js'));

  // Adding configuration to be passed to the adapter running on the browser
  config.client.systemjs = {
    config: systemjsConfig.config
  };
};
initSystemjsFramework.$inject = ['config', 'logger'];

module.exports = initSystemjsFramework;