'use strict';
var Builder = require('systemjs-builder'),
  path = require('path');

/**
 * Takes a file path and the baseURL and returns the module name
 * to pass to System.import()
 * @param filePath {string}
 * @param baseURL {string}
 * @returns {string}
 */
var getModuleNameFromPath = function(filePath, baseURL) {
  // Convert file paths to module name by stripping the baseURL and the ".js" extension
  return filePath
    .replace(/\.js$/, '')
    .replace(new RegExp('^' + baseURL.replace('/', '\/')), '');
};

/**
 * Returns a function which is run over every file that matches the preprocessor pattern.
 * For each file, it resolves the module name and generates a bundle using systemjs-builder
 */
var initSystemjsPreprocessor = function(config, logger) {
  var log = logger.create('preprocessor.systemjs');
  log.debug('Starting');

  // Resolve the base path for JS modules
  var baseModulePath = config.basePath + config.systemjs.config.baseURL;

  // Set the baseURL as relative to the cwd
  config.systemjs.config.baseURL = '.' + config.systemjs.config.baseURL;

  // Going to keep a history of the test suites that are preprocessed.
  // All the previously processed test suites will be excluded from the current suite's bundle
  var testSuiteModules = [];
  config.client.systemjs = {
    testSuiteModules: testSuiteModules
  };

  return function(content, file, done) {
    log.debug('Processing %s', file.originalPath);

    var moduleName = getModuleNameFromPath(file.originalPath, baseModulePath);
    log.debug('Module: %s', moduleName);

    var expression = moduleName;
    var index = testSuiteModules.indexOf(moduleName);
    if (index === -1) {
      index = testSuiteModules.length;
      testSuiteModules.push(moduleName);
    }
    if (index > 0) {
      expression += ' - ' + testSuiteModules.slice(0, index).join(' - ');
    }
    log.debug('Expression: %s', expression);

    // TODO: Find a way to bundle all the test suites at once
    var builder = new Builder();
    builder.config(config.systemjs.config);
    builder.trace(expression).then(function(tree) {
      // tree contains keys for all modules in the tree
      // tree can also be built directly:
      // TODO: Use tree to setup watchers on dependencies
      return builder.buildTree(tree);
    }).then(function(bundle) {
      done(null, bundle.source);
    }).catch(function(e) {
      log.error('Error processing %s\n%s', file.originalPath, e.stack);
      return done(e, null);
    });
  };
};
initSystemjsPreprocessor.$inject = ['config', 'logger'];

module.exports = initSystemjsPreprocessor;
