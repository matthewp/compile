const assert = require('assert');
const path = require('path');
const { run } = require('./helpers.js');


describe('Modules that depend on web dependencies', function(){
  describe('https', function(){
    before(async function(){
      const entry = 'test/web/index.js';
      await run(entry, ['--format', 'cjs', '--out', 'test/tmp/out.js']);
    });

    it('Can be run', function(){
      const mod = require('./tmp/out.js');
      assert.equal(typeof mod.connect, 'function');
      assert.equal(mod.connect.name, 'connect');
    });
  });
});
