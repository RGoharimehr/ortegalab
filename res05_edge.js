/**
 * Adobe Helium: symbol definitions
 */
window.symbols = {
"stage": {
   version: "0.1.2",
   baseState: "Base State",
   initialState: "Base State",
   parameters: {

   },
   content: {
      dom: [
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
,
      ],
      symbolInstances: [
      ],
   },
   states: {
      "Base State": {
         "#templatemo_col6b": [
            ["transform", "scaleX", '1'],
            ["transform", "scaleY", '1']
         ]
      }
   },
   actions: {

   },
   bindings: [

   ],
   timelines: {
      "Default Timeline": {
         fromState: "Base State",
         toState: "",
         duration: 2000,
         timeline: [
            { id: "eid10", tween: [ "transform", "#templatemo_col6b", "scaleY", '1.1', { valueTemplate: undefined, fromValue: '1'}], position: 0, duration: 1000, easing: "linear" },
            { id: "eid12", tween: [ "transform", "#templatemo_col6b", "scaleY", '1', { valueTemplate: undefined, fromValue: '1.1'}], position: 1000, duration: 1000, easing: "linear" },
            { id: "eid9", tween: [ "transform", "#templatemo_col6b", "scaleX", '1.1', { valueTemplate: undefined, fromValue: '1'}], position: 0, duration: 1000, easing: "linear" },
            { id: "eid11", tween: [ "transform", "#templatemo_col6b", "scaleX", '1', { valueTemplate: undefined, fromValue: '1.1'}], position: 1000, duration: 1000, easing: "linear" }]
      }
   }
}};

/**
 * Adobe Edge DOM Ready Event Handler
 */
$(window).ready(function() {
     $.Edge.initialize(symbols);
});
/**
 * Adobe Edge Timeline Launch
 */
$.Edge.ready(function() {
    $.Edge.play();
});
