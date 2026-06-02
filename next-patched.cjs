// Patch fs.readlink and fs.promises.readlink to handle EISDIR as EINVAL
// This is needed for Node 24 on Windows where readlink returns EISDIR instead of EINVAL
// for non-symlink files (behavioral change from older Node versions).
const fs = require('fs');

// Patch callback-based readlink
const originalReadlink = fs.readlink;
fs.readlink = function(path, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  originalReadlink(path, options, function(err, linkString) {
    if (err && err.code === 'EISDIR') {
      const newErr = Object.assign(new Error("EINVAL: invalid argument, readlink '" + path + "'"), {
        code: 'EINVAL',
        errno: -4071,
        syscall: 'readlink',
        path: path
      });
      return callback(newErr);
    }
    callback(err, linkString);
  });
};

// Patch sync readlink
const originalReadlinkSync = fs.readlinkSync;
fs.readlinkSync = function(path, options) {
  try {
    return originalReadlinkSync(path, options);
  } catch(err) {
    if (err && err.code === 'EISDIR') {
      throw Object.assign(new Error("EINVAL: invalid argument, readlink '" + path + "'"), {
        code: 'EINVAL',
        errno: -4071,
        syscall: 'readlink',
        path: path
      });
    }
    throw err;
  }
};

// Patch fs.promises.readlink (used by @vercel/nft in Next.js build traces)
const originalPromisesReadlink = fs.promises.readlink;
fs.promises.readlink = async function(path, options) {
  try {
    return await originalPromisesReadlink(path, options);
  } catch(err) {
    if (err && err.code === 'EISDIR') {
      throw Object.assign(new Error("EINVAL: invalid argument, readlink '" + path + "'"), {
        code: 'EINVAL',
        errno: -4071,
        syscall: 'readlink',
        path: path
      });
    }
    throw err;
  }
};

// Now run the actual next binary
require('./node_modules/next/dist/bin/next');
