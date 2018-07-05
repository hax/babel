class A {
  var x;
  hidden y() {
    return this->x + 40;
  }
  constructor() {
    this->x = 2;
  }
  get y() {
    return this->y;
  }
}
