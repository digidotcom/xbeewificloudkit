/*!
 * jQuery UI Progressbar @VERSION
 * http://jqueryui.com
 *
 * Copyright 2013 jQuery Foundation and other contributors
 * Released under the MIT license.
 * http://jquery.org/license
 *
 * http://api.jqueryui.com/progressbar/
 *
 * Depends:
 *   jquery.ui.core.js
 *   jquery.ui.widget.js
 *
 *
 * Modified by Digi International to create a vertical progress bar,
 * and add animation support.
 */
(function( $, undefined ) {

$.widget( "ui.progressbar", {
	version: "@VERSION",
	options: {
		max: 100,
        min: 0,
		value: 0,

        vertical: false,
        animateDuration: 500,
        animateQueue: false,

		change: null,
		complete: null
	},

    pb_class: "ui-progressbar",
    header_class: "ui-widget-header",

	_create: function() {
		// Constrain initial value
		this.oldValue = this.options.value = this._constrainedValue();
        this.vertical = this.options.vertical;
        this.animateDuration = this.options.animateDuration =
                (this.options.animateDuration || 500);
        this.animateQueue = this.options.animateQueue =
                                !!this.options.animateQueue;

        this.pb_class = "ui-progressbar" + (this.vertical ? "-vertical" : "");
        this.header_class = "ui-widget-header" +
                                    (this.vertical ? "-vertical" : "");

		this.element
			.addClass( this.pb_class + " ui-widget ui-widget-content ui-corner-all" )
			.attr({
				// Only set static values, aria-valuenow and aria-valuemax are
				// set inside _refreshValue()
				role: "progressbar",
				"aria-valuemin": this.options.min || 0
			});

		this.valueDiv = $( "<div class='ui-progressbar-value'></div>" )
            .addClass(this.header_class)
            .addClass(this.vertical ? "ui-corner-bottom" : "ui-corner-left")
			.prependTo( this.element );

		this._refreshValue();
	},

	_destroy: function() {
		this.element
			.removeClass( this.pb_class + " ui-widget ui-widget-content ui-corner-all" )
			.removeAttr( "role" )
			.removeAttr( "aria-valuemin" )
			.removeAttr( "aria-valuemax" )
			.removeAttr( "aria-valuenow" );

		this.valueDiv.remove();
	},

	value: function( newValue ) {
		if ( newValue === undefined ) {
			return this.options.value;
		}

		this.options.value = this._constrainedValue( newValue );
		this._refreshValue();
	},

	_constrainedValue: function( newValue ) {
		if ( newValue === undefined ) {
			newValue = this.options.value;
		}

		this.indeterminate = newValue === false;

		// sanitize value
		if ( typeof newValue !== "number" ) {
			newValue = 0;
		}

		return this.indeterminate ? false :
			Math.min( this.options.max, Math.max( this.options.min||0, newValue ) );
	},

	_setOptions: function( options ) {
		// Ensure "value" option is set after other values (like max)
		var value = options.value;
		delete options.value;

		this._super( options );

		this.options.value = this._constrainedValue( value );
		this._refreshValue();
	},

	_setOption: function( key, value ) {
		if ( key === "max" ) {
			// Don't allow a max less than min
			value = Math.max( this.options.min || 0, value );
		}
		if ( key === "disabled" ) {
			this.element
				.toggleClass( "ui-state-disabled", !!value )
				.attr( "aria-disabled", value );
		}
		this._super( key, value );
	},

	_percentage: function() {
		return this.indeterminate ? 100 : 100 * ( this.options.value - this.options.min||0 ) / ( this.options.max - this.options.min||0 );
	},

	_refreshValue: function() {
		var value = this.options.value,
			percentage = this._percentage();

        var endVal = percentage.toFixed(0) + "%";
        var endSize = this.vertical ? {height: endVal} : {width: endVal};
        var animateOpts = {
            duration: this.animateDuration,
            queue: this.animateQueue
        };

        var cornerClass = this.vertical ? "ui-corner-top" : "ui-corner-right";

		this.valueDiv
			.toggle( this.indeterminate || value > (this.options.min||0)-1 )
			.toggleClass( cornerClass, value === this.options.max )
            .animate(endSize, animateOpts);

		this.element.toggleClass( "ui-progressbar-indeterminate", this.indeterminate );

		if ( this.indeterminate ) {
			this.element.removeAttr( "aria-valuenow" );
			if ( !this.overlayDiv ) {
				this.overlayDiv = $( "<div class='ui-progressbar-overlay'></div>" ).prependTo( this.valueDiv );
			}
		} else {
			this.element.attr({
				"aria-valuemax": this.options.max,
				"aria-valuenow": value
			});
			if ( this.overlayDiv ) {
				this.overlayDiv.remove();
				this.overlayDiv = null;
			}
		}

		if ( this.oldValue !== value ) {
			this.oldValue = value;
			this._trigger( "change" );
		}
		if ( value === this.options.max ) {
			this._trigger( "complete" );
		}
	}
});

})( jQuery );
