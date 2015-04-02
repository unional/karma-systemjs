'use strict';
module.exports = {
	'framework:systemjs': ['factory', require('./framework')],
	'preprocessor:systemjs': ['factory', require('./preprocessor')]
};
