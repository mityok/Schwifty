const Fleeb = {
  init(elem, duration, fromVars, toVars, id, selector, stagger, removeCallback) {
    //TODO: add object validation
    this.elem = elem;
    this.duration = duration;
    this.fromVars = fromVars;
    this.toVars = toVars;
    this.stagger = stagger;
    this.onComplete = toVars ? toVars.onComplete : fromVars.onComplete;
    this.onUpdate = toVars ? toVars.onUpdate : fromVars.onUpdate;
    this.onStart = toVars ? toVars.onStart : fromVars.onStart;
    this.delay = toVars ? toVars.delay : fromVars.delay;
    this.id = id;
    this.selector = selector;
    this.counter = -1;
    this.completed = false;
    this.interrupted = false;
    this.running = false;
    this.animationStart = this.animationStart.bind(this);
    this.animationEnd = this.animationEnd.bind(this);
    this.removeCallback = removeCallback;
    this.prepareElement(elem, this.id, stagger);
    this.counter = performance.now() + ((this.stagger && this.stagger.delay) || this.delay || 0) * 1000;
  },
  storeCSS(text) {
    this.cssText = text;
  },
  prepareElement(el, id, stagger) {
    //console.log(this.selector)
    if (this.selector && this.selector === 'provide' && !el.classList.contains(id)) {
      el.classList.add(id);
    }
    //if(!stagger || (stagger && stagger.index === stagger.total - 1)){
    //el.addEventListener('animationstart', this.animationStart, false);
    //el.addEventListener('animationend', this.animationEnd, false);
    //}
  },
  start() {
    //console.log('start')
    this.running = true;
    //this.counter = performance.now()
  },
  animationStart(e) {
    if (e.animationName === this.id) {
      if (this.onStart) {
        this.onStart();
      }
      this.running = true;
      this.counter = performance.now();
    }
  },
  animationEnd(e) {
    if (e.animationName === (this.stagger && this.stagger.id) || this.id) {
      this.complete();
    }
  },
  complete() {
    if (!this.completed) {
      this.completed = true;
      this.running = false;
      if (!this.stagger && this.onComplete) {
        this.onComplete(this);
      }
      if (this.stagger && this.stagger.index === this.stagger.total - 1 && this.onComplete) {
        this.onComplete(this);
      }
      if ((this.fromVars && this.fromVars.fix !== 'style') && (this.toVars && this.toVars.fix !== 'style') && !this.selector && this.elem.classList.contains(this.id)) {
        this.elem.classList.remove(this.id);
      }
      //if(!this.stagger || (this.stagger && this.stagger.index === this.stagger.total - 1)){
      //this.elem.removeEventListener('animationstart', this.animationStart);
      //this.elem.removeEventListener('animationend', this.animationEnd);
      //}
      this.removeCallback(this);
    }
  },
  pause() {
    //console.log('pause', this.elem)
  },
  stop(fire) {
    //should fire event or not
    //console.log('stop', this.elem)
    this.interrupted = true;
    this.complete();
  },
  tick(timestamp) {
    if (timestamp >= this.counter && !this.running) {
      this.start();
    }
    //console.log('tick',this.id,this.duration ,this.counter - timestamp,this.stagger && this.stagger.delay*100)
    if (this.counter >= 0 && this.duration * 1000 + this.counter - timestamp <= 0 && !this.completed) {
      this.complete();
    }
  }
};
export default Fleeb;
