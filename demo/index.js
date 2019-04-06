import foo from './foo.js';

async function main() {
  let val = await foo();
  console.log(val);
}

main();