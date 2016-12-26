import {
  matrixDeconstruct, parse, rtod, round
} from './mathUtils';
import {
  getPropertyFromTo
} from './libraryUtils';
import Hizzards from './Hizzards';
import Fleeb from './Fleeb';

const animations = [];
const fixedParamsStorage = {};
const animationTypes = ['opacity', 'x', 'y', 'scale', 'skew', 'rotate', 'width', 'height', 'backgroundColor', 'color', 'top', 'left', 'bottom', 'right'];
const cssProperties = ['transform', 'opacity', 'width', 'height', 'backgroundColor', 'color', 'top', 'left', 'bottom', 'right'];
const startDemandingProps = ['width', 'height', 'top', 'left', 'bottom', 'right'];
const specialEasings = ['easeOutElastic', 'easeOutBounce'];
const cssUnits = ['cm', 'px', 'pt', '%', 'em', 'ex', 'in', 'mm', 'pc', 'vh', 'vw', 'vmin'];
let bodyData = null;
let requestAnimationId = -1;
const styleEl = document.createElement('style');
styleEl.setAttribute('id', 'schwifty-library');
document.head.appendChild(styleEl);
let allStyleData = '';
const staggerCreate = {};
const staggerRemove = {};

const getInterruptedValues = elem => {
  //console.log('getComputedStyle')
  const stl = window.getComputedStyle(elem);
  const transform = stl.getPropertyValue('transform');
  let initValue = {};
  if (transform && transform !== 'none') {
    initValue = matrixDeconstruct(transform);
  }
  const tempProps = cssProperties.slice(1).reduce((acc, prop) => {
    const value = stl.getPropertyValue(prop);
    acc[prop] = value;
    return acc;
  }, initValue);
  return tempProps;
};
const setInnerHtml = (value) => {
  styleEl.innerHTML = value;
};
const removeCompletedHizzards = hz => {
  //console.log('removeCompletedHizzards',hz.cssText);
  allStyleData = allStyleData.split(hz.cssText.elementStyles.join('')).join('').split(hz.cssText.keyframes.join('')).join('');
  if (hz.toVars && hz.toVars.fix === 'style') {
    //without interuption values and selector
    const vars = getAnimationVars(hz.toVars);
    hz.classNames.map((className, i) => {

      const {
        fixedValuesToRemove,
        fixValues
      } = cleanUpOnCompletePrepare(`.${className}`, hz.splitValues ? splitVarsForHizzards(vars, i, 0, 0) : vars, null);
      allStyleData = allStyleData.split(fixedValuesToRemove).join('');
      allStyleData += fixValues;
    });
  }
  setInnerHtml(allStyleData);
  /*
  const id = hz.stagger.splitValues ? hz.stagger.unifiedId : hz.stagger.id;
  if(typeof staggerRemove[id] === 'undefined'){
    staggerRemove[id] = {keyframes:[],elementStyle:[],toVars:[], ids:[]};
  }
  staggerRemove[id].elementStyle.push(hz.cssText.elementStyle);
  staggerRemove[id].toVars.push(hz.toVars);
  staggerRemove[id].ids.push(hz.id);
  //TODO: interrup stagger could be more tricky, since some animations could already been finished

  if(!staggerRemove[id].keyframes.some(key=>key === hz.cssText.keyframes)){
    staggerRemove[id].keyframes.push(hz.cssText.keyframes);
  }
  if (hz.stagger.index === hz.stagger.total - 1) {
    let allStyleData = `${styleEl.innerHTML}`;
    staggerRemove[id].elementStyle.forEach( style => allStyleData = allStyleData.split(style).join(''));
    staggerRemove[id].keyframes.forEach( key => allStyleData = allStyleData.split(key).join(''));
    styleEl.innerHTML = allStyleData;
    if(hz.toVars && hz.toVars.fix === 'style') {
      //without interuption and selector
      cleanUpStaggerOnComplete(staggerRemove[id].ids, staggerRemove[id].toVars)
    }
    delete staggerRemove[id]
  }
  */
};
const removeCompleted = an => {
  const interruptedValues = an.interrupted && an.elem && getInterruptedValues(an.elem);
  //console.log('removeCompleted', staggerRemove,an.stagger)

  allStyleData = allStyleData.split(an.cssText.elementStyle).join('').split(an.cssText.keyframes).join('');
  setInnerHtml(allStyleData);
  if (an.toVars && an.toVars.fix === 'style') {
    cleanUpOnComplete(an.selector ? an.selector : `.${an.id}`, an.toVars, interruptedValues);
  }
};


const crossReferenceWithExpectedVars = (animationVars, interruptedValues) => {
  return Object.keys(animationVars).reduce((acc, key) => {
    acc[key] = key === 'important' ? animationVars[key] : interruptedValues[key];
    return acc;
  }, {});
};
const getAnimationVars = vars => animationTypes.concat(['important']).filter(type => propertyCheck(vars[type])).reduce((a, b) => {
  a[b] = vars[b];
  return a;
}, {});
const cleanUpOnComplete = (className, vars, interruptedValues) => {
  const {
    fixedValuesToRemove,
    fixValues
  } = cleanUpOnCompletePrepare(className, vars, interruptedValues);
  //console.log('cleanUpOnComplete',fixedValuesToRemove,fixValues);
  allStyleData = allStyleData.split(fixedValuesToRemove).join('');
  allStyleData += fixValues;
  setInnerHtml(allStyleData);
};
const cleanUpOnCompletePrepare = (className, vars, interruptedValues) => {
  let fixedValuesToRemove = null;
  let animationVars = getAnimationVars(vars);
  if (interruptedValues) {
    animationVars = crossReferenceWithExpectedVars(animationVars, interruptedValues);
  }
  //console.log('animationVars',animationVars);
  if (fixedParamsStorage[className]) {
    //console.log('cleanUpOnComplete fixedParamsStorage')
    vars = Object.assign({}, fixedParamsStorage[className].vars, animationVars, vars.original ? {
      original: getAnimationVars(vars.original)
    } : null);
    fixedParamsStorage[className].vars = vars;
    fixedValuesToRemove = fixedParamsStorage[className].fixValues;
  } else {
    vars = Object.assign({}, animationVars, vars.original ? {
      original: getAnimationVars(vars.original)
    } : null);
    fixedParamsStorage[className] = {
      vars
    };
  }
  const fixValues = (`${className}{${constructAnimation(vars, true)}}`);
  fixedParamsStorage[className].fixValues = fixValues;
  return {
    fixedValuesToRemove,
    fixValues
  };
};
const set = (elem, toVars, callback) => {
  let selector = null;
  if (callback && typeof callback === 'string' && callback === 'selector') {
    selector = OptimalSelect.select(elem);
  }
  if (!selector) {
    const existingClass = elem.className.split(' ').find(cls => cls.indexOf('schwifty-') >= 0);
    //to do cleanUpOnComplete
    selector = `.${existingClass}`;
  }
  const className = selector ? selector : `.${getId()}`;
  cleanUpOnComplete(className, toVars);
    //styleEl.innerHTML += (`${className}{${constructAnimation(toVars, true)}}`)
};
const step = (timestamp) => {
  const previousLength = animations.length;
  let i = previousLength;
  while (i--) {
    const an = animations[i];
    an.tick(timestamp);
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
  requestAnimationId = window.requestAnimationFrame(step);
};
const removeFromBody = () => {
  if (bodyData && bodyData.className) {
    allStyleData = allStyleData.split(bodyData.className).join('');
    setInnerHtml(allStyleData);
  } else if (bodyData) {
    document.body.classList.remove('getting-schwifty');
  }
};
const addToBody = () => {
  if (animations.length === 0 && bodyData) {
    if (bodyData.className) {
      allStyleData += bodyData.className;
      setInnerHtml(allStyleData);
    } else {
      document.body.classList.add('getting-schwifty');
    }
  }
};
const fromTo = (elem, duration, fromVars, toVars, callback, stagger) => {
  const anim = create();
    //TODO: test performance 
  const existingClass = elem.className.split(' ').find(cls => cls.indexOf('schwifty-') >= 0);
  const id = existingClass || (stagger && !stagger.splitValues && callback ? stagger.id : getId());
    //console.log('toVars', toVars)
  const resp = (id, selector) => {
    addNewAnimation(id, anim);
    const className = selector ? selector : `.${id}`;
    const animName = getId() || selector;
    if (toVars.immediateRender && !specialEasings.some(ease => ease === toVars.ease)) {
      toVars = Object.assign({}, toVars, resampleDomValues(elem, className, toVars), {
        original: toVars
      });
    }
    //console.log('names', toVars);
    anim.init(elem, duration, fromVars, toVars, id, selector, stagger, animRemoveCallback);
    //console.log('names', id, selector);
    anim.storeCSS(createSheet(elem, duration, fromVars, toVars, animName, className, stagger));
  };
  if (callback && typeof callback === 'function') {
    callback(id, resp);
  } else if (callback && typeof callback === 'string' && callback === 'selector') {
    const selector = OptimalSelect.select(elem);
    resp(id, selector);
  } else {
    resp(id);
  }
  return anim;
};
const addNewAnimation = (id, anim) => {
  addToBody();
    //check for running animation on one of the stagger elements
  const runningAnim = animations.find(anim => anim.id === id);
  if (runningAnim) {
    runningAnim.stop();
  }
  //console.log('staggerId',id,stagger.id,selector)
  //TODO: check for existing animation id
  animations.push(anim);
  if (requestAnimationId === -1) {
    requestAnimationId = window.requestAnimationFrame(step);
  }
};

const removeAnimation = (an) => {
  const previousLength = animations.length;
  //console.log('animRemoveCallback',previousLength);
  animations.splice(animations.indexOf(an), 1);
  const currentLength = animations.length;
  if (previousLength > 0 && currentLength === 0) {
    killAll();
    removeFromBody();
  }
};
const hizzardsRemoveCallback = an => {
  removeAnimation(an);
  removeCompletedHizzards(an);
};
const animRemoveCallback = (an) => {
  removeAnimation(an);
  removeCompleted(an);
};
const to = (elem, duration, toVars, callback) => {
  //TODO: do build only when needed
  return fromTo(elem, duration, null, toVars, callback);
};
const from = (elem, duration, fromVars, callback) => {
  return fromTo(elem, duration, fromVars, null, callback);
};
  //TODO: join both stagger animations
const staggerFrom = (elements, duration, fromVars, callback, stagger) => {
  return staggerFromTo(elements, duration, fromVars, null, callback, stagger);
};
const staggerTo = (elements, duration, toVars, callback, stagger) => {
  return staggerFromTo(elements, duration, null, toVars, callback, stagger);
};
const staggerFromTo = (elements, duration, fromVars, toVars, callback, stagger) => {
  //TODO: propper join and reuse animations
  elements = Array.isArray(elements) ? elements : [...elements];
  const id = getId();

  const splitValues = (toVars && animationTypes.some(type => Array.isArray(toVars[type]))) || (fromVars && animationTypes.some(type => Array.isArray(fromVars[type])));
  const total = elements.length;
  //if split values then create ids for each animation
  //console.log('staggerFromTo',total,toVars,fromVars)
  const hizzards = createMulti();
  //
  const existingClasses = elements.map(elem => elem.className.split(' ').find(cls => cls.indexOf('schwifty-') >= 0));

  //
  const animName = splitValues ? [...Array(elements.length).keys()].map(i => getId()) : getId();
  addNewAnimation(id, hizzards);
    //console.log('names', toVars);
  hizzards.init(elements, duration, fromVars, toVars, id, stagger, splitValues, existingClasses, hizzardsRemoveCallback);
  //console.log('names', id, selector);
  hizzards.storeCSS(createHizzardsSheet(elements, duration, fromVars, toVars, animName, existingClasses, stagger, splitValues));

  /*
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
				delay: startDelay + index * stagger,
        splitValues,
				unifiedId: id
      })
    })
		*/
  return hizzards;
};
const splitVarsForHizzards = (vars, index, stagger, startDelay) => {
  const splitIntoVarsTypes = vars && animationTypes.filter(type => Array.isArray(vars[type]));
  //console.log('splitIntoVarsTypes',splitIntoVarsTypes,vars,animationTypes);
  let _varsTemp = null;
  if (vars) {
    const objTo = splitIntoVarsTypes.reduce((a, b) => {
      a[b] = vars[b][index];
      return a;
    }, {});
    _varsTemp = Object.assign({}, vars, {
      delay: startDelay + index * stagger
    }, objTo);
  }
  return _varsTemp;
};
const createHizzardsSheet = (elements, duration, fromVars, toVars, animationNames, existingClasses, stagger, splitValues) => {
  //console.log(animationNames,existingClasses)
  const startDelay = getPropertyFromTo('delay', toVars, fromVars, 0);
  const specialEase = specialEasings.find(ease => ease === toVars.ease);
  // console.log('createSheet', animationName, className,performance.now(), stagger, staggerCreate,staggerCreate[stagger.id])
  const css = {
    keyframes: [],
    elementStyles: []
  };

  const keyframes = null;
  elements.forEach((elem, index) => {
    if (!splitValues && css.keyframes.length === 0) {
      css.keyframes[0] = buildKeyFrames(elem, fromVars, toVars, animationNames, existingClasses[0]);
    } else if (splitValues) {
      css.keyframes[index] = buildKeyFrames(elem, splitVarsForHizzards(fromVars, index, stagger, startDelay), splitVarsForHizzards(toVars, index, stagger, startDelay), animationNames[index], existingClasses[index]);
    }
    css.elementStyles[index] = `.${existingClasses[index]}{animation: ${splitValues ? animationNames[index] : animationNames} ${duration}s both ${specialEase === 'easeOutElastic' ? 'linear' : getPropertyFromTo('ease', toVars, fromVars, 'linear')} ${getPropertyFromTo('delay', toVars, fromVars, 0) + index * stagger}s;}`;
  });
  allStyleData = `${css.keyframes.join('')}${css.elementStyles.join('')}${allStyleData}`;
  setInnerHtml(allStyleData);
  //console.log('createSheet stagger', allStyleData)
  return css;
  /*
		
		/////////////////////////////////////
    const prevValues = fixedParamsStorage[className]
    if (prevValues) {
      toVars = Object.assign({}, prevValues.vars, toVars)
    }
    const specialEase = specialEasings.find(ease => ease === toVars.ease);
		const delay = (fromVars && fromVars.delay) || (toVars && toVars.delay) || 0;
    const cssText = {
      keyframes: buildKeyFrames(elem, fromVars, toVars, animationName, className),
      elementStyle: `${className}{animation: ${animationName} ${duration}s both ${specialEase === 'easeOutElastic'?'linear':( toVars.ease || 'linear')} ${delay}s;}`
    };
		//TODO: prevent duplicate!!!
    //if (styleEl.innerHTML.indexOf(cssText.keyframes) < 0) {
		if(!stagger){
			//console.log('createSheet', cssText)
      styleEl.innerHTML = `${styleEl.innerHTML}${cssText.keyframes}${cssText.elementStyle}`;
		}else if(stagger && stagger.index <= stagger.total-1 ){
			const id = stagger.splitValues ? stagger.unifiedId : stagger.id;
		
			if(typeof staggerCreate[id] == 'undefined'){
				staggerCreate[id] = {keyframes:[],elementStyle:[]}
			}
			//handle multiple values
			//console.log('createSheet', animationName, className, id, staggerCreate[id])

			//inserts doubles
			if(!staggerCreate[id].keyframes.some(key=>key === cssText.keyframes)){
				staggerCreate[id].keyframes.push(cssText.keyframes)
			}
			staggerCreate[id].elementStyle.push(cssText.elementStyle)
			if(stagger.index === stagger.total-1){
				let allStyleData = staggerCreate[id].elementStyle.reduce((acc, style) => `${acc}${style}` ,styleEl.innerHTML);
				allStyleData = staggerCreate[id].keyframes.reduce((acc, key) => `${acc}${key}`, allStyleData);
				//console.log('createSheet stagger', allStyleData)
				styleEl.innerHTML = allStyleData;
				delete staggerCreate[id]
			}
		}
    //}
    //styleEl.innerHTML += cssText.elementStyle;
    //console.log(cssText)
    return cssText;
		*/
};
const create = () => {
  return Object.create(Fleeb);
};
const createMulti = () => {
  return Object.create(Hizzards);
};
const killAll = () => {
  window.cancelAnimationFrame(requestAnimationId);
  requestAnimationId = -1;
};
const getId = () => {
  return 'schwifty-xxxxxxxx'.replace(/x/g, () => (Math.random() * 16 | 0).toString(16));
};
const bodyClassUpdate = (notify, className) => {
  if (className) {
    document.body.classList.add('getting-schwifty');
  }
  bodyData = {
    notify,
    className
  };
};
const compareUnitsForVars = (fromVars, toVars) => {
  let allEqualUnits = true;
  let notEqualVars = null;
  //console.log('compareUnitsForVars',fromVars, toVars)
  if (!fromVars) {
    return {
      allEqualUnits: false,
      res: null,
      notEqualVars: 'both'
    };
  }
  const res = Object.keys(fromVars).reduce((acc, key) => {
    if (key !== 'important') {
      //console.log(key,fromVars[key],toVars[key])
      const unitFrom = unitSplit(fromVars[key]);
      const unitTo = unitSplit(toVars[key]);
      const stepValues = null;
      if (compareUnits(unitFrom, unitTo)) {
        acc[key] = {
          unitFrom,
          unitTo
        };
      } else {
        const notEqual = (unitTo[1] !== '' && unitFrom[1] !== '') ? 'both' : (unitTo[1] !== '' ? 'to' : 'from');
        notEqualVars = calculateVarsToRecheck(notEqualVars, notEqual);
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
  };
};
const calculateVarsToRecheck = (notEqualVars, notEqual) => {
  if (!notEqualVars) {
    return notEqual;
  } else if (notEqualVars === 'both' || notEqual === 'both' || (notEqualVars === 'from' && notEqual === 'to') || (notEqualVars === 'to' && notEqual === 'from')) {
    return 'both';
  } else if (notEqualVars === 'from' && notEqual === 'from') {
    return 'from';
  } else if (notEqualVars === 'to' && notEqual === 'to') {
    return 'to';
  }
};
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
    });
  });
  const elastic = variableSteps.reduce((accum, stp, index) => `${accum} ${round((index+1)/STEPS*100, 3)}%{ ${stp ? constructAnimation(stp) : ''} }`, '');
  return (`@keyframes ${animationName} { ${elastic} }`);
};
const buildKeyFrames = (elem, fromVars, toVars, animationName, className) => {
  const specialEase = specialEasings.find(ease => ease === toVars.ease);
  if (specialEase) {
    const {
      allEqualUnits,
      res,
      notEqualVars
    } = compareUnitsForVars(fromVars, toVars);
      //console.log('recheck',allEqualUnits,res,notEqualVars)
    if (allEqualUnits) {
      return buildKeyFramesAnimation(res, animationName);
    } else {
      if (notEqualVars === 'to') {
        toVars = resampleDomValues(elem, className, toVars);
      } else if (notEqualVars === 'from') {
        fromVars = resampleDomValues(elem, className, fromVars);
      } else if (notEqualVars === 'both') {
        toVars = resampleDomValues(elem, className, toVars, fromVars);
        fromVars = resampleDomValues(elem, className, fromVars, toVars);
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
};
const resampleDomValues = (elem, className, vars, otherVars) => {
  let test = null;
  if (vars) {
    test = `${className}{${constructAnimation(vars, true)}}`;
    allStyleData += test;
  }
  setInnerHtml(allStyleData);
  //not all units are equal need to resample the element
  const varsFixed = crossReferenceWithExpectedVars(getAnimationVars(vars || otherVars), getInterruptedValues(elem));
  if (test) {
    allStyleData = allStyleData.split(test).join('');
  }
  setInnerHtml(allStyleData);
  return varsFixed;
};
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
const createSheet = (elem, duration, fromVars, toVars, animationName, className, stagger) => {
  //console.log('createSheet', animationName, className,performance.now(), stagger, staggerCreate)
  const prevValues = fixedParamsStorage[className];
  if (prevValues) {
    toVars = Object.assign({}, prevValues.vars, toVars);
  }
  const specialEase = specialEasings.find(ease => ease === toVars.ease);
  const delay = (fromVars && fromVars.delay) || (toVars && toVars.delay) || 0;
  const cssText = {
    keyframes: buildKeyFrames(elem, fromVars, toVars, animationName, className),
    elementStyle: `${className}{animation: ${animationName} ${duration}s both ${specialEase === 'easeOutElastic'?'linear':( toVars.ease || 'linear')} ${delay}s;}`
  };
  //TODO: prevent duplicate!!!
  //if (styleEl.innerHTML.indexOf(cssText.keyframes) < 0) {

  allStyleData = `${allStyleData}${cssText.keyframes}${cssText.elementStyle}`;
  setInnerHtml(allStyleData);
    //}
    //styleEl.innerHTML += cssText.elementStyle;
    //console.log(cssText)
  return cssText;
};
const propertyCheck = prop => {
  return typeof prop !== 'undefined' && prop !== null && prop !== '';
};
const numberCheck = num => typeof num === 'number';
const constructAnimation = (vars, fix) => {
  if (fix && vars.original) {
    vars = vars.original;
  }
  let string = '';
  let translateString = '';
  if (propertyCheck(vars.x)) {
    translateString = `${translateString} translateX(${numberCheck(vars.x) ? `${vars.x}px` : vars.x})`;
  }
  if (propertyCheck(vars.y)) {
    translateString = `${translateString} translateY(${numberCheck(vars.y) ? `${vars.y}px` : vars.y})`;
  }
  if (propertyCheck(vars.scale)) {
    translateString = `${translateString} scale(${vars.scale})`;
  }
  if (propertyCheck(vars.rotate)) {
    translateString = `${translateString} rotate(${vars.rotate}deg)`;
  }
  if (propertyCheck(vars.opacity)) {
    string = `${string} opacity:${vars.opacity} ${importantDeclaration(vars.important, 'opacity', fix)};`;
  }
  if (propertyCheck(vars.color)) {
    string = `${string} color:${vars.color} ${importantDeclaration(vars.important, 'color', fix)};`;
  }
  if (propertyCheck(vars.backgroundColor)) {
    string = `${string} background-color:${vars.backgroundColor} ${importantDeclaration(vars.important, 'backgroundColor', fix)};`;
  }

  if (propertyCheck(vars.width)) {
    string = `${string} width:${numberCheck(vars.width) ? `${vars.width}px` : vars.width} ${importantDeclaration(vars.important, 'width', fix)};`;
  }
  if (propertyCheck(vars.height)) {
    string = `${string} height:${numberCheck(vars.height) ? `${vars.height}px` : vars.height} ${importantDeclaration(vars.important, 'height', fix)};`;
  }
  if (propertyCheck(vars.left)) {
    string = `${string} left:${numberCheck(vars.left) ? `${vars.left}px` : vars.left} ${importantDeclaration(vars.important, 'left', fix)};`;
  }
  if (propertyCheck(vars.top)) {
    string = `${string} top:${numberCheck(vars.top) ? `${vars.top}px` : vars.top} ${importantDeclaration(vars.important, 'top', fix)};`;
  }
  if (propertyCheck(vars.transformOrigin)) {
    string = `${string} transform-origin:${vars.transformOrigin};`;
  }
  if (translateString) {
    string = `${string} transform:${translateString} ${importantDeclaration(vars.important, 'transform', fix)};`;
  }
  //console.log('st-',string)
  return string;
};
const importantDeclaration = (importantArray, property, fix) => {
  return (fix && checkImportantValue(importantArray, property)) ? '!important' : '';
};
const checkImportantValue = (importantArray, property) => {
  return importantArray && importantArray.some(value => value === property);
};
const dump = () => {
  return {
    html: styleEl.innerHTML,
    local: allStyleData
  };
};

const Schwifty = {
  fromTo,
  from,
  to,
  set,
  staggerFrom,
  staggerTo,
  killAll,
  bodyClassUpdate,
  dump,
  matrixDeconstruct
};


export default Schwifty;
