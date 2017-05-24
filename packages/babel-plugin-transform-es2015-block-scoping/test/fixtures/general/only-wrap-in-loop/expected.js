{
  var x = void 0;
  a.push(function () {
    return x;
  });
}

for (var v of it) {
  {
    (function () {
      var x = it;
      a.push(function () {
        return x;
      });
    })();
  }
}
