#!/usr/bin/env node
const commonjs = require('rollup-plugin-commonjs');
const nodeResolve = require('rollup-plugin-node-resolve');
const json = require('rollup-plugin-json');
const rollup = require("rollup");
const meow = require('meow');

const cli = meow(`
  Usage
    $ compile <input>

  Options
    --out, -o Output file
    --format, -f Format
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
}

async function run() {
  let bundle = await rollup.rollup({
    input: cli.input[0],
    plugins: [
      json(),
      nodeResolve({
        jsnext: true,
        main: true
      }),
      commonjs({
      }),
    ]
  });

  await bundle.write({
    format: outFormat,
    file: cli.flags.out
  });
}

run();
