'use strict';
var initSystemJs = require('../lib/framework.js');

describe('initSystemJs', function () {
	var config, logger;
	beforeEach(function () {
		config = {
			files: [],
			client: {},
			systemjs: {
				config: {}
			}
		};
		logger = jasmine.createSpyObj('logger', ['create', 'debug', 'warn', 'error']);
		logger.create.andCallFake(function() {
			return logger;
		});
	});

	it('Throws an error if there\'s no systemjs config specified in the karma config', function() {
		config.systemjs.config = null;
		expect(function() {initSystemJs(config, logger);}).toThrow();
		expect(logger.error).toHaveBeenCalledWith('The SystemJS config must be specified in the karma config at `systemjs.configFile` and/or `systemjs.config`.');
	});

	it('Adds file patterns for traceur, es6-module-loader, and SystemJS', function () {
		initSystemJs(config, logger);
		expect(config.files[0].pattern).toMatch(/\/traceur-runtime\.js$/);
		expect(config.files[1].pattern).toMatch(/\/es6-module-loader\.src\.js$/);
		expect(config.files[2].pattern).toMatch(/\/system\.src\.js$/);
	});

  it('Adds Babel instead of Traceur if the transpiler option is set', function () {
    config.systemjs.config = {transpiler: 'babel'};
    initSystemJs(config, logger);
    expect(config.files[0].pattern).toMatch(/\/babel\/.*?\/external-helpers\.js$/);
    expect(config.files[1].pattern).toMatch(/\/es6-module-loader\.src\.js$/);
    expect(config.files[2].pattern).toMatch(/\/system\.src\.js$/);
  });

	it('Omits adding a file pattern for a transpiler if the transpiler option is set to null', function () {
		config.systemjs.config = {transpiler: null};
		initSystemJs(config, logger);
		expect(config.files[0].pattern).toMatch(/\/es6-module-loader\.src\.js$/);
		expect(config.files[1].pattern).toMatch(/\/system\.src\.js$/);
	});

	it('Adds file pattern for the SystemJS config file, after the SystemJS libraries', function () {
		config.systemjs.configFile = 'test/system.conf.js';
		initSystemJs(config, logger);
		expect(config.files[3].pattern).toMatch(/\/system\.conf\.js$/);
	});

  it('Loads the external SystemJS config file and merges it with the karma config', function() {
    config.systemjs.configFile = 'test/system.conf.js';
    initSystemJs(config, logger);
    expect(config.client.systemjs.config.transpiler).toBe('babel');
    expect(config.client.systemjs.config.baseURL).toBe('/');
  });

	it('Adds the plugin adapter to the end of the files list', function () {
		initSystemJs(config, logger);
		expect(config.files[config.files.length - 1].pattern).toMatch(/adapter\.js/);
	});

	it('Attaches systemjs.config to client.systemjs', function () {
		config.systemjs.config = 123;
		initSystemJs(config, logger);
		expect(config.client.systemjs).toEqual({
			config: 123
		});
	});
});
