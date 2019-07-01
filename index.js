#!/usr/bin/env node
const fs = require('fs');
const builtins = require('rollup-plugin-node-builtins');
const commonjs = require('rollup-plugin-commonjs');
const globals = require('rollup-plugin-node-globals');
const nodeResolve = require('rollup-plugin-node-resolve');
const string = require('rollup-plugin-string').string;
const json = require('rollup-plugin-json');
const rollup = require("rollup");
const meow = require('meow');

const nodeExternals = [
  'url', 'http', 'util', 'https', 'zlib', 'stream', 'path',
  'crypto', 'buffer', 'string_decoder', 'querystring', 'punycode',
  'child_process', 'events'
];

const cli = meow(`
  Usage
    $ compile <input>

  Options
    --out,      -o Output file
    --format,   -f Format
    --external, -e Externals (comma separated)
    --chunks,   -c Chunks (comma separated)
    --name,     -n Name (for UMD builds)
    --exports,     Exports mode
    --string,   -s File extensions to be strings (comma separated)
`, {
  flags: {
    format: {
      type: 'string',
      alias: 'f'
    },
    out: {
      type: 'string',
      alias: 'o',
      default: process.cwd() + '/main.js'
    },
    name: {
      type: 'string',
      alias: 'n'
    },
    string: {
      type: 'string',
      alias: 's'
    }
  }
});

const outFormat = cli.flags.format || cli.flags.f;

if(cli.input.length === 0 || !outFormat) {
  cli.showHelp();
  return;
}

async function run() {
  let externals = [];
  let isBuiltForNode = outFormat === 'cjs';

  if(isBuiltForNode) {
    externals = Array.from(nodeExternals);
  }

  let externalList = cli.flags.external || cli.flags.e;
  if(externalList) {
    externals.push.apply(externals, externalList.split(','));
  }

  let chunks = void 0;
  if(cli.flags.chunks) {
    chunks = {};
    cli.flags.chunks.split(',').forEach(chunk => {
      let [name, entry] = chunk.split('=');
      chunks[name] = [entry];
    });
  }

  const plugins = [
    json(),
    nodeResolve({
      jsnext: true,
      main: true
    }),
    commonjs({}),
    globals(),
    builtins(),
    http()
  ];

  if(cli.flags.string) {
    // TODO Make this work with multiple.
    plugins.unshift(string({
      include: `**/*.${cli.flags.string}`
    }));
  }

  let bundle = await rollup.rollup({
    input: cli.input[0],
    external: externals,
    manualChunks: chunks,
    plugins
  });

  let outIsDir = false;
  try {
    outIsDir = fs.lstatSync(cli.flags.out).isDirectory();
  } catch {}

  let writeOptions = {
    format: outFormat,
    file: cli.flags.out,
    exports: cli.flags.exports || 'named'
  };

  if(cli.flags.name) {
    writeOptions.name = cli.flags.name;
  }

  if(outIsDir) {
    delete writeOptions.file;
    writeOptions.dir = cli.flags.out;

    if(chunks) {
      writeOptions.chunkFileNames = '[name].js';
    }
  }

  await bundle.write(writeOptions);
}

function http() {
  let urls = new Map();
  let httpExp = /^https?:\/\//;

  function load(url, isHttps) {
    let http = require('follow-redirects')[isHttps ? 'https' : 'http'];

    return new Promise(function(resolve, reject){
      http.get(url, res => {
        let body = '';
        res.on('data', data => { body += data; });
        res.on('end', () => {
          resolve(body);
        });
      });
    });
  }

  return {
    resolveId(id) {
      let match = httpExp.exec(id);
      if(match) {
        let record = {
          isHttps: match[0] === 'https://',
          url: id
        };

        let idx = id.lastIndexOf('/');
        let pth = id.substr(idx + 1);
        let newId = pth.split('.').shift();
        urls.set(newId, record);
        return newId;
      }
    },
    load(id) {
      if(urls.has(id)) {
        let { url, isHttps } = urls.get(id);
        return load(url, isHttps);
      }
    }
  };
}

run();
