class A {
  var x;
  hidden y() {
    return 2;
  }
  constructor() {
    this->x = () => this->y() + 40;
  }
  test() {
    return this->x();
  }
}
