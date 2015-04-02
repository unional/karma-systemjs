'use strict';
describe('karmaSystemjsAdapter()', function () {
	var karma, System, Promise, promiseSpy, adapter;
	beforeEach(function () {
		karma = {
			start: jasmine.createSpy('start'),
			config: {
				systemjs: {
					testSuiteModules: ['a', 'b', 'c']
				}
			},
			files: {},
			error: jasmine.createSpy('error')
		};
		System = {
			baseURL: '/base/app/',
			'import': jasmine.createSpy('import').and.returnValue(1),
			config: jasmine.createSpy('config')
		};
		promiseSpy = {
			then: jasmine.createSpy('then').and.callFake(function () {
				return promiseSpy;
			})
		};
		Promise = {
			all: jasmine.createSpy('all').and.returnValue(promiseSpy)
		};
		adapter = window.karmaSystemjsAdapter;
	});

	describe('run()', function () {

		it('Stops karma from loading automatically by changing karma.loaded to a noop', function () {
			karma.loaded = 123;
			adapter.run(karma, System, Promise);
			expect(typeof karma.loaded).toBe('function');
		});

		it('Passes in systemjs config to System.config(), if set', function () {
			karma.config.systemjs.config = 123;
			adapter.run(karma, System, Promise);
			expect(System.config).toHaveBeenCalledWith(123);
		});

		it('Does not call System.config() if no config set', function () {
			karma.config.systemjs.config = null;
			adapter.run(karma, System, Promise);
			expect(System.config).not.toHaveBeenCalled();
		});

		it('Imports karma.files that match as test suites', function () {
			adapter.run(karma, System, Promise);
			expect(System.import).toHaveBeenCalledWith('a');
			expect(System.import).toHaveBeenCalledWith('b');
			expect(System.import).toHaveBeenCalledWith('c');
			expect(Promise.all).toHaveBeenCalledWith([1, 1, 1]);
		});

		it('Starts karma once all import promises have resolved', function () {
			adapter.run(karma, System, Promise);
			expect(karma.start).not.toHaveBeenCalled();
			promiseSpy.then.calls.argsFor(0)[0]();
			expect(karma.start).toHaveBeenCalled();
		});
	});

  describe('decorateErrorWithHints()', function() {

    it('Converts error objects to strings', function() {
      expect(typeof adapter.decorateErrorWithHints(new Error('test'), System)).toBe('string');
    });

    it('Adds hints for Not Found .es6 files', function() {
      var err = 'Error loading "app/module.es6" at /base/app/module.es6.js';
      expect(adapter.decorateErrorWithHints(err, System)).toBe(
        'Error loading "app/module.es6" at /base/app/module.es6.js' +
        '\nHint: If you use ".es6" as an extension, add this to your SystemJS paths config: {"*.es6": "*.es6"}'
      );
    });

    it('Adds hints for Illegal module names starting with /base/', function() {
      var err = new TypeError('Illegal module name "/base/lib/module"');
      expect(adapter.decorateErrorWithHints(err, System)).toBe(
        'TypeError: Illegal module name "/base/lib/module"' +
        '\nHint: Is the working directory different when you run karma?' +
        '\nYou may need to change the baseURL of your SystemJS config inside your karma config.' +
        '\nIt\'s currently checking "/base/app/"' +
        '\nNote: "/base/" is where karma serves files from.'
      );
    });
  });
});