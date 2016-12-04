'use strict';
var Schwifty = (function() {
  let animations = [];
  const fixedParams = {};
  const animationTypes = ['opacity', 'x', 'y', 'scale', 'skew', 'rotate', 'width', 'height', 'backgroundColor', 'color', 'top', 'left', 'bottom', 'right']
  const cssProperties = ['transform', 'opacity', 'width', 'height', 'backgroundColor', 'color', 'top', 'left', 'bottom', 'right'];
  const startDemandingProps = ['width', 'height', 'top', 'left', 'bottom', 'right'];
  const specialEasings = ['easeOutElastic', 'easeOutBounce'];
  const cssUnits = ['cm', 'px', 'pt', '%', 'em', 'ex', 'in', 'mm', 'pc', 'vh', 'vw', 'vmin'];
  let bodyData = null;
  let requestAnimationId = -1;
  let styleEl = document.createElement('style');
  styleEl.setAttribute('id', 'schwifty-library');
  document.head.appendChild(styleEl);
  // Grab style sheet
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
      this.id = id;
      this.selector = selector;
      this.counter = -1;
      this.completed = false;
      this.interrupted = false;
      this.running = false;
      this.animationStart = this.animationStart.bind(this);
      this.animationEnd = this.animationEnd.bind(this);
      this.removeCallback = removeCallback;
      this.prepareElement(elem, this.id);
    },
    storeCSS(text) {
      this.cssText = text
    },
    prepareElement(el, id) {
      if (!el.classList.contains(id) && !this.selector) {
        el.classList.add(id)
      }
      el.addEventListener("animationstart", this.animationStart, false);
      el.addEventListener("animationend", this.animationEnd, false);
    },
    animationStart(e) {
      if (e.animationName === this.id) {
        if (this.onStart) {
          this.onStart()
        }
        this.running = true;
        this.counter = performance.now()
      }
    },
    animationEnd(e) {
      if (e.animationName === (this.stagger && this.stagger.id) || this.id) {
        //console.log('end')
        this.complete()
      }
    },
    complete() {
      if (!this.completed) {
        this.completed = true;
        this.running = false;
        if (!this.stagger && this.onComplete) {
          this.onComplete(this)
        }
        if (this.stagger && this.stagger.index === this.stagger.total - 1 && this.onComplete) {
          this.onComplete(this)
        }
        if ((this.fromVars && this.fromVars.fix !== 'style') && (this.toVars && this.toVars.fix !== 'style') && !this.selector && this.elem.classList.contains(this.id)) {
          this.elem.classList.remove(this.id)
        }
        this.elem.removeEventListener("animationstart", this.animationStart);
        this.elem.removeEventListener("animationend", this.animationEnd);
        this.removeCallback(this)
      }
    },
    pause() {
      //console.log('pause', this.elem)
    },
    stop(fire) {
      //should fire event or not
      //console.log('stop', this.elem)
      this.interrupted = true;
      this.complete()
    },
    tick(timestamp) {
      if (this.counter >= 0 && this.duration * 1000 + this.counter - timestamp <= 0 && !this.completed) {
        this.complete();
      }
    }
  };
  const getInterruptedValues = elem => {
    //console.log('getComputedStyle')
    const stl = window.getComputedStyle(elem);
    let transform = stl.getPropertyValue('transform');
    let initValue = {}
    if (transform && transform !== 'none') {
      initValue = matrixDeconstruct(transform)
    }
    const tempProps = cssProperties.slice(1).reduce((acc, prop) => {
      let value = stl.getPropertyValue(prop);
      acc[prop] = value;
      return acc;
    }, initValue)
    return tempProps
  }
  const removeCompleted = an => {
    const interruptedValues = an.interrupted && an.elem && getInterruptedValues(an.elem);
    styleEl.innerHTML = styleEl.innerHTML.split(an.cssText.elementStyle).join('');
    if (an.stagger) {
      if (an.stagger.splitValues) {
        styleEl.innerHTML = styleEl.innerHTML.split(an.cssText.keyframes).join('');
      } else if (an.stagger.index === an.stagger.total - 1) {
        styleEl.innerHTML = styleEl.innerHTML.split(an.cssText.keyframes).join('');
      }
    } else {
      styleEl.innerHTML = styleEl.innerHTML.split(an.cssText.keyframes).join('');
    }
    if (an.toVars && an.toVars.fix === 'style') {
      cleanUpOnComplete(an.selector ? an.selector : `.${an.id}`, an.toVars, interruptedValues)
    }
  }
  const crossReferenceWithExpectedVars = (animationVars, interruptedValues) => {
    const res = Object.keys(animationVars).reduce((acc, key) => {
      acc[key] = key === 'important' ? animationVars[key] : interruptedValues[key];
      return acc;
    }, {})
    return res;
  }
  const getAnimationVars = vars => animationTypes.concat(['important']).filter(type => propertyCheck(vars[type])).reduce((a, b) => {
    a[b] = vars[b];
    return a;
  }, {})
  const cleanUpOnComplete = (className, vars, interruptedValues) => {
    //console.log('cleanUpOnComplete',vars)
    let animationVars = getAnimationVars(vars);
    if (interruptedValues) {
      animationVars = crossReferenceWithExpectedVars(animationVars, interruptedValues)
    }
    //console.log('animationVars', animationVars, fixedParams[className])
    if (fixedParams[className]) {
      vars = Object.assign({}, fixedParams[className].vars, animationVars, vars.original ? {
        original: getAnimationVars(vars.original)
      } : null);
      fixedParams[className].vars = vars;
      styleEl.innerHTML = styleEl.innerHTML.split(fixedParams[className].fixValues).join('')
    } else {
      vars = Object.assign({}, animationVars, vars.original ? {
        original: getAnimationVars(vars.original)
      } : null);
      fixedParams[className] = {
        vars
      };
    }
    const fixValues = (`${className}{${constructAnimation(vars, true)}}`)
    fixedParams[className].fixValues = fixValues
    styleEl.innerHTML += fixValues;
  }
  const set = (elem, toVars, callback) => {
    let selector = null;
    if (callback && typeof callback === 'string' && callback === 'selector') {
      selector = OptimalSelect.select(elem);
    }
    if (!selector) {
      const existingClass = elem.className.split(" ").find(cls => cls.indexOf('schwifty-') >= 0);
      //to do cleanUpOnComplete
      selector = `.${existingClass}`
    }
    const className = selector ? selector : `.${getId()}`;
    cleanUpOnComplete(className, toVars)
    //styleEl.innerHTML += (`${className}{${constructAnimation(toVars, true)}}`)
  }
  const step = (timestamp) => {
    const previousLength = animations.length;
    let i = previousLength
    while (i--) {
      const an = animations[i];
      an.tick(timestamp)
      if (!an.completed && an.running && an.onUpdate) {
        an.onUpdate(an, timestamp - an.counter);
      }
    }
    const currentLength = animations.length;
    if (previousLength > 0 && currentLength === 0) {
      killAll();
      removeFromBody();
      return;
    }
    requestAnimationId = window.requestAnimationFrame(step)
  }
  const removeFromBody = () => {
    if (bodyData && bodyData.className) {
      styleEl.innerHTML = styleEl.innerHTML.split(bodyData.className).join('');
    } else if (bodyData) {
      document.body.classList.remove('getting-schwifty');
    }
  }
  const addToBody = () => {
    if (animations.length === 0 && bodyData) {
      if (bodyData.className) {
        styleEl.innerHTML += bodyData.className;
      } else {
        document.body.classList.add('getting-schwifty');
      }
    }
  }
  const fromTo = (elem, duration, fromVars, toVars, callback, stagger) => {
    const runningAnim = animations.find(anim => anim.elem === elem);
    if (runningAnim) {
      runningAnim.stop();
    }
    const anim = create()
    //TODO: test performance 
    const existingClass = elem.className.split(" ").find(cls => cls.indexOf('schwifty-') >= 0)
    const id = existingClass || (stagger && !stagger.splitValues && callback ? stagger.id : getId())
    //console.log('toVars', toVars)
    const resp = (id, selector) => {
      addToBody()
      //console.log('staggerId',id,stagger.id,selector)
      //TODO: check for existing animation id
      animations.push(anim)
      if (requestAnimationId === -1) {
        requestAnimationId = window.requestAnimationFrame(step)
      }
      const className = selector ? selector : `.${id}`;
      const animName = (stagger && stagger.id) || getId() || selector;
      if (toVars.immediateRender && !specialEasings.some(ease => ease === toVars.ease)) {
        toVars = Object.assign({}, toVars, resampleDomValues(elem, className, toVars), {
          original: toVars
        })
      }
      //console.log('names', toVars);
      anim.init(elem, duration, fromVars, toVars, id, selector, stagger, animRemoveCallback);
      //console.log('names', id, selector);
      anim.storeCSS(createSheet(elem, duration, fromVars, toVars, animName, className));
    }
    if (callback && typeof callback === 'function') {
      callback(id, resp)
    } else if (callback && typeof callback === 'string' && callback === 'selector') {
      const selector = OptimalSelect.select(elem)
      resp(id, selector);
    } else {
      resp(id);
    }
    return anim;
  }
  const animRemoveCallback = (an) => {
    const previousLength = animations.length;
    animations.splice(animations.indexOf(an), 1);
    const currentLength = animations.length;
    if (previousLength > 0 && currentLength === 0) {
      killAll();
      removeFromBody();
    }
    removeCompleted(an)
  }
  const to = (elem, duration, toVars, callback) => {
    //TODO: do build only when needed
    return fromTo(elem, duration, null, toVars, callback);
  }
  const from = (elem, duration, fromVars, callback) => {
    return fromTo(elem, duration, fromVars, null, callback);
  }
  //TODO: join both stagger animations
  const staggerFrom = (elements, duration, fromVars, callback, stagger) => {
    return staggerFromTo(elements, duration, fromVars, null, callback, stagger)
  }
  const staggerTo = (elements, duration, toVars, callback, stagger) => {
    return staggerFromTo(elements, duration, null, toVars, callback, stagger)
  }
  const staggerFromTo = (elements, duration, fromVars, toVars, callback, stagger) => {
    //TODO: propper join and reuse animations
    const id = getId();
    const startDelay = (toVars && toVars.delay) || (fromVars && fromVars.delay) || 0;
    const splitValues = (toVars && animationTypes.some(type => Array.isArray(toVars[type]))) || (fromVars && animationTypes.some(type => Array.isArray(fromVars[type])))
    const total = elements.length;
    const splitToVarsTypes = toVars && animationTypes.filter(type => Array.isArray(toVars[type]))
    const splitFromVarsTypes = fromVars && animationTypes.filter(type => Array.isArray(fromVars[type]))
    //TODO: add better type modification for array values
    //TODO: out of bound check for array values
    return [...elements].map((elem, index) => {
      let toVarsTemp = null
      if (toVars) {
        const objTo = splitToVarsTypes.reduce((a, b) => {
          a[b] = toVars[b][index];
          return a;
        }, {});
        toVarsTemp = Object.assign({}, toVars, {
          delay: startDelay + index * stagger
        }, objTo);
      }
      let fromVarsTemp = null
      if (fromVars) {
        const objFrom = splitFromVarsTypes.reduce((a, b) => {
          a[b] = fromVars[b][index];
          return a;
        }, {});
        fromVarsTemp = Object.assign({}, fromVars, {
          delay: startDelay + index * stagger
        }, objFrom);
      }
      return fromTo(elem, duration, fromVarsTemp, toVarsTemp, callback, {
        id: splitValues ? getId() : id,
        index,
        total,
        splitValues
      })
    })
  }
  const create = () => {
    return Object.create(Fleeb)
  }
  const killAll = () => {
    window.cancelAnimationFrame(requestAnimationId);
    requestAnimationId = -1
  }
  const getId = () => {
    return 'schwifty-xxxxxxxx'.replace(/x/g, () => (Math.random() * 16 | 0).toString(16));
  }
  const bodyClassUpdate = (notify, className) => {
    if (className) {
      document.body.classList.add('getting-schwifty');
    }
    bodyData = {
      notify,
      className
    }
  }
  const compareUnitsForVars = (fromVars, toVars) => {
    let allEqualUnits = true;
    let notEqualVars = null;
    //console.log('compareUnitsForVars',fromVars, toVars)
    if (!fromVars) {
      return {
        allEqualUnits: false,
        res: null,
        notEqualVars: 'both'
      }
    }
    const res = Object.keys(fromVars).reduce((acc, key) => {
      if (key !== 'important') {
        //console.log(key,fromVars[key],toVars[key])
        const unitFrom = unitSplit(fromVars[key]);
        const unitTo = unitSplit(toVars[key]);
        let stepValues = null;
        if (compareUnits(unitFrom, unitTo)) {
          acc[key] = {
            unitFrom,
            unitTo
          }
        } else {
          const notEqual = (unitTo[1] !== '' && unitFrom[1] !== '') ? 'both' : (unitTo[1] !== '' ? 'to' : 'from');
          notEqualVars = calulateVarsToRecheck(notEqualVars, notEqual)
          acc[key] = {
            unitFrom,
            unitTo,
            notEqual
          };
          allEqualUnits = false;
        }
        //console.log(key, unitFrom, unitTo, compareUnits(unitFrom, unitTo), stepValues)
      }
      return acc;
    }, {});
    return {
      allEqualUnits,
      res,
      notEqualVars
    }
  }
  const calulateVarsToRecheck = (notEqualVars, notEqual) => {
    if (!notEqualVars) {
      return notEqual;
    } else if (notEqualVars === 'both' || notEqual === 'both' || (notEqualVars === 'from' && notEqual === 'to') || (notEqualVars === 'to' && notEqual === 'from')) {
      return 'both'
    } else if (notEqualVars === 'from' && notEqual === 'from') {
      return 'from'
    } else if (notEqualVars === 'to' && notEqual === 'to') {
      return 'to'
    }
  }
  const buildKeyFramesAnimation = (res, animationName) => {
    const STEPS = 20;
    const variableSteps = [...Array(STEPS).keys()].map(() => ({}));
    Object.keys(res).map(key => {
      const {
        unitTo,
        unitFrom
      } = res[key];
      [...Array(STEPS).keys()].map(incr => {
        const dir = (-1 + 2 * ((incr + 1) % 2));
        const stepCalc = (unitTo[0] - unitFrom[0]) * easeInElastic((incr + 1) / STEPS);
        //TODO: fix takes unit from to params
        return variableSteps[incr][key] = round((unitFrom[0] + stepCalc), 3) + (unitTo[1] === '' ? 0 : unitTo[1]);
      })
    })
    const elastic = variableSteps.reduce((accum, stp, index) => `${accum} ${round((index+1)/STEPS*100,3)}%{ ${stp ? constructAnimation(stp) : ''} }`, '')
    return (`@keyframes ${animationName} { ${elastic} }`)
  }
  const buildKeyFrames = (elem, fromVars, toVars, animationName, className) => {
    const specialEase = specialEasings.find(ease => ease === toVars.ease);
    if (specialEase) {
      const {
        allEqualUnits,
        res,
        notEqualVars
      } = compareUnitsForVars(fromVars, toVars)
      //console.log('recheck',allEqualUnits,res,notEqualVars)
      if (allEqualUnits) {
        return buildKeyFramesAnimation(res, animationName)
      } else {
        if (notEqualVars === 'to') {
          toVars = resampleDomValues(elem, className, toVars)
        } else if (notEqualVars === 'from') {
          fromVars = resampleDomValues(elem, className, fromVars)
        } else if (notEqualVars === 'both') {
          toVars = resampleDomValues(elem, className, toVars, fromVars)
          fromVars = resampleDomValues(elem, className, fromVars, toVars)
        }
        const {
          allEqualUnits,
          res
        } = compareUnitsForVars(fromVars, toVars);
        //console.log('recheck',allEqualUnits,res)
        if (allEqualUnits) {
          return buildKeyFramesAnimation(res, animationName);
        }
      }
    }
    return `@keyframes ${animationName} {from { ${fromVars ? constructAnimation(fromVars) : '' } } to{ ${toVars ? constructAnimation(toVars) : '' } }}`;
  }
  const resampleDomValues = (elem, className, vars, otherVars) => {
    let test = null;
    if (vars) {
      test = `${className}{${constructAnimation(vars, true)}}`;
      styleEl.innerHTML += test;
    }
    //not all units are equal need to resample the element
    const varsFixed = crossReferenceWithExpectedVars(getAnimationVars(vars || otherVars), getInterruptedValues(elem));
    if (test) {
      styleEl.innerHTML = styleEl.innerHTML.split(test).join('');
    }
    return varsFixed;
  }
  //https://gist.github.com/gre/1650294
  const easeInElastic = (t) => (0.04 - 0.04 / t) * Math.sin(25 * t) + 1;
  const compareUnits = (unitFrom, unitTo) => unitFrom[1] === unitTo[1];
  const unitSplit = value => {
    if (numberCheck(value)) {
      return [value, ''];
    }
    const arr = value.match(/^(\d+(?:\.\d+)?)(.*)$/).splice(1);
    arr[0] = parseInt(arr[0], 10);
    if (arr[1] === 'px') {
      arr[1] = '';
    }
    return arr;
  };
  const createSheet = (elem, duration, fromVars, toVars, animationName, className) => {
    //console.log('names', animationName, className)
    const prevValues = fixedParams[className]
    if (prevValues) {
      toVars = Object.assign({}, prevValues.vars, toVars)
    }
    const specialEase = specialEasings.find(ease => ease === toVars.ease);
    const cssText = {
      keyframes: buildKeyFrames(elem, fromVars, toVars, animationName, className),
      elementStyle: `${className}{animation: ${animationName} ${duration}s both ${specialEase === 'easeOutElastic'?'linear':( toVars.ease || 'linear')} ${toVars.delay || 0}s;}`
    };
    if (styleEl.innerHTML.indexOf(cssText.keyframes) < 0) {
      styleEl.innerHTML += cssText.keyframes;
    }
    styleEl.innerHTML += cssText.elementStyle;
    //console.log(cssText)
    return cssText;
  }
  const propertyCheck = prop => {
    return typeof prop !== 'undefined' && prop !== null && prop !== '';
  }
  const numberCheck = num => typeof num === 'number'
  const constructAnimation = (vars, fix) => {
    if (fix && vars.original) {
      vars = vars.original;
    }
    let string = '';
    let translateString = '';
    if (propertyCheck(vars.x)) {
      translateString += ` translateX(${numberCheck(vars.x) ? `${vars.x}px` : vars.x})`;
    }
    if (propertyCheck(vars.y)) {
      translateString += ` translateY(${numberCheck(vars.y) ? `${vars.y}px` : vars.y})`;
    }
    if (propertyCheck(vars.scale)) {
      translateString += ` scale(${vars.scale})`;
    }
    if (propertyCheck(vars.rotate)) {
      translateString += ` rotate(${vars.rotate}deg)`;
    }
    if (propertyCheck(vars.opacity)) {
      string += ` opacity:${vars.opacity} ${importantDeclaration(vars.important,'opacity',fix)};`;
    }
		if (propertyCheck(vars.color)) {
      string += ` color:${vars.color} ${importantDeclaration(vars.important,'color',fix)};`;
    }
		if (propertyCheck(vars.backgroundColor)) {
      string += ` background-color:${vars.backgroundColor} ${importantDeclaration(vars.important,'backgroundColor',fix)};`;
    }
				
    if (propertyCheck(vars.width)) {
      string += ` width:${numberCheck(vars.width) ? `${vars.width}px` : vars.width} ${importantDeclaration(vars.important,'width',fix)};`;
    }
    if (propertyCheck(vars.height)) {
      string += ` height:${numberCheck(vars.height) ? `${vars.height}px` : vars.height} ${importantDeclaration(vars.important,'height',fix)};`;
    }
		if (propertyCheck(vars.left)) {
      string += ` left:${numberCheck(vars.left) ? `${vars.left}px` : vars.left} ${importantDeclaration(vars.important,'left',fix)};`;
    }
		if (propertyCheck(vars.top)) {
      string += ` top:${numberCheck(vars.top) ? `${vars.top}px` : vars.top} ${importantDeclaration(vars.important,'top',fix)};`;
    }
    if (propertyCheck(vars.transformOrigin)) {
      string += ` transform-origin:${vars.transformOrigin};`
    }
    if (translateString) {
      string = `${string} transform:${translateString} ${importantDeclaration(vars.important,'transform',fix)};`
    }
    //console.log('st-',string)
    return string;
  }
  const importantDeclaration = (importantArray, property, fix) => {
  	return (fix && checkImportantValue(importantArray,property)) ? '!important':'';
  }
  const checkImportantValue = (importantArray, property) => {
   return importantArray && importantArray.some(value => value === property)
  }
  const dump = () => {
    return styleEl.innerHTML;
  }
  const matrixDeconstruct = (tr) => {
    if(!tr){
      return null;
    }
		return parse( tr.split('(')[1].split(')')[0].split(','));
	}
  const parse = (m) => {
    let A = m[0];
    let B = m[1];
    let C = m[2];
    let D = m[3];

    if (A * D == B * C) throw new Error('transform#unmatrix: matrix is singular');

    // step (3)
    let scaleX = Math.sqrt(A * A + B * B);
    A /= scaleX;
    B /= scaleX;

    // step (4)
    let skew = A * C + B * D;
    C -= A * skew;
    D -= B * skew;

    // step (5)
    let scaleY = Math.sqrt(C * C + D * D);
    C /= scaleY;
    D /= scaleY;
    skew /= scaleY;

    // step (6)
    if ( A * D < B * C ) {
      A = -A;
      B = -B;
      skew = -skew;
      scaleX = -scaleX;
    }

    return {
      x: parseInt(m[4],10),
      y: parseInt(m[5],10),
      rotate: rtod(Math.atan2(B, A)),
      skew: rtod(Math.atan(skew)),
      scale: scaleX === scaleY ? round(scaleX,2) : 0,
    };
  }
   const rtod = (radians) => {
    const deg = radians * 180 / Math.PI;
    return round(deg,2);
  }
  const round = (n, mult) => {
  	const m = Math.pow(10,mult)
    return Math.round(n * m) / m;
  }
  return {
    fromTo: fromTo,
    from: from,
    to: to,
    set: set,
    staggerFrom: staggerFrom,
    staggerTo: staggerTo,
    killAll: killAll,
    bodyClassUpdate: bodyClassUpdate,
    dump: dump,
    matrixDeconstruct
  }
})();