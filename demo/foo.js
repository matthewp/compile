
async function foo() {
  let mod = await import('./bar.js');
  return mod.default();
}

export default foo;