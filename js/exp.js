/*
This is an experimental file to implement sample features.
It won't be a part of final component.
 */

// Declare dependencies
/*global fluid_1_5:true, jQuery*/

// JSLint options
/*jslint white: true, funcinvoke: true, undef: true, newcap: true, nomen: true, regexp: true, bitwise: true, browser: true, forin: true, maxerr: 100, indent: 4 */


var fluid_1_5 = fluid_1_5 || {};

(function ($, fluid) {

    // Define one subcomponent
    fluid.defaults("tutorials.subcomponent1", {
        gradeNames: ["fluid.littleComponent", "autoInit"],
        finalInitFunction:"tutorials.subcomponent1.postInit"
    });

    tutorials.subcomponent1.postInit = function (that){
        that.titu = function (th) {
            alert("titu");
            th();
        }
    }

// Define another subcomponent
    fluid.defaults("tutorials.subcomponent2", {
        gradeNames: ["fluid.littleComponent", "autoInit"],
        tempvar : 12345767887656787656,
        finalInitFunction:"tutorials.subcomponent2.postInit"
    });

    tutorials.subcomponent2.postInit = function (that){
        that.papu = function () {
            alert(that.options.tempvar);
        }
    }

// Define the parent component, to use the subcomponents
    fluid.defaults("tutorials.parentComponent", {
        gradeNames: ["fluid.littleComponent", "autoInit"],
        components: {
            child1: {
                type: "tutorials.subcomponent1"
            },
            child2: {
                type: "tutorials.subcomponent2"
            }
        },
        finalInitFunction:"tutorials.parentComponent.postInit"
    });


    tutorials.parentComponent.postInit = function (that) {
        that.child1.titu(that.child2.papu);
        //console.log(that.child2);
        //that.child2.papu();
    }

})(jQuery, fluid_1_5);