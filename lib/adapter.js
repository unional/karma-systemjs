(function (window) {
  'use strict';
	var adapter = {
    /**
     * Has SystemJS load each test suite, then starts Karma
     * @param karma {object}
     * @param System {object}
     * @param Promise {object}
     */
		run: function (karma, System, Promise) {
			// Stop karma from starting automatically on load
			karma.loaded = function () {
			};

			// Load SystemJS configuration from karma config
			if (karma.config.systemjs.config) {
				System.config(karma.config.systemjs.config);
			}

      // Import the tests suites that were bundled
      var testSuitePromises = [];
      try {
        for (var x = 0; x < karma.config.systemjs.testSuiteModules.length; x++) {
          testSuitePromises.push(System.import(karma.config.systemjs.testSuiteModules[x]));
        }
      } catch (e) {
        karma.error(adapter.decorateErrorWithHints(e, System));
        return;
      }

			// Once all imports are complete...
			Promise.all(testSuitePromises).then(function () {
				karma.start();
			}, function (e) {
				karma.error(adapter.decorateErrorWithHints(e, System));
			});
		},

    /**
     * Checks errors to see if they match known issues, and tries to decorate them
     * with hints on how to resolve them.
     * @param err {string}
     * @param System {object}
     * @returns {string}
     */
    decorateErrorWithHints: function(err, System) {
      err = String(err);
      // Look for common issues in the error message, and try to add hints to them
      switch(true) {
      // Some people use ".es6" instead of ".js" for ES6 code
      case /^Error loading ".*\.es6" at .*\.es6\.js/.test(err):
        return err + '\nHint: If you use ".es6" as an extension, add this to your SystemJS paths config: {"*.es6": "*.es6"}';
      case /^TypeError: Illegal module name "\/base\//.test(err):
        return err + '\nHint: Is the working directory different when you run karma?' +
          '\nYou may need to change the baseURL of your SystemJS config inside your karma config.' +
          '\nIt\'s currently checking "' + System.baseURL + '"' +
          '\nNote: "/base/" is where karma serves files from.';
      }

      return err;
    }
	};

	if (window.System) {
		adapter.run(window.__karma__, window.System, window.Promise);
	} else {
		//if no System global, expose global for unit testing
		window.karmaSystemjsAdapter = adapter;
	}
})(window);