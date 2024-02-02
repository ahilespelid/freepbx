"use strict";
// code to auto-logout when too many missed calls.
// four space indent, no tab chars.
// vim: sw=4:softtabstop=4:expandtab 

module.exports = {
    handleLogMessage: handleLogMessage,
    handleAgentMessage: handleAgentMessage,
    logger: console,
};

function handleLogMessage(msg) {}

// this watches queue.agent.status messages for calls to get bridged.
// resets missed_calls_allowed for bridged agents.
function handleAgentMessage(msg) {}

