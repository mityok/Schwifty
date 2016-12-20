# Schwifty

  TODO:
  1. support for more properties animations [All CSS animated properties](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_animated_properties)
  2. pause support
  3. support for combinig previous animation with new added one
  4. handle for element removal
  5. create showcase/tests for various scenarios
  6. add support for pseudo elements
  7. add support for easing functions - (elastic requires initial value)
  8. width/height/left/right/top/bottom/etc needs starting value
  9. add support for incremental values - x:'-=50'
  10. add support for calc value
  11. flatten floating point values
  12. optimize elastic resampling for stagger
  13. stop stagger
  14. on stagger with simillar values create joined class rule 
  
  performance:
  
  1. will-change improves dramatically - should add on animation
  2. need to optimize add and remove on stagger (no multiple createSheet and removeCompleted)
  
  Showcase:
  
  1. [performance](https://jsfiddle.net/mityok/n2yf5ghd/)
  2. [use cases](https://jsfiddle.net/mityok/8fz4qh0z/1/)
 
