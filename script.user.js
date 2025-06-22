// ==UserScript==
// @name         NovelCrafter Gemini thinking Inject
// @version      0.5
// @description  Adds max thinking budget to specified Google models.
// @author       original by theRealKat, modified by Vivid Nightmare
// @match        *://app.novelcrafter.com/*
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    const SCRIPT_NAME = "NovelCrafter OpenRouter Claude ReThinker";
    const TARGET_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

    const TARGET_MODEL_PREFIXES = [
        "deepseek/deepseek-r1-0528",
        "google/gemini-2.5-pro",
        "gemini-2.5-pro"
    ];

    const MODIFICATION = { extra_body: { "google": { "thinking_config": { "thinking_budget": 32768, "include_thoughts": false }}}};

    const originalFetch = unsafeWindow.fetch;

    unsafeWindow.fetch = async function(input, init) {
        let url;
        let method = 'GET'; // Default method

        if (typeof input === 'string') {
            url = input;
        } else if (input instanceof Request) {
            url = input.url;
            method = input.method.toUpperCase();
        } else {
            console.warn(`[${SCRIPT_NAME}] Unhandled input type for fetch:`, input);
            return originalFetch(input, init);
        }

        if (init && init.method) {
            method = init.method.toUpperCase();
        }

        // Check if this is the request we want to intercept
        if (url === TARGET_URL && method === 'POST' && init && init.body) {
            try {
                // Ensure body is a string before parsing
                let bodyString;
                if (typeof init.body === 'string') {
                    bodyString = init.body;
                } else if (init.body instanceof ReadableStream) {
                    console.warn(`[${SCRIPT_NAME}] Request body is a stream for ${TARGET_URL}. Cannot synchronously modify. Passing through.`);
                    return originalFetch(input, init);
                } else {
                    console.warn(`[${SCRIPT_NAME}] Request body is not a string or stream for ${TARGET_URL}. Type: ${typeof init.body}. Passing through.`);
                    return originalFetch(input, init);
                }

                const parsedBody = JSON.parse(bodyString);

                let applyModification = false;
                if (parsedBody.model) {
                    for (const prefix of TARGET_MODEL_PREFIXES) {
                        if (parsedBody.model.startsWith(prefix)) {
                            applyModification = true;
                            break;
                        }
                    }
                }

                if (applyModification) {
                    console.log(`[${SCRIPT_NAME}] Intercepted request for model: ${parsedBody.model}. Adding reasoning.`);

                    // Add the reasoning attribute
                    const modifiedBody = { ...parsedBody, ...MODIFICATION };

                    // Create a new init object with the modified body
                    // It's important to clone init to avoid side effects
                    const newInit = { ...init, body: JSON.stringify(modifiedBody) };

                    // Log the modified body for verification (optional)
                    // console.log(`[${SCRIPT_NAME}] Modified request body:`, newInit.body);

                    // Continue with the modified request
                    return originalFetch(input, newInit);
                }
            } catch (error) {
                console.error(`[${SCRIPT_NAME}] Error processing request to ${TARGET_URL}:`, error);
                // If an error occurs (e.g., JSON parsing failed), proceed with the original request
                return originalFetch(input, init);
            }
        }

        // For all other requests, pass them through unmodified
        return originalFetch(input, init);
    };

    console.log(`[${SCRIPT_NAME}] Loaded (v${GM_info.script.version}) and fetch overridden on ${window.location.hostname}.`);
})();
