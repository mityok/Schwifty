var Schwifty = (function() {
	this.animations = [];
	var animationTypes = ['opacity', 'transform', 'width', 'height', 'color', 'background-color']
	this.requestAnimationId = -1;
	this.styleEl = document.createElement('style');
	document.head.appendChild(this.styleEl);

	// Grab style sheet
	this.styleSheet = this.styleEl.sheet;
	var Fleeb = {
		init: function(elem, duration, fromVars, toVars, id, selector, stagger) {
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
			this.prepareElement(elem, this.id);
			this.counter = -1;
			this.completed = false;
			console.log('id-', id)
		},
		storeCSS: function(text) {
			this.cssText = text
		},
		prepareElement: function(el, id) {
			console.log('prep', this.selector)
			if (!el.classList.contains(id) && !this.selector) {
				el.classList.add(id)
			}
			el.addEventListener("animationstart", this.animationStart.bind(this), false);
			el.addEventListener("animationend", this.animationEnd.bind(this), false);
		},
		animationStart: function(e) {
			if (e.animationName === this.id) {
				if (this.onStart) {
					this.onStart()
				}
				this.running = true;
				this.counter = performance.now()
			}
		},
		animationEnd: function(e) {
			console.log('end', e.animationName === this.id, e.animationName, this.id)
			if (e.animationName === this.id) {
				console.log('end')
				this.complete()
			}
		},
		complete: function() {
			if (!this.completed) {
				this.completed = true;
				this.running = false;
				if (!this.stagger && this.onComplete) {
					this.onComplete(this)
				}
				if(this.stagger && this.stagger.index === this.stagger.total-1 && this.onComplete){
					this.onComplete(this)
				}
				this.elem.removeEventListener("animationstart", this.animationStart);
				this.elem.removeEventListener("animationend", this.animationEnd);
			}
		},
		tick: function(timestamp) {
			if (this.counter >= 0 && this.duration * 1000 + this.counter - timestamp <= 0 && !this.completed) {
				this.complete();
			}
		}
	};
	const removeCompleted = an => {
		var text = this.styleEl.innerHTML;
		console.log('ending')
			//remove just the elementStyle but keep the keyframes for stagger
			//text = text.split(an.cssText).join('');
		text = text.split(an.cssText.elementStyle).join('');
		if (an.stagger) {
			if (an.stagger.index === an.stagger.total - 1) {
				text = text.split(an.cssText.keyframes).join('');
			}
		} else {
			text = text.split(an.cssText.keyframes).join('');
		}
		if (an.toVars && an.toVars.fix === 'style') {
			var className = an.selector ? an.selector : `.${an.id}`;
			text += (`${className}{transform: translate(${an.toVars.x}px, ${an.toVars.y}px);}`)
		}
		this.styleEl.innerHTML = text;
	}
	const step = (timestamp) => {
		var previousLength = animations.length;
		animations = animations.filter(an => {
			an.tick(timestamp)
			if (an.completed) {
				removeCompleted(an)
			} else {
				if (an.running && an.onUpdate) {
					an.onUpdate(an, timestamp - an.counter);
				}
			}
			return !an.completed
		})
		var currentLength = animations.length;
		if (previousLength > 0 && currentLength === 0) {
			killAll();
			if (this.bodyAware) {
				document.body.classList.remove('getting-schwifty');
			}
			return;
		}
		this.requestAnimationId = window.requestAnimationFrame(step)
	}
	const addToBody = () => {
		if (this.animations.length === 0 && this.bodyAware) {
			document.body.classList.add('getting-schwifty')
		}
	}
	const fromTo = (elem, duration, fromVars, toVars, callback, stagger) => {
		console.log('sdfsd', this.styleEl.innerHTML)
		var anim = create()
		var id = stagger ? stagger.id : getId()
		var resp = (id, selector) => {
			addToBody()
				//TODO: check for existing animation id
			this.animations.push(anim)
			if (this.requestAnimationId === -1) {
				this.requestAnimationId = window.requestAnimationFrame(step)
			}
			anim.init(elem, duration, fromVars, toVars, id, selector, stagger)
			anim.storeCSS(createSheet(duration, fromVars, toVars, id, selector))
		}
		if (callback && typeof callback === 'function') {
			callback(id, resp)
		} else if (callback && typeof callback === 'string' && callback === 'selector') {
			var selector = OptimalSelect.select(elem)
			resp(id, selector);
		} else {
			resp(id);
		}
		return anim;
	}
	const to = (elem, duration, toVars, callback) => {
		return fromTo(elem, duration, null, toVars, callback);
	}
	const from = (elem, duration, fromVars, callback) => {
		return fromTo(elem, duration, fromVars, null, callback);
	}
	const staggerFrom = (elements, duration, fromVars, callback, stagger) => {
		//TODO: propper join and reuse animations
		const id = getId();
		const startDelay = fromVars.delay || 0;
		const total = elements.length;
		return [...elements].map((elem, index) => fromTo(elem, duration, Object.assign({}, fromVars, {
			delay: startDelay + index * stagger
		}), null, callback, {
			id,
			index,
			total
		}))
	}
	const create = () => {
		return Object.create(Fleeb)
	}
	const killAll = () => {
		window.cancelAnimationFrame(this.requestAnimationId);
		this.requestAnimationId = -1
	}
	const getId = () => {
		return 'schwifty-xxxxxxxx'.replace(/x/g, () => (Math.random() * 16 | 0).toString(16));
	}
	const bodyAware = (notify) => {
		this.bodyAware = notify
	}
	const createSheet = (duration, fromVars, toVars, animationName, selector) => {
		console.log(animationTypes)
		var className = selector ? selector : `.${animationName}`;
		var cssText = {
			keyframes: '',
			elementStyle: ''
		};
		if (fromVars && toVars) {
			cssText = {
				keyframes: `@keyframes ${animationName} {from { ${constructAnimation(fromVars)} } to{ ${constructAnimation(toVars)} }}`,
				elementStyle: ` ${className}{animation: ${animationName} ${duration}s both ${toVars.ease || 'linear'} ${toVars.delay || 0}s;}`
			};
		} else if (toVars) {
			cssText = {
				keyframes: `@keyframes ${animationName} {to { ${constructAnimation(toVars)} }}`,
				elementStyle: ` ${className}{animation: ${animationName} ${duration}s both ${toVars.ease || 'linear'} ${toVars.delay || 0}s;}`
			}
		} else if (fromVars) {
			cssText = {
				keyframes: `@keyframes ${animationName} {from { ${constructAnimation(fromVars)} }}`,
				elementStyle: `${className}{animation: ${animationName} ${duration}s both ${fromVars.ease || 'linear'} ${fromVars.delay || 0}s;}`
			}
		}
		var innerHTML = this.styleEl.innerHTML;
		if (innerHTML.indexOf(cssText.keyframes) < 0) {
			innerHTML += cssText.keyframes;
		}
		innerHTML += cssText.elementStyle;
		this.styleEl.innerHTML += innerHTML;
		return cssText;
	}
	const propertyCheck = (prop) => {
		return typeof prop !== 'undefined' && prop !== null && prop !== '';
	}
	const constructAnimation = (vars) => {
		let string = '';
		let translateString = '';
		if (propertyCheck(vars.x)) {
			translateString += ` translateX(${vars.x}px)`
		}
		if (propertyCheck(vars.y)) {
			translateString += ` translateY(${vars.y}px)`
		}
		if (propertyCheck(vars.scale)) {
			translateString += ` scale(${vars.scale})`
		}
		if (propertyCheck(vars.opacity)) {
			string += ` opacity:${vars.opacity};`
		}
		if (translateString) {
			string = `${string} transform:${translateString};`
		}
		return string;
	}
	const dump = () => {
		return this.styleEl.innerHTML;
	}
	return {
		fromTo: fromTo,
		from: from,
		to: to,
		staggerFrom: staggerFrom,
		killAll: killAll,
		bodyAware: bodyAware,
		dump: dump
	}
})()