'use strict';
var Schwifty = (function() {
			let animations = [];
			const fixedParams = {};
			const animationTypes = ['opacity', 'x', 'y', 'scale', 'skew', 'rotate', 'width', 'height', 'backgroundColor', 'color', 'top', 'left', 'bottom', 'right']
			const cssProperties = ['transform', 'opacity', 'width', 'height', 'backgroundColor', 'color', 'top', 'left', 'bottom', 'right'];
			const startDemandingProps = [ 'width', 'height', 'top', 'left', 'bottom', 'right'];
			const specialEasings = [ 'easeOutElastic', 'easeOutBounce'];
			const cssUnits = [ 'cm', 'px', 'pt', '%', 'em', 'ex', 'in',	'mm',	'pc',	'vh', 'vw',	'vmin'];
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
				pause(){
					console.log('pause', this.elem)
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
					acc[key] = (key === 'important' ? animationVars[key] : interruptedValues[key]);
					return acc;
				}, {})
				return res;
			}
			const getAnimationVars =  vars => animationTypes.concat(['important']).filter(type => propertyCheck(vars[type])).reduce((a, b) => {
					a[b] = vars[b];
					return a;
				}, {})
			
			const cleanUpOnComplete = (className, vars, interruptedValues) => {
				let animationVars = getAnimationVars(vars);
				if (interruptedValues) {
					animationVars = crossReferenceWithExpectedVars(animationVars, interruptedValues)
				}
				//console.log('animationVars', animationVars, fixedParams[className])
				if (fixedParams[className]) {
					vars = Object.assign({}, fixedParams[className].vars, animationVars);
					fixedParams[className].vars = vars;
					styleEl.innerHTML = styleEl.innerHTML.split(fixedParams[className].fixValues).join('')
				} else {
					vars = animationVars;
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
				if(!selector){
					const existingClass = elem.className.split(" ").find(cls => cls.indexOf('schwifty-') >= 0);
					//to do cleanUpOnComplete
					selector = `.${existingClass}`
				}
				const className = selector ? selector : `.${getId()}`;
				cleanUpOnComplete(className,toVars)
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
				console.log('toVars',toVars)
				const resp = (id, selector) => {
					addToBody()
						//console.log('staggerId',id,stagger.id,selector)
						//TODO: check for existing animation id
					animations.push(anim)
					if (requestAnimationId === -1) {
						requestAnimationId = window.requestAnimationFrame(step)
					}

					//console.log('animName', stagger.id, id, (stagger && stagger.id) || id || selector)
					anim.init(elem, duration, fromVars, toVars, id, selector, stagger, animRemoveCallback);
					//console.log('names', id, selector);
					anim.storeCSS(createSheet(duration, fromVars, toVars, /*animName*/ (stagger && stagger.id) || getId() || selector, /*className*/ selector ? selector : `.${id}`));
					//anim.storeCSS(createSheet(duration, fromVars, toVars, /*animName*/ (stagger && stagger.id) || id || selector, /*className*/ selector ? selector : `.${id}`));
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
				const specialEase = specialEasings.find(ease=>ease === toVars.ease);
				let from = null;
				if(specialEase){
					const vals = getInterruptedValues(elem);
					from = crossReferenceWithExpectedVars(getAnimationVars(toVars),vals)
				}
				return fromTo(elem, duration, from, toVars, callback);
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

			const buildKeyFrames = (fromVars, toVars, animationName) => {
				const specialEase = specialEasings.find(ease=>ease === toVars.ease);
				if(specialEase){
					const STEPS = 10;
					const variableSteps = [...Array(STEPS).keys()].map(()=>({}));
					let allEqualUnits = true;
					const res = Object.keys(fromVars).reduce((acc, key) => {
						const unitFrom = unitSplit(fromVars[key]);
						const unitTo = unitSplit(toVars[key]);
						let stepValues = null;
						if(compareUnits(unitFrom,unitTo)){
							stepValues = [...Array(STEPS).keys()].map(incr => variableSteps[incr][key] = (unitFrom[0] + (unitTo[0]-unitFrom[0])*(incr+1)/STEPS)+(unitTo.length===2?unitTo[1]:0) )
						}else{
							allEqualUnits = false;
						}
						console.log(key,unitFrom,unitTo,compareUnits(unitFrom,unitTo),stepValues)

						return acc;
					},{});
					//if(allEqualUnits){
						const elastic = variableSteps.reduce((acc,stp,index) => `${acc} ${(index+1)/STEPS*100}%{ ${stp ? constructAnimation(stp) : ''} }`,'')
						return (`@keyframes ${animationName} { ${elastic} }`)
						//TODO: need to create array of vars [{toVars,fromVars},{toVars,fromVars}...{toVars,fromVars}]
					//}
					//console.log(res,allEqualUnits,variableSteps)
				}
				return `@keyframes ${animationName} {from { ${fromVars ? constructAnimation(fromVars) : '' } } to{ ${toVars ? constructAnimation(toVars) : '' } }}`;
			}
			const compareUnits = (unitFrom, unitTo) => {
				if(unitFrom.length ===2 && unitTo.length === 2 && unitFrom[1] === unitTo[1]){
					return true;
				}
				if(unitFrom.length === 1 && unitTo.length ===1){
					return true;
				}
				if(unitFrom.length === 1 && unitTo.length === 2 && unitTo[1] === 'px'){
					return true;
				}
				if(unitTo.length === 1 && unitFrom.length === 2 && unitFrom[1] === 'px'){
					return true;
				}
				return false;
			}
			const unitSplit = value => {
				if(numberCheck(value)){
					return [value]
				}
				const arr = value.match(/(\d+)|\D+$/g);
				arr[0] = parseInt(arr[0],10);
				return arr;
			};
			
			const createSheet = (duration, fromVars, toVars, animationName, className) => {
				console.log('names', animationName, className)
				const prevValues = fixedParams[className]
				if (prevValues) {
					toVars = Object.assign({}, prevValues.vars, toVars)
				}
				const specialEase = specialEasings.find(ease=>ease === toVars.ease);

				const cssText = {
					keyframes: buildKeyFrames(fromVars, toVars, animationName),
					elementStyle: `${className}{animation: ${animationName} ${duration}s both ${specialEase?'linear':( toVars.ease || 'linear')} ${toVars.delay || 0}s;}`
				};

				if (styleEl.innerHTML.indexOf(cssText.keyframes) < 0) {
					styleEl.innerHTML += cssText.keyframes;
				}
				styleEl.innerHTML += cssText.elementStyle;
				console.log(cssText)
				return cssText;
			}
			const propertyCheck = prop => {
				return typeof prop !== 'undefined' && prop !== null && prop !== '';
			}
			const numberCheck = num => typeof num === 'number'
			const constructAnimation = (vars, fix) => {
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