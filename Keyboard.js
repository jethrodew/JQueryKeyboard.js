define(['jquery'], function ($) {
    /**
     * SINGLETON
     * KeyBoard Controller
     * Allows easy binding of keyboard controls to the environment.
     */

    var Keyboard = (function () {
        var keyStore = [],
            keyLookup = {};

        /** Helper Functions (Private) **/

        /**
         * Abstracted Modifier Handler
         * @param modifier
         * @returns {*}
         */
        function clarifyModifier(modifier) {
            var clarifiedModifier;
            //Consider additional inputs like all?
            switch(modifier) {
                case 'ctrl': clarifiedModifier = modifier; break;
                case 'alt': clarifiedModifier = modifier; break;
                case 'meta': clarifiedModifier = 'ctrl'; break;
            }
            return clarifiedModifier;
        }

        /**
         * Builds the KeyCombo object used for the event trigger
         */
        function buildKeyComboObject(shortcutCombo) {
            var keyCombo = {
                keyCode: shortcutCombo.key
            };
            if(shortcutCombo.modifier) {
                keyCombo[clarifyModifier(shortcutCombo.modifier) + 'Key'] = true;
            }
            return keyCombo;
        }


        /**
         * Constructs an identifying string
         * @param event
         * @param key
         * @param modifier
         * @param identifier
         * @returns String
         */
        function buildEventNamespace(event,key,modifier, identifier) {
            var bString,
                id = "_" + identifier;
            if (!modifier) {
                bString = key + id;
            } else {
                bString = clarifyModifier(modifier) + "_" + key + id;
            }
            return event + '_' + bString;
        }

        /**
         * Wrapper event handler called to locate proper function and format the input.
         * Ctrl and Meta keys are identified as being interchangeable to cover the CMD key on Macs
         * @param event
         */
        function handler(event) {
            var modifier = "",
                key = event.keyCode,
                shortcut;

            if(!event.data || event.KeyboardHandled) {
                return; // No Data, not come from this controller.
            }

            if(event.ctrlKey || event.metaKey) {
                modifier = "ctrl";
            } else if(event.altKey) {
                modifier = "alt";
            }

            //Execute linked shortcut
            shortcut = keyLookup[buildEventNamespace(event.type,key,modifier,event.data[0])];
            if(shortcut && !shortcut.disabled) {
                event.KeyboardHandled = true; //Prevent bubbling triggering functions twice.
                shortcut.fn(event);
            }
        }


        /** Primary Functions (Public) **/

        /**
         * Registers a new keyboard shortcut
         * @param shortcutCombo - Object containing a key and an optional modifier. {key:##,modifier:''}
         *      Modifier's specified as 'ctrl','alt' or 'meta'. Key must be supplied as a keycode value
         * @param fnc - Function to execute when the event is fired
         * @param namespace - used to identify the event and ensure the correct registered function is called.
         *      namespace can be any string, no spaces and no leading underscore
         * @param event - event to trigger on (keyup, keydown, keypress) (Defaults to keydown if blank)
         * @param $el - Element to bind the event to (defaults to document if blank)
         * @returns {*}
         */
        function registerShortcut(shortcutCombo, fnc, namespace, event, $el) {
            var newShortcut = {
                    "id": undefined,
                    "eventNamespace": undefined,
                    "keyCombo": undefined,
                    "disabled": false,
                    "fn": fnc
                };

            if(!shortcutCombo || !fnc || !namespace || namespace.indexOf(' ') >= 0 || namespace.indexOf('_') === 0) {
                //Missing Required Parameters - DEV WARNING
                return false;
            }

            if (!event) {
                event = "keydown";
            }

            newShortcut.eventNamespace = buildEventNamespace(event, shortcutCombo.key, shortcutCombo.modifier, namespace);

            newShortcut.keyCombo = buildKeyComboObject(shortcutCombo);

            //Register with the lookup
            keyLookup[newShortcut.eventNamespace] = newShortcut;
            // Push and generate ID
            newShortcut.id = keyStore.push(newShortcut) - 1;

            // Attach to DOM
            if(!$el) {
                $(document).on(event + '.' + newShortcut.eventNamespace,'',[namespace], handler);
            } else {
                $el.on(event + '.' + newShortcut.eventNamespace,'',[namespace], handler);
                newShortcut.$el = $el;
            }

            //Return ID for tracking.
            return newShortcut.id;
        }

        /**
         * Removes a shortcut and detaches it from the DOM
         * Once removed, you must re-register the event.
         * @param id
         */
        function deRegisterShortcut(id) {
            var removedShortcut = keyStore[id],
                event = removedShortcut.eventNamespace.split('_')[0];
            if(removedShortcut.$el){
                removedShortcut.$el.off(event + '.' + removedShortcut.eventNamespace);
            } else {
                $(document).off(event + '.' + removedShortcut.eventNamespace);
            }
            // Mark removed
            keyStore[id] = undefined;
            keyLookup[removedShortcut.eventNamespace] = undefined;
        }

        /**
         * Disables a shortcut but keeps it intact and attached to the DOM
         * The attached function will never be executed whilst it is disabled.
         * @param id
         */
        function disableShortcut(id) {
            keyStore[id].disabled = true;
        }

        /**
         * Enables a Disabled shortcut so that it will begin operating on event
         * @param id
         */
        function enableShortcut(id) {
            keyStore[id].disabled = false;
        }

        /**
         * Public Helper function to determine if the event was fired from a normal text input type scenario.
         * @param event
         * @returns Boolean
         */
        function isInputEvent(event) {
            return !!(event.target.isContentEditable || $(event.target).not('button, :input[type=button], :input[type=submit], :input[type=reset]').is(':input'));
        }

        /**
         * Public Helper to clear all registered key events for this keyboardController
         */
        function tearDown() {
            keyStore.map(function(shortcut) { // Uses map to avoid any index gaps
                if(shortcut) {
                    deRegisterShortcut(shortcut.id);
                }
            });
            keyLookup = {};
            keyStore = [];
        }

        /**
         * Public Helper to trigger a shortcut event by id
         */
        function triggerShortcut(id) {
            var shortcut = keyStore[id],
                event = shortcut && shortcut.eventNamespace.split('_')[0];
            if(shortcut) {
                if (shortcut.$el) {
                    shortcut.$el.trigger($.Event(event + '.' + shortcut.eventNamespace, shortcut.keyCombo));
                } else {
                    $(document).trigger($.Event(event + '.' + shortcut.eventNamespace, shortcut.keyCombo));
                }
            } else {
                return false;
            }
        }

        return {
            registerShortcut: registerShortcut,
            deRegisterShortcut: deRegisterShortcut,
            disableShortcut: disableShortcut,
            enableShortcut: enableShortcut,
            isInputEvent: isInputEvent,
            tearDown: tearDown,
            triggerShortcut: triggerShortcut
        };
    })();

    return Keyboard;
});
