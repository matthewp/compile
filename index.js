#!/usr/bin/env node
const commonjs = require('rollup-plugin-commonjs');
const nodeResolve = require('rollup-plugin-node-resolve');
const json = require('rollup-plugin-json');
const rollup = require("rollup");
const meow = require('meow');

const nodeExternals = [
  'url', 'http', 'util', 'https', 'zlib', 'stream',
  'crypto', 'buffer', 'string_decoder', 'querystring', 'punycode'
];

const cli = meow(`
  Usage
    $ compile <input>

  Options
    --out,      -o Output file
    --format,   -f Format
    --external, -e Externals (comma separated)
`, {
  flags: {
    format: {
      type: 'string',
      alias: 'o'
    },
    out: {
      type: 'string',
      alias: 'o',
      default: process.cwd() + '/main.js'
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

  if(outFormat === 'cjs') {
    externals = Array.from(nodeExternals);
  }

  let externalList = cli.flags.external || cli.flags.e;
  if(externalList) {
    externals.push.apply(externals, externalList.split(','));
  }

  let bundle = await rollup.rollup({
    input: cli.input[0],
    external: externals,
    plugins: [
      json(),
      nodeResolve({
        jsnext: true,
        main: true
      }),
      commonjs({
      }),
      http()
    ]
  });

  await bundle.write({
    format: outFormat,
    file: cli.flags.out,
    exports: 'named'
  });
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
