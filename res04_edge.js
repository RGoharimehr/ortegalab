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
         "#templatemo_col5c": [
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
            { id: "eid4", tween: [ "transform", "#templatemo_col5c", "scaleY", '1.1', { valueTemplate: undefined, fromValue: '1'}], position: 0, duration: 1000, easing: "linear" },
            { id: "eid6", tween: [ "transform", "#templatemo_col5c", "scaleY", '1', { valueTemplate: undefined, fromValue: '1.1'}], position: 1000, duration: 1000, easing: "linear" },
            { id: "eid3", tween: [ "transform", "#templatemo_col5c", "scaleX", '1.1', { valueTemplate: undefined, fromValue: '1'}], position: 0, duration: 1000, easing: "linear" },
            { id: "eid5", tween: [ "transform", "#templatemo_col5c", "scaleX", '1', { valueTemplate: undefined, fromValue: '1.1'}], position: 1000, duration: 1000, easing: "linear" }]
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
