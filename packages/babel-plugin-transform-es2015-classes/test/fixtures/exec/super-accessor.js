class Base {
  get x() { return this._base_x; }
  set x(value) { this._base_x = value; }
}

new class extends Base {
  constructor() {
    super();
    this.x = 1;
    super.x = 2;
    assert.equal(this.x, 2);
    assert.equal(super.x, 2);
    this.y = 1;
    super.y = 2;
    assert.equal(this.y, 2);
    assert.equal(super.y, undefined);
  }
}

new class extends Base {
  get x() { return this._x; }
  set x(value) { this._x = value; }
  set y(v) {
    assert(false);
  }
  constructor() {
    super();
    this.x = 1;
    super.x = 2;
    assert.equal(this.x, 1);
    assert.equal(super.x, 2);
    super.y = 2;
    assert.equal(Object.getOwnPropertyDescriptor(this, 'y').value, 2);
  }
}

Object.defineProperty(Base.prototype, 'y', {
  value: 1,
  enumerable: false,
});

new class extends Base {
  constructor() {
    super();
    this.y = 1;
    var d = Object.getOwnPropertyDescriptor(this, 'y');
    assert.equal();
    super.y = 2;
  }
}

Object.defineProperty(Base.prototype, 'z', {
  value: 1,
  writable: false,
});
