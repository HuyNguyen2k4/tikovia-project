const path = require('path');
const Module = require('module');

// Custom module resolver cho Vercel
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function (request, parent, isMain, options) {
    // Define aliases
    const aliases = {
        '@src': path.resolve(__dirname),
        '@controllers': path.resolve(__dirname, 'controllers'),
        '@models': path.resolve(__dirname, 'models'),
        '@utils': path.resolve(__dirname, 'utils'),
        '@routes': path.resolve(__dirname, 'routes'),
        '@middlewares': path.resolve(__dirname, 'middlewares'),
        '@config': path.resolve(__dirname, 'config'),
        '@templates': path.resolve(__dirname, 'templates'),
        '@services': path.resolve(__dirname, 'services'), // ✅ NEW
    };

    // Check if request starts with any alias
    for (const alias in aliases) {
        if (request.startsWith(alias)) {
            request = request.replace(alias, aliases[alias]);
            break;
        }
    }

    return originalResolveFilename.call(this, request, parent, isMain, options);
};

console.log('✅ Module aliases registered successfully');
