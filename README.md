# Schwifty

Animation library for creating and orchestrating tween animations. Based on top of CSS animations, with user API inpired by GSAP library.

## Code Example

```javascript
Schwifty.to(document.querySelector('.element'), 1, { left: 200, top: '10%', ease: 'easeOutElastic', delay: 0});
```

## Showcase

Load testing [performance](https://jsfiddle.net/mityok/n2yf5ghd/), 
General code examples and [use cases](https://jsfiddle.net/mityok/8fz4qh0z/1/)

## Things to implement

  1. support for more properties animations [All CSS animated properties](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_animated_properties)
  2. pause support
  3. support for combinig previous animation with new added one
  4. handle for element removal
  5. add support for pseudo elements
  6. add support for easing functions - (elastic requires initial value)
  7. width/height/left/right/top/bottom/etc needs starting value
  8. add support for incremental values - x:'-=50'
  9. add support for calc value
  10. flatten floating point values
  11. optimize elastic resampling for stagger
  12. stop stagger
  13. on stagger with simillar values create joined class rule 
  14. will-change improves dramatically - should add on animation
  
