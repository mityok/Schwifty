import {
  getPropertyFromTo
} from './libraryUtils';
const Hizzards = {
  init(elems, duration, fromVars, toVars, id, stagger, splitValues, classNames, removeCallback) {
    this.elems = elems;
    this.length = elems.length;
    this.duration = duration;
    this.fromVars = fromVars;
    this.toVars = toVars;
    this.stagger = stagger;
    this.splitValues = splitValues;
    this.classNames = classNames;
    this.onComplete = getPropertyFromTo('onComplete', toVars, fromVars, null);
    this.onUpdate = getPropertyFromTo('onUpdate', toVars, fromVars, null);
    this.onStart = getPropertyFromTo('onStart', toVars, fromVars, null);
    this.delay = getPropertyFromTo('delay', toVars, fromVars, 0);
    this.id = id;
    this.counter = -1;
    this.completed = false;
    this.interrupted = false;
    this.running = false;
    this.removeCallback = removeCallback;
    this.counter = performance.now() + this.delay * 1000;
  },
  storeCSS(css) {
    //console.log('css',css);
    this.cssText = css;
  },
  prepareElement(el, id, stagger) {
    //console.log(this.selector)
    if (this.selector && this.selector === 'provide' && !el.classList.contains(id)) {
      el.classList.add(id);
    }
  },
  start() {
    //console.log('start')
    this.running = true;
    //this.counter = performance.now()
  },

  complete() {
    if (!this.completed) {
      this.completed = true;
      this.running = false;
      if (typeof this.onComplete === 'function') {
        this.onComplete(this);
      }
      this.removeCallback(this);
    }
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
    if (this.counter >= 0 && (this.duration + this.length * this.stagger) * 1000 + this.counter - timestamp <= 0 && !this.completed) {
      this.complete();
    }
  }
};
export default Hizzards;
