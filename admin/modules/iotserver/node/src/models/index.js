const AppCredentials = require('./AppCredentials');
const AccessProfile = require('./AccessProfile');
const Zone = require('./Zone');
const ZonePermission = require('./ZonePermission');
const Location = require('./Location');
const LocationPermission = require('./LocationPermission');
const Gateway = require('./Gateway');
const Device = require('./Device');
const Scene = require('./Scene');
const ScenePermission = require('./ScenePermission');
const Group = require('./Group');
const GroupPermission = require('./GroupPermission');
const User = require('./User');
const Notification = require('./Notification');
const EventHistory = require('./EventHistory');
const ObjectProperty = require('./ObjectProperty');
const UserPropertyValue = require('./UserPropertyValue');
const AutomatedAction = require('./AutomatedAction');
const GuestAccess = require('./Guests');


module.exports = {
    AppCredentials,
    AccessProfile,
    User,
    Zone,
    ZonePermission,
    Location,
    LocationPermission,
    Device,
    Gateway,
    Scene,
    ScenePermission,
    Group,
    Notification,
    EventHistory,
    ObjectProperty,
    UserPropertyValue,
    AutomatedAction,
    GuestAccess
    // Place other models in this list
};
