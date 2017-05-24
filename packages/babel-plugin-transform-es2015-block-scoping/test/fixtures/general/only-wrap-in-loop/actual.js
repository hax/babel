{
  let x
  a.push(() => x)
}

for (const v of it) {
  {
    let x = it
    a.push(() => x)
  }
}
