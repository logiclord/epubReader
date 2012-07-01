/*
This is an experimental file to implement sample features.
It won't be a part of final component.
 */

// Declare dependencies
/*global fluid_1_5:true, jQuery*/

// JSLint options
/*jslint white: true, funcinvoke: true, undef: true, newcap: true, nomen: true, regexp: true, bitwise: true, browser: true, forin: true, maxerr: 100, indent: 4 */


var fluid_1_4 = fluid_1_4 || {};

(function ($, fluid) {

    // Define one subcomponent
    fluid.defaults("tutorials.subcomponent3", {
        gradeNames: ["fluid.littleComponent", "autoInit"],
        finalInitFunction:"tutorials.subcomponent3.postInit",
        val : "{subcomponent1}.options.cutre"
    });

    tutorials.subcomponent3.postInit = function (that){
        that.who = function (){
            alert("its me subcomponent3 comp");
            alert("{subcomponent1}.options.cutre");
        }
    }

    // Define one subcomponent
    fluid.defaults("tutorials.subcomponent1", {
        gradeNames: ["fluid.littleComponent", "autoInit"],
        finalInitFunction:"tutorials.subcomponent1.postInit",
        cutre : 987654567876545678
    });

    tutorials.subcomponent1.postInit = function (that){
        that.who = function (){
            alert("its me subcomponent1 comp");
        }
    }

// Define another subcomponent
    fluid.defaults("tutorials.subcomponent2", {
        gradeNames: ["fluid.littleComponent", "autoInit"],
        components: {
            child3: {
                type: "tutorials.subcomponent3"
            }
        },
        cutre : 123456789,
        finalInitFunction:"tutorials.subcomponent2.postInit"
    });

    tutorials.subcomponent2.postInit = function (that){
        that.who = function (){
            alert("its me subcomponent2 comp");
            that.child3.who();
        }
        that.who();
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
        that.who = function (){
            alert("its me parent comp");
        }
    }

})(jQuery, fluid_1_4);