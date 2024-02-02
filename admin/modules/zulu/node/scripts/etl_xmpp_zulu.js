/*
 * ETL process to extract users from LetsChat/XMPP Module (FreePBX) to Zulu
 *
 *
 */
'use strict';

var Promise = require('bluebird');

var MongoClient = require('mongodb').MongoClient;

var ObjectID = require('mongodb').ObjectID;

var FreePBX = new require('freepbx');
var url = 'mongodb://localhost:27017/letschat';

var uuidv4 = require('uuid/v4');

var async = require('async'); // some global vars


var ZULU_INTERACTIONS_TABLE = 'zulu_interactions_interactions';
var ZULU_INTERACTIONS_MEMBERS_TABLE = 'zulu_interactions_members';
var ZULU_STREAM_TABLE = 'zulu_interactions_streams';
var ZULU_STREAM_BODIES_TABLE = 'zulu_interactions_stream_bodies';
var ZULU_STREAM_ACTIONS_TABLE = 'zulu_interactions_stream_actions';
var ZULU_INTERACTIONS_OWNERS_TABLE = 'zulu_interactions_owners'; // helpers functions

function toTimestamp(strDate) {
  var datum = Date.parse(strDate);
  return datum / 1000;
} // main function


FreePBX.connect().then(function (freepbx) {
  MongoClient.connect(url, function (err, db) {
    if (err) {
      throw err;
    }

    db.collection('rooms').find({
      archived: false
    }).toArray(function (err, rooms) {
      console.log('Total of rooms: ', rooms.length);
      async.each(rooms, function (room, next) {
        let interactionId = uuidv4();
        let sqlParams = {
          id: interactionId,
          start_time: toTimestamp(room.created),
          topic: room.name,
          type: 'public'
        };

        if (room.description) {
          sqlParams.description = room.description;
        }

        freepbx.db.query('INSERT INTO ' + ZULU_INTERACTIONS_TABLE + ' SET ?', sqlParams, function (err, results) {
          if (err) {
            throw err;
          }

          db.collection('users').find({
            openRooms: String(room._id)
          }).toArray(function (err, roomUsers) {
            console.log('Total of Members for Room ' + room.name + ': ', roomUsers.length);

            if (err) {
              throw err;
            }

            async.each(roomUsers, function (userInRoom, next2) {
              let sqlInteractionMembersParams = {
                'interaction_id': interactionId,
                'linkedid': userInRoom.uuid
              };
              freepbx.db.query('INSERT INTO ' + ZULU_INTERACTIONS_MEMBERS_TABLE + ' SET ?', sqlInteractionMembersParams, function (err, results) {
                if (err) {
                  throw err;
                }

                if (String(userInRoom._id) === String(room.owner)) {
                  let sqlInteractionOwnerParams = {
                    interaction_id: interactionId,
                    userman_id: userInRoom.freepbxId
                  };
                  freepbx.db.query('INSERT INTO ' + ZULU_INTERACTIONS_OWNERS_TABLE + ' SET ?', sqlInteractionOwnerParams, function (err, results) {
                    if (err) {
                      throw err;
                    }

                    next2();
                  });
                } else {
                  next2();
                }
              });
            }, function (err) {
              if (err) {
                throw err;
              }

              db.collection('messages').find({
                room: ObjectID(String(room._id))
              }).toArray(function (err, roomMessages) {
                console.log('Total of streams for room ' + room.name + ' : ', roomMessages.length);
                async.each(roomMessages, function (message, next3) {
                  db.collection('users').findOne({
                    _id: ObjectID(message.owner)
                  }).then(function (member) {
                    let streamId = uuidv4();
                    let uuid = 'deleted-user';
                    let performInsert = false;
                    let zuluid = null;

                    if (member && member.uuid) {
                      zuluid = member.freepbxId;
                      uuid = member.uuid;
                      performInsert = true;
                    }

                    var roomMessageData = {
                      id: streamId,
                      interaction_id: interactionId,
                      type: 'CHAT_MESSAGE',
                      when: toTimestamp(message.posted),
                      member_id: uuid
                    };
                    freepbx.db.query('INSERT INTO ' + ZULU_STREAM_TABLE + ' SET ?', roomMessageData, function (err, results) {
                      if (err) {
                        throw err;
                      }

                      var messageBody = JSON.stringify({
                        text: message.text,
                        message: 'migrated',
                        metadata: []
                      });
                      var roomMessageBody = {
                        stream_id: streamId,
                        body: messageBody
                      };
                      freepbx.db.query('INSERT INTO ' + ZULU_STREAM_BODIES_TABLE + ' SET ?', roomMessageBody, function (err, results) {
                        if (err) {
                          throw err;
                        }

                        if (performInsert) {
                          var streamActionsBody = {
                            stream_id: streamId,
                            zulu_id: zuluid,
                            seen: 1
                          };
                          freepbx.db.query('INSERT INTO ' + ZULU_STREAM_ACTIONS_TABLE + ' SET ?', streamActionsBody, function (err, results) {
                            if (err) {
                              throw err;
                            }

                            next3();
                          });
                        } else {
                          next3();
                        }
                      });
                    });
                  }).catch(function (err) {
                    console.log('ERROR!!!', err);
                    next3();
                  });
                }, function (err) {
                  if (err) {
                    throw err;
                  }

                  next();
                });
              });
            });
          });
        });
      }, function (err) {
        if (err) {
          throw err;
        }

        db.close();
        process.exit();
      });
    });
  });
});
//# sourceMappingURL=etl_xmpp_zulu.js.map
