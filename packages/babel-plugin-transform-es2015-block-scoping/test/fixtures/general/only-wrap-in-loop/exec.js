const a = [1, 2, 3]
const b = []
for (let i = 0; i < a.length; ++i) {
  {
    let x = a[i]
    b.push(() => x)
  }
}
assert.equal(b[0](), 1)
assert.equal(b[1](), 2)
assert.equal(b[2](), 3)
