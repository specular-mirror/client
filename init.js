var MAIN_WINDOW;
nw.Window.open("./app/index.html", {}, function(main_window) {
//  console.log(main_window);
  MAIN_WINDOW = main_window;
});
