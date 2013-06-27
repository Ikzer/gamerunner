//=============================================================================

//We need some ECMAScript 5 methods but we need to implement them ourselves
//for older browsers (compatibility: http://kangax.github.com/es5-compat-table/)

//Function.bind:        https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Function/bind
//Object.create:        http://javascript.crockford.com/prototypal.html
//Object.extend:        (defacto standard like jquery $.extend or prototype's Object.extend)

//Object.construct:     our own wrapper around Object.create that ALSO calls
//an initialize constructor method if one exists

//=============================================================================

if (!Function.prototype.bind) {
	Function.prototype.bind = function(obj) {
		var slice = [].slice,
		args  = slice.call(arguments, 1),
		self  = this,
		nop   = function () {},
		bound = function () {
			return self.apply(this instanceof nop ? this : (obj || {}), args.concat(slice.call(arguments)));   
		};
		nop.prototype   = self.prototype;
		bound.prototype = new nop();
		return bound;
	};
}

if (!Object.create) {
	Object.create = function(base) {
		function F() {};
		F.prototype = base;
		return new F();
	}
}

if (!Object.construct) {
	Object.construct = function(base) {
		var instance = Object.create(base);
		if (instance.initialize)
			instance.initialize.apply(instance, [].slice.call(arguments, 1));
		return instance;
	}
}

if (!Object.extend) {
	Object.extend = function(destination, source) {
		for (var property in source) {
			if (source.hasOwnProperty(property))
				destination[property] = source[property];
		}
		return destination;
	};
}

/* NOT READY FOR PRIME TIME
if (!window.requestAnimationFrame) {// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
  window.requestAnimationFrame = window.webkitRequestAnimationFrame || 
                                 window.mozRequestAnimationFrame    || 
                                 window.oRequestAnimationFrame      || 
                                 window.msRequestAnimationFrame     || 
                                 function(callback, element) {
                                   window.setTimeout(callback, 1000 / 60);
                                 }
}
 */

//=============================================================================
//JUEGO
//=============================================================================

Game = {
		/* Propiedad que comprueba si el navegador es compatible
		 * fijándose en las funciones que deberíamos poder utilizar
		 * Siendo algunas de ellas las que implementamos anteriormente
		 */
		compatible: function() {
			return Object.create &&
			Object.extend &&
			Function.bind &&
			// Estándar de HTML5, todos los navegadores modernos que soportan canvas
			// soportan también el add/removeEventListener:
			document.addEventListener && 
			// Comprueba si es compatible con canvas
			Game.ua.hasCanvas
		},
		
		/*
		 * Función de inicio del juego
		 * Necesita: un identificador del canvas, un objeto de juego y su configuración
		 * Comprueba si el navegador es compatible y se puede ejecutar
		 */
		start: function(id, game, cfg) {
			if (Game.compatible())
				// Devuelve una instancia del juego, no el runner
				// La llamada siempre puede acceder al runner a través de game.runner
				return Object.construct(Game.Runner, id, game, cfg).game; 
		},
		
		/*
		 * Función para detectar el User Agent (el navegador utilizado)
		 */
		ua: function() { // Debería evitar la suplantación de UA... pero no siempre es posible
			// Primero pasamos la cadena del UA a minúsculas
			var ua  = navigator.userAgent.toLowerCase();
			// Almacenamos en key el UA obtenido
			var key =        ((ua.indexOf("opera")   > -1) ? "opera"   : null);
			key = key || ((ua.indexOf("firefox") > -1) ? "firefox" : null);
			key = key || ((ua.indexOf("chrome")  > -1) ? "chrome"  : null);
			key = key || ((ua.indexOf("safari")  > -1) ? "safari"  : null);
			key = key || ((ua.indexOf("msie")    > -1) ? "ie"      : null);

			try {
				// Si el UA es "ie" sustituimos "ie" por "msie" y luego añadimos un número
				// Si no es "ie", guardamos lo obtenido y añadimos una expresión regular para
				// añadir un número en coma flotante que será la versión (d.d)
				var re      = (key == "ie") ? "msie (\\d)" : key + "\\/(\\d\\.\\d)"
						// Una vez obtenida la expresión regular pasamos el nombre completo del UA
						// Y le quitamos el número (sea entero o float)
						var matches = ua.match(new RegExp(re, "i"));
						// Y convertimos lo obtenido en un float, que será la versión
				var version = matches ? parseFloat(matches[1]) : null;
			} catch (e) {}

			// Devolvemos una buena cantidad de propiedas como UA
			return {
				full:      ua, // El UA completo
				name:      key + (version ? " " + version.toString() : ""), // El nombre del UA + su versión
				version:   version, // La versión
				isFirefox: (key == "firefox"), // El navegador correspondiente como booleano (para comprobaciones)
				isChrome:  (key == "chrome"),
				isSafari:  (key == "safari"),
				isOpera:   (key == "opera"),
				isIE:      (key == "ie"),
				hasCanvas: (document.createElement('canvas').getContext), // Le creamos un elemento canvas y devolvemos el contexto
				hasAudio:  (typeof(Audio) != 'undefined') // Si es compatible con <audio>
			}
		}(),

		// Métodos para añadir eventos y quitarlos
		addEvent:    function(obj, type, fn) { obj.addEventListener(type, fn, false);    },
		removeEvent: function(obj, type, fn) { obj.removeEventListener(type, fn, false); },

		// Método para cuando el DOM esté listo y cargado, el juego listo para arrancar
		ready: function(fn) {
			if (Game.compatible())
				Game.addEvent(document, 'DOMContentLoaded', fn);
		},

		// Crear el elemento canvas donde se mostrará el juego
		createCanvas: function() {
			return document.createElement('canvas');
		},

		// Creamos y cargamos un elemento de sonido, pasándole su localización
		createAudio: function(src) {
			try {
				var a = new Audio(src);
				a.volume = 0.1; // Lo ponemos bajito
				return a;
			} catch (e) {
				return null;
			}
		},
		
		// Cargar múltiples imágenes (desde sources)
		// LLamar a la función callback cuando TODAS se hayan cargado
		loadImages: function(sources, callback) { 
			var images = {};
			var count = sources ? sources.length : 0;
			// Si no hay imágenes en sources, llamamos a callback
			if (count == 0) {
				callback(images);
			}
			// Mientras quede alguna imagen por cargar, creamos un elemento <img> y la ponemos en él 
			else {
				for(var n = 0 ; n < sources.length ; n++) {
					var source = sources[n];
					var image = document.createElement('img');
					images[source] = image;
					Game.addEvent(image, 'load', function() { if (--count == 0) callback(images); });
					image.src = source;
				}
			}
		},

		// Generador de aleatorios entre dos números
		random: function(min, max) {
			return (min + (Math.random() * (max - min)));
		},

		// Tiempo actual
		timestamp: function() { 
			return new Date().getTime();
		},

		// Controlador de las entradas de teclado, para no tener que saberse los códigos
		// Les ponemos su correspondiente nombre a cada una
		KEY: {
			BACKSPACE: 8,
			TAB:       9,
			RETURN:   13,
			ESC:      27,
			SPACE:    32,
			LEFT:     37,
			UP:       38,
			RIGHT:    39,
			DOWN:     40,
			DELETE:   46,
			HOME:     36,
			END:      35,
			PAGEUP:   33,
			PAGEDOWN: 34,
			INSERT:   45,
			ZERO:     48,
			ONE:      49,
			TWO:      50,
			A:        65,
			L:        76,
			P:        80,
			Q:        81,
			TILDA:    192
		},

		// Hasta aquí la configuración básica y general
		//-----------------------------------------------------------------------------

		Runner: {

			initialize: function(id, game, cfg) {
				this.cfg          = Object.extend(game.Defaults || {}, cfg || {}); // use game defaults (if any) and extend with custom cfg (if any)
				this.fps          = this.cfg.fps || 60;
				this.interval     = 1000.0 / this.fps;
				this.canvas       = document.getElementById(id);
				this.width        = this.cfg.width  || this.canvas.offsetWidth;
				this.height       = this.cfg.height || this.canvas.offsetHeight;
				this.front        = this.canvas;
				this.front.width  = this.width;
				this.front.height = this.height;
				this.back         = Game.createCanvas();
				this.back.width   = this.width;
				this.back.height  = this.height;
				this.front2d      = this.front.getContext('2d');
				this.back2d       = this.back.getContext('2d');
				this.addEvents();
				this.resetStats();

				// Finalmente, construir el objeto del juego en sí
				this.game = Object.construct(game, this, this.cfg);
			},

			// La instancia del juego debe llamar a runner.start() cuando termine de inicializar
			// y está lista para iniciar el game loop
			// Inicia el timer
			start: function() { 
				this.lastFrame = Game.timestamp();
				this.timer     = setInterval(this.loop.bind(this), this.interval);
			},

			// Parar el juego. Limpia el timer
			stop: function() {
				clearInterval(this.timer);
			},

			loop: function() {
				var start  = Game.timestamp(); this.update((start - this.lastFrame)/1000.0); // send dt as seconds
				var middle = Game.timestamp(); this.draw();
				var end    = Game.timestamp();
				this.updateStats(middle - start, end - middle);
				this.lastFrame = start;
			},

			update: function(dt) {
				this.game.update(dt);
			},

			draw: function() {
				this.back2d.clearRect(0, 0, this.width, this.height);
				this.game.draw(this.back2d);
				this.drawStats(this.back2d);
				this.front2d.clearRect(0, 0, this.width, this.height);
				this.front2d.drawImage(this.back, 0, 0);
			},

			resetStats: function() {
				this.stats = {
						count:  0,
						fps:    0,
						update: 0,
						draw:   0, 
						frame:  0  // update + draw
				};
			},

			updateStats: function(update, draw) {
				if (this.cfg.stats) {
					this.stats.update = Math.max(1, update);
					this.stats.draw   = Math.max(1, draw);
					this.stats.frame  = this.stats.update + this.stats.draw;
					this.stats.count  = this.stats.count == this.fps ? 0 : this.stats.count + 1;
					this.stats.fps    = Math.min(this.fps, 1000 / this.stats.frame);
				}
			},

			drawStats: function(ctx) {
				if (this.cfg.stats) {
					ctx.fillStyle = 'white';
					ctx.font = '9pt sans-serif';
					ctx.fillText("frame: "  + this.stats.count,         this.width - 100, this.height - 75);
					ctx.fillText("fps: "    + this.stats.fps,           this.width - 100, this.height - 60);
					ctx.fillText("update: " + this.stats.update + "ms", this.width - 100, this.height - 45);
					ctx.fillText("draw: "   + this.stats.draw   + "ms", this.width - 100, this.height - 30);
				}
			},

			addEvents: function() {
				Game.addEvent(document, 'keydown', this.onkeydown.bind(this));
				Game.addEvent(document, 'keyup',   this.onkeyup.bind(this));
			},

			onkeydown: function(ev) { if (this.game.onkeydown) this.game.onkeydown(ev.keyCode); },
			onkeyup:   function(ev) { if (this.game.onkeyup)   this.game.onkeyup(ev.keyCode);   },

			hideCursor: function() { this.canvas.style.cursor = 'none'; },
			showCursor: function() { this.canvas.style.cursor = 'auto'; },

			alert: function(msg) {
				this.stop(); // alert blocks thread, so need to stop game loop in order to avoid sending huge dt values to next update
				result = window.alert(msg);
				this.start();
				return result;
			},

			confirm: function(msg) {
				this.stop(); // alert blocks thread, so need to stop game loop in order to avoid sending huge dt values to next update
				result = window.confirm(msg);
				this.start();
				return result;
			}

			//-------------------------------------------------------------------------

		} // Game.Runner
} // Game